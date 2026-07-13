/**
 * Hydrate DeFi position rows with cached token symbol/name/logo from disk,
 * and enrich missing mints via Vybe → Jupiter (rotating proxy).
 */

import type { AxiosInstance } from 'axios';
import {
  getCachedTokenMetaFromDisk,
  hasCachedTokenIcon,
  getCachedTokenIconWebPath,
  isLocalCachedIconUrl,
  type CachedTokenMeta,
} from '../token-icon-cache.js';
import { isMintLikeLabel } from './token-label.js';
import {
  DEFI_SYMBOL_ENRICH_LIMIT,
  enrichDefiSymbolsSequential,
  type DefiSymbolEnrichToken,
} from './enrich-defi-symbols.js';
import { materializeTokenLogoLocal } from './materialize-token-logo.js';

const DUST_USD_THRESHOLD = 0.1;

function asArray(value: unknown): unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function toNum(value: unknown): number | null {
  if (Array.isArray(value)) {
    const sum = value.reduce((acc, item) => acc + (toNum(item) ?? 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowAbsUsd(row: Record<string, unknown>): number {
  const total = toNum(row.totalUsdValue);
  if (total != null) return Math.abs(total);
  const scalar = toNum(row.usdValue);
  if (scalar != null) return Math.abs(scalar);
  return 0;
}

function legUsd(row: Record<string, unknown>, index: number): number {
  if (Array.isArray(row.usdValue)) {
    return Math.abs(toNum(row.usdValue[index]) ?? 0);
  }
  return rowAbsUsd(row);
}

function isBadSymbol(symbol: unknown, mint: string): boolean {
  const s = String(symbol ?? '').trim();
  if (!s) return true;
  if (s.includes('…') || s.includes('...')) return true;
  return isMintLikeLabel(s, mint);
}

function metaToPatch(meta: CachedTokenMeta): { symbol: string; name: string; logoUrl?: string } | null {
  const symbol = String(meta.symbol ?? '').trim();
  if (!symbol || symbol.includes('…')) return null;
  if (isMintLikeLabel(symbol, meta.mint) && symbol.toUpperCase() !== 'SPL' && symbol.toUpperCase() !== 'TOKEN2022') {
    return null;
  }
  const name = String(meta.name ?? '').trim();
  const mint = String(meta.mint ?? '').trim();
  const localLogo =
    (hasCachedTokenIcon(mint) ? getCachedTokenIconWebPath(mint) : undefined) ||
    (isLocalCachedIconUrl(meta.logoUrl) ? meta.logoUrl?.trim() : undefined);
  return {
    symbol,
    name: name && !isMintLikeLabel(name, meta.mint) ? name : symbol,
    logoUrl: localLogo,
  };
}

function patchRowLeg(
  row: Record<string, unknown>,
  index: number,
  patch: { symbol: string; name: string; logoUrl?: string },
): void {
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const logos = asArray(row.logourl ?? row.logoUrl);
  const addresses = asArray(row.address);
  const multi = addresses.length > 1 || symbols.length > 1 || Array.isArray(row.symbol);

  if (!multi && index === 0) {
    if (isBadSymbol(row.symbol, String(row.address ?? ''))) row.symbol = patch.symbol;
    if (isBadSymbol(row.name, String(row.address ?? '')) || !String(row.name ?? '').trim()) {
      row.name = patch.name;
    }
    if (patch.logoUrl && !String(row.logourl ?? row.logoUrl ?? '').trim()) {
      row.logourl = patch.logoUrl;
      row.logoUrl = patch.logoUrl;
    } else if (patch.logoUrl && !isLocalCachedIconUrl(String(row.logourl ?? row.logoUrl ?? ''))) {
      row.logourl = patch.logoUrl;
      row.logoUrl = patch.logoUrl;
    }
    return;
  }

  while (symbols.length < addresses.length) symbols.push('');
  while (names.length < addresses.length) names.push('');
  while (logos.length < addresses.length) logos.push('');

  const mint = String(addresses[index] ?? '').trim();
  if (isBadSymbol(symbols[index], mint)) symbols[index] = patch.symbol;
  if (isBadSymbol(names[index], mint) || !String(names[index] ?? '').trim()) names[index] = patch.name;
  if (patch.logoUrl && !String(logos[index] ?? '').trim()) logos[index] = patch.logoUrl;

  row.symbol = symbols;
  row.name = names;
  row.logourl = logos;
  row.logoUrl = logos;
}

type MintCandidate = { mint: string; usd: number; isDust: boolean };

/** All mints with missing/bad symbols, prioritized non-dust then dust by USD. No fetch limit. */
function collectAllMissingMints(platforms: unknown[]): MintCandidate[] {
  const byMint = new Map<string, MintCandidate>();
  for (const platform of platforms) {
    if (!platform || typeof platform !== 'object') continue;
    const sections = (platform as { sections?: unknown[] }).sections || [];
    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;
      const rows = (section as { rows?: unknown[] }).rows || [];
      for (const raw of rows) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        const symbols = asArray(row.symbol);
        const dust = rowAbsUsd(row) < DUST_USD_THRESHOLD;
        for (let i = 0; i < addresses.length; i++) {
          const mint = addresses[i]!;
          if (!mint || !isBadSymbol(symbols[i], mint)) continue;
          const usd = legUsd(row, i);
          const prev = byMint.get(mint);
          if (!prev) {
            byMint.set(mint, { mint, usd, isDust: dust });
            continue;
          }
          prev.usd = Math.max(prev.usd, usd);
          if (!dust) prev.isDust = false;
        }
      }
    }
  }
  const all = [...byMint.values()];
  const nonDust = all.filter((c) => !c.isDust).sort((a, b) => b.usd - a.usd);
  const dust = all.filter((c) => c.isDust).sort((a, b) => b.usd - a.usd);
  return [...nonDust, ...dust];
}

/**
 * Apply 20-cap only to uncached network fetches (cache hits do not count).
 * Skip entirely when there are no non-dust mints to fetch — dust-only queues are not started.
 */
function pickEnrichQueue(candidates: MintCandidate[], limit: number): string[] {
  const nonDust = candidates.filter((c) => !c.isDust);
  if (nonDust.length === 0) return [];
  const dust = candidates.filter((c) => c.isDust);
  const picked = nonDust.slice(0, Math.max(0, limit));
  if (picked.length < limit) {
    picked.push(...dust.slice(0, limit - picked.length));
  }
  return picked.map((c) => c.mint);
}

function applyMetaMapToPlatforms(
  platforms: unknown[],
  metaByMint: Map<string, { symbol: string; name: string; logoUrl?: string }>,
): number {
  let patched = 0;
  for (const platform of platforms) {
    if (!platform || typeof platform !== 'object') continue;
    const sections = (platform as { sections?: unknown[] }).sections || [];
    for (const section of sections) {
      if (!section || typeof section !== 'object') continue;
      const rows = (section as { rows?: unknown[] }).rows || [];
      for (const raw of rows) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        for (let i = 0; i < addresses.length; i++) {
          const mint = addresses[i]!;
          const patch = metaByMint.get(mint);
          if (!patch) continue;
          patchRowLeg(row, i, patch);
          patched += 1;
        }
      }
    }
  }
  return patched;
}

/** Fill empty/truncated symbols from on-disk token-meta cache (instant). */
export function hydrateDefiPlatformsFromDiskCache(platforms: unknown[]): {
  platforms: unknown[];
  hydrated: number;
  stillMissing: string[];
} {
  const list = Array.isArray(platforms) ? platforms : [];
  const allMissing = collectAllMissingMints(list);
  const metaByMint = new Map<string, { symbol: string; name: string; logoUrl?: string }>();
  const uncached: MintCandidate[] = [];

  for (const candidate of allMissing) {
    const disk = getCachedTokenMetaFromDisk(candidate.mint);
    const patch = disk ? metaToPatch(disk) : null;
    if (patch) {
      metaByMint.set(candidate.mint, patch);
    } else {
      uncached.push(candidate);
    }
  }

  // Also hydrate any other mints present in rows that happen to be cached
  for (const platform of list) {
    if (!platform || typeof platform !== 'object') continue;
    for (const section of (platform as { sections?: unknown[] }).sections || []) {
      if (!section || typeof section !== 'object') continue;
      for (const raw of (section as { rows?: unknown[] }).rows || []) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        for (const addr of asArray(row.address)) {
          const mint = String(addr ?? '').trim();
          if (!mint || metaByMint.has(mint)) continue;
          const disk = getCachedTokenMetaFromDisk(mint);
          const patch = disk ? metaToPatch(disk) : null;
          if (patch) metaByMint.set(mint, patch);
        }
      }
    }
  }

  const hydrated = applyMetaMapToPlatforms(list, metaByMint);
  // Only uncached mints count toward the enrich queue limit of 20
  const stillMissing = pickEnrichQueue(uncached, DEFI_SYMBOL_ENRICH_LIMIT);
  return { platforms: list, hydrated, stillMissing };
}

function setLegLogo(row: Record<string, unknown>, index: number, logoUrl: string | null): void {
  const addresses = asArray(row.address);
  const logos = asArray(row.logourl ?? row.logoUrl);
  const multi = addresses.length > 1 || logos.length > 1 || Array.isArray(row.logourl) || Array.isArray(row.logoUrl);
  if (!multi && index === 0) {
    row.logourl = logoUrl;
    row.logoUrl = logoUrl;
    return;
  }
  while (logos.length < Math.max(addresses.length, index + 1)) logos.push('');
  logos[index] = logoUrl ?? '';
  row.logourl = logos;
  row.logoUrl = logos;
}

/**
 * Instant: keep only already-cached local logo paths. Strips remote CDNs so the
 * browser never loads them. Does not download (use materializeDefiPlatformLogos
 * in the background to warm the cache for the next request).
 */
export function stripRemoteDefiPlatformLogos(platforms: unknown[]): unknown[] {
  const list = Array.isArray(platforms) ? platforms : [];
  for (const platform of list) {
    if (!platform || typeof platform !== 'object') continue;
    for (const section of (platform as { sections?: unknown[] }).sections || []) {
      if (!section || typeof section !== 'object') continue;
      for (const raw of (section as { rows?: unknown[] }).rows || []) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        const logos = asArray(row.logourl ?? row.logoUrl);
        const n = Math.max(addresses.length, logos.length, 1);
        for (let i = 0; i < n; i++) {
          const mint = String(addresses[i] ?? '').trim();
          let local: string | null = null;
          if (mint && hasCachedTokenIcon(mint)) {
            local = getCachedTokenIconWebPath(mint) ?? null;
          } else {
            const current = String(logos[i] ?? row.logourl ?? row.logoUrl ?? '').trim();
            local = isLocalCachedIconUrl(current) ? current : null;
          }
          setLegLogo(row, i, local);
        }
      }
    }
  }
  return list;
}

/** Mints that still need a local logo after hydrate — include remote URL hints for download. */
export function collectDefiLogoEnrichPending(
  platforms: unknown[],
  limit = 40,
): Array<{ mint: string; logoUrl: string | null }> {
  type Hit = { mint: string; logoUrl: string | null; usd: number };
  const byMint = new Map<string, Hit>();
  const list = Array.isArray(platforms) ? platforms : [];
  for (const platform of list) {
    if (!platform || typeof platform !== 'object') continue;
    for (const section of (platform as { sections?: unknown[] }).sections || []) {
      if (!section || typeof section !== 'object') continue;
      for (const raw of (section as { rows?: unknown[] }).rows || []) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        const logos = asArray(row.logourl ?? row.logoUrl);
        for (let i = 0; i < addresses.length; i++) {
          const mint = addresses[i]!;
          if (!mint) continue;
          if (hasCachedTokenIcon(mint)) continue;
          const rawLogo = String(logos[i] ?? '').trim() || null;
          if (rawLogo && isLocalCachedIconUrl(rawLogo)) continue;
          const usd = legUsd(row, i);
          const prev = byMint.get(mint);
          if (!prev || usd > prev.usd) {
            byMint.set(mint, {
              mint,
              logoUrl: rawLogo && !isLocalCachedIconUrl(rawLogo) ? rawLogo : null,
              usd,
            });
          }
        }
      }
    }
  }
  return [...byMint.values()]
    .sort((a, b) => b.usd - a.usd)
    .slice(0, Math.max(0, limit))
    .map(({ mint, logoUrl }) => ({ mint, logoUrl }));
}

/**
 * Download remote DeFi row logos onto the server and rewrite every logo field to a
 * local /cached path (or empty). Caps network downloads; always strips remotes.
 * Prefer running this in the background — do not await on the request path.
 */
export async function materializeDefiPlatformLogos(
  platforms: unknown[],
  options?: { limit?: number; concurrency?: number },
): Promise<{ platforms: unknown[]; materialized: number }> {
  const list = Array.isArray(platforms) ? platforms : [];
  const limit = Math.max(0, options?.limit ?? 40);
  const concurrency = Math.max(1, options?.concurrency ?? 8);

  type LogoHit = { mint: string; remote: string | null; usd: number };
  const byMint = new Map<string, LogoHit>();

  for (const platform of list) {
    if (!platform || typeof platform !== 'object') continue;
    for (const section of (platform as { sections?: unknown[] }).sections || []) {
      if (!section || typeof section !== 'object') continue;
      for (const raw of (section as { rows?: unknown[] }).rows || []) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        const logos = asArray(row.logourl ?? row.logoUrl);
        for (let i = 0; i < addresses.length; i++) {
          const mint = addresses[i]!;
          if (!mint) continue;
          if (hasCachedTokenIcon(mint)) continue;
          const remote = String(logos[i] ?? '').trim() || null;
          if (remote && isLocalCachedIconUrl(remote)) continue;
          const usd = legUsd(row, i);
          const prev = byMint.get(mint);
          if (!prev || usd > prev.usd) {
            byMint.set(mint, { mint, remote, usd });
          }
        }
      }
    }
  }

  const queue = [...byMint.values()].sort((a, b) => b.usd - a.usd).slice(0, limit);
  const localByMint = new Map<string, string | null>();
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, Math.max(1, queue.length)) }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= queue.length) return;
      const hit = queue[i]!;
      localByMint.set(hit.mint, await materializeTokenLogoLocal(hit.mint, hit.remote));
    }
  });
  await Promise.all(workers);

  let materialized = 0;
  for (const platform of list) {
    if (!platform || typeof platform !== 'object') continue;
    for (const section of (platform as { sections?: unknown[] }).sections || []) {
      if (!section || typeof section !== 'object') continue;
      for (const raw of (section as { rows?: unknown[] }).rows || []) {
        if (!raw || typeof raw !== 'object') continue;
        const row = raw as Record<string, unknown>;
        const addresses = asArray(row.address).map((a) => String(a ?? '').trim());
        const logos = asArray(row.logourl ?? row.logoUrl);
        for (let i = 0; i < addresses.length; i++) {
          const mint = addresses[i]!;
          if (!mint) continue;
          let local: string | null = null;
          if (hasCachedTokenIcon(mint)) {
            local = getCachedTokenIconWebPath(mint) ?? null;
          } else if (localByMint.has(mint)) {
            local = localByMint.get(mint) ?? null;
          } else {
            const current = String(logos[i] ?? '').trim();
            local = isLocalCachedIconUrl(current) ? current : null;
          }
          const prev = String(logos[i] ?? '').trim();
          if (local !== prev) {
            setLegLogo(row, i, local);
            if (local) materialized += 1;
          } else if (prev && !isLocalCachedIconUrl(prev)) {
            setLegLogo(row, i, null);
          }
        }
      }
    }
  }

  return { platforms: list, materialized };
}

/**
 * After disk hydrate, resolve remaining missing mints (Vybe → Jupiter) and patch platforms.
 * Caps at DEFI_SYMBOL_ENRICH_LIMIT total network lookups.
 */
export async function enrichDefiPlatformsMissingSymbols(
  http: AxiosInstance,
  platforms: unknown[],
  options?: { limit?: number },
): Promise<{ platforms: unknown[]; enriched: number; tokens: DefiSymbolEnrichToken[] }> {
  const list = Array.isArray(platforms) ? platforms : [];
  const { stillMissing } = hydrateDefiPlatformsFromDiskCache(list);
  const limit = options?.limit ?? DEFI_SYMBOL_ENRICH_LIMIT;
  const toFetch = stillMissing.slice(0, limit);
  if (toFetch.length === 0) return { platforms: list, enriched: 0, tokens: [] };

  const tokens = await enrichDefiSymbolsSequential(http, toFetch);
  const metaByMint = new Map<string, { symbol: string; name: string; logoUrl?: string }>();
  for (const token of tokens) {
    const mint = String(token.mint ?? '').trim();
    const symbol = String(token.symbol ?? '').trim();
    if (!mint || !symbol || isMintLikeLabel(symbol, mint)) continue;
    metaByMint.set(mint, {
      symbol,
      name: String(token.name ?? symbol).trim() || symbol,
      logoUrl: String(token.logoUrl ?? '').trim() || undefined,
    });
  }
  const enriched = applyMetaMapToPlatforms(list, metaByMint);
  return { platforms: list, enriched, tokens };
}

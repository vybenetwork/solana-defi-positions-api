import type { AxiosInstance } from 'axios';
import { resolveTokenMeta } from './resolve-token-meta.js';
import { cachedMetaToApiResponse } from './token-meta-api.js';
import { isMintLikeLabel } from './token-label.js';
import { cacheTokenMetaFromVybe, getCachedTokenMetaFromDisk } from '../token-icon-cache.js';
import { fetchJupiterAsset } from './jupiter-token-fallback.js';
import {
  cacheMintProgramLabelFallback,
  isProgramFallbackLabel,
} from './mint-program-label.js';

export const DEFI_SYMBOL_ENRICH_LIMIT = 20;

export type DefiSymbolEnrichToken = Record<string, unknown> & {
  mint: string;
  symbol?: string;
  name?: string;
  logoUrl?: string;
  source?: string;
};

function normalizeMints(mints: unknown): string[] {
  if (!Array.isArray(mints)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of mints) {
    const mint = String(raw ?? '').trim();
    if (!mint || seen.has(mint)) continue;
    seen.add(mint);
    out.push(mint);
    if (out.length >= DEFI_SYMBOL_ENRICH_LIMIT) break;
  }
  return out;
}

function hasUsableSymbol(token: DefiSymbolEnrichToken): boolean {
  const mint = String(token.mint ?? '').trim();
  const symbol = String(token.symbol ?? '').trim();
  if (!symbol || symbol.includes('…')) return false;
  if (isProgramFallbackLabel(symbol)) return true;
  return !isMintLikeLabel(symbol, mint);
}

function tokenFromDisk(mint: string): DefiSymbolEnrichToken | null {
  const disk = getCachedTokenMetaFromDisk(mint);
  if (!disk) return null;
  const token = cachedMetaToApiResponse(disk, disk.priceSource) as DefiSymbolEnrichToken;
  token.mint = mint;
  return hasUsableSymbol(token) ? token : null;
}

/** Symbol/logo only via Jupiter asset search — does not run the wallet quote path. */
async function cacheJupiterAssetSymbol(mint: string): Promise<DefiSymbolEnrichToken | null> {
  try {
    const asset = await fetchJupiterAsset(mint);
    const symbol = asset?.symbol?.trim() || '';
    if (!symbol || isMintLikeLabel(symbol, mint)) return null;
    const meta = await cacheTokenMetaFromVybe(mint, {
      mintAddress: mint,
      symbol,
      name: asset?.name?.trim() || symbol,
      decimals: asset?.decimals ?? undefined,
      logoUrl: asset?.logoUrl || undefined,
      verified: asset?.verified === true,
      isVerified: asset?.verified === true,
      priceFetchedAt: Date.now(),
      priceSource: 'Jupiter',
    });
    const token = cachedMetaToApiResponse(meta, 'Jupiter') as DefiSymbolEnrichToken;
    token.mint = mint;
    return hasUsableSymbol(token) ? token : null;
  } catch {
    return null;
  }
}

/**
 * Resolve symbols sequentially: disk cache → Vybe → Jupiter (wallet-balances path) →
 * Jupiter asset-only → on-chain SPL / TOKEN2022. Results written to disk cache.
 */
export async function enrichDefiSymbolsSequential(
  http: AxiosInstance,
  mints: unknown,
  onResolved?: (token: DefiSymbolEnrichToken) => void | Promise<void>,
): Promise<DefiSymbolEnrichToken[]> {
  const queue = normalizeMints(mints);
  const label = queue[0]?.slice(0, 8) ?? 'none';
  const started = Date.now();
  const out: DefiSymbolEnrichToken[] = [];
  let ok = 0;
  let fromDisk = 0;
  let fromProgram = 0;

  for (const mint of queue) {
    try {
      const cached = tokenFromDisk(mint);
      if (cached) {
        fromDisk += 1;
        ok += 1;
        out.push(cached);
        await onResolved?.(cached);
        continue;
      }

      let token: DefiSymbolEnrichToken | null = null;
      const resolved = await resolveTokenMeta(http, mint, { preferVybe: true });
      if (resolved) {
        token = cachedMetaToApiResponse(resolved.meta, resolved.source) as DefiSymbolEnrichToken;
        token.mint = mint;
        if (!hasUsableSymbol(token)) token = null;
      }

      if (!token) {
        token = await cacheJupiterAssetSymbol(mint);
      }

      if (!token) {
        const fallback = await cacheMintProgramLabelFallback(mint);
        if (fallback) {
          fromProgram += 1;
          token = cachedMetaToApiResponse(fallback, 'RPC') as DefiSymbolEnrichToken;
          token.mint = mint;
          token.source = 'RPC';
        }
      }

      if (!token || !hasUsableSymbol(token)) {
        console.warn(`[defi-symbol-enrich] ${mint.slice(0, 8)}… nothing found (vybe+jupiter+rpc)`);
        continue;
      }

      ok += 1;
      out.push(token);
      await onResolved?.(token);
    } catch (err) {
      console.warn(
        `[defi-symbol-enrich] ${mint.slice(0, 8)}… failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.info(
    `[defi-symbol-enrich] ${label} done in ${Date.now() - started}ms — resolved=${ok}/${queue.length} disk=${fromDisk} program=${fromProgram}`,
  );
  return out;
}

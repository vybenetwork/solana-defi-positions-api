/**
 * Build portfolio payloads from Internal Vybe benchmark caches.
 * Balances (mint + raw amount) always come from Internal Rocks.
 * Symbol / name / logo / decimals / category / market stats (price, 1d/7d change,
 * marketCap, 24h volume when present in cache) are enriched from Public + Jupiter.
 * Internal position USD stays null when Rocks has no value field.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const BALANCE_CACHE_DIRS = [
  path.join(REPO_ROOT, 'data/gui-internal-cache/balances'),
  path.join(REPO_ROOT, 'data/balance-benchmark-2026-07-20-raw'),
];
const DEFI_CACHE_DIRS = [
  path.join(REPO_ROOT, 'data/gui-internal-cache/defi'),
  path.join(REPO_ROOT, 'data/defi-benchmark-2026-07-17-raw'),
];

const NATIVE_SOL = '11111111111111111111111111111111';
const WSOL = 'So11111111111111111111111111111111111111112';

export type MintMeta = {
  symbol?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  decimals?: number | null;
  category?: string | null;
  subcategory?: string | null;
  verified?: boolean | null;
  tags?: string[] | null;
  /** Market quote from Public/Jupiter caches (not Internal Rocks). */
  priceUsd?: number | null;
  price1d?: number | null;
  price7d?: number | null;
  priceChange1dPct?: number | null;
  priceChange7dPct?: number | null;
  marketCap?: number | null;
  usdValueVolume24h?: number | null;
  tokenAmountVolume24h?: number | null;
  /** Jupiter wallet UI amount — used only to infer decimals vs Internal raw. */
  jupiterAmountUi?: number | null;
};

export type CachedPortfolio = {
  ownerAddress: string;
  source: 'internal-cache';
  tookMs: number;
  netWorthUsd: number;
  balances: {
    totalUsd: number | null;
    tokenCount: number;
    tokens: Array<Record<string, unknown>>;
    solSummary?: Record<string, unknown>;
    note: string;
  };
  defi: {
    totalUsd: number;
    platformCount: number;
    platforms: Array<Record<string, unknown>>;
  };
  categories: Array<{
    id: string;
    label: string;
    valueUsd: number;
    count: number;
    kind: 'wallet' | 'defi';
  }>;
  meta: {
    balanceCacheDir: string | null;
    defiCacheDir: string | null;
    mintMetaCount: number;
  };
};

function listWalletDirs(roots: string[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const name of fs.readdirSync(root)) {
      const full = path.join(root, name);
      if (!fs.statSync(full).isDirectory()) continue;
      const m = name.match(/^\d{2}-(.+)$/);
      if (!m) continue;
      if (!out.has(m[1])) out.set(m[1], full);
    }
  }
  return out;
}

function readJson(file: string): unknown | null {
  try {
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

function fillMissing(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  if (value == null || value === '') return;
  const cur = target[key];
  if (cur == null || cur === '') target[key] = value;
}

/** Public cache often stubs unknown tokens as mint[:6] for symbol/name — treat as missing. */
function isGarbageTokenLabel(label: unknown, mint: string): boolean {
  const s = String(label ?? '').trim();
  if (!s) return true;
  const m = String(mint || '').trim();
  if (!m) return false;
  if (s === m) return true;
  if (m.startsWith(s) && s.length <= 8) return true;
  // base58 mint-like
  if (/^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(s)) return true;
  return false;
}

function isLocalLogoUrl(url: unknown): boolean {
  const u = String(url ?? '').trim();
  return u.startsWith('/cached/') || u.startsWith('/data/');
}

function preferLogo(current: string | null | undefined, next: string | null | undefined): string | null {
  const n = String(next ?? '').trim();
  if (!n) return current || null;
  const c = String(current ?? '').trim();
  if (!c) return n;
  if (isLocalLogoUrl(n) && !isLocalLogoUrl(c)) return n;
  return c;
}

function mergeMintMeta(row: MintMeta, mint: string, patch: MintMeta): void {
  if (patch.symbol && !isGarbageTokenLabel(patch.symbol, mint)) {
    if (!row.symbol || isGarbageTokenLabel(row.symbol, mint)) row.symbol = patch.symbol;
  }
  if (patch.name && !isGarbageTokenLabel(patch.name, mint)) {
    if (!row.name || isGarbageTokenLabel(row.name, mint)) row.name = patch.name;
  }
  row.logoUrl = preferLogo(row.logoUrl, patch.logoUrl);
  if (patch.decimals != null && Number.isFinite(Number(patch.decimals))) {
    const next = Number(patch.decimals);
    if (row.decimals == null || (Number(row.decimals) === 0 && next > 0)) row.decimals = next;
  }
  if (patch.category && !row.category) row.category = patch.category;
  if (patch.subcategory && !row.subcategory) row.subcategory = patch.subcategory;
  if (patch.verified != null && row.verified == null) row.verified = patch.verified;
  if (patch.tags?.length && !row.tags?.length) row.tags = patch.tags;

  const fillNum = (key: keyof MintMeta, value: unknown) => {
    if (value == null || value === '') return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    if (row[key] == null) (row as Record<string, unknown>)[key] = n;
  };
  fillNum('priceUsd', patch.priceUsd);
  fillNum('price1d', patch.price1d);
  fillNum('price7d', patch.price7d);
  fillNum('priceChange1dPct', patch.priceChange1dPct);
  fillNum('priceChange7dPct', patch.priceChange7dPct);
  fillNum('marketCap', patch.marketCap);
  fillNum('usdValueVolume24h', patch.usdValueVolume24h);
  fillNum('tokenAmountVolume24h', patch.tokenAmountVolume24h);
  fillNum('jupiterAmountUi', patch.jupiterAmountUi);
}

function inferDecimalsFromRawAndUi(raw: string, uiAmount: number): number | null {
  if (!(uiAmount > 0)) return null;
  try {
    const rawN = BigInt(String(raw).split('.')[0] || '0');
    if (rawN <= 0n) return null;
    const ratio = Number(rawN) / uiAmount;
    if (!(ratio > 0) || !Number.isFinite(ratio)) return null;
    const d = Math.round(Math.log10(ratio));
    if (d < 0 || d > 18) return null;
    const expected = 10 ** d;
    if (Math.abs(ratio - expected) / expected > 0.02) return null;
    return d;
  } catch {
    return null;
  }
}

function canonMint(mint: string): string {
  const m = String(mint || '').trim();
  if (!m || m === 'SOL' || m === 'Native') return NATIVE_SOL;
  return m;
}

function rawToUi(raw: string | number, decimals: number): number {
  try {
    const n = BigInt(String(raw).split('.')[0] || '0');
    const base = 10n ** BigInt(decimals);
    const whole = n / base;
    const frac = n % base;
    if (frac === 0n) return Number(whole);
    const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    return Number(`${whole}.${fracStr}`);
  } catch {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
}

function collectMintMeta(balanceDir: string | null, defiDir: string | null): Map<string, MintMeta> {
  const map = new Map<string, MintMeta>();

  const ensure = (mint: string): MintMeta => {
    const key = canonMint(mint);
    let row = map.get(key);
    if (!row) {
      row = {};
      map.set(key, row);
    }
    return row;
  };

  const merge = (mint: string, patch: MintMeta) => {
    const row = ensure(mint);
    mergeMintMeta(row, canonMint(mint), patch);
  };

  const ingestPublicTokens = (file: string) => {
    const raw = readJson(file);
    const obj = asRecord(raw);
    const tokens = (obj?.tokens as unknown[]) || (Array.isArray(raw) ? raw : []);
    for (const t of tokens) {
      const row = asRecord(t);
      if (!row) continue;
      const mint = String(row.mintAddress || row.mint || '');
      if (!mint) continue;
      merge(mint, {
        symbol: (row.symbol as string) || null,
        name: (row.name as string) || null,
        logoUrl: (row.logoUrl as string) || null,
        decimals: row.decimals != null ? Number(row.decimals) : null,
        category: (row.category as string) || null,
        subcategory: (row.subcategory as string) || null,
        verified: typeof row.verified === 'boolean' ? row.verified : null,
        priceUsd: row.priceUsd != null ? Number(row.priceUsd) : null,
        price1d: row.price1d != null ? Number(row.price1d) : null,
        price7d: row.price7d != null ? Number(row.price7d) : null,
        priceChange1dPct: row.priceChange1dPct != null ? Number(row.priceChange1dPct) : null,
        priceChange7dPct: row.priceChange7dPct != null ? Number(row.priceChange7dPct) : null,
        marketCap:
          row.marketCap != null
            ? Number(row.marketCap)
            : row.marketCapUsd != null
              ? Number(row.marketCapUsd)
              : null,
        usdValueVolume24h:
          row.usdValueVolume24h != null
            ? Number(row.usdValueVolume24h)
            : row.volume24hUsd != null
              ? Number(row.volume24hUsd)
              : null,
        tokenAmountVolume24h:
          row.tokenAmountVolume24h != null ? Number(row.tokenAmountVolume24h) : null,
      });
    }
  };

  const ingestJupiterTokenInfo = (file: string) => {
    const raw = asRecord(readJson(file));
    const tokenInfo = asRecord(raw?.tokenInfo);
    const solana = asRecord(tokenInfo?.solana) || tokenInfo;
    if (!solana) return;
    for (const [mint, infoRaw] of Object.entries(solana)) {
      const info = asRecord(infoRaw);
      if (!info) continue;
      merge(mint, {
        symbol: (info.symbol as string) || null,
        name: (info.name as string) || null,
        logoUrl: (info.logoURI as string) || (info.logoUrl as string) || null,
        decimals: info.decimals != null ? Number(info.decimals) : null,
        tags: Array.isArray(info.tags) ? (info.tags as string[]) : null,
        verified: Array.isArray(info.tags) ? (info.tags as string[]).includes('verified') : null,
      });
    }
  };

  const ingestJupiterWalletTokens = (file: string) => {
    const raw = asRecord(readJson(file));
    for (const a of (raw?.assets as unknown[]) || []) {
      const row = asRecord(a);
      if (!row) continue;
      const mint = String(row.mint || row.address || '');
      if (!mint) continue;
      merge(mint, {
        symbol: (row.symbol as string) || null,
        name: (row.name as string) || null,
        logoUrl: (row.logoURI as string) || (row.logoUrl as string) || null,
        decimals: row.decimals != null ? Number(row.decimals) : null,
        priceUsd: row.price != null ? Number(row.price) : row.priceUsd != null ? Number(row.priceUsd) : null,
        jupiterAmountUi: row.amount != null ? Number(row.amount) : null,
      });
    }
  };

  const ingestPublicDefiLogos = (file: string) => {
    const raw = asRecord(readJson(file));
    for (const plat of (raw?.platforms as unknown[]) || []) {
      const p = asRecord(plat);
      if (!p) continue;
      for (const sec of (p.sections as unknown[]) || []) {
        const s = asRecord(sec);
        if (!s) continue;
        for (const rowRaw of (s.rows as unknown[]) || []) {
          const row = asRecord(rowRaw);
          if (!row) continue;
          const mint = String(row.address || '');
          if (!mint) continue;
          merge(mint, {
            symbol: (row.symbol as string) || null,
            name: (row.name as string) || null,
            logoUrl: (row.logoUrl as string) || (row.logourl as string) || null,
          });
        }
      }
    }
  };

  if (balanceDir) {
    // Jupiter first (cleaner symbols/logos), then Public fills gaps.
    ingestJupiterTokenInfo(path.join(balanceDir, 'jupiter.final-data.json'));
    ingestJupiterWalletTokens(path.join(balanceDir, 'jupiter.wallet-tokens.json'));
    ingestPublicTokens(path.join(balanceDir, 'vybe-public.response.json'));
  }
  if (defiDir) {
    ingestJupiterTokenInfo(path.join(defiDir, 'jupiter.final-data.json'));
    ingestPublicDefiLogos(path.join(defiDir, 'vybe-public.response.json'));
    ingestPublicTokens(path.join(defiDir, 'vybe-public.response.json'));
  }

  // Native / stub mints seen in Rocks dumps
  merge(NATIVE_SOL, {
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    category: 'Native',
    verified: true,
    logoUrl: '/cached/token-icons/11111111111111111111111111111111.png',
  });
  merge(WSOL, {
    symbol: 'WSOL',
    name: 'Wrapped SOL',
    decimals: 9,
    category: 'Native',
    verified: true,
    logoUrl: '/cached/token-icons/So11111111111111111111111111111111111111112.png',
  });
  merge('NativeSOL1111111111111111111111111111111111', {
    symbol: 'SOL',
    name: 'Native SOL',
    decimals: 9,
    category: 'Native',
    verified: true,
    logoUrl: '/cached/token-icons/11111111111111111111111111111111.png',
  });
  merge('StakedSo1111111111111111111111111111111111', {
    symbol: 'stSOL*',
    name: 'Staked SOL (account)',
    decimals: 9,
    category: 'Staking',
    verified: false,
  });

  return map;
}

function platformLogoMap(defiDir: string | null): Map<string, { name?: string; logo?: string; website?: string; labels?: string[] }> {
  const map = new Map<string, { name?: string; logo?: string; website?: string; labels?: string[] }>();
  if (!defiDir) return map;
  const raw = asRecord(readJson(path.join(defiDir, 'vybe-public.response.json')));
  for (const plat of (raw?.platforms as unknown[]) || []) {
    const p = asRecord(plat);
    if (!p) continue;
    const id = String(p.platformId || '').toLowerCase();
    const name = String(p.platform || '');
    const entry = {
      name: name || undefined,
      logo: (p.platformLogourl as string) || undefined,
      website: (p.platformWebsite as string) || undefined,
      labels: Array.isArray(p.platformLabels) ? (p.platformLabels as string[]) : undefined,
    };
    if (id) map.set(id, entry);
    if (name) map.set(name.toLowerCase(), entry);
    // loose aliases
    if (id.includes('jupiter')) map.set('jupiter', entry);
    if (id.includes('kamino')) map.set('kamino', entry);
  }
  return map;
}

function buildBalanceTokens(
  balanceDir: string,
  mintMeta: Map<string, MintMeta>,
): { tokens: Array<Record<string, unknown>>; solSummary?: Record<string, unknown> } {
  const inn = asRecord(readJson(path.join(balanceDir, 'vybe-internal.response.json')));
  if (!inn) return { tokens: [] };
  const holdings = Array.isArray(inn.holdings) ? inn.holdings : [];
  const tokens: Array<Record<string, unknown>> = [];

  for (const hRaw of holdings) {
    const h = asRecord(hRaw);
    if (!h) continue;
    const mint = canonMint(String(h.mint || h.mintAddress || ''));
    if (!mint) continue;
    const meta = mintMeta.get(mint) || {};
    const symbol =
      meta.symbol && !isGarbageTokenLabel(meta.symbol, mint) ? meta.symbol : null;
    const name = meta.name && !isGarbageTokenLabel(meta.name, mint) ? meta.name : null;
    const amountExact = String(h.amount ?? '0');

    let decimals =
      meta.decimals != null && Number.isFinite(Number(meta.decimals)) && Number(meta.decimals) > 0
        ? Number(meta.decimals)
        : null;
    if (decimals == null && meta.jupiterAmountUi != null) {
      const inferred = inferDecimalsFromRawAndUi(amountExact, Number(meta.jupiterAmountUi));
      if (inferred != null && inferred > 0) decimals = inferred;
    }

    // Never treat Public's decimals:0 stub as real — that turns raw amounts into fake UI giants.
    const amountUi = decimals != null ? rawToUi(amountExact, decimals) : null;
    let logoUrl = meta.logoUrl || null;
    if (!logoUrl) logoUrl = `/cached/token-icons/${mint}.png`;

    // Market fields from Public/Jupiter only (display enrichment).
    const priceUsd = meta.priceUsd != null && Number.isFinite(Number(meta.priceUsd)) ? Number(meta.priceUsd) : null;
    // Holding USD is not from Internal Rocks — leave null (do not invent Internal value).
    const valueUsd = null;

    tokens.push({
      mintAddress: mint,
      amountExact,
      amountUi,
      decimals: decimals ?? 0,
      priceUsd,
      valueUsd,
      price1d: meta.price1d ?? null,
      price7d: meta.price7d ?? null,
      priceChange1dPct: meta.priceChange1dPct ?? null,
      priceChange7dPct: meta.priceChange7dPct ?? null,
      marketCap: meta.marketCap ?? null,
      usdValueVolume24h: meta.usdValueVolume24h ?? null,
      tokenAmountVolume24h: meta.tokenAmountVolume24h ?? null,
      symbol,
      name,
      logoUrl,
      category: meta.category || null,
      subcategory: meta.subcategory || null,
      verified: meta.verified ?? null,
      tags: meta.tags || null,
      source: 'internal-rocks',
      priceSource: priceUsd != null ? 'Public/Jupiter cache' : null,
      metaEnriched: Boolean(symbol || name || meta.logoUrl || priceUsd != null),
      decimalsReliable: decimals != null && decimals > 0,
    });
  }

  const solSummary = asRecord(inn.sol_summary) || undefined;
  if (solSummary) {
    const native = Number(solSummary.native_sol) || 0;
    if (native > 0 && !tokens.some((t) => t.mintAddress === NATIVE_SOL)) {
      const meta = mintMeta.get(NATIVE_SOL) || {};
      tokens.unshift({
        mintAddress: NATIVE_SOL,
        amountExact: String(native),
        amountUi: native / 1e9,
        decimals: 9,
        priceUsd: meta.priceUsd ?? null,
        valueUsd: null,
        priceChange1dPct: meta.priceChange1dPct ?? null,
        priceChange7dPct: meta.priceChange7dPct ?? null,
        marketCap: meta.marketCap ?? null,
        usdValueVolume24h: meta.usdValueVolume24h ?? null,
        symbol: meta.symbol || 'SOL',
        name: meta.name || 'Solana',
        logoUrl: meta.logoUrl || '/cached/token-icons/11111111111111111111111111111111.png',
        category: 'Native',
        verified: true,
        source: 'internal-rocks-sol-summary',
        priceSource: meta.priceUsd != null ? 'Public/Jupiter cache' : null,
        metaEnriched: true,
        decimalsReliable: true,
      });
    }
  }

  // Keep every Internal row. Sort by USD value (Internal value, else amount×market price).
  tokens.sort((a, b) => {
    const holdingUsd = (t: Record<string, unknown>): number | null => {
      if (t.valueUsd != null && Number.isFinite(Number(t.valueUsd))) return Math.abs(Number(t.valueUsd));
      const amt = t.amountUi != null ? Number(t.amountUi) : null;
      const px = t.priceUsd != null ? Number(t.priceUsd) : null;
      if (amt != null && px != null && Number.isFinite(amt) && Number.isFinite(px)) return Math.abs(amt * px);
      return null;
    };
    const aUsd = holdingUsd(a);
    const bUsd = holdingUsd(b);
    if (aUsd != null && bUsd != null && aUsd !== bUsd) return bUsd - aUsd;
    if (aUsd != null && bUsd == null) return -1;
    if (aUsd == null && bUsd != null) return 1;
    const aUi = a.amountUi != null ? Number(a.amountUi) : null;
    const bUi = b.amountUi != null ? Number(b.amountUi) : null;
    if (aUi != null && bUi != null && aUi !== bUi) return bUi - aUi;
    if (aUi != null && bUi == null) return -1;
    if (aUi == null && bUi != null) return 1;
    try {
      const aR = BigInt(String(a.amountExact || '0').split('.')[0] || '0');
      const bR = BigInt(String(b.amountExact || '0').split('.')[0] || '0');
      if (aR === bR) return 0;
      return aR > bR ? -1 : 1;
    } catch {
      return Number(b.amountExact || 0) - Number(a.amountExact || 0);
    }
  });
  return { tokens, solSummary };
}

function enrichAssetNode(node: unknown, mintMeta: Map<string, MintMeta>): unknown {
  if (Array.isArray(node)) return node.map((n) => enrichAssetNode(n, mintMeta));
  const obj = asRecord(node);
  if (!obj) return node;
  const out: Record<string, unknown> = { ...obj };
  const data = asRecord(obj.data);
  if (data) {
    const dataOut: Record<string, unknown> = { ...data };
    const mint = canonMint(String(data.address || data.mint || ''));
    if (mint) {
      const meta = mintMeta.get(mint) || {};
      // never overwrite amount/price/value
      fillMissing(dataOut, 'symbol', meta.symbol);
      fillMissing(dataOut, 'name', meta.name);
      fillMissing(dataOut, 'logoUrl', meta.logoUrl);
      fillMissing(dataOut, 'logoURI', meta.logoUrl);
      fillMissing(dataOut, 'decimals', meta.decimals);
      fillMissing(dataOut, 'category', meta.category);
      fillMissing(out, 'symbol', meta.symbol);
      fillMissing(out, 'name', meta.name);
      fillMissing(out, 'logoUrl', meta.logoUrl);
    }
    out.data = dataOut;
  }
  for (const key of Object.keys(out)) {
    if (key === 'data') continue;
    const v = out[key];
    if (v && typeof v === 'object') out[key] = enrichAssetNode(v, mintMeta);
  }
  return out;
}

/** Public UI tableType keys used by defi-positions.js buildTableSchema. */
function mapLabelToTableType(label: string): string {
  const s = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[\s/_-]+/g, '');
  if (!s) return 'deposit';
  if (s.includes('reward')) return 'rewards';
  if (s.includes('borrow')) return 'borrowed';
  if (s.includes('lend') || s === 'supplied' || s === 'borrowlend') return 'supplied';
  if (s.includes('vest')) return 'vesting';
  if (s.includes('deposit')) return 'deposit';
  if (s.includes('nativestake') || s === 'stake') return 'nativeStaking';
  if (s.includes('stake')) return 'staked';
  if (s.includes('lever') || s.includes('perp')) return 'leverage';
  if (
    s.includes('liquid') ||
    s.includes('farm') ||
    s.includes('vault') ||
    s === 'lp' ||
    s === 'liquiditypool'
  ) {
    return 'liquidity';
  }
  return 'deposit';
}

function sectionLabelFor(tableType: string, positionLabel: string): string {
  switch (tableType) {
    case 'borrowed':
      return 'Borrowing';
    case 'supplied':
      return 'Lending';
    case 'rewards':
      return 'Rewards';
    case 'liquidity': {
      const raw = String(positionLabel || '').trim();
      if (/farm/i.test(raw)) return 'Farming';
      if (/vault/i.test(raw)) return 'Vault';
      if (/liquid/i.test(raw)) return 'Liquidity Pool';
      return raw || 'Liquidity Pool';
    }
    case 'nativeStaking':
      return 'Solana Native';
    case 'leverage':
      return 'Leverage';
    case 'staked':
      return 'Staked';
    case 'vesting':
      return 'Vesting';
    case 'deposit':
      return /limit|order|trade/i.test(positionLabel) ? 'Limit Order' : 'Deposit';
    default:
      return String(positionLabel || 'Positions');
  }
}

/** Internal stores APY as a fraction; Public UI expects percent points. */
function toUiApy(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.abs(n) <= 2 ? n * 100 : n;
}

function pickYieldApy(yields: unknown, index: number): number | null {
  if (!Array.isArray(yields) || index < 0 || index >= yields.length) return null;
  const entry = yields[index];
  const list = Array.isArray(entry) ? entry : [entry];
  for (const y of list) {
    const row = asRecord(y);
    if (!row) continue;
    if (row.apy != null) return toUiApy(row.apy);
    if (row.apr != null) return toUiApy(row.apr);
  }
  return null;
}

type SectionBundle = {
  label: string;
  tableType: string;
  type: string;
  rows: Array<Record<string, unknown>>;
};

function extractTokenFields(
  assetRaw: unknown,
  mintMeta: Map<string, MintMeta>,
): {
  mint: string;
  amount: number | null;
  price: number | null;
  usdValue: number | null;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
} | null {
  const asset = asRecord(enrichAssetNode(assetRaw, mintMeta));
  if (!asset) return null;
  const d = asRecord(asset.data) || {};
  const mint = canonMint(String(d.address || d.mint || asset.address || ''));
  const meta = mintMeta.get(mint) || {};
  const amount = d.amount != null ? Number(d.amount) : asset.amount != null ? Number(asset.amount) : null;
  const price = d.price != null ? Number(d.price) : null;
  const usdValue =
    asset.value != null
      ? Number(asset.value)
      : amount != null && price != null
        ? amount * price
        : null;
  return {
    mint,
    amount: Number.isFinite(amount as number) ? amount : null,
    price: Number.isFinite(price as number) ? price : null,
    usdValue: Number.isFinite(usdValue as number) ? usdValue : null,
    symbol: (d.symbol as string) || meta.symbol || null,
    name: (d.name as string) || meta.name || null,
    logoUrl: (d.logoUrl as string) || (d.logoURI as string) || meta.logoUrl || null,
  };
}

/**
 * Expand one Internal portfolio position into Public-shaped section bundles
 * (tableType / sectionName / multi-asset liquidity / leverage legs).
 */
function positionToSectionBundles(
  position: Record<string, unknown>,
  mintMeta: Map<string, MintMeta>,
): SectionBundle[] {
  const data = asRecord(position.data) || {};
  const posLabel = String(position.label || position.type || 'Position');
  const posType = String(position.type || '');
  const rawName = String(position.name || '').trim();
  // Internal often puts network id/name ("Solana" / "SOL") in `name` — not a pool description.
  const sectionName = /^(solana|sol)$/i.test(rawName) ? '' : rawName;
  const bundles = new Map<string, SectionBundle>();

  const ensure = (tableType: string, labelOverride?: string, typeOverride?: string): SectionBundle => {
    const label = labelOverride || sectionLabelFor(tableType, posLabel);
    const key = `${label.toLowerCase()}::${tableType}`;
    let b = bundles.get(key);
    if (!b) {
      b = { label, tableType, type: typeOverride || posType || tableType, rows: [] };
      bundles.set(key, b);
    }
    return b;
  };

  const pushTokenRow = (
    assetRaw: unknown,
    tableType: string,
    role: string,
    apy: number | null,
    opts?: { label?: string; type?: string; debt?: boolean },
  ) => {
    const t = extractTokenFields(assetRaw, mintMeta);
    if (!t) return;
    let amount = t.amount;
    let usdValue = t.usdValue;
    if (opts?.debt) {
      if (amount != null && amount > 0) amount = -amount;
      if (usdValue != null && usdValue > 0) usdValue = -usdValue;
    }
    ensure(tableType, opts?.label, opts?.type).rows.push({
      address: t.mint || null,
      amount,
      price: t.price,
      usdValue,
      symbol: t.symbol,
      name: t.name,
      logoUrl: t.logoUrl,
      logourl: t.logoUrl,
      tableType,
      sectionName,
      sectionType: opts?.type || posType || tableType,
      apy,
      source: 'internal-vybe-portfolio',
      role,
    });
  };

  // Borrow / lend positions → Lending + Borrowing (+ Rewards) sections
  if (Array.isArray(data.suppliedAssets) || Array.isArray(data.borrowedAssets) || Array.isArray(data.rewardAssets)) {
    const supplied = Array.isArray(data.suppliedAssets) ? data.suppliedAssets : [];
    const borrowed = Array.isArray(data.borrowedAssets) ? data.borrowedAssets : [];
    const rewards = Array.isArray(data.rewardAssets) ? data.rewardAssets : [];
    supplied.forEach((a, i) =>
      pushTokenRow(a, 'supplied', 'suppliedAssets', pickYieldApy(data.suppliedYields, i) ?? toUiApy(position.netApy), {
        label: 'Lending',
        type: posType || 'borrowlend',
      }),
    );
    borrowed.forEach((a, i) =>
      pushTokenRow(a, 'borrowed', 'borrowedAssets', pickYieldApy(data.borrowedYields, i) ?? toUiApy(position.netApy), {
        label: 'Borrowing',
        type: posType || 'borrowlend',
        debt: true,
      }),
    );
    rewards.forEach((a) =>
      pushTokenRow(a, 'rewards', 'rewardAssets', null, { label: 'Rewards', type: posType || 'multiple' }),
    );
  }

  // Generic single-asset bags (Staked / Deposit / Vesting / Rewards / LimitOrder)
  if (Array.isArray(data.assets) && !Array.isArray(data.suppliedAssets)) {
    const tableType = mapLabelToTableType(posLabel);
    const list = data.assets as unknown[];
    list.forEach((a, i) =>
      pushTokenRow(a, tableType, 'assets', pickYieldApy(data.assetsYields, i) ?? toUiApy(position.netApy)),
    );
  }

  // Liquidity / Farming / Vault → multi-leg liquidity rows
  if (Array.isArray(data.liquidities)) {
    const tableType = 'liquidity';
    for (const liq of data.liquidities as unknown[]) {
      const L = asRecord(enrichAssetNode(liq, mintMeta));
      if (!L) continue;
      const assets = Array.isArray(L.assets) ? (L.assets as unknown[]) : [];
      const legs = assets.map((a) => extractTokenFields(a, mintMeta)).filter(Boolean) as NonNullable<
        ReturnType<typeof extractTokenFields>
      >[];
      const liqName = String(L.name || sectionName || '').trim();
      const totalUsd =
        L.value != null
          ? Number(L.value)
          : legs.reduce((s, leg) => s + (leg.usdValue || 0), 0) || Number(position.value) || 0;
      const apy = toUiApy(
        Array.isArray(L.yields) && L.yields[0]
          ? asRecord(Array.isArray(L.yields[0]) ? L.yields[0][0] : L.yields[0])?.apy
          : position.netApy,
      );

      if (legs.length) {
        ensure(tableType).rows.push({
          address: legs.map((l) => l.mint),
          amount: legs.map((l) => l.amount),
          price: legs.length === 1 ? legs[0].price : null,
          usdValue: legs.map((l) => l.usdValue),
          totalUsdValue: totalUsd,
          symbol: legs.map((l) => l.symbol),
          name: legs.map((l) => l.name),
          logoUrl: legs.map((l) => l.logoUrl),
          logourl: legs.map((l) => l.logoUrl),
          tableType,
          sectionName: liqName,
          sectionType: posType || 'liquidity',
          apy,
          source: 'internal-vybe-portfolio',
          role: 'liquidity',
        });
      } else {
        ensure(tableType).rows.push({
          address: null,
          amount: null,
          price: null,
          usdValue: totalUsd,
          totalUsdValue: totalUsd,
          symbol: (L.symbol as string) || posLabel,
          name: (L.name as string) || posLabel,
          logoUrl: (L.logoUrl as string) || null,
          logourl: (L.logoUrl as string) || null,
          tableType,
          sectionName: liqName,
          sectionType: posType || 'liquidity',
          apy,
          source: 'internal-vybe-portfolio',
          role: 'liquidity',
        });
      }
    }
  }

  // Leverage / perps
  if (posType === 'leverage' || mapLabelToTableType(posLabel) === 'leverage') {
    const sides = [asRecord(data.cross), asRecord(data.isolated)].filter(Boolean) as Record<
      string,
      unknown
    >[];
    for (const sideBook of sides) {
      const bookLev = sideBook.leverage != null ? Number(sideBook.leverage) : null;
      const collateralValue = sideBook.collateralValue != null ? Number(sideBook.collateralValue) : null;
      const positions = Array.isArray(sideBook.positions) ? (sideBook.positions as unknown[]) : [];
      for (const pRaw of positions) {
        const p = asRecord(pRaw);
        if (!p) continue;
        const market = String(p.name || 'Market');
        ensure('leverage').rows.push({
          address: p.ref ? String(p.ref) : null,
          amount: p.size != null ? Number(p.size) : null,
          price: p.markPrice != null ? Number(p.markPrice) : p.entryPrice != null ? Number(p.entryPrice) : null,
          usdValue: p.sizeValue != null ? Number(p.sizeValue) : p.value != null ? Number(p.value) : null,
          symbol: market,
          name: market,
          logoUrl: null,
          logourl: null,
          tableType: 'leverage',
          sectionName: sectionName || market,
          sectionType: posType || 'leverage',
          side: p.side != null ? String(p.side) : null,
          leverage: bookLev,
          collateralValue,
          pnlValue: p.pnlValue != null ? Number(p.pnlValue) : null,
          apy: null,
          source: 'internal-vybe-portfolio',
          role: 'leverage',
        });
      }
    }
  }

  if (![...bundles.values()].some((b) => b.rows.length)) {
    const tableType = mapLabelToTableType(posLabel);
    ensure(tableType).rows.push({
      address: null,
      amount: null,
      price: null,
      usdValue: Number(position.value) || 0,
      symbol: posLabel,
      name: sectionName || posLabel,
      logoUrl: null,
      logourl: null,
      tableType,
      sectionName,
      sectionType: posType || tableType,
      apy: toUiApy(position.netApy),
      source: 'internal-vybe-portfolio',
      role: 'position',
    });
  }

  return [...bundles.values()].filter((b) => b.rows.length > 0);
}

function buildDefiPlatforms(
  defiDir: string,
  mintMeta: Map<string, MintMeta>,
): { platforms: Array<Record<string, unknown>>; totalUsd: number } {
  const inn = asRecord(readJson(path.join(defiDir, 'vybe-internal.response.json')));
  const portfolio = asRecord(asRecord(inn?.data)?.vybe_portfolio);
  const positions = Array.isArray(portfolio?.positions) ? (portfolio!.positions as unknown[]) : [];
  const logos = platformLogoMap(defiDir);

  const byPlatform = new Map<
    string,
    {
      platformId: string;
      platform: string;
      platformLogourl: string | null;
      platformWebsite: string | null;
      platformLabels: string[];
      sections: Map<string, SectionBundle>;
      totalValueUsd: number;
    }
  >();

  for (const posRaw of positions) {
    const pos = asRecord(posRaw);
    if (!pos) continue;
    const platformId = String(pos.platformId || 'unknown');
    const key = platformId.toLowerCase();
    let plat = byPlatform.get(key);
    if (!plat) {
      const logo = logos.get(key) || logos.get(platformId) || logos.get(platformId.replace(/-/g, ''));
      plat = {
        platformId,
        platform: logo?.name || platformId,
        platformLogourl: logo?.logo || null,
        platformWebsite: logo?.website || null,
        platformLabels: logo?.labels || [],
        sections: new Map(),
        totalValueUsd: 0,
      };
      byPlatform.set(key, plat);
    }

    plat.totalValueUsd += Number(pos.value) || 0;
    const enrichedPos = enrichAssetNode(pos, mintMeta) as Record<string, unknown>;
    for (const bundle of positionToSectionBundles(enrichedPos, mintMeta)) {
      const secKey = `${bundle.label.toLowerCase()}::${bundle.tableType}`;
      let section = plat.sections.get(secKey);
      if (!section) {
        section = { ...bundle, rows: [] };
        plat.sections.set(secKey, section);
      }
      section.rows.push(...bundle.rows);
    }
  }

  const platforms = [...byPlatform.values()]
    .map((p) => ({
      platform: p.platform,
      platformId: p.platformId,
      platformLabels: p.platformLabels,
      platformLogourl: p.platformLogourl,
      platformWebsite: p.platformWebsite,
      totalValueUsd: p.totalValueUsd,
      sections: [...p.sections.values()].sort((a, b) => {
        const aUsd = a.rows.reduce((s, r) => {
          const v = r.totalUsdValue ?? r.usdValue;
          if (Array.isArray(v)) return s + v.reduce((x, n) => x + (Number(n) || 0), 0);
          return s + Math.abs(Number(v) || 0);
        }, 0);
        const bUsd = b.rows.reduce((s, r) => {
          const v = r.totalUsdValue ?? r.usdValue;
          if (Array.isArray(v)) return s + v.reduce((x, n) => x + (Number(n) || 0), 0);
          return s + Math.abs(Number(v) || 0);
        }, 0);
        return bUsd - aUsd;
      }),
    }))
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd);

  const totalUsd = platforms.reduce((s, p) => s + (Number(p.totalValueUsd) || 0), 0);
  return { platforms, totalUsd };
}

function bumpCategory(
  map: Map<string, CachedPortfolio['categories'][number]>,
  id: string,
  label: string,
  valueUsd: number,
  count: number,
  kind: 'wallet' | 'defi',
) {
  const prev = map.get(id);
  if (prev) {
    prev.valueUsd += valueUsd;
    prev.count += count;
    return;
  }
  map.set(id, { id, label, valueUsd, count, kind });
}

export function listCachedInternalWallets(): string[] {
  const bal = listWalletDirs(BALANCE_CACHE_DIRS);
  const defi = listWalletDirs(DEFI_CACHE_DIRS);
  return [...new Set([...bal.keys(), ...defi.keys()])].sort();
}

export function buildInternalCachedPortfolio(ownerAddress: string): CachedPortfolio | null {
  const started = Date.now();
  const balMap = listWalletDirs(BALANCE_CACHE_DIRS);
  const defiMap = listWalletDirs(DEFI_CACHE_DIRS);
  const balanceDir = balMap.get(ownerAddress) || null;
  const defiDir = defiMap.get(ownerAddress) || null;
  if (!balanceDir && !defiDir) return null;

  const mintMeta = collectMintMeta(balanceDir, defiDir);
  const { tokens, solSummary } = balanceDir
    ? buildBalanceTokens(balanceDir, mintMeta)
    : { tokens: [], solSummary: undefined };
  const { platforms, totalUsd: defiUsd } = defiDir
    ? buildDefiPlatforms(defiDir, mintMeta)
    : { platforms: [], totalUsd: 0 };

  // Holdings have no Internal USD — keep totalUsd null for balances
  const categories = new Map<string, CachedPortfolio['categories'][number]>();
  bumpCategory(categories, 'wallet', 'Wallet', 0, tokens.length, 'wallet');
  for (const p of platforms) {
    for (const sec of (p.sections as Array<{ label?: string; rows?: unknown[]; tableType?: string }>) || []) {
      const rows = sec.rows || [];
      const usd = rows.reduce<number>((sum, r) => {
        const row = asRecord(r);
        if (!row) return sum;
        if (row.totalUsdValue != null) return sum + Math.abs(Number(row.totalUsdValue) || 0);
        const v = row.usdValue;
        if (Array.isArray(v)) return sum + v.reduce<number>((s, n) => s + Math.abs(Number(n) || 0), 0);
        return sum + Math.abs(Number(v) || 0);
      }, 0);
      const id = String(sec.tableType || sec.label || 'other').toLowerCase();
      bumpCategory(categories, id, String(sec.label || sec.tableType || 'Other'), usd, rows.length, 'defi');
    }
  }

  return {
    ownerAddress,
    source: 'internal-cache',
    tookMs: Date.now() - started,
    netWorthUsd: defiUsd, // balances intentionally excluded (no Internal USD)
    balances: {
      totalUsd: null,
      tokenCount: tokens.length,
      tokens,
      solSummary,
      note: 'Internal Rocks: mint + raw amount kept. Symbol/name/logo/decimals + market price/1d–7d/mcap/vol enriched from Public + Jupiter caches when present. Holding valueUsd stays null (Rocks has no USD).',
    },
    defi: {
      totalUsd: defiUsd,
      platformCount: platforms.length,
      platforms,
    },
    categories: [...categories.values()].sort((a, b) => b.valueUsd - a.valueUsd || b.count - a.count),
    meta: {
      balanceCacheDir: balanceDir,
      defiCacheDir: defiDir,
      mintMetaCount: mintMeta.size,
    },
  };
}

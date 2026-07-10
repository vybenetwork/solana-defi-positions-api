import type { AxiosInstance } from 'axios';
import { resolveTokenMeta } from './resolve-token-meta.js';
import { cachedMetaToApiResponse } from './token-meta-api.js';
import { isMintLikeLabel } from './token-label.js';
import { getCachedTokenMetaFromDisk } from '../token-icon-cache.js';

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
  return Boolean(symbol) && !isMintLikeLabel(symbol, mint) && !symbol.includes('…');
}

function tokenFromDisk(mint: string): DefiSymbolEnrichToken | null {
  const disk = getCachedTokenMetaFromDisk(mint);
  if (!disk) return null;
  const token = cachedMetaToApiResponse(disk, disk.priceSource) as DefiSymbolEnrichToken;
  token.mint = mint;
  return hasUsableSymbol(token) ? token : null;
}

/**
 * Resolve symbols sequentially: disk cache hit first, else Vybe token-details → Jupiter
 * (rotating HTTP proxy). Results are written to the server token-meta disk cache.
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

      const resolved = await resolveTokenMeta(http, mint, { preferVybe: true });
      if (!resolved) {
        console.warn(`[defi-symbol-enrich] ${mint.slice(0, 8)}… nothing found (vybe+jupiter)`);
        continue;
      }
      const token = cachedMetaToApiResponse(resolved.meta, resolved.source) as DefiSymbolEnrichToken;
      token.mint = mint;
      if (!hasUsableSymbol(token)) {
        console.warn(
          `[defi-symbol-enrich] ${mint.slice(0, 8)}… unusable symbol=${String(token.symbol ?? '')}`,
        );
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
    `[defi-symbol-enrich] ${label} done in ${Date.now() - started}ms — resolved=${ok}/${queue.length} disk=${fromDisk}`,
  );
  return out;
}

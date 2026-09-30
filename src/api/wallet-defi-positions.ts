/**
 * Vybe wallet DeFi positions: GET /v4/wallets/{owner}/defi-positions
 * Path param is the wallet address. No query parameters.
 * HTTP 502 is a partial result: the body still has `data.portfolio` plus `partial_failures`.
 */

import type { AxiosInstance } from 'axios';
import { withRetry } from './client.js';
import type { VybeDefiPlatformPosition, VybeDefiPositionsResponse, VybePortfolioElement } from '../types/api.js';

export async function getWalletDefiPositions(
  http: AxiosInstance,
  ownerAddress: string,
): Promise<VybeDefiPositionsResponse> {
  return withRetry(async () => {
    const res = await http.get<VybeDefiPositionsResponse>(
      `/v4/wallets/${encodeURIComponent(ownerAddress)}/defi-positions`,
      {
        validateStatus: (status) => status === 200 || status === 502,
      },
    );
    return res.data ?? {};
  });
}

export function portfolioElementsFromResponse(payload: VybeDefiPositionsResponse): VybePortfolioElement[] {
  const data = payload?.data;
  if (!data || Array.isArray(data)) return [];
  return Array.isArray(data.portfolio) ? data.portfolio : [];
}

export function legacyPlatformsFromResponse(payload: VybeDefiPositionsResponse): VybeDefiPlatformPosition[] | null {
  return Array.isArray(payload?.data) ? payload.data : null;
}

export function partialFailuresFromResponse(payload: VybeDefiPositionsResponse): string[] {
  if (!Array.isArray(payload?.partial_failures)) return [];
  return payload.partial_failures.map((name) => String(name || '').trim()).filter(Boolean);
}

export function sumDefiPositionsUsd(platforms: Array<{ totalValueUsd?: number | string | null }>): number {
  return platforms.reduce((sum, platform) => {
    const v = Number(platform.totalValueUsd);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
}

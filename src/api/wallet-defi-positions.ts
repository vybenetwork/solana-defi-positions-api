/**
 * Vybe wallet DeFi positions proxy: GET /v4/wallets/{owner}/defi-positions
 */

import type { AxiosInstance } from 'axios';
import { withRetry } from './client.js';
import type { VybeDefiPositionsResponse } from '../types/api.js';

export async function getWalletDefiPositions(
  http: AxiosInstance,
  ownerAddress: string,
): Promise<VybeDefiPositionsResponse> {
  return withRetry(async () => {
    const { data } = await http.get<VybeDefiPositionsResponse>(
      `/v4/wallets/${encodeURIComponent(ownerAddress)}/defi-positions`,
    );
    return data;
  });
}

export function sumDefiPositionsUsd(platforms: VybeDefiPositionsResponse['data']): number {
  return platforms.reduce((sum, platform) => {
    const v = Number(platform.totalValueUsd);
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
}

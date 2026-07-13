/**
 * Forced remote logo URLs for known mints / DeFi platforms.
 * These win over Vybe/Jupiter hints and are downloaded into the local icon cache.
 */

/** Official PYTH mint on Solana. */
export const PYTH_MINT = 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3';

/** Preferred Pyth brand asset (PNG). */
export const PYTH_LOGO_URL =
  'https://asset-metadata-service-production.s3.amazonaws.com/asset_icons/ec1fa3cb0bebe96f1403c8c05bfd6c28a4cd913b265dcc484ef4ac8c1ef4e5c8.png';

const MINT_LOGO_OVERRIDES: Record<string, string> = {
  [PYTH_MINT]: PYTH_LOGO_URL,
};

const PLATFORM_LOGO_OVERRIDES: Record<string, string> = {
  pyth: PYTH_LOGO_URL,
};

export function getMintLogoOverride(mint: string): string | undefined {
  const m = mint.trim();
  return m ? MINT_LOGO_OVERRIDES[m] : undefined;
}

export function getPlatformLogoOverride(platformId: string): string | undefined {
  const id = platformId.trim().toLowerCase();
  return id ? PLATFORM_LOGO_OVERRIDES[id] : undefined;
}

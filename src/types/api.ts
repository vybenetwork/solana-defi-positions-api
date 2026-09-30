/** Token details from GET /v4/tokens/{mintAddress} */
export interface VybeToken {
  mintAddress: string;
  symbol?: string;
  name?: string;
  decimal?: number;
  decimals?: number;
  logoUrl?: string;
  price?: number;
  price1d?: number;
  price7d?: number;
  updateTime?: number;
  priceUsd?: string;
  marketCap?: number;
  marketCapUsd?: string;
  verified?: boolean;
  category?: string | null;
  subcategory?: string | null;
  currentSupply?: number;
  tokenAmountVolume24h?: number | null;
  usdValueVolume24h?: number | null;
  [key: string]: unknown;
}

export interface VybeTokenBalance {
  mintAddress: string;
  amount: string;
  decimals: number;
  symbol?: string | null;
  name?: string | null;
  logoUrl?: string | null;
  priceUsd?: string;
  priceUsd1dChange?: string | null;
  priceUsd7dTrend?: string[] | null;
  valueUsd?: string;
  valueUsd1dChange?: string | null;
  verified?: boolean;
  category?: string | null;
  [key: string]: unknown;
}

/** Response from GET /v4/wallets/{ownerAddress}/token-balance */
export interface VybeWalletTokenBalanceResponse {
  ownerAddress: string;
  date: number;
  data: VybeTokenBalance[];
  totalTokenCount: number;
  totalTokenValueUsd: string;
  [key: string]: unknown;
}

export interface VybeDefiPositionRow {
  address?: string;
  amount?: number;
  apy?: number | null;
  logourl?: string;
  name?: string;
  price?: number;
  sectionName?: string;
  sectionType?: string;
  src?: string;
  symbol?: string;
  tableType?: string;
  usdValue?: number;
  [key: string]: unknown;
}

export interface VybeDefiPositionSection {
  label?: string | null;
  name?: string | null;
  rows?: VybeDefiPositionRow[];
  tableType?: string;
  type?: string;
  [key: string]: unknown;
}

export interface VybeDefiPlatformPosition {
  platform?: string;
  platformId?: string;
  platformLabels?: string[];
  platformLogourl?: string;
  platformPid?: string;
  platformWebsite?: string;
  sections?: VybeDefiPositionSection[];
  totalValueUsd?: number;
  [key: string]: unknown;
}

/** Asset inside a portfolio element (`token` | `generic` | `collectible`). */
export interface VybePortfolioAsset {
  type?: string;
  networkId?: string;
  value?: number | null;
  attributes?: Record<string, unknown>;
  name?: string;
  imageUri?: string | null;
  ref?: string;
  sourceRefs?: Array<{ name?: string; address?: string }>;
  link?: string;
  data?: {
    address?: string;
    amount?: number | null;
    price?: number | null;
    yield?: { apr?: number | null; apy?: number | null } | null;
    name?: string;
    imageUri?: string | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * One position from GET /v4/wallets/{owner}/defi-positions.
 * `type` selects the `data` shape: borrowlend | liquidity | leverage | trade | multiple.
 */
export interface VybePortfolioElement {
  type?: string;
  networkId?: string;
  platformId?: string;
  value?: number | null;
  label?: string;
  name?: string;
  tags?: string[];
  netApy?: number | null;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Response from GET /v4/wallets/{ownerAddress}/defi-positions.
 * Current envelope is `{ message, data: { portfolio } }`. `data` as a platform array is the legacy shape.
 * `partial_failures` is present on HTTP 502 when some protocol handlers failed.
 */
export interface VybeDefiPositionsResponse {
  message?: string;
  data?: { portfolio?: VybePortfolioElement[] } | VybeDefiPlatformPosition[];
  partial_failures?: string[] | null;
  /** Legacy grouped response only. */
  totalDefiValueUsd?: number | string;
  [key: string]: unknown;
}

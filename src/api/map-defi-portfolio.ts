/**
 * Map the flat DeFi Positions portfolio (`data.portfolio[]`) onto the
 * platform → section → row shape the positions UI already renders.
 *
 * Field renames from the legacy grouped payload:
 *   usdValue → element/asset `value`
 *   logourl → `imageUri`
 *   price string → `data.price` number | null
 *   apy number → `data.yield.{apr,apy}` and element `netApy` (ratios, scaled to percent)
 *   symbol removed (left blank so mint enrichment can fill a ticker; `name` is kept)
 *   address → `data.address`
 *   platform / platformPid / platformLabels / platformWebsite / totalValueUsd removed
 *     (grouped here by `platformId`; labels and website come from element label/link)
 */

import type { VybePortfolioAsset, VybePortfolioElement } from '../types/api.js';

export interface MappedDefiSection {
  label: string;
  name: string | null;
  tableType: string;
  type: string;
  healthRatio: number | null;
  rows: Array<Record<string, unknown>>;
}

export interface MappedDefiPlatform {
  platform: string;
  platformId: string;
  platformLabels: string[];
  platformLogourl: string | null;
  platformWebsite: string | null;
  totalValueUsd: number;
  sections: MappedDefiSection[];
}

const PLATFORM_NAMES: Record<string, string> = {
  kamino: 'Kamino',
  marginfi: 'MarginFi',
  marinade: 'Marinade',
  jito: 'Jito',
  jupiter: 'Jupiter',
  'jupiter-lend': 'Jupiter Lend',
  jupiterlend: 'Jupiter Lend',
  raydium: 'Raydium',
  orca: 'Orca',
  meteora: 'Meteora',
  drift: 'Drift',
  sanctum: 'Sanctum',
  solend: 'Solend',
  save: 'Save',
  phoenix: 'Phoenix',
  flash: 'Flash',
  zeta: 'Zeta',
  pyth: 'Pyth',
  blazestake: 'BlazeStake',
  lifinity: 'Lifinity',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finite(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** New yields are ratios (0.043 = 4.3%). The UI prints the number with a % suffix. */
function ratioToPercent(value: unknown): number | null {
  const n = finite(value);
  if (n == null) return null;
  return n * 100;
}

function firstYieldPercent(entry: unknown): number | null {
  if (Array.isArray(entry)) {
    for (const item of entry) {
      const n = firstYieldPercent(item);
      if (n != null) return n;
    }
    return null;
  }
  const row = asRecord(entry);
  if (!row) return null;
  if (row.apy != null || row.apr != null) return ratioToPercent(row.apy ?? row.apr);
  if (row.yield != null) return firstYieldPercent(row.yield);
  return null;
}

function yieldAt(yields: unknown, index: number): number | null {
  if (!Array.isArray(yields) || index < 0 || index >= yields.length) return null;
  return firstYieldPercent(yields[index]);
}

function humanizeLabel(label: string): string {
  return String(label || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function platformDisplayName(platformId: string): string {
  const key = platformId.toLowerCase();
  if (PLATFORM_NAMES[key]) return PLATFORM_NAMES[key]!;
  const pretty = humanizeLabel(platformId);
  return pretty.replace(/\b\w/g, (ch) => ch.toUpperCase()) || platformId;
}

function elementLink(element: VybePortfolioElement): string {
  const data = asRecord(element.data) || {};
  const direct = String(data.link || '').trim();
  if (direct) return direct;
  const nested = [
    ...(Array.isArray(data.liquidities) ? data.liquidities : []),
    asRecord(data.isolated),
    asRecord(data.cross),
  ];
  for (const raw of nested) {
    const link = String(asRecord(raw)?.link || '').trim();
    if (link) return link;
  }
  const assets = asRecord(data.assets);
  for (const raw of [assets?.input, assets?.output, ...(Array.isArray(data.assets) ? data.assets : [])]) {
    const link = String(asRecord(raw)?.link || '').trim();
    if (link) return link;
  }
  return '';
}

function positionName(element: VybePortfolioElement): string {
  const raw = String(element.name || '').trim();
  if (/^(solana|sol)$/i.test(raw)) return '';
  return raw;
}

function mapLabelToTableType(label: string, elementType: string): string {
  const s = `${label} ${elementType}`
    .trim()
    .toLowerCase()
    .replace(/[\s/_-]+/g, '');
  if (s.includes('reward')) return 'rewards';
  if (s.includes('borrow')) return 'borrowed';
  if (s.includes('lend') || s.includes('supplied') || s.includes('borrowlend')) return 'supplied';
  if (s.includes('vest')) return 'vesting';
  if (s.includes('limit') || s.includes('dca') || s.includes('order') || elementType === 'trade') return 'trade';
  if (s.includes('lever') || s.includes('perp') || s.includes('margin') || elementType === 'leverage') return 'leverage';
  if (s.includes('nativestake')) return 'nativeStaking';
  if (s.includes('stake')) return 'staked';
  if (s.includes('liquid') || s.includes('farm') || s.includes('vault') || s.includes('liquiditypool') || elementType === 'liquidity') {
    return 'liquidity';
  }
  if (s.includes('deposit')) return 'deposit';
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
      const raw = humanizeLabel(positionLabel);
      if (/farm/i.test(raw)) return 'Farming';
      if (/vault/i.test(raw)) return 'Vault';
      if (/stak/i.test(raw)) return 'Staked';
      if (/deposit/i.test(raw)) return 'Deposit';
      return 'Liquidity Pool';
    }
    case 'nativeStaking':
      return 'Solana Native';
    case 'leverage':
      return /margin/i.test(positionLabel) ? 'Margin' : 'Leverage';
    case 'staked':
      return 'Staked';
    case 'vesting':
      return 'Vesting';
    case 'trade': {
      const raw = humanizeLabel(positionLabel);
      if (/smart\s*dca/i.test(raw)) return 'Smart DCA';
      if (/dca/i.test(raw)) return 'DCA';
      if (/limit/i.test(raw)) return 'Limit Order';
      return raw || 'Orders';
    }
    case 'deposit':
      return /airdrop/i.test(positionLabel) ? 'Airdrop' : humanizeLabel(positionLabel) || 'Deposit';
    default:
      return humanizeLabel(positionLabel) || 'Positions';
  }
}

interface AssetLeg {
  mint: string;
  amount: number | null;
  price: number | null;
  usdValue: number | null;
  symbol: string | null;
  name: string | null;
  logoUrl: string | null;
  apy: number | null;
  ref: string | null;
}

function assetLeg(raw: unknown): AssetLeg | null {
  const asset = asRecord(raw) as VybePortfolioAsset | null;
  if (!asset) return null;
  const data = asRecord(asset.data) || {};
  const attrs = asRecord(asset.attributes) || {};
  const prediction = asRecord(attrs.prediction);
  const market = asRecord(prediction?.market);
  const kind = String(asset.type || 'token');
  const mint = String(data.address || '').trim();
  const amount = finite(data.amount);
  const price = finite(data.price);
  const usdValue = finite(asset.value) ?? (amount != null && price != null ? amount * price : null);
  const tokenName = String(asset.name || data.name || '').trim();
  const genericName = String(market?.marketTitle || prediction?.sideName || tokenName).trim();
  const collectibleName = String(data.name || asset.name || '').trim();
  const name = (kind === 'collectible' ? collectibleName : kind === 'generic' ? genericName : tokenName) || null;
  const symbol = kind === 'generic' ? String(prediction?.sideName || '').trim() || null : kind === 'collectible' ? name : null;
  const logoUrl = String(asset.imageUri || data.imageUri || '').trim() || null;
  return {
    mint,
    amount,
    price,
    usdValue,
    symbol,
    name,
    logoUrl,
    apy: firstYieldPercent(data.yield),
    ref: String(asset.ref || '').trim() || null,
  };
}

function tokenRow(
  leg: AssetLeg,
  tableType: string,
  sectionName: string,
  sectionType: string,
  apy: number | null,
  opts?: { debt?: boolean; role?: string; healthRatio?: number | null },
): Record<string, unknown> {
  let amount = leg.amount;
  let usdValue = leg.usdValue;
  if (opts?.debt) {
    if (amount != null && amount > 0) amount = -amount;
    if (usdValue != null && usdValue > 0) usdValue = -usdValue;
  }
  return {
    address: leg.mint || null,
    amount,
    price: leg.price,
    usdValue,
    symbol: leg.symbol,
    name: leg.name,
    logoUrl: leg.logoUrl,
    logourl: leg.logoUrl,
    tableType,
    sectionName,
    sectionType,
    apy,
    healthRatio: opts?.healthRatio ?? null,
    ref: leg.ref,
    role: opts?.role || tableType,
  };
}

type BundleMap = Map<string, MappedDefiSection>;

function ensureBundle(
  bundles: BundleMap,
  tableType: string,
  positionLabel: string,
  elementType: string,
  labelOverride?: string,
): MappedDefiSection {
  const label = labelOverride || sectionLabelFor(tableType, positionLabel);
  const key = `${label.toLowerCase()}::${tableType}`;
  let bundle = bundles.get(key);
  if (!bundle) {
    bundle = {
      label,
      name: null,
      tableType,
      type: elementType || tableType,
      healthRatio: null,
      rows: [],
    };
    bundles.set(key, bundle);
  }
  return bundle;
}

function noteHealth(bundle: MappedDefiSection, ratio: number | null): void {
  const state = bundle as MappedDefiSection & { healthMixed?: boolean };
  if (ratio == null || state.healthMixed) return;
  if (state.healthRatio == null) {
    state.healthRatio = ratio;
    return;
  }
  if (Math.abs(state.healthRatio - ratio) > 1e-9) {
    state.healthRatio = null;
    state.healthMixed = true;
  }
}

function pushAsset(
  bundles: BundleMap,
  raw: unknown,
  tableType: string,
  element: VybePortfolioElement,
  apy: number | null,
  opts?: { label?: string; debt?: boolean; role?: string; healthRatio?: number | null },
): void {
  const leg = assetLeg(raw);
  if (!leg) return;
  const bundle = ensureBundle(bundles, tableType, String(element.label || ''), String(element.type || ''), opts?.label);
  noteHealth(bundle, opts?.healthRatio ?? null);
  const sectionType = humanizeLabel(opts?.label || String(element.label || '')) || bundle.label;
  bundle.rows.push(
    tokenRow(leg, tableType, positionName(element), sectionType, apy ?? leg.apy, {
      debt: opts?.debt,
      role: opts?.role,
      healthRatio: opts?.healthRatio ?? null,
    }),
  );
}

function suppliedSectionLabel(element: VybePortfolioElement): string {
  const raw = humanizeLabel(String(element.label || ''));
  if (!raw || /lend/i.test(raw)) return 'Lending';
  return raw;
}

function mapBorrowLend(element: VybePortfolioElement, bundles: BundleMap): void {
  const data = asRecord(element.data) || {};
  const health = finite(data.healthRatio);
  const netApy = ratioToPercent(element.netApy);
  const supplied = Array.isArray(data.suppliedAssets) ? data.suppliedAssets : [];
  const borrowed = Array.isArray(data.borrowedAssets) ? data.borrowedAssets : [];
  const rewards = Array.isArray(data.rewardAssets) ? data.rewardAssets : [];
  const unsettled = asRecord(data.unsettled);
  const unsettledAssets = Array.isArray(unsettled?.assets) ? unsettled.assets : [];

  supplied.forEach((asset, index) => {
    pushAsset(bundles, asset, 'supplied', element, yieldAt(data.suppliedYields, index) ?? netApy, {
      label: suppliedSectionLabel(element),
      role: 'supplied',
      healthRatio: health,
    });
  });
  borrowed.forEach((asset, index) => {
    pushAsset(bundles, asset, 'borrowed', element, yieldAt(data.borrowedYields, index) ?? netApy, {
      label: 'Borrowing',
      role: 'borrowed',
      debt: true,
      healthRatio: health,
    });
  });
  rewards.forEach((asset) => {
    pushAsset(bundles, asset, 'rewards', element, null, { label: 'Rewards', role: 'reward' });
  });
  unsettledAssets.forEach((asset) => {
    pushAsset(bundles, asset, 'deposit', element, null, { label: 'Unsettled', role: 'unsettled' });
  });
}

function mapLiquidity(element: VybePortfolioElement, bundles: BundleMap): void {
  const data = asRecord(element.data) || {};
  const liquidities = Array.isArray(data.liquidities) ? data.liquidities : [];
  const tableType = 'liquidity';
  const netApy = ratioToPercent(element.netApy);
  const bundle = ensureBundle(bundles, tableType, String(element.label || ''), String(element.type || 'liquidity'));

  for (const raw of liquidities) {
    const pool = asRecord(raw);
    if (!pool) continue;
    const assets = Array.isArray(pool.assets) ? pool.assets : [];
    const legs = assets.map((asset) => assetLeg(asset)).filter((leg): leg is AssetLeg => leg != null);
    const poolName = String(pool.name || positionName(element) || '').trim();
    const yields = Array.isArray(pool.yields) ? pool.yields : [];
    const apy = firstYieldPercent(yields[0]) ?? netApy;
    const totalUsd = finite(pool.value) ?? finite(element.value) ?? legs.reduce((sum, leg) => sum + (leg.usdValue || 0), 0);
    const sectionType = humanizeLabel(String(element.label || '')) || bundle.label;

    if (legs.length > 0) {
      bundle.rows.push({
        address: legs.map((leg) => leg.mint),
        amount: legs.map((leg) => leg.amount),
        price: legs.length === 1 ? legs[0]!.price : null,
        usdValue: legs.map((leg) => leg.usdValue),
        totalUsdValue: totalUsd,
        symbol: legs.map((leg) => leg.symbol),
        name: legs.map((leg) => leg.name),
        logoUrl: legs.map((leg) => leg.logoUrl),
        logourl: legs.map((leg) => leg.logoUrl),
        tableType,
        sectionName: poolName,
        sectionType,
        apy,
        ref: String(pool.ref || '').trim() || null,
        role: 'liquidity',
      });
    } else if (totalUsd != null) {
      bundle.rows.push({
        address: null,
        amount: null,
        price: null,
        usdValue: totalUsd,
        totalUsdValue: totalUsd,
        symbol: null,
        name: poolName || bundle.label,
        logoUrl: null,
        logourl: null,
        tableType,
        sectionName: poolName,
        sectionType,
        apy,
        ref: String(pool.ref || '').trim() || null,
        role: 'liquidity',
      });
    }

    const rewards = Array.isArray(pool.rewardAssets) ? pool.rewardAssets : [];
    rewards.forEach((asset) => {
      pushAsset(bundles, asset, 'rewards', element, null, { label: 'Rewards', role: 'reward' });
    });
  }
}

function mapLeverage(element: VybePortfolioElement, bundles: BundleMap): void {
  const data = asRecord(element.data) || {};
  const books = [
    { book: asRecord(data.isolated), kind: 'Isolated' },
    { book: asRecord(data.cross), kind: 'Cross' },
  ].filter((entry): entry is { book: Record<string, unknown>; kind: string } => entry.book != null);
  const bundle = ensureBundle(bundles, 'leverage', String(element.label || ''), String(element.type || 'leverage'));
  const sectionType = humanizeLabel(String(element.label || '')) || bundle.label;
  const fallbackName = positionName(element);

  for (const { book, kind } of books) {
    const bookLeverage = finite(book.leverage);
    const bookCollateral = finite(book.collateralValue);
    const positions = Array.isArray(book.positions) ? book.positions : [];
    positions.forEach((raw, index) => {
      const position = asRecord(raw);
      if (!position) return;
      const market = String(position.name || fallbackName || kind).trim() || kind;
      const leverage = finite(position.leverage) ?? bookLeverage;
      const collateral = finite(position.collateralValue) ?? (index === 0 ? bookCollateral : null);
      bundle.rows.push({
        address: String(position.address || position.ref || '').trim() || null,
        amount: finite(position.size),
        price: finite(position.markPrice) ?? finite(position.entryPrice),
        usdValue: finite(position.sizeValue) ?? finite(position.value),
        symbol: market,
        name: market,
        logoUrl: String(position.imageUri || '').trim() || null,
        logourl: String(position.imageUri || '').trim() || null,
        tableType: 'leverage',
        sectionName: fallbackName && fallbackName !== market ? fallbackName : '',
        sectionType,
        side: position.side != null ? String(position.side) : null,
        leverage,
        collateralValue: collateral,
        pnlValue: finite(position.pnlValue),
        entryPrice: finite(position.entryPrice),
        markPrice: finite(position.markPrice),
        liquidationPrice: finite(position.liquidationPrice),
        apy: null,
        ref: String(position.ref || '').trim() || null,
        role: 'leverage',
      });
    });
  }
}

function mapTrade(element: VybePortfolioElement, bundles: BundleMap): void {
  const data = asRecord(element.data) || {};
  const assets = asRecord(data.assets) || {};
  const input = assetLeg(assets.input);
  const output = assetLeg(assets.output);
  const legs = [input, output].filter((leg): leg is AssetLeg => leg != null);
  const tableType = 'trade';
  const bundle = ensureBundle(bundles, tableType, String(element.label || ''), String(element.type || 'trade'));
  const label = humanizeLabel(String(element.label || '')) || bundle.label;
  const inputAmount = finite(data.initialInputAmount) ?? input?.amount ?? null;
  const withdrawn = finite(data.withdrawnOutputAmount);
  const expected = finite(data.expectedOutputAmount);
  const outputAmount = withdrawn != null && withdrawn !== 0 ? withdrawn : expected ?? output?.amount ?? null;
  const filled = finite(data.filledPercentage);
  const totalUsd = finite(element.value) ?? input?.usdValue ?? null;

  if (legs.length === 0 && totalUsd == null) return;

  const addresses = [
    String(data.inputAddress || input?.mint || '').trim(),
    String(data.outputAddress || output?.mint || '').trim(),
  ];
  bundle.rows.push({
    address: addresses.some(Boolean) ? addresses : null,
    amount: [inputAmount, outputAmount],
    price: null,
    usdValue: totalUsd,
    totalUsdValue: totalUsd,
    symbol: [input?.symbol ?? null, output?.symbol ?? null],
    name: [input?.name ?? null, output?.name ?? null],
    logoUrl: [input?.logoUrl ?? null, output?.logoUrl ?? null],
    logourl: [input?.logoUrl ?? null, output?.logoUrl ?? null],
    tableType,
    sectionName: positionName(element),
    sectionType: label,
    apy: null,
    filledPct: filled == null ? null : Math.abs(filled) <= 1 ? filled * 100 : filled,
    ref: String(data.ref || '').trim() || null,
    role: 'trade',
  });
}

function mapMultiple(element: VybePortfolioElement, bundles: BundleMap): void {
  const data = asRecord(element.data) || {};
  const assets = Array.isArray(data.assets) ? data.assets : [];
  const netApy = ratioToPercent(element.netApy);
  assets.forEach((asset, index) => {
    let tableType = mapLabelToTableType(String(element.label || ''), 'multiple');
    // `multiple` is a token list. Margin here is collateral, not a perp row.
    if (tableType === 'leverage' || tableType === 'trade' || tableType === 'liquidity') tableType = 'deposit';
    pushAsset(bundles, asset, tableType, element, yieldAt(data.assetsYields, index) ?? netApy, {
      role: 'asset',
    });
  });
}

function mapElement(element: VybePortfolioElement, bundles: BundleMap): void {
  const type = String(element.type || '').toLowerCase();
  const data = asRecord(element.data) || {};
  if (
    type === 'borrowlend' ||
    Array.isArray(data.suppliedAssets) ||
    Array.isArray(data.borrowedAssets) ||
    Array.isArray(data.rewardAssets)
  ) {
    mapBorrowLend(element, bundles);
  } else if (type === 'liquidity' || Array.isArray(data.liquidities)) {
    mapLiquidity(element, bundles);
  } else if (type === 'leverage' || asRecord(data.isolated) || asRecord(data.cross)) {
    mapLeverage(element, bundles);
  } else if (type === 'trade' || asRecord(data.assets)?.input || asRecord(data.assets)?.output) {
    mapTrade(element, bundles);
  } else if (type === 'multiple' || Array.isArray(data.assets)) {
    mapMultiple(element, bundles);
  }

  if ([...bundles.values()].some((bundle) => bundle.rows.length > 0)) return;

  const tableType = mapLabelToTableType(String(element.label || ''), type);
  const bundle = ensureBundle(bundles, tableType, String(element.label || ''), type || tableType);
  const usd = finite(element.value);
  bundle.rows.push({
    address: null,
    amount: null,
    price: null,
    usdValue: usd,
    totalUsdValue: usd,
    symbol: humanizeLabel(String(element.label || type || 'Position')) || 'Position',
    name: positionName(element) || null,
    logoUrl: null,
    logourl: null,
    tableType,
    sectionName: positionName(element),
    sectionType: humanizeLabel(String(element.label || type || bundle.label)),
    apy: ratioToPercent(element.netApy),
    role: 'position',
  });
}

function sectionUsd(section: MappedDefiSection): number {
  return section.rows.reduce((sum, row) => {
    const total = finite(row.totalUsdValue);
    if (total != null) return sum + Math.abs(total);
    const usd = row.usdValue;
    if (Array.isArray(usd)) {
      return sum + usd.reduce((acc, item) => acc + Math.abs(finite(item) ?? 0), 0);
    }
    return sum + Math.abs(finite(usd) ?? 0);
  }, 0);
}

export function sumPortfolioValueUsd(elements: VybePortfolioElement[]): number {
  return elements.reduce((sum, element) => {
    const value = finite(element?.value);
    return sum + (value ?? 0);
  }, 0);
}

export function mapPortfolioElementsToPlatforms(elements: VybePortfolioElement[]): MappedDefiPlatform[] {
  const list = Array.isArray(elements) ? elements : [];
  const byPlatform = new Map<
    string,
    {
      platformId: string;
      platform: string;
      labels: string[];
      website: string | null;
      totalValueUsd: number;
      sections: BundleMap;
    }
  >();

  for (const raw of list) {
    const element = asRecord(raw) as VybePortfolioElement | null;
    if (!element) continue;
    const platformId = String(element.platformId || 'unknown').trim() || 'unknown';
    const key = platformId.toLowerCase();
    let platform = byPlatform.get(key);
    if (!platform) {
      platform = {
        platformId,
        platform: platformDisplayName(platformId),
        labels: [],
        website: null,
        totalValueUsd: 0,
        sections: new Map(),
      };
      byPlatform.set(key, platform);
    }

    const value = finite(element.value);
    if (value != null) platform.totalValueUsd += value;

    const label = humanizeLabel(String(element.label || ''));
    if (label && !platform.labels.includes(label)) platform.labels.push(label);
    for (const tag of Array.isArray(element.tags) ? element.tags : []) {
      const text = humanizeLabel(String(tag || ''));
      if (text && !platform.labels.includes(text)) platform.labels.push(text);
    }

    const link = elementLink(element);
    if (link && !platform.website) platform.website = link;

    const scratch: BundleMap = new Map();
    mapElement(element, scratch);
    for (const [secKey, bundle] of scratch) {
      const existing = platform.sections.get(secKey);
      if (!existing) {
        platform.sections.set(secKey, bundle);
        continue;
      }
      existing.rows.push(...bundle.rows);
      const incoming = bundle as MappedDefiSection & { healthMixed?: boolean };
      const current = existing as MappedDefiSection & { healthMixed?: boolean };
      if (incoming.healthMixed || current.healthMixed) {
        current.healthRatio = null;
        current.healthMixed = true;
      } else {
        noteHealth(existing, bundle.healthRatio);
      }
    }
  }

  return [...byPlatform.values()]
    .map((platform) => ({
      platform: platform.platform,
      platformId: platform.platformId,
      platformLabels: platform.labels,
      platformLogourl: null,
      platformWebsite: platform.website,
      totalValueUsd: platform.totalValueUsd,
      sections: [...platform.sections.values()]
        .filter((section) => section.rows.length > 0)
        .sort((a, b) => sectionUsd(b) - sectionUsd(a))
        .map((section) => {
          const state = section as MappedDefiSection & { healthMixed?: boolean };
          if (!state.healthMixed && state.healthRatio != null) {
            for (const row of state.rows) delete row.healthRatio;
          }
          delete state.healthMixed;
          return state;
        }),
    }))
    .filter((platform) => platform.sections.length > 0)
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd);
}

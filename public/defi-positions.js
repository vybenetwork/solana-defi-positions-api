'use strict';

(function () {
const walletInput = document.getElementById('wallet');
const defiSummaryLabel = document.getElementById('defiSummaryLabel');
const defiLastUpdatedValue = document.getElementById('defiLastUpdatedValue');
const defiSummaryStats = document.getElementById('defiSummaryStats');
const defiSummaryLoading = document.getElementById('defiSummaryLoading');
const defiMeta = document.getElementById('defiMeta');
const defiPlatforms = document.getElementById('defiPlatforms');
const defiLoading = document.getElementById('defiLoading');
const defiError = document.getElementById('defiError');
const defiHideDustInput = document.getElementById('defiHideDust');
const defiCategoryPie = document.getElementById('defiCategoryPie');
const defiCategoryLegend = document.getElementById('defiCategoryLegend');
const defiCategoryPieTitle = document.getElementById('defiCategoryPieTitle');
const defiCategoryPieLede = document.getElementById('defiCategoryPieLede');
const defiCategoryPieInsight = document.getElementById('defiCategoryPieInsight');
const defiValueUsdBars = document.getElementById('defiValueUsdBars');
const defiStatsMeta = document.getElementById('defiStatsMeta');
const defiStatsLoading = document.getElementById('defiStatsLoading');

const DEFI_PIE_HEX = ['#4ade80', '#60a5fa', '#f87171', '#fb923c'];
const DEFI_CATEGORY_LABELS = {
  rewards: 'Rewards',
  staked: 'Staked',
  supplied: 'Lending',
  liquidity: 'Liquidity',
  nativeStaking: 'Native Staking',
  borrowed: 'Borrowing',
  vesting: 'Vesting',
  deposit: 'Deposit',
  leverage: 'Leverage',
  default: 'Other',
};
const DEFI_TIER_LEGEND_SVG_VOLUME =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 12h12M4 9h8M6 6h4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const USD_MAGNITUDE_BAR_COLORS = {
  red: '#ef4444',
  orange: '#fb923c',
  yellow: '#facc15',
  lightGreen: '#86efac',
  green: '#22c55e',
};
const WALLET_USD_BAND_COLORS = [
  USD_MAGNITUDE_BAR_COLORS.orange,
  USD_MAGNITUDE_BAR_COLORS.yellow,
  USD_MAGNITUDE_BAR_COLORS.lightGreen,
  USD_MAGNITUDE_BAR_COLORS.green,
  USD_MAGNITUDE_BAR_COLORS.green,
  USD_MAGNITUDE_BAR_COLORS.green,
  USD_MAGNITUDE_BAR_COLORS.green,
  USD_MAGNITUDE_BAR_COLORS.green,
];
const HOLDERS_MONEY_BAG_SVG =
  '<path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M38.14,21.15c-1.9-5.6-3.6-11.25-5.05-17c5.38-5.9,26.15-5.12,32.13-0.09l-5.53,13.15 c2.98-3.91,3.98-5.51,5.75-7.69c0.75,0.49,1.45,1.04,2.11,1.64c1.57,1.42,2.98,3,3.26,5.19c0.18,1.42-0.22,2.87-1.49,4.35 L56.63,35.48c-1.63-0.27-3.23-0.66-4.78-1.21c0.72-1.69,1.59-3.56,2.31-5.25L49.54,34c-4.81-1.02-8.69-0.41-12.29,1.5L24.37,20.05 c-0.76-0.92-1.11-1.84-1.11-2.76c0.01-3.73,5.57-6.96,8.5-8.18L38.14,21.15L38.14,21.15z M54.64,49.06l-2.51-11.49 c10.76,2,28.01,23.89,33.58,33.84c2.84,5.08,5.34,10.68,7.38,16.93c4.06,15.14,0.15,29.3-16.27,32.6 c-10.29,2.07-29.48,2.21-40.3,1.65c-11.63-0.6-29.64-0.58-34.34-12.53c-7.59-19.28,6.32-42.25,19-56.31 c1.67-1.85,3.39-3.57,5.18-5.17c4.61-4.06,9.59-8.87,15.52-10.88l-5.74,10.68l8.33-11.04h4.39L54.64,49.06L54.64,49.06z M49.29,58.49v2.03c2.15,0.23,4,0.67,5.54,1.33c1.54,0.67,2.88,1.67,4.03,3.02c0.91,1.03,1.61,2.09,2.1,3.17 c0.49,1.09,0.74,2.08,0.74,2.99c0,1.01-0.37,1.88-1.1,2.61c-0.74,0.73-1.63,1.1-2.68,1.1c-1.98,0-3.26-1.07-3.84-3.2 c-0.67-2.51-2.26-4.19-4.8-5.01v12.55c2.49,0.68,4.49,1.31,5.96,1.87c1.48,0.56,2.81,1.37,3.97,2.44c1.25,1.1,2.21,2.43,2.89,3.96 c0.67,1.54,1.01,3.22,1.01,5.05c0,2.29-0.53,4.44-1.62,6.43c-1.08,2.01-2.67,3.63-4.76,4.91c-2.1,1.27-4.58,2.02-7.46,2.25v2.05 c0,1.18-0.12,2.05-0.35,2.59c-0.23,0.54-0.73,0.81-1.52,0.81c-0.72,0-1.23-0.22-1.52-0.66c-0.29-0.44-0.43-1.13-0.43-2.06v-2.68 c-2.35-0.26-4.41-0.81-6.17-1.66c-1.76-0.84-3.23-1.89-4.41-3.15c-1.17-1.27-2.05-2.57-2.6-3.92c-0.57-1.36-0.84-2.7-0.84-4 c0-0.96,0.37-1.83,1.13-2.6c0.75-0.77,1.69-1.16,2.81-1.16c0.91,0,1.67,0.21,2.3,0.63c0.62,0.42,1.05,1.02,1.3,1.78 c0.54,1.65,1.01,2.91,1.41,3.79c0.41,0.87,1.02,1.68,1.83,2.4c0.81,0.72,1.89,1.28,3.24,1.66V85.79c-2.7-0.75-4.94-1.57-6.75-2.49 c-1.81-0.92-3.28-2.21-4.4-3.9c-1.12-1.69-1.69-3.86-1.69-6.51c0-3.46,1.1-6.3,3.3-8.5c2.2-2.21,5.38-3.5,9.54-3.86v-1.97 c0-1.69,0.64-2.53,1.9-2.53C48.65,56.02,49.29,56.84,49.29,58.49L49.29,58.49z M45.46,77.95V66.4c-1.69,0.5-3.01,1.16-3.95,1.99 c-0.95,0.82-1.42,2.08-1.42,3.75c0,1.58,0.44,2.79,1.33,3.6C42.3,76.55,43.65,77.29,45.46,77.95L45.46,77.95z M49.29,86.9v13.22 c2.03-0.4,3.59-1.21,4.7-2.44c1.1-1.24,1.66-2.66,1.66-4.29c0-1.75-0.54-3.1-1.62-4.06C52.96,88.37,51.38,87.56,49.29,86.9 L49.29,86.9z"/>';

const SOLSCAN_TOKEN = 'https://solscan.io/token/';
const TOKEN_PLACEHOLDER = '/token-placeholder.png';
const DEFI_META_PLACEHOLDER = 'Load a wallet to see DeFi positions from the Vybe API.';
const DUST_USD_THRESHOLD = 0.1;
const DUST_USD_LABEL = '$0.10';
const STAKE_STATUS_LABELS = { 4: 'Active', 6: 'Inactive' };

let lastPayload = null;
/** @type {Set<string>} Platform ids with dust expanded */
const expandedDustPlatforms = new Set();
/** @type {Map<string, { symbol: string, name: string, logo: string }>} */
let balanceMetaByMint = new Map();

function toNum(value) {
  if (Array.isArray(value)) {
    const sum = value.reduce((acc, item) => acc + (toNum(item) ?? 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isMultiAssetRow(row) {
  return Array.isArray(row?.amount) || Array.isArray(row?.address) || Array.isArray(row?.symbol);
}

function effectiveUsd(row) {
  const total = toNum(row?.totalUsdValue);
  if (total != null) return total;
  const scalar = toNum(row?.usdValue);
  if (scalar != null) return scalar;
  if (Array.isArray(row?.usdValue)) {
    const sum = row.usdValue.reduce((acc, item) => acc + (toNum(item) ?? 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }
  return 0;
}

function absUsd(row) {
  return Math.abs(effectiveUsd(row));
}

function isDustRow(row) {
  return absUsd(row) < DUST_USD_THRESHOLD;
}

function hideDustEnabled() {
  return Boolean(defiHideDustInput?.checked);
}

function resolveTableType(section, row) {
  return String(row?.tableType || section?.tableType || section?.type || 'default').trim() || 'default';
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanStr(value) {
  if (value == null) return '';
  return String(value).trim();
}

function looksLikeAddressOrMint(text, mint) {
  const s = cleanStr(text);
  if (!s) return true;
  if (s.includes('…')) return true;
  if (mint && s === mint) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)) return true;
  return false;
}

function isValidLabel(text, mint) {
  const s = cleanStr(text);
  return s.length > 0 && !looksLikeAddressOrMint(s, mint);
}

/** Fill missing symbol/name/logo from wallet balances — never overwrite valid DeFi fields. */
function resolveLegFields(symbol, name, logo, mint) {
  const bal = mint ? balanceMetaByMint.get(mint) : null;
  let sym = isValidLabel(symbol, mint) ? cleanStr(symbol) : '';
  let nm = isValidLabel(name, mint) ? cleanStr(name) : '';
  let lg = cleanStr(logo);

  if (bal) {
    if (!sym && isValidLabel(bal.symbol, mint)) sym = bal.symbol;
    if (!nm && isValidLabel(bal.name, mint)) nm = bal.name;
    if (!lg && bal.logo) lg = bal.logo;
  }

  const displayLabel = sym || nm || (mint ? shortAddress(mint) : 'Unknown');
  let secondaryName = '';
  if (sym && nm && nm !== sym) secondaryName = nm;
  else if (sym && bal?.name && bal.name !== sym && isValidLabel(bal.name, mint) && !nm) secondaryName = bal.name;

  return {
    symbol: sym,
    name: nm,
    logo: lg || TOKEN_PLACEHOLDER,
    displayLabel,
    secondaryName,
  };
}

function assetLabel(symbol, name, address) {
  return resolveLegFields(symbol, name, null, address).displayLabel;
}

function setBalanceMeta(tokens) {
  balanceMetaByMint = new Map();
  if (!Array.isArray(tokens)) {
    if (lastPayload) renderPlatforms(lastPayload);
    return 0;
  }
  for (const token of tokens) {
    const mint = cleanStr(token.mintAddress || token.address);
    if (!mint) continue;
    balanceMetaByMint.set(mint, {
      symbol: cleanStr(token.symbol),
      name: cleanStr(token.name),
      logo: cleanStr(token.logoUrl || token.logourl),
    });
  }
  if (lastPayload) renderPlatforms(lastPayload);
  return balanceMetaByMint.size;
}

function formatDefiTableUsdFraction(abs) {
  if (!Number.isFinite(abs) || abs <= 0) return '0.00';
  if (abs >= 0.01) {
    const rounded = Math.round(abs * 100) / 100;
    return rounded.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: abs >= 1000,
    });
  }
  const frac = abs.toFixed(20).split('.')[1] || '';
  let firstNonZeroIdx = 0;
  while (firstNonZeroIdx < frac.length && frac[firstNonZeroIdx] === '0') firstNonZeroIdx += 1;
  if (firstNonZeroIdx >= frac.length) return '0.00';
  return abs.toFixed(firstNonZeroIdx + 1);
}

function formatDefiTableUsd(value, { debt = false } = {}) {
  const n = toNum(value);
  if (n == null) return '—';
  if (n === 0) return '$0.00';
  const prefix = debt && n < 0 ? '−' : '';
  return `${prefix}$${formatDefiTableUsdFraction(Math.abs(n))}`;
}

function formatUsd(value, { debt = false } = {}) {
  const n = toNum(value);
  if (n == null) return '—';
  const prefix = debt && n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${prefix}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (abs >= 1000) return `${prefix}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `${prefix}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 0.01) return `${prefix}$${abs.toFixed(4)}`;
  if (n === 0) return '$0.00';
  return `${prefix}$${abs.toFixed(6)}`;
}

function formatAmount(value) {
  const n = toNum(value);
  if (n == null) return '—';
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

function formatPct(value) {
  const n = toNum(value);
  if (n == null) return '—';
  return `${n.toFixed(2)}%`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortAddress(value) {
  const s = String(value ?? '').trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function formatPctSmart(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return '0%';
  const abs = Math.abs(num);
  if (abs < 0.01) return '<0.01%';
  if (abs >= 10) return `${Math.round(num)}%`;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

function formatRoundedValue(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return '0';
  if (num > 0 && num < 0.01) return '0.01';
  if (num < 0 && num > -0.01) return '-0.01';
  const abs = Math.abs(num);
  if (abs < 1) return num.toFixed(2);
  return String(Math.round(num));
}

function formatBandTotalUsd(n) {
  const num = toNum(n);
  if (!Number.isFinite(num) || num <= 0) return '$0';
  return `$${formatRoundedValue(num)}`;
}

function defiCategoryLabel(key) {
  const clean = String(key || '').trim();
  if (!clean) return DEFI_CATEGORY_LABELS.default;
  return DEFI_CATEGORY_LABELS[clean] || clean.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (s) => s.toUpperCase());
}

function walletUsdBands() {
  return [
    { label: '$0.01', contains: (v) => v > 0 && v < 0.01 },
    { label: '$0.01-$0.10', contains: (v) => v >= 0.01 && v < 0.1 },
    { label: '$0.10-$1', contains: (v) => v >= 0.1 && v < 1 },
    { label: '$1-$10', contains: (v) => v >= 1 && v < 10 },
    { label: '$10-$100', contains: (v) => v >= 10 && v < 100 },
    { label: '$100-$1,000', contains: (v) => v >= 100 && v < 1000 },
    { label: '$1,000-$10,000', contains: (v) => v >= 1000 && v < 10000 },
    { label: '$10,000+', contains: (v) => v >= 10000 },
  ];
}

function walletUsdBandColor(i) {
  return WALLET_USD_BAND_COLORS[i] ?? USD_MAGNITUDE_BAR_COLORS.green;
}

function holdersMoneyBagIconHtml(bandLabel, color) {
  const tip = bandLabel ? `USD band ${bandLabel}` : 'USD value band';
  const style = color ? ` style="color:${escapeHtml(color)}"` : '';
  return `<span class="holders-value-usd-bag"${style} title="${escapeHtml(tip)}" aria-label="${escapeHtml(tip)}"><svg class="holders-value-usd-bag__svg" viewBox="0 0 94.56 122.88" aria-hidden="true">${HOLDERS_MONEY_BAG_SVG}</svg></span>`;
}

function formatPositionCountWord(count) {
  return Number(count) === 1 ? 'position' : 'positions';
}

function setDefiLegendGrid(el, sliceCount) {
  if (!el) return;
  el.classList.remove('token-supply-legend--cols2', 'token-supply-legend--cols3', 'token-supply-legend--cols6');
  if (sliceCount <= 3) el.classList.add('token-supply-legend--cols3');
  else if (sliceCount === 4) el.classList.add('token-supply-legend--cols2');
  else el.classList.add('token-supply-legend--cols6');
}

function renderDefiTierCard(args) {
  return `<div class="token-supply-legend-item token-supply-legend-item--tier-dashboard">
    <article class="token-tier-card" style="--tier-accent:${args.accent};--tier-swatch:${args.swatchColor}">
      <h4 class="token-tier-card__title"><span class="token-tier-card__title-text">${escapeHtml(args.title)}</span></h4>
      <ul class="token-tier-card__metrics">
        <li class="token-tier-metric">
          <span class="token-tier-metric__ico token-tier-metric__ico--share-swatch" style="--tier-swatch:${args.swatchColor}" aria-hidden="true"></span>
          <div class="token-tier-metric__body"><span class="token-tier-metric__slice-pct">${formatPctSmart(args.slicePct)}</span><span class="token-tier-metric__muted">${escapeHtml(args.shareLabel ?? ' of positions')}</span></div>
        </li>
        <li class="token-tier-metric">
          <span class="token-tier-metric__ico token-tier-metric__ico--usd" aria-hidden="true">$</span>
          <div class="token-tier-metric__body"><span class="token-tier-metric__accent-usd">${args.usdLine}</span></div>
        </li>
        <li class="token-tier-metric">
          <span class="token-tier-metric__ico token-tier-metric__ico--volume" aria-hidden="true">${DEFI_TIER_LEGEND_SVG_VOLUME}</span>
          <div class="token-tier-metric__body"><span class="token-tier-metric__accent-volume">${escapeHtml(args.amountLine)}</span></div>
        </li>
      </ul>
    </article>
  </div>`;
}

function renderDefiTierCardPlaceholder(title, accent, swatch) {
  return renderDefiTierCard({
    title,
    accent,
    swatchColor: swatch,
    slicePct: 0,
    usdLine: '—',
    amountLine: '—',
  });
}

function renderDefiUsdBarRow(d, i, count, total, maxC, sumUsd) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const w = Math.min(100, (count / maxC) * 100);
  const color = walletUsdBandColor(i);
  const safe = escapeHtml(d.label);
  const icon = holdersMoneyBagIconHtml(d.label, color);
  const pctLabel = formatPctSmart(pct);
  const positionMeta =
    count > 0
      ? `<span class="holders-value-usd" style="color:${escapeHtml(color)}">${count.toLocaleString()} ${formatPositionCountWord(count)} (Total: ${escapeHtml(formatBandTotalUsd(sumUsd))})</span> `
      : '';
  return `<div class="holders-hbar-row">
    <span class="holders-hbar-name" style="color:${escapeHtml(color)}" title="${safe}">${icon}${safe}</span>
    <div class="holders-hbar-track"><div class="holders-hbar-fill" style="width:${w}%;background:${color}"></div></div>
    <span class="holders-hbar-meta">${positionMeta}${pctLabel}</span>
  </div>`;
}

function renderDefiUsdBarsPlaceholderHtml() {
  return walletUsdBands().map((d, i) => renderDefiUsdBarRow(d, i, 0, 0, 1, 0)).join('');
}

function collectPositionRows(platforms, { includeDust = false } = {}) {
  const rows = [];
  for (const [pIndex, platform] of platforms.entries()) {
    const pid = platformId(platform, pIndex);
    const platformExpanded = isPlatformDustExpanded(pid);
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        if (!includeDust && hideDustEnabled() && !platformExpanded && isDustRow(row)) continue;
        rows.push({
          row,
          section,
          category: resolveTableType(section, row),
        });
      }
    }
  }
  return rows;
}

function collectVisiblePositionRows(platforms) {
  return collectPositionRows(platforms, { includeDust: false });
}

function collectAllPositionRows(platforms) {
  return collectPositionRows(platforms, { includeDust: true });
}

function defiCategoryBuckets(items) {
  const raw = new Map();
  for (const { category, row } of items) {
    const key = category || 'default';
    if (!raw.has(key)) raw.set(key, { key, count: 0, usd: 0 });
    const bucket = raw.get(key);
    bucket.count += 1;
    bucket.usd += absUsd(row);
  }

  const sorted = [...raw.values()].sort((a, b) => b.usd - a.usd);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const everythingElse = rest.reduce(
    (acc, item) => ({ count: acc.count + item.count, usd: acc.usd + item.usd }),
    { count: 0, usd: 0 },
  );

  const segments = top3.map((item) => ({
    title: defiCategoryLabel(item.key),
    count: item.count,
    usd: item.usd,
  }));
  if (everythingElse.count > 0) {
    segments.push({
      title: 'Everything Else',
      count: everythingElse.count,
      usd: everythingElse.usd,
    });
  }

  const finalSegments = segments.length > 0 ? segments : [{ title: '—', count: 0, usd: 0 }];
  const totalUsd = finalSegments.reduce((sum, s) => sum + s.usd, 0) || 1;
  return {
    segments: finalSegments,
    slicePcts: finalSegments.map((s) => (s.usd / totalUsd) * 100),
    usds: finalSegments.map((s) => s.usd),
    counts: finalSegments.map((s) => s.count),
    totalUsd,
  };
}

function buildDefiCategoryPieInsight(bucket) {
  if (!bucket.segments.length) return 'No DeFi positions loaded.';
  let topIdx = 0;
  for (let i = 1; i < bucket.segments.length; i += 1) {
    if (bucket.segments[i].usd > bucket.segments[topIdx].usd) topIdx = i;
  }
  const top = bucket.segments[topIdx];
  if (!top || top.usd <= 0) return 'No categorized DeFi value to chart.';
  return `${formatPctSmart(bucket.slicePcts[topIdx])} of DeFi value is in ${top.title}.`;
}

function renderDefiUsdBars(items) {
  if (!defiValueUsdBars) return;
  const defs = walletUsdBands();
  const counts = defs.map(() => 0);
  const sums = defs.map(() => 0);
  let pricedCount = 0;
  for (const { row } of items) {
    const v = absUsd(row);
    const idx = defs.findIndex((d) => d.contains(v));
    if (idx >= 0) {
      counts[idx] += 1;
      sums[idx] += v;
      pricedCount += 1;
    }
  }
  const maxC = Math.max(1, ...counts);
  const total = pricedCount || 1;
  defiValueUsdBars.innerHTML = defs.map((d, i) => renderDefiUsdBarRow(d, i, counts[i], total, maxC, sums[i])).join('');
}

function setDefiStatsPlaceholder() {
  if (!defiCategoryPie && !defiValueUsdBars) return;
  const empty4 = buildPieGradientWithGaps([0, 0, 0, 0], DEFI_PIE_HEX);
  if (defiCategoryPie) {
    defiCategoryPie.style.background = empty4;
    mountDonutPieOverlays(defiCategoryPie, [0, 0, 0, 0], DEFI_PIE_HEX, { mock: true, hubSubline: '—' });
  }
  setDefiLegendGrid(defiCategoryLegend, 4);
  if (defiCategoryLegend) {
    defiCategoryLegend.innerHTML = ['Rewards', 'Staked', 'Lending', 'Everything Else']
      .map((title, i) => renderDefiTierCardPlaceholder(title, DEFI_PIE_HEX[i], DEFI_PIE_HEX[i]))
      .join('');
  }
  if (defiValueUsdBars) defiValueUsdBars.innerHTML = renderDefiUsdBarsPlaceholderHtml();
  if (defiCategoryPieTitle) defiCategoryPieTitle.textContent = 'Categories ranked by USD value';
  if (defiCategoryPieLede) defiCategoryPieLede.textContent = 'Load a wallet to see DeFi category value breakdown.';
  if (defiCategoryPieInsight) defiCategoryPieInsight.textContent = 'Top categories by USD value; remainder grouped as Everything Else.';
  if (defiStatsMeta) {
    defiStatsMeta.textContent = 'Load a wallet to see DeFi position categories and USD value band charts (all positions, including dust).';
  }
}

function renderDefiStats(payload) {
  if (!defiCategoryPie && !defiValueUsdBars) return;
  const platforms = Array.isArray(payload?.platforms) ? payload.platforms : [];
  const items = collectAllPositionRows(platforms);
  const totalUsd = toNum(payload?.totalDefiValueUsd) ?? items.reduce((sum, item) => sum + absUsd(item.row), 0);

  if (items.length === 0) {
    setDefiStatsPlaceholder();
    if (defiStatsMeta) {
      defiStatsMeta.textContent = platforms.length
        ? 'No DeFi position rows returned to chart.'
        : 'No DeFi positions were returned for this wallet.';
    }
    return;
  }

  const bucket = defiCategoryBuckets(items);
  const display = applyMinVisibleSlices(bucket.slicePcts);
  if (defiCategoryPie) {
    defiCategoryPie.style.background = buildPieGradientWithGaps(display, DEFI_PIE_HEX);
    mountDonutPieOverlays(defiCategoryPie, display, DEFI_PIE_HEX, {
      mock: false,
      hubSubline: `${formatUsd(totalUsd)} · ${items.length} positions`,
    });
  }

  setDefiLegendGrid(defiCategoryLegend, bucket.segments.length);
  if (defiCategoryLegend) {
    defiCategoryLegend.innerHTML = bucket.segments
      .map((segment, i) =>
        renderDefiTierCard({
          title: segment.title,
          accent: DEFI_PIE_HEX[i],
          swatchColor: DEFI_PIE_HEX[i],
          slicePct: bucket.slicePcts[i],
          shareLabel: ' of value',
          usdLine: formatUsd(segment.usd),
          amountLine: `${segment.count} ${formatPositionCountWord(segment.count)}`,
        }),
      )
      .join('');
  }

  if (defiCategoryPieTitle) defiCategoryPieTitle.textContent = 'Categories ranked by USD value';
  if (defiCategoryPieLede) {
    defiCategoryPieLede.textContent = `${items.length} positions · ${formatUsd(totalUsd)} total DeFi value`;
  }
  if (defiCategoryPieInsight) {
    defiCategoryPieInsight.textContent = buildDefiCategoryPieInsight(bucket);
  }
  if (defiStatsMeta) {
    defiStatsMeta.textContent = `Wallet DeFi: ${items.length} position(s) · all positions including dust · category pie and USD value bands.`;
  }

  renderDefiUsdBars(items);
}

function setLoading(active) {
  if (defiSummaryLoading) defiSummaryLoading.hidden = !active;
  if (defiLoading) defiLoading.hidden = !active;
  if (defiStatsLoading) defiStatsLoading.hidden = !active;
}

function showDefiError(message) {
  if (defiError) {
    defiError.textContent = message;
    defiError.hidden = false;
  }
}

function clearDefiError() {
  if (defiError) {
    defiError.hidden = true;
    defiError.textContent = '';
  }
}

function renderSummaryStat(label, value, extraClass = '') {
  return `
    <div class="trades-summary-item ${extraClass}">
      <span class="trades-summary-label">${escapeHtml(label)}</span>
      <span class="trades-summary-value">${value}</span>
    </div>
  `;
}

function countRows(platforms) {
  return platforms.reduce((sum, platform) => {
    const sections = Array.isArray(platform.sections) ? platform.sections : [];
    return sum + sections.reduce((inner, section) => inner + (Array.isArray(section.rows) ? section.rows.length : 0), 0);
  }, 0);
}

function renderSummary(payload, visibleCount, hiddenCount) {
  const platforms = Array.isArray(payload.platforms) ? payload.platforms : [];
  const totalRows = countRows(platforms);
  const sectionCount = platforms.reduce((sum, platform) => sum + (Array.isArray(platform.sections) ? platform.sections.length : 0), 0);

  if (defiSummaryLabel) defiSummaryLabel.textContent = payload.ownerAddress || '—';
  if (defiLastUpdatedValue) defiLastUpdatedValue.textContent = new Date().toLocaleString();
  if (defiSummaryStats) {
    const positionLabel =
      hiddenCount > 0 ? `${visibleCount} shown · ${hiddenCount} dust hidden` : String(visibleCount || totalRows);
    defiSummaryStats.innerHTML = [
      renderSummaryStat('Platforms', platforms.length),
      renderSummaryStat('Sections', sectionCount),
      renderSummaryStat('Positions', positionLabel),
      renderSummaryStat('Total DeFi value (USD)', formatUsd(payload.totalDefiValueUsd), 'defi-summary-item--total'),
    ].join('');
  }
}

function renderMintLink(address) {
  if (!address) return '—';
  const href = `${SOLSCAN_TOKEN}${encodeURIComponent(address)}`;
  return `<a class="holders-mint-link mono" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortAddress(address))}</a>`;
}

function renderMintLinks(addresses) {
  const list = asArray(addresses).filter(Boolean);
  if (list.length === 0) return '—';
  return `<span class="defi-account-links">${list.map((addr) => renderMintLink(addr)).join('')}</span>`;
}

function renderSingleTokenCell(row) {
  const mint = asArray(row.address)[0] || row.address;
  const leg = resolveLegFields(row.symbol, row.name, asArray(row.logourl)[0] ?? row.logourl, mint);
  return `
    <div class="defi-token-cell">
      <img class="defi-token-logo" src="${escapeHtml(leg.logo)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" />
      <div class="defi-token-text">
        <span class="defi-token-symbol">${escapeHtml(leg.displayLabel)}</span>
        ${leg.secondaryName ? `<span class="defi-token-name">${escapeHtml(leg.secondaryName)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderPairTokenCell(row) {
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const logos = asArray(row.logourl);
  const addresses = asArray(row.address);
  const legs = Math.max(symbols.length, names.length, logos.length, addresses.length, 1);
  const resolved = [];
  for (let i = 0; i < legs; i++) {
    resolved.push(resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  }
  const labels = resolved.map((leg) => leg.displayLabel).filter((l) => l && l !== 'Unknown');
  const title = labels.length > 0 ? [...new Set(labels)].join(' / ') : 'LP position';
  const logoHtml = resolved
    .slice(0, 3)
    .map((leg, i) => {
      return `<img class="defi-token-logo defi-token-logo--stacked" style="--stack-index:${i}" src="${escapeHtml(leg.logo)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" />`;
    })
    .join('');
  return `
    <div class="defi-token-cell defi-token-cell--pair">
      <div class="defi-token-logo-stack" aria-hidden="true">${logoHtml || `<img class="defi-token-logo" src="${TOKEN_PLACEHOLDER}" alt="" />`}</div>
      <div class="defi-token-text">
        <span class="defi-token-symbol">${escapeHtml(title)}</span>
        <span class="defi-token-name">Liquidity pool</span>
      </div>
    </div>
  `;
}

function renderAssetCell(row) {
  return isMultiAssetRow(row) ? renderPairTokenCell(row) : renderSingleTokenCell(row);
}

function renderMultiAmounts(row) {
  const amounts = asArray(row.amount);
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const addresses = asArray(row.address);
  if (amounts.length === 0) return '—';
  const lines = amounts.map((amount, i) => {
    const leg = resolveLegFields(symbols[i], names[i], null, addresses[i]);
    return `<span class="defi-amount-line"><span class="defi-amount-line__value">${formatAmount(amount)}</span> ${escapeHtml(leg.displayLabel)}</span>`;
  });
  return `<div class="defi-multi-amounts">${lines.join('')}</div>`;
}

function renderSideBadge(side) {
  const s = String(side ?? '').trim().toLowerCase();
  if (!s) return '—';
  const cls = s === 'long' ? 'defi-side-badge--long' : s === 'short' ? 'defi-side-badge--short' : 'defi-side-badge--neutral';
  return `<span class="defi-side-badge ${cls}">${escapeHtml(s)}</span>`;
}

function renderStakeStatus(status) {
  if (status == null) return '—';
  const label = STAKE_STATUS_LABELS[status] ?? `Status ${status}`;
  return `<span class="defi-stake-status">${escapeHtml(label)}</span>`;
}

function valueCell(row, { debt = false } = {}) {
  const usd = effectiveUsd(row);
  const cls = debt && usd < 0 ? 'num defi-value--debt' : usd < 0 ? 'num defi-value--debt' : 'num';
  return `<td class="${cls}">${formatDefiTableUsd(usd, { debt })}</td>`;
}

function amountCell(row, { debt = false } = {}) {
  const amount = toNum(row.amount);
  const cls = debt && amount != null && amount < 0 ? 'num defi-value--debt' : 'num';
  return `<td class="${cls}">${formatAmount(row.amount)}</td>`;
}

function apyCell(row) {
  return `<td class="num">${row.apy == null ? '—' : formatPct(row.apy)}</td>`;
}

function priceCell(row) {
  if (isMultiAssetRow(row)) return '<td class="num">—</td>';
  return `<td class="num defi-price-cell">${formatDefiTableUsd(row.price)}</td>`;
}

function buildAssetTableSchema(tableType, { amountHeader = 'Amount', rateHeader = 'APY', debt = false } = {}) {
  return {
    tableType,
    layout: 'asset7',
    columns: ['#', 'Asset', amountHeader, 'Price', 'Value', rateHeader, 'Account'],
    renderRow(row, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${renderAssetCell(row)}</td>
          ${amountCell(row, { debt })}
          ${priceCell(row)}
          ${valueCell(row, { debt })}
          ${apyCell(row)}
          <td>${renderMintLink(asArray(row.address)[0] || row.address)}</td>
        </tr>
      `;
    },
  };
}

function isNumericHeaderColumn(layout, colIndex) {
  if (layout === 'asset7') return colIndex >= 2 && colIndex <= 5;
  if (layout === 'liquidity5') return colIndex === 2 || colIndex === 3;
  return false;
}

function renderTableColgroup(layout) {
  if (layout === 'liquidity5') {
    return `<colgroup>
      <col class="defi-col-index" />
      <col class="defi-col-asset" />
      <col class="defi-col-qty" />
      <col class="defi-col-value" />
      <col class="defi-col-account" />
    </colgroup>`;
  }
  if (layout === 'asset7') {
    return `<colgroup>
      <col class="defi-col-index" />
      <col class="defi-col-asset" />
      <col class="defi-col-qty" />
      <col class="defi-col-price" />
      <col class="defi-col-value" />
      <col class="defi-col-rate" />
      <col class="defi-col-account" />
    </colgroup>`;
  }
  return '';
}

function renderTableHeader(schema) {
  const layout = schema.layout || 'default';
  return schema.columns
    .map((col, index) => {
      const cls = isNumericHeaderColumn(layout, index) ? ' class="num"' : '';
      return `<th${cls}>${escapeHtml(col)}</th>`;
    })
    .join('');
}

function buildTableSchema(tableType) {
  switch (tableType) {
    case 'liquidity':
      return {
        tableType,
        layout: 'liquidity5',
        columns: ['#', 'Pool / assets', 'Amounts', 'Value (USD)', 'Accounts'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              <td class="num">${renderMultiAmounts(row)}</td>
              ${valueCell(row)}
              <td>${renderMintLinks(row.address)}</td>
            </tr>
          `;
        },
      };
    case 'borrowed':
      return buildAssetTableSchema('borrowed', { amountHeader: 'Debt', rateHeader: 'Rate', debt: true });
    case 'supplied':
      return buildAssetTableSchema('supplied');
    case 'staked':
    case 'rewards':
    case 'vesting':
    case 'deposit':
      return buildAssetTableSchema(tableType);
    case 'nativeStaking':
      return {
        tableType,
        layout: 'nativeStaking',
        columns: ['#', 'Validator', 'Stake', 'Price', 'Value', 'APY', 'MEV', 'Status', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${amountCell(row)}
              ${priceCell(row)}
              ${valueCell(row)}
              ${apyCell(row)}
              <td class="num">${row.mevValueUsd == null ? '—' : formatUsd(row.mevValueUsd)}</td>
              <td>${renderStakeStatus(row.stakeStatus)}</td>
              <td>${renderMintLink(asArray(row.address)[0] || row.address)}</td>
            </tr>
          `;
        },
      };
    case 'leverage':
      return {
        tableType,
        layout: 'leverage',
        columns: ['#', 'Market', 'Side', 'Size', 'Notional', 'Collateral', 'PnL', 'Leverage'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              <td>${renderSideBadge(row.side)}</td>
              ${amountCell(row)}
              ${valueCell(row)}
              <td class="num">${row.collateralValue == null ? '—' : formatUsd(row.collateralValue)}</td>
              <td class="num">${row.pnlValue == null ? '—' : formatUsd(row.pnlValue)}</td>
              <td class="num">${row.leverage == null ? '—' : `${Number(row.leverage).toFixed(2)}×`}</td>
            </tr>
          `;
        },
      };
    default:
      return buildAssetTableSchema('default');
  }
}

function sumSectionUsd(rows) {
  return rows.reduce((sum, row) => sum + absUsd(row), 0);
}

function sortRows(rows) {
  return [...rows].sort((a, b) => absUsd(b) - absUsd(a));
}

function platformId(platform, index) {
  return String(platform.platformId || platform.platform || `platform-${index}`).trim();
}

function isPlatformDustExpanded(id) {
  return expandedDustPlatforms.has(id);
}

function platformHiddenDustCount(platform) {
  let count = 0;
  for (const section of platform.sections || []) {
    for (const row of section.rows || []) {
      if (isDustRow(row)) count++;
    }
  }
  return count;
}

function rowsForDisplay(rows, platformExpanded) {
  const sorted = sortRows(rows);
  if (!hideDustEnabled() || platformExpanded) return sorted;
  return sorted.filter((row) => !isDustRow(row));
}

function sectionHasVisibleRows(section, platformExpanded) {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  return rowsForDisplay(rows, platformExpanded).length > 0;
}

function renderSectionTable(section, platformExpanded) {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const rowsToRender = rowsForDisplay(rows, platformExpanded);
  if (rowsToRender.length === 0) {
    return '';
  }

  const tableType = resolveTableType(section, rowsToRender[0]);
  const schema = buildTableSchema(tableType);
  const body = rowsToRender.map((row, index) => schema.renderRow(row, index)).join('');

  const layoutClass = schema.layout ? ` defi-positions-table--${escapeHtml(schema.layout)}` : '';
  return `
    <div class="table-wrap table-wrap--defi-section">
      <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)}${layoutClass}">
        ${renderTableColgroup(schema.layout)}
        <thead>
          <tr>${renderTableHeader(schema)}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function sortSections(platform) {
  const sections = Array.isArray(platform.sections) ? platform.sections : [];
  return [...sections].sort((a, b) => {
    const aUsd = sumSectionUsd(Array.isArray(a.rows) ? a.rows : []);
    const bUsd = sumSectionUsd(Array.isArray(b.rows) ? b.rows : []);
    return bUsd - aUsd;
  });
}

function platformEmptySectionsMessage(platform) {
  const total = toNum(platform.totalValueUsd);
  if (total != null && total > 0) {
    return `Vybe reports ${formatUsd(total)} total for this protocol but returned no position rows to display.`;
  }
  return 'No sections returned for this platform.';
}

function renderPlatform(platform, index) {
  const sections = sortSections(platform);
  const pid = platformId(platform, index);
  const platformExpanded = isPlatformDustExpanded(pid);
  const hiddenDustCount = hideDustEnabled() && !platformExpanded ? platformHiddenDustCount(platform) : 0;
  const logo = platform.platformLogourl || TOKEN_PLACEHOLDER;
  const website = String(platform.platformWebsite || '').trim();
  const title = platform.platform || platform.platformId || `Platform ${index + 1}`;
  const labels = Array.isArray(platform.platformLabels) ? platform.platformLabels.filter(Boolean) : [];

  const sectionsHtml = sections
    .filter((section) => sectionHasVisibleRows(section, platformExpanded))
    .map((section) => {
      const heading = section.label || section.name || section.tableType || section.type || 'Positions';
      const allRows = Array.isArray(section.rows) ? section.rows : [];
      const displayRows = rowsForDisplay(allRows, platformExpanded);
      const sectionUsd = sumSectionUsd(displayRows);
      const rowCount = displayRows.length;
      return `
        <div class="defi-section-block">
          <h3 class="defi-section-title">
            ${escapeHtml(heading)}
            <span class="defi-section-meta">${rowCount} row${rowCount === 1 ? '' : 's'} · ${formatUsd(sectionUsd)}</span>
          </h3>
          ${renderSectionTable(section, platformExpanded)}
        </div>
      `;
    })
    .join('');

  const dustBtn =
    hiddenDustCount > 0
      ? `<button type="button" class="defi-platform-dust-btn" data-defi-dust-platform="${escapeHtml(pid)}">Show dust (${hiddenDustCount})</button>`
      : hideDustEnabled() && platformExpanded && platformHiddenDustCount(platform) > 0
        ? `<button type="button" class="defi-platform-dust-btn defi-platform-dust-btn--active" data-defi-dust-platform="${escapeHtml(pid)}">Hide dust</button>`
        : '';

  return `
    <article class="defi-platform-card">
      <header class="defi-platform-header">
        <img class="defi-platform-logo" src="${escapeHtml(logo)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" />
        <div class="defi-platform-heading">
          <h2 class="defi-platform-title">${escapeHtml(title)}</h2>
          <div class="defi-platform-meta">
            ${platform.platformId ? `<span class="defi-platform-id mono">${escapeHtml(platform.platformId)}</span>` : ''}
            ${labels.map((label) => `<span class="defi-platform-label">${escapeHtml(label)}</span>`).join('')}
            ${website ? `<a class="defi-platform-link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
          </div>
        </div>
        <div class="defi-platform-header-actions">
          ${dustBtn}
          <div class="defi-platform-total">
            <span class="defi-platform-total-label">Platform value</span>
            <span class="defi-platform-total-value">${formatDefiTableUsd(platform.totalValueUsd)}</span>
          </div>
        </div>
      </header>
      <div class="defi-platform-sections">${sectionsHtml || `<p class="defi-empty-section">${escapeHtml(platformEmptySectionsMessage(platform))}</p>`}</div>
    </article>
  `;
}

function countVisibleHidden(platforms) {
  let visible = 0;
  let hidden = 0;
  for (const [pIndex, platform] of platforms.entries()) {
    const platformExpanded = isPlatformDustExpanded(platformId(platform, pIndex));
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        if (hideDustEnabled() && isDustRow(row) && !platformExpanded) hidden++;
        else visible++;
      }
    }
  }
  return { visible, hidden };
}

function renderPlatforms(payload) {
  const platforms = Array.isArray(payload.platforms)
    ? [...payload.platforms].sort((a, b) => (toNum(b.totalValueUsd) ?? 0) - (toNum(a.totalValueUsd) ?? 0))
    : [];
  if (!defiMeta || !defiPlatforms) return;

  if (platforms.length === 0) {
    defiMeta.textContent = 'No DeFi positions were returned for this wallet.';
    defiPlatforms.innerHTML = '<p class="defi-empty-state">Try another wallet with LP, lending, staking, or rewards positions.</p>';
    renderSummary(payload, 0, 0);
    renderDefiStats(payload);
    return;
  }

  const { visible, hidden } = countVisibleHidden(platforms);
  renderSummary(payload, visible, hidden);

  const dustNote = hidden > 0 ? ` · ${hidden} under ${DUST_USD_LABEL} hidden` : '';
  const enrichNote = balanceMetaByMint.size > 0 ? ' · labels/logos enriched from wallet balances where missing' : '';
  defiMeta.textContent = `${platforms.length} protocol${platforms.length === 1 ? '' : 's'} · ${visible} position${visible === 1 ? '' : 's'} shown${dustNote}${enrichNote} · sorted by value · schema per position type (LP, lend, borrow, stake, perps).`;
  defiPlatforms.innerHTML = platforms.map(renderPlatform).join('');
  renderDefiStats(payload);
}

function bindDefiUiEvents() {
  defiHideDustInput?.addEventListener('change', () => {
    expandedDustPlatforms.clear();
    if (lastPayload) renderPlatforms(lastPayload);
  });

  defiPlatforms?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-defi-dust-platform]');
    if (!btn) return;
    const id = btn.getAttribute('data-defi-dust-platform');
    if (!id) return;
    if (expandedDustPlatforms.has(id)) expandedDustPlatforms.delete(id);
    else expandedDustPlatforms.add(id);
    if (lastPayload) renderPlatforms(lastPayload);
  });
}

function resetDefiPlaceholder() {
  lastPayload = null;
  balanceMetaByMint = new Map();
  expandedDustPlatforms.clear();
  if (defiSummaryLabel) defiSummaryLabel.textContent = '—';
  if (defiLastUpdatedValue) defiLastUpdatedValue.textContent = '—';
  if (defiSummaryStats) defiSummaryStats.innerHTML = '';
  if (defiMeta) defiMeta.textContent = DEFI_META_PLACEHOLDER;
  if (defiPlatforms) defiPlatforms.innerHTML = '';
  setDefiStatsPlaceholder();
}

async function loadDefiPositions() {
  const wallet = walletInput?.value?.trim?.() || '';
  if (!wallet) {
    showDefiError('Wallet address required for DeFi positions.');
    return;
  }

  clearDefiError();
  setLoading(true);

  try {
    const res = await fetch(`/api/wallets/${encodeURIComponent(wallet)}/defi-positions`, { cache: 'no-store' });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload.error || `DeFi request failed (${res.status})`);
    }
    lastPayload = payload;
    renderPlatforms(payload);
  } catch (err) {
    resetDefiPlaceholder();
    showDefiError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}

bindDefiUiEvents();
setDefiStatsPlaceholder();

window.VybeDefiPositions = {
  load: loadDefiPositions,
  resetPlaceholder: resetDefiPlaceholder,
  setBalanceMeta,
};
})();

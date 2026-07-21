/**
 * DeFi section tables (1:1 column layout).
 */

const SOLSCAN_TOKEN = 'https://solscan.io/token/';
const TOKEN_PLACEHOLDER = './token-placeholder.png';
const DUST_USD_THRESHOLD = 0.1;
const NO_DECIMAL_THRESHOLD = 99.99;
const TWO_DECIMAL_THRESHOLD = 9.999;
const VALUE_NO_DECIMAL_THRESHOLD = 9.99;

const USD_MAGNITUDE_BAR_COLORS = {
  red: '#ef4444',
  orange: '#fb923c',
  yellow: '#facc15',
  lightGreen: '#86efac',
  green: '#22c55e',
};

const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'USDCYos3x9tA5f8sFkCBh81H4VEy8oYyzidQdN6sZgq',
  '7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT',
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM',
  'Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm8S4',
  'FYpdBuyAHSbdaAyD1sKkNHHHsXoWFJmEGdA9FMDFFRkw',
]);
const STABLE_SYMBOLS = new Set(['USDC', 'USDT', 'USD1', 'PYUSD', 'USDE', 'USDS', 'DAI', 'EURC', 'UXD']);
const STABLE_SYMBOL_NEEDLES = ['USD', 'EURC', 'STABLE'];
const NATIVE_SOL_MINT = '11111111111111111111111111111111';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

const STAKE_STATUS_LABELS = {
  0: 'Inactive',
  1: 'Activating',
  2: 'Active',
  3: 'Deactivating',
  4: 'Ready for withdrawal',
  5: 'Warmup',
  6: 'Active',
};

const DEFI_SECTION_ICON_SVGS = {
  rewards:
    '<path d="M8 2.2 9.7 5.9 13.7 6.3 10.7 8.9 11.6 12.8 8 10.8 4.4 12.8 5.3 8.9 2.3 6.3 6.3 5.9Z" fill="currentColor"/>',
  staked:
    '<rect x="3.5" y="7" width="9" height="6.5" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.35"/><path d="M8 3.8v2.8M5.8 3.8h4.4" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  lending:
    '<path d="M3.5 12.5V6.8L8 4.2l4.5 2.6v5.7" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/><path d="M6.2 9.2h3.6M6.2 11h2.4" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  borrowing:
    '<path d="M4.5 5.5 8 9l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 9V3.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M3.5 12.5h9" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  vesting:
    '<path d="M5.2 3.8h5.6v2.2H5.2z" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M6.2 6v4.8M9.8 6v4.8" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/><path d="M4.8 12.5h6.4" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  liquidity:
    '<path d="M5.2 6.8c0-1.7 1.3-3 2.8-3s2.8 1.3 2.8 3c0 2.4-2.8 3.4-2.8 5.8 0-2.4-2.8-3.4-2.8-5.8Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M10.8 6.8c0-1.7 1.3-3 2.8-3" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>',
  farming:
    '<path d="M8 12.8V7.8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><path d="M8 7.8c-2.2 0-3.5-1.4-3.5-3.2S5.8 2.2 8 4.1c2.2-1.9 3.5-.7 3.5 1.1S10.2 7.8 8 7.8Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>',
  vault:
    '<rect x="3.8" y="5.2" width="8.4" height="7.3" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="8" cy="8.8" r="1.1" fill="currentColor"/><path d="M6.2 5.2V4.2a1.8 1.8 0 0 1 3.6 0v1" fill="none" stroke="currentColor" stroke-width="1.25"/>',
  deposit:
    '<path d="M8 3.5v6.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M5.8 7.5 8 10.3l2.2-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12.5h8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  nativeStaking:
    '<circle cx="8" cy="5.2" r="1.7" fill="none" stroke="currentColor" stroke-width="1.25"/><path d="M4.2 12.2 8 9.8l3.8 2.4" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/><path d="M8 7.2v2.6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>',
  leverage:
    '<path d="M3.5 11.8 6.4 8.2l2.1 1.8 3-4.3" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.2 5.7h-2.8v2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>',
  positions:
    '<rect x="3.5" y="3.5" width="4.2" height="4.2" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="8.3" y="3.5" width="4.2" height="4.2" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="3.5" y="8.3" width="4.2" height="4.2" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="8.3" y="8.3" width="4.2" height="4.2" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.2"/>',
  everythingElse:
    '<rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" fill="none" stroke="currentColor" stroke-width="1.25" stroke-dasharray="2.2 1.6"/><circle cx="5.5" cy="8" r="1.05" fill="currentColor"/><circle cx="8" cy="8" r="1.05" fill="currentColor"/><circle cx="10.5" cy="8" r="1.05" fill="currentColor"/>',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function asArray(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanStr(value) {
  if (value == null) return '';
  if (Array.isArray(value)) return '';
  return String(value).trim();
}

function toNum(value) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) {
    const sum = value.reduce((acc, item) => acc + (toNum(item) ?? 0), 0);
    return Number.isFinite(sum) ? sum : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickLegValue(value, index = 0) {
  if (Array.isArray(value)) return value[index] ?? null;
  return index === 0 ? value : null;
}

function shortAddress(value) {
  const s = String(value ?? '').trim();
  if (s.length <= 12) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
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

export function isDustRow(row) {
  return absUsd(row) < DUST_USD_THRESHOLD;
}

export function sumSectionUsd(rows) {
  return (rows || []).reduce((sum, row) => sum + absUsd(row), 0);
}

function resolveTableType(section, row) {
  return String(row?.tableType || section?.tableType || section?.type || 'default').trim() || 'default';
}

function normalizeLogoUrl(logo) {
  const u = cleanStr(logo);
  if (!u || u.includes(',')) return '';
  return u;
}

function resolveLegFields(symbol, name, logo, mint) {
  let sym = cleanStr(symbol);
  let nm = cleanStr(name);
  let lg = normalizeLogoUrl(logo);
  if (sym.length > 24 || /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(sym)) sym = '';
  const displayLabel = sym || nm || (mint ? shortAddress(mint) : 'Unknown');
  let secondaryName = '';
  if (sym && nm && nm !== sym) secondaryName = nm;
  return {
    symbol: sym,
    name: nm,
    logo: lg || TOKEN_PLACEHOLDER,
    displayLabel,
    secondaryName,
  };
}

function formatCompactMagnitude(abs, { noDecimalAbove = 99.99, alwaysTwoDecimals = false } = {}) {
  if (abs < 1000) return null;
  const units = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'k' },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      const n = abs / u.v;
      if (alwaysTwoDecimals || n < 100) return `${n.toFixed(2)}${u.s}`;
      return `${Math.round(n)}${u.s}`;
    }
  }
  return null;
}

function formatWholeNumber(abs, { useGrouping = true } = {}) {
  return Math.round(abs).toLocaleString(undefined, { useGrouping });
}

function formatTwoDecimals(abs, { useGrouping = true } = {}) {
  return abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping,
  });
}

function formatLeadingZeroCompact(abs, { html = false } = {}) {
  if (!(abs > 0) || abs >= 0.01) return null;
  const s = abs.toFixed(12).replace(/0+$/, '');
  const m = s.match(/^0\.(0+)([1-9]\d{0,2})/);
  if (!m) return null;
  const zeros = m[1].length;
  const digits = m[2].slice(0, 3);
  if (html) {
    return `0.0<span class="defi-price-zero-run">${zeros}</span>${digits}`;
  }
  return `0.0{${zeros}}${digits}`;
}

function formatUsd(value, { compact = true } = {}) {
  const n = toNum(value);
  if (n == null) return '—';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  if (abs === 0) return '$0.00';
  if (compact) {
    const mag = formatCompactMagnitude(abs);
    if (mag) return `${sign}$${mag}`;
  }
  if (abs > NO_DECIMAL_THRESHOLD) return `${sign}$${formatWholeNumber(abs)}`;
  if (abs > TWO_DECIMAL_THRESHOLD) return `${sign}$${formatTwoDecimals(abs)}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(2)}`;
  const lead = formatLeadingZeroCompact(abs, { html: false });
  if (lead) return `${sign}$${lead}`;
  return `${sign}$${abs.toPrecision(3)}`;
}

function formatDefiTableUsd(value, { debt = false } = {}) {
  const n = toNum(value);
  if (n == null) return '—';
  if (n === 0) return '$0.00';
  const prefix = debt && n < 0 ? '−' : n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const mag = formatCompactMagnitude(abs);
  if (mag) return `${prefix}$${mag}`;
  if (abs > VALUE_NO_DECIMAL_THRESHOLD) return `${prefix}$${formatWholeNumber(abs)}`;
  return `${prefix}$${formatTwoDecimals(abs)}`;
}

function formatAmount(value, { stable = false, html = false } = {}) {
  const n = toNum(value);
  if (n == null) return '—';
  if (n === 0) return '0';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  const mag = formatCompactMagnitude(abs, { alwaysTwoDecimals: true });
  if (mag) return `${sign}${mag}`;
  if (abs > NO_DECIMAL_THRESHOLD) return `${sign}${formatWholeNumber(abs)}`;
  if (abs > TWO_DECIMAL_THRESHOLD) return `${sign}${formatTwoDecimals(abs)}`;
  if (stable) {
    return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 2, useGrouping: false })}`;
  }
  const compact = formatLeadingZeroCompact(abs, { html });
  if (compact) return `${sign}${compact}`;
  if (abs >= 1) {
    return `${sign}${abs.toLocaleString(undefined, { maximumFractionDigits: 4, useGrouping: false })}`;
  }
  return `${sign}${abs.toPrecision(3)}`;
}

function formatPct(value) {
  const n = toNum(value);
  if (n == null) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs > NO_DECIMAL_THRESHOLD) return `${sign}${formatWholeNumber(abs)}%`;
  return `${sign}${abs.toFixed(2)}%`;
}

function isStableToken(mint, symbol) {
  const m = cleanStr(mint);
  if (m && STABLECOIN_MINTS.has(m)) return true;
  const sym = cleanStr(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!sym) return false;
  if (STABLE_SYMBOLS.has(sym)) return true;
  return STABLE_SYMBOL_NEEDLES.some((needle) => sym.includes(needle));
}

function isSolToken(mint, symbol) {
  const m = cleanStr(mint);
  if (m === NATIVE_SOL_MINT || m === WSOL_MINT) return true;
  const sym = cleanStr(symbol).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return sym === 'SOL' || sym === 'WSOL';
}

function amountTokenToneClass(mint, symbol) {
  if (isStableToken(mint, symbol)) return 'defi-amount-line--stable';
  if (isSolToken(mint, symbol)) return 'defi-amount-line--sol';
  return 'defi-amount-line--other';
}

function formatAmountSymbolLabel(label, mint) {
  const s = cleanStr(label);
  if (!s || s === '—') return s;
  if (s.includes('…') || s.includes('...') || s.length > 16) {
    const head = s.split(/\.\.\.|…/)[0].trim();
    return (head || s).slice(0, 4);
  }
  if (mint && s === shortAddress(mint)) return s.slice(0, 4);
  return s;
}

function renderAmountLineHtml(amount, label, logo, mint) {
  const symbolLabel = formatAmountSymbolLabel(label, mint);
  const tone = amountTokenToneClass(mint, symbolLabel);
  const logoSrc = normalizeLogoUrl(logo) || TOKEN_PLACEHOLDER;
  const amountText = formatAmount(amount, { stable: isStableToken(mint, symbolLabel), html: true });
  return `<span class="defi-amount-line ${tone}"><span class="defi-amount-line__value">${amountText}</span> <span class="defi-amount-line__symbol">${escapeHtml(symbolLabel)}</span><img class="defi-amount-line__logo" src="${escapeHtml(logoSrc)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" /></span>`;
}

function resolvePairDisplayLabels(_row, resolvedLegs) {
  return resolvedLegs.map((leg) => leg.displayLabel);
}

function renderMultiAmounts(row) {
  const amounts = asArray(row.amount);
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const addresses = asArray(row.address);
  const logos = asArray(row.logourl ?? row.logoUrl);
  if (amounts.length === 0) return '—';
  const resolved = amounts.map((_, i) => resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  const labels = resolvePairDisplayLabels(row, resolved);
  const lines = amounts.map((amount, i) => {
    const leg = resolved[i];
    const label = labels[i] || leg?.displayLabel || '—';
    return renderAmountLineHtml(amount, label, leg?.logo, addresses[i]);
  });
  const n = lines.length;
  const density =
    n >= 4 ? ' defi-multi-amounts--dense-4' : n === 3 ? ' defi-multi-amounts--dense-3' : n === 2 ? ' defi-multi-amounts--dense-2' : '';
  return `<div class="defi-multi-amounts${density}">${lines.join('')}</div>`;
}

function resolvePoolAssetTitle(row) {
  if (!isMultiAssetRow(row)) {
    const mint = asArray(row.address)[0] || row.address;
    const leg = resolveLegFields(
      pickLegValue(row.symbol, 0),
      pickLegValue(row.name, 0),
      pickLegValue(row.logourl ?? row.logoUrl, 0),
      mint,
    );
    return leg.displayLabel || '';
  }
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const logos = asArray(row.logourl ?? row.logoUrl);
  const addresses = asArray(row.address);
  const legs = Math.max(symbols.length, names.length, logos.length, addresses.length, 1);
  const resolved = [];
  for (let i = 0; i < legs; i++) {
    resolved.push(resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  }
  const labels = resolvePairDisplayLabels(row, resolved).filter((l) => l && l !== 'Unknown');
  if (labels.length > 0) return [...new Set(labels)].join(' / ');
  return 'LP position';
}

function renderSingleTokenCell(row) {
  const mint = asArray(row.address)[0] || row.address;
  const leg = resolveLegFields(
    pickLegValue(row.symbol, 0),
    pickLegValue(row.name, 0),
    pickLegValue(row.logourl ?? row.logoUrl, 0),
    mint,
  );
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
  const logos = asArray(row.logourl ?? row.logoUrl);
  const addresses = asArray(row.address);
  const legs = Math.max(symbols.length, names.length, logos.length, addresses.length, 1);
  const resolved = [];
  for (let i = 0; i < legs; i++) {
    resolved.push(resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  }
  const title = resolvePoolAssetTitle(row);
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

function formatSectionMeta(value) {
  const s = cleanStr(value);
  if (!s) return '—';
  // Network labels (not pool/position descriptions) → blank
  const key = s.toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'solana' || key === 'sol' || key === 'solananetwork' || key === 'networksolana') return '—';
  return s;
}

function normalizeAssetLabelKey(value) {
  return cleanStr(value)
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatSectionTypeLabel(value) {
  const s = cleanStr(value);
  if (!s) return '—';
  const normalized = s.toLowerCase();
  if (normalized === 'borrowlend') return 'Borrow / Lend';
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function sectionNameCell(row) {
  let text = formatSectionMeta(row.sectionName);
  if (text !== '—') {
    const poolTitle = resolvePoolAssetTitle(row);
    if (poolTitle && normalizeAssetLabelKey(text) === normalizeAssetLabelKey(poolTitle)) {
      text = '—';
    }
  }
  const title = text === '—' ? '' : ` title="${escapeHtml(text)}"`;
  return `<td class="defi-section-meta-col defi-section-name-col"${title}><span class="defi-section-meta-text">${escapeHtml(text)}</span></td>`;
}

function sectionTypeCell(row) {
  const label = formatSectionTypeLabel(row.sectionType);
  return `<td class="defi-section-meta-col defi-section-type-col"><span class="defi-section-type-badge">${escapeHtml(label)}</span></td>`;
}

function renderMintLink(address) {
  if (!address) return '—';
  const href = `${SOLSCAN_TOKEN}${encodeURIComponent(address)}`;
  return `<a class="holders-mint-link mono" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortAddress(address))}</a>`;
}

function renderAccountCell(addresses) {
  const list = asArray(addresses).filter(Boolean);
  if (list.length === 0) return '—';
  const primary = renderMintLink(list[0]);
  if (list.length === 1) {
    return `<span class="defi-account-cell">${primary}</span>`;
  }
  const extra = list.slice(1);
  const tooltipLinks = extra.map((addr) => renderMintLink(addr)).join('');
  return `<span class="defi-account-cell">
    ${primary}
    <span class="defi-account-more token-badge token-badge--info token-badge--has-tip" tabindex="0" aria-label="${extra.length} more account address(es)">
      +${extra.length}
      <span class="token-badge-tip defi-account-more-tip" role="tooltip"><span class="defi-account-more-tip__panel">${tooltipLinks}</span></span>
    </span>
  </span>`;
}

function accountCell(row) {
  return `<td class="defi-account-col">${renderAccountCell(row.address)}</td>`;
}

function defiValueBarCount(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 1;
  if (n < 0.01) return 1;
  if (n < 0.1) return 1;
  if (n < 1) return 1;
  if (n < 10) return 2;
  if (n < 100) return 3;
  if (n < 1000) return 4;
  return 5;
}

function defiValueBarTierMeta(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n) || n < 0) {
    return { tierClass: 'holders-usd-tier--red', color: USD_MAGNITUDE_BAR_COLORS.red, label: 'negative' };
  }
  if (n < 0.01) return { tierClass: 'holders-usd-tier--orange', color: USD_MAGNITUDE_BAR_COLORS.orange, label: '$0–$0.01' };
  if (n < 0.1) return { tierClass: 'holders-usd-tier--yellow', color: USD_MAGNITUDE_BAR_COLORS.yellow, label: '$0.01–$0.10' };
  if (n < 1) return { tierClass: 'holders-usd-tier--light-green', color: USD_MAGNITUDE_BAR_COLORS.lightGreen, label: '$0.10–$1' };
  return { tierClass: 'holders-usd-tier--green', color: USD_MAGNITUDE_BAR_COLORS.green, label: '$1+' };
}

function renderDefiValueBars(usd) {
  const bars = defiValueBarCount(usd);
  if (bars < 1 || bars > 5) return '';
  const { color, label } = defiValueBarTierMeta(usd);
  const barHtml = Array.from({ length: 5 }, (_, i) => {
    const active = i < bars;
    const style = active ? ` style="background:${color}"` : '';
    return `<span class="trade-volume-bar${active ? ' trade-volume-bar--active' : ''}"${style}></span>`;
  }).join('');
  return `<span class="trade-volume-bars" aria-label="Value ${escapeHtml(label)}" title="Value ${escapeHtml(label)}">${barHtml}</span>`;
}

function formatDefiValueWithBars(usd, formattedText) {
  const bars = defiValueBarCount(usd);
  if (!formattedText || formattedText === '—' || bars === 0) return formattedText || '—';
  const { tierClass } = defiValueBarTierMeta(usd);
  const main = `<span class="holders-usd-tier ${tierClass}">${escapeHtml(formattedText)}</span>`;
  const barsHtml = renderDefiValueBars(usd);
  return `<span class="trades-cell-with-volume"><span class="trades-cell-with-volume__bars">${barsHtml}</span><span class="trades-cell-with-volume__main">${main}</span></span>`;
}

function valueCell(row, { debt = false } = {}) {
  const usd = effectiveUsd(row);
  const formatted = formatDefiTableUsd(usd, { debt });
  const cls = usd < 0 ? 'num defi-value--debt' : 'num';
  if (formatted === '—' || !Number.isFinite(usd)) return `<td class="${cls}">—</td>`;
  return `<td class="${cls} defi-value-col">${formatDefiValueWithBars(usd, formatted)}</td>`;
}

function usdMetricCell(value) {
  const n = toNum(value);
  if (n == null) return '<td class="num">—</td>';
  const formatted = formatUsd(n, { compact: true });
  const cls = n < 0 ? 'num defi-value--debt defi-value-col' : 'num defi-value-col';
  return `<td class="${cls}">${formatDefiValueWithBars(n, formatted)}</td>`;
}

function amountCell(row, { debt = false } = {}) {
  const amounts = asArray(row.amount);
  if (amounts.length > 1 || isMultiAssetRow(row)) {
    return `<td class="num defi-amounts-col">${renderMultiAmounts(row)}</td>`;
  }
  const amount = toNum(row.amount);
  const cls = debt && amount != null && amount < 0 ? 'num defi-value--debt defi-amounts-col' : 'num defi-amounts-col';
  const mint = asArray(row.address)[0] || row.address;
  const leg = resolveLegFields(
    pickLegValue(row.symbol, 0),
    pickLegValue(row.name, 0),
    pickLegValue(row.logourl ?? row.logoUrl, 0),
    mint,
  );
  if (!leg.displayLabel || leg.displayLabel === 'Unknown') {
    return `<td class="${cls}">${formatAmount(row.amount, { stable: isStableToken(mint, asArray(row.symbol)[0]), html: true })}</td>`;
  }
  return `<td class="${cls}">${renderAmountLineHtml(row.amount, leg.displayLabel, leg.logo, mint)}</td>`;
}

function formatDefiPriceUsd(value) {
  const n = toNum(value);
  if (n == null) return '—';
  if (n === 0) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const compactMag = formatCompactMagnitude(abs);
  if (compactMag) return `${sign}$${compactMag}`;
  if (abs > NO_DECIMAL_THRESHOLD) return `${sign}$${formatWholeNumber(abs)}`;
  if (abs > TWO_DECIMAL_THRESHOLD) return `${sign}$${formatTwoDecimals(abs)}`;
  const compactHtml = formatLeadingZeroCompact(abs, { html: true });
  if (compactHtml) return `${sign}$${compactHtml}`;
  return `${sign}$${abs.toFixed(2)}`;
}

function priceCell(row) {
  if (isMultiAssetRow(row)) return '<td class="num">—</td>';
  return `<td class="num defi-price-cell">${formatDefiPriceUsd(row.price)}</td>`;
}

function resolveApyBadgeClass(apy) {
  const n = toNum(apy);
  if (n == null) return '';
  if (n === 0) return 'swap-pair-chg swap-pair-chg--zero-apy';
  if (Math.abs(n) < 0.01) return 'swap-pair-chg swap-pair-chg--dust-apy';
  if (n > 0 && n <= 1) return 'swap-pair-chg swap-pair-chg--missing-7d';
  if (n > 1 && n <= 10) return 'swap-pair-chg swap-pair-chg--light-up';
  if (n > 10) return 'swap-pair-chg swap-pair-chg--up';
  return 'swap-pair-chg swap-pair-chg--down';
}

function formatApyLabel(apy) {
  const n = toNum(apy);
  if (n == null || n === 0) return null;
  if (Math.abs(n) < 0.01) return '0.001%';
  return formatPct(n);
}

function apyCell(row) {
  const label = formatApyLabel(row.apy);
  if (label == null) {
    return '<td class="num defi-apy-col">—</td>';
  }
  const badgeClass = resolveApyBadgeClass(row.apy);
  return `<td class="num defi-apy-col"><span class="${badgeClass}">${escapeHtml(label)}</span></td>`;
}

function mevCell(row) {
  const n = toNum(row.mevValueUsd);
  if (n == null || n === 0) return '<td class="num">—</td>';
  return `<td class="num">${formatUsd(n)}</td>`;
}

function resolveLeverageBadgeClass(leverage) {
  const n = toNum(leverage);
  if (n == null) return '';
  if (n < 0) return 'swap-pair-chg swap-pair-chg--down';
  if (n < 2) return 'swap-pair-chg swap-pair-chg--zero-apy';
  if (n < 5) return 'swap-pair-chg swap-pair-chg--light-up';
  return 'swap-pair-chg swap-pair-chg--up';
}

function leverageCell(row) {
  const n = toNum(row.leverage);
  if (n == null) return '<td class="num">—</td>';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  const label = abs > NO_DECIMAL_THRESHOLD ? `${sign}${formatWholeNumber(abs)}×` : `${sign}${abs.toFixed(2)}×`;
  return `<td class="num defi-apy-col"><span class="${resolveLeverageBadgeClass(n)}">${escapeHtml(label)}</span></td>`;
}

function renderSideBadge(side) {
  const s = String(side ?? '').trim().toLowerCase();
  if (!s) return '—';
  const cls = s === 'long' ? 'defi-side-badge--long' : s === 'short' ? 'defi-side-badge--short' : 'defi-side-badge--neutral';
  const arrow = s === 'long' ? '↑' : s === 'short' ? '↓' : '';
  const label = arrow ? `${arrow} ${s}` : s;
  return `<span class="defi-side-badge ${cls}">${escapeHtml(label)}</span>`;
}

function renderStakeStatus(status) {
  if (status == null) return '—';
  const label = STAKE_STATUS_LABELS[status] ?? `Status ${status}`;
  const normalized = String(label).toLowerCase();
  const chipClass =
    normalized === 'active'
      ? 'swap-pair-chg swap-pair-chg--up'
      : normalized === 'inactive'
        ? 'swap-pair-chg swap-pair-chg--down'
        : 'swap-pair-chg swap-pair-chg--breaking-even';
  return `<span class="${chipClass}">${escapeHtml(label)}</span>`;
}

function buildAssetTableSchema(tableType, { amountHeader = 'Amount', rateHeader = 'APY', debt = false } = {}) {
  return {
    tableType,
    layout: 'asset9',
    columns: ['#', 'Asset', 'Description', 'Position type', amountHeader, 'Price', 'Value', rateHeader, 'Account'],
    renderRow(row, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${renderAssetCell(row)}</td>
          ${sectionNameCell(row)}
          ${sectionTypeCell(row)}
          ${amountCell(row, { debt })}
          ${priceCell(row)}
          ${valueCell(row, { debt })}
          ${apyCell(row)}
          ${accountCell(row)}
        </tr>
      `;
    },
  };
}

function buildTableSchema(tableType) {
  switch (tableType) {
    case 'liquidity':
      return {
        tableType,
        layout: 'asset9',
        columns: ['#', 'Pool / assets', 'Description', 'Position type', 'Amounts', 'Price', 'Value', 'APY', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${sectionNameCell(row)}
              ${sectionTypeCell(row)}
              <td class="num defi-amounts-col">${renderMultiAmounts(row)}</td>
              ${priceCell(row)}
              ${valueCell(row)}
              ${apyCell(row)}
              ${accountCell(row)}
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
        columns: ['#', 'Validator', 'Description', 'Stake', 'Price', 'Value', 'APY', 'MEV', 'Status', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${sectionNameCell(row)}
              ${amountCell(row)}
              ${priceCell(row)}
              ${valueCell(row)}
              ${apyCell(row)}
              ${mevCell(row)}
              <td class="defi-status-col">${renderStakeStatus(row.stakeStatus)}</td>
              ${accountCell(row)}
            </tr>
          `;
        },
      };
    case 'leverage':
      return {
        tableType,
        layout: 'leverage',
        columns: ['#', 'Market', 'Description', 'Position type', 'Side', 'Size', 'Notional', 'Collateral', 'PnL', 'Leverage'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${sectionNameCell(row)}
              ${sectionTypeCell(row)}
              <td>${renderSideBadge(row.side)}</td>
              ${amountCell(row)}
              ${valueCell(row)}
              ${usdMetricCell(row.collateralValue)}
              ${usdMetricCell(row.pnlValue)}
              ${leverageCell(row)}
            </tr>
          `;
        },
      };
    default:
      return buildAssetTableSchema('default');
  }
}

function isNumericHeaderColumn(layout, colIndex) {
  if (layout === 'asset9') return colIndex >= 4 && colIndex <= 7;
  if (layout === 'nativeStaking') return colIndex >= 3;
  if (layout === 'leverage') return colIndex >= 5;
  return false;
}

function renderTableColgroup(layout) {
  if (layout === 'asset9') {
    return `<colgroup>
      <col class="defi-col-index" />
      <col class="defi-col-asset" />
      <col class="defi-col-section-name" />
      <col class="defi-col-section-type" />
      <col class="defi-col-qty" />
      <col class="defi-col-price" />
      <col class="defi-col-value" />
      <col class="defi-col-rate" />
      <col class="defi-col-account" />
    </colgroup>`;
  }
  if (layout === 'nativeStaking') {
    return `<colgroup>
      <col class="defi-col-index" />
      <col class="defi-col-asset" />
      <col class="defi-col-section-name" />
      <col class="defi-col-qty" />
      <col class="defi-col-price" />
      <col class="defi-col-value" />
      <col class="defi-col-rate" />
      <col class="defi-col-rate" />
      <col class="defi-col-rate" />
      <col class="defi-col-account" />
    </colgroup>`;
  }
  if (layout === 'leverage') {
    return `<colgroup>
      <col class="defi-col-index" />
      <col class="defi-col-lev-market" />
      <col class="defi-col-lev-desc" />
      <col class="defi-col-section-type" />
      <col class="defi-col-lev-side" />
      <col class="defi-col-lev-size" />
      <col class="defi-col-lev-usd" />
      <col class="defi-col-lev-usd" />
      <col class="defi-col-lev-usd" />
      <col class="defi-col-lev-x" />
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

function rowSymbolCount(row) {
  const symbols = asArray(row?.symbol).filter((s) => cleanStr(s));
  const addresses = asArray(row?.address).filter((a) => cleanStr(a));
  return Math.max(symbols.length, addresses.length, isMultiAssetRow(row) ? 2 : 1);
}

function tableNeedsWideAssetColumn(rows) {
  return rows.some((row) => rowSymbolCount(row) >= 3);
}

function resolveSectionIconKey(section, row) {
  const label = cleanStr(section?.label || section?.name || section?.type).toLowerCase();
  const tableType = resolveTableType(section, row);
  if (label.includes('reward')) return 'rewards';
  if (label.includes('farm')) return 'farming';
  if (label.includes('vault')) return 'vault';
  if (label.includes('vest')) return 'vesting';
  if (label.includes('borrow')) return 'borrowing';
  if (label.includes('lend') || label.includes('supply')) return 'lending';
  if (label.includes('stake') || label.includes('staked')) return 'staked';
  if (label.includes('deposit')) return 'deposit';
  if (label.includes('liquidity') || label.includes('pool')) return 'liquidity';
  const byType = {
    rewards: 'rewards',
    staked: 'staked',
    supplied: 'lending',
    borrowed: 'borrowing',
    vesting: 'vesting',
    liquidity: 'liquidity',
    deposit: 'deposit',
    nativeStaking: 'nativeStaking',
    leverage: 'leverage',
  };
  return byType[tableType] || 'positions';
}

function renderSectionIconHtml(section, row) {
  const key = resolveSectionIconKey(section, row);
  const paths = DEFI_SECTION_ICON_SVGS[key] || DEFI_SECTION_ICON_SVGS.positions;
  return `<span class="defi-section-icon defi-section-icon--${escapeHtml(key)}" aria-hidden="true"><svg class="defi-section-icon__svg" viewBox="0 0 16 16">${paths}</svg></span>`;
}

function sortRows(rows) {
  return [...rows].sort((a, b) => absUsd(b) - absUsd(a));
}

function rowsForDisplay(rows, { hideDust }) {
  const sorted = sortRows(rows);
  if (!hideDust) return sorted;
  return sorted.filter((row) => !isDustRow(row));
}

function renderSectionTable(section, rowsToRender) {
  if (!rowsToRender.length) return '';
  const tableType = resolveTableType(section, rowsToRender[0]);
  const schema = buildTableSchema(tableType);
  const body = rowsToRender.map((row, index) => schema.renderRow(row, index)).join('');
  const layoutClass = schema.layout ? ` defi-positions-table--${escapeHtml(schema.layout)}` : '';
  const wideAssetClass = tableNeedsWideAssetColumn(rowsToRender) ? ' defi-positions-table--wide-asset' : '';
  const borrowedClass = tableType === 'borrowed' ? ' defi-positions-table--borrowed' : '';
  return `
    <div class="table-wrap table-wrap--defi-section">
      <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)}${layoutClass}${wideAssetClass}${borrowedClass}">
        ${renderTableColgroup(schema.layout)}
        <thead>
          <tr>${renderTableHeader(schema)}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/** Render one category section (icon + title + N rows · $X + typed table). */
export function renderDefiSectionBlock(section, { hideDust = true } = {}) {
  const allRows = Array.isArray(section.rows) ? section.rows : [];
  const displayRows = rowsForDisplay(allRows, { hideDust });
  if (!displayRows.length) return '';
  const heading = section.label || section.name || section.tableType || section.type || 'Positions';
  const sectionUsd = sumSectionUsd(displayRows);
  const rowCount = displayRows.length;
  const iconRow = displayRows[0];
  return `
    <div class="defi-section-block">
      <h3 class="defi-section-title">
        <span class="defi-section-title__lead">
          ${renderSectionIconHtml(section, iconRow)}
          <span class="defi-section-title__text">${escapeHtml(heading)}</span>
        </span>
        <span class="defi-section-meta">${rowCount} row${rowCount === 1 ? '' : 's'} · ${formatUsd(sectionUsd, { compact: false })}</span>
      </h3>
      ${renderSectionTable(section, displayRows)}
    </div>
  `;
}

export function formatDefiUsd(value) {
  return formatUsd(value, { compact: false });
}

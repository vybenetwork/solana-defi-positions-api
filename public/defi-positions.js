'use strict';

(function () {
const walletInput = document.getElementById('wallet');
const defiSummaryLabel = document.getElementById('defiSummaryLabel');
const defiLastUpdatedValue = document.getElementById('defiLastUpdatedValue');
const defiSummaryStats = document.getElementById('defiSummaryStats');
const defiMeta = document.getElementById('defiMeta');
const defiPlatforms = document.getElementById('defiPlatforms');
const defiError = document.getElementById('defiError');
const defiHideDustInput = document.getElementById('defiHideDust');
const defiCategoryPie = document.getElementById('defiCategoryPie');
const defiCategoryLegend = document.getElementById('defiCategoryLegend');
const defiCategoryPieTitle = document.getElementById('defiCategoryPieTitle');
const defiCategoryPieLede = document.getElementById('defiCategoryPieLede');
const defiCategoryPieInsight = document.getElementById('defiCategoryPieInsight');
const defiValueUsdBars = document.getElementById('defiValueUsdBars');
const defiStatsMeta = document.getElementById('defiStatsMeta');

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
const SOLSCAN_TOKEN = 'https://solscan.io/token/';
const TOKEN_PLACEHOLDER = '/token-placeholder.png';
const DEFI_META_PLACEHOLDER = 'Load a wallet to see DeFi positions from the Vybe API.';
const DEFI_PLACEHOLDER_ROW_COUNT = 3;
const DEFI_PLACEHOLDER_SECTIONS = [
  { label: 'Lending', tableType: 'supplied' },
  { label: 'Staked', tableType: 'staked' },
  { label: 'Rewards', tableType: 'rewards' },
];
const DUST_USD_THRESHOLD = 0.1;
const DUST_USD_LABEL = '$0.10';
const SYMBOL_ENRICH_LIMIT = 20;
const STAKE_STATUS_LABELS = { 4: 'Active', 6: 'Inactive' };
const NATIVE_SOL_MINT = '11111111111111111111111111111111';
const WSOL_MINT = 'So11111111111111111111111111111111111111112';
const STABLECOIN_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'USD1ttGY1N17NEEHLmELoaybftRBUSErhqYiQzvEmuB',
  '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  'JEFFSQ3s8T3wKsvp4tnRAsUBW7Cqgnf8ukBZC4C8XBm1',
  'Dn4noZ5jgGfkntzcQSUZ8czkreiZ1ForXYoV2H8Dm7S1',
  '7kbnvuGBxxj8AG9qp8Scn56muWGaRaFqxg1FsRp3PaFT',
  'USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX',
  'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM',
  'A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6',
  'DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT',
]);
const STABLE_SYMBOLS = new Set(['USD', 'USDC', 'USDT', 'PYUSD', 'USD1', 'USDE', 'USDH', 'UXD', 'USDY', 'DAI', 'EURC', 'USDS', 'FDUSD']);
const STABLE_SYMBOL_NEEDLES = ['USDC', 'USDT', 'PYUSD', 'USD1', 'USDE', 'USDH', 'UXD', 'USDY', 'DAI', 'EURC', 'USDS', 'FDUSD'];

let lastPayload = null;
/** @type {Set<string>} Platform ids with dust expanded */
const expandedDustPlatforms = new Set();
/** @type {Map<string, { symbol: string, name: string, logo: string }>} */
let balanceMetaByMint = new Map();
/** @type {Map<string, string>} mint → resolved symbol (wallet + DeFi harvest) */
let symbolCacheByMint = new Map();
/** True after wallet balance fetch applies meta (optional enrich for logos). */
let balancesFetched = false;
let symbolEnrichGeneration = 0;
/** @type {Set<string>} mints already attempted this wallet session */
const symbolEnrichAttempted = new Set();

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
  return true;
}

function resolveTableType(section, row) {
  return String(row?.tableType || section?.tableType || section?.type || 'default').trim() || 'default';
}

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

function defiCategoryIconKey(categoryKey) {
  const key = String(categoryKey || '').trim();
  if (!key || key === 'everythingElse' || /^everything\s*else$/i.test(key)) return 'everythingElse';
  return resolveSectionIconKey({ type: key }, { tableType: key });
}

function renderDefiCategoryTitleIconHtml(iconKey, accent) {
  const key = DEFI_SECTION_ICON_SVGS[iconKey] ? iconKey : 'everythingElse';
  const paths = DEFI_SECTION_ICON_SVGS[key];
  const color = accent ? ` style="color:${escapeHtml(accent)}"` : '';
  return `<span class="token-tier-card__title-icon defi-section-icon defi-section-icon--${escapeHtml(key)}"${color} aria-hidden="true"><svg class="token-tier-card__title-icon__svg" viewBox="0 0 16 16">${paths}</svg></span>`;
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

function looksTruncatedLabel(label) {
  const s = String(label ?? '');
  return s.includes('…') || s.includes('...');
}

/** Parse Description like "wSOL/bSOL" into symbol parts when it looks like a valid pair. */
function parseDescriptionPairParts(sectionName) {
  const s = cleanStr(sectionName);
  if (!s || s === '—') return null;
  const parts = s
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.some((p) => looksTruncatedLabel(p) || looksLikeAddressOrMint(p) || p.length > 24)) return null;
  return parts;
}

function cacheSymbolForMint(mint, symbol) {
  const m = cleanStr(mint);
  const s = cleanStr(symbol);
  if (!m || !isValidLabel(s, m) || looksTruncatedLabel(s)) return false;
  const prev = symbolCacheByMint.get(m);
  if (!prev || looksTruncatedLabel(prev)) {
    symbolCacheByMint.set(m, s);
    return true;
  }
  return false;
}

function getCachedSymbol(mint) {
  const m = cleanStr(mint);
  if (!m) return '';
  const cached = symbolCacheByMint.get(m);
  return cached && isValidLabel(cached, m) && !looksTruncatedLabel(cached) ? cached : '';
}

function harvestSymbolsFromRow(row) {
  const symbols = asArray(row.symbol);
  const addresses = asArray(row.address);
  const n = Math.max(symbols.length, addresses.length);
  for (let i = 0; i < n; i++) {
    const mint = cleanStr(addresses[i]);
    if (!mint) continue;
    if (isValidLabel(symbols[i], mint) && !looksTruncatedLabel(symbols[i])) {
      cacheSymbolForMint(mint, symbols[i]);
    }
  }
  const pairParts = parseDescriptionPairParts(row.sectionName);
  if (!pairParts) return;
  for (let i = 0; i < Math.min(pairParts.length, addresses.length); i++) {
    const mint = cleanStr(addresses[i]);
    if (!mint) continue;
    cacheSymbolForMint(mint, pairParts[i]);
  }
}

function harvestSymbolsFromPayload(payload) {
  const platforms = Array.isArray(payload?.platforms) ? payload.platforms : [];
  for (const platform of platforms) {
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        harvestSymbolsFromRow(row);
      }
    }
  }
}

/** Fill missing symbol/name/logo from wallet balances + shared symbol cache. */
function resolveLegFields(symbol, name, logo, mint) {
  const bal = mint ? balanceMetaByMint.get(mint) : null;
  let sym = isValidLabel(symbol, mint) && !looksTruncatedLabel(symbol) ? cleanStr(symbol) : '';
  let nm = isValidLabel(name, mint) ? cleanStr(name) : '';
  let lg = cleanStr(logo);

  if (bal) {
    if (!sym && isValidLabel(bal.symbol, mint) && !looksTruncatedLabel(bal.symbol)) sym = bal.symbol;
    if (!nm && isValidLabel(bal.name, mint)) nm = bal.name;
    if (!lg && bal.logo) lg = bal.logo;
  }

  if (!sym) {
    const cached = getCachedSymbol(mint);
    if (cached) sym = cached;
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
    balancesFetched = true;
    if (lastPayload) renderPlatforms(lastPayload);
    return 0;
  }
  for (const token of tokens) {
    const mint = cleanStr(token.mintAddress || token.address);
    if (!mint) continue;
    const symbol = cleanStr(token.symbol);
    const name = cleanStr(token.name);
    const logo = cleanStr(token.logoUrl || token.logourl);
    balanceMetaByMint.set(mint, { symbol, name, logo });
    cacheSymbolForMint(mint, symbol);
  }
  balancesFetched = true;
  if (lastPayload) renderPlatforms(lastPayload);
  return balanceMetaByMint.size;
}

function legUsdValue(row, index) {
  if (Array.isArray(row?.usdValue)) {
    return Math.abs(toNum(row.usdValue[index]) ?? 0);
  }
  return absUsd(row);
}

function mintNeedsSymbol(mint, symbolHint) {
  const m = cleanStr(mint);
  if (!m) return false;
  if (getCachedSymbol(m)) return false;
  const bal = balanceMetaByMint.get(m);
  if (bal && isValidLabel(bal.symbol, m) && !looksTruncatedLabel(bal.symbol)) return false;
  if (isValidLabel(symbolHint, m) && !looksTruncatedLabel(symbolHint)) return false;
  return true;
}

/**
 * Collect uncached missing-symbol mints for enrich-symbols.
 * Only queues when at least one non-dust mint needs a fetch; dust-only → skip.
 * When queuing: non-dust first, then dust to fill up to SYMBOL_ENRICH_LIMIT.
 */
function collectMissingSymbolCandidates(payload) {
  /** @type {Map<string, { mint: string, usd: number, isDust: boolean }>} */
  const byMint = new Map();
  const platforms = Array.isArray(payload?.platforms) ? payload.platforms : [];
  for (const platform of platforms) {
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        const addresses = asArray(row.address);
        const symbols = asArray(row.symbol);
        const dust = isDustRow(row);
        const n = Math.max(addresses.length, 1);
        for (let i = 0; i < n; i++) {
          const mint = cleanStr(addresses[i]);
          if (!mint || !mintNeedsSymbol(mint, symbols[i])) continue;
          if (symbolEnrichAttempted.has(mint)) continue;
          const usd = legUsdValue(row, i);
          const prev = byMint.get(mint);
          if (!prev) {
            byMint.set(mint, { mint, usd, isDust: dust });
            continue;
          }
          prev.usd = Math.max(prev.usd, usd);
          if (!dust) prev.isDust = false;
        }
      }
    }
  }
  const all = [...byMint.values()];
  const nonDust = all.filter((c) => !c.isDust).sort((a, b) => b.usd - a.usd);
  if (nonDust.length === 0) return [];
  const dust = all.filter((c) => c.isDust).sort((a, b) => b.usd - a.usd);
  const picked = nonDust.slice(0, SYMBOL_ENRICH_LIMIT);
  if (picked.length < SYMBOL_ENRICH_LIMIT) {
    picked.push(...dust.slice(0, SYMBOL_ENRICH_LIMIT - picked.length));
  }
  return picked;
}

function applyFetchedTokenMeta(mint, data) {
  const m = cleanStr(mint);
  if (!m || !data || typeof data !== 'object') return false;
  const symbol = cleanStr(data.symbol);
  const name = cleanStr(data.name);
  const logo = cleanStr(data.logoUrl || data.logourl);
  const cached = cacheSymbolForMint(m, symbol);
  const prev = balanceMetaByMint.get(m) || { symbol: '', name: '', logo: '' };
  const next = {
    symbol: isValidLabel(symbol, m) && !looksTruncatedLabel(symbol) ? symbol : prev.symbol,
    name: isValidLabel(name, m) ? name : prev.name,
    logo: logo || prev.logo,
  };
  balanceMetaByMint.set(m, next);
  return cached || Boolean(next.symbol && next.symbol !== prev.symbol);
}

/** Backend: Vybe token-details → Jupiter via rotating proxy, sequential. Streams NDJSON updates. */
async function fetchSymbolsFromBackend(mints, onToken) {
  const res = await fetch('/api/tokens/enrich-symbols?stream=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify({ mints }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `symbol enrich HTTP ${res.status}`);
  }

  if (!res.body || typeof res.body.getReader !== 'function') {
    const data = await res.json().catch(() => null);
    const tokens = Array.isArray(data?.tokens) ? data.tokens : [];
    for (const token of tokens) onToken(token);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }
      if (event?.event === 'token' && event.token) onToken(event.token);
    }
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      const event = JSON.parse(tail);
      if (event?.event === 'token' && event.token) onToken(event.token);
    } catch {
      /* ignore */
    }
  }
}

async function runMissingSymbolEnrichment(generation) {
  if (!lastPayload) return;
  harvestSymbolsFromPayload(lastPayload);

  const pendingFromServer = Array.isArray(lastPayload.symbolEnrichPending)
    ? lastPayload.symbolEnrichPending.map((m) => cleanStr(m)).filter(Boolean)
    : [];
  let mints;
  if (pendingFromServer.length > 0) {
    mints = pendingFromServer
      .filter((mint) => !symbolEnrichAttempted.has(mint) && mintNeedsSymbol(mint, ''))
      .slice(0, SYMBOL_ENRICH_LIMIT);
  } else {
    mints = collectMissingSymbolCandidates(lastPayload).map((item) => item.mint);
  }
  if (mints.length === 0) return;

  for (const mint of mints) symbolEnrichAttempted.add(mint);

  try {
    await fetchSymbolsFromBackend(mints, (token) => {
      if (generation !== symbolEnrichGeneration) return;
      const mint = cleanStr(token.mint);
      if (!mint) return;
      if (applyFetchedTokenMeta(mint, token) && lastPayload && generation === symbolEnrichGeneration) {
        renderPlatforms(lastPayload);
      }
    });
  } catch (err) {
    console.warn('[defi-symbol-enrich]', err instanceof Error ? err.message : err);
  }
}

function queueMissingSymbolEnrichment() {
  if (!lastPayload) return;
  const generation = ++symbolEnrichGeneration;
  void runMissingSymbolEnrichment(generation);
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
  if (n === 0) return '0';
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);

  if (abs >= 0.0001) {
    return `${sign}${abs.toLocaleString(undefined, {
      maximumFractionDigits: 4,
      minimumFractionDigits: 0,
      useGrouping: abs >= 1000,
    })}`;
  }

  // Below 0.0001: keep leading zeros, then show the first 2 non-zero decimal digits.
  const frac = abs.toFixed(20).split('.')[1] || '';
  let firstNonZeroIdx = 0;
  while (firstNonZeroIdx < frac.length && frac[firstNonZeroIdx] === '0') firstNonZeroIdx += 1;
  if (firstNonZeroIdx >= frac.length) return `${sign}0`;
  const decimals = firstNonZeroIdx + 2;
  return `${sign}${abs.toFixed(decimals)}`;
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

/** Sample USD firmly inside each band so bar count/color match the Value column rules. */
function defiUsdBandSampleUsd(bandIndex) {
  const samples = [0.005, 0.05, 0.5, 5, 50, 500, 5000, 15000];
  return samples[bandIndex] ?? 15000;
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
  const iconHtml = renderDefiCategoryTitleIconHtml(args.iconKey, args.accent);
  return `<div class="token-supply-legend-item token-supply-legend-item--tier-dashboard">
    <article class="token-tier-card" style="--tier-accent:${args.accent};--tier-swatch:${args.swatchColor}">
      <h4 class="token-tier-card__title">${iconHtml}<span class="token-tier-card__title-text">${escapeHtml(args.title)}</span></h4>
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

function renderDefiTierCardPlaceholder(title, accent, swatch, iconKey) {
  return renderDefiTierCard({
    title,
    accent,
    swatchColor: swatch,
    iconKey: iconKey || defiCategoryIconKey(title),
    slicePct: 0,
    usdLine: '—',
    amountLine: '—',
  });
}

function renderDefiUsdBarRow(d, i, count, total, maxC, sumUsd) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  const w = Math.min(100, (count / maxC) * 100);
  const sampleUsd = defiUsdBandSampleUsd(i);
  const { color } = defiValueBarTierMeta(sampleUsd);
  const safe = escapeHtml(d.label);
  const icon = renderDefiValueBars(sampleUsd);
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
          platformId: pid,
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

/** Summary Overview: always exclude dust when hide-dust is on (ignore per-platform expand). */
function collectSummaryPositionRows(platforms) {
  const rows = [];
  for (const [pIndex, platform] of platforms.entries()) {
    const pid = platformId(platform, pIndex);
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        if (hideDustEnabled() && isDustRow(row)) continue;
        rows.push({
          row,
          section,
          platformId: pid,
          category: resolveTableType(section, row),
        });
      }
    }
  }
  return rows;
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
    iconKey: defiCategoryIconKey(item.key),
    count: item.count,
    usd: item.usd,
  }));
  if (everythingElse.count > 0) {
    segments.push({
      title: 'Everything Else',
      iconKey: 'everythingElse',
      count: everythingElse.count,
      usd: everythingElse.usd,
    });
  }

  const finalSegments = segments.length > 0 ? segments : [{ title: '—', iconKey: 'everythingElse', count: 0, usd: 0 }];
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
    defiCategoryLegend.innerHTML = [
      ['Rewards', 'rewards'],
      ['Staked', 'staked'],
      ['Lending', 'lending'],
      ['Everything Else', 'everythingElse'],
    ]
      .map(([title, iconKey], i) => renderDefiTierCardPlaceholder(title, DEFI_PIE_HEX[i], DEFI_PIE_HEX[i], iconKey))
      .join('');
  }
  if (defiValueUsdBars) defiValueUsdBars.innerHTML = renderDefiUsdBarsPlaceholderHtml();
  if (defiCategoryPieTitle) defiCategoryPieTitle.textContent = 'Categories ranked by USD value';
  if (defiCategoryPieLede) defiCategoryPieLede.textContent = 'Load a wallet to see DeFi category value breakdown.';
  if (defiCategoryPieInsight) defiCategoryPieInsight.textContent = 'Top categories by USD; rest as Everything Else.';
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
          iconKey: segment.iconKey,
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
  window.VybeAppUi?.setDefiPositionsLoading?.(active);
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

function isNativeStakingItem(item) {
  const platformKey = String(item.platformId || '').toLowerCase();
  const tableType = String(item.category || item.row?.tableType || '').toLowerCase();
  return (
    platformKey === 'solana_native_stake' ||
    platformKey.includes('solana_native') ||
    tableType === 'nativestaking'
  );
}

function buildDefiSummaryHtml(payload) {
  const platforms = Array.isArray(payload?.platforms) ? payload.platforms : [];
  const allItems = collectAllPositionRows(platforms);
  let nativeCount = 0;
  let dustCount = 0;
  let totalUsd = 0;
  for (const item of allItems) {
    if (isDustRow(item.row)) {
      dustCount += 1;
      continue;
    }
    if (isNativeStakingItem(item)) nativeCount += 1;
    totalUsd += absUsd(item.row);
  }
  const positionsCount = allItems.length - dustCount;
  if (window.WalletSummaryUi?.buildDefiSectionsHtml) {
    return window.WalletSummaryUi.buildDefiSectionsHtml({
      positionsCount,
      nativeCount,
      dustCount,
      totalUsd,
      verifiedUsd: null,
      unverifiedUsd: null,
      unpricedUsd: null,
      uniqueCategories: null,
      uniqueSubcategories: null,
      topCategory: null,
      topSubcategory: null,
    });
  }
  return window.WalletSummaryUi?.buildDefiPlaceholderHtml?.() || '';
}

function buildDefiSummaryPlaceholderHtml() {
  return window.WalletSummaryUi?.buildDefiPlaceholderHtml?.() || '';
}

function renderSummary(payload, visibleCount, hiddenCount) {
  if (defiSummaryLabel) defiSummaryLabel.textContent = payload.ownerAddress || '—';
  if (defiLastUpdatedValue) {
    defiLastUpdatedValue.textContent = new Date().toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  if (defiSummaryStats) {
    defiSummaryStats.innerHTML = buildDefiSummaryHtml(payload);
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

function formatSectionMeta(value) {
  const s = cleanStr(value);
  return s || '—';
}

/** Normalize pair labels so "ADX / USDC" and "ADX/USDC" compare equal. */
function normalizeAssetLabelKey(value) {
  return cleanStr(value)
    .toLowerCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolvePoolAssetTitle(row) {
  if (!isMultiAssetRow(row)) {
    const mint = asArray(row.address)[0] || row.address;
    const leg = resolveLegFields(
      asArray(row.symbol)[0] ?? row.symbol,
      asArray(row.name)[0] ?? row.name,
      asArray(row.logourl)[0] ?? row.logourl,
      mint,
    );
    return leg.displayLabel || '';
  }
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const logos = asArray(row.logourl);
  const addresses = asArray(row.address);
  const legs = Math.max(symbols.length, names.length, logos.length, addresses.length, 1);
  const resolved = [];
  for (let i = 0; i < legs; i++) {
    resolved.push(resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  }
  const hasTruncated = resolved.some((leg) => looksTruncatedLabel(leg.displayLabel));
  const pairParts = hasTruncated ? parseDescriptionPairParts(row.sectionName) : null;
  const labels = resolvePairDisplayLabels(row, resolved).filter((l) => l && l !== 'Unknown');
  if (pairParts) return pairParts.join(' / ');
  if (labels.length > 0) return [...new Set(labels)].join(' / ');
  return 'LP position';
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

function resolvePairDisplayLabels(row, resolvedLegs) {
  const labels = resolvedLegs.map((leg) => leg.displayLabel);
  if (!labels.some((label) => looksTruncatedLabel(label))) return labels;
  const pairParts = parseDescriptionPairParts(row.sectionName);
  if (!pairParts) return labels;
  return labels.map((label, i) => {
    if (looksTruncatedLabel(label) && pairParts[i]) return pairParts[i];
    return label;
  });
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

function renderAmountLineHtml(amount, label, logo, mint) {
  const tone = amountTokenToneClass(mint, label);
  const logoSrc = cleanStr(logo) || TOKEN_PLACEHOLDER;
  return `<span class="defi-amount-line ${tone}"><span class="defi-amount-line__value">${formatAmount(amount)}</span> <span class="defi-amount-line__symbol">${escapeHtml(label)}</span><img class="defi-amount-line__logo" src="${escapeHtml(logoSrc)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" /></span>`;
}

function renderMultiAmounts(row) {
  const amounts = asArray(row.amount);
  const symbols = asArray(row.symbol);
  const names = asArray(row.name);
  const addresses = asArray(row.address);
  const logos = asArray(row.logourl);
  if (amounts.length === 0) return '—';
  const resolved = amounts.map((_, i) => resolveLegFields(symbols[i], names[i], logos[i], addresses[i]));
  const labels = resolvePairDisplayLabels(row, resolved);
  const lines = amounts.map((amount, i) => {
    const leg = resolved[i];
    const label = labels[i] || leg?.displayLabel || '—';
    return renderAmountLineHtml(amount, label, leg?.logo, addresses[i]);
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
  const normalized = String(label).toLowerCase();
  const chipClass =
    normalized === 'active'
      ? 'swap-pair-chg swap-pair-chg--up'
      : normalized === 'inactive'
        ? 'swap-pair-chg swap-pair-chg--down'
        : 'swap-pair-chg swap-pair-chg--breaking-even';
  return `<span class="${chipClass}">${escapeHtml(label)}</span>`;
}

function valueCell(row, { debt = false } = {}) {
  const usd = effectiveUsd(row);
  const formatted = formatDefiTableUsd(usd, { debt });
  const cls = debt && usd < 0 ? 'num defi-value--debt' : usd < 0 ? 'num defi-value--debt' : 'num';
  if (formatted === '—' || !Number.isFinite(usd)) {
    return `<td class="${cls}">—</td>`;
  }
  return `<td class="${cls} defi-value-col">${formatDefiValueWithBars(usd, formatted)}</td>`;
}

/** DeFi Value column bars. */
function defiValueBarCount(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 1;
  if (n < 0.01) return 1; // $0 – <$0.01: 1 orange
  if (n < 0.1) return 1; // $0.01 – <$0.10: 1 yellow
  if (n < 1) return 1; // $0.10 – <$1: 1 light green
  if (n < 10) return 2;
  if (n < 100) return 3;
  if (n < 1000) return 4;
  return 5;
}

function defiValueBarTierMeta(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n) || n < 0) {
    return {
      tierClass: 'holders-usd-tier--red',
      color: USD_MAGNITUDE_BAR_COLORS.red,
      label: 'negative',
    };
  }
  if (n < 0.01) {
    return {
      tierClass: 'holders-usd-tier--orange',
      color: USD_MAGNITUDE_BAR_COLORS.orange,
      label: '$0–$0.01',
    };
  }
  if (n < 0.1) {
    return {
      tierClass: 'holders-usd-tier--yellow',
      color: USD_MAGNITUDE_BAR_COLORS.yellow,
      label: '$0.01–$0.10',
    };
  }
  if (n < 1) {
    return {
      tierClass: 'holders-usd-tier--light-green',
      color: USD_MAGNITUDE_BAR_COLORS.lightGreen,
      label: '$0.10–$1',
    };
  }
  if (n < 10) {
    return {
      tierClass: 'holders-usd-tier--green',
      color: USD_MAGNITUDE_BAR_COLORS.green,
      label: '$1–$10',
    };
  }
  if (n < 100) {
    return {
      tierClass: 'holders-usd-tier--green',
      color: USD_MAGNITUDE_BAR_COLORS.green,
      label: '$10–$100',
    };
  }
  if (n < 1000) {
    return {
      tierClass: 'holders-usd-tier--green',
      color: USD_MAGNITUDE_BAR_COLORS.green,
      label: '$100–$1,000',
    };
  }
  return {
    tierClass: 'holders-usd-tier--green',
    color: USD_MAGNITUDE_BAR_COLORS.green,
    label: '$1,000+',
  };
}

function renderDefiValueBars(usd) {
  const bars = defiValueBarCount(usd);
  if (bars < 1 || bars > 5) return '';
  const { color, label } = defiValueBarTierMeta(usd);
  const tierLabel = `Value ${label}`;
  const barHtml = Array.from({ length: 5 }, (_, i) => {
    const active = i < bars;
    const style = active ? ` style="background:${color}"` : '';
    return `<span class="trade-volume-bar${active ? ' trade-volume-bar--active' : ''}"${style}></span>`;
  }).join('');
  return `<span class="trade-volume-bars" aria-label="${escapeHtml(tierLabel)}" title="${escapeHtml(tierLabel)}">${barHtml}</span>`;
}

function formatDefiValueWithBars(usd, formattedText) {
  const bars = defiValueBarCount(usd);
  if (!formattedText || formattedText === '—' || bars === 0) return formattedText || '—';
  const { tierClass } = defiValueBarTierMeta(usd);
  const main = `<span class="holders-usd-tier ${tierClass}">${escapeHtml(formattedText)}</span>`;
  const barsHtml = renderDefiValueBars(usd);
  return `<span class="trades-cell-with-volume"><span class="trades-cell-with-volume__bars">${barsHtml}</span><span class="trades-cell-with-volume__main">${main}</span></span>`;
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
    asArray(row.symbol)[0] ?? row.symbol,
    asArray(row.name)[0] ?? row.name,
    asArray(row.logourl)[0] ?? row.logourl,
    mint,
  );
  if (!leg.displayLabel || leg.displayLabel === 'Unknown') {
    return `<td class="${cls}">${formatAmount(row.amount)}</td>`;
  }
  return `<td class="${cls}">${renderAmountLineHtml(row.amount, leg.displayLabel, leg.logo, mint)}</td>`;
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
  if (n == null) return null;
  if (n === 0) return '0%';
  if (Math.abs(n) < 0.01) return '0.001%';
  return formatPct(n);
}

function apyCell(row) {
  const label = formatApyLabel(row.apy);
  if (label == null) {
    return '<td class="num defi-apy-col"><span class="swap-pair-chg swap-pair-chg--missing">No APY</span></td>';
  }
  const badgeClass = resolveApyBadgeClass(row.apy);
  return `<td class="num defi-apy-col"><span class="${badgeClass}">${escapeHtml(label)}</span></td>`;
}

function formatDefiPriceUsd(value) {
  const n = toNum(value);
  if (n == null) return '—';
  if (n === 0) return '$0.00';
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs > 999.99) {
    if (abs >= 1_000_000) {
      const millions = abs / 1_000_000;
      if (millions > 9.99) {
        return `${sign}$${Math.round(millions).toLocaleString(undefined, { maximumFractionDigits: 0 })}M`;
      }
      return `${sign}$${millions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
    }
    const thousands = abs / 1000;
    if (thousands > 9.99) {
      return `${sign}$${Math.round(thousands).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
    }
    return `${sign}$${thousands.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}k`;
  }
  return `${sign}$${formatDefiTableUsdFraction(abs)}`;
}

function priceCell(row) {
  if (isMultiAssetRow(row)) return '<td class="num">—</td>';
  return `<td class="num defi-price-cell">${formatDefiPriceUsd(row.price)}</td>`;
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

function isNumericHeaderColumn(layout, colIndex) {
  if (layout === 'asset9') return colIndex >= 4 && colIndex <= 7;
  // Stake…MEV numeric; Status + Account right-aligned to match cell content
  if (layout === 'nativeStaking') return colIndex >= 3;
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
      <col class="defi-col-asset" />
      <col class="defi-col-section-name" />
      <col class="defi-col-section-type" />
      <col class="defi-col-rate" />
      <col class="defi-col-qty" />
      <col class="defi-col-value" />
      <col class="defi-col-value" />
      <col class="defi-col-value" />
      <col class="defi-col-rate" />
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
              <td class="num">${row.mevValueUsd == null ? '—' : formatUsd(row.mevValueUsd)}</td>
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

function rowSymbolCount(row) {
  const symbols = asArray(row?.symbol).filter((s) => cleanStr(s));
  const addresses = asArray(row?.address).filter((a) => cleanStr(a));
  return Math.max(symbols.length, addresses.length, isMultiAssetRow(row) ? 2 : 1);
}

function tableNeedsWideAssetColumn(rows) {
  return rows.some((row) => rowSymbolCount(row) >= 3);
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
  const wideAssetClass = tableNeedsWideAssetColumn(rowsToRender) ? ' defi-positions-table--wide-asset' : '';
  return `
    <div class="table-wrap table-wrap--defi-section">
      <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)}${layoutClass}${wideAssetClass}">
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

function formatPlatformLabel(label) {
  const s = cleanStr(label);
  if (!s) return '';
  const compact = s.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (compact === 'BORROWLEND') return 'BORROW/LEND';
  return s
    .toUpperCase()
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function platformLabelToneClass(label) {
  const key = cleanStr(label).toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (key === 'DEFI') return 'defi-platform-label--defi';
  if (key.includes('BORROW') || key.includes('LEND')) return 'defi-platform-label--borrow-lend';
  if (key.includes('STAKE')) return 'defi-platform-label--staking';
  if (key.includes('LIQUID') || key.includes('POOL')) return 'defi-platform-label--liquidity';
  if (key.includes('FARM')) return 'defi-platform-label--farming';
  if (key.includes('PERP') || key.includes('TRADE')) return 'defi-platform-label--perps';
  if (key.includes('VAULT')) return 'defi-platform-label--vault';
  if (key.includes('REWARD')) return 'defi-platform-label--rewards';
  return 'defi-platform-label--default';
}

function renderPlatformLabelsHtml(labels) {
  return labels
    .map((label) => {
      const text = formatPlatformLabel(label);
      if (!text) return '';
      return `<span class="defi-platform-label ${platformLabelToneClass(label)}">${escapeHtml(text)}</span>`;
    })
    .join('');
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
  const labelsHtml = renderPlatformLabelsHtml(labels);

  const sectionsHtml = sections
    .filter((section) => sectionHasVisibleRows(section, platformExpanded))
    .map((section) => {
      const heading = section.label || section.name || section.tableType || section.type || 'Positions';
      const allRows = Array.isArray(section.rows) ? section.rows : [];
      const displayRows = rowsForDisplay(allRows, platformExpanded);
      const sectionUsd = sumSectionUsd(displayRows);
      const rowCount = displayRows.length;
      const iconRow = displayRows[0] || (Array.isArray(section.rows) ? section.rows[0] : null);
      return `
        <div class="defi-section-block">
          <h3 class="defi-section-title">
            <span class="defi-section-title__lead">
              ${renderSectionIconHtml(section, iconRow)}
              <span class="defi-section-title__text">${escapeHtml(heading)}</span>
            </span>
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
          <div class="defi-platform-title-row">
            <h2 class="defi-platform-title">${escapeHtml(title)}</h2>
            ${labelsHtml ? `<div class="defi-platform-labels">${labelsHtml}</div>` : ''}
          </div>
          <div class="defi-platform-meta">
            ${platform.platformId ? `<span class="defi-platform-id mono">${escapeHtml(platform.platformId)}</span>` : ''}
            ${website ? `<a class="defi-platform-link" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ''}
          </div>
        </div>
        <div class="defi-platform-header-actions">
          <div class="defi-platform-total">
            <span class="defi-platform-total-label">Platform value</span>
            <span class="defi-platform-total-value">${formatDefiTableUsd(platform.totalValueUsd)}</span>
          </div>
          ${dustBtn}
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

function renderPlatforms(payload, options = {}) {
  harvestSymbolsFromPayload(payload);
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

  const dustNote = hidden > 0 ? ` · ${hidden.toLocaleString()} under ${DUST_USD_LABEL} hidden` : '';
  const protocolWord = platforms.length === 1 ? 'protocol' : 'protocols';
  const positionWord = visible === 1 ? 'position' : 'positions';
  defiMeta.textContent = `Showing ${visible.toLocaleString()} ${positionWord} across ${platforms.length.toLocaleString()} ${protocolWord}${dustNote}`;
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

function buildDefiPlaceholderRows(count = DEFI_PLACEHOLDER_ROW_COUNT) {
  const dash = '—';
  const logo = `<span class="token-logo-slot token-logo-slot--pending" aria-hidden="true"></span>`;
  return Array.from({ length: count }, (_, i) => `<tr class="defi-row defi-row--placeholder">
    <td>${i + 1}</td>
    <td><div class="token-header">${logo}<div class="token-header-text"><div class="symbol">${dash}</div><div class="name">${dash}</div></div></div></td>
    <td>${dash}</td>
    <td>${dash}</td>
    <td class="num">${dash}</td>
    <td class="num">${dash}</td>
    <td class="num">${dash}</td>
    <td class="num">${dash}</td>
    <td class="meta">${dash}</td>
  </tr>`).join('');
}

function renderDefiPlaceholderSection(section) {
  const schema = buildTableSchema(section.tableType);
  const icon = renderSectionIconHtml({ label: section.label, tableType: section.tableType }, { tableType: section.tableType });
  return `
    <div class="defi-section-block">
      <h3 class="defi-section-title">
        <span class="defi-section-title__lead">
          ${icon}
          <span class="defi-section-title__text">${escapeHtml(section.label)}</span>
        </span>
        <span class="defi-section-meta">—</span>
      </h3>
      <div class="table-wrap table-wrap--defi-section">
        <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)} defi-positions-table--${escapeHtml(schema.layout || 'default')}">
          ${renderTableColgroup(schema.layout)}
          <thead>
            <tr>${renderTableHeader(schema)}</tr>
          </thead>
          <tbody>${buildDefiPlaceholderRows()}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderDefiTablePlaceholder() {
  if (!defiPlatforms) return;
  if (defiMeta) defiMeta.textContent = DEFI_META_PLACEHOLDER;
  const sectionsHtml = DEFI_PLACEHOLDER_SECTIONS.slice(0, 3).map(renderDefiPlaceholderSection).join('');
  defiPlatforms.innerHTML = `
    <article class="defi-platform-card defi-platform-card--placeholder" aria-hidden="true">
      <header class="defi-platform-header">
        <span class="defi-platform-logo token-logo-slot token-logo-slot--pending" aria-hidden="true"></span>
        <div class="defi-platform-heading">
          <div class="defi-platform-title-row">
            <h2 class="defi-platform-title">—</h2>
          </div>
          <div class="defi-platform-meta">
            <span class="defi-platform-id mono">—</span>
          </div>
        </div>
        <div class="defi-platform-header-actions">
          <div class="defi-platform-total">
            <span class="defi-platform-total-label">Platform value</span>
            <span class="defi-platform-total-value">—</span>
          </div>
        </div>
      </header>
      <div class="defi-platform-sections">${sectionsHtml}</div>
    </article>
  `;
}

function resetDefiPlaceholder() {
  lastPayload = null;
  balanceMetaByMint = new Map();
  symbolCacheByMint = new Map();
  balancesFetched = false;
  symbolEnrichGeneration += 1;
  symbolEnrichAttempted.clear();
  expandedDustPlatforms.clear();
  if (defiSummaryLabel) defiSummaryLabel.textContent = '—';
  if (defiLastUpdatedValue) defiLastUpdatedValue.textContent = '—';
  if (defiSummaryStats) defiSummaryStats.innerHTML = buildDefiSummaryPlaceholderHtml();
  if (defiMeta) defiMeta.textContent = DEFI_META_PLACEHOLDER;
  renderDefiTablePlaceholder();
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
    harvestSymbolsFromPayload(payload);
    renderPlatforms(payload);
    queueMissingSymbolEnrichment();
  } catch (err) {
    resetDefiPlaceholder();
    showDefiError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}

bindDefiUiEvents();
setDefiStatsPlaceholder();
renderDefiTablePlaceholder();

window.VybeDefiPositions = {
  load: loadDefiPositions,
  resetPlaceholder: resetDefiPlaceholder,
  setBalanceMeta,
  queueMissingSymbolEnrichment,
};
})();

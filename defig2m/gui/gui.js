'use strict';

import { renderDefiSectionBlock, sumSectionUsd, isDustRow } from './defi-tables.js';

const SAMPLE_WALLETS = [
  'tEsT1vjsJeKHw9GH5HpnQszn2LWmjR6q1AVCDCj51nd',
  '2NJM5ec8De4WDsiiDSKbxHfV6M45CLiRrvNfyh4Ec8sA',
  '2nXBERQMihdEPWKC33ER2tEysyX5QCYSasTkuxHWqqxE',
  '28oSSRacjogqeZBJNSjuN27mPvj5TGwKHaaLRfYLKKdQ',
  '9g5Kk8FE8Yj19La4tGgGMM53wsVMyw8CH7APX29idDC',
  '6RscwM1tgrK6M3o1Apacr49upaTQLZ7biG9Be3D1gzda',
  'H3KP17ksqxzMJb7Fn9htpA9pdwnvL3zmxT2bXzVaNwSx',
  '7N8zvPN7tV8NjmTu5W8SZAD9rM6ThAKqgGneAfZNcTNC',
  '3Fv9YppPQ8Z1p3j3vDT8TGhVqmdNnREmQsW94Wvhg8nh',
  'CRGMwecdGcHQdanuruoMvHUZ73BQf2nA5kLBaA5ZnpsA',
];

const DUST_USD = 0.1;
const COLORS = ['#c8f542', '#60a5fa', '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#38bdf8', '#fbbf24'];

const CAT_ICONS = {
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
    '<path d="M5.2 6.8c0-1.7 1.3-3 2.8-3s2.8 1.3 2.8 3c0 2.4-2.8 3.4-2.8 5.8 0-2.4-2.8-3.4-2.8-5.8Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>',
  farming:
    '<path d="M8 12.8V7.8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><path d="M8 7.8c-2.2 0-3.5-1.4-3.5-3.2S5.8 2.2 8 4.1c2.2-1.9 3.5-.7 3.5 1.1S10.2 7.8 8 7.8Z" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>',
  vault:
    '<rect x="3.8" y="5.2" width="8.4" height="7.3" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="8" cy="8.8" r="1.1" fill="currentColor"/>',
  deposit:
    '<path d="M8 3.5v6.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M5.8 7.5 8 10.3l2.2-2.8" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 12.5h8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  leverage:
    '<path d="M3.5 11.8 6.4 8.2l2.1 1.8 3-4.3" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>',
  wallet:
    '<rect x="2.8" y="5" width="10.4" height="7.5" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="11" cy="8.8" r="0.9" fill="currentColor"/>',
  other:
    '<rect x="3.2" y="3.2" width="9.6" height="9.6" rx="2" fill="none" stroke="currentColor" stroke-width="1.25" stroke-dasharray="2.2 1.6"/>',
  categories:
    '<path d="M3.5 4.2h9M3.5 8h9M3.5 11.8h6" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/>',
  overview:
    '<circle cx="8" cy="8" r="4.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 5.4v3.1l2 1.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  portfolio:
    '<path d="M3.5 11.5 6.2 7.8l2.1 1.7 3.2-4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
};

function catIconKey(raw) {
  const s = normalizeCat(raw);
  if (CAT_ICONS[s]) return s;
  if (s.includes('native')) return 'staked';
  if (s.includes('order') || s.includes('trade')) return 'other';
  return 'other';
}

function catIcon(raw) {
  const key = catIconKey(raw);
  const paths = CAT_ICONS[key] || CAT_ICONS.other;
  return `<span class="cat-icon" aria-hidden="true"><svg viewBox="0 0 16 16">${paths}</svg></span>`;
}
const USD_BANDS = [
  { label: '< $1', min: 0, max: 1, color: '#ef4444' },
  { label: '$1–$10', min: 1, max: 10, color: '#fb923c' },
  { label: '$10–$100', min: 10, max: 100, color: '#facc15' },
  { label: '$100–$1k', min: 100, max: 1000, color: '#86efac' },
  { label: '$1k+', min: 1000, max: Infinity, color: '#22c55e' },
];
const AMOUNT_BANDS = [
  { label: '< 1', min: 0, max: 1, color: '#ef4444' },
  { label: '1–10', min: 1, max: 10, color: '#fb923c' },
  { label: '10–100', min: 10, max: 100, color: '#facc15' },
  { label: '100–1k', min: 100, max: 1000, color: '#86efac' },
  { label: '1k+', min: 1000, max: Infinity, color: '#22c55e' },
];

const els = {
  form: document.getElementById('walletForm'),
  wallet: document.getElementById('wallet'),
  loadBtn: document.getElementById('loadBtn'),
  samples: document.getElementById('sampleWallets'),
  walletLabel: document.getElementById('walletLabel'),
  connectedBadge: document.getElementById('connectedBadge'),
  refreshBtn: document.getElementById('refreshBtn'),
  viewSwitch: document.getElementById('viewSwitch'),
  toolbar: document.getElementById('toolbar'),
  hideDust: document.getElementById('hideDust'),
  status: document.getElementById('status'),
  error: document.getElementById('error'),
  hero: document.getElementById('hero'),
  heroLabel: document.getElementById('heroLabel'),
  netWorth: document.getElementById('netWorth'),
  netWorthSol: document.getElementById('netWorthSol'),
  netDelta: document.getElementById('netDelta'),
  spotUsd: document.getElementById('spotUsd'),
  defiUsd: document.getElementById('defiUsd'),
  claimableUsd: document.getElementById('claimableUsd'),
  allocCanvas: document.getElementById('allocCanvas'),
  chartLegend: document.getElementById('chartLegend'),
  stats: document.getElementById('stats'),
  bands: document.getElementById('bands'),
  bandsTitle: document.getElementById('bandsTitle'),
  bandList: document.getElementById('bandList'),
  protocolChips: document.getElementById('protocolChips'),
  content: document.getElementById('content'),
};

/** @type {any} */
let lastPayload = null;
/** @type {'holdings'|'defi'} */
let activeView = 'defi';
let activeProtocol = 'all';
/** @type {Set<string>} */
const openIds = new Set();

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortAddr(addr) {
  const a = String(addr || '');
  return a.length < 10 ? a : `${a.slice(0, 4)}…${a.slice(-4)}`;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs > 0 && abs < 0.01) return '<$0.01';
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${Math.round(v).toLocaleString()}`;
  if (abs >= 1) return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs === 0) return '$0.00';
  return `$${v.toFixed(4)}`;
}

/** Spot Value (USD): always 2 decimals down to $0.01. */
function fmtHoldingValueUsd(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs > 0 && abs < 0.01) return '<$0.01';
  if (abs === 0) return '$0.00';
  if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtAmt(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(v) >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 4 });
  if (v === 0) return '0';
  return v.toPrecision(4);
}

/** Spot holdings amount: up to token decimals (capped at 9), no trailing zeros. */
function fmtHoldingAmt(amountUi, decimals) {
  const v = Number(amountUi);
  if (!Number.isFinite(v)) return '—';
  if (v === 0) return '0';
  const dRaw = Number(decimals);
  const maxDp = Number.isFinite(dRaw) ? Math.min(9, Math.max(0, Math.floor(dRaw))) : 9;
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  const formatted = abs.toLocaleString(undefined, {
    useGrouping: true,
    maximumFractionDigits: maxDp,
    minimumFractionDigits: 0,
  });
  return `${sign}${formatted}`;
}

function fmtPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function fmtApy(n) {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return '';
  const pct = Math.abs(v) <= 2 ? v * 100 : v;
  return `${pct.toFixed(2)}% APY`;
}

function logoHtml(url, symbol, cls = 'token-logo', mint = null) {
  const sym = String(symbol || '?').slice(0, 3).toUpperCase();
  const fallbackHtml = `<span class="${cls} fallback">${escapeHtml(sym)}</span>`;
  const candidates = [];
  if (url) candidates.push(String(url));
  const m = String(mint || '').trim();
  if (m) {
    for (const ext of ['png', 'jpg', 'webp', 'svg']) {
      const p = `/cached/token-icons/${m}.${ext}`;
      if (!candidates.includes(p)) candidates.push(p);
    }
  }
  if (!candidates.length) return fallbackHtml;
  const primary = candidates[0];
  const rest = candidates.slice(1);
  return `<img class="${cls}" src="${escapeHtml(primary)}" alt="" loading="lazy" data-symbol="${escapeHtml(sym)}" data-fallbacks='${escapeHtml(JSON.stringify(rest))}' onerror="window.__vybeLogoFail&&window.__vybeLogoFail(this)" />`;
}

window.__vybeLogoFail = function logoFail(img) {
  try {
    const f = JSON.parse(img.dataset.fallbacks || '[]');
    if (f.length) {
      img.dataset.fallbacks = JSON.stringify(f.slice(1));
      img.src = f[0];
      return;
    }
  } catch {
    /* ignore */
  }
  const sym = img.dataset.symbol || '?';
  const cls = [...img.classList].join(' ') || 'token-logo';
  img.outerHTML = `<span class="${cls} fallback">${sym}</span>`;
};

function setError(msg) {
  els.error.hidden = !msg;
  els.error.textContent = msg || '';
}

function isRewardSection(section) {
  const hay = `${section.tableType || ''} ${section.label || ''} ${section.name || ''}`.toLowerCase();
  return /reward|claimable/.test(hay);
}

function sectionUsd(section) {
  return sumSectionUsd(section.rows || []);
}

function rowUsdAbs(row) {
  if (row?.totalUsdValue != null) return Math.abs(num(row.totalUsdValue));
  if (Array.isArray(row?.usdValue)) {
    return Math.abs(row.usdValue.reduce((s, v) => s + num(v), 0));
  }
  return Math.abs(num(row?.usdValue));
}

function normalizeCat(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!s) return 'other';
  if (s.includes('lend') || s === 'supplied' || s === 'borrowlend') return 'lending';
  if (s.includes('borrow')) return 'borrowing';
  if (s.includes('liquid') || s === 'lp') return 'liquidity';
  if (s.includes('stake') || s === 'nativestaking') return 'staked';
  if (s.includes('farm')) return 'farming';
  if (s.includes('vault')) return 'vault';
  if (s.includes('reward')) return 'rewards';
  if (s.includes('lever')) return 'leverage';
  if (s.includes('vest')) return 'vesting';
  if (s.includes('deposit')) return 'deposit';
  return s;
}

function catLabel(id) {
  return ({
    lending: 'Lending',
    borrowing: 'Borrowing',
    liquidity: 'Liquidity',
    staked: 'Staked',
    farming: 'Farming',
    vault: 'Vault',
    rewards: 'Rewards',
    leverage: 'Leverage',
    vesting: 'Vesting',
    deposit: 'Deposit',
    other: 'Other',
    wallet: 'Wallet',
  })[id] || id;
}

/** Build filtered model so every USD figure uses the same dust rule. */
function buildModel(payload) {
  const hideDust = els.hideDust.checked;
  const keepUsd = (usd) => !hideDust || usd >= DUST_USD;
  // Holdings often have no USD — dust filter uses amountUi heuristic only when no USD
  const keepHolding = (t) => {
    const usd = t.valueUsd == null ? null : num(t.valueUsd);
    if (usd != null) return keepUsd(usd);
    if (!hideDust) return true;
    if (t.amountUi != null && Number.isFinite(Number(t.amountUi))) return num(t.amountUi) >= 0.000001;
    // Unknown decimals — keep if raw amount present
    return Boolean(t.amountExact && String(t.amountExact) !== '0');
  };

  const tokensAll = payload.balances?.tokens || [];
  // Spot Holdings: never drop wallet rows. Hide-dust only applies to DeFi USD dust.
  const tokens = tokensAll;
  const hasHoldingsUsd = tokens.some((t) => t.valueUsd != null && Number.isFinite(Number(t.valueUsd)));
  const spotUsd = hasHoldingsUsd
    ? tokens.reduce((s, t) => s + num(t.valueUsd), 0)
    : null;
  const verified = tokens.filter((t) => t.verified).length;
  const unverified = tokens.length - verified;
  const verifiedUsd = hasHoldingsUsd
    ? tokens.filter((t) => t.verified).reduce((s, t) => s + num(t.valueUsd), 0)
    : null;
  const unverifiedUsd = hasHoldingsUsd && spotUsd != null ? spotUsd - (verifiedUsd || 0) : null;
  const priced = tokens.filter((t) => t.priceUsd != null && num(t.priceUsd) > 0).length;
  const unpriced = tokens.length - priced;
  const withSymbol = tokens.filter((t) => t.symbol).length;
  const withLogo = tokens.filter((t) => t.logoUrl).length;
  const withName = tokens.filter((t) => t.name).length;

  const cats = new Map();
  for (const t of tokens) {
    const c = (t.category || 'Uncategorized').trim() || 'Uncategorized';
    const prev = cats.get(c) || { count: 0, usd: 0 };
    prev.count += 1;
    prev.usd += num(t.valueUsd);
    cats.set(c, prev);
  }
  const topTokenCat = [...cats.entries()].sort((a, b) => b[1].count - a[1].count || b[1].usd - a[1].usd)[0] || null;

  let changeUsd = 0;
  let changeBase = 0;
  for (const t of tokens) {
    const value = num(t.valueUsd);
    const pct = Number(t.priceChange1dPct);
    if (value > 0 && Number.isFinite(pct)) {
      changeUsd += (value * pct) / 100;
      changeBase += value;
    }
  }

  let solPrice = 0;
  for (const t of tokensAll) {
    if (t.mintAddress === '11111111111111111111111111111111' || t.symbol === 'SOL') {
      solPrice = num(t.priceUsd);
      break;
    }
  }

  const platforms = [];
  let defiUsd = 0;
  let claimableUsd = 0;
  let positionsCount = 0;
  let dustPositions = 0;
  let nativeCount = 0;
  const defiCats = new Map();

  for (const p of payload.defi?.platforms || []) {
    const sections = [];
    for (const sec of p.sections || []) {
      const rowsAll = sec.rows || [];
      dustPositions += rowsAll.filter((r) => isDustRow(r)).length;
      // Keep all rows here — section tables apply hide-dust so empty dust-only
      // sections can still show the category header count when toggled off.
      const rowsKept = rowsAll;
      if (!rowsKept.length) continue;
      const usd = sumSectionUsd(rowsKept);
      const cat = normalizeCat(sec.tableType || sec.type || sec.label || sec.name);
      const prev = defiCats.get(cat) || { count: 0, usd: 0 };
      const visible = hideDust ? rowsKept.filter((r) => !isDustRow(r)) : rowsKept;
      prev.count += visible.length;
      prev.usd += sumSectionUsd(visible);
      defiCats.set(cat, prev);
      if (isRewardSection(sec)) claimableUsd += sumSectionUsd(visible);
      if (/native|stake1111|solana_native/i.test(`${p.platformId || ''} ${sec.tableType || ''}`)) {
        nativeCount += visible.length;
      }
      positionsCount += visible.length;
      sections.push({ ...sec, rows: rowsKept, _usd: sumSectionUsd(visible) });
    }
    if (!sections.length) continue;
    const usd = sections.reduce((s, sec) => s + sec._usd, 0);
    if (hideDust && usd === 0 && sections.every((sec) => (sec.rows || []).every((r) => isDustRow(r)))) {
      continue;
    }
    defiUsd += usd;
    platforms.push({
      id: String(p.platformId || p.platform || ''),
      label: String(p.platform || p.platformId || 'Protocol'),
      logoUrl: p.platformLogourl || null,
      labels: Array.isArray(p.platformLabels) ? p.platformLabels : [],
      sections,
      valueUsd: usd,
    });
  }
  platforms.sort((a, b) => b.valueUsd - a.valueUsd);

  const topProtocol = platforms[0] || null;
  const topDefiCat = [...defiCats.entries()].sort((a, b) => b[1].usd - a[1].usd)[0] || null;
  const netWorthUsd = defiUsd + (spotUsd || 0);

  return {
    tokens,
    tokensAllCount: tokensAll.length,
    spotUsd,
    hasHoldingsUsd,
    verified,
    unverified,
    verifiedUsd,
    unverifiedUsd,
    priced,
    unpriced,
    withSymbol,
    withLogo,
    withName,
    topTokenCat,
    tokenCategories: cats.size,
    changeUsd,
    changePct: changeBase > 0 ? (changeUsd / changeBase) * 100 : 0,
    solPrice,
    netWorthSol: solPrice > 0 ? netWorthUsd / solPrice : null,
    platforms,
    defiUsd,
    claimableUsd,
    positionsCount,
    dustPositions,
    nativeCount,
    topProtocol,
    topDefiCat,
    defiCategories: defiCats.size,
    netWorthUsd,
    tookMs: payload.tookMs,
    ownerAddress: payload.ownerAddress,
    source: payload.source || 'cache',
    balancesNote: payload.balances?.note || '',
    mintMetaCount: payload.meta?.mintMetaCount ?? null,
  };
}

function drawDonut(items, centerLabel) {
  const canvas = els.allocCanvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = 150;
  const h = 150;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const data = items.filter((x) => x.valueUsd > 0).slice(0, 5);
  const total = data.reduce((s, x) => s + x.valueUsd, 0) || 1;
  const cx = w / 2;
  const cy = h / 2;
  const r = 58;
  const ri = 36;

  if (!data.length) {
    ctx.fillStyle = '#2a3136';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.arc(cx, cy, ri, 0, Math.PI * 2, true);
    ctx.fill();
  } else {
    let a = -Math.PI / 2;
    data.forEach((item, i) => {
      const slice = (item.valueUsd / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.arc(cx, cy, r, a, a + slice);
      ctx.closePath();
      ctx.fill();
      a += slice;
    });
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, ri, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.fillStyle = '#f3f4f2';
  ctx.font = '700 13px IBM Plex Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(centerLabel, cx, cy + 4);

  els.chartLegend.innerHTML = data
    .map((item, i) => {
      const pct = ((item.valueUsd / total) * 100).toFixed(0);
      return `<li><i style="background:${COLORS[i % COLORS.length]}"></i><span>${escapeHtml(item.label)} ${pct}%</span><strong>${fmtUsd(item.valueUsd)}</strong></li>`;
    })
    .join('');
}

function bandCounts(values, bands) {
  return bands.map((b) => ({
    ...b,
    count: values.filter((v) => v >= b.min && v < b.max).length,
  }));
}

function renderBands(values, title, bands = USD_BANDS) {
  els.bands.hidden = false;
  els.bandsTitle.textContent = title;
  const rows = bandCounts(values, bands);
  const max = Math.max(1, ...rows.map((r) => r.count));
  els.bandList.innerHTML = rows
    .map(
      (r) => `<div class="band-row">
        <span>${r.label}</span>
        <div class="band-track"><div class="band-fill" style="width:${(r.count / max) * 100}%;background:${r.color}"></div></div>
        <strong>${r.count}</strong>
      </div>`,
    )
    .join('');
}

function renderHero(model) {
  els.hero.hidden = false;
  els.walletLabel.textContent = shortAddr(model.ownerAddress);
  els.connectedBadge.hidden = false;
  els.connectedBadge.textContent = 'Connected';

  if (activeView === 'holdings') {
    els.heroLabel.textContent = 'Spot Holdings';
    els.netWorth.textContent = `${model.tokens.length.toLocaleString()} tokens`;
    els.netWorthSol.textContent = model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : 'no USD';
    drawDonut(
      [...model.tokens]
        .sort((a, b) => num(b.amountUi) - num(a.amountUi))
        .slice(0, 5)
        .map((t) => ({
          label: t.symbol || shortAddr(t.mintAddress),
          valueUsd: model.hasHoldingsUsd ? num(t.valueUsd) : Math.max(num(t.amountUi), 0.0001),
        })),
      model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : String(model.tokens.length),
    );
    els.netDelta.textContent = `Meta enriched · ${model.withSymbol} symbols · ${model.withLogo} logos · ${model.withName} names`;
    els.netDelta.className = 'delta';
  } else {
    els.heroLabel.textContent = 'DeFi value';
    els.netWorth.textContent = fmtUsd(model.defiUsd);
    els.netWorthSol.textContent = `${model.platforms.length} protocols`;
    drawDonut(
      model.platforms.slice(0, 5).map((p) => ({ label: p.label, valueUsd: p.valueUsd })),
      fmtUsd(model.defiUsd),
    );
    els.netDelta.textContent = `Positions · claimable ${fmtUsd(model.claimableUsd)}`;
    els.netDelta.className = 'delta pos';
  }

  els.spotUsd.textContent = model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : `${model.tokens.length} tok`;
  els.defiUsd.textContent = fmtUsd(model.defiUsd);
  els.claimableUsd.textContent = fmtUsd(model.claimableUsd);
}

function renderStats(model) {
  els.stats.hidden = false;
  if (activeView === 'holdings') {
    const top = model.topTokenCat;
    els.stats.innerHTML = `
      <div class="stat-group">
        <h3>${catIcon('overview')} Overview</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('wallet')} Tokens shown</dt><dd>${model.tokens.length.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('portfolio')} Loaded total</dt><dd>${model.tokensAllCount.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('staked')} Verified</dt><dd>${model.verified.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('other')} Unverified</dt><dd>${model.unverified.toLocaleString()}</dd></div>
        </dl>
      </div>
      <div class="stat-group">
        <h3>${catIcon('portfolio')} Metadata fill</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('categories')} With symbol</dt><dd>${model.withSymbol.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('deposit')} With name</dt><dd>${model.withName.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('rewards')} With logo</dt><dd>${model.withLogo.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('vault')} Mint meta map</dt><dd>${model.mintMetaCount ?? '—'}</dd></div>
        </dl>
      </div>
      <div class="stat-group">
        <h3>${catIcon('categories')} Categories</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('categories')} Total categories</dt><dd>${model.tokenCategories}</dd></div>
          <div class="stat"><dt>${catIcon('overview')} Cache latency</dt><dd>${model.tookMs ?? '—'} ms</dd></div>
          <div class="stat"><dt>${catIcon(top ? top[0] : 'other')} Top category</dt><dd>${top ? escapeHtml(top[0]) : '—'}</dd></div>
          <div class="stat"><dt>${catIcon('wallet')} USD value</dt><dd>${model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : '—'}</dd></div>
        </dl>
      </div>`;
    renderBands(
      model.tokens.map((t) => num(t.amountUi)),
      'Spot Holdings by amount band',
      AMOUNT_BANDS,
    );
  } else {
    const topCat = model.topDefiCat;
    els.stats.innerHTML = `
      <div class="stat-group">
        <h3>${catIcon('overview')} Overview</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('other')} Positions</dt><dd>${model.positionsCount.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('vault')} Protocols</dt><dd>${model.platforms.length.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('staked')} Native rows</dt><dd>${model.nativeCount.toLocaleString()}</dd></div>
          <div class="stat"><dt>${catIcon('other')} Dust rows</dt><dd>${model.dustPositions.toLocaleString()}</dd></div>
        </dl>
      </div>
      <div class="stat-group">
        <h3>${catIcon('portfolio')} Portfolio value</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('portfolio')} Estimated USD</dt><dd>${fmtUsd(model.defiUsd)}</dd></div>
          <div class="stat"><dt>${catIcon('rewards')} Claimable</dt><dd>${fmtUsd(model.claimableUsd)}</dd></div>
          <div class="stat"><dt>${catIcon('lending')} Top protocol</dt><dd>${model.topProtocol ? escapeHtml(model.topProtocol.label) : '—'}</dd></div>
          <div class="stat"><dt>${catIcon('liquidity')} Top proto. USD</dt><dd>${model.topProtocol ? fmtUsd(model.topProtocol.valueUsd) : '—'}</dd></div>
        </dl>
      </div>
      <div class="stat-group">
        <h3>${catIcon('categories')} Categories</h3>
        <dl class="stat-grid">
          <div class="stat"><dt>${catIcon('categories')} Total categories</dt><dd>${model.defiCategories}</dd></div>
          <div class="stat"><dt>${catIcon('overview')} Cache latency</dt><dd>${model.tookMs ?? '—'} ms</dd></div>
          <div class="stat"><dt>${catIcon(topCat ? topCat[0] : 'other')} Top category</dt><dd>${topCat ? escapeHtml(catLabel(topCat[0])) : '—'}</dd></div>
          <div class="stat"><dt>${catIcon(topCat ? topCat[0] : 'portfolio')} Top cat. USD</dt><dd>${topCat ? fmtUsd(topCat[1].usd) : '—'}</dd></div>
        </dl>
      </div>`;
    const values = [];
    for (const p of model.platforms) {
      for (const sec of p.sections) for (const r of sec.rows) values.push(rowUsdAbs(r));
    }
    renderBands(values, 'DeFi positions by USD value band');
  }
}

function renderChips(model) {
  if (activeView !== 'defi') {
    els.protocolChips.hidden = true;
    els.protocolChips.innerHTML = '';
    return;
  }
  els.protocolChips.hidden = false;
  const chips = [
    { id: 'all', label: 'All protocols', valueUsd: model.defiUsd, logoUrl: null },
    ...model.platforms.map((p) => ({
      id: p.id,
      label: p.label,
      valueUsd: p.valueUsd,
      logoUrl: p.logoUrl,
    })),
  ];
  els.protocolChips.innerHTML = chips
    .map((c) => {
      const active = c.id === activeProtocol ? ' active' : '';
      return `<button type="button" class="chip${active}" data-chip="${escapeHtml(c.id)}">
        ${logoHtml(c.logoUrl, c.label, 'plat-logo')}
        <span class="chip-copy"><span>${escapeHtml(c.label)}</span><strong>${fmtUsd(c.valueUsd)}</strong></span>
      </button>`;
    })
    .join('');
}

function fmtPctChip(n, prefix) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const abs = Math.abs(v);
  const label = `${prefix} ${v > 0 ? '+' : v < 0 ? '−' : ''}${abs.toFixed(2)}%`;
  let cls = 'chg-chip chg-chip--flat';
  if (v > 0.05) cls = 'chg-chip chg-chip--up';
  else if (v < -0.05) cls = 'chg-chip chg-chip--down';
  return `<span class="${cls}">${escapeHtml(label)}</span>`;
}

function changeCellHtml(t) {
  const d1 = fmtPctChip(t.priceChange1dPct, '1D:');
  const d7 = fmtPctChip(t.priceChange7dPct, '7D:');
  if (!d1 && !d7) return '—';
  return `<div class="chg-stack">${d1 || '<span class="chg-chip chg-chip--miss">1D: —</span>'}${d7 || '<span class="chg-chip chg-chip--miss">7D: —</span>'}</div>`;
}

const MCAP_BAR_COLORS = {
  1: '#ef4444',
  2: '#fb923c',
  3: '#facc15',
  4: '#86efac',
  5: '#22c55e',
};

function magnitudeBars(usd, label) {
  const n = Number(usd);
  if (!Number.isFinite(n) || n < 0) return '—';
  let bars = 1;
  if (n >= 1_000_000) bars = 5;
  else if (n >= 500_000) bars = 4;
  else if (n >= 100_000) bars = 3;
  else if (n >= 10_000) bars = 2;
  const color = MCAP_BAR_COLORS[bars];
  const barHtml = Array.from({ length: 5 }, (_, i) => {
    const on = i < bars;
    return `<span class="mag-bar${on ? ' mag-bar--on' : ''}"${on ? ` style="background:${color}"` : ''}></span>`;
  }).join('');
  const text = fmtUsd(n);
  return `<span class="mag-cell" title="${escapeHtml(label)}"><span class="mag-bars">${barHtml}</span><span class="mag-text">${escapeHtml(text)}</span></span>`;
}

const STABLE_MINTS = new Set([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  '2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH',
]);
const STABLE_SYMS = new Set(['USDC', 'USDT', 'PYUSD', 'USD1', 'USDG', 'USDE', 'USDH', 'UXD']);
const NATIVE_SOL = '11111111111111111111111111111111';
const WSOL = 'So11111111111111111111111111111111111111112';

const RANK_ICONS = {
  profitable:
    '<path d="M2.5 11.5 6.5 7.5 9 10 13.5 4.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 4.5H13.5V7.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>',
  breaking_even:
    '<path d="M2.5 8h11" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round"/><path d="M5.5 6.15h5M5.5 9.85h5" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity="0.55"/>',
  losing:
    '<path d="M2.5 4.5 6.5 8.5 9 6 13.5 11.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.5 11.5H13.5V8.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/>',
  dead: '<path d="M8 2.2 14.2 13.8H1.8L8 2.2Z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M8 6.1V9.4" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><circle cx="8" cy="11.4" r="0.75" fill="currentColor"/>',
};

function hasPct(v) {
  return v != null && Number.isFinite(Number(v));
}

function classifyHoldingRank(t) {
  const has1d = hasPct(t.priceChange1dPct);
  const has7d = hasPct(t.priceChange7dPct);
  if (!has1d && !has7d) return 'dead';
  const d1 = has1d ? Number(t.priceChange1dPct) : null;
  const d7 = has7d ? Number(t.priceChange7dPct) : null;
  if ((d1 != null && d1 >= 1) || (d7 != null && d7 > 1)) return 'profitable';
  const lose1 = d1 != null && d1 < -0.5;
  const lose7 = d7 != null && d7 < -0.5;
  if ((d1 != null && d7 != null && lose1 && lose7) || (lose1 && d7 == null) || (lose7 && d1 == null)) return 'losing';
  if (lose1 || lose7) return 'losing';
  return 'breaking_even';
}

function rankBadgeHtml(key) {
  const paths = RANK_ICONS[key] || RANK_ICONS.dead;
  return `<span class="holders-rank-badge holders-rank-badge--${key}" aria-hidden="true"><svg class="holders-rank-badge__svg" viewBox="0 0 16 16">${paths}</svg></span>`;
}

function portfolioPctHtml(pct, hasValue) {
  if (!hasValue) return '—';
  const clamped = Math.min(Math.max(Number(pct) || 0, 0), 100);
  const slice = Math.max((clamped / 100) * 360, clamped > 0 ? 6 : 0);
  const pie = `background:conic-gradient(#22c55e 0deg ${slice}deg,#3f3f46 ${slice}deg 360deg)`;
  const label = clamped >= 1 ? `${Math.round(clamped)}%` : clamped > 0 ? '<1%' : '0%';
  return `<div class="holders-portfolio-pct"><span class="holders-portfolio-pie" style="${pie}" aria-hidden="true"></span><span class="holders-portfolio-pct-value">${label}</span></div>`;
}

function holdingValueBarsHtml(usd) {
  const n = Number(usd);
  if (!Number.isFinite(n) || n <= 0) return '—';
  let bars = 1;
  let color = '#86efac';
  let tier = 'holders-usd-tier--light-green';
  if (n < 0.01) {
    color = '#fb923c';
    tier = 'holders-usd-tier--orange';
  } else if (n < 0.1) {
    color = '#facc15';
    tier = 'holders-usd-tier--yellow';
  } else if (n < 1) {
    color = '#86efac';
    tier = 'holders-usd-tier--light-green';
  } else if (n < 10) {
    bars = 2;
    color = '#22c55e';
    tier = 'holders-usd-tier--green';
  } else if (n < 100) {
    bars = 3;
    color = '#22c55e';
    tier = 'holders-usd-tier--green';
  } else if (n < 1000) {
    bars = 4;
    color = '#22c55e';
    tier = 'holders-usd-tier--green';
  } else {
    bars = 5;
    color = '#22c55e';
    tier = 'holders-usd-tier--green';
  }
  const barHtml = Array.from({ length: 5 }, (_, i) => {
    const on = i < bars;
    return `<span class="trade-volume-bar${on ? ' trade-volume-bar--active' : ''}"${on ? ` style="background:${color}"` : ''}></span>`;
  }).join('');
  return `<span class="trades-cell-with-volume"><span class="trades-cell-with-volume__bars"><span class="trade-volume-bars">${barHtml}</span></span><span class="trades-cell-with-volume__main"><span class="holders-usd-tier ${tier}">${escapeHtml(fmtHoldingValueUsd(n))}</span></span></span>`;
}

function isStableHolding(mint, symbol) {
  const m = String(mint || '').trim();
  if (m && STABLE_MINTS.has(m)) return true;
  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  return STABLE_SYMS.has(sym);
}

function isSolHolding(mint, symbol) {
  const m = String(mint || '').trim();
  if (m === NATIVE_SOL || m === WSOL) return true;
  const sym = String(symbol || '')
    .trim()
    .toUpperCase();
  return sym === 'SOL' || sym === 'WSOL';
}

function amountWithSymbolHtml(t) {
  const raw =
    t.amountUi != null && Number.isFinite(Number(t.amountUi))
      ? fmtHoldingAmt(t.amountUi, t.decimals)
      : null;
  if (!raw) {
    return t.amountExact != null
      ? `<span class="raw-amt" title="raw amount">${escapeHtml(String(t.amountExact))}</span>`
      : '—';
  }
  const sym = String(t.symbol || '').trim();
  if (isStableHolding(t.mintAddress, t.symbol)) {
    return `<span class="holders-amount-cell amount-usdc">${escapeHtml(sym ? `${raw} ${sym}` : raw)}</span>`;
  }
  if (isSolHolding(t.mintAddress, t.symbol)) {
    const label = sym.toUpperCase() === 'WSOL' ? 'SOL' : sym || 'SOL';
    return `<span class="holders-amount-cell amount-sol">${escapeHtml(`${raw} ${label}`)}</span>`;
  }
  if (!sym) return `<span class="holders-amount-cell amount-other-value">${escapeHtml(raw)}</span>`;
  return `<span class="holders-amount-cell"><span class="amount-other-value">${escapeHtml(raw)}</span> <span class="amount-other-symbol">${escapeHtml(sym)}</span></span>`;
}

function mintLink(mint) {
  const a = String(mint || '').trim();
  if (!a) return '—';
  const label = a.slice(0, 5);
  return `<a class="holders-mint-link mono" href="https://solscan.io/token/${encodeURIComponent(a)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(a)}">${escapeHtml(label)}</a>`;
}

function holdingSortUsd(t) {
  if (t.valueUsd != null && Number.isFinite(Number(t.valueUsd))) return Math.abs(num(t.valueUsd));
  if (t.amountUi != null && t.priceUsd != null) {
    const v = num(t.amountUi) * num(t.priceUsd);
    if (Number.isFinite(v)) return Math.abs(v);
  }
  return null;
}

function tokenTable(tokens) {
  if (!tokens.length) return `<p class="empty">No holdings found.</p>`;
  const sorted = [...tokens].sort((a, b) => {
    const aUsd = holdingSortUsd(a);
    const bUsd = holdingSortUsd(b);
    if (aUsd != null && bUsd != null && aUsd !== bUsd) return bUsd - aUsd;
    if (aUsd != null && bUsd == null) return -1;
    if (aUsd == null && bUsd != null) return 1;
    return num(b.amountUi) - num(a.amountUi);
  });
  const totalUsd = sorted.reduce((s, t) => s + (holdingSortUsd(t) || 0), 0);
  const rows = sorted
    .map((t, i) => {
      const rank = classifyHoldingRank(t);
      const verified = t.verified ? `<span class="verified">✓</span>` : '';
      const sym = t.symbol || t.name || shortAddr(t.mintAddress);
      const name =
        t.name && t.symbol && t.name !== t.symbol
          ? t.name
          : t.category || shortAddr(t.mintAddress);
      const usd = holdingSortUsd(t);
      const pct = totalUsd > 0 && usd != null && usd > 0 ? (usd / totalUsd) * 100 : 0;
      const price = t.priceUsd != null ? fmtUsd(t.priceUsd) : '—';
      const mcap = t.marketCap != null ? magnitudeBars(t.marketCap, 'Market cap') : '—';
      const vol = t.usdValueVolume24h != null ? magnitudeBars(t.usdValueVolume24h, 'USD vol 24h') : '—';
      return `<tr class="holders-row holders-row--${rank}">
        <td class="holders-rank-col"><div class="holders-rank-cell">${rankBadgeHtml(rank)}<span class="holders-rank-num holders-rank-num--${rank}">${i + 1}</span></div></td>
        <td class="chg-col">${changeCellHtml(t)}</td>
        <td><div class="asset-cell">${logoHtml(t.logoUrl, t.symbol || t.name, 'token-logo', t.mintAddress)}<div><span class="sym">${escapeHtml(sym)}${verified}</span><span class="name">${escapeHtml(name)}</span></div></div></td>
        <td class="num holders-portfolio-col">${portfolioPctHtml(pct, usd != null && usd > 0)}</td>
        <td class="num holders-value-usd">${holdingValueBarsHtml(usd)}</td>
        <td class="num holders-amount-col">${amountWithSymbolHtml(t)}</td>
        <td class="num price-col">${price}</td>
        <td class="num">${mcap}</td>
        <td class="num">${vol}</td>
        <td class="mint-col">${mintLink(t.mintAddress)}</td>
      </tr>`;
    })
    .join('');
  return `<div class="table-wrap table-wrap--holdings"><table class="asset-table holdings-table" id="spotHoldingsTable">
    <thead><tr>
      <th class="holders-rank-col">#</th>
      <th>Change</th>
      <th>Token</th>
      <th class="num">% portfolio</th>
      <th class="num">Value (USD)</th>
      <th class="num">Amount</th>
      <th class="num">Price</th>
      <th class="num">Market cap</th>
      <th class="num">USD vol (24h)</th>
      <th>Mint</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

function protocolStats(p) {
  let rows = 0;
  let dust = 0;
  const cats = new Map();
  for (const sec of p.sections || []) {
    const cat = normalizeCat(sec.tableType || sec.label || sec.name || 'other');
    const label = catLabel(cat);
    const secRows = sec.rows || [];
    rows += secRows.length;
    for (const r of secRows) {
      const usd = rowUsdAbs(r);
      if (isDustRow(r)) dust += 1;
      const prev = cats.get(label) || { id: cat, label, count: 0, usd: 0 };
      prev.count += 1;
      prev.usd += usd;
      cats.set(label, prev);
    }
  }
  const top = [...cats.values()].sort((a, b) => b.usd - a.usd || b.count - a.count);
  return {
    rows,
    dust,
    categories: cats.size,
    top,
    topLabels: top.slice(0, 3).map((c) => c.label),
  };
}

function labelIconKey(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s/_-]+/g, '');
  if (!s) return 'other';
  if (s.includes('borrow') || s.includes('lend')) return 'lending';
  if (s.includes('amm') || s.includes('liquid') || s.includes('clob')) return 'liquidity';
  if (s.includes('stake')) return 'staked';
  if (s.includes('farm')) return 'farming';
  if (s.includes('vault')) return 'vault';
  if (s.includes('lever')) return 'leverage';
  if (s.includes('reward')) return 'rewards';
  if (s.includes('defi') || s.includes('dapp')) return 'portfolio';
  return 'other';
}

function protocolAccordion(p) {
  const open = openIds.has(p.id) ? ' open' : '';
  const stats = protocolStats(p);

  // Platform labels (DEFI / AMM / …) sit in the category row beside Lending/Liquidity/etc.
  const seen = new Set();
  const categoryPills = [];

  const pushPill = (key, label, count = null) => {
    const id = `${String(label).toLowerCase()}::${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    const countHtml = count != null ? `<em>${count}</em>` : '';
    categoryPills.push(
      `<span class="cat-pill">${catIcon(key)}<span>${escapeHtml(label)}</span>${countHtml}</span>`,
    );
  };

  for (const lab of p.labels || []) {
    for (const part of String(lab)
      .split(/[·|,]/)
      .map((x) => x.trim())
      .filter(Boolean)) {
      pushPill(labelIconKey(part), part);
    }
  }
  for (const c of stats.top.slice(0, 5)) {
    pushPill(c.id, c.label, c.count);
  }

  const hideDust = Boolean(els.hideDust?.checked);
  const body = `<div class="defi-platform-sections">${p.sections
    .map((sec) => renderDefiSectionBlock(sec, { hideDust }))
    .filter(Boolean)
    .join('')}</div>`;

  return `<article class="accordion${open}" data-id="${escapeHtml(p.id)}">
    <button type="button" class="acc-head" data-toggle="${escapeHtml(p.id)}">
      ${logoHtml(p.logoUrl, p.label, 'plat-logo')}
      <div class="acc-meta">
        <span class="acc-title">${escapeHtml(p.label)}</span>
        <div class="acc-stats">
          <span>${p.sections.length} sections</span>
          <span>${stats.rows} rows</span>
          <span>${stats.dust} dust</span>
          <span>${stats.categories} categories</span>
        </div>
        <div class="acc-top-cats" title="Categories">${categoryPills.join('') || '<span class="muted">No categories</span>'}</div>
      </div>
      <span class="acc-usd">${fmtUsd(p.valueUsd)}</span>
      <span class="chev">▾</span>
    </button>
    <div class="acc-body">${body}</div>
  </article>`;
}

function renderDefiListSummary(list) {
  let rows = 0;
  let dust = 0;
  const cats = new Map();
  let usd = 0;
  for (const p of list) {
    const s = protocolStats(p);
    rows += s.rows;
    dust += s.dust;
    usd += num(p.valueUsd);
    for (const c of s.top) {
      const prev = cats.get(c.label) || { id: c.id, label: c.label, count: 0, usd: 0 };
      prev.count += c.count;
      prev.usd += c.usd;
      cats.set(c.label, prev);
    }
  }
  const top = [...cats.values()].sort((a, b) => b.usd - a.usd || b.count - a.count).slice(0, 4);
  const topHtml = top
    .map(
      (c) =>
        `<span class="list-chip">${catIcon(c.id)}<strong>${escapeHtml(c.label)}</strong><em>${fmtUsd(c.usd)}</em></span>`,
    )
    .join('');

  return `<div class="list-summary">
    <div class="list-summary-grid">
      <div class="list-stat"><span>Protocols</span><strong>${list.length}</strong></div>
      <div class="list-stat"><span>Total rows</span><strong>${rows.toLocaleString()}</strong></div>
      <div class="list-stat"><span>Total dust</span><strong>${dust.toLocaleString()}</strong></div>
      <div class="list-stat"><span>Total categories</span><strong>${cats.size}</strong></div>
      <div class="list-stat"><span>Total USD</span><strong>${fmtUsd(usd)}</strong></div>
    </div>
    <div class="list-top">
      <span class="list-top-label">${catIcon('categories')} Top categories</span>
      <div class="list-top-row">${topHtml || '<span class="muted">—</span>'}</div>
    </div>
  </div>`;
}

function renderContent(model) {
  els.content.hidden = false;
  if (activeView === 'holdings') {
    els.content.innerHTML = `<article class="accordion open">
      <div class="acc-head" style="cursor:default">
        ${logoHtml(null, 'W', 'plat-logo')}
        <div><span class="acc-title">${catIcon('wallet')} Spot Holdings</span><span class="acc-sub">${model.tokens.length} tokens</span></div>
        <span class="acc-usd">${model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : `${model.tokens.length} tokens`}</span>
        <span></span>
      </div>
      <div class="acc-body" style="display:block">
        <div class="subhead"><span class="subhead-left">${catIcon('wallet')} Wallet</span><strong>${model.hasHoldingsUsd ? fmtUsd(model.spotUsd) : 'no USD'}</strong></div>
        ${tokenTable(model.tokens)}
      </div>
    </article>`;
    return;
  }

  const list =
    activeProtocol === 'all'
      ? model.platforms
      : model.platforms.filter((p) => p.id === activeProtocol);

  if (!list.length) {
    els.content.innerHTML = `<p class="empty">No DeFi positions match filters.</p>`;
    return;
  }
  els.content.innerHTML = `${renderDefiListSummary(list)}${list.map(protocolAccordion).join('')}`;
}

function renderAll() {
  if (!lastPayload) return;
  const model = buildModel(lastPayload);
  els.viewSwitch.hidden = false;
  els.toolbar.hidden = false;
  els.status.textContent = `${model.tookMs ?? '—'} ms · ${model.tokensAllCount} holdings · defi ${fmtUsd(model.defiUsd)} · meta ${model.mintMetaCount ?? '—'}`;
  renderHero(model);
  renderStats(model);
  renderChips(model);
  renderContent(model);
}

function setView(view) {
  activeView = view;
  activeProtocol = 'all';
  els.viewSwitch.querySelectorAll('.view-btn').forEach((btn) => {
    const on = btn.getAttribute('data-view') === view;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (view === 'defi' && openIds.size === 0 && lastPayload) {
    const model = buildModel(lastPayload);
    if (model.platforms[0]) openIds.add(model.platforms[0].id);
  }
  renderAll();
}

async function loadPortfolio(wallet) {
  const owner = wallet.trim();
  if (!owner) {
    setError('Enter a Solana wallet address.');
    return;
  }
  setError('');
  els.loadBtn.disabled = true;
    els.status.textContent = 'Loading portfolio…';
  els.hero.hidden = true;
  els.stats.hidden = true;
  els.bands.hidden = true;
  els.protocolChips.hidden = true;
  els.content.hidden = true;
  openIds.clear();

  try {
    const res = await fetch(
      `/api/wallets/${encodeURIComponent(owner)}/portfolio?limit=500&enrich=1`,
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    lastPayload = data;
    history.replaceState(null, '', `?wallet=${encodeURIComponent(owner)}`);
    renderSamples();
    // Default to DeFi if it has value, else holdings
    const model = buildModel(data);
    activeView = model.defiUsd >= model.spotUsd ? 'defi' : 'holdings';
    if (model.platforms[0]) openIds.add(model.platforms[0].id);
    setView(activeView);
  } catch (err) {
    lastPayload = null;
    setError(err instanceof Error ? err.message : String(err));
    els.status.textContent = 'Load failed.';
  } finally {
    els.loadBtn.disabled = false;
  }
}

function renderSamples() {
  els.samples.innerHTML = SAMPLE_WALLETS.map((w, i) => {
    const active = els.wallet.value.trim() === w ? ' active' : '';
    return `<button type="button" data-wallet="${w}" class="${active.trim()}">${i + 1}. ${shortAddr(w)}</button>`;
  }).join('');
}

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  loadPortfolio(els.wallet.value);
});
els.refreshBtn.addEventListener('click', () => loadPortfolio(els.wallet.value));
els.samples.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-wallet]');
  if (!btn) return;
  els.wallet.value = btn.getAttribute('data-wallet') || '';
  loadPortfolio(els.wallet.value);
});
els.viewSwitch.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;
  setView(btn.getAttribute('data-view') || 'holdings');
});
els.hideDust.addEventListener('change', renderAll);
els.protocolChips.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-chip]');
  if (!btn) return;
  activeProtocol = btn.getAttribute('data-chip') || 'all';
  renderAll();
});
els.content.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-toggle]');
  if (!btn) return;
  const id = btn.getAttribute('data-toggle') || '';
  if (openIds.has(id)) openIds.delete(id);
  else openIds.add(id);
  renderAll();
});
window.addEventListener('resize', () => {
  if (lastPayload) renderAll();
});

renderSamples();
const params = new URLSearchParams(location.search);
const initial = params.get('wallet') || els.wallet.value;
if (initial) {
  els.wallet.value = initial;
  loadPortfolio(initial);
}

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

function setLoading(active) {
  if (defiSummaryLoading) defiSummaryLoading.hidden = !active;
  if (defiLoading) defiLoading.hidden = !active;
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
  return `<td class="${cls}">${formatUsd(usd, { debt })}</td>`;
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
  return `<td class="num">${formatUsd(row.price)}</td>`;
}

function buildTableSchema(tableType) {
  switch (tableType) {
    case 'liquidity':
      return {
        tableType,
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
      return {
        tableType,
        columns: ['#', 'Asset', 'Debt', 'Price', 'Value', 'Rate', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${amountCell(row, { debt: true })}
              ${priceCell(row)}
              ${valueCell(row, { debt: true })}
              ${apyCell(row)}
              <td>${renderMintLink(asArray(row.address)[0] || row.address)}</td>
            </tr>
          `;
        },
      };
    case 'supplied':
      return {
        tableType,
        columns: ['#', 'Asset', 'Amount', 'Price', 'Value', 'APY', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${amountCell(row)}
              ${priceCell(row)}
              ${valueCell(row)}
              ${apyCell(row)}
              <td>${renderMintLink(asArray(row.address)[0] || row.address)}</td>
            </tr>
          `;
        },
      };
    case 'nativeStaking':
      return {
        tableType,
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
      return {
        tableType: 'default',
        columns: ['#', 'Asset', 'Amount', 'Price', 'Value', 'Account'],
        renderRow(row, index) {
          return `
            <tr>
              <td>${index + 1}</td>
              <td>${renderAssetCell(row)}</td>
              ${amountCell(row)}
              ${priceCell(row)}
              ${valueCell(row)}
              <td>${renderMintLinks(row.address)}</td>
            </tr>
          `;
        },
      };
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

  return `
    <div class="table-wrap table-wrap--scroll">
      <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)}">
        <thead>
          <tr>${schema.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('')}</tr>
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
            <span class="defi-platform-total-value">${formatUsd(platform.totalValueUsd)}</span>
          </div>
        </div>
      </header>
      <div class="defi-platform-sections">${sectionsHtml || '<p class="defi-empty-section">No sections returned for this platform.</p>'}</div>
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
    return;
  }

  const { visible, hidden } = countVisibleHidden(platforms);
  renderSummary(payload, visible, hidden);

  const dustNote = hidden > 0 ? ` · ${hidden} under ${DUST_USD_LABEL} hidden` : '';
  const enrichNote = balanceMetaByMint.size > 0 ? ' · labels/logos enriched from wallet balances where missing' : '';
  defiMeta.textContent = `${platforms.length} protocol${platforms.length === 1 ? '' : 's'} · ${visible} position${visible === 1 ? '' : 's'} shown${dustNote}${enrichNote} · sorted by value · schema per position type (LP, lend, borrow, stake, perps).`;
  defiPlatforms.innerHTML = platforms.map(renderPlatform).join('');
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

window.VybeDefiPositions = {
  load: loadDefiPositions,
  resetPlaceholder: resetDefiPlaceholder,
  setBalanceMeta,
};
})();

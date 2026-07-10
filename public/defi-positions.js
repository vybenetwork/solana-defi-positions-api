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
const DUST_USD_THRESHOLD = 1;
const STAKE_STATUS_LABELS = { 4: 'Active', 6: 'Inactive' };

let lastPayload = null;
const expandedDustSections = new Set();

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

function assetLabel(symbol, name, address) {
  const sym = String(symbol ?? '').trim();
  if (sym) return sym;
  const nm = String(name ?? '').trim();
  if (nm) return nm;
  const addr = String(address ?? '').trim();
  if (addr) return shortAddress(addr);
  return 'Unknown';
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
  const logos = asArray(row.logourl);
  const logo = logos[0] || TOKEN_PLACEHOLDER;
  const symbol = assetLabel(row.symbol, row.name, row.address);
  const name = row.name && row.name !== row.symbol ? row.name : '';
  return `
    <div class="defi-token-cell">
      <img class="defi-token-logo" src="${escapeHtml(logo)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" />
      <div class="defi-token-text">
        <span class="defi-token-symbol">${escapeHtml(symbol)}</span>
        ${name ? `<span class="defi-token-name">${escapeHtml(name)}</span>` : ''}
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
  const labels = [];
  for (let i = 0; i < legs; i++) {
    labels.push(assetLabel(symbols[i], names[i], addresses[i]));
  }
  const uniqueLabels = [...new Set(labels.filter((l) => l && l !== 'Unknown'))];
  const title = uniqueLabels.length > 0 ? uniqueLabels.join(' / ') : 'LP position';
  const logoHtml = logos
    .slice(0, 3)
    .map((logo, i) => {
      const src = logo || TOKEN_PLACEHOLDER;
      return `<img class="defi-token-logo defi-token-logo--stacked" style="--stack-index:${i}" src="${escapeHtml(src)}" alt="" loading="lazy" decoding="async" onerror="this.src='${TOKEN_PLACEHOLDER}'" />`;
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
    const label = assetLabel(symbols[i], names[i], addresses[i]);
    return `<span class="defi-amount-line"><span class="defi-amount-line__value">${formatAmount(amount)}</span> ${escapeHtml(label)}</span>`;
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

function sectionKey(platform, section, index) {
  return `${platform.platformId || platform.platform || 'p'}-${section.label || section.tableType || index}`;
}

function sumSectionUsd(rows) {
  return rows.reduce((sum, row) => sum + absUsd(row), 0);
}

function sortRows(rows) {
  return [...rows].sort((a, b) => absUsd(b) - absUsd(a));
}

function partitionRows(rows, sectionId) {
  const sorted = sortRows(rows);
  if (!hideDustEnabled()) {
    return { visible: sorted, hidden: [], expanded: true };
  }
  const visible = [];
  const hidden = [];
  for (const row of sorted) {
    if (isDustRow(row)) hidden.push(row);
    else visible.push(row);
  }
  const expanded = expandedDustSections.has(sectionId);
  return { visible, hidden, expanded };
}

function renderSectionTable(section, platform, sectionIndex) {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  if (rows.length === 0) {
    return '<p class="defi-empty-section">No rows in this section.</p>';
  }

  const tableType = resolveTableType(section, rows[0]);
  const schema = buildTableSchema(tableType);
  const secId = sectionKey(platform, section, sectionIndex);
  const { visible, hidden, expanded } = partitionRows(rows, secId);
  const rowsToRender = expanded ? sortRows(rows) : visible;

  if (rowsToRender.length === 0 && hidden.length > 0) {
    return `
      <div class="defi-dust-only">
        <p class="defi-empty-section">${hidden.length} position${hidden.length === 1 ? '' : 's'} under $${DUST_USD_THRESHOLD} hidden.</p>
        <button type="button" class="defi-dust-toggle" data-defi-dust-section="${escapeHtml(secId)}">Show ${hidden.length} dust position${hidden.length === 1 ? '' : 's'}</button>
      </div>
    `;
  }

  const body = rowsToRender.map((row, index) => schema.renderRow(row, index)).join('');
  const dustToggle =
    hidden.length > 0 && !expanded
      ? `<button type="button" class="defi-dust-toggle" data-defi-dust-section="${escapeHtml(secId)}">Show ${hidden.length} more under $${DUST_USD_THRESHOLD}</button>`
      : hidden.length > 0 && expanded
        ? `<button type="button" class="defi-dust-toggle defi-dust-toggle--active" data-defi-dust-section="${escapeHtml(secId)}">Hide ${hidden.length} dust position${hidden.length === 1 ? '' : 's'}</button>`
        : '';

  return `
    <div class="table-wrap table-wrap--scroll">
      <table class="defi-positions-table defi-positions-table--${escapeHtml(schema.tableType)}">
        <thead>
          <tr>${schema.columns.map((col) => `<th>${escapeHtml(col)}</th>`).join('')}</tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    ${dustToggle}
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
  const logo = platform.platformLogourl || TOKEN_PLACEHOLDER;
  const website = String(platform.platformWebsite || '').trim();
  const title = platform.platform || platform.platformId || `Platform ${index + 1}`;
  const labels = Array.isArray(platform.platformLabels) ? platform.platformLabels.filter(Boolean) : [];

  const sectionsHtml = sections
    .map((section, sectionIndex) => {
      const heading = section.label || section.name || section.tableType || section.type || 'Positions';
      const sectionUsd = sumSectionUsd(Array.isArray(section.rows) ? section.rows : []);
      const rowCount = Array.isArray(section.rows) ? section.rows.length : 0;
      return `
        <div class="defi-section-block">
          <h3 class="defi-section-title">
            ${escapeHtml(heading)}
            <span class="defi-section-meta">${rowCount} row${rowCount === 1 ? '' : 's'} · ${formatUsd(sectionUsd)}</span>
          </h3>
          ${renderSectionTable(section, platform, sectionIndex)}
        </div>
      `;
    })
    .join('');

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
        <div class="defi-platform-total">
          <span class="defi-platform-total-label">Platform value</span>
          <span class="defi-platform-total-value">${formatUsd(platform.totalValueUsd)}</span>
        </div>
      </header>
      <div class="defi-platform-sections">${sectionsHtml || '<p class="defi-empty-section">No sections returned for this platform.</p>'}</div>
    </article>
  `;
}

function countVisibleHidden(platforms) {
  let visible = 0;
  let hidden = 0;
  for (const platform of platforms) {
    for (const section of platform.sections || []) {
      for (const row of section.rows || []) {
        if (hideDustEnabled() && isDustRow(row)) hidden++;
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

  const dustNote = hidden > 0 ? ` · ${hidden} under $${DUST_USD_THRESHOLD} hidden` : '';
  defiMeta.textContent = `${platforms.length} protocol${platforms.length === 1 ? '' : 's'} · ${visible} position${visible === 1 ? '' : 's'} shown${dustNote} · sorted by value · schema per position type (LP, lend, borrow, stake, perps).`;
  defiPlatforms.innerHTML = platforms.map(renderPlatform).join('');
}

function bindDefiUiEvents() {
  defiHideDustInput?.addEventListener('change', () => {
    expandedDustSections.clear();
    if (lastPayload) renderPlatforms(lastPayload);
  });

  defiPlatforms?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-defi-dust-section]');
    if (!btn) return;
    const id = btn.getAttribute('data-defi-dust-section');
    if (!id) return;
    if (expandedDustSections.has(id)) expandedDustSections.delete(id);
    else expandedDustSections.add(id);
    if (lastPayload) renderPlatforms(lastPayload);
  });
}

function resetDefiPlaceholder() {
  lastPayload = null;
  expandedDustSections.clear();
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
};
})();

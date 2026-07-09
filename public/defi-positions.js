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

const SOLSCAN_TOKEN = 'https://solscan.io/token/';
const TOKEN_PLACEHOLDER = '/token-placeholder.png';
const DEFI_META_PLACEHOLDER = 'Load a wallet to see DeFi positions from the Vybe API.';

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function formatUsd(value) {
  const n = toNum(value);
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (Math.abs(n) >= 1) return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (Math.abs(n) >= 0.01) return `$${n.toFixed(4)}`;
  if (n === 0) return '$0.00';
  return `$${n.toFixed(6)}`;
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

function renderSummary(payload) {
  const platforms = Array.isArray(payload.platforms) ? payload.platforms : [];
  const positionCount = platforms.reduce((sum, platform) => {
    const sections = Array.isArray(platform.sections) ? platform.sections : [];
    return sum + sections.reduce((inner, section) => inner + (Array.isArray(section.rows) ? section.rows.length : 0), 0);
  }, 0);
  const sectionCount = platforms.reduce((sum, platform) => sum + (Array.isArray(platform.sections) ? platform.sections.length : 0), 0);

  if (defiSummaryLabel) defiSummaryLabel.textContent = payload.ownerAddress || '—';
  if (defiLastUpdatedValue) defiLastUpdatedValue.textContent = new Date().toLocaleString();
  if (defiSummaryStats) {
    defiSummaryStats.innerHTML = [
      renderSummaryStat('Platforms', platforms.length),
      renderSummaryStat('Sections', sectionCount),
      renderSummaryStat('Positions', positionCount),
      renderSummaryStat('Total DeFi value (USD)', formatUsd(payload.totalDefiValueUsd), 'defi-summary-item--total'),
    ].join('');
  }
}

function renderTokenCell(row) {
  const logo = row.logourl || TOKEN_PLACEHOLDER;
  const symbol = row.symbol || row.name || 'Token';
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

function renderMintLink(address) {
  if (!address) return '—';
  const href = `${SOLSCAN_TOKEN}${encodeURIComponent(address)}`;
  return `<a class="holders-mint-link mono" href="${href}" target="_blank" rel="noopener noreferrer">${escapeHtml(shortAddress(address))}</a>`;
}

function renderSectionTable(section) {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  if (rows.length === 0) {
    return '<p class="defi-empty-section">No rows in this section.</p>';
  }

  const body = rows
    .map((row, index) => {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${renderTokenCell(row)}</td>
          <td>${escapeHtml(section.label || section.tableType || section.type || '—')}</td>
          <td class="num">${formatAmount(row.amount)}</td>
          <td class="num">${formatUsd(row.price)}</td>
          <td class="num">${formatUsd(row.usdValue)}</td>
          <td class="num">${row.apy == null ? '—' : formatPct(row.apy)}</td>
          <td>${renderMintLink(row.address)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="table-wrap table-wrap--scroll">
      <table class="defi-positions-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Asset</th>
            <th>Section</th>
            <th>Amount</th>
            <th>Price (USD)</th>
            <th>Value (USD)</th>
            <th>APY</th>
            <th>Mint</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderPlatform(platform, index) {
  const sections = Array.isArray(platform.sections) ? platform.sections : [];
  const logo = platform.platformLogourl || TOKEN_PLACEHOLDER;
  const website = String(platform.platformWebsite || '').trim();
  const title = platform.platform || platform.platformId || `Platform ${index + 1}`;
  const labels = Array.isArray(platform.platformLabels) ? platform.platformLabels.filter(Boolean) : [];

  const sectionsHtml = sections
    .map((section) => {
      const heading = section.label || section.name || section.tableType || section.type || 'Positions';
      return `
        <div class="defi-section-block">
          <h3 class="defi-section-title">${escapeHtml(heading)}</h3>
          ${renderSectionTable(section)}
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

function renderPlatforms(payload) {
  const platforms = Array.isArray(payload.platforms) ? payload.platforms : [];
  if (!defiMeta || !defiPlatforms) return;

  if (platforms.length === 0) {
    defiMeta.textContent = 'No DeFi positions were returned for this wallet.';
    defiPlatforms.innerHTML = '<p class="defi-empty-state">Try another wallet with LP, lending, staking, or rewards positions.</p>';
    return;
  }

  defiMeta.textContent = `${platforms.length} protocol${platforms.length === 1 ? '' : 's'} · Vybe DeFi Positions API · LP, lending, staking, and rewards across supported protocols (beta).`;
  defiPlatforms.innerHTML = platforms.map(renderPlatform).join('');
}

function resetDefiPlaceholder() {
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
    renderSummary(payload);
    renderPlatforms(payload);
  } catch (err) {
    resetDefiPlaceholder();
    showDefiError(err instanceof Error ? err.message : String(err));
  } finally {
    setLoading(false);
  }
}

window.VybeDefiPositions = {
  load: loadDefiPositions,
  resetPlaceholder: resetDefiPlaceholder,
};
})();

/**
 * Solana wallet balances API server.
 */

import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  loadEnv,
  getDataApiKey,
  getSolanaRpcProviderLabel,
  PUBLIC_DIR,
  VYBE_DATA_API_BASE,
} from './config.js';
import { createDataHttpClient, toHumanReadableError } from './api/client.js';
import {
  listWalletTokenBalances,
  streamWalletTokenBalances,
  TOP_LOGO_REPAIR_N,
  TOP_LOGO_REPAIR_N_MAX,
  WALLET_TOKEN_BALANCE_LIMIT,
} from './api/wallet-balance.js';
import { resolveTokenMeta } from './api/resolve-token-meta.js';
import { repairTokenIcon } from './api/repair-token-icon.js';
import { getWalletDefiPositions, sumDefiPositionsUsd } from './api/wallet-defi-positions.js';
import { cachedMetaToApiResponse } from './api/token-meta-api.js';
import {
  DEFI_SYMBOL_ENRICH_LIMIT,
  enrichDefiSymbolsSequential,
} from './api/enrich-defi-symbols.js';
import { hydrateDefiPlatformsFromDiskCache } from './api/hydrate-defi-symbols.js';
import { warmupHttpProxyPool } from './api/http-proxy-fetch.js';
import { getRuntimeIconDir } from './token-icon-cache.js';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataApiKey = getDataApiKey();
const dataHttp = createDataHttpClient(dataApiKey);
const port = Number(process.env.PORT ?? 3001);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

app.use(
  express.static(PUBLIC_DIR, {
    setHeaders(res) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    },
  }),
);

function q(req: Request, key: string): string {
  const v = req.query[key];
  if (Array.isArray(v)) return String(v[0] ?? '');
  return String(v ?? '');
}

function qNum(req: Request, key: string): number | null {
  const raw = q(req, key).trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function qBool(req: Request, key: string, defaultValue = false): boolean {
  const raw = q(req, key).trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    vybeDataApiBase: VYBE_DATA_API_BASE,
    solanaRpc: getSolanaRpcProviderLabel(),
  });
});

/** GET /api/wallets/:ownerAddress/token-balances */
app.get('/api/wallets/:ownerAddress/token-balances', async (req: Request, res: Response) => {
  try {
    const rawOwner = req.params.ownerAddress;
    const ownerAddress = (Array.isArray(rawOwner) ? rawOwner[0] : rawOwner ?? '').trim();
    if (!ownerAddress) return res.status(400).json({ error: 'Wallet address required' });

    const limitRaw = qNum(req, 'limit');
    const limit =
      limitRaw != null && limitRaw > 0
        ? Math.min(limitRaw, WALLET_TOKEN_BALANCE_LIMIT)
        : WALLET_TOKEN_BALANCE_LIMIT;
    const useStream = qBool(req, 'stream');
    const enrich = qBool(req, 'enrich', true);
    const enrichLimitRaw = qNum(req, 'enrichLimit');
    const enrichLimit =
      enrichLimitRaw != null && enrichLimitRaw >= 0
        ? Math.min(enrichLimitRaw, TOP_LOGO_REPAIR_N_MAX)
        : enrich
          ? TOP_LOGO_REPAIR_N
          : 0;

    if (useStream) {
      const enrichStream = qBool(req, 'enrich', true);
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.flushHeaders();
      let closed = false;
      req.on('close', () => {
        closed = true;
      });
      await streamWalletTokenBalances(
        dataHttp,
        ownerAddress,
        limit,
        (event) => {
          if (closed) return;
          res.write(`${JSON.stringify(event)}\n`);
        },
        () => closed,
        { enrich: enrichStream, enrichLimit },
      );
      if (!closed) res.end();
      return;
    }

    const tokens = await listWalletTokenBalances(dataHttp, ownerAddress, limit, {
      enrich,
      enrichLimit,
    });
    res.json({ tokens });
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

/** GET /api/token/:mint/logo — Jupiter (non-pump) or pump.fun metadata; caches locally. */
app.get('/api/token/:mint/logo', async (req: Request, res: Response) => {
  try {
    const rawMint = req.params.mint;
    const mint = (Array.isArray(rawMint) ? rawMint[0] : rawMint ?? '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });

    const force = qBool(req, 'force', false);
    const logoUrl = await repairTokenIcon(mint, { force });
    if (!logoUrl) return res.status(404).json({ error: `No logo found for mint ${mint}` });
    res.json({ logoUrl });
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

/** GET /api/token/:mint — resolve metadata and USD price (Jupiter → pump.fun → Vybe; ?preferVybe=1 → Vybe → Jupiter). */
app.get('/api/token/:mint', async (req: Request, res: Response) => {
  try {
    const rawMint = req.params.mint;
    const mint = (Array.isArray(rawMint) ? rawMint[0] : rawMint ?? '').trim();
    if (!mint) return res.status(400).json({ error: 'Mint address required' });

    const skipVybe = qBool(req, 'skipVybe');
    const preferVybe = qBool(req, 'preferVybe');
    const resolved = await resolveTokenMeta(dataHttp, mint, { skipVybe, preferVybe });
    if (!resolved) {
      return res.status(404).json({ error: `No metadata found for mint ${mint}` });
    }
    res.json(cachedMetaToApiResponse(resolved.meta, resolved.source));
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

/**
 * POST /api/tokens/enrich-symbols
 * Body: { mints: string[] } (max 20).
 * Resolves Vybe token-details → Jupiter (rotating proxy) one-by-one on the server.
 * ?stream=1 (default) emits NDJSON {event:"token",token} then {event:"done"}.
 */
app.post('/api/tokens/enrich-symbols', async (req: Request, res: Response) => {
  try {
    const mints = Array.isArray(req.body?.mints) ? req.body.mints : [];
    if (mints.length === 0) {
      return res.status(400).json({ error: 'mints array required (max 20)' });
    }
    const useStream = qBool(req, 'stream', true);

    if (useStream) {
      res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      await enrichDefiSymbolsSequential(dataHttp, mints, (token) => {
        if (!res.writableEnded) {
          res.write(`${JSON.stringify({ event: 'token', token })}\n`);
        }
      });
      if (!res.writableEnded) {
        res.write(`${JSON.stringify({ event: 'done', limit: DEFI_SYMBOL_ENRICH_LIMIT })}\n`);
        res.end();
      }
      return;
    }

    const tokens = await enrichDefiSymbolsSequential(dataHttp, mints);
    res.json({ tokens, limit: DEFI_SYMBOL_ENRICH_LIMIT });
  } catch (err) {
    if (!res.headersSent) {
      const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
      res.status(status).json({ error: toHumanReadableError(err) });
    } else {
      res.end();
    }
  }
});

/** GET /api/wallets/:ownerAddress/defi-positions — LP, lending, staking across DeFi protocols */
app.get('/api/wallets/:ownerAddress/defi-positions', async (req: Request, res: Response) => {
  try {
    const rawOwner = req.params.ownerAddress;
    const ownerAddress = (Array.isArray(rawOwner) ? rawOwner[0] : rawOwner ?? '').trim();
    if (!ownerAddress) return res.status(400).json({ error: 'Wallet address required' });

    const payload = await getWalletDefiPositions(dataHttp, ownerAddress);
    const platformsRaw = Array.isArray(payload.data) ? payload.data : [];
    const { platforms, hydrated, stillMissing } = hydrateDefiPlatformsFromDiskCache(platformsRaw);
    const totalDefiValueUsd =
      payload.totalDefiValueUsd != null && String(payload.totalDefiValueUsd).trim() !== ''
        ? Number(payload.totalDefiValueUsd)
        : sumDefiPositionsUsd(platforms as Parameters<typeof sumDefiPositionsUsd>[0]);

    res.json({
      ownerAddress,
      platforms,
      totalDefiValueUsd: Number.isFinite(totalDefiValueUsd) ? totalDefiValueUsd : 0,
      platformCount: platforms.length,
      symbolCacheHydrated: hydrated,
      // stillMissing is already capped to 20 uncached mints (cache hits excluded)
      symbolEnrichPending: stillMissing,
    });
  } catch (err) {
    const status = (err as { response?: { status?: number } })?.response?.status ?? 500;
    res.status(status).json({ error: toHumanReadableError(err) });
  }
});

app.use('/cached/token-icons', express.static(getRuntimeIconDir(), { maxAge: '7d' }));

async function main(): Promise<void> {
  await warmupHttpProxyPool();
  app.listen(port, () => {
    console.log(
      `[defi-positions-api] listening on http://localhost:${port} (Vybe data: ${VYBE_DATA_API_BASE}, RPC: ${getSolanaRpcProviderLabel()})`,
    );
  });
}

main().catch((err) => {
  console.error('[defi-positions-api] startup failed:', err);
  process.exit(1);
});

/**
 * Local timing + enrich stats for wallet token-balances (no HTTP server / proxy warmup).
 *
 * Usage:
 *   npx tsx tools/benchmark-wallet-enrich.ts [wallet] [limit]
 */

import { loadEnv, getDataApiKey } from '../src/config.js';
import { createDataHttpClient } from '../src/api/client.js';
import { listWalletTokenBalances } from '../src/api/wallet-balance.js';

loadEnv();

const wallet = (process.argv[2] ?? '7Tar8QZTrRPwoGY5Ke9Vfwf6CmpBfekrNofERxgReza').trim();
const limitRaw = Number(process.argv[3] ?? 1000);
const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 1000;

const http = createDataHttpClient(getDataApiKey());

console.log(`[benchmark-wallet-enrich] wallet=${wallet} limit=${limit}`);

console.log('\n--- enrich=0 (merge only) ---');
const mergeStart = Date.now();
const merged = await listWalletTokenBalances(http, wallet, limit, { enrich: false });
console.log(
  `[benchmark-wallet-enrich] enrich=0 returned ${merged.length} token(s) in ${Date.now() - mergeStart}ms`,
);

console.log('\n--- enrich=1 (merge + enrich) ---');
const enrichStart = Date.now();
const enriched = await listWalletTokenBalances(http, wallet, limit, { enrich: true });
console.log(
  `[benchmark-wallet-enrich] enrich=1 returned ${enriched.length} token(s) in ${Date.now() - enrichStart}ms`,
);

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveRpcFetch } from '../src/live/rpc.ts';

test('live RPC: rate limited reads retry with a bound and same body', async () => {
  let calls = 0; const waits: number[] = [];
  const fn = liveRpcFetch(async (_url, init) => { assert.match(String(init?.body), /getBalance/); return new Response('{}', { status: ++calls < 3 ? 429 : 200 }); }, async ms => { waits.push(ms); });
  assert.equal((await fn('https://example.test', { body: '{"method":"getBalance"}' })).status, 200);
  assert.equal(calls, 3); assert.deepEqual(waits, [2000, 4000]);
});
test('live RPC: never transport-retry sends or airdrops; persistent read failure returns after bound', async () => {
  for (const method of ['sendTransaction', 'requestAirdrop', 'getBalance']) {
    let calls = 0;
    const fn = liveRpcFetch(async () => { ++calls; return new Response('{}', { status: 429 }); }, async () => {});
    await fn('https://example.test', { body: JSON.stringify({ method }) });
    assert.equal(calls, method === 'getBalance' ? 4 : 1);
  }
});

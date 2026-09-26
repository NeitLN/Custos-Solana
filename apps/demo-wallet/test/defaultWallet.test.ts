import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { LiveSession } from '../src/live/session.ts';
import { DEFAULT_DEMO_WALLET } from '../../../scripts/demo-wallet-config.ts';

test('default wallet stays the configured faucet recipient across sessions', () => {
  const first = new LiveSession(), second = new LiveSession();
  assert.equal(first.view.wallet, DEFAULT_DEMO_WALLET);
  assert.equal(second.view.wallet, first.view.wallet);
  assert.equal(first.view.canSign, false);
});
test('another key cannot silently replace the configured demo wallet', () => {
  const session = new LiveSession();
  assert.throws(() => session.unlock(Keypair.generate()), /khớp/);
  assert.equal(session.view.wallet, DEFAULT_DEMO_WALLET);
  assert.equal(session.view.canSign, false);
});
test('setup without the matching key fails before any RPC or signing', async () => {
  const session = new LiveSession();
  await assert.rejects(() => session.setup(), /keypair/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { buildLiveHandoff, acceptLiveMessage } from '../src/live/handoff.ts';
const key = () => Keypair.generate().publicKey.toBase58();
test('handoff pins source window, exact origin and nonce before accepting a transaction', () => {
  const source = {};
  const expected = { source, origin: 'https://custos.test', nonce: 'session-123' };
  const data = { type: 'custos-live-submit', nonce: expected.nonce, tx: 'AQ==' };
  assert.equal(acceptLiveMessage({ source, origin: expected.origin, data }, expected), 'AQ==');
  for (const ev of [{ source: {}, origin: expected.origin, data }, { source, origin: 'https://evil.test', data }, { source, origin: expected.origin, data: { ...data, nonce: 'wrong' } }]) assert.equal(acceptLiveMessage(ev, expected), null);
});
test('handoff builds unsigned real message from current public session, without secrets', () => {
  const payload = { nonce: 'session-123', wallet: key(), source: key(), target: key(), actor: key(), mint: key(), amount: '250000000', blockhash: key(), lastValidBlockHeight: 123 };
  const tx = VersionedTransaction.deserialize(Buffer.from(buildLiveHandoff(payload), 'base64'));
  assert.equal(tx.message.staticAccountKeys[0]!.toBase58(), payload.wallet);
  assert.equal(tx.message.compiledInstructions.length, 2);
  assert.ok(tx.signatures.every(s => s.every(b => b === 0)));
  assert.throws(() => buildLiveHandoff({ ...payload, amount: '-1' }));
});

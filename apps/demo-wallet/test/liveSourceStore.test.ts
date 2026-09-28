import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Keypair } from '@solana/web3.js';
import { giaiDongBangFacts } from '../../../packages/core/src/facts-io.ts';
import { parsePublicSession, PublicSessionCache, mayDiscardSession, isEmptySession } from '../src/live/store.ts';
const facts = giaiDongBangFacts(readFileSync('data/seed/facts/MN-01.json', 'utf8'));
// Hai bài nhãn nguồn diễn giải cũ chuyển sang `nguonDienGiai.test.ts` (CK-09), nay tách chặn / quá hạn / hỏng.
test('public cache rejects wrong wallet, malformed addresses and forged observations', () => {
  const wallet = Keypair.generate().publicKey.toBase58();
  const base = { version: 2, cluster: 'devnet', wallet, accounts: null, setupPending: null, unresolved: false, receipts: [] };
  assert.equal(parsePublicSession(base, wallet).accounts, null);
  assert.throws(() => parsePublicSession({ ...base, wallet: 'bad' }, wallet));
  assert.throws(() => parsePublicSession({ ...base, accounts: { source: '<script>' } }, wallet));
  const r = { signature: '1'.repeat(88), cluster: 'devnet', kind: 'transfer', prediction: { source: wallet, mint: wallet, decimals: 6, before: '0', after: '100', ownerAfter: null, message: '123' }, observation: { err: null }, comparison: { balance: 'match' }, secretKey: 'leak' };
  const parsed = parsePublicSession({ ...base, receipts: [r] }, wallet);
  assert.equal(parsed.receipts[0]!.observation, null);
  assert.equal(parsed.receipts[0]!.prediction.after, null);
  assert.ok(!JSON.stringify(parsed).includes('secretKey'));
});

test('two tabs: stale controller cannot overwrite or proceed after another tab persists an unresolved signature', () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (k: string) => entries.get(k) ?? null, setItem: (k: string, v: string) => { entries.set(k, v); } };
  const a = new PublicSessionCache(storage, 'wallet'), b = new PublicSessionCache(storage, 'wallet');
  a.write('{"unresolved":true,"signature":"pending"}');
  assert.throws(() => b.assertCurrent(), /tab khác/);
  assert.throws(() => b.write('{"unresolved":false}'), /tab khác/);
  assert.equal(entries.get('wallet'), '{"unresolved":true,"signature":"pending"}');
  a.assertCurrent();
  a.write('{"unresolved":false,"signature":"confirmed"}');
  const reloaded = new PublicSessionCache(storage, 'wallet');
  reloaded.assertCurrent(); assert.match(reloaded.read()!, /confirmed/);
});

test('discard cannot erase an unresolved transaction or pending setup', () => {
  assert.equal(mayDiscardSession({ unresolved: true, setupPending: null }), false);
  assert.equal(mayDiscardSession({ unresolved: false, setupPending: { setupSignature: 'pending' } }), false);
  assert.equal(mayDiscardSession({ unresolved: false, setupPending: null }), true);
});

test('only a validated empty session can bypass recovery after reload', () => {
  const wallet = Keypair.generate().publicKey.toBase58();
  const empty = { version: 2, cluster: 'devnet', wallet, accounts: null, setupPending: null, unresolved: false, receipts: [] };
  assert.equal(isEmptySession(empty, wallet), true);
  for (const value of [null, {}, { ...empty, wallet: 'bad' }, { ...empty, unresolved: true },
    { ...empty, accounts: {} }, { ...empty, setupPending: {} }, { ...empty, receipts: [{}] }]) {
    assert.equal(isEmptySession(value, wallet), false, 'never silently overwrite a nonempty or invalid cache');
  }
});

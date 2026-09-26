import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Keypair } from '@solana/web3.js';
import { giaiDongBangFacts } from '../../../packages/core/src/facts-io.ts';
import { dienGiaiKhongAI } from '@custos-solana/ai';
import { trackedInterpreter } from '../src/live/interpreter.ts';
import { parsePublicSession, PublicSessionCache, mayDiscardSession } from '../src/live/store.ts';
const facts = giaiDongBangFacts(readFileSync('data/seed/facts/MN-01.json', 'utf8'));
test('AI timeout labels final fallback; late model completion never changes the source', async () => {
  const sources: string[] = [];
  let finish!: (r: Awaited<ReturnType<typeof dienGiaiKhongAI>>) => void;
  const base = await dienGiaiKhongAI(facts, [], 'vi');
  const interpret = trackedInterpreter(() => new Promise(r => { finish = r; }), s => sources.push(s), 5);
  assert.deepEqual(await interpret(facts, [], 'vi'), base);
  assert.deepEqual(sources, ['moHinhLoi']);
  finish({ ...base, explanation: 'late' }); await new Promise(r => setImmediate(r));
  assert.deepEqual(sources, ['moHinhLoi']);
});
test('AI invalid output returning deterministic text is never labelled model prose', async () => {
  const sources: string[] = [];
  await trackedInterpreter(dienGiaiKhongAI, s => sources.push(s))(facts, [], 'vi');
  assert.deepEqual(sources, ['moHinhLoi']);
});
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

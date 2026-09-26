import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Keypair } from '@solana/web3.js';
import { decodeInstruction, TokenInstruction } from '@solana/spl-token';
import { parseDemoAmount, buildScenario } from '../src/live/scenarios.ts';

test('amount: exact six decimal units, no exponents, signs, rounding or zero', () => {
  assert.equal(parseDemoAmount('12,345678'), 12345678n);
  assert.equal(parseDemoAmount('500'), 500000000n);
  for (const s of ['0', '-1', 'NaN', '1e3', '1.0000001', '1,234.56', '18446744073710']) assert.throws(() => parseDemoAmount(s));
});
const key = () => Keypair.generate().publicKey;
const args = { source: key(), target: key(), owner: key(), actor: key(), amount: 10000000n, balance: 500000000n };
test('registry builds actual instructions, owner-only never transfers; approve and revoke are separate', () => {
  const kinds = (kind: Parameters<typeof buildScenario>[0]) => buildScenario(kind, args).map(ix => decodeInstruction(ix).data.instruction);
  assert.deepEqual(kinds('owner'), [TokenInstruction.SetAuthority]);
  assert.deepEqual(kinds('approve'), [TokenInstruction.Approve]);
  assert.deepEqual(kinds('revoke'), [TokenInstruction.Revoke]);
  assert.deepEqual(kinds('attack'), [TokenInstruction.Transfer, TokenInstruction.SetAuthority]);
  assert.deepEqual(kinds('delegate-transfer'), [TokenInstruction.Transfer]);
});

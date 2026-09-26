import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { dungDuBao, dungQuanSat } from "../src/live/quanSat.ts";

/*
 * Hai hàm rút khỏi `LiveSession` ngày 26/09 (review mục 3.7). Trong class, chúng chỉ kiểm
 * được qua cả chuỗi setup → ký → gửi; nay kiểm thẳng.
 */
const NGUON = Keypair.generate().publicKey, MINT = Keypair.generate().publicKey, DICH = Keypair.generate().publicKey;
const CHU = Keypair.generate().publicKey.toBase58();
const ta = (address: string, before: bigint, after: bigint) => ({
  address, mint: MINT.toBase58(), ownerBefore: CHU, ownerAfter: CHU, amountBefore: before, amountAfter: after,
  delegateBefore: null, delegateAfter: null, delegatedAmountAfter: 0n,
  closeAuthorityBefore: null, closeAuthorityAfter: null, programOwnerBefore: "Tok", programOwnerAfter: "Tok",
});
const facts = (ok: boolean) => ({ simulationOk: ok, tokenAccounts: [ta(NGUON.toBase58(), 500n, 400n), ta(DICH.toBase58(), 0n, 100n)] }) as never;
const coSo = { result: null, source: NGUON.toBase58(), mint: MINT.toBase58(), target: DICH.toBase58(), message: new Uint8Array([1, 2, 3]) };

test("dự báo lấy số dư trước/sau của nguồn và đích từ Facts", () => {
  const p = dungDuBao({ ...coSo, facts: facts(true) });
  assert.deepEqual([p.before, p.after, p.targetBefore, p.targetAfter], ["500", "400", "0", "100"]);
  assert.equal(p.authorityMeasured, true);
});

test("mô phỏng HỎNG ⇒ không dùng Facts, dự báo để trống — không đoán", () => {
  const p = dungDuBao({ ...coSo, facts: facts(false) });
  assert.equal(p.before, null);
  assert.equal(p.after, null);
  assert.equal(p.authorityMeasured, false, "không đo được quyền thì không được nói là đã đo");
});

function giaoDich() {
  const payer = Keypair.generate().publicKey;
  const tx = new VersionedTransaction(new TransactionMessage({
    payerKey: payer, recentBlockhash: PublicKey.default.toBase58(),
    instructions: [SystemProgram.transfer({ fromPubkey: payer, toPubkey: NGUON, lamports: 1 })],
  }).compileToV0Message());
  return { slot: 100, transaction: tx, meta: { err: null, fee: 5000, loadedAddresses: { writable: [], readonly: [] }, preTokenBalances: [], postTokenBalances: [], preBalances: [1], postBalances: [0] } } as never;
}
const receipt = { signature: "CHU_KY_CUA_TA", prediction: { source: NGUON.toBase58(), mint: MINT.toBase58() } } as never;

test("quan sát: đọc được quyền và chữ ký mới nhất là của ta ⇒ quy được", async () => {
  const conn = {
    getParsedAccountInfo: async () => ({ context: { slot: 900 }, value: { owner: TOKEN_PROGRAM_ID, data: { parsed: { info: { mint: MINT.toBase58(), owner: CHU, delegatedAmount: { amount: "0" } } } } } }),
    getSignaturesForAddress: async () => [{ signature: "CHU_KY_CUA_TA" }],
  } as never;
  const o = await dungQuanSat(conn, receipt, giaoDich());
  assert.equal(o.owner, CHU);
  assert.equal(o.ownerSlot, 900);
  assert.equal(o.rightsAttributable, true);
});

test("quan sát: đọc tài khoản HỎNG ⇒ quyền để trống và KHÔNG quy — không đoán", async () => {
  const conn = {
    getParsedAccountInfo: async () => { throw new Error("429"); },
    getSignaturesForAddress: async () => [{ signature: "CHU_KY_CUA_TA" }],
  } as never;
  const o = await dungQuanSat(conn, receipt, giaoDich());
  assert.equal(o.owner, null);
  assert.equal(o.ownerSlot, null);
  assert.equal(o.rightsAttributable, false);
});

test("quan sát: không có metadata ⇒ ném, không dựng quan sát rỗng", async () => {
  await assert.rejects(dungQuanSat({} as never, receipt, { ...(giaoDich() as object), meta: null } as never), /metadata/);
});

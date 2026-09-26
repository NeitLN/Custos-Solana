import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { neoKetQua } from "@custos-solana/core";
import { ConsentGate } from "../src/live/policy.ts";
import { compareReceipt } from "../src/live/receipt.ts";

const signer = Keypair.generate().publicKey.toBase58();
const tx = () => new VersionedTransaction(new TransactionMessage({ payerKey: new PublicKey(signer), recentBlockhash: Keypair.generate().publicKey.toBase58(), instructions: [] }).compileToV0Message());

test("live: unprotected consent can sign without an inspect anchor; one use only", () => {
  const gate = new ConsentGate(); const t = tx();
  const id = gate.prepare(t.message.serialize(), signer, false, null);
  gate.consume(id, t.message.serialize(), signer);
  assert.throws(() => gate.consume(id, t.message.serialize(), signer));
});
test("live: cancel invalidates consent; mode change is a new request", () => {
  const gate = new ConsentGate(); const t = tx(); const bytes = t.message.serialize();
  const id = gate.prepare(bytes, signer, false, null); gate.cancel();
  assert.throws(() => gate.consume(id, bytes, signer));
});
test("live: protected requires inspect anchor and rejects changed bytes or signer", () => {
  const gate = new ConsentGate(); const t = tx(); const bytes = t.message.serialize();
  assert.throws(() => gate.prepare(bytes, signer, true, null));
  const id = gate.prepare(bytes, signer, true, neoKetQua(bytes, signer, 'devnet'));
  assert.throws(() => gate.consume(id, tx().message.serialize(), signer));
  const id2 = gate.prepare(bytes, signer, true, neoKetQua(bytes, signer, 'devnet'));
  assert.throws(() => gate.consume(id2, bytes, SystemProgram.programId.toBase58()));
});
test("live: protected rejects stale anchor; off mode still rejects message substitution", () => {
  const gate = new ConsentGate(); const bytes = tx().message.serialize();
  const old = { ...neoKetQua(bytes, signer, 'devnet'), kiemLuc: '2000-01-01T00:00:00.000Z' };
  assert.throws(() => gate.prepare(bytes, signer, true, old));
  const id = gate.prepare(bytes, signer, false, null);
  assert.throws(() => gate.consume(id, tx().message.serialize(), signer));
});

const source = Keypair.generate().publicKey.toBase58();
const mint = Keypair.generate().publicKey.toBase58();
const owner = Keypair.generate().publicKey.toBase58();
const expected = { source, mint, decimals: 6, before: '500000000', after: '250000000', ownerAfter: owner, message: 'same' };
const observed = { message: 'same', slot: 12, err: null, fee: 5000, keys: [source], pre: [{ accountIndex: 0, mint, uiTokenAmount: { amount: '500000000', decimals: 6 } }], post: [{ accountIndex: 0, mint, uiTokenAmount: { amount: '250000000', decimals: 6 } }], owner, ownerSlot: 13,
  // Quyền đọc ở slot 13 > 12 chỉ quy được cho giao dịch vì không có chữ ký nào mới hơn
  // chạm tài khoản nguồn (F-06). Fixture nói rõ điều đó thay vì ngầm giả định.
  rightsAttributable: true };
test("live receipt: compare actual metadata against prediction, owner observed separately", () => {
  const r = compareReceipt(expected, observed);
  assert.equal(r.balance, 'match'); assert.equal(r.authority, 'match');
  assert.equal(r.actualBefore, '500000000'); assert.equal(r.actualAfter, '250000000');
});
test("live receipt: mismatch must stay visible and never be replaced by prediction", () => {
  const r = compareReceipt(expected, { ...observed, post: [{ ...observed.post[0]!, uiTokenAmount: { amount: '400000000', decimals: 6 } }] });
  assert.equal(r.balance, 'mismatch'); assert.equal(r.actualAfter, '400000000');
});
test("live receipt: missing metadata, wrong mint/account/decimals or message never matches", () => {
  for (const o of [ { ...observed, post: [] }, { ...observed, keys: [mint] }, { ...observed, post: [{ ...observed.post[0]!, mint: source }] }, { ...observed, post: [{ ...observed.post[0]!, uiTokenAmount: { amount: '250000000', decimals: 9 } }] }, { ...observed, message: 'changed' } ]) {
    assert.notEqual(compareReceipt(expected, o).balance, 'match');
  }
});
test("live receipt: failed transaction and missing prediction cannot be reported as match", () => {
  assert.equal(compareReceipt(expected, { ...observed, err: { InstructionError: [1, 'error'] } }).balance, 'unknown');
  assert.equal(compareReceipt({ ...expected, after: null }, observed).balance, 'unknown');
  assert.equal(compareReceipt(expected, { ...observed, owner: null }).authority, 'unknown');
});

// Phản biện 26/09, F-06: quyền đọc lại ở slot MUỘN hơn giao dịch là trạng thái hiện tại.
// Một giao dịch xen giữa (delegate ra tay, đổi chủ lần nữa) có thể đã đổi nó, nên chỉ
// được đem ra đối chiếu với dự báo khi CHỨNG MINH được không có chữ ký nào mới hơn chạm
// tài khoản nguồn. Không chứng minh được ⇒ "chưa quy được", không phải "có chênh lệch".
test("rights read at a later slot are NOT compared unless attributable to this transaction", async () => {
  const { nhanDoiChieuQuyen } = await import("../src/live/receipt.ts");
  const sau = { ...observed, owner: 'subsequent-owner', ownerSlot: 900, rightsAttributable: false };
  const r = compareReceipt(expected, sau);
  assert.equal(r.authority, 'unknown', 'quyền đọc sau một giao dịch khác không được tính là dự báo sai');
  assert.equal(r.balance, 'match', 'số dư lấy từ metadata của chính giao dịch — vẫn đối chiếu được');
  assert.match(nhanDoiChieuQuyen(r.authority, sau), /Chưa quy được/);
});
test("rights read later but attributable (no newer signature) ARE compared — a real mismatch stays visible", async () => {
  const { nhanDoiChieuQuyen } = await import("../src/live/receipt.ts");
  const sau = { ...observed, owner: 'other-owner', ownerSlot: 900, rightsAttributable: true };
  const r = compareReceipt(expected, sau);
  assert.equal(r.authority, 'mismatch');
  assert.equal(nhanDoiChieuQuyen(r.authority, sau), 'Có chênh lệch');
});
test("rights read in the SAME slot compare directly; unknown stays unknown", async () => {
  const { nhanDoiChieuQuyen } = await import("../src/live/receipt.ts");
  const cung = { ...observed, ownerSlot: 12, rightsAttributable: false };
  assert.equal(compareReceipt(expected, cung).authority, 'match');
  assert.equal(nhanDoiChieuQuyen('unknown', { slot: 12, ownerSlot: null }), 'Chưa đủ dữ liệu');
});
test("attribution: only when the newest signature on the source account is ours", async () => {
  const { quyChoGiaoDich } = await import("../src/live/session.ts");
  const conn = (ds: unknown) => ({ getSignaturesForAddress: async () => { if (ds instanceof Error) throw ds; return ds; } }) as never;
  assert.equal(await quyChoGiaoDich(conn([{ signature: "cua-ta" }]), source, "cua-ta"), true);
  assert.equal(await quyChoGiaoDich(conn([{ signature: "giao-dich-sau" }]), source, "cua-ta"), false, "có giao dịch mới hơn");
  assert.equal(await quyChoGiaoDich(conn([]), source, "cua-ta"), false);
  assert.equal(await quyChoGiaoDich(conn(new Error("429")), source, "cua-ta"), false, "lỗi RPC không được thành 'quy được'");
  assert.equal(await quyChoGiaoDich(conn([{ signature: "" }]), source, ""), false, "chữ ký rỗng không khớp gì");
});

// Chuyển từ `neo.test.ts` (26/09): phòng phân tích không còn đường ký, nên guard "không ký
// khi kết quả kiểm quá cũ" phải canh ĐƯỜNG KÝ THẬT — `ConsentGate.consume()` lúc bấm ký.
// Bài chạy thật với đồng hồ giả, không đọc mã.
test("live: consume REJECTS an anchor that went stale between prepare and signing", async () => {
  const { mock } = await import("node:test");
  mock.timers.enable({ apis: ["Date"], now: Date.parse("2026-09-26T00:00:00Z") });
  try {
    const gate = new ConsentGate(); const bytes = tx().message.serialize();
    const id = gate.prepare(bytes, signer, true, neoKetQua(bytes, signer, "devnet"));
    mock.timers.tick(60 * 60 * 1000); // một giờ sau mới bấm ký
    assert.throws(() => gate.consume(id, bytes, signer), /cũ/);
  } finally {
    mock.timers.reset();
  }
});
test("live: consent is ONE-USE — a second consume of the same id is refused", () => {
  // Thay guard "khoá gửi bằng ref" của phòng phân tích: chặn gửi lặp nay nằm ở đây.
  const gate = new ConsentGate(); const bytes = tx().message.serialize();
  const id = gate.prepare(bytes, signer, true, neoKetQua(bytes, signer, "devnet"));
  gate.consume(id, bytes, signer);
  assert.throws(() => gate.consume(id, bytes, signer));
});

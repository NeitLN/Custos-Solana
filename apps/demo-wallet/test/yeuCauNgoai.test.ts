import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { docYeuCauNgoaiChiTiet } from "../src/yeuCauNgoai.ts";

/**
 * HỒI QUY CHO F06 — yêu cầu hỏng bị bỏ qua im lặng.
 *
 * Bản trước trả `null` cho CẢ HAI: "dApp không gửi gì" và "dApp gửi thứ không đọc
 * được". Mở `#tx=invalid-base64` thì ví về màn hình nghỉ như chưa có chuyện gì.
 *
 * Với một lớp bảo vệ, im lặng trước đầu vào hỏng là câu trả lời sai: người dùng
 * không phân biệt được "chưa có gì để kiểm" với "có thứ để kiểm nhưng tôi không đọc
 * nổi". Cái thứ hai đáng để họ dừng lại.
 */

// `docYeuCauNgoaiChiTiet` đọc `window.location.hash`. Node không có `window`, nên
// dựng một cái tối thiểu — đúng phần hàm này chạm tới, không hơn.
const datHash = (h: string) => {
  (globalThis as { window?: unknown }).window = { location: { hash: h } };
};

beforeEach(() => datHash(""));

function txHopLe(): string {
  const vi = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: vi.publicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [
        SystemProgram.transfer({ fromPubkey: vi.publicKey, toPubkey: PublicKey.default, lamports: 1 }),
      ],
    }).compileToV0Message(),
  );
  return Buffer.from(tx.serialize()).toString("base64");
}

test("không có hash ⇒ `khong`, không phải `hong`", () => {
  assert.equal(docYeuCauNgoaiChiTiet().loai, "khong");
  datHash("khong-co-tx=1");
  assert.equal(docYeuCauNgoaiChiTiet().loai, "khong");
});

test("giao dịch hợp lệ ⇒ `co`", () => {
  // Đối chứng dương: không có ca này thì "hỏng hết" cũng làm bài kiểm xanh.
  datHash(`tx=${encodeURIComponent(txHopLe())}`);
  const r = docYeuCauNgoaiChiTiet();
  assert.equal(r.loai, "co");
});

test("base64 hỏng ⇒ `hong`, và nêu lý do — đây là ca đã tái hiện", () => {
  datHash("tx=invalid-base64");
  const r = docYeuCauNgoaiChiTiet();
  assert.equal(r.loai, "hong", "yêu cầu hỏng không được lẫn với không có yêu cầu");
  assert.ok((r as { lyDo: string }).lyDo.length > 0, "phải có lý do để hiển thị");
});

test("base64 đúng nhưng không phải giao dịch ⇒ `hong`", () => {
  datHash(`tx=${Buffer.from("day khong phai giao dich").toString("base64")}`);
  assert.equal(docYeuCauNgoaiChiTiet().loai, "hong");
});

test("đầu vào quá dài bị chặn TRƯỚC khi giải mã", () => {
  // Một hash vài megabyte không phải giao dịch hợp lệ; nó là thứ làm `atob` và
  // `deserialize` ngốn thời gian trên luồng giao diện.
  datHash(`tx=${"A".repeat(5000)}`);
  const r = docYeuCauNgoaiChiTiet();
  assert.equal(r.loai, "hong");
  assert.match((r as { lyDo: string }).lyDo, /vượt giới hạn/);
});

/*
 * `khai` và `kyhieu` hỏng KHÔNG được làm hỏng cả yêu cầu.
 *
 * Chúng chỉ ảnh hưởng hiển thị, và một dApp độc hại hoàn toàn có thể gửi rác ở đó
 * để làm sập lớp bảo vệ. Giao dịch vẫn phải được kiểm.
 */
test("lời khai hỏng không làm hỏng lượt kiểm tra", () => {
  datHash(`tx=${encodeURIComponent(txHopLe())}&khai=${encodeURIComponent("{khong-phai-json")}`);
  const r = docYeuCauNgoaiChiTiet();
  assert.equal(r.loai, "co", "rác ở `khai` không được chặn lượt kiểm tra");
  assert.equal((r as { yc: { khai: unknown } }).yc.khai, null);
});

test("ký hiệu hỏng không làm hỏng lượt kiểm tra", () => {
  datHash(`tx=${encodeURIComponent(txHopLe())}&kyhieu=${encodeURIComponent("[[[")}`);
  const r = docYeuCauNgoaiChiTiet();
  assert.equal(r.loai, "co");
  assert.equal((r as { yc: { kyHieu: unknown } }).yc.kyHieu, null);
});

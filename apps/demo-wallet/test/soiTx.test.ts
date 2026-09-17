import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Keypair, SystemProgram, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { docTx, kiemVi, GIOI_HAN_BYTE, GIOI_HAN_KY_TU } from "../src/soiTx.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CU-08 — ĐỌC ĐẦU VÀO CỦA INSPECTOR.
 *
 * Nghiệm thu thẻ: *"invalid input không chạm RPC"*. Mỗi lượt mô phỏng gửi TOÀN BỘ
 * nội dung giao dịch tới RPC được chọn — gửi một chuỗi rác đi cũng là gửi, và nếu
 * chuỗi rác đó tình cờ là dữ liệu thật của ai đó thì ta vừa làm lộ nó vì một lỗi
 * đánh máy.
 */

const VI = Keypair.generate();
const LA = Keypair.generate();
const BLOCKHASH = "11111111111111111111111111111111";

function tx(lamports = 1000): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI.publicKey,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({ fromPubkey: VI.publicKey, toPubkey: LA.publicKey, lamports }),
      ],
    }).compileToV0Message(),
  );
}

const b64 = (t: VersionedTransaction) => Buffer.from(t.serialize()).toString("base64");

test("CU-08 · đọc được transaction hợp lệ, và biết nó CHƯA ký", () => {
  const r = docTx(b64(tx()));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.daKy, false, "transaction chưa ký mà báo đã ký");
  assert.ok(r.soByte > 0 && r.soByte <= GIOI_HAN_BYTE);
  assert.deepEqual(r.nguoiKy, [VI.publicKey.toBase58()]);
});

test("CU-08 · nhận ra transaction ĐÃ KÝ — dữ liệu nhạy cảm", () => {
  /*
   * Một transaction đã ký có thể được phát lên chuỗi bởi bất kỳ ai cầm nó. Dán nó
   * vào ô nhập trên một trang web là hành động có hậu quả, kể cả khi trang đó không
   * làm gì xấu — nên UI phải cảnh báo, và muốn cảnh báo thì phải nhận ra.
   *
   * Chữ ký toàn 0 là "chưa ký": web3.js điền mảng 0 cho chỗ còn trống.
   */
  const t = tx();
  t.sign([VI]);
  const r = docTx(b64(t));
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.daKy, true, "transaction đã ký mà không nhận ra");
});

test("CU-08 · chuỗi rỗng, rác, và quá dài đều bị từ chối với câu KHÁC NHAU", () => {
  /*
   * Gộp mọi lỗi thành một câu "đầu vào không hợp lệ" là bắt người dùng đoán. Mỗi
   * lý do dẫn tới một hành động khác nhau: dán lại · kiểm ký tự lạ · dùng tệp nhỏ hơn.
   */
  const rong = docTx("   ");
  assert.equal(rong.ok, false);
  if (!rong.ok) assert.equal(rong.loi, "rong");

  const rac = docTx("đây không phải base64!!!");
  assert.equal(rac.ok, false);
  if (!rac.ok) assert.equal(rac.loi, "khong_phai_base64");

  const dai = docTx("A".repeat(GIOI_HAN_KY_TU + 1));
  assert.equal(dai.ok, false);
  if (!dai.ok) assert.equal(dai.loi, "qua_dai");

  // Ba câu phải khác nhau thật, không chỉ khác mã.
  const cau = new Set([
    rong.ok ? "" : rong.câu,
    rac.ok ? "" : rac.câu,
    dai.ok ? "" : dai.câu,
  ]);
  assert.equal(cau.size, 3, "ba lỗi khác nhau phải cho ba câu khác nhau");
});

test("CU-08 · base64 HỢP LỆ nhưng không phải transaction ⇒ lỗi riêng", () => {
  /*
   * Ca này khác hẳn "không phải base64": người dùng dán đúng định dạng nhưng nhầm
   * nội dung — ví dụ base64 của một ảnh, hoặc của một message chưa đóng gói.
   *
   * Câu trả lời phải nói ra sự khác biệt đó, vì hành động sửa khác nhau.
   */
  const r = docTx(Buffer.from("đây là văn bản thường, không phải tx").toString("base64"));
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.loi, "khong_giai_ma_duoc");
});

test("CU-08 · kiểm độ dài TRƯỚC khi giải mã — không giải mã chuỗi khổng lồ", () => {
  /*
   * Thứ tự kiểm đi từ rẻ tới đắt. Đảo lại thì một chuỗi 10 MB sẽ được giải mã
   * trước khi bị từ chối vì quá dài — tốn bộ nhớ vì một chuỗi sẽ bị vứt đi.
   *
   * Bài đọc mã vì không đo được thời gian một cách ổn định; nhưng thứ tự trong mã
   * là thứ quyết định.
   */
  const s = doc("apps/demo-wallet/src/soiTx.ts").replace(/\/\*[\s\S]*?\*\//g, "");
  const iDai = s.indexOf("GIOI_HAN_KY_TU");
  const iGiai = s.indexOf("giaiBase64(s)");
  assert.ok(iDai > 0 && iGiai > 0, "không tìm thấy hai mốc");
  assert.ok(iDai < iGiai, "phải kiểm độ dài TRƯỚC khi giải mã");
});

test("CU-08 · module đọc đầu vào KHÔNG chạm mạng", () => {
  /*
   * Nghiệm thu thẻ: *"invalid input không chạm RPC"*. Cách chắc chắn nhất để giữ
   * điều đó là module này không có đường nào gọi mạng.
   */
  const s = doc("apps/demo-wallet/src/soiTx.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["Connection", "fetch(", "XMLHttpRequest", "simulateTransaction"]) {
    assert.ok(!s.includes(cam), `soiTx.ts chứa \`${cam}\` — đọc đầu vào không được chạm mạng`);
  }
});

test("CU-08 · ví không hợp lệ và ví không có trong tx là HAI lỗi khác nhau", () => {
  const t = tx();
  const sai = kiemVi("không-phải-base58!!!", t);
  assert.equal(sai.ok, false);
  if (!sai.ok) assert.equal(sai.loi, "vi_khong_hop_le");

  const ngoai = kiemVi(Keypair.generate().publicKey.toBase58(), t);
  assert.equal(ngoai.ok, false);
  if (!ngoai.ok) assert.equal(ngoai.loi, "vi_khong_o_trong_tx");

  // Ví có thật trong tx thì qua.
  assert.equal(kiemVi(VI.publicKey.toBase58(), t).ok, true);
});

test("CU-08 · ví VẮNG MẶT là hợp lệ — không chặn ca cần kiểm nhất", () => {
  /*
   * `InspectOptions.nguoiDung` là tuỳ chọn: vắng mặt thì Custos lui về người trả
   * phí và luật 14 nâng nghi ngờ. Bắt buộc nhập ví sẽ chặn đúng người đang cầm một
   * giao dịch lạ và chưa biết ví nào trong đó là của mình.
   */
  assert.equal(kiemVi("", tx()).ok, true);
  assert.equal(kiemVi("   ", tx()).ok, true);
});

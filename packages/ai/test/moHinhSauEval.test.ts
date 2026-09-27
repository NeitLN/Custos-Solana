import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { giaiDongBangFacts } from "../../core/src/facts-io.ts";
import { danhGia } from "../../core/src/l2/evaluate.ts";
import { dienGiaiBangMoHinh } from "../src/moHinh.ts";

/*
 * REGRESSION TỪ LƯỢT ĐO MÔ HÌNH THẬT 27/09 (tập phát triển, claude-haiku-4-5). Hai câu dưới
 * là NGUYÊN VĂN mô hình trả, và bộ chắn lúc đó cho cả hai qua:
 *
 *   · đếm SAI số lệnh chưa đọc hiểu (0/8 ⇒ "7 lệnh"; 0/5 ⇒ "4 lệnh") — trục khác biệt của
 *     sản phẩm là nói ĐÚNG phần chưa đọc hiểu;
 *   · mô phỏng HỎNG mà vẫn khẳng định số dư "giảm xuống 0" — không có trạng thái sau nào để
 *     nói; fail-safe cấm đoán.
 */
const facts = (id: string) =>
  giaiDongBangFacts(readFileSync(fileURLToPath(new URL(`../../../data/seed/facts/${id}.json`, import.meta.url)), "utf8"));
const moHinhTra = (cau: string) => async () => JSON.stringify({ detectedPrimaryAction: null, explanation: cau, aiAdvisory: null });
async function quaBoChan(id: string, cau: string) {
  const f = facts(id);
  const r = await dienGiaiBangMoHinh(moHinhTra(cau))(f, danhGia(f).reasonCodes, "vi", {});
  return r.explanation === cau;
}

const MN04 =
  "Mô phỏng không thành công, không thể xác định hành động chính. Dữ liệu cho thấy nhiều tài khoản token có số dư giảm xuống 0 (6ehE…pump và So11…1112), nhưng vì 3 chương trình chưa được xác minh và 7 lệnh không thể phân tích, nên không có đủ thông tin để xác định mục đích giao dịch. Phạm vi phân tích chỉ đạt 0/8 hướng dẫn.";
const MN10 =
  "Mô phỏng không thành công nên không thể xác định hành động chính. Dữ liệu cho thấy nhiều tài khoản token sẽ có số dư về 0, bao gồm 469,747451587 và 55.159.743,889993 của các token So11…1112 và 5mH1…pump. Giao dịch chứa 2 chương trình chưa xác minh và 4 lệnh không thể phân tích đầy đủ. Chỉ 0 trên tổng 5 hành động đã được kiểm tra chi tiết.";

test("câu thật của mô hình (MN-04, MN-10) KHÔNG còn lọt tới người dùng", async () => {
  assert.equal(await quaBoChan("MN-04", MN04), false);
  assert.equal(await quaBoChan("MN-10", MN10), false);
});

test("đếm SAI số lệnh chưa đọc hiểu ⇒ bị chặn, kể cả khi phần còn lại của câu đúng", async () => {
  const f = facts("MN-04");
  assert.equal(f.coverage.total - f.coverage.analyzed, 8);
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Có 7 lệnh chưa đọc hiểu được, nên Custos chưa nói chắc giao dịch làm gì."), false);
});

test("mô phỏng HỎNG mà khẳng định số dư sau ⇒ bị chặn", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Số dư token của bạn sẽ về 0 sau giao dịch này."), false);
});

test("đối chứng: câu ĐÚNG về phần chưa đọc hiểu vẫn đi qua", async () => {
  assert.equal(
    await quaBoChan("MN-04", "Mô phỏng không thành công, nên Custos không biết giao dịch sẽ làm gì với số dư của bạn. Có 8 lệnh chưa đọc hiểu được."),
    true,
  );
});

/* ── Codex review lần 2 (27/09) ─────────────────────────────────────────────── */

test("mục 2 · HOÁN ĐỔI số đã đọc / chưa đọc bị chặn (coverage 0/8)", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Có 0 lệnh chưa đọc hiểu được."), false, "'0 lệnh chưa đọc' lọt trong khi 8 lệnh chưa đọc");
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Có 8 lệnh đã đọc hiểu được."), false, "'8 lệnh đã đọc' lọt trong khi 0 lệnh đã đọc");
});

test("mục 2 · đối chứng: đếm ĐÚNG đại lượng thì đi qua, kể cả dạng phân số", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Custos đọc hiểu 0/8 lệnh, nên chưa nói chắc giao dịch làm gì."), true);
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Giao dịch có 8 lệnh và chưa lệnh nào đọc hiểu được."), true);
});

test("mục 3 · mô phỏng HỎNG mà khẳng định 'số dư sau giao dịch bằng 0' bị chặn", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Số dư token sau giao dịch bằng 0."), false);
});

test("mục 8 · mô phỏng HỎNG và câu PHỦ NHẬN khả năng kết luận thì đi qua", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công nên chưa thể kết luận số dư sẽ giảm hay tăng."), true);
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công, nên Custos không biết số dư của bạn sẽ thay đổi ra sao."), true);
});

test("mẫu 'giảm về 0' KHÔNG cần chữ 'số dư' mới bắt được (mẫu cũ chứa ký tự backspace, không bao giờ khớp)", async () => {
  assert.equal(await quaBoChan("MN-04", "Mô phỏng không thành công. Token của bạn sẽ giảm về 0."), false);
});

test("mã nguồn không chứa ký tự điều khiển — `\b` viết qua script từng thành backspace thật", async () => {
  const { readdirSync } = await import("node:fs");
  const thuMuc = fileURLToPath(new URL("../src/", import.meta.url));
  for (const f of readdirSync(thuMuc).filter((x) => x.endsWith(".ts"))) {
    const s = readFileSync(thuMuc + f, "utf8");
    assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s), `${f} chứa ký tự điều khiển`);
  }
});

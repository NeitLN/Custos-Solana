import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/*
 * CONSENT LÀ ĐỂ LẤY SỐ LIỆU, KHÔNG PHẢI ĐỂ CÔNG BỐ NHÂN KHẨU HỌC.
 *
 * Người tham gia được nói là "tham gia nghiên cứu để lấy số liệu". Câu đó cho phép
 * biến câu trả lời thành con số. Nó không cho phép đặt tuổi chính xác và nghề cụ thể
 * của họ lên một repo công khai mà git không quên.
 *
 * Trước khi sửa: 8/20 bản ghi mang đồng thời tuổi chính xác + nghề rất cụ thể + câu
 * nguyên văn. Trong vòng quen biết của chính người phỏng vấn, đủ để nhận ra người.
 *
 * Bài kiểm canh cả HAI surface: JSON được SINH từ markdown, nên sửa mỗi JSON thì
 * lần chạy `doc-bien-ban.mjs` kế tiếp khôi phục tuổi chính xác — bản vá tự tháo.
 */
const TUOI_CHINH_XAC = /(?<![\d\u2013-])\d{2} tuổi\b/;

test("dữ liệu phỏng vấn công khai không mang tuổi chính xác", () => {
  const pham: string[] = [];
  for (const f of ["data/seed/phong-van.json", "docs/BIEN-BAN-PHONG-VAN.md"]) {
    for (const [i, d] of doc(f).split("\n").entries()) {
      // Phần giải thích được nói tới tuổi; chỉ dữ liệu mới bị cấm.
      if (/nhóm|18–19|20–22|23–25|vì sao/i.test(d)) continue;
      if (TUOI_CHINH_XAC.test(d)) pham.push(`${f}:${i + 1} — ${d.trim().slice(0, 80)}`);
    }
  }
  assert.deepEqual(pham, [], "Tuổi chính xác vượt phạm vi consent:\n" + pham.join("\n"));
});

test("biên bản ghi rõ phạm vi consent, không chỉ ghi 'Có'", () => {
  // "Có xin phép" một mình không nói được là xin phép ĐIỀU GÌ.
  const s = doc("docs/BIEN-BAN-PHONG-VAN.md");
  assert.match(s, /Phạm vi consent/, "phải nêu phạm vi, không chỉ nêu có hay không");
  assert.match(s, /tham gia nghiên cứu để lấy số liệu/, "phải ghi đúng điều đã nói với người tham gia");
});

test("tổng quát hoá KHÔNG đụng vào câu trả lời hay mẫu số", () => {
  // Nếu nó đổi được tỉ lệ thì nó không còn là ẩn danh hoá, mà là sửa kết quả.
  const ho = JSON.parse(doc("data/seed/phong-van.json")) as {
    ban: Array<{ nguyenVan: string; cham: string }>;
  };
  assert.equal(ho.ban.length, 20, "mẫu số phải giữ nguyên");
  assert.equal(ho.ban.filter((b) => b.cham === "dung").length, 13, "tỉ lệ hiểu đúng phải giữ nguyên");
  assert.ok(
    ho.ban.every((b) => b.nguyenVan.length > 0),
    "câu trả lời nguyên văn là đường kiểm chứng cho 13/20 — không được xoá",
  );
});

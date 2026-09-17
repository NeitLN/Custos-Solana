import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const GOC = join(import.meta.dirname, "..");

/**
 * Mỗi trang HTML có một component gốc. Bảng này nối trang với component đó.
 * Thêm trang mới mà quên h1 thì bài dưới đỏ.
 */
const TRANG: Array<[string, string]> = [
  ["index.html", "App.tsx"],
  ["soi.html", "Inspector.tsx"],
  ["so-lieu.html", "SoLieu.tsx"],
  ["phong-van.html", "PhongVan.tsx"],
];

test("QA · mỗi trang có đúng một h1, và h1 không rỗng", () => {
  /*
   * BUG THẬT, đo trên Chromium: `phong-van.html` dựng ra 0 thẻ h1.
   *
   *   phong-van   ->  0 h1     (trang bắt đầu thẳng từ h2)
   *   so-lieu     ->  1 h1
   *   index/soi   ->  1 h1
   *
   * Trang mở đầu bằng h2 làm vỡ dàn tiêu đề: người dùng trình đọc màn hình duyệt
   * trang bằng phím tiêu đề, và trang không có h1 thì không có điểm vào — cũng
   * không có câu trả lời cho "tôi đang ở trang nào".
   *
   * Kiểm trên MÃ NGUỒN chứ không phải trên trình duyệt, vì bài này phải đỏ ngay
   * lúc chạy `npm test`, không cần dev server và không cần Playwright.
   */
  const thieu: string[] = [];
  for (const [trang, comp] of TRANG) {
    const p = join(GOC, "src", comp);
    const ma = readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); // bỏ chú thích
    const so = (ma.match(/<h1[\s>]/g) ?? []).length;
    if (so !== 1) thieu.push(`${trang} (${comp}): ${so} thẻ h1`);
  }
  assert.deepEqual(thieu, [], "trang không có đúng một h1:\n  " + thieu.join("\n  "));
});

test("QA · bảng TRANG phủ hết các trang html thật — đối chứng", () => {
  /*
   * ĐỐI CHỨNG. Bài trên cũng xanh nếu ai đó thêm trang mới mà quên khai vào bảng.
   */
  const thuc = readdirSync(GOC).filter((f) => f.endsWith(".html")).sort();
  const khai = TRANG.map(([t]) => t).sort();
  assert.deepEqual(thuc, khai, "có trang .html chưa được khai trong bảng TRANG");
});

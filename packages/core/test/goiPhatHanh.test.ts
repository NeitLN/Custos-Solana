import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/*
 * SOURCE ĐÚNG KHÔNG CÓ NGHĨA THỨ GỬI ĐI ĐÚNG.
 *
 * `@custos-solana/ai@0.1.2` lên npm TRƯỚC khi neo grounding được thêm. Source có
 * `dungNeo`, tarball local có, cả bộ test xanh — nhưng người cài từ registry nhận
 * đúng bản mà mô hình chèn được địa chỉ ví BỊA vào câu đọc trước khi ký.
 *
 * Không đọc code nào phát hiện được: cả hai phía đều đúng, chỉ lệch thời điểm.
 * Nên bài kiểm canh hai thứ máy kiểm được: version không quay lại bản đã hỏng, và
 * script đóng gói còn soi artifact trước khi gửi.
 */
const BAN_THIEU_VA = ["0.1.0", "0.1.1", "0.1.2"];

test("gói ai không quay về version đã phát hành mà thiếu bản vá", () => {
  const v = (JSON.parse(doc("packages/ai/package.json")) as { version: string }).version;
  assert.ok(
    !BAN_THIEU_VA.includes(v),
    `version ${v} đã lên registry và KHÔNG có neo grounding. npm là bất biến — phải phát hành bản mới.`,
  );
});

test("script đóng gói soi artifact trước khi pack hoặc publish", () => {
  const s = doc("scripts/dong-goi-sdk.mjs");
  assert.match(s, /soiDauAnBaoMat/, "thiếu bước soi dấu ấn bản vá trong artifact");
  assert.match(s, /dungNeo/, "phải nêu đúng dấu ấn cần tìm");
  assert.match(s, /DIA_CHI_DAY_DU/, "phải nêu đúng dấu ấn cần tìm");
  // Soi phải chạy TRƯỚC nhánh publish, không phải sau.
  assert.ok(
    s.indexOf("soiDauAnBaoMat(p.name, dan)") < s.indexOf('execFileSync(npm, ["publish"'),
    "bước soi phải đứng trước lệnh publish",
  );
});

test("README gói ai nói rõ bản nào thiếu vá", () => {
  // Người cài đọc README trên npm. Nếu nó không cảnh báo, họ sẽ cài bản cũ.
  const s = doc("packages/ai/README.md");
  assert.match(s, /0\.1\.2/, "phải nêu đích danh bản thiếu vá");
  assert.match(s, /Đã kiểm tarball local/, "phải phân biệt hai mức xác minh");
  assert.match(s, /Đã kiểm registry/, "phải phân biệt hai mức xác minh");
});

test("README không gọi bản chưa phát hành là bản khuyến nghị", () => {
  /*
   * Bản đầu của README này viết "0.1.3 — bản khuyến nghị" trong khi 0.1.3 CHƯA lên
   * registry. Người đọc sẽ chạy `npm install` và nhận 0.1.2, bản thiếu vá, mà tưởng
   * mình đang dùng bản đã sửa. Đúng loại lệch giữa lời và thực tế mà cả repo này
   * canh — lần này tôi tự mắc trong chính tài liệu cảnh báo về nó.
   *
   * Khi 0.1.3 lên registry thật thì sửa README và bài kiểm này cùng lúc.
   */
  const s = doc("packages/ai/README.md");
  assert.match(s, /CHƯA phát hành lên npm/, "phải nói rõ bản vá chưa có trên registry");
  assert.match(
    s,
    /npm install @custos-solana\/ai` vẫn lấy về `0\.1\.2`/,
    "phải nói thẳng người cài hôm nay nhận bản nào",
  );
});

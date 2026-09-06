import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
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
  assert.match(s, /neoHanhDong/, "neo cho hành động chính cũng phải nằm trong artifact");
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

/*
 * README PHẢI KHỚP TRẠNG THÁI REGISTRY ĐÃ ĐO, KHÔNG KHỚP MỘT CÂU GÕ TAY.
 *
 * Bản đầu của bài này đòi README chứa đúng chuỗi "CHƯA phát hành lên npm" và câu
 * "npm install ... vẫn lấy về 0.1.2". Nó đúng vào ngày viết. Khi `0.2.0` thật sự
 * lên registry, cả hai câu thành SAI cùng lúc — và guard vẫn xanh, vì nó canh chữ
 * chứ không canh sự thật.
 *
 * Nay nó đối chiếu với `data/registry/ket-qua.json`, tức kết quả `npm run
 * thu-goi-registry` đã chạy thật trên gói đã phát hành.
 */
test("README nói đúng trạng thái registry đã đo được", () => {
  const D = "data/registry/ket-qua.json";
  if (!existsSync(join(GOC, D))) return; // chưa đo thì không kết luận

  const r = JSON.parse(doc(D)) as { ai: string; chan: number; tong: number; dat: boolean };
  const s = doc("packages/ai/README.md");

  if (r.dat) {
    // Bản trên registry đã qua nghiệm thu: README không được nói nó chưa phát hành.
    assert.doesNotMatch(
      s,
      /CHƯA phát hành lên npm/,
      `registry đang phục vụ ${r.ai} và đã nghiệm thu ${r.chan}/${r.tong} — README còn nói chưa phát hành`,
    );
    assert.doesNotMatch(
      s,
      /vẫn lấy về `0\.1\.2`/,
      "registry đã có bản vá — câu này chỉ đúng trước khi publish",
    );
    assert.ok(s.includes(r.ai), `README phải nêu bản đang phục vụ (${r.ai})`);
  }
});

test("bước dàn gói KHÔNG được làm rơi subpath export", () => {
  /*
   * `dong-goi-sdk.mjs` ghi đè `exports` cho thư mục dàn. Bản trước ghi đúng MỘT lối
   * vào `.`, nên subpath `@custos-solana/ai/anthropic` biến mất khỏi tarball — trong
   * khi README của chính gói đó nói đấy là đường DUY NHẤT để nạp adapter. Người cài
   * từ npm gặp ERR_PACKAGE_PATH_NOT_EXPORTED.
   *
   * Đọc hai file bằng mắt thì không thấy: source đúng, script đúng, chỉ bước dàn ở
   * giữa làm rơi một nửa. `npm run thu-goi` bắt được vì nó đóng vai người ngoài.
   */
  const s = doc("scripts/dong-goi-sdk.mjs");
  assert.doesNotMatch(
    s,
    /p\.exports = \{ "\.":/,
    "không được ghi đè exports bằng một lối vào cứng — phải giữ mọi subpath của gói",
  );
  assert.match(s, /Object\.keys\(p\.exports/, "phải suy lối vào từ chính `exports` của gói");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { boiThoiHan, dienGiaiKhongAI } from "../src/index.ts";
import { giaiDongBangFacts } from "../../core/src/facts-io.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const facts = giaiDongBangFacts(
  readFileSync(join(GOC, "data/seed/facts/MN-01.json"), "utf8"),
);

const demTimer = () => process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;

/**
 * TB-C05 — `boiThoiHan`: dọn tài nguyên, và phân biệt các loại thất bại.
 *
 * `scripts/coHan.ts` đã có 7 bài ở `apps/demo-wallet/test/coHan.test.ts`, gồm cả dọn
 * timer và ngân sách chung. File này canh hàm bọc thời hạn THỨ HAI — nó từng rò rỉ
 * đúng chỗ mà `coHan` đã xử lý từ đầu.
 */

test("dọn timer khi mô hình trả về SỚM — 10 lượt không để lại 10 handle", async () => {
  /*
   * RÒ RỈ ĐÃ ĐO ĐƯỢC, không phải giả định.
   *
   * Bản trước: `Promise.race` thắng ở nhánh mô hình thì nhánh `setTimeout` vẫn sống
   * tới hết `msToiDa` — Promise bị bỏ không huỷ được timer bên trong nó.
   * `probe-timer-c05.ts` đo bằng `process.getActiveResourcesInfo()`: 10 lượt gọi để
   * lại **đúng 10** handle `Timeout`.
   *
   * Hệ quả: rác tích dần trong app chạy suốt buổi demo, và với Node thì timer giữ
   * event loop sống nên tiến trình CLI không thoát được tới khi cái cuối hết hạn.
   */
  const truoc = demTimer();
  for (let i = 0; i < 10; i++) {
    // Hạn 60 giây, việc xong ngay: mọi timer đều là timer cần dọn.
    await boiThoiHan((f, r, l, o) => dienGiaiKhongAI(f, r, l, o), 60_000)(facts, [], "vi", {});
  }
  const sau = demTimer();
  assert.ok(
    sau - truoc < 10,
    `10 lượt để lại ${sau - truoc} timer — bản sửa clearTimeout đã bị tháo?`,
  );
});

test("mô hình quá hạn ⇒ lui về câu tất định, KHÔNG ném", async () => {
  const kq = await boiThoiHan(
    () => new Promise(() => {}), // treo vĩnh viễn
    60,
  )(facts, [], "vi", {});
  const nen = await dienGiaiKhongAI(facts, [], "vi", {});
  assert.equal(kq.explanation, nen.explanation, "quá hạn phải trả đúng câu tất định");
});

test("mô hình NÉM lỗi ⇒ cũng lui về câu tất định", async () => {
  /*
   * Phân biệt loại thất bại là yêu cầu của thẻ, nhưng ở lớp NÀY cả hai loại có cùng
   * một đường lui — và điều đó đúng: người dùng cần một câu đọc được, không cần biết
   * mô hình chết vì hết giờ hay vì 500. Phân loại chi tiết thuộc bộ đo (`eval-ai`),
   * không thuộc đường người dùng.
   */
  const kq = await boiThoiHan(async () => {
    throw new Error("429 hết hạn mức");
  })(facts, [], "vi", {});
  assert.ok(kq.explanation.length > 0);
  assert.equal(kq.aiAdvisory, (await dienGiaiKhongAI(facts, [], "vi", {})).aiAdvisory);
});

test("`level` KHÔNG bao giờ bị đụng tới, kể cả khi mô hình hỏng", () => {
  /*
   * Quyết định thiết kế số 1. `boiThoiHan` trả `Interpreter`, và `Interpreter` không
   * có trường `level` — nên bất biến này được kiểu bảo đảm, không cần kiểm runtime.
   * Bài này canh chính điều đó: nếu ai thêm `level` vào kiểu trả về, nó đỏ.
   */
  const s = readFileSync(join(GOC, "packages/ai/src/index.ts"), "utf8");
  assert.doesNotMatch(
    s,
    /level:\s*["']/,
    "lớp AI không được gán `level` — chỉ L2 sinh giá trị đó",
  );
});

test("hạn mặc định là 4000 ms, và nó đọc được từ chữ ký hàm", () => {
  // Bộ đo `eval-ai.ts` ĐO con số này thay vì chép tay. Nếu ai đổi nó, báo cáo chi
  // phí tự đổi theo — nhưng bài này neo lại giá trị hiện hành để việc đổi là một
  // quyết định thấy được, không phải một lần sửa lướt qua.
  const s = readFileSync(join(GOC, "packages/ai/src/index.ts"), "utf8");
  assert.match(s, /msToiDa = 4000/);
});

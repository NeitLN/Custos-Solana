import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Bài này nói về KIẾN TRÚC CỦA VÍ, không về quy tắc che.
 *
 * Quy tắc che đã chuyển lên `packages/core/src/che-nhay-cam.ts` (CU-11) vì receipt
 * và CLI cũng cần chúng. Nhưng *lọc ở đâu trong ví* vẫn là chuyện của ví, nên bài
 * ở lại đây thay vì đi theo module.
 */
test("App.tsx lọc TẠI CHỖ GHI, không ở chỗ hiển thị", () => {
  /*
   * Lọc ở chỗ ghi thì mọi đường vào nhật ký đều đi qua — không cần nhớ lọc ở từng
   * nơi gọi `ghi()`. Lọc ở chỗ hiển thị thì một `nhatKy` thứ hai, hoặc một lần
   * export, sẽ bỏ qua lớp lọc.
   */
  const app = readFileSync(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.match(app, /setNhatKy\(\(n\) => \[\.\.\.n, locDongNhatKy\(s\)\]\)/);
});

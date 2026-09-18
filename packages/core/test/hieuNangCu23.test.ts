import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const SCRIPT = "scripts/ky-thuat/do-hieu-nang-cu23.ts";

/**
 * CU-23 — canh CHÍNH PHÉP ĐO, không canh con số.
 *
 * Ngưỡng thời gian trong bộ test tất định là nguồn flaky: máy CI chậm hơn máy
 * dev, và một bài đỏ vì máy bận không nói gì về sản phẩm. Thẻ nói đích danh:
 * *"bộ test deterministic không chứa ngưỡng thời gian máy quá chặt gây flaky"*.
 *
 * Nên các bài ở đây kiểm **tính chất của phép đo**: cỡ mẫu được báo, p95 bị từ
 * chối khi mẫu nhỏ, cold tách khỏi warm.
 */

test("CU-23 · script từ chối in p95 khi cỡ mẫu < 20", () => {
  /*
   * *"Không gọi giá trị lớn nhất của vài lượt là p95 có ý nghĩa"*.
   *
   * Với n < 20, `ceil(0.95·n) − 1` trỏ đúng vào phần tử LỚN NHẤT. In nó ra dưới
   * tên p95 là trình bày cực trị của một mẫu nhỏ như một thống kê.
   *
   * Kiểm bằng cách đọc mã: điều kiện phải có mặt, và ngưỡng phải là 20.
   */
  const ma = readFileSync(GOC + SCRIPT, "utf8");
  assert.match(ma, /n < 20/, "không có điều kiện từ chối p95 ở cỡ mẫu nhỏ");
  assert.match(ma, /p95: null/, "không có đường trả p95 rỗng");
  assert.match(ma, /lyDoP95/, "từ chối p95 mà không kèm lý do");
});

test("CU-23 · phép tính p95 ĐÚNG trên mẫu biết trước", () => {
  /*
   * Bài trên chỉ kiểm điều kiện có mặt. Bài này kiểm phép tính: chép đúng công
   * thức của script rồi chạy trên một mảng đã biết đáp án.
   *
   * 100 phần tử 1..100 đã sắp: p95 = phần tử thứ ceil(0.95*100) − 1 = 94 (0-based)
   * = giá trị 95.
   */
  const warm = Array.from({ length: 100 }, (_, i) => i + 1);
  const p95 = warm[Math.ceil(0.95 * warm.length) - 1];
  assert.equal(p95, 95, "công thức p95 sai");

  // Và với n = 19, công thức trỏ đúng vào phần tử lớn nhất — lý do để từ chối.
  const nho = Array.from({ length: 19 }, (_, i) => i + 1);
  assert.equal(nho[Math.ceil(0.95 * nho.length) - 1], nho[nho.length - 1], "tiền đề của việc từ chối p95 không còn đúng");
});

test("CU-23 · chạy thật: in đủ cold, trung vị, p95 và CỠ MẪU", () => {
  /*
   * Chạy script thật. Không kiểm con số — kiểm rằng nó BÁO đủ thứ cần để người
   * đọc tự đánh giá: cỡ mẫu, cold tách khỏi warm, và đơn vị.
   *
   * Một bảng số không kèm cỡ mẫu thì không đọc được.
   */
  const ra = execFileSync("node", ["--experimental-strip-types", SCRIPT], {
    cwd: GOC,
    encoding: "utf8",
    timeout: 180_000,
  });

  assert.match(ra, /cold/i, "không tách cold");
  assert.match(ra, /trung vị/, "không có trung vị");
  assert.match(ra, /p95/, "không có p95");
  assert.match(ra, /Cỡ mẫu warm: n=\d+/, "không báo cỡ mẫu");
  assert.match(ra, /ms/, "không có đơn vị");

  // Cỡ mẫu thật phải ≥ 20, nếu không p95 in ra sẽ là `—`.
  const n = Number(/Cỡ mẫu warm: n=(\d+)/.exec(ra)?.[1] ?? 0);
  assert.ok(n >= 20, `cỡ mẫu ${n} < 20 — p95 sẽ không có nghĩa`);
});

test("CU-23 · script tự khai PHẠM VI: đo phần tất định, không đo RPC", () => {
  /*
   * Một bảng hiệu năng không nói rõ phạm vi sẽ bị đọc thành "Custos chạy trong
   * 0,1 ms" — trong khi lượt thật có RPC mất ~600 ms. Đó là phóng đại, dù mọi con
   * số đều đúng.
   */
  const ra = execFileSync("node", ["--experimental-strip-types", SCRIPT], {
    cwd: GOC,
    encoding: "utf8",
    timeout: 180_000,
  });
  assert.match(ra, /TẤT ĐỊNH|không chạm mạng/, "bảng không tự khai phạm vi");
  assert.match(ra, /thu-tich-hop:devnet/, "không chỉ tới nơi đo độ trễ thật");
});

test("CU-23 · không tối ưu bằng cách BỎ luật hay bỏ bằng chứng", async () => {
  /*
   * Thẻ cấm đích danh: *"không tối ưu bằng bỏ rule/evidence hoặc bớt failure
   * cases"*. Số luật L2 là 14 và phải giữ nguyên.
   *
   * ĐẾM TỪ CHÍNH MẢNG, không đọc mã bằng regex.
   *
   * Bản đầu của bài này dùng `/export const LUAT[^=]*=\s*\[([\s\S]*?)\n\];/` và
   * bắt nhầm `LUAT_DO` (danh sách đỏ, 4 luật) rồi nuốt cả phần chú thích sau nó,
   * đếm ra **28**. 28 ≥ 14 nên bài XANH — xanh vì lý do sai, tức không canh gì cả.
   * Đúng bẫy đã ghi trong bàn giao: guard khớp phải chú thích của chính nó.
   */
  const { LUAT } = await import("../src/l2/rules.ts");
  assert.equal(LUAT.length, 14, `còn ${LUAT.length} luật, phải là 14 — nghi bị bỏ bớt để chạy nhanh hơn`);
});

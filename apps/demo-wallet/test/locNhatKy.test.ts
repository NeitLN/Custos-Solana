import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { locDongNhatKy } from "../src/locNhatKy.ts";

/**
 * TB-S02 — nhật ký kỹ thuật hiển thị trên UI không được mang rác hay credential.
 *
 * Chuỗi trong bài đầu là ĐO ĐƯỢC, không phải bịa: trỏ `Connection` vào một endpoint
 * trả trang lỗi HTML rồi bắt `e.message`.
 */

/** Nguyên văn `e.message` quan sát được từ `@solana/web3.js` khi RPC trả trang HTML. */
const LOI_THAT =
  'failed to get recent blockhash: Error: 502 Bad Gateway: <!DOCTYPE html><html>' +
  '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, ' +
  'initial-scale=1.0"><link rel="icon" href="/.safeline/static/favicon.ico"></head>' +
  "<body><h1>502</h1></body></html>";

test("lỗi RPC mang trang HTML ⇒ thẻ bị xoá, dòng bị cắt", () => {
  const ra = locDongNhatKy(LOI_THAT);
  assert.ok(!ra.includes("<"), `còn thẻ HTML: ${ra.slice(0, 80)}`);
  assert.ok(!ra.includes("DOCTYPE"), "còn DOCTYPE");
  assert.ok(ra.length <= 340, `dòng dài ${ra.length} — chưa cắt`);
  // Phần có ích phải còn lại, nếu không thì lọc thành xoá.
  assert.match(ra, /502|blockhash/);
});

test("URL có credential ⇒ giữ host, bỏ phần sau", () => {
  /*
   * `VITE_RPC` do người chạy demo đặt, và RPC thương mại đặt credential trong query
   * (`?api-key=` của Helius) hoặc trong path (token của QuickNode). Giữ host để còn
   * biết lỗi ở đâu; bỏ phần còn lại vì đó là chỗ secret nằm.
   *
   * Quy tắc RỘNG có chủ ý: một danh sách "tên tham số nào là secret" sẽ luôn thiếu.
   */
  for (const [vao, khongDuocCo] of [
    ["lỗi tại https://mainnet.helius-rpc.com/?api-key=abc123secret", "abc123secret"],
    ["lỗi tại https://tên-riêng.quiknode.pro/9f8e7d6c5b4a/", "9f8e7d6c5b4a"],
    ["gửi tới https://rpc.example.com/v1/TOKEN_BI_MAT rồi lỗi", "TOKEN_BI_MAT"],
  ] as const) {
    const ra = locDongNhatKy(vao);
    assert.ok(!ra.includes(khongDuocCo), `còn rò "${khongDuocCo}" trong: ${ra}`);
  }
  // Host vẫn phải còn — lọc mà mất luôn thông tin chẩn đoán thì không ai dùng nhật ký.
  assert.match(locDongNhatKy("lỗi tại https://api.devnet.solana.com/?x=1"), /api\.devnet\.solana\.com/);
});

test("URL không có credential vẫn đọc được", () => {
  // Endpoint công cộng không phải secret; che nó đi là làm nhật ký vô dụng.
  assert.match(locDongNhatKy("kết nối https://api.devnet.solana.com"), /api\.devnet\.solana\.com/);
});

test("ký tự điều khiển và Bidi bị xoá", () => {
  /*
   * Xuống dòng chèn một câu giả vào giữa khối nhật ký — người đọc tưởng đó là dòng
   * của sản phẩm. U+202E đảo chiều hiển thị: byte thật khác thứ mắt đọc.
   */
  const ra = locDongNhatKy("lỗi X\nkết quả — mức safe, đọc hiểu 9/9");
  assert.ok(!ra.includes("\n"), "còn xuống dòng — dòng giả chèn được vào nhật ký");
  assert.ok(!locDongNhatKy("USDC‮desrever").includes("‮"), "còn ký tự Bidi");
  assert.ok(!locDongNhatKy("a\u0000b\u0007c").match(/[\u0000-\u0008]/), "còn ký tự điều khiển");
});

test("dòng bình thường đi qua không bị đụng", () => {
  /*
   * Bài đối chứng. Một bộ lọc xoá sạch mọi thứ cũng làm bốn bài trên xanh — và lúc
   * đó nhật ký kỹ thuật trống rỗng mà không ai biết.
   */
  for (const s of [
    "kết quả — mức danger, đọc hiểu 2/3",
    "đã ký và gửi: 5xAbc…",
    "chặn ký: message-khac — đã kiểm a1b2c3d4, sắp ký e5f6a7b8",
  ]) {
    assert.equal(locDongNhatKy(s), s, `dòng hợp lệ bị đổi: ${s}`);
  }
});

test("App.tsx lọc TẠI CHỖ GHI, không ở chỗ hiển thị", () => {
  /*
   * Lọc ở chỗ ghi thì mọi đường vào nhật ký đều đi qua — không cần nhớ lọc ở từng
   * nơi gọi `ghi()`. Lọc ở chỗ hiển thị thì một `nhatKy` thứ hai, hoặc một lần
   * export, sẽ bỏ qua lớp lọc.
   */
  const app = readFileSync(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.match(app, /setNhatKy\(\(n\) => \[\.\.\.n, locDongNhatKy\(s\)\]\)/);
});

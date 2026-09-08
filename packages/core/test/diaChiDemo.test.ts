import { test } from "node:test";
import assert from "node:assert/strict";
import { chonRpc, diaChiVi, RPC_MAC_DINH } from "../../../scripts/diaChiDemo.ts";

/**
 * ĐỊA CHỈ GIỮA HAI APP — U07.
 *
 * Hai lỗi thật, cả hai đều im lặng:
 *
 *  1. Ví tôn trọng `VITE_RPC`, trang tấn công thì không. Đặt RPC riêng cho buổi demo
 *     thì một nửa hệ thống vẫn đập vào endpoint công cộng.
 *  2. Mở trang tấn công bằng `127.0.0.1` thay vì `localhost` thì địa chỉ ví giải ra
 *     thành CHÍNH TRANG TẤN CÔNG — bấm "Nhận quà tặng" tải lại chính nó.
 */

test("chonRpc · thứ tự ưu tiên: riêng → hiện trường → công cộng", () => {
  assert.equal(chonRpc("https://ht.example", "https://rieng.example"), "https://rieng.example");
  assert.equal(chonRpc("https://ht.example", undefined), "https://ht.example");
  assert.equal(chonRpc(null, null), RPC_MAC_DINH);
});

test("chonRpc · KHÔNG BAO GIỜ trả chuỗi rỗng", () => {
  // `new Connection("")` ném lỗi ở một chỗ xa nơi gây ra nó, và thông điệp lúc đó
  // không nói gì về cấu hình. Chuỗi trắng cũng tính là rỗng.
  for (const [ht, rieng] of [["", ""], ["   ", null], [null, "  "], [undefined, undefined]] as const) {
    assert.equal(chonRpc(ht, rieng), RPC_MAC_DINH);
  }
});

test("địa chỉ ví · cổng dev 5189 → 5188, KỂ CẢ khi không gõ `localhost`", () => {
  // Đây là ca đã hỏng. `localhost` thì đúng, mọi cách gõ khác cùng một máy thì sai.
  const ca: Array<[string, string]> = [
    ["http://localhost:5189/", "http://localhost:5188"],
    ["http://127.0.0.1:5189/", "http://127.0.0.1:5188"],
    ["http://[::1]:5189/", "http://[::1]:5188"],
    // Soi demo trên điện thoại thật thì phải vào bằng IP LAN của máy.
    ["http://192.168.1.7:5189/", "http://192.168.1.7:5188"],
  ];
  for (const [href, mong] of ca) {
    const r = diaChiVi(href);
    assert.equal(r.loai, "co", href);
    assert.equal((r as { url: string }).url, mong, href);
  }
});

test("địa chỉ ví KHÔNG BAO GIỜ trỏ về chính trang tấn công", () => {
  /*
   * Tính chất quan trọng nhất của cả file. Trỏ về chính nó là kiểu hỏng không phát
   * ra tín hiệu nào: không lỗi, không cảnh báo, trang chỉ tải lại — và người trình
   * bày đứng nhìn một cái nút không làm gì.
   */
  for (const href of [
    "http://localhost:5189/",
    "http://127.0.0.1:5189/",
    "http://192.168.1.7:5189/",
    "https://vidu.test/",
    "https://vidu.test/tan-cong/",
    "https://neitln.github.io/Custos-Solana/tan-cong/",
  ]) {
    const r = diaChiVi(href);
    if (r.loai !== "co") continue; // "không biết" là kết luận hợp lệ — xem bài dưới
    const gon = (x: string) => x.replace(/\/+$/, "");
    assert.notEqual(gon(r.url), gon(href), `${href} → ${r.url}`);
  }
});

test("đã deploy · ví là thư mục cha của `<base>/tan-cong/`", () => {
  const r = diaChiVi("https://neitln.github.io/Custos-Solana/tan-cong/");
  assert.equal(r.loai, "co");
  assert.equal((r as { url: string }).url, "https://neitln.github.io/Custos-Solana");
});

test("ở gốc miền, không có thư mục cha ⇒ `khong` kèm lý do, không đoán bừa", () => {
  // Trả về chính nó ở đây là dựng lại đúng con đường vừa hỏng. "Không biết ví ở đâu"
  // là trạng thái thật, và giao diện phải nói ra được.
  const r = diaChiVi("https://vidu.test/");
  assert.equal(r.loai, "khong");
  assert.match((r as { lyDo: string }).lyDo, /VITE_CUSTOS_VI/);
});

test("`VITE_CUSTOS_VI` thắng mọi suy luận", () => {
  const r = diaChiVi("http://localhost:5189/", "https://vi-rieng.test/");
  assert.equal(r.loai, "co");
  assert.equal((r as { url: string }).url, "https://vi-rieng.test");
  assert.match((r as { vi: string }).vi, /VITE_CUSTOS_VI/);
});

test("href rác ⇒ `khong`, không ném lỗi", () => {
  assert.equal(diaChiVi("khong-phai-url").loai, "khong");
});

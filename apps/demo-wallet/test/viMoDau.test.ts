import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * R0-5, ROADMAP-GIONG-THAT — "Ví của bạn" mở đầu bằng một việc làm được, không bằng thiết lập.
 * Người không có khoá (giám khảo, người thử) phải gặp "Mở một ứng dụng để thử" TRƯỚC khối nạp khoá;
 * và mọi id/nhãn mà probe dùng vẫn phải còn, vẫn trong cây trợ năng (không thu vào <details>).
 */
// CRLF trên máy Windows (core.autocrlf), LF trên CI — chuẩn hoá trước khi cắt theo dòng.
const s = readFileSync("apps/demo-wallet/src/WalletExecution.tsx", "utf8").replace(/\r\n/g, "\n");

test("chưa có khoá: khối mở đầu đứng trước, khối thiết lập xuống cuối thẻ ví", () => {
  const moDau = s.indexOf('<section className="wallet-start"');
  const thietLapTren = s.indexOf("{view.canSign && khoiThietLap}");
  const lichSu = s.indexOf('<section className="wallet-history"');
  const thietLapDuoi = s.indexOf("{!view.canSign && khoiThietLap}");
  assert.ok(moDau > 0 && thietLapTren > moDau, "khối mở đầu phải đứng trước vị trí thiết lập khi có khoá");
  // Đứng đầu thẻ TRONG DOM, không nhờ CSS `order`: thứ tự focus phải khớp thứ tự nhìn (WCAG 2.4.3).
  assert.ok(moDau < s.indexOf('<div className="wallet-card__top">'), "khối mở đầu phải đứng trước số dư trong DOM");
  assert.doesNotMatch(readFileSync("apps/demo-wallet/src/wallet-execution.css", "utf8"), /\.wallet-start\{order/);
  assert.ok(thietLapDuoi > lichSu, "không khoá ⇒ thiết lập nằm sau lịch sử");
  assert.match(s, /Mở một ứng dụng để thử/);
  assert.match(s, /Dành cho người trình diễn/);
});

test("hợp đồng probe giữ nguyên: id, nhãn nút, không bọc thiết lập trong <details>", () => {
  assert.match(s, /id="demo-keypair"/);
  assert.match(s, />\s*Ký tạo phiên thử nghiệm\s*</);
  const khoi = s.slice(s.indexOf("const khoiThietLap"), s.indexOf("  return (\n"));
  assert.doesNotMatch(khoi, /<details/, "phần tử trong <details> đóng không có trong cây trợ năng — probe gọi theo vai trò sẽ hỏng");
});

test("lịch sử chuỗi KHÔNG dùng lớp .wallet-history — lớp đó là biên nhận của phiên", () => {
  const hd = s.slice(s.indexOf("<HoatDong"), s.indexOf("/>", s.indexOf("<HoatDong")));
  assert.doesNotMatch(hd, /wallet-history/);
});

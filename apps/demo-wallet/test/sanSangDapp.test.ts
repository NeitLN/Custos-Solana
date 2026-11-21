import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lyDoDappChuaSan } from "../src/live/sanSangDapp.ts";

/*
 * "Tôi muốn cái này dùng được thật" (chủ dự án, 28/09). Khối dApp chỉ mở khi đủ điều kiện, nhưng
 * nút mờ KHÔNG nói thiếu gì — người xem tưởng hỏng. Mỗi điều kiện thiếu phải ra đúng MỘT câu
 * nói bước tiếp theo, theo thứ tự người dùng gặp.
 */
const du = { luuDuoc: true, phienLuuChoXuLy: false, canSign: true, coPhien: true, doiChu: false, daDong: false, dangBan: false, coYeuCau: false };

test("đủ điều kiện ⇒ không có lý do (dApp dùng được)", () => {
  assert.equal(lyDoDappChuaSan(du), null);
});

test("mỗi điều kiện thiếu ⇒ đúng bước cần làm, theo thứ tự gặp", () => {
  assert.match(lyDoDappChuaSan({ ...du, canSign: false, coPhien: false })!, /Choose key file/);
  assert.match(lyDoDappChuaSan({ ...du, coPhien: false })!, /Sign to create a test session/);
  assert.match(lyDoDappChuaSan({ ...du, doiChu: true })!, /changed owner[\s\S]*new session/);
  assert.match(lyDoDappChuaSan({ ...du, daDong: true })!, /closed[\s\S]*new session/);
  assert.match(lyDoDappChuaSan({ ...du, coYeuCau: true })!, /signing request is waiting/);
  assert.match(lyDoDappChuaSan({ ...du, luuDuoc: false })!, /blocking storage/);
  // Chạy thật 28/09: đã có phiên từ trước, quay lại trang ⇒ phải khôi phục (hoặc bỏ) trước.
  assert.match(lyDoDappChuaSan({ ...du, phienLuuChoXuLy: true })!, /Restore the saved session/);
});

test("màn ví hiện lý do ngay dưới khối dApp khi chưa dùng được", () => {
  const s = readFileSync("apps/demo-wallet/src/WalletExecution.tsx", "utf8");
  assert.match(s, /lyDoDappChuaSan\(/);
  assert.match(s, /className="wallet-dapp-ly-do"/);
});

test('giao dịch chưa rõ kết quả phải được tra cứu trước khi tạo hoặc dùng phiên', () => {
  assert.match(lyDoDappChuaSan({ ...du, chuaRo: true, coPhien: false })!, /Look it up/);
  assert.match(lyDoDappChuaSan({ ...du, chuaRo: true })!, /Look it up/);
});

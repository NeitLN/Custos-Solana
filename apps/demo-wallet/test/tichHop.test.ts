import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { catDong, catTu, chayThu, demDongMa, doanTichHop } from "../src/tichHop/tichHop.ts";
import { xacThucBoReplay, type BoReplayKichBan } from "../src/replayKichBan.ts";

/*
 * A3 — trang "Tích hợp" chỉ được nói điều mã thật làm: đoạn mã hiển thị cắt nguyên văn từ
 * file, và chạy thử gọi chính hàm đó trên dữ liệu Devnet đã ghi.
 */

const TICH_HOP = readFileSync("vi-du-tich-hop/src/tich-hop.js", "utf8");
const SOLBONUS = readFileSync("apps/trang-tan-cong/src/main.tsx", "utf8");
const bo = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;

test("Codex GĐ2 · đoạn HIỂN THỊ tự chạy được khi chép riêng ra — không ReferenceError", async () => {
  /*
   * Bản đầu cắt từ `export async function` nên thiếu `HAN_MS` và `coHan`; trang vẫn chạy được vì
   * import CẢ file, còn người chép đoạn trên trang thì gặp lỗi. Ở đây nạp CHỈ đoạn hiển thị làm
   * một module riêng rồi chạy nó trên phát lại.
   */
  const doan = doanTichHop(TICH_HOP);
  const f = join(mkdtempSync(join(tmpdir(), "custos-doan-")), "doan.mjs");
  writeFileSync(f, doan);
  const mod = (await import(pathToFileURL(f).href)) as { kiemTruocKhiKy: Parameters<typeof chayThu>[2] };
  const r = await chayThu(bo, "tan-cong-day-du", mod.kiemTruocKhiKy);
  assert.equal(r.quyetDinh.cho, "chan");
  assert.equal(r.quyetDinh.lyDo, "phat_hien");
});

test("trang dùng CHÍNH định nghĩa đoạn mã mà test kiểm", () => {
  const trang = readFileSync("apps/demo-wallet/src/tich-hop.tsx", "utf8");
  assert.match(trang, /doanTichHop\(rawTichHop\)/);
});

test("so với lúc ghi xét cả mã lý do và coverage, không chỉ mức", async () => {
  const r = await chayThu(bo, "tan-cong-day-du");
  assert.deepEqual(r.soVoi, { khop: true });
});

test("đoạn mã hiển thị là chuỗi CON nguyên văn của file nguồn", () => {
  const ham = catTu(TICH_HOP, "export async function kiemTruocKhiKy");
  assert.ok(TICH_HOP.includes(ham));
  const dapp = catDong(SOLBONUS, /registerCustosWallet/);
  for (const d of dapp.split("\n")) assert.ok(SOLBONUS.includes(d));
  assert.equal(dapp.split("\n").length, 2, "dApp chỉ cần import + một lời gọi");
});

test("file nguồn đổi mà trang không theo ⇒ báo lệch, không im lặng hiện mã cũ", () => {
  assert.throws(() => catTu(TICH_HOP, "export async function hamKhongTonTai"), /lệch với mã/);
});

test("số dòng mã đếm bằng máy, bỏ chú thích và dòng trống", () => {
  assert.equal(demDongMa("// a\n\nconst x = 1;\n/* b\n c */\nf(x);\n"), 2);
  const n = demDongMa(catTu(TICH_HOP, "export async function kiemTruocKhiKy"));
  assert.ok(n > 10 && n < 40, `hàm tích hợp ${n} dòng mã`);
});

test("bộ phát lại dùng được (Devnet, ví cố định)", () => {
  assert.equal(xacThucBoReplay(bo), null);
});

test("chạy thử: tấn công đầy đủ ⇒ ví CHẶN vì phát hiện, đúng mã đổi chủ", async () => {
  const r = await chayThu(bo, "tan-cong-day-du");
  assert.equal(r.quyetDinh.cho, "chan");
  assert.equal(r.quyetDinh.lyDo, "phat_hien");
  assert.ok(r.quyetDinh.ketQua?.reasonCodes.includes("SPL_SET_AUTHORITY__ACCOUNT_OWNER"));
  assert.equal(r.quyetDinh.ketQua?.level, r.lucGhi.level, "engine hiện tại khác lúc ghi — trang phải nói ra");
  assert.deepEqual(r.thieu, []);
});

test("chạy thử: đối chứng lành tính ⇒ KHÔNG bị chặn", async () => {
  const r = await chayThu(bo, "lanh-tinh");
  assert.notEqual(r.quyetDinh.cho, "chan");
  assert.equal(r.quyetDinh.ketQua?.level, "safe");
});

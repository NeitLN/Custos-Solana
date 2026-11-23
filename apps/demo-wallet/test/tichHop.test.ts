import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  BANG_MUC, CHO_SANG_EN, LY_DO_SANG_EN, catDong, catKhoang, catTu, chayThu, chayThuEn, demDongMa, docMucEn, doanNhanh,
  doanTichHop, doanTiengAnh, loiGoiEn,
} from "../src/tichHop/tichHop.ts";
// @ts-expect-error — JavaScript thuần, cố ý: đúng hai file bên tích hợp chép về.
import { kiemTruocKhiKy } from "../../../vi-du-tich-hop/src/tich-hop.js";
// @ts-expect-error — như trên.
import { inspectBeforeSigning } from "../../../vi-du-tich-hop/src/inspect-before-signing.js";
import { xacThucBoReplay, type BoReplayKichBan } from "../src/replayKichBan.ts";

/*
 * A3 — trang "Tích hợp" chỉ được nói điều mã thật làm: đoạn mã hiển thị cắt nguyên văn từ
 * file, và chạy thử gọi chính hàm đó trên dữ liệu Devnet đã ghi.
 */

const TICH_HOP = readFileSync("vi-du-tich-hop/src/tich-hop.js", "utf8");
const SOLBONUS = readFileSync("apps/trang-tan-cong/src/main.tsx", "utf8");
const bo = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;

test("reviewer GĐ2 · đoạn HIỂN THỊ tự chạy được khi chép riêng ra — không ReferenceError", async () => {
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
  assert.throws(() => catTu(TICH_HOP, "export async function hamKhongTonTai"), /out of sync with the code/);
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

/*
 * REVIEW UX 11/2026 — BẢN ĐỊNH DANH TIẾNG ANH `inspect-before-signing.js`.
 *
 * Trang mở đầu bằng file này, nên nó phải chịu đúng các luật của `tich-hop.js`: hiện nguyên văn, chạy
 * thật, và trả CÙNG câu trả lời với file được đếm. `tich-hop.js` vẫn là file được đếm và công bố.
 */
const EN = readFileSync("vi-du-tich-hop/src/inspect-before-signing.js", "utf8");
type QdVi = { cho: keyof typeof CHO_SANG_EN; lyDo: keyof typeof LY_DO_SANG_EN; ketQua: unknown; loi: string | null };
type QdEn = { decision: string; reason: string; result: unknown; error: string | null };
const vi = { toBase58: () => "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ" };

test("bản tiếng Anh · đoạn HIỂN THỊ (từ TIMEOUT_MS) tự chạy được khi chép riêng ra", async () => {
  const f = join(mkdtempSync(join(tmpdir(), "custos-doan-en-")), "doan.mjs");
  writeFileSync(f, doanTiengAnh(EN));
  const mod = (await import(pathToFileURL(f).href)) as { inspectBeforeSigning: Parameters<typeof chayThuEn>[2] };
  const r = await chayThuEn(bo, "tan-cong-day-du", mod.inspectBeforeSigning);
  assert.equal(r.quyetDinh.decision, "block");
  assert.equal(r.quyetDinh.reason, "detected");
});

test("bản tiếng Anh · mọi đoạn trang hiện là chuỗi CON nguyên văn của file", () => {
  for (const doan of [doanTiengAnh(EN), doanNhanh(EN), loiGoiEn(EN), docMucEn(EN)]) assert.ok(EN.includes(doan));
  // Lời gọi mở đầu trang: đúng cỡ "khoảng 8 dòng", và phải chứa đủ hai ràng buộc bảo mật.
  const goi = loiGoiEn(EN);
  assert.ok(demDongMa(goi) >= 6 && demDongMa(goi) <= 10, `lời gọi ${demDongMa(goi)} dòng mã`);
  assert.match(goi, /nguoiDung: userWallet\.toBase58\(\)/, "địa chỉ phải lấy từ ví");
  assert.match(goi, /expectedAction: dAppDeclared/);
  // Ngay cạnh `result.level`: "safe" hiện là Normal, không bao giờ gọi giao dịch là an toàn.
  assert.match(docMucEn(EN), /"safe" is shown to users as "Normal" — never call a transaction safe/);
  assert.throws(() => catKhoang(EN, "khongTonTai", ");"), /out of sync with the code/);
});

test("trang Tích hợp hiện CHÍNH các đoạn của bản tiếng Anh, và vẫn hiện file được đếm", () => {
  const trang = readFileSync("apps/demo-wallet/src/tich-hop.tsx", "utf8");
  for (const m of [/doanTiengAnh\(rawEn\)/, /doanNhanh\(rawEn\)/, /loiGoiEn\(rawEn\)/, /docMucEn\(rawEn\)/, /doanTichHop\(rawTichHop\)/])
    assert.match(trang, m);
  assert.match(trang, /inspect-before-signing\.js\?raw/);
  // Kết quả JSON mẫu là kết quả CHẠY, không phải chuỗi gõ tay.
  assert.match(trang, /JSON\.stringify\(kq\.q, null, 2\)/);
  assert.doesNotMatch(trang, /"level":\s*"danger"/);
});

test("số dòng CÔNG BỐ vẫn đếm trên tich-hop.js — bản tiếng Anh không thay file được đếm", () => {
  const sl = JSON.parse(readFileSync("apps/demo-wallet/public/so-lieu.json", "utf8")) as { tichHop: { dongMa: number } | null };
  assert.equal(demDongMa(doanTichHop(TICH_HOP)), sl.tichHop?.dongMa, "trang Tích hợp và trang Số liệu phải nói cùng một số");
  assert.match(readFileSync("scripts/thu-tich-hop.mjs", "utf8"), /demDongMa\(join\(GOC, "vi-du-tich-hop\/src\/tich-hop\.js"\)\)/);
});

test("hai file trả CÙNG câu trả lời trên phát lại: tấn công và đối chứng lành tính", async () => {
  for (const id of ["tan-cong-day-du", "lanh-tinh"]) {
    const a = await chayThu(bo, id);
    const b = await chayThuEn(bo, id);
    assert.equal(b.quyetDinh.decision, CHO_SANG_EN[a.quyetDinh.cho], id);
    assert.equal(b.quyetDinh.reason, LY_DO_SANG_EN[a.quyetDinh.lyDo], id);
    assert.deepEqual(b.quyetDinh.result?.reasonCodes, a.quyetDinh.ketQua?.reasonCodes, id);
    assert.equal(b.quyetDinh.result?.level, a.quyetDinh.ketQua?.level, id);
  }
});

test("hai file trả CÙNG câu trả lời trên mọi nhánh — kể cả quá hạn và lỗi (fail closed)", async () => {
  const kq = (level: string, analyzed: number, total: number, aiAdvisory: string | null = null) => () =>
    Promise.resolve({ level, aiAdvisory, coverage: { analyzed, total, unverifiedPrograms: total - analyzed } });
  const ca: Array<[string, () => Promise<unknown>]> = [
    ["danger", kq("danger", 3, 3)],
    ["warning", kq("warning", 3, 3)],
    ["safe, coverage khuyết", kq("safe", 1, 3)],
    ["safe, aiAdvisory", kq("safe", 3, 3, "review_required")],
    ["safe, đủ", kq("safe", 3, 3)],
    ["lỗi RPC", () => Promise.reject(new Error("fetch failed"))],
    ["quá hạn", () => new Promise(() => {})],
  ];
  for (const [ten, inspect] of ca) {
    const chung = { inspect, connection: {}, tx: {}, interpret: undefined };
    const a = (await kiemTruocKhiKy({ ...chung, viNguoiDung: vi, hanMs: 20 })) as QdVi;
    const b = (await inspectBeforeSigning({ ...chung, userWallet: vi, timeoutMs: 20 })) as QdEn;
    assert.equal(b.decision, CHO_SANG_EN[a.cho], ten);
    assert.equal(b.reason, LY_DO_SANG_EN[a.lyDo], ten);
    assert.equal(b.error, a.loi, ten);
    if (a.cho !== "ky") assert.notEqual(b.decision, "sign", `${ten}: không bao giờ được thành ký`);
  }
});

test("bảng 'level → ví nên làm gì' trên trang khớp CHÍNH hàm inspectBeforeSigning", async () => {
  for (const h of BANG_MUC) {
    const inspect = h.mau === null ? () => Promise.reject(new Error("fetch failed")) : () => Promise.resolve(h.mau);
    const b = (await inspectBeforeSigning({ inspect, connection: {}, tx: {}, userWallet: vi })) as QdEn;
    assert.deepEqual([b.decision, b.reason], [h.decision, h.reason], h.dieuKien);
    if (h.mau?.level === "safe") assert.equal(h.nhan, "Normal", "bảng không được gọi mức safe là an toàn");
  }
  assert.ok(BANG_MUC.every((h) => !/\bsafe\b/i.test(h.nhan)));
});

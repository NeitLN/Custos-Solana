import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";
import { KICH_BAN, timKichBan } from "../src/kichBan.ts";
import {
  connReplay,
  soVoiLucGhi,
  tuyChonInspectKichBan,
  xacThucBoReplay,
  type BoReplayKichBan,
  type MauReplayKichBan,
} from "../src/replayKichBan.ts";

/*
 * CK-02 — PHÁT LẠI THEO KỊCH BẢN, BẰNG ENGINE THẬT, KHÔNG MẠNG.
 *
 * Nghiệm thu của thẻ: "các ca chính chạy được khi tắt mạng; không có RPC phát sinh";
 * "đổi kịch bản đổi đúng tx"; "fixture hỏng/khác version/thiếu call" phải báo; mock
 * không được thành receipt; replay không mở signer.
 *
 * `fetch` toàn cục bị thay bằng hàm NÉM trong suốt file: một lời gọi mạng lén lút làm
 * bài đỏ ngay, thay vì xanh nhờ máy đang có mạng.
 */

const BO = JSON.parse(
  readFileSync(fileURLToPath(new URL("../public/replay/kich-ban.json", import.meta.url)), "utf8"),
) as BoReplayKichBan;

const fetchThat = globalThis.fetch;
let soLanGoiMang = 0;
before(() => {
  globalThis.fetch = (async () => {
    soLanGoiMang++;
    throw new Error("replay đã gọi mạng");
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = fetchThat;
});

/** Chạy ĐÚNG các chặng của `App.tsx → chayKiem` trên connection phát lại. */
async function phatLai(m: MauReplayKichBan, kichBanDung = m.id) {
  const { conn, thieu } = connReplay(m);
  const c = conn as Connection;
  const ht = BO.hienTruong;
  const kb = timKichBan(kichBanDung)!;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, ht);
  const tx = kb.dungTx(ht, { blockhash, soDuNguon: soDu });
  const r = await inspect({ connection: c, interpret: dienGiaiKhongAI }, tx, tuyChonInspectKichBan(kb, ht));
  return { r, thieu: thieu() };
}

test("bộ dữ liệu đã ghi hợp lệ, của Devnet, cho ĐÚNG ví demo cố định, phủ mọi kịch bản Devnet", () => {
  assert.equal(xacThucBoReplay(BO), null);
  const coDuLieu = new Set(BO.mau.map((m) => m.id));
  for (const k of KICH_BAN.filter((x) => x.hoTro === "devnet")) assert.ok(coDuLieu.has(k.id), `thiếu kịch bản ${k.id}`);
  // Một lượt ghi = một nguồn. Trộn nguồn thì không phải một snapshot (CK-01).
  for (const m of BO.mau) assert.equal(m.nguon.length, 1, `${m.id} ghi từ ${m.nguon.length} nguồn`);
  // Chỉ host, không URL (URL có thể mang khoá).
  assert.ok(!/https?:\/\//.test(JSON.stringify(BO.mau.map((m) => [m.nguon, m.fixture.nguon]))));
});

test("MỌI kịch bản phát lại qua engine thật, không thiếu lời gọi nào, và KHÔNG chạm mạng", async () => {
  // GOM mọi ca hỏng rồi mới báo: dừng ở ca đầu từng che mất `tan-cong-day-du` sau
  // `lanh-tinh` — hai ca cùng thiếu một lời gọi mà bài chỉ nêu một.
  const hong: string[] = [];
  for (const m of BO.mau) {
    const { r, thieu } = await phatLai(m);
    if (thieu.length) hong.push(`${m.id}: fixture thiếu ${[...new Set(thieu.map((t) => t.method))].join(",")}`);
    const so = soVoiLucGhi(r, m.ketQuaLucGhi);
    if (!so.khop) hong.push(`${m.id}: engine lệch lúc ghi — ${"moTa" in so ? so.moTa : ""}`);
  }
  assert.deepEqual(hong, []);
  assert.equal(soLanGoiMang, 0, "replay đã gọi mạng");
});

test("các ca chính của hành trình ra đúng mức — đỏ có căn cứ, đối chứng không đỏ", async () => {
  const muc = async (id: string) => (await phatLai(BO.mau.find((m) => m.id === id)!)).r;
  const lanh = await muc("lanh-tinh");
  assert.notEqual(lanh.level, "danger");
  const doiChu = await muc("doi-chu-tai-khoan");
  assert.equal(doiChu.level, "danger");
  assert.ok(doiChu.reasonCodes.includes("SPL_SET_AUTHORITY__ACCOUNT_OWNER"));
  // Chỉ đổi chủ: KHÔNG được có dòng số dư giảm (quyết định khoá số 7).
  assert.ok(!doiChu.diff.some((d) => d.label.startsWith("Số dư") && d.before !== d.after), "ca chỉ đổi chủ lại hiện số dư đổi");
  const vuaDu = await muc("cap-quyen-vua-du");
  assert.notEqual(vuaDu.level, "danger", "đối chứng cấp quyền vừa đủ bị gắn đỏ");
  const vuot = await muc("cap-quyen-vuot-so-du");
  assert.equal(vuot.level, "danger");
  const thieuDL = await muc("thieu-du-lieu");
  assert.equal(thieuDL.level, "warning", "thiếu dữ liệu phải là Cần xem kỹ, không bao giờ safe");
});

test("ĐỔI KỊCH BẢN ⇒ đổi tx: dựng ca khác trên fixture của ca này thì BÁO THIẾU, không trả kết quả lẫn", async () => {
  const m = BO.mau.find((x) => x.id === "lanh-tinh")!;
  const { thieu } = await phatLai(m, "doi-chu-tai-khoan");
  assert.ok(
    thieu.some((t) => t.method === "simulateTransaction"),
    "giao dịch khác mà fixture vẫn 'trả lời' — replay không gắn với đúng tx",
  );
  assert.equal(soLanGoiMang, 0, "thiếu fixture thì phải báo, không gọi mạng bù");
});

test("fixture HỎNG / khác phiên bản / khác cluster / khác ví ⇒ bị từ chối trước khi chạy", () => {
  assert.match(xacThucBoReplay({ ...BO, phienBan: 2 }) ?? "", /phiên bản/);
  assert.match(xacThucBoReplay({ ...BO, schema: "khac" }) ?? "", /schema/);
  assert.match(xacThucBoReplay({ ...BO, genesis: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" }) ?? "", /Devnet/);
  assert.match(
    xacThucBoReplay({ ...BO, viBaoVe: "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF" }) ?? "",
    /ví khác/,
    "bộ ghi cho ví khác lọt vào hành trình demo",
  );
  assert.match(xacThucBoReplay({ ...BO, mau: [{ ...BO.mau[0], id: "khong-ton-tai" }] }) ?? "", /lạ/);
  assert.match(xacThucBoReplay({ ...BO, mau: [{ ...BO.mau[0], fixture: {} }] }) ?? "", /hỏng/);
  assert.ok(xacThucBoReplay(null));
});

test("THIẾU MỘT LỜI GỌI ⇒ nổi ra trong hộp thiếu, dù extractFacts nuốt lỗi mô phỏng", async () => {
  const m = structuredClone(BO.mau.find((x) => x.id === "doi-chu-tai-khoan")!);
  m.fixture.banGhi = m.fixture.banGhi.filter((b) => b.method !== "simulateTransaction");
  const { r, thieu } = await phatLai(m);
  assert.ok(thieu.some((t) => t.method === "simulateTransaction"));
  // Và fail-safe vẫn giữ: không đo được thì không bao giờ safe.
  assert.notEqual(r.level, "safe");
});

test("engine đổi kết quả so với lúc ghi ⇒ sai khác được NÓI RA, không lấy kết quả cũ đè lên", () => {
  const so = soVoiLucGhi({ level: "warning", reasonCodes: ["X"] }, { level: "danger", reasonCodes: ["Y"], coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 } });
  assert.equal(so.khop, false);
  assert.match("moTa" in so ? so.moTa : "", /Lúc ghi: danger \(Y\)\. Engine đang chạy: warning \(X\)/);
  assert.ok(soVoiLucGhi({ level: "safe", reasonCodes: ["B", "A"] }, { level: "safe", reasonCodes: ["A", "B"], coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 } }).khop);
});

test("Codex review 27/09 · coverage đổi (mức và mã giữ nguyên) vẫn là SAI KHÁC so với lúc ghi", () => {
  const lucGhi = { level: "warning", reasonCodes: ["A"], coverage: { analyzed: 2, total: 3, unverifiedPrograms: 1 } };
  const so = soVoiLucGhi({ level: "warning", reasonCodes: ["A"], coverage: { analyzed: 1, total: 3, unverifiedPrograms: 2 } }, lucGhi);
  assert.equal(so.khop, false, "engine đọc hiểu ít hơn lúc ghi mà vẫn báo khớp");
  assert.match("moTa" in so ? so.moTa : "", /1\/3/);
});

test("Codex review 27/09 · gộp bộ phát lại: hiện trường ĐỔI thì không giữ fixture cũ, và không cho ghi lẻ từng ca", async () => {
  const { gopBoReplay } = await import("../src/replayKichBan.ts");
  const moi = new Map([["lanh-tinh", BO.mau.find((m) => m.id === "lanh-tinh")!]]);
  // Cùng hiện trường: ca cũ (một nguồn) được giữ.
  const cung = gopBoReplay(BO, BO.hienTruong, moi, ["lanh-tinh"]);
  assert.ok("mau" in cung && cung.mau.length === BO.mau.length);
  // Hiện trường đổi + ghi lẻ ⇒ từ chối: ca giữ lại sẽ dựng tx bằng địa chỉ mới rồi thiếu fixture.
  const htMoi = { ...BO.hienTruong, taiKhoanNanNhan: "11111111111111111111111111111111" };
  const le = gopBoReplay(BO, htMoi, moi, ["lanh-tinh"]);
  assert.ok("loi" in le && /hiện trường/.test(le.loi));
  // Hiện trường đổi + ghi toàn bộ ⇒ chỉ còn ca vừa ghi, không lẫn ca cũ.
  const toan = gopBoReplay(BO, htMoi, moi, []);
  assert.ok("mau" in toan && toan.mau.map((m) => m.id).join() === "lanh-tinh");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { docNguonSong } from "../../../scripts/hienTruongSong.ts";
import { timKichBan } from "../src/kichBan.ts";
import { connReplay, tuyChonInspectKichBan, type BoReplayKichBan } from "../src/replayKichBan.ts";
import { hauQuaNeuKy } from "../src/hauQuaNeuKy.ts";

/*
 * "NẾU BẠN TIẾP TỤC" — góp ý mentor 28/09: người xem phải thấy được tiếp tục thì mất gì.
 * Phòng phân tích KHÔNG ký, nên khung này chỉ được nói điều MÔ PHỎNG đã cho biết — từng con số
 * lấy từ bảng chênh lệch của chính lượt kiểm, không bịa, không phóng đại (quyết định khoá số 7:
 * chỉ đổi chủ thì KHÔNG được hiện số dư giảm).
 */
const BO = JSON.parse(readFileSync("apps/demo-wallet/public/replay/kich-ban.json", "utf8")) as BoReplayKichBan;
const fetchThat = globalThis.fetch;
before(() => {
  globalThis.fetch = (async () => {
    throw new Error("không được gọi mạng");
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = fetchThat;
});
async function ketQua(id: string) {
  const c = connReplay(BO.mau.find((m) => m.id === id)!).conn as Connection;
  const kb = timKichBan(id)!;
  const { blockhash } = await c.getLatestBlockhash();
  const { soDu } = await docNguonSong(c, BO.hienTruong);
  return inspect({ connection: c, interpret: dienGiaiKhongAI }, kb.dungTx(BO.hienTruong, { blockhash, soDuNguon: soDu }), tuyChonInspectKichBan(kb, BO.hienTruong));
}

test("tấn công đầy đủ: thấy MẤT 250 token VÀ mất quyền với phần còn lại", async () => {
  const h = hauQuaNeuKy(await ketQua("tan-cong-day-du"));
  const ts = h.dong.find((d) => d.loai === "taiSan")!;
  assert.equal(ts.truoc, "500,0");
  assert.equal(ts.sau, "250,0");
  assert.equal(ts.chenh, "−250,0");
  assert.ok(ts.nghiemTrong);
  const q = h.dong.find((d) => d.loai === "quyen")!;
  assert.equal(q.truoc, "Bạn");
  assert.match(q.giaiThich, /không còn thuộc về bạn/);
  assert.match(q.giaiThich, /không cần bạn ký/);
});

test("chỉ đổi chủ: KHÔNG có dòng số dư giảm (quyết định khoá số 7), vẫn nói mất quyền", async () => {
  const h = hauQuaNeuKy(await ketQua("doi-chu-tai-khoan"));
  assert.ok(!h.dong.some((d) => d.loai === "taiSan" && d.truoc !== d.sau), "bịa ra số dư giảm khi giao dịch chỉ đổi chủ");
  assert.ok(h.dong.some((d) => d.loai === "quyen" && /không còn thuộc về bạn/.test(d.giaiThich)));
});

test("cấp quyền vượt số dư: nói ví khác rút được mà không cần ký thêm; lành tính: chỉ số dư giảm đúng số gửi", async () => {
  const cap = hauQuaNeuKy(await ketQua("cap-quyen-vuot-so-du"));
  assert.ok(cap.dong.some((d) => d.loai === "quyen" && /không cần bạn ký thêm/.test(d.giaiThich)));
  const lanh = hauQuaNeuKy(await ketQua("lanh-tinh"));
  assert.deepEqual(
    lanh.dong.map((d) => [d.loai, d.truoc, d.sau, d.chenh]),
    [["taiSan", "500,0", "490,0", "−10,0"]],
  );
  assert.ok(!lanh.dong.some((d) => d.nghiemTrong && d.loai === "quyen"));
});

test("đọc hiểu chưa đủ thì NÓI RA — phần chưa đọc có thể còn thay đổi khác", async () => {
  const h = hauQuaNeuKy(await ketQua("tan-cong-day-du"));
  assert.match(h.ghiChuPhamVi ?? "", /chưa đọc hiểu/);
  const lanh = hauQuaNeuKy(await ketQua("lanh-tinh"));
  assert.equal(lanh.ghiChuPhamVi, null);
});

test("giao diện: thẻ có nút 'Vẫn tiếp tục', khung nói rõ là mô phỏng và có đường quay lại chặn", () => {
  const cb = readFileSync("apps/demo-wallet/src/CanhBao.tsx", "utf8");
  assert.match(cb, /Vẫn tiếp tục — xem điều sẽ xảy ra/);
  const k = readFileSync("apps/demo-wallet/src/KhungTiepTuc.tsx", "utf8");
  assert.match(k, /Theo mô phỏng · chưa có giao dịch nào được gửi/, "khung không nói rõ là mô phỏng");
  assert.match(k, /Quay lại & chặn giao dịch/);
  const app = readFileSync("apps/demo-wallet/src/App.tsx", "utf8");
  assert.ok(/onTiepTuc=\{/.test(app) && /<KhungTiepTuc/.test(app), "Phòng phân tích chưa nối khung tiếp tục");
  // Chọn kết quả mới / huỷ đều đóng khung cũ — khung không được nói về giao dịch khác.
  assert.ok((app.match(/setXemHauQua\(false\)/g) ?? []).length >= 3);
});

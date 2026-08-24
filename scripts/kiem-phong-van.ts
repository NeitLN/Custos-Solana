/**
 * ĐẾM VÀ SOI KẾT QUẢ PHỎNG VẤN.
 *
 *   node --experimental-strip-types scripts/kiem-phong-van.ts
 *
 * Đọc `data/seed/phong-van.json` — hoặc bản xuất từ `/phong-van.html`.
 *
 * Hai việc, và việc thứ hai mới là lý do script này tồn tại:
 *
 *   1. ĐẾM. Không ai đếm tay. Con số lên sân khấu phải sinh ra từ dữ liệu.
 *
 *   2. SOI CHẤM LỆCH. Bốn người chấm 12 người trong nhiều buổi thì thang chấm
 *      trôi — người thứ nhất khắt khe, người thứ tư dễ dãi, và không ai nhận ra.
 *      Script đối chiếu NHÃN với CÂU NGUYÊN VĂN rồi nêu chỗ đáng xem lại.
 *
 * KHÔNG TỰ SỬA NHÃN. Nó chỉ nêu ra để người chấm xem lại. Một script tự đổi ĐÚNG
 * thành SAI theo từ khoá là một script đang bịa dữ liệu — đúng thứ cả bộ đồ nghề
 * này sinh ra để chặn.
 */
import { existsSync, readFileSync } from "node:fs";

const F = process.argv[2] ?? "data/seed/phong-van.json";

type Ban = {
  ma?: string;
  luc?: string;
  ngay?: string;
  nguyenVan: string;
  cham: "dung" | "motPhan" | "sai" | "ĐÚNG" | "MỘT PHẦN" | "SAI";
  quyetDinh?: "huy" | "kiemTraThem" | "ky" | "HUỶ" | "KIỂM TRA THÊM" | "VẪN KÝ";
  ghiChu?: string;
};

if (!existsSync(F)) {
  console.error(`Chưa có ${F}.`);
  console.error(`Đổ bảng trong docs/ket-qua-phong-van.md vào đó, hoặc bấm`);
  console.error(`"Sao chép toàn bộ (JSON)" trên /phong-van.html rồi dán vào.`);
  process.exit(1);
}

const ban = JSON.parse(readFileSync(F, "utf8")) as Ban[];
if (!Array.isArray(ban) || ban.length === 0) {
  console.error("File rỗng hoặc không phải mảng.");
  process.exit(1);
}

const chuanCham = (c: string) =>
  ({ "ĐÚNG": "dung", "MỘT PHẦN": "motPhan", "SAI": "sai" } as Record<string, string>)[c] ?? c;
const chuanQD = (q?: string) =>
  q === undefined
    ? undefined
    : (({ "HUỶ": "huy", "KIỂM TRA THÊM": "kiemTraThem", "VẪN KÝ": "ky" } as Record<string, string>)[q] ?? q);

const n = ban.length;
const dem = (c: string) => ban.filter((b) => chuanCham(b.cham) === c).length;
const demQD = (q: string) => ban.filter((b) => chuanQD(b.quyetDinh) === q).length;

console.log(`\n=== ${n} người ===\n`);
console.log(`  mức hiểu   : ${dem("dung")} đúng · ${dem("motPhan")} một phần · ${dem("sai")} sai`);
console.log(`  quyết định : ${demQD("huy")} huỷ · ${demQD("kiemTraThem")} kiểm tra thêm · ${demQD("ky")} vẫn ký`);

console.log(`\n--- CON SỐ ĐƯỢC NÓI TRÊN SÂN KHẤU ---`);
console.log(`  ${dem("dung")}/${n} nêu được hậu quả`);
console.log(`  ${demQD("ky")}/${n} vẫn ký dù đã thấy cảnh báo`);
console.log(`  "một phần" KHÔNG gộp vào "đúng".`);

// ── Soi ───────────────────────────────────────────────────────────
// Từ khoá chỉ để GỢI Ý xem lại. Người ta diễn đạt trăm kiểu, nên vắng từ khoá
// không có nghĩa là chấm sai — chỉ có nghĩa là đáng liếc lại một lượt.
const MAT_TIEN = /(mất|chuyển|trừ|rút|hết|về 0|bị lấy|không còn tiền)/i;
const MAT_QUYEN = /(đổi chủ|quyền|kiểm soát|sở hữu|owner|người khác giữ)/i;

const canXem: string[] = [];
ban.forEach((b, i) => {
  const ma = b.ma ?? `#${i + 1}`;
  const c = chuanCham(b.cham);
  const v = b.nguyenVan ?? "";

  if (v.trim().length === 0) canXem.push(`${ma}: KHÔNG có câu nguyên văn — ô này không được để trống`);
  else if (v.trim().length < 15) canXem.push(`${ma}: câu nguyên văn rất ngắn ("${v.trim()}") — có chép đủ chưa?`);

  if (c === "dung" && !MAT_TIEN.test(v) && !MAT_QUYEN.test(v))
    canXem.push(`${ma}: chấm ĐÚNG nhưng câu không nhắc mất tiền lẫn mất quyền — xem lại thang chấm`);
  if (c === "sai" && (MAT_TIEN.test(v) || MAT_QUYEN.test(v)))
    canXem.push(`${ma}: chấm SAI nhưng câu có nhắc hậu quả — xem lại`);
  if (b.quyetDinh === undefined) canXem.push(`${ma}: thiếu quyết định (huỷ/kiểm tra thêm/vẫn ký)`);
});

// Đều tăm tắp là dấu hiệu đáng ngờ, không phải dấu hiệu tốt.
const doDai = ban.map((b) => (b.nguyenVan ?? "").trim().length).filter((x) => x > 0);
if (doDai.length >= 5) {
  const tb = doDai.reduce((a, x) => a + x, 0) / doDai.length;
  const lech = Math.sqrt(doDai.reduce((a, x) => a + (x - tb) ** 2, 0) / doDai.length);
  if (lech < tb * 0.15)
    canXem.push(
      `TOÀN BỘ: câu trả lời dài gần bằng nhau (lệch chuẩn ${lech.toFixed(0)} trên trung bình ${tb.toFixed(0)}). ` +
        `Người thật nói dài ngắn rất khác nhau — kiểm xem có bị viết lại cho gọn không.`,
    );
}

if (canXem.length === 0) {
  console.log(`\n✓ không thấy chỗ nào đáng xem lại`);
} else {
  console.log(`\n--- ${canXem.length} CHỖ ĐÁNG XEM LẠI ---`);
  console.log(`(gợi ý thôi — script KHÔNG tự sửa nhãn)\n`);
  for (const d of canXem) console.log(`  · ${d}`);
}
console.log("");

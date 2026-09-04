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
import {
  chuanCham,
  docHoSo,
  soiDuLieuCaNhan,
  tongHop,
  type Ban as BanChuan,
} from "../apps/demo-wallet/src/phongVan.ts";

const F = process.argv[2] ?? "data/seed/phong-van.json";

// Lược đồ và phép đếm sống ở `apps/demo-wallet/src/phongVan.ts` — cùng một nơi với
// trang nhập liệu, để hai bên không mô tả cùng một thứ theo hai kiểu rồi trôi.
type Ban = BanChuan & { ngay?: string };

if (!existsSync(F)) {
  console.error(`Chưa có ${F}.`);
  console.error(`Đổ bảng trong docs/ket-qua-phong-van.md vào đó, hoặc bấm`);
  console.error(`"Sao chép toàn bộ (JSON)" trên /phong-van.html rồi dán vào.`);
  process.exit(1);
}

const hoSo = docHoSo(JSON.parse(readFileSync(F, "utf8")));
const ban = hoSo.ban as Ban[];
if (ban.length === 0) {
  console.error("Hồ sơ rỗng — chưa có người nào được ghi.");
  process.exit(1);
}

const t = tongHop(ban);
const n = t.n;

console.log(`\n=== ${n} người ===\n`);
console.log(`  mức hiểu   : ${t.hieu.dung} đúng · ${t.hieu.motPhan} một phần · ${t.hieu.sai} sai`);
console.log(
  `  quyết định : ${t.quyetDinh.huy} huỷ · ${t.quyetDinh.kiemTraThem} kiểm tra thêm · ${t.quyetDinh.ky} vẫn ký`,
);

if (hoSo.laViDu) {
  // CHẶN Ở ĐÂY. File ví dụ tồn tại để đội biết ĐỊNH DẠNG, không phải để lấy SỐ.
  // Không có chốt này thì con đường ngắn nhất tới một slide sai là chạy script
  // trên file mẫu rồi chép con số đẹp ra ngoài.
  console.log(`\n⚠ ĐÂY LÀ FILE VÍ DỤ (laViDu: true) — DỮ LIỆU MINH HOẠ, KHÔNG PHẢI NGƯỜI THẬT.`);
  console.log(`  KHÔNG được đọc bất kỳ con số nào ở trên lên sân khấu hay đưa vào deck.`);
  console.log(`  Thay bằng bản xuất thật từ /phong-van.html rồi chạy lại.`);
} else {
  console.log(`\n--- CON SỐ ĐƯỢC NÓI TRÊN SÂN KHẤU ---`);
  console.log(`  ${t.hieu.dung}/${n} nêu được hậu quả`);
  console.log(`  ${t.quyetDinh.ky}/${n} vẫn ký dù đã thấy cảnh báo`);
  console.log(`  "một phần" KHÔNG gộp vào "đúng".`);
  if (n < 3) {
    console.log(`\n⚠ mới ${n} người — mốc tối thiểu dùng được là 3. Nói rõ mẫu số khi trình bày.`);
  }
}

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

// Dữ liệu này đi vào một repo công khai, và lịch sử git không gỡ lại được.
const caNhan = soiDuLieuCaNhan(ban);
if (caNhan.length > 0) {
  console.log(`\n--- ⚠ ${caNhan.length} CHỖ CÓ THỂ LỘ DANH TÍNH — GỠ TRƯỚC KHI COMMIT ---\n`);
  for (const c of caNhan) console.log(`  · ${c}`);
}

if (canXem.length === 0) {
  console.log(`\n✓ không thấy chỗ nào đáng xem lại`);
} else {
  console.log(`\n--- ${canXem.length} CHỖ ĐÁNG XEM LẠI ---`);
  console.log(`(gợi ý thôi — script KHÔNG tự sửa nhãn)\n`);
  for (const d of canXem) console.log(`  · ${d}`);
}
console.log("");

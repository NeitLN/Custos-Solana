/**
 * SINH GIAO DỊCH MẪU ĐỂ DÁN VÀO INSPECTOR.
 *
 * Chạy:  npm run mau-inspector
 *
 * ## Vì sao cần script này thay vì một file base64 lưu sẵn
 *
 * Mỗi giao dịch mang một `recentBlockhash`, và Solana chỉ nhận blockhash trong
 * khoảng **60–90 giây**. Một chuỗi base64 chép vào tài liệu hôm nay thì ngày mai
 * mô phỏng trả về lỗi — và nó hỏng đúng lúc đang đứng trước Ban Giám khảo.
 *
 * Nên base64 phải được sinh TẠI CHỖ, ngay trước khi dán.
 *
 * ## Inspector khác Ví mẫu ở chỗ nào
 *
 * Ví mẫu (`/`) kể một câu chuyện có kịch bản: bấm nút, xem Custos chặn.
 * Inspector (`/soi.html`) nhận một giao dịch LẠ — nó trả lời câu hỏi
 * *"sản phẩm này có chạy với giao dịch của TÔI không"*, chứ không phải
 * *"demo của các bạn trông thế nào"*.
 *
 * Với Ban Giám khảo, Inspector là nơi chứng minh Custos không phải một màn kịch
 * dựng sẵn: họ dán gì vào cũng được, kể cả giao dịch họ tự tạo.
 */
import { readFileSync } from "node:fs";
import { Connection } from "@solana/web3.js";
import { KICH_BAN, timKichBan } from "../../apps/demo-wallet/src/kichBan.ts";
import { docNguonSong } from "../hienTruongSong.ts";

const ht = JSON.parse(readFileSync("apps/demo-wallet/public/hien-truong.json", "utf8"));
const conn = new Connection(ht.rpc ?? "https://api.devnet.solana.com", "confirmed");

/** Ba ca đáng dán nhất khi trình bày, theo thứ tự nên chiếu. */
const NEN_DUNG = ["doi-chu-tai-khoan", "cap-quyen-vuot-so-du", "cap-quyen-vua-du"];

const chon = process.argv[2];
const ds = chon ? [chon] : NEN_DUNG;

const { blockhash } = await conn.getLatestBlockhash();
// Số dư SỐNG: hiện trường hỏng thì ném `HienTruongChuaSan` ngay, trước khi in ra
// một chuỗi base64 mà dán vào Inspector sẽ chỉ nhận về lỗi mô phỏng.
const { soDu: soDuNguon } = await docNguonSong(conn, ht);

console.log("┌─────────────────────────────────────────────────────────────┐");
console.log("│  DÁN VÀO: https://custos-solana.vercel.app/soi.html          │");
console.log("│  Ô “Ví của bạn”: " + ht.nanNhan.slice(0, 20) + "…          │");
console.log("│  ⚠️  Blockhash sống ~90 giây — dán ngay sau khi sinh.        │");
console.log("└─────────────────────────────────────────────────────────────┘\n");

for (const id of ds) {
  const kb = timKichBan(id);
  if (!kb) {
    console.error(`Không có kịch bản "${id}". Có: ${KICH_BAN.map((k) => k.id).join(", ")}`);
    process.exit(1);
  }
  const b64 = Buffer.from(kb.dungTx(ht, { blockhash, soDuNguon }).serialize()).toString("base64");
  console.log(`━━━ ${kb.tieuDe}`);
  console.log(`    Chờ thấy: ${kb.bangChungMongDoi.maMongDoi.join(", ") || "(engine im — ca đối chứng)"}\n`);
  console.log(b64);
  console.log();
}

console.log("Ví cần bảo vệ (dán vào ô thứ hai):");
console.log(ht.nanNhan);

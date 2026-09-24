/**
 * MÔ PHỎNG TOÀN BỘ PHÒNG KỊCH BẢN TRÊN DEVNET THẬT.
 *
 * Bài này trả lời một câu mà test Node KHÔNG trả lời được: giao dịch dựng ra có
 * được Devnet chấp nhận mô phỏng không, và engine đọc ra mã lý do nào.
 *
 * Nó KHÔNG gửi giao dịch. Chỉ `simulateTransaction` — không ghi gì lên chain, đúng
 * ranh giới đã khoá của dự án.
 *
 * Chạy:  node --experimental-strip-types scripts/ky-thuat/mo-phong-kichban-devnet.ts
 */
import { readFileSync } from "node:fs";
import { Connection } from "@solana/web3.js";
import { inspect } from "@custos-solana/core";
import { dienGiaiKhongAI, boiThoiHan } from "@custos-solana/ai";
import { KICH_BAN } from "../../apps/demo-wallet/src/kichBan.ts";
import { docNguonSong, HienTruongChuaSan } from "../hienTruongSong.ts";

const ht = JSON.parse(readFileSync("apps/demo-wallet/public/hien-truong.json", "utf8"));
const rpc: string = ht.rpc ?? "https://api.devnet.solana.com";
const conn = new Connection(rpc, "confirmed");

console.log(`RPC: ${rpc}`);
console.log(`Nạn nhân: ${ht.nanNhan}\n`);

const { blockhash } = await conn.getLatestBlockhash();
// Số dư SỐNG — cùng nguồn với ví và trang tấn công. Hiện trường hỏng thì dừng ngay:
// chạy chín kịch bản trên một hiện trường hỏng chỉ ra chín dòng "lệch" vô nghĩa.
let soDuNguon: bigint;
try {
  ({ soDu: soDuNguon } = await docNguonSong(conn, ht));
} catch (e) {
  if (e instanceof HienTruongChuaSan) {
    console.error(`HIỆN TRƯỜNG CHƯA SẴN SÀNG: ${e.lyDo}`);
    process.exit(2);
  }
  throw e;
}
console.log(`Số dư sống tài khoản nguồn: ${soDuNguon}`);
const bang: Array<Record<string, unknown>> = [];

for (const kb of KICH_BAN) {
  let dong: Record<string, unknown> = { id: kb.id };
  try {
    const tx = kb.dungTx(ht, { blockhash, soDuNguon });
    const r = await inspect(
      { connection: conn, interpret: boiThoiHan(dienGiaiKhongAI) },
      tx,
      // Cùng cờ với ví — trước đây script tự quyết ở đây và lệch với giao diện.
      kb.khongKhaiNguoiDung ? {} : { nguoiDung: ht.nanNhan },
    );
    dong = {
      ...dong,
      level: r.level,
      ma: r.reasonCodes.join(",") || "(khong)",
      coverage: `${r.coverage.analyzed}/${r.coverage.total}`,
      mongDoi: kb.bangChungMongDoi.maMongDoi.join(",") || "(khong)",
    };
    /*
     * SO HAI CHIỀU, KHÔNG CHỈ MỘT.
     *
     * ⚠️ BẢN ĐẦU CHỈ KIỂM "THIẾU" và nó giấu mất một lỗi thật: ca đối chứng
     * `cap-quyen-vua-du` trả về `danger` + `SPL_APPROVE_DELEGATE_LON`, nhưng vì
     * `maMongDoi` của nó rỗng nên "không thiếu mã nào" ⇒ in ra dấu ✓.
     *
     * Với ca ĐỐI CHỨNG, mã THỪA mới là thứ đáng báo động — nó nghĩa là engine
     * gắn cờ một giao dịch lẽ ra phải im. Một bảng chỉ kiểm chiều thiếu sẽ luôn
     * cho ca âm tính điểm tuyệt đối, kể cả khi nó hỏng hoàn toàn.
     */
    const thieu = kb.bangChungMongDoi.maMongDoi.filter((m) => !r.reasonCodes.includes(m));
    const thua = r.reasonCodes.filter((m) => !kb.bangChungMongDoi.maMongDoi.includes(m));
    const laDoiChung = kb.nhom === "doiChung";
    const van: string[] = [];
    if (thieu.length) van.push(`THIEU:${thieu.join(",")}`);
    // Mã thừa chỉ tính là vấn đề ở ca đối chứng — ca tấn công có thêm mã thông tin là bình thường.
    if (laDoiChung && thua.length) van.push(`THUA:${thua.join(",")}`);
    if (laDoiChung && r.level === "danger") van.push("DOI-CHUNG BI GAN DO");
    dong["khop"] = van.length === 0 ? "✓" : van.join(" ");
  } catch (e) {
    dong["level"] = "LOI";
    dong["ma"] = e instanceof Error ? e.message.slice(0, 80) : String(e).slice(0, 80);
    dong["khop"] = "✗";
  }
  bang.push(dong);
  console.log(
    `${(dong["khop"] as string).padEnd(24)} ${kb.id.padEnd(30)} ${String(dong["level"]).padEnd(8)} ${dong["ma"]}`,
  );
}

const loi = bang.filter((d) => d["level"] === "LOI").length;
const lech = bang.filter((d) => d["khop"] !== "✓").length;
console.log(`\nTổng: ${bang.length} kịch bản · ${loi} lỗi dựng/mô phỏng · ${lech} lệch kỳ vọng`);

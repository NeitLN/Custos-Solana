/**
 * Dựng HIỆN TRƯỜNG MAINNET để quay demo "tiền thật".
 *
 *   node --env-file=apps/demo-wallet/.env.development.local \
 *        scripts/dung-hien-truong-mainnet.mjs <ĐỊA_CHỈ_VÍ_THỨ_HAI>
 *
 * Khác bản devnet ở ba điểm, và cả ba là chủ ý:
 *
 *   1. Rút SOL native, không phải token — mainnet không mint token giả được.
 *   2. Ghi ra `hien-truong-mainnet.json` (đã gitignore), KHÔNG đè file devnet.
 *      Bản deploy công khai vẫn devnet; file này chỉ sống trên máy quay.
 *   3. Nạn nhân = CHÍNH ví mẫu của bạn (đã nạp SOL thật), kẻ tấn công = ví thứ
 *      hai của bạn. Không có nạn nhân thật nào — bạn chuyển tiền của mình cho
 *      mình, để quay Custos bắt được nó.
 *
 * KHÔNG in khoá bí mật. Chỉ đọc public key từ VITE_DEMO_SECRET.
 */
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { writeFileSync, mkdirSync } from "node:fs";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://solana-rpc.publicnode.com";
const HO_SO = "apps/demo-wallet/public/hien-truong-mainnet.json";
const RESERVE = Math.floor(0.003 * LAMPORTS_PER_SOL); // chừa cho phí + rent

const keTanCong = process.argv[2];
if (!keTanCong) {
  console.error("Thiếu địa chỉ ví thứ hai.\n  node --env-file=... scripts/dung-hien-truong-mainnet.mjs <ĐỊA_CHỈ>");
  process.exit(1);
}
try { new PublicKey(keTanCong); } catch { console.error("Địa chỉ không hợp lệ:", keTanCong); process.exit(1); }

const secret = process.env["VITE_DEMO_SECRET"];
if (!secret) { console.error("Không đọc được VITE_DEMO_SECRET. Chạy với --env-file=apps/demo-wallet/.env.development.local"); process.exit(1); }
const nanNhan = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(secret))).publicKey;

const conn = new Connection(RPC, "confirmed");
const soDu = await conn.getBalance(nanNhan);
console.log("ví mẫu (nạn nhân):", nanNhan.toBase58());
console.log("số dư hiện tại   :", (soDu / LAMPORTS_PER_SOL).toFixed(6), "SOL");

if (soDu <= RESERVE) {
  console.error(`\nVí chưa đủ SOL. Nạp thêm vào ${nanNhan.toBase58()} rồi chạy lại.`);
  process.exit(1);
}
const soLamport = soDu - RESERVE;

const ht = {
  loai: "sol",
  rpc: RPC,
  kyHieu: "SOL",
  decimals: 9,
  nanNhan: nanNhan.toBase58(),
  keTanCong,
  soLamport: String(soLamport),
  // Các trường dưới đây KHÔNG dùng ở đường SOL, chỉ để khớp kiểu HienTruong.
  mint: nanNhan.toBase58(),
  taiKhoanNanNhan: nanNhan.toBase58(),
  taiKhoanKeTanCong: keTanCong,
  banBe: nanNhan.toBase58(),
  taiKhoanBanBe: nanNhan.toBase58(),
  soLuong: String(soLamport),
  dungLuc: new Date().toISOString(),
};

mkdirSync("apps/demo-wallet/public", { recursive: true });
writeFileSync(HO_SO, JSON.stringify(ht, null, 2));
console.log("\n✓ Đã ghi", HO_SO);
console.log("  sẽ rút:", (soLamport / LAMPORTS_PER_SOL).toFixed(6), "SOL về", keTanCong);
console.log("\nQuay demo: mở  http://localhost:5189/?that=1  rồi bấm nhận quà.");
console.log("Ví sẽ mở ở  http://localhost:5188/?that=1  và Custos cảnh báo TRƯỚC khi ký.");

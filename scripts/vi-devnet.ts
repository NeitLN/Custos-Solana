import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { DEFAULT_DEMO_WALLET, DEMO_FAUCET_URL } from "./demo-wallet-config.ts";

/**
 * Ví ký cố định cho các script devnet.
 *
 * Lưu ở `.devnet/` — thư mục này ĐÃ nằm trong .gitignore. Khoá riêng không bao
 * giờ được lên repo. Nếu thấy nó xuất hiện trong `git status`, dừng lại ngay.
 *
 * Vì sao phải cố định thay vì sinh mới mỗi lần: ví sinh mới thì lần nạp tiền
 * trước đó mất trắng. Kế hoạch demo yêu cầu "ví nạp sẵn" — ví ephemeral không
 * nạp sẵn được.
 */
const DUONG_DAN = ".devnet/vi-demo.json";

export function napVi(duongDan = DUONG_DAN): Keypair {
  if (existsSync(duongDan)) {
    const raw = JSON.parse(readFileSync(duongDan, "utf8")) as number[];
    const key = Keypair.fromSecretKey(Uint8Array.from(raw));
    if (duongDan === DUONG_DAN && key.publicKey.toBase58() !== DEFAULT_DEMO_WALLET) {
      throw new Error("Keypair local không khớp ví demo mặc định. Không tự thay ví hoặc ghi đè khoá.");
    }
    return key;
  }
  if (duongDan === DUONG_DAN) throw new Error(`Thiếu ${DUONG_DAN}. Cần keypair của ${DEFAULT_DEMO_WALLET}; không tạo ví mới thay thế.`);
  const kp = Keypair.generate();
  mkdirSync(dirname(duongDan), { recursive: true });
  writeFileSync(duongDan, JSON.stringify([...kp.secretKey]));
  return kp;
}

export const RPC = process.env["CUSTOS_RPC"] ?? "https://api.devnet.solana.com";

export async function soDu(kp: Keypair, rpc = RPC): Promise<number> {
  const c = new Connection(rpc, "confirmed");
  return (await c.getBalance(kp.publicKey)) / LAMPORTS_PER_SOL;
}

// Chạy trực tiếp: in địa chỉ và số dư.
if (process.argv[1]?.endsWith("vi-devnet.ts")) {
  const kp = napVi();
  console.log("Ví ký devnet:", kp.publicKey.toBase58());
  console.log("Khoá lưu tại:", DUONG_DAN, "(đã gitignore)");
  console.log("Faucet Devnet:", DEMO_FAUCET_URL);
  void soDu(kp).then((s) => {
    console.log("Số dư      :", s, "SOL");
    if (s === 0) {
      console.log("\n⚠️  Ví chưa có tiền. Chuyển khoảng 2 SOL devnet sang địa chỉ trên.");
    }
  });
}

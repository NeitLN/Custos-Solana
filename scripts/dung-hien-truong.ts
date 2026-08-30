/**
 * Dựng (hoặc dựng lại) hiện trường demo trên devnet.
 *
 *   node --experimental-strip-types scripts/dung-hien-truong.ts
 *
 * Chạy lại được bao nhiêu lần tuỳ ý — và PHẢI chạy lại sau mỗi lần diễn nhịp 1,
 * vì `SetAuthority` làm tài khoản token đổi chủ, dùng lại không được nữa.
 *
 * Mint chỉ tạo một lần rồi giữ nguyên; mỗi lần dựng lại chỉ tạo tài khoản token
 * mới cho nạn nhân. Vì vậy dựng lại nhanh, hợp cho lúc tập pitch.
 */
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ACCOUNT_SIZE, TOKEN_PROGRAM_ID, createMint, createInitializeAccountInstruction,
  getMinimumBalanceForRentExemptAccount, getOrCreateAssociatedTokenAccount, mintTo,
} from "@solana/spl-token";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { napVi, RPC } from "./vi-devnet.ts";

const DEC = 6;
const SO_LUONG = 500n * 10n ** BigInt(DEC);
const HO_SO = ".devnet/hien-truong.json";
const CONG_KHAI = "apps/demo-wallet/public/hien-truong.json";

export type HienTruong = {
  rpc: string;
  mint: string;
  kyHieu: string;
  decimals: number;
  nanNhan: string;
  taiKhoanNanNhan: string;
  keTanCong: string;
  taiKhoanKeTanCong: string;
  banBe: string;
  taiKhoanBanBe: string;
  soLuong: string;
  dungLuc: string;
};

/** Tài khoản token KHÔNG phải ATA — địa chỉ ngẫu nhiên nên tạo mới được nhiều lần. */
async function taoTaiKhoanToken(conn: Connection, tra: Keypair, mint: PublicKey, chu: PublicKey) {
  const kp = Keypair.generate();
  const lamports = await getMinimumBalanceForRentExemptAccount(conn);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: tra.publicKey, newAccountPubkey: kp.publicKey,
      space: ACCOUNT_SIZE, lamports, programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeAccountInstruction(kp.publicKey, mint, chu, TOKEN_PROGRAM_ID),
  );
  await sendAndConfirmTransaction(conn, tx, [tra, kp], { commitment: "confirmed" });
  return kp.publicKey;
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const nanNhan = napVi();
  const sol = (await conn.getBalance(nanNhan.publicKey)) / LAMPORTS_PER_SOL;
  console.log("ví nạn nhân:", nanNhan.publicKey.toBase58(), `(${sol} SOL)`);
  if (sol < 0.05) throw new Error("không đủ SOL trả phí");

  const cu: Partial<HienTruong> = existsSync(HO_SO)
    ? (JSON.parse(readFileSync(HO_SO, "utf8")) as HienTruong)
    : {};

  // Mint giữ nguyên giữa các lần dựng lại — đỡ tốn thời gian lúc tập pitch.
  let mint: PublicKey;
  if (cu.mint) {
    mint = new PublicKey(cu.mint);
    console.log("dùng lại mint:", mint.toBase58());
  } else {
    console.log("tạo mint mới…");
    mint = await createMint(conn, nanNhan, nanNhan.publicKey, null, DEC);
    console.log("  mint:", mint.toBase58());
  }

  const keTanCong = cu.keTanCong ? new PublicKey(cu.keTanCong) : Keypair.generate().publicKey;
  const banBe = cu.banBe ? new PublicKey(cu.banBe) : Keypair.generate().publicKey;

  console.log("tạo tài khoản token mới cho nạn nhân…");
  const tkNanNhan = await taoTaiKhoanToken(conn, nanNhan, mint, nanNhan.publicKey);
  await mintTo(conn, nanNhan, mint, tkNanNhan, nanNhan, SO_LUONG);
  console.log("  tài khoản:", tkNanNhan.toBase58());
  console.log("  số dư    :", (await conn.getTokenAccountBalance(tkNanNhan)).value.uiAmountString);

  // Bên nhận phải tồn tại sẵn, nếu không Transfer sẽ lỗi.
  const tkKeTanCong = cu.taiKhoanKeTanCong
    ? new PublicKey(cu.taiKhoanKeTanCong)
    : (await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, keTanCong)).address;
  const tkBanBe = cu.taiKhoanBanBe
    ? new PublicKey(cu.taiKhoanBanBe)
    : (await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, banBe)).address;

  const ht: HienTruong = {
    rpc: RPC,
    mint: mint.toBase58(),
    kyHieu: "USDC-demo",
    decimals: DEC,
    nanNhan: nanNhan.publicKey.toBase58(),
    taiKhoanNanNhan: tkNanNhan.toBase58(),
    keTanCong: keTanCong.toBase58(),
    taiKhoanKeTanCong: tkKeTanCong.toBase58(),
    banBe: banBe.toBase58(),
    taiKhoanBanBe: tkBanBe.toBase58(),
    soLuong: SO_LUONG.toString(),
    dungLuc: new Date().toISOString(),
  };

  mkdirSync(".devnet", { recursive: true });
  mkdirSync("apps/demo-wallet/public", { recursive: true });

  // BẢN CÔNG KHAI KHÔNG ĐƯỢC MANG KHOÁ RPC.
  //
  // `RPC` đọc từ `CUSTOS_RPC`, và một endpoint riêng thường có dạng
  // `https://devnet.helius-rpc.com/?api-key=...`. File này được commit và deploy lên
  // GitHub Pages — ghi nguyên URL đó vào là đẩy khoá lên mạng công khai.
  //
  // Bản trong `.devnet/` (đã gitignore) giữ URL đầy đủ để script chạy nhanh; bản công
  // khai luôn dùng endpoint công cộng. Người xem demo cũng KHÔNG nên tiêu hạn mức của
  // đội — nên đây vừa là vá bảo mật vừa là hành vi đúng.
  const boKhoa = (u: string) => {
    try {
      const url = new URL(u);
      if (!url.search && !url.username) return u;
      return "https://api.devnet.solana.com";
    } catch {
      return "https://api.devnet.solana.com";
    }
  };

  const noiDung = JSON.stringify(ht, null, 2);
  const noiDungCongKhai = JSON.stringify({ ...ht, rpc: boKhoa(ht.rpc) }, null, 2);
  writeFileSync(HO_SO, noiDung);
  writeFileSync(CONG_KHAI, noiDungCongKhai);

  console.log("\n✓ hiện trường sẵn sàng");
  console.log("  ", HO_SO);
  console.log("  ", CONG_KHAI, "(Demo Wallet đọc file này)");
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});

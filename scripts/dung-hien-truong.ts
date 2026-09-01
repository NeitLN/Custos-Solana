/**
 * Dựng (hoặc dựng lại) hiện trường demo trên devnet.
 *
 *   node --experimental-strip-types scripts/dung-hien-truong.ts
 *
 * Chạy lại được bao nhiêu lần tuỳ ý — và PHẢI chạy lại sau mỗi lần diễn nhịp 1,
 * vì `SetAuthority` làm tài khoản token đổi chủ, dùng lại không được nữa.
 *
 * Mỗi lần dựng tạo một mint MỚI, mint đủ token rồi THU HỒI quyền phát hành — nhờ
 * vậy giao dịch lành tính (chuyển token) không bị gắn cờ oan. Xem chú thích ở
 * chỗ tạo mint bên dưới.
 */
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ACCOUNT_SIZE, TOKEN_PROGRAM_ID, createMint, createInitializeAccountInstruction,
  getMinimumBalanceForRentExemptAccount, getOrCreateAssociatedTokenAccount, mintTo,
  setAuthority, AuthorityType,
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

  // LUÔN tạo mint MỚI, không tái dùng. Lý do: cuối hàm ta THU HỒI quyền phát hành
  // để giao dịch lành tính (chuyển token) không bị luật MINT_AUTHORITY_CHUA_THU_HOI
  // gắn cờ. Mint đã thu hồi thì không mintTo lại được — nên mỗi lần dựng phải là
  // mint mới, mint đủ 500 rồi mới khoá.
  console.log("tạo mint mới…");
  const mint = await createMint(conn, nanNhan, nanNhan.publicKey, null, DEC);
  console.log("  mint:", mint.toBase58());

  const keTanCong = cu.keTanCong ? new PublicKey(cu.keTanCong) : Keypair.generate().publicKey;
  const banBe = cu.banBe ? new PublicKey(cu.banBe) : Keypair.generate().publicKey;

  console.log("tạo tài khoản token mới cho nạn nhân…");
  const tkNanNhan = await taoTaiKhoanToken(conn, nanNhan, mint, nanNhan.publicKey);
  await mintTo(conn, nanNhan, mint, tkNanNhan, nanNhan, SO_LUONG);
  console.log("  tài khoản:", tkNanNhan.toBase58());
  console.log("  số dư    :", (await conn.getTokenAccountBalance(tkNanNhan)).value.uiAmountString);

  // THU HỒI quyền phát hành — token demo trở thành token "đàng hoàng".
  // Không có bước này, mọi giao dịch chạm token (kể cả chuyển cho bạn bè) đều mang
  // mã MINT_AUTHORITY_CHUA_THU_HOI, và nút demo lành tính trông như báo nhầm.
  await setAuthority(conn, nanNhan, mint, nanNhan, AuthorityType.MintTokens, null);
  console.log("  đã thu hồi quyền phát hành mint");

  // Bên nhận phải tồn tại sẵn, nếu không Transfer sẽ lỗi.
  //
  // KHÔNG tái dùng ATA từ hiện trường cũ: mint nay tạo mới mỗi lần dựng, nên ATA cũ
  // thuộc mint CŨ và Transfer sẽ lỗi "Account not associated with this Mint". Ví
  // (keTanCong/banBe) giữ nguyên được — ATA suy ra từ ví + mint, tự khớp mint mới.
  const tkKeTanCong = (await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, keTanCong)).address;
  const tkBanBe = (await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, banBe)).address;

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

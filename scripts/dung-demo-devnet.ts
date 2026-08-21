/**
 * Dựng toàn bộ hiện trường demo trên devnet THẬT.
 *
 *   1. tạo mint SPL riêng (6 chữ số thập phân)
 *   2. mint 500 token vào ví nạn nhân
 *   3. dựng giao dịch tấn công, chạy inspect() -> verdict phải là ĐỎ
 *   4. KÝ và gửi lên devnet -> link Explorer verify được
 *   5. đọc lại trạng thái sau để chứng minh hậu quả là thật
 *
 *   node --experimental-strip-types scripts/dung-demo-devnet.ts
 */
import {
  Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, Transaction,
} from "@solana/web3.js";
import {
  createMint, getOrCreateAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { writeFileSync, mkdirSync } from "node:fs";
import { napVi, RPC } from "./vi-devnet.ts";
import { dungGiaoDichTanCong } from "./tan-cong.ts";
import { inspect } from "../packages/core/src/inspect.ts";
import { dienGiaiKhongAI } from "../packages/ai/src/index.ts";

const DEC = 6;
const SO_LUONG = 500n * 10n ** BigInt(DEC);
const ex = (sig: string) => `https://explorer.solana.com/tx/${sig}?cluster=devnet`;

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const nanNhan = napVi();
  const keTanCong = Keypair.generate();

  const sol = (await conn.getBalance(nanNhan.publicKey)) / LAMPORTS_PER_SOL;
  console.log("ví nạn nhân :", nanNhan.publicKey.toBase58(), `(${sol} SOL)`);
  if (sol < 0.05) throw new Error("không đủ SOL trả phí");
  console.log("kẻ tấn công :", keTanCong.publicKey.toBase58());

  // ── 1. mint riêng ────────────────────────────────────────────
  console.log("\n[1] tạo mint SPL…");
  const mint = await createMint(conn, nanNhan, nanNhan.publicKey, null, DEC, undefined, undefined, TOKEN_PROGRAM_ID);
  console.log("    mint:", mint.toBase58());

  // ── 2. mint token cho nạn nhân ───────────────────────────────
  console.log("[2] mint 500 token cho nạn nhân…");
  const ataNanNhan = await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, nanNhan.publicKey);
  await mintTo(conn, nanNhan, mint, ataNanNhan.address, nanNhan, SO_LUONG);
  // ATA của kẻ tấn công phải tồn tại trước, nếu không Transfer sẽ lỗi.
  const ataKeTanCong = await getOrCreateAssociatedTokenAccount(conn, nanNhan, mint, keTanCong.publicKey);
  console.log("    ATA nạn nhân :", ataNanNhan.address.toBase58());
  console.log("    số dư        :", (await conn.getTokenAccountBalance(ataNanNhan.address)).value.uiAmountString);

  // ── 3. kiểm tra TRƯỚC khi ký — đây là toàn bộ mục đích sản phẩm ──
  console.log("\n[3] dựng giao dịch tấn công và chạy inspect()…");
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const tx = dungGiaoDichTanCong({
    nanNhan: nanNhan.publicKey, keTanCong: keTanCong.publicKey, mint,
    soLuong: SO_LUONG, blockhash,
  });

  const kq = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, tx, { locale: "vi" });

  console.log("\n╔══════════════════ KẾT QUẢ CUSTOS ══════════════════╗");
  console.log("  mức        :", kq.level.toUpperCase());
  console.log("  giải thích :", kq.explanation);
  console.log("  bảng chênh lệch:");
  for (const d of kq.diff) console.log(`    ${d.label.padEnd(38)} ${d.before} → ${d.after}   [${d.severity}]`);
  console.log("  coverage   :", `đã đọc hiểu ${kq.coverage.analyzed}/${kq.coverage.total} lệnh,`,
    `${kq.coverage.unverifiedPrograms} chương trình chưa xác minh`);
  console.log("  mã lý do   :", kq.reasonCodes.join(", "));
  console.log("╚═══════════════════════════════════════════════════╝");

  if (kq.level !== "danger") throw new Error(`kỳ vọng danger, nhận được ${kq.level}`);

  // ── 4. ký và gửi — để có bằng chứng trên Explorer ─────────────
  console.log("\n[4] ký và gửi lên devnet…");
  tx.sign([nanNhan]);
  const sig = await conn.sendTransaction(tx, { skipPreflight: false });
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  console.log("    ✓", ex(sig));

  // ── 5. hậu quả thật ──────────────────────────────────────────
  console.log("\n[5] đọc lại trạng thái sau khi ký…");
  const sau = await conn.getParsedAccountInfo(ataNanNhan.address);
  const info = (sau.value?.data as { parsed?: { info?: { owner?: string; tokenAmount?: { uiAmountString?: string } } } })?.parsed?.info;
  console.log("    số dư ATA nạn nhân :", info?.tokenAmount?.uiAmountString);
  console.log("    chủ sở hữu bây giờ :", info?.owner);
  console.log("    (trước đó là       :", nanNhan.publicKey.toBase58(), ")");

  mkdirSync(".devnet", { recursive: true });
  writeFileSync(
    ".devnet/hien-truong.json",
    JSON.stringify(
      {
        mint: mint.toBase58(),
        nanNhan: nanNhan.publicKey.toBase58(),
        keTanCong: keTanCong.publicKey.toBase58(),
        ataNanNhan: ataNanNhan.address.toBase58(),
        ataKeTanCong: ataKeTanCong.address.toBase58(),
        chuKyTanCong: sig,
        explorer: ex(sig),
        luc: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log("\n→ đã ghi .devnet/hien-truong.json");
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});

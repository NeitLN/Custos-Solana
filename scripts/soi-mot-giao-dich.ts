/**
 * Chạy Custos trên MỘT giao dịch mainnet có thật.
 *
 *   node --experimental-strip-types scripts/soi-mot-giao-dich.ts <chữ-ký>
 *
 * Không có tham số thì lấy một giao dịch SPL Token gần đây nhất trên mainnet.
 * Đây là cách nhanh nhất để trả lời câu "sản phẩm chạy thật hay chỉ demo".
 */
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../packages/core/src/inspect.ts";
import { dienGiaiKhongAI, boiThoiHan } from "../packages/ai/src/index.ts";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("soi-mot-giao-dich.ts", RPC);
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

async function main() {
  const conn = new Connection(RPC, "confirmed");
  let sig = process.argv[2];
  if (!sig) {
    const ds = await conn.getSignaturesForAddress(TOKEN, { limit: 12 });
    sig = ds.find((x) => x.err === null)!.signature;
  }
  const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
  if (!tx) { console.log("không lấy được giao dịch"); return; }

  const vt = new VersionedTransaction(
    tx.transaction.message,
    tx.transaction.signatures.map(() => new Uint8Array(64)),
  );
  const r = await inspect(
    { connection: conn, interpret: boiThoiHan(dienGiaiKhongAI) },
    vt,
    { locale: "vi" },
  );

  console.log(`\nGiao dịch mainnet THẬT`);
  console.log(`https://solscan.io/tx/${sig}\n`);
  console.log(`  verdict     : ${r.level}`);
  console.log(`  mã lý do    : ${r.reasonCodes.join(", ") || "(không có)"}`);
  console.log(`  đọc hiểu    : ${r.coverage.analyzed}/${r.coverage.total} lệnh`);
  console.log(`  hành động   : ${r.detectedPrimaryAction?.type ?? "(không nhận diện được)"}`);
  console.log(`\n  giải thích  : ${r.explanation}`);
  if (r.diff.length) {
    console.log(`\n  bảng chênh lệch:`);
    for (const d of r.diff) console.log(`    ${d.label.padEnd(34)} ${d.before} → ${d.after}  [${d.severity}]`);
  }
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

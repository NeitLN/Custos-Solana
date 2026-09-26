/**
 * CA CPI THẬT TRÊN DEVNET — chỉ MÔ PHỎNG, không ký, không gửi.
 *
 *   npm run cpi-devnet
 *   CUSTOS_RPC=<endpoint devnet khác> npm run cpi-devnet   # khi api.devnet treo với máy này
 *
 * Chương trình Associated Token tạo tài khoản token bằng CPI vào System Program
 * (`createAccount`) và SPL Token (`initializeAccount3`). Đây là CPI lành, có thật, do chương
 * trình đã xác minh thực hiện — không viết chương trình đạo cụ nào (quyết định đã khoá số 5).
 *
 * Nó chứng minh một điều hẹp và kiểm được: L1 thấy và đọc hiểu các lệnh LỒNG trong kết quả
 * mô phỏng thật của Solana, và một CPI lành của chương trình đã xác minh không bị gắn cờ oan.
 * Ca CPI giấu hậu quả nguy hiểm dùng RPC giả: `packages/core/test/cpiDauCuoi.test.ts`.
 */
import { readFileSync } from "node:fs";
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { inspect } from "../../packages/core/src/inspect.ts";
import { extractFacts } from "../../packages/core/src/l1/fetch.ts";
import { dienGiaiKhongAI } from "../../packages/ai/src/index.ts";
import { ketNoiDuPhong } from "../rpcDuPhong.ts";

const ht = JSON.parse(readFileSync("apps/demo-wallet/public/hien-truong.json", "utf8"));
const rpc = process.env["CUSTOS_RPC"] || ht.rpc || "https://api.devnet.solana.com";
const conn = ketNoiDuPhong([rpc]);

const nguoiTra = new PublicKey(ht.nanNhan); // ví demo cố định — chỉ dùng làm người trả phí khi mô phỏng
const mint = new PublicKey(ht.mint);
const chuMoi = Keypair.generate().publicKey; // chủ ngẫu nhiên ⇒ tài khoản chắc chắn chưa có
const ata = getAssociatedTokenAddressSync(mint, chuMoi);

const { blockhash } = await conn.getLatestBlockhash("confirmed");
const tx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: nguoiTra,
    recentBlockhash: blockhash,
    instructions: [createAssociatedTokenAccountIdempotentInstruction(nguoiTra, ata, chuMoi, mint)],
  }).compileToV0Message(),
);

const facts = await extractFacts(conn, tx, nguoiTra.toBase58());
const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, tx, { nguoiDung: nguoiTra.toBase58(), locale: "vi" });

const inner = facts.instructions.filter((ix) => ix.isInner);
console.log(`RPC: ${new URL(rpc).host}`);
console.log(`mô phỏng: ${facts.simulationOk ? "OK" : `HỎNG — ${facts.simulationError}`}`);
console.log(`lệnh ngoài: ${facts.instructions.filter((ix) => !ix.isInner).map((ix) => `${ix.programId.slice(0, 6)}… ${ix.decoded?.kind ?? "(chưa đọc)"}`).join(", ")}`);
console.log(`lệnh LỒNG (CPI): ${inner.length} — ${inner.map((ix) => `${ix.programId.slice(0, 6)}… ${ix.decoded?.kind ?? "(chưa đọc)"}`).join(", ")}`);
console.log(`mức: ${r.level} · mã: ${r.reasonCodes.join(",") || "(không)"} · đọc hiểu ${r.coverage.analyzed}/${r.coverage.total}`);

const dat = facts.simulationOk && inner.length > 0 && inner.every((ix) => ix.decoded !== null) && r.level !== "danger";
console.log(dat ? "\nCPI-DEVNET-OK — thấy và đọc hiểu mọi lệnh lồng; CPI lành không bị cáo buộc" : "\nCPI-DEVNET-CHUA-DAT");
process.exitCode = dat ? 0 : 1;

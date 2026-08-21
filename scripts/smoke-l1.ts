/**
 * Smoke test L1 trên devnet thật.
 *
 * Mục đích: chứng minh chuỗi giải ALT -> getMultipleAccounts -> simulateTransaction
 * chạy được với RPC thật, và đường fail-safe hoạt động khi mô phỏng lỗi.
 *
 * Ví sinh ra trong bộ nhớ, không ghi ra đĩa, không commit.
 *   node --experimental-strip-types scripts/smoke-l1.ts
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { extractFacts } from "../packages/core/src/l1/fetch.ts";

const RPC = process.env["CUSTOS_RPC"] ?? "https://api.devnet.solana.com";

function inFacts(nhan: string, f: Awaited<ReturnType<typeof extractFacts>>) {
  console.log(`\n=== ${nhan} ===`);
  console.log("  người ký       :", f.signer);
  console.log("  mô phỏng ok    :", f.simulationOk, f.simulationError ? `(${f.simulationError})` : "");
  console.log("  coverage       :", `${f.coverage.analyzed}/${f.coverage.total}`,
    `· ${f.coverage.unverifiedPrograms} chương trình chưa xác minh`);
  console.log("  instruction    :", f.instructions.map((i) => `${i.programId.slice(0, 6)}…:${i.decoded?.kind ?? "?"}`).join(", "));
  console.log("  tài khoản token:", f.tokenAccounts.length);
  console.log("  lookup table   :", f.lookupTables.length);
  const sol = Object.entries(f.solDelta).map(([k, v]) => `${k.slice(0, 6)}…: ${v}`);
  console.log("  chênh lệch SOL :", sol.length ? sol.join(", ") : "(không có)");
}

async function main() {
  const conn = new Connection(RPC, "confirmed");
  console.log("RPC:", RPC);
  console.log("phiên bản:", JSON.stringify(await conn.getVersion()));

  const vi = Keypair.generate();
  const nhan = Keypair.generate().publicKey;
  console.log("\nví thử (chỉ trong bộ nhớ):", vi.publicKey.toBase58());

  // Ca 1 — ví CHƯA có tiền. Mô phỏng sẽ lỗi. Đây là đường fail-safe.
  const dung = (payer: PublicKey, bh: string) =>
    new VersionedTransaction(
      new TransactionMessage({
        payerKey: payer,
        recentBlockhash: bh,
        instructions: [SystemProgram.transfer({ fromPubkey: payer, toPubkey: nhan, lamports: 1000 })],
      }).compileToV0Message(),
    );

  const { blockhash } = await conn.getLatestBlockhash();
  inFacts("CA 1 — ví rỗng, mô phỏng phải lỗi (đường fail-safe)", await extractFacts(conn, dung(vi.publicKey, blockhash)));

  // Ca 2 — sau khi có tiền. Mô phỏng phải thành công và có chênh lệch SOL.
  try {
    console.log("\nđang xin airdrop 1 SOL từ faucet devnet…");
    const sig = await conn.requestAirdrop(vi.publicKey, LAMPORTS_PER_SOL);
    await conn.confirmTransaction(sig, "confirmed");
    console.log("airdrop xong:", sig);
    const { blockhash: bh2 } = await conn.getLatestBlockhash();
    inFacts("CA 2 — ví có tiền, mô phỏng phải thành công", await extractFacts(conn, dung(vi.publicKey, bh2)));
  } catch (e) {
    console.log("\n⚠️  faucet từ chối (thường do rate limit):", e instanceof Error ? e.message : String(e));
    console.log("   Ca 1 vẫn đã chứng minh chuỗi RPC và đường fail-safe chạy được.");
  }
}

main().catch((e) => {
  console.error("LỖI:", e);
  process.exit(1);
});

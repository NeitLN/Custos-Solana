/**
 * Trong các chương trình ĐÃ XÁC MINH, lệnh nào vẫn chưa decode được?
 *
 *   node --experimental-strip-types scripts/soi-lenh-chua-decode.ts [số tx]
 *
 * Kết quả rỗng là điều kiện phải giữ: một chương trình nằm trong
 * VERIFIED_PROGRAMS mà có lệnh không decode nổi thì "đã xác minh" là nói quá.
 * Đúng lý do SPL Memo bị gỡ khỏi danh sách, và đúng lỗi Orca Whirlpool đã mắc.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";
import { decodeInstruction } from "../packages/core/src/l1/decode.ts";
import { giaiBase58 } from "../packages/core/src/l1/base58.ts";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("soi-lenh-chua-decode.ts", RPC);
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const soTx = Number(process.argv[2] ?? 40);
  const conn = new Connection(RPC, "confirmed");
  const sigs = await conn.getSignaturesForAddress(TOKEN, { limit: soTx * 2 });
  const chua = new Map<string, number>();
  let n = 0, tong = 0, hieu = 0;

  for (const s of sigs.filter((x) => x.err === null)) {
    if (n >= soTx) break;
    try {
      const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
      if (!tx) continue;
      n++;
      const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta?.loadedAddresses });
      const xet = (pid: string, data: Uint8Array) => {
        tong++;
        const d = decodeInstruction(pid, data);
        if (d) { hieu++; return; }
        if (!VERIFIED_PROGRAMS.has(pid)) return;
        const tag = data.length === 0 ? "(rỗng)" : `tag ${data[0]}`;
        const k = `${VERIFIED_PROGRAMS.get(pid)}  ${tag}`;
        chua.set(k, (chua.get(k) ?? 0) + 1);
      };
      for (const ix of tx.transaction.message.compiledInstructions) {
        xet(keys.get(ix.programIdIndex)!.toBase58(), ix.data);
      }
      for (const g of tx.meta?.innerInstructions ?? []) {
        for (const ix of g.instructions) {
          xet(keys.get(ix.programIdIndex)!.toBase58(), giaiBase58(ix.data) ?? new Uint8Array(0));
        }
      }
      await nghi(250);
    } catch { /* bỏ */ }
  }
  console.log(`\n${n} giao dịch · ${tong} lệnh · decode được ${hieu} (${(hieu/tong*100).toFixed(0)}%)\n`);
  console.log("LỆNH CHƯA DECODE, trong chương trình ĐÃ XÁC MINH — chỗ rẻ nhất để thu hồi:");
  for (const [k, c] of [...chua.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(c).padStart(3)}x  ${k}`);
  }
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

/**
 * Khảo sát lưu lượng mainnet: chương trình nào chiếm nhiều lệnh nhất, và mỗi
 * chương trình dùng những discriminator nào.
 *
 *   node --experimental-strip-types scripts/khao-sat-chuong-trinh.ts [số tx]
 *
 * Đây là công cụ quyết định VIẾT DECODER TIẾP CHO AI. Với chương trình Anchor,
 * discriminator là 8 byte đầu của sha256("global:<tên lệnh>") — đối chiếu bảng
 * này với hash tự tính là biết tên lệnh mà không cần IDL, và biết CHẮC chứ
 * không phải đoán.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("khao-sat-chuong-trinh.ts", RPC);
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function giai58(s: string): Uint8Array {
  const so: number[] = [];
  for (const ch of s) {
    let m = B58.indexOf(ch);
    if (m < 0) return new Uint8Array(0);
    for (let j = 0; j < so.length; j++) { m += so[j]! * 58; so[j] = m & 0xff; m >>= 8; }
    while (m > 0) { so.push(m & 0xff); m >>= 8; }
  }
  let z = 0; while (z < s.length && s[z] === "1") z++;
  const ra = new Uint8Array(z + so.length);
  for (let i = 0; i < so.length; i++) ra[z + i] = so[so.length - 1 - i]!;
  return ra;
}

async function main() {
  const soTx = Number(process.argv[2] ?? 40);
  const conn = new Connection(RPC, "confirmed");
  const sigs = await conn.getSignaturesForAddress(TOKEN, { limit: soTx * 2 });

  const theoProgram = new Map<string, number>();
  const disc = new Map<string, Map<string, number>>();
  let n = 0;

  for (const s of sigs.filter((x) => x.err === null)) {
    if (n >= soTx) break;
    try {
      const tx = await conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
      if (!tx) continue;
      n++;
      const keys = tx.transaction.message.getAccountKeys({
        accountKeysFromLookups: tx.meta?.loadedAddresses,
      });
      const ghi = (pid: string, b: Uint8Array) => {
        theoProgram.set(pid, (theoProgram.get(pid) ?? 0) + 1);
        const d = Array.from(b.slice(0, 8)).map((x) => x.toString(16).padStart(2, "0")).join("");
        if (!disc.has(pid)) disc.set(pid, new Map());
        const m = disc.get(pid)!;
        m.set(d, (m.get(d) ?? 0) + 1);
      };
      for (const ix of tx.transaction.message.compiledInstructions) {
        const pid = keys.get(ix.programIdIndex)!.toBase58();
        ghi(pid, ix.data);
      }
      for (const g of tx.meta?.innerInstructions ?? []) {
        for (const ix of g.instructions) {
          const pid = keys.get(ix.programIdIndex)!.toBase58();
          ghi(pid, giai58(ix.data));
        }
      }
      await nghi(250);
    } catch { /* bỏ qua */ }
  }

  console.log(`\n${n} giao dịch mainnet\n`);
  console.log("CHƯA XÁC MINH — xếp theo số lệnh:");
  const xep = [...theoProgram.entries()].filter(([p]) => !VERIFIED_PROGRAMS.has(p)).sort((a, b) => b[1] - a[1]);
  for (const [p, c] of xep.slice(0, 8)) {
    console.log(`\n  ${String(c).padStart(3)} lệnh  ${p}`);
    const m = [...(disc.get(p) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
    for (const [d, c2] of m) console.log(`         ${String(c2).padStart(3)}x  ${d}`);
  }
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

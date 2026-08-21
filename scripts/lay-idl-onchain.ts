/**
 * Lấy IDL của chương trình Anchor TỪ CHÍNH CHUỖI.
 *
 *   node --experimental-strip-types scripts/lay-idl-onchain.ts <programId>…
 *
 * Vì sao phải làm thế này thay vì tra tên lệnh rồi băm thử: quy tắc đã chốt là
 * KHÔNG ĐOÁN discriminator. Băm thử vài cái tên rồi thấy khớp thì đó là bằng
 * chứng yếu — trùng khớp một chiều không chứng minh mình đã hiểu tập lệnh.
 *
 * Anchor ghi IDL vào một account dẫn xuất theo công thức cố định, và bên trong
 * là JSON nén zlib. Đọc từ đó là đọc thứ chính tác giả chương trình công bố.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

async function diaChiIdl(programId: PublicKey): Promise<PublicKey> {
  const [base] = PublicKey.findProgramAddressSync([], programId);
  return PublicKey.createWithSeed(base, "anchor:idl", programId);
}

const bam = (ten: string) =>
  createHash("sha256").update(`global:${ten}`).digest().subarray(0, 8).toString("hex");

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const ds = process.argv.slice(2);
  if (ds.length === 0) {
    console.log("cần ít nhất một programId");
    return;
  }
  for (const p of ds) {
    const pid = new PublicKey(p);
    const dc = await diaChiIdl(pid);
    process.stdout.write(`\n${p}\n  IDL account: ${dc.toBase58()}\n`);
    const info = await conn.getAccountInfo(dc);
    if (!info) {
      console.log("  KHÔNG có IDL trên chuỗi — không viết decoder cho chương trình này");
      continue;
    }
    try {
      // 8 byte discriminator + 32 byte authority + 4 byte độ dài + dữ liệu nén
      const len = info.data.readUInt32LE(40);
      const json = JSON.parse(inflateSync(info.data.subarray(44, 44 + len)).toString("utf8")) as {
        name?: string;
        instructions?: { name: string }[];
      };
      const ins = json.instructions ?? [];
      console.log(`  tên: ${json.name ?? "(không ghi)"} · ${ins.length} lệnh`);
      for (const i of ins.slice(0, 40)) console.log(`    ${bam(i.name)}  ${i.name}`);
    } catch (e) {
      console.log("  đọc IDL hỏng:", (e as Error).message.slice(0, 60));
    }
  }
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

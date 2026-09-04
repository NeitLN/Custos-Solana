/**
 * Sinh `packages/core/src/l1/bang-idl.ts` từ IDL LẤY TRÊN CHUỖI.
 *
 *   node --experimental-strip-types scripts/tao-bang-idl.ts
 *
 * Không có dòng nào trong bảng sinh ra là do đoán. Mỗi mã lệnh là
 * sha256("global:<tên>")[0..8] với <tên> lấy từ IDL do chính tác giả chương
 * trình ghi lên chuỗi. Chương trình nào không có IDL trên chuỗi thì KHÔNG được
 * thêm vào — thà coverage thấp còn hơn tự nhận đã đọc hiểu.
 */
import { Connection, PublicKey } from "@solana/web3.js";
import { inflateSync } from "node:zlib";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("tao-bang-idl.ts", RPC);

/** Chọn theo TẦN SUẤT đo được trên lưu lượng mainnet, không theo tiếng tăm.
 *  Xem scripts/khao-sat-chuong-trinh.ts. */
const UNG_VIEN = [
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA",
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ",
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
  "DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
  // Thêm 23/08 sau khảo sát vòng hai. Ba ứng viên khác cùng đợt (3QUnrcM,
  // Prism8hs, FaJeucK) KHÔNG công bố IDL trên chuỗi nên KHÔNG được thêm.
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
];

const bam = (t: string) => createHash("sha256").update(`global:${t}`).digest().subarray(0, 8).toString("hex");
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const conn = new Connection(RPC, "confirmed");
  const ra: { pid: string; idl: string; lenh: [string, string][] }[] = [];

  for (const p of UNG_VIEN) {
    const pid = new PublicKey(p);
    const [base] = PublicKey.findProgramAddressSync([], pid);
    const dc = await PublicKey.createWithSeed(base, "anchor:idl", pid);
    const info = await conn.getAccountInfo(dc);
    if (!info) {
      console.log(`bỏ qua ${p} — không có IDL trên chuỗi`);
      await nghi(300);
      continue;
    }
    try {
      const len = info.data.readUInt32LE(40);
      const json = JSON.parse(inflateSync(info.data.subarray(44, 44 + len)).toString("utf8")) as {
        instructions?: { name: string }[];
      };
      const ins = json.instructions ?? [];
      if (ins.length === 0) { console.log(`bỏ qua ${p} — IDL không có lệnh nào`); continue; }
      ra.push({ pid: p, idl: dc.toBase58(), lenh: ins.map((i) => [bam(i.name), i.name]) });
      console.log(`${p}: ${ins.length} lệnh`);
    } catch (e) {
      console.log(`bỏ qua ${p} — đọc IDL hỏng: ${(e as Error).message.slice(0, 50)}`);
    }
    await nghi(300);
  }

  const dong: string[] = [];
  dong.push("/**");
  dong.push(" * BẢNG MÃ LỆNH SINH TỰ ĐỘNG — đừng sửa tay.");
  dong.push(" *");
  dong.push(" *   node --experimental-strip-types scripts/tao-bang-idl.ts");
  dong.push(" *");
  dong.push(" * Mỗi mã là sha256(\"global:<tên lệnh>\")[0..8], với <tên lệnh> lấy từ IDL do");
  dong.push(" * chính tác giả chương trình ghi lên chuỗi Solana. Không dòng nào là phỏng đoán.");
  dong.push(" *");
  dong.push(" * Chương trình không công bố IDL trên chuỗi thì KHÔNG có mặt ở đây, và vẫn bị");
  dong.push(" * đếm là chưa xác minh. Coverage thấp còn hơn tự nhận đã đọc hiểu.");
  dong.push(` * Lấy lúc: ${new Date().toISOString()}`);
  dong.push(" */");
  dong.push("");
  dong.push("/** Anchor gọi lại chính nó để phát log sự kiện, dùng tag cố định này.");
  dong.push(" *  Lệnh đó chỉ nhận hai account và không ghi vào đâu — nó không di chuyển được");
  dong.push(" *  tài sản. Không có trong IDL vì nó thuộc khung Anchor, không thuộc chương trình. */");
  dong.push('export const ANCHOR_EVENT_CPI = "e445a52e51cb9a1d";');
  dong.push("");
  dong.push("type BangLenh = Readonly<Record<string, string>>;");
  dong.push("");
  dong.push("export const BANG_IDL: ReadonlyMap<string, BangLenh> = new Map<string, BangLenh>([");
  for (const r of ra) {
    dong.push(`  // IDL trên chuỗi: ${r.idl}`);
    dong.push(`  ["${r.pid}", {`);
    dong.push(`    [ANCHOR_EVENT_CPI]: "logSuKien",`);
    for (const [h, n] of r.lenh) dong.push(`    "${h}": ${JSON.stringify(n)},`);
    dong.push("  }],");
  }
  dong.push("]);");
  dong.push("");
  writeFileSync("packages/core/src/l1/bang-idl.ts", dong.join("\n"));
  console.log(`\n→ packages/core/src/l1/bang-idl.ts · ${ra.length} chương trình`);
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

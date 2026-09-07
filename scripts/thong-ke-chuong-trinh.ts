import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { VersionedTransaction, PublicKey } from "@solana/web3.js";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";

/**
 * VIẾT DECODER TIẾP CHO AI — trả lời bằng số, đọc từ cohort đã lưu OFFLINE.
 *
 *   npm run thong-ke-chuong-trinh
 *
 * `CLAUDE.md` ghi "chưa có decoder cho chương trình DEX" và người ta dễ nhảy thẳng
 * sang viết decoder cho Jupiter vì nó nổi tiếng nhất. Nhưng kế hoạch sản phẩm nói
 * đúng: chỉ ưu tiên khi **dữ liệu cho thấy tác động thực**. Thêm decoder theo tiếng
 * tăm là chọn việc bằng cảm giác.
 *
 * Bài này đếm trên 29 giao dịch mainnet đã lưu ở `data/seed/tx/` — cùng cohort mà
 * coverage 82 % được đo. Không chạm mạng, không cần cổng mainnet: dữ liệu đã nằm
 * trong repo.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * GIỚI HẠN PHẢI NÓI TRƯỚC.
 *
 * Giao dịch v0 có thể nạp địa chỉ từ Address Lookup Table. Bảng đó nằm TRÊN CHUỖI,
 * không nằm trong file base64 — nên đọc offline thì một số `programId` không phân
 * giải được. Bài này đếm chúng riêng thành `khongPhanGiaiDuoc` thay vì bỏ qua hoặc
 * gộp vào "chưa đọc hiểu"; gộp lại sẽ thổi phồng nhu cầu decoder.
 */

// `fileURLToPath`, không phải `.pathname`: đường dẫn Windows có dấu cách thì
// `.pathname` trả về `%20` và `readdirSync` không tìm thấy gì.
const GOC = fileURLToPath(new URL("..", import.meta.url));
const THU_MUC = join(GOC, "data/seed/tx");
const NL = String.fromCharCode(10);

type Dem = { programId: string; ten: string | null; soLenh: number; soTx: number };

const dem = new Map<string, { soLenh: number; tx: Set<string> }>();
let tongLenh = 0;
let khongPhanGiai = 0;
const txKhongPhanGiai = new Set<string>();

const file = readdirSync(THU_MUC).filter((f) => f.endsWith(".base64")).sort();

for (const f of file) {
  const raw = readFileSync(join(THU_MUC, f), "utf8").trim();
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(Buffer.from(raw, "base64"));
  } catch {
    console.error(`  bỏ qua ${f} — không giải mã được`);
    continue;
  }

  const msg = tx.message;
  const tinh: PublicKey[] = msg.staticAccountKeys;
  // Số khoá do ALT nạp vào; chúng nằm SAU danh sách tĩnh trong không gian chỉ số.
  const soAlt = msg.addressTableLookups.reduce(
    (n, l) => n + l.writableIndexes.length + l.readonlyIndexes.length,
    0,
  );

  for (const ix of msg.compiledInstructions) {
    tongLenh += 1;
    const i = ix.programIdIndex;
    if (i >= tinh.length) {
      // Địa chỉ đến từ lookup table — không đọc được nếu không tra chuỗi.
      khongPhanGiai += 1;
      txKhongPhanGiai.add(f);
      continue;
    }
    const pid = tinh[i]!.toBase58();
    const cu = dem.get(pid) ?? { soLenh: 0, tx: new Set<string>() };
    cu.soLenh += 1;
    cu.tx.add(f);
    dem.set(pid, cu);
  }
  void soAlt;
}

const bang: Dem[] = [...dem.entries()]
  .map(([programId, v]) => ({
    programId,
    ten: VERIFIED_PROGRAMS.get(programId) ?? null,
    soLenh: v.soLenh,
    soTx: v.tx.size,
  }))
  .sort((a, b) => b.soLenh - a.soLenh || b.soTx - a.soTx);

const chuaDoc = bang.filter((x) => x.ten === null);
const daDoc = bang.filter((x) => x.ten !== null);
const lenhDaDoc = daDoc.reduce((n, x) => n + x.soLenh, 0);
const lenhChuaDoc = chuaDoc.reduce((n, x) => n + x.soLenh, 0);

console.log(`KHẢO SÁT CHƯƠNG TRÌNH · ${file.length} giao dịch mainnet lưu offline${NL}`);
console.log(`  tổng lệnh              : ${tongLenh}`);
console.log(`  đọc hiểu được          : ${lenhDaDoc}  (${daDoc.length} chương trình)`);
console.log(`  CHƯA có decoder        : ${lenhChuaDoc}  (${chuaDoc.length} chương trình)`);
console.log(`  không phân giải được   : ${khongPhanGiai}  (địa chỉ từ lookup table, cần tra chuỗi)`);

console.log(`${NL}  Xếp hạng chương trình CHƯA đọc hiểu — decoder tiếp theo nên là dòng đầu:`);
if (chuaDoc.length === 0) {
  console.log("    (không có — mọi chương trình trong cohort đều đã đọc hiểu được)");
} else {
  for (const x of chuaDoc.slice(0, 10)) {
    console.log(`    ${String(x.soLenh).padStart(3)} lệnh · ${String(x.soTx).padStart(2)} tx   ${x.programId}`);
  }
}

console.log(`${NL}  Chương trình ĐÃ đọc hiểu, để đối chiếu:`);
for (const x of daDoc.slice(0, 8)) {
  console.log(`    ${String(x.soLenh).padStart(3)} lệnh · ${String(x.soTx).padStart(2)} tx   ${x.ten}`);
}

mkdirSync(join(GOC, "data/seed"), { recursive: true });
writeFileSync(
  join(GOC, "data/seed/chuong-trinh.json"),
  JSON.stringify(
    {
      doLuc: new Date().toISOString(),
      nguon: "data/seed/tx/*.base64 — cohort mainnet lưu offline",
      soTx: file.length,
      tongLenh,
      lenhDaDoc,
      lenhChuaDoc,
      khongPhanGiaiDuoc: khongPhanGiai,
      txCoDiaChiTuLookupTable: [...txKhongPhanGiai].sort(),
      chuaCoDecoder: chuaDoc,
      daCoDecoder: daDoc,
    },
    null,
    2,
  ) + NL,
);
console.log(`${NL}→ data/seed/chuong-trinh.json`);

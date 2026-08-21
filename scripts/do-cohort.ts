/**
 * Đo chỉ số trên một COHORT CỐ ĐỊNH giao dịch mainnet.
 *
 *   node --experimental-strip-types scripts/do-cohort.ts [nhãn] [số mẫu]
 *
 * Vì sao cần script riêng thay vì dùng `do-bao-nham.ts`: script đó bốc mẫu ngẫu
 * nhiên MỖI LẦN CHẠY, nên so sánh trước/sau bằng hai lượt chạy là so hai mẻ khác
 * nhau — đã suýt làm đội công bố một cải thiện không có thật (SEED-DATASET mục 0b3).
 *
 * Ở đây danh sách chữ ký được ghi ra `data/seed/cohort-audit.json` ở lần chạy
 * đầu và TÁI SỬ DỤNG ở mọi lần sau. Trước/sau đo trên đúng cùng một tập.
 *
 * Giới hạn phải biết: `coverage` phụ thuộc vào mô phỏng thành công (lệnh CPI chỉ
 * có khi mô phỏng chạy), mà mô phỏng lại phụ thuộc trạng thái chuỗi HIỆN TẠI.
 * Giao dịch cũ dần sẽ mô phỏng hỏng. Script đếm và báo số mẫu bỏ qua thay vì
 * lặng lẽ thu nhỏ mẫu số.
 */
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { extractFacts } from "../packages/core/src/l1/fetch.ts";
import { danhGia } from "../packages/core/src/l2/evaluate.ts";
import { chiLaThongTin } from "../packages/core/src/constants.ts";
import { BANG_IDL } from "../packages/core/src/l1/bang-idl.ts";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const HO_SO = "data/seed/cohort-audit.json";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function layCohort(conn: Connection, soMau: number): Promise<string[]> {
  if (existsSync(HO_SO)) {
    const h = JSON.parse(readFileSync(HO_SO, "utf8")) as { chuKy: string[] };
    console.log(`dùng lại cohort đã ghi: ${h.chuKy.length} chữ ký`);
    return h.chuKy;
  }
  const sigs = await conn.getSignaturesForAddress(TOKEN, { limit: soMau * 3 });
  const chuKy = sigs.filter((x) => x.err === null).slice(0, soMau).map((x) => x.signature);
  writeFileSync(HO_SO, JSON.stringify({ layLuc: new Date().toISOString(), chuKy }, null, 2));
  console.log(`đã ghi cohort mới: ${chuKy.length} chữ ký -> ${HO_SO}`);
  return chuKy;
}

async function main() {
  const nhan = process.argv[2] ?? "(không nhãn)";
  const conn = new Connection(RPC, "confirmed");
  const chuKy = await layCohort(conn, Number(process.argv[3] ?? 20));

  let n = 0, boQua = 0;
  let covTong = 0, chamTong = 0, chamHieu = 0;
  // Đo song song "nếu KHÔNG có decoder sinh từ IDL" — cùng một lượt lấy dữ liệu,
  // nên chênh lệch là do decoder chứ không do bốc hai mẻ mẫu khác nhau.
  let covKhongIdl = 0, chamHieuKhongIdl = 0;
  let danger = 0, warning = 0, safe = 0, caoBuoc = 0, warningKhongLyDo = 0;

  for (const sig of chuKy) {
    try {
      const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) { boQua++; continue; }
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );
      const f = await extractFacts(conn, vt);
      if (!f.simulationOk) { boQua++; continue; }
      n++;
      covTong += f.coverage.total ? f.coverage.analyzed / f.coverage.total : 0;
      let khongIdl = 0;
      for (const ix of f.instructions) {
        const coIdl = BANG_IDL.has(ix.programId);
        const docDuocKhongIdl = ix.decoded !== null && !coIdl && VERIFIED_PROGRAMS.has(ix.programId);
        if (docDuocKhongIdl) khongIdl++;
        if (!ix.chamTaiSanNguoiKy) continue;
        chamTong++;
        if (ix.decoded) chamHieu++;
        if (docDuocKhongIdl) chamHieuKhongIdl++;
      }
      covKhongIdl += f.coverage.total ? khongIdl / f.coverage.total : 0;
      const r = danhGia(f);
      if (r.level === "danger") danger++;
      else if (r.level === "warning") warning++;
      else safe++;
      if (r.reasonCodes.length > 0 && !chiLaThongTin(r.reasonCodes)) caoBuoc++;
      if (r.level !== "safe" && r.reasonCodes.length === 0) warningKhongLyDo++;
      await nghi(400);
    } catch { boQua++; }
  }

  const pc = (x: number, y: number) => (y ? `${((x / y) * 100).toFixed(0)}%` : "n/a");
  console.log(`\n=== COHORT · ${nhan} ===`);
  console.log(`  mẫu đo được / tổng cohort : ${n} / ${chuKy.length}  (bỏ qua ${boQua})`);
  console.log(`  coverage trung bình       : ${n ? ((covTong / n) * 100).toFixed(0) : 0}%` +
    `   (không có decoder IDL: ${n ? ((covKhongIdl / n) * 100).toFixed(0) : 0}%)`);
  console.log(`  coverage lệnh CHẠM tài sản: ${pc(chamHieu, chamTong)}  (${chamHieu}/${chamTong})` +
    `   (không có decoder IDL: ${pc(chamHieuKhongIdl, chamTong)})`);
  console.log(`  verdict  Đỏ / Vàng / Xanh : ${danger} / ${warning} / ${safe}`);
  console.log(`  cảnh báo mang tính cáo buộc: ${caoBuoc}`);
  console.log(`  cảnh báo KHÔNG có mã lý do : ${warningKhongLyDo}   <- phải là 0`);
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

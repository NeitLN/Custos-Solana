/**
 * ĐO TỈ LỆ BÁO NHẦM trên giao dịch mainnet thật.
 *
 * Đây là con số sẽ nói trên sân khấu, nên cách đo phải trung thực:
 *
 *   - Mẫu lấy NGẪU NHIÊN từ giao dịch SPL Token gần đây trên mainnet.
 *     Không chọn lọc, không bỏ mẫu xấu.
 *   - Ta KHÔNG khẳng định mọi mẫu đều lành tính. Giao dịch mainnet ngẫu nhiên
 *     phần lớn là bình thường, nhưng không có gì bảo đảm.
 *   - Vì vậy mọi verdict Đỏ đều được liệt kê ra để soi tay: hoặc đó là một vụ
 *     tấn công thật ta bắt được, hoặc là báo nhầm phải sửa. Không được lặng lẽ
 *     tính nó vào cột nào cả.
 *
 *   node --experimental-strip-types scripts/do-bao-nham.ts [số mẫu]
 */
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { mkdirSync, writeFileSync } from "node:fs";
import { inspect } from "../packages/core/src/inspect.ts";
import { dienGiaiKhongAI } from "../packages/ai/src/index.ts";
import { chiLaThongTin } from "../packages/core/src/constants.ts";
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("do-bao-nham.ts", RPC);
const TOKEN_PROGRAM = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const SO_MAU = Number(process.argv[2] ?? 20);
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Mau = {
  chuKy: string;
  level: string;
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
  explorer: string;
};

async function main() {
  const conn = new Connection(RPC, "confirmed");
  console.log("RPC :", RPC);
  console.log("mẫu :", SO_MAU, "giao dịch SPL Token gần đây, lấy ngẫu nhiên\n");

  const sigs = await conn.getSignaturesForAddress(TOKEN_PROGRAM, { limit: SO_MAU * 3 });
  const ungVien = sigs.filter((s) => s.err === null).slice(0, SO_MAU);

  const mau: Mau[] = [];
  let boQua = 0;

  for (const [i, s] of ungVien.entries()) {
    try {
      const tx = await conn.getTransaction(s.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!tx) {
        boQua++;
        continue;
      }
      const lai = new VersionedTransaction(tx.transaction.message);
      const r = await inspect({ connection: conn, interpret: dienGiaiKhongAI }, lai, { locale: "vi" });
      mau.push({
        chuKy: s.signature,
        level: r.level,
        reasonCodes: r.reasonCodes,
        coverage: r.coverage,
        explorer: `https://explorer.solana.com/tx/${s.signature}`,
      });
      process.stdout.write(`\r  đã đo ${i + 1}/${ungVien.length}`);
    } catch {
      boQua++;
    }
    await nghi(600);
  }
  console.log("\n");

  const dem = { safe: 0, warning: 0, danger: 0 } as Record<string, number>;
  for (const m of mau) dem[m.level] = (dem[m.level] ?? 0) + 1;

  console.log("=== PHÂN BỐ VERDICT ===");
  console.log("  Bình thường (safe)  :", dem["safe"] ?? 0);
  console.log("  Cần xem kỹ (warning):", dem["warning"] ?? 0);
  console.log("  Nguy hiểm (danger)  :", dem["danger"] ?? 0);
  console.log("  bỏ qua (không lấy/mô phỏng được):", boQua);

  // Tách hai loại "cần xem kỹ": có luật kích hoạt vs chỉ là chưa đọc hiểu hết.
  // Gộp chúng lại sẽ che mất con số thật sự đáng lo.
  const vang = mau.filter((m) => m.level === "warning");
  const vangHanhVi = vang.filter((m) => m.reasonCodes.length > 0 && !chiLaThongTin(m.reasonCodes)).length;
  const vangThongTin = vang.length - vangHanhVi;
  console.log("     ├ cáo buộc về chính giao dịch :", vangHanhVi, "  ← con số đáng lo");
  console.log("     └ chỉ là thuộc tính/chưa hiểu :", vangThongTin);

  const cov = mau.map((m) => m.coverage.analyzed / Math.max(1, m.coverage.total));
  const tb = cov.length ? cov.reduce((a, b) => a + b, 0) / cov.length : 0;
  console.log("\n  coverage trung bình :", `${(tb * 100).toFixed(0)}%`);

  const do_ = mau.filter((m) => m.level === "danger");
  if (do_.length > 0) {
    console.log("\n=== VERDICT ĐỎ — PHẢI SOI TAY TỪNG CÁI ===");
    for (const m of do_) {
      console.log(`  ${m.explorer}`);
      console.log(`     ${m.reasonCodes.join(", ")}`);
    }
    console.log("\n  Mỗi cái hoặc là tấn công thật ta bắt được, hoặc là báo nhầm phải sửa.");
    console.log("  Không được tính vào cột nào trước khi có người xem.");
  } else {
    console.log("\n  ✓ không có verdict Đỏ nào trên mẫu ngẫu nhiên này");
  }

  /*
   * Không đo được mẫu nào thì KHÔNG ghi — cùng lý do như `do-cohort.ts`.
   *
   * Một lượt chạy hỏng (RPC chết, bị giới hạn tốc độ) vẫn đi tới đây với `mau` rỗng
   * và ghi ra một hồ sơ `soMau: 0` trông hợp lệ. Hồ sơ đó rồi được đọc như một phép
   * đo thật. Chuyện này đã xảy ra với `cohort-ket-qua.json`: số 0 ghi đè lên 9 mẫu
   * đo thật rồi chảy vào bốn tài liệu, không lệnh nào báo lỗi.
   */
  if (mau.length === 0) {
    console.error("\n✖ không mô phỏng được mẫu nào — KHÔNG ghi data/seed/do-bao-nham.json.");
    console.error("  Đây là lượt đo hỏng, không phải kết quả 0. Kết quả lần trước giữ nguyên.");
    process.exit(1);
  }

  mkdirSync("data/seed", { recursive: true });
  const ho = {
    doLuc: new Date().toISOString(),
    rpc: RPC,
    nguon: "getSignaturesForAddress(SPL Token program) — ngẫu nhiên, không chọn lọc",
    soMau: mau.length,
    boQua,
    phanBo: dem,
    coverageTrungBinh: tb,
    mau,
  };
  writeFileSync("data/seed/do-bao-nham.json", JSON.stringify(ho, null, 2));
  console.log("\n→ đã ghi data/seed/do-bao-nham.json");
}

main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});

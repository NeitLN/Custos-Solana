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
 * ## `--khong-ghi`
 *
 * Kết quả cohort là số ĐÃ CÔNG BỐ: `so-lieu` đọc nó rồi rải vào README, CLAUDE.md
 * và deck. Nên phải chạy được script này để kiểm chính nó — sửa phần phân loại lý
 * do bỏ mẫu chẳng hạn — mà không ghi đè con số đang neo.
 *
 *     CUSTOS_OFFLINE_MAINNET_RESEARCH=1 node --experimental-strip-types  *       scripts/do-cohort.ts "thử" 20 --khong-ghi
 *
 * Chế độ này in đủ mọi thứ và không chạm file nào. Chép một script gần giống để
 * làm việc đó là cách chắc chắn nhất để hai bản lệch nhau sau hai lần sửa.
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
import { chanNeuChuaChoPhep } from "./congMainnet.ts";

const RPC = process.env["CUSTOS_MAINNET_RPC"] ?? "https://api.mainnet-beta.solana.com";

// Chạm mainnet phải là hành động có chủ ý — xem `scripts/congMainnet.ts`.
chanNeuChuaChoPhep("do-cohort.ts", RPC);
const TOKEN = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const HO_SO = "data/seed/cohort-audit.json";
/** Kết quả đo, để trang số liệu công khai đọc thay vì có người gõ tay. */
const KET_QUA = "data/seed/cohort-ket-qua.json";
const nghi = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function layCohort(conn: Connection, soMau: number, khongGhi: boolean): Promise<string[]> {
  if (existsSync(HO_SO)) {
    const h = JSON.parse(readFileSync(HO_SO, "utf8")) as { chuKy: string[] };
    console.log(`dùng lại cohort đã ghi: ${h.chuKy.length} chữ ký`);
    return h.chuKy;
  }
  const sigs = await conn.getSignaturesForAddress(TOKEN, { limit: soMau * 3 });
  const chuKy = sigs.filter((x) => x.err === null).slice(0, soMau).map((x) => x.signature);
  if (khongGhi) {
    console.log(`(--khong-ghi) cohort mới ${chuKy.length} chữ ký — KHÔNG ghi ${HO_SO}`);
    return chuKy;
  }
  writeFileSync(HO_SO, JSON.stringify({ layLuc: new Date().toISOString(), chuKy }, null, 2));
  console.log(`đã ghi cohort mới: ${chuKy.length} chữ ký -> ${HO_SO}`);
  return chuKy;
}

async function main() {
  const khongGhi = process.argv.includes("--khong-ghi");
  const nhan = process.argv[2] ?? "(không nhãn)";
  const conn = new Connection(RPC, "confirmed");
  const chuKy = await layCohort(conn, Number(process.argv[3] ?? 20), khongGhi);

  /*
   * BA LÝ DO BỎ MẪU, TRƯỚC ĐÂY GỘP VÀO MỘT BIẾN ĐẾM.
   *
   * "Bỏ qua 11/20" không nói được điều quan trọng nhất: 11 mẫu đó bị bỏ vì RPC
   * không còn giữ giao dịch (chẳng liên quan gì tới Custos), hay vì Custos bóc
   * tách hỏng (một giới hạn thật của sản phẩm)? Hai câu chuyện khác hẳn nhau
   * trước một giám khảo, và con số cũ không phân biệt được.
   *
   * Tệ hơn: nhánh `catch` nuốt trọn lỗi. Một bug trong `extractFacts` ném với vài
   * hình dạng giao dịch sẽ được đếm là "bỏ qua" — không phân biệt được với việc
   * RPC cắt dữ liệu. Đó đúng là chỗ "KHÔNG KIỂM ĐƯỢC" che mất "PHÁT HIỆN SAI".
   *
   * Nên ghi từng chữ ký kèm lý do, và tách hẳn hai nhóm:
   *
   *   hạ tầng  — `khong-lay-duoc-tx`, `mo-phong-that-bai`: ngoài tầm Custos
   *   sản phẩm — `loi-boc-tach`: mã của đội ném, PHẢI được nhìn thấy
   */
  type LyDoBo = "khong-lay-duoc-tx" | "mo-phong-that-bai" | "loi-boc-tach";
  const daBo: Array<{ chuKy: string; lyDo: LyDoBo; chiTiet?: string }> = [];
  const bo = (chuKy: string, lyDo: LyDoBo, chiTiet?: string) => daBo.push({ chuKy, lyDo, chiTiet });
  let n = 0;
  let covTong = 0, chamTong = 0, chamHieu = 0;
  // Đo song song "nếu KHÔNG có decoder sinh từ IDL" — cùng một lượt lấy dữ liệu,
  // nên chênh lệch là do decoder chứ không do bốc hai mẻ mẫu khác nhau.
  let covKhongIdl = 0, chamHieuKhongIdl = 0;
  let danger = 0, warning = 0, safe = 0, caoBuoc = 0, warningKhongLyDo = 0;

  for (const sig of chuKy) {
    try {
      const tx = await conn.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
      if (!tx) { bo(sig, "khong-lay-duoc-tx"); continue; }
      const vt = new VersionedTransaction(
        tx.transaction.message,
        tx.transaction.signatures.map(() => new Uint8Array(64)),
      );
      const f = await extractFacts(conn, vt);
      if (!f.simulationOk) {
        /*
         * `simulationError` đã có sẵn và trước đây bị vứt đi. Giữ nó lại vì trong
         * "mô phỏng hỏng" còn hai chuyện rất khác nhau:
         *
         *   · cohort đã cũ — trạng thái chuỗi đã đi qua, mô phỏng lại không được
         *     nữa. Đây là suy giảm thật, và nó chỉ một chiều.
         *   · RPC công cộng giới hạn tốc độ (429) — tạm thời, chạy lại sau là hết.
         *
         * Gộp hai thứ đó rồi kết luận "cohort rụng còn N mẫu" là nói quá về một
         * suy giảm mà một nửa có thể chỉ là mạng đông.
         */
        bo(sig, "mo-phong-that-bai", f.simulationError ?? undefined);
        continue;
      }
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
    } catch (e) {
      // KHÔNG nuốt. Mã của đội ném là chuyện của đội, và nó phải hiện ra ngay
      // trên màn hình chứ không chỉ nằm trong một con số tổng.
      const chiTiet = e instanceof Error ? e.message : String(e);
      bo(sig, "loi-boc-tach", chiTiet);
      console.error(`  ✖ lỗi bóc tách ${sig.slice(0, 12)}… — ${chiTiet.slice(0, 90)}`);
    }
  }

  const pc = (x: number, y: number) => (y ? `${((x / y) * 100).toFixed(0)}%` : "n/a");
  console.log(`\n=== COHORT · ${nhan} ===`);
  const dem = (l: LyDoBo) => daBo.filter((x) => x.lyDo === l).length;
  const haTang = dem("khong-lay-duoc-tx") + dem("mo-phong-that-bai");
  const sanPham = dem("loi-boc-tach");

  console.log(`  mẫu đo được / tổng cohort : ${n} / ${chuKy.length}  (bỏ ${daBo.length})`);
  if (daBo.length) {
    console.log(`    · hạ tầng  : ${haTang}   (không lấy được tx ${dem("khong-lay-duoc-tx")} · mô phỏng hỏng ${dem("mo-phong-that-bai")})`);
    // Trong "mô phỏng hỏng" còn hai chuyện khác nhau — xem chú thích ở nhánh bắt.
    const bopTocDo = daBo.filter(
      (x) => x.lyDo === "mo-phong-that-bai" && /429|rate|too many/i.test(x.chiTiet ?? ""),
    ).length;
    if (bopTocDo) {
      console.log(`       trong đó ${bopTocDo} là RPC bóp tốc độ (429) — TẠM THỜI, không phải cohort cũ`);
    }
    // Gộp theo nguyên văn lỗi. "16 mẫu mô phỏng hỏng" chưa nói được gì; "16 mẫu
    // cùng một lỗi" và "16 mẫu mười sáu lỗi khác nhau" là hai chẩn đoán khác hẳn.
    const theoLoi = new Map<string, number>();
    for (const x of daBo) {
      if (x.lyDo !== "mo-phong-that-bai") continue;
      const k = (x.chiTiet ?? "(không có mô tả)").slice(0, 80);
      theoLoi.set(k, (theoLoi.get(k) ?? 0) + 1);
    }
    for (const [loi, so] of [...theoLoi].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`       ${String(so).padStart(3)}x  ${loi}`);
    }
    // Dòng này phải đọc được ngay cả khi bằng 0 — im lặng khi bằng 0 là để một
    // con số quan trọng biến mất đúng lúc nó chuyển từ 0 sang 1.
    console.log(`    · SẢN PHẨM : ${sanPham}   (mã của đội ném — đây KHÔNG phải giới hạn hạ tầng)`);
  }
  console.log(`  coverage trung bình       : ${n ? ((covTong / n) * 100).toFixed(0) : 0}%` +
    `   (không có decoder IDL: ${n ? ((covKhongIdl / n) * 100).toFixed(0) : 0}%)`);
  console.log(`  coverage lệnh CHẠM tài sản: ${pc(chamHieu, chamTong)}  (${chamHieu}/${chamTong})` +
    `   (không có decoder IDL: ${pc(chamHieuKhongIdl, chamTong)})`);
  console.log(`  verdict  Đỏ / Vàng / Xanh : ${danger} / ${warning} / ${safe}`);
  console.log(`  cảnh báo mang tính cáo buộc: ${caoBuoc}`);
  console.log(`  cảnh báo KHÔNG có mã lý do : ${warningKhongLyDo}   <- phải là 0`);

  /*
   * KHÔNG ĐO ĐƯỢC MẪU NÀO THÌ KHÔNG GHI GÌ CẢ.
   *
   * Chuyện đã xảy ra thật: một lượt chạy với RPC không kết nối được đã ghi đè kết
   * quả cohort đã commit (9 mẫu · coverage 82 % · chạm tài sản 13/20) bằng một hồ
   * sơ toàn số 0 — hợp lệ về hình thức, `coverageTrungBinh: 0` do nhánh `n ? … : 0`
   * ngay bên dưới. Rồi `npm run so-lieu` đọc nó và rải "coverage 0 %" vào README,
   * CLAUDE.md, PITCH và README gói core. Không lệnh nào báo lỗi.
   *
   * "Đo được 0 mẫu" KHÔNG phải một phép đo — nó là phép đo THẤT BẠI. Ghi nó ra
   * cùng một file với phép đo thật là để hai thứ khác hẳn nhau trông giống nhau,
   * và cái mới thì luôn thắng.
   */
  if (n === 0) {
    console.error(`\n✖ không mô phỏng được mẫu nào trong ${chuKy.length} chữ ký — KHÔNG ghi ${KET_QUA}.`);
    console.error("  Đây là lượt đo hỏng, không phải kết quả 0 %. Nguyên nhân thường gặp:");
    console.error("    · RPC không kết nối được, hoặc bị giới hạn tốc độ");
    console.error("    · cohort đã cũ tới mức mọi giao dịch đều mô phỏng hỏng");
    console.error(`  Kết quả lần đo trước trong ${KET_QUA} được giữ nguyên.`);
    process.exit(1);
  }

  // Ghi ra file. Trước đây script chỉ in ra màn hình, nên mọi con số muốn dùng ở
  // chỗ khác đều phải có người chép tay — và số chép tay là số sẽ lệch sau hai
  // lần sửa code mà không ai nhận ra.
  if (khongGhi) {
    console.log(`
(--khong-ghi) KHÔNG ghi ${KET_QUA} — số đã công bố giữ nguyên.`);
    return;
  }

  writeFileSync(
    KET_QUA,
    JSON.stringify(
      {
        doLuc: new Date().toISOString(),
        nhan,
        rpc: RPC.includes("api.mainnet-beta") ? "public mainnet-beta" : "riêng",
        coMauDo: n,
        coCohort: chuKy.length,
        boQua: daBo.length,
        /*
         * `boQua` giữ lại tên cũ để `so-lieu` và tài liệu đang đọc nó không gãy,
         * nhưng nó KHÔNG còn là con số đáng đọc. Đọc `boQuaTheoLyDo`.
         */
        boQuaTheoLyDo: {
          haTang: { khongLayDuocTx: dem("khong-lay-duoc-tx"), moPhongThatBai: dem("mo-phong-that-bai") },
          sanPham: { loiBocTach: sanPham },
        },
        daBo,
        coverageTrungBinh: n ? covTong / n : 0,
        chamTaiSan: { hieu: chamHieu, tong: chamTong },
        verdict: { danger, warning, safe },
        caoBuoc,
        warningKhongLyDo,
      },
      null,
      2,
    ),
  );
  console.log(`
  đã ghi -> ${KET_QUA}`);
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

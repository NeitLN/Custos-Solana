/**
 * CHẠY L3 VỚI MÔ HÌNH THẬT trên các nhóm kịch bản.
 *
 * Chạy:  npm run kichban-ai-that      (cần ANTHROPIC_API_KEY trong môi trường)
 *
 * ⚠️ PHẠM VI — ĐỌC TRƯỚC KHI TRÍCH SỐ.
 *
 * Bài này dùng `Facts` DỰNG SẴN, **không gọi RPC Solana**. Nó đo phần DIỄN GIẢI
 * (độ trễ mô hình, bộ soi đầu ra, `aiAdvisory`), và KHÔNG đo phần bóc tách L1.
 *
 * Muốn đo phần bóc tách trên chuỗi thật thì chạy bài khác:
 *   npm run mo-phong-kichban        → mô phỏng 9 kịch bản trên Devnet
 *
 * Hai bài trả lời hai câu hỏi khác nhau. Gộp số của chúng lại rồi gọi là "chạy
 * thật đầu-cuối" là nói quá — chưa có bài nào chạy nối cả hai trong một đường.
 *
 * Bài này KHÔNG phải benchmark độ chính xác: `Facts` do chính file này dựng, nên
 * không có ground truth độc lập.
 */
import { dienGiaiBangMoHinh } from "@custos-solana/ai";
import { dungGoiAnthropic } from "@custos-solana/ai/anthropic";

const NGUOI_KY = "2EjYM7ShF9n1e5ErWpmnw5xzMTEUF9CC4peDctKbCpAF";
const KE = "HaVREgPPBxHHJfUWV7yVPqU8epvoT1f5QGSNP9bAEXTT";
const MINT = "43JGWQPDygFB8FgQ1ifoLoCeKH75d6vMTAS88SBK4tjd";

function facts(o: Partial<any>): any {
  return {
    signer: NGUOI_KY, nguoiKy: [NGUOI_KY], nguoiDungDuocChiDinh: false,
    simulationOk: true, phiUocTinh: 5000n,
    coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
    instructions: [], accounts: [],
    mints: [{ address: MINT, decimals: 6, mintAuthority: null, freezeAuthority: null, transferHookProgramId: null, permanentDelegate: null }],
    tokenAccounts: [], lookupTables: [], solDelta: {}, ...o,
  };
}
const ta = (o: Partial<any>) => ({
  address: "6GKSKEwGZ6VN32FMhkCmmffAEjhD9GPjqzNspYiBLLEa", mint: MINT,
  ownerBefore: NGUOI_KY, ownerAfter: NGUOI_KY,
  amountBefore: 500_000_000n, amountAfter: 500_000_000n,
  delegateBefore: null, delegateAfter: null,
  delegatedAmountBefore: 0n, delegatedAmountAfter: 0n,
  closeAuthorityBefore: null, closeAuthorityAfter: null, ...o,
});

const CA = [
  { id: "doi-chu-tai-khoan", ma: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
    f: facts({ tokenAccounts: [ta({ ownerAfter: KE })] }) },
  { id: "cap-quyen-vuot-so-du", ma: ["SPL_APPROVE_DELEGATE_LON"],
    f: facts({ tokenAccounts: [ta({ delegateAfter: KE, delegatedAmountAfter: 1_010_000_000n })] }) },
  { id: "cap-quyen-vua-du", ma: [],
    f: facts({ tokenAccounts: [ta({ delegateAfter: KE, delegatedAmountAfter: 500_000_000n })] }) },
  { id: "chuyen-them-ngoai-hanh-dong", ma: [],
    f: facts({ tokenAccounts: [ta({ amountAfter: 480_000_000n })] }) },
  { id: "trao-quyen-dong", ma: ["SPL_SET_AUTHORITY__CLOSE_OR_FREEZE"],
    f: facts({ tokenAccounts: [ta({ closeAuthorityAfter: KE })] }) },
  { id: "thieu-du-lieu", ma: ["NGUOI_DUNG_KHONG_RO"],
    f: facts({ nguoiKy: [NGUOI_KY, KE], tokenAccounts: [ta({ amountAfter: 490_000_000n })] }) },
  { id: "lanh-tinh", ma: [],
    f: facts({ tokenAccounts: [ta({ amountAfter: 490_000_000n })] }) },
];

let vao = 0, ra = 0;
const goi = dungGoiAnthropic({ ghiNhanDung: (u) => { vao += u.vao; ra += u.ra; } });
const dienGiai = dienGiaiBangMoHinh(goi);

const ketQua: any[] = [];
for (const c of CA) {
  const t0 = Date.now();
  const r = await dienGiai(c.f, c.ma, "vi", {});
  const ms = Date.now() - t0;
  ketQua.push({ id: c.id, ms, aiAdvisory: r.aiAdvisory, explanation: r.explanation });
  console.log(`\n── ${c.id}  (${ms} ms)`);
  console.log(`   aiAdvisory: ${r.aiAdvisory ?? "null"}`);
  console.log(`   ${r.explanation}`);
}
const dt = ketQua.map((k) => k.ms).sort((a, b) => a - b);
console.log("\n════ TỔNG ════");
console.log("số ca:", ketQua.length);
console.log("trung vị ms:", dt[Math.floor(dt.length / 2)]);
console.log("cao nhất ms:", dt[dt.length - 1]);
console.log("token vào:", vao, " token ra:", ra);

/**
 * CU-23 — ĐO HIỆU NĂNG CÁC MODULE MỚI (CU-11/12/14/18/20/21).
 *
 * ## Vì sao script này từ chối in "p95" ở cỡ mẫu nhỏ
 *
 * Thẻ nói đích danh: *"không gọi giá trị lớn nhất của vài lượt là p95 có ý nghĩa"*.
 * Với n lượt, phân vị 95 rơi vào đúng phần tử lớn nhất khi n < 20 — in ra một con
 * số gọi là "p95" ở đó là trình bày cực trị của một mẫu nhỏ như một thống kê.
 *
 * Nên `thongKe()` trả `p95: null` khi n < 20, và bản in ghi `—` kèm lý do.
 *
 * ## Cold và warm tách riêng
 *
 * Lượt đầu tiên của mỗi phép đo trả giá cho JIT và cho việc nạp module. Trộn nó
 * vào trung vị làm con số vừa cao hơn thực tế vừa không lặp lại được.
 *
 * ## Điều script này KHÔNG đo
 *
 * Không đo `inspect()` đầu-cuối: cái đó phụ thuộc RPC và đã có
 * `thu-tich-hop:devnet` đo trên mạng thật. Ở đây chỉ đo phần TẤT ĐỊNH — thứ lặp
 * lại được trên máy khác.
 */
import { readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../../packages/core/src/facts-io.ts";
import { dungReceipt, receiptRaJson, docReceipt } from "../../packages/core/src/receipt.ts";
import { chayLaiTuJson } from "../../packages/core/src/replay.ts";
import { soSanhCauTruc } from "../../packages/core/src/so-sanh.ts";
import { xetLo, type VaoLo } from "../../packages/core/src/batch.ts";
import { danhGiaPolicy } from "../../packages/core/src/policy.ts";
import { tinhPhiChuyen } from "../../packages/core/src/phi-token.ts";
import { tomTatQuyen } from "../../packages/core/src/quyen-token.ts";
import { danhGia } from "../../packages/core/src/l2/evaluate.ts";
import type { Facts } from "../../packages/core/src/facts.ts";
import type { InspectResult } from "../../packages/types/src/index.ts";

const LUOT = 200; // đủ để p95 có nghĩa (≥ 20)
const LUOT_NONG = 5; // lượt khởi động, bỏ khỏi thống kê warm

type ThongKe = {
  n: number;
  cold: number;
  trungVi: number;
  p95: number | null;
  lyDoP95?: string;
};

function thongKe(ms: number[]): ThongKe {
  const cold = ms[0]!;
  const warm = ms.slice(LUOT_NONG).sort((a, b) => a - b);
  const n = warm.length;
  const trungVi = warm[Math.floor(n / 2)]!;

  /*
   * p95 CHỈ có nghĩa khi n đủ lớn.
   *
   * Với n < 20, `ceil(0.95·n) − 1` trỏ vào phần tử LỚN NHẤT — tức ta đang gọi cực
   * trị của một mẫu nhỏ là một phân vị. Trả `null` và nói lý do.
   */
  if (n < 20) {
    return { n, cold, trungVi, p95: null, lyDoP95: `n=${n} < 20, p95 sẽ trùng giá trị lớn nhất` };
  }
  return { n, cold, trungVi, p95: warm[Math.ceil(0.95 * n) - 1]! };
}

function do_(ten: string, f: () => void, luot = LUOT): [string, ThongKe] {
  const ms: number[] = [];
  for (let i = 0; i < luot; i++) {
    const t = performance.now();
    f();
    ms.push(performance.now() - t);
  }
  return [ten, thongKe(ms)];
}

// ── Dữ liệu thật từ corpus ───────────────────────────────────────────────────
const idx = JSON.parse(readFileSync("data/seed/index.json", "utf8")) as {
  mau: Array<Record<string, unknown>>;
};
const coFacts = idx.mau.filter((m) => typeof m["facts"] === "string");
if (coFacts.length === 0) throw new Error("corpus không có mẫu nào kèm facts");

const facts: Facts = giaiDongBangFacts(readFileSync("data/seed/" + coFacts[0]!["facts"], "utf8"));
const l2 = danhGia(facts);
const ketQua: InspectResult = {
  level: l2.level,
  aiAdvisory: null,
  detectedPrimaryAction: null,
  diff: [],
  reasonCodes: l2.reasonCodes,
  coverage: facts.coverage,
  explanation: "",
};

const bienLaiJson = receiptRaJson(dungReceipt(ketQua, "rieng", facts));
const loVao: VaoLo[] = Array.from({ length: 20 }, () => ({
  cluster: "devnet",
  soByte: 500,
  ketQua,
}));

// ── Đo ───────────────────────────────────────────────────────────────────────
const ket: Array<[string, ThongKe]> = [
  do_("L2 · danhGia(facts)", () => void danhGia(facts)),
  do_("CU-11 · dựng biên lai rieng", () => void dungReceipt(ketQua, "rieng", facts)),
  do_("CU-11 · đọc + kiểm toàn vẹn", () => void docReceipt(bienLaiJson)),
  do_("CU-12 · chạy lại từ biên lai", () => void chayLaiTuJson(bienLaiJson)),
  do_("CU-14 · tính phí chuyển", () => void tinhPhiChuyen(1_000_000n, { diemCoBan: 150, phiToiDa: 10n, epoch: 500 })),
  do_("CU-15 · tóm tắt quyền", () => void tomTatQuyen(facts)),
  do_("CU-18 · quyết định policy", () => void danhGiaPolicy({ level: ketQua.level, coverage: ketQua.coverage, phienConDung: true })),
  do_("CU-20 · so sánh cấu trúc", () => void soSanhCauTruc(facts, facts)),
  do_("CU-21 · xét lô 20 giao dịch", () => void xetLo(loVao)),
];

// ── In ───────────────────────────────────────────────────────────────────────
console.log(`CU-23 · hiệu năng module tất định · ${LUOT} lượt, bỏ ${LUOT_NONG} lượt đầu`);
console.log(`Node ${process.version} · ${process.platform}`);
console.log(`Fixture: ${coFacts[0]!["id"]} — ${facts.instructions.length} lệnh, ${facts.tokenAccounts.length} token account`);
console.log("");
console.log("phép đo".padEnd(34) + "cold".padStart(9) + "trung vị".padStart(11) + "p95".padStart(11));
console.log("─".repeat(65));

let coP95Thieu = false;
for (const [ten, t] of ket) {
  const p95 = t.p95 === null ? "—" : `${t.p95.toFixed(3)} ms`;
  if (t.p95 === null) coP95Thieu = true;
  console.log(
    ten.padEnd(34) +
      `${t.cold.toFixed(3)} ms`.padStart(9) +
      `${t.trungVi.toFixed(3)} ms`.padStart(11) +
      p95.padStart(11),
  );
}

console.log("");
console.log(`Cỡ mẫu warm: n=${ket[0]![1].n} cho mỗi phép đo.`);
if (coP95Thieu) {
  console.log("p95 `—` nghĩa cỡ mẫu chưa đủ 20 — KHÔNG in cực trị của mẫu nhỏ ra dưới tên p95.");
}
console.log("");
console.log("Đây là phần TẤT ĐỊNH, không chạm mạng. Độ trễ đầu-cuối có RPC đo ở");
console.log("`npm run thu-tich-hop:devnet`, và độ trễ trình duyệt ở `docs/HIEU-NANG.md`.");

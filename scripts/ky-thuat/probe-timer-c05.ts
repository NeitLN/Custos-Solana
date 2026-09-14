/**
 * PROBE — TIMER CÓ TÍCH LUỸ KHÔNG? Thẻ TB-C05.
 *
 *   node --experimental-strip-types scripts/ky-thuat/probe-timer-c05.ts
 *
 * Nghiệm thu C05 đòi: *"timer/subscription không tích luỹ"*. Đây là loại rò rỉ không
 * làm gì hỏng ngay — nó chỉ giữ tiến trình sống thêm và tích rác trong một app chạy
 * suốt buổi demo. Không đo thì không ai thấy.
 *
 * Cách đo: `process.getActiveResourcesInfo()` của Node liệt kê handle đang giữ event
 * loop. Đếm số `Timeout` trước và sau khi gọi — không đoán qua thời gian chạy.
 *
 * Hai hàm bọc thời hạn trong repo, và chúng khác nhau ở đúng chỗ này:
 *
 *   · `scripts/coHan.ts`      — có `.finally(() => clearTimeout(dongHo))`
 *   · `packages/ai/boiThoiHan` — KHÔNG có; `setTimeout` sống hết `msToiDa`
 */
import { coHan } from "../coHan.ts";
import { boiThoiHan, dienGiaiKhongAI } from "../../packages/ai/src/index.ts";
import { giaiDongBangFacts } from "../../packages/core/src/facts-io.ts";
import { readFileSync } from "node:fs";

const demTimer = () =>
  process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;

const facts = giaiDongBangFacts(readFileSync("data/seed/facts/MN-01.json", "utf8"));

type Ket = { ma: string; mo: string; dat: boolean; thucTe: string };
const ket: Ket[] = [];
const ghi = (ma: string, mo: string, dat: boolean, thucTe: string) => {
  ket.push({ ma, mo, dat, thucTe });
  console.log(`${dat ? "  ok  " : "  SAI "} ${ma}  ${mo}`);
  console.log(`        ${thucTe}`);
};

/* ── C05-1 · `coHan` dọn timer khi việc xong SỚM ───────────────────────────── */
{
  const truoc = demTimer();
  // Hạn 60 giây, việc xong sau 5 ms. Nếu không dọn, timer sống thêm 60 giây.
  await coHan(new Promise((r) => setTimeout(() => r(1), 5)), 60_000);
  const sau = demTimer();
  ghi(
    "C05-1",
    "`coHan` dọn timer sau khi việc xong sớm",
    sau <= truoc,
    `Timeout trước ${truoc} → sau ${sau}`,
  );
}

/* ── C05-2 · `boiThoiHan` dọn timer khi mô hình trả về SỚM ─────────────────── */
{
  const truoc = demTimer();
  // Interpreter trả ngay. Hạn mặc định 4.000 ms.
  await boiThoiHan(async (f, r, l, o) => dienGiaiKhongAI(f, r, l, o), 60_000)(
    facts,
    [],
    "vi",
    {},
  );
  const sau = demTimer();
  ghi(
    "C05-2",
    "`boiThoiHan` dọn timer sau khi mô hình trả về sớm",
    sau <= truoc,
    `Timeout trước ${truoc} → sau ${sau}`,
  );
}

/* ── C05-3 · gọi nhiều lượt liên tiếp — timer có tích luỹ không ────────────── */
{
  const truoc = demTimer();
  for (let i = 0; i < 10; i++) {
    await boiThoiHan(async (f, r, l, o) => dienGiaiKhongAI(f, r, l, o), 60_000)(
      facts,
      [],
      "vi",
      {},
    );
  }
  const sau = demTimer();
  ghi(
    "C05-3",
    "10 lượt `boiThoiHan` KHÔNG để lại 10 timer",
    sau - truoc < 10,
    `Timeout trước ${truoc} → sau ${sau} (thêm ${sau - truoc} sau 10 lượt)`,
  );
}

const sai = ket.filter((k) => !k.dat);
console.log(`\n${ket.length - sai.length}/${ket.length} ca đạt.`);
if (sai.length) console.log(`RÒ RỈ: ${sai.map((s) => s.ma).join(", ")}`);
console.log("\n--- JSON ---");
console.log(JSON.stringify({ ket, soSai: sai.length }, null, 2));

// Thoát tường minh: nếu còn timer sống, tiến trình sẽ treo tới khi chúng hết hạn —
// và chính điều đó là bằng chứng của rò rỉ. Đo xong thì không cần chờ.
process.exit(sai.length ? 1 : 0);

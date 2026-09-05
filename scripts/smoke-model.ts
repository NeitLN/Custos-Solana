/**
 * SMOKE TEST — gọi Haiku thật, đúng một lượt, để xác nhận adapter chạy được
 * trước khi chạy cả bộ đánh giá.
 *
 *   $env:ANTHROPIC_API_KEY = "..."   (PowerShell, trong terminal của bạn)
 *   node --experimental-strip-types scripts/smoke-model.ts
 */
import { danhGia } from "../packages/core/src/l2/evaluate.ts";
import { giaiDongBangFacts } from "../packages/core/src/facts-io.ts";
import { dienGiaiBangMoHinh, boiThoiHan } from "../packages/ai/src/index.ts";
// Adapter nạp riêng: entry mặc định không còn kéo SDK Anthropic vào đồ thị.
import { dungGoiAnthropic } from "../packages/ai/src/anthropic.ts";
import { readFileSync } from "node:fs";

async function main() {
  const goi = dungGoiAnthropic(); // đọc ANTHROPIC_API_KEY từ environment
  const interpret = boiThoiHan(dienGiaiBangMoHinh(goi), 8000);

  const facts = giaiDongBangFacts(readFileSync("data/seed/facts/R01-pos.json", "utf8"));
  const l2 = danhGia(facts);

  const t0 = Date.now();
  const r = await interpret(facts, l2.reasonCodes, "vi", {});
  const ms = Date.now() - t0;

  console.log(`Gọi Haiku thành công trong ${ms}ms\n`);
  console.log(`verdict (L2, không đổi) : ${l2.level}`);
  console.log(`aiAdvisory              : ${r.aiAdvisory}`);
  console.log(`detectedPrimaryAction   : ${JSON.stringify(r.detectedPrimaryAction)}`);
  console.log(`\nexplanation:\n${r.explanation}`);
}
main().catch((e) => {
  console.error("LỖI:", e instanceof Error ? e.message : e);
  process.exit(1);
});

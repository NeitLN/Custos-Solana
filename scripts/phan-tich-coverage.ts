/** Coverage mất vào đâu — thống kê program của mọi lệnh CHƯA đọc hiểu. */
import { readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../packages/core/src/facts-io.ts";
import { VERIFIED_PROGRAMS } from "../packages/core/src/constants.ts";

const TEN: Record<string, string> = {
  ComputeBudget111111111111111111111111111111: "ComputeBudget",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "SPL Memo (v2)",
  Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo: "SPL Memo (v1)",
  ComputeBudget111111111111111111111111111112: "?",
};

const hoSo = JSON.parse(readFileSync("data/seed/index.json", "utf8"));
const mn = hoSo.mau.filter((m: any) => m.nguonGoc === "real-mainnet");

const chuaHieu = new Map<string, number>();
const daHieuNhungKhongDecode = new Map<string, number>();
let tong = 0, hieu = 0;

for (const m of mn) {
  const f = giaiDongBangFacts(readFileSync(`data/seed/${m.facts}`, "utf8"));
  for (const ix of f.instructions) {
    tong++;
    const known = VERIFIED_PROGRAMS.has(ix.programId);
    if (known && ix.decoded !== null) { hieu++; continue; }
    const key = ix.programId || "(inner, không rõ program)";
    if (known) daHieuNhungKhongDecode.set(key, (daHieuNhungKhongDecode.get(key) ?? 0) + 1);
    else chuaHieu.set(key, (chuaHieu.get(key) ?? 0) + 1);
  }
}

console.log(`${mn.length} giao dịch mainnet · ${tong} lệnh · đọc hiểu ${hieu} (${(hieu/tong*100).toFixed(1)}%)\n`);
console.log("CHƯA XÁC MINH — xếp theo số lệnh:");
for (const [p, n] of [...chuaHieu.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  ${String(n).padStart(3)}  ${(TEN[p] ?? "").padEnd(14)} ${p}`);
}
console.log("\nĐÃ xác minh nhưng KHÔNG decode được lệnh:");
for (const [p, n] of [...daHieuNhungKhongDecode.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${VERIFIED_PROGRAMS.get(p) ?? p}`);
}

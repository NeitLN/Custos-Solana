/**
 * QA — ranh giới L2/L3. Bất biến cứng của dự án:
 * "`level` chỉ do L2 tạo ra. AI tuyệt đối không tạo và không sửa `level`."
 *
 * Bộ đối kháng hiện có kiểm 10 bẫy. Bộ này thử những thứ KHÁC: AI trả về dữ liệu
 * méo, ném lỗi, treo, trả kiểu sai — các đường mà một mô hình thật có thể đi.
 */
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../../packages/core/src/inspect.ts";

const loi = [];
const vi = Keypair.generate();
const tx = new VersionedTransaction(
  new TransactionMessage({
    payerKey: vi.publicKey,
    recentBlockhash: PublicKey.default.toBase58(),
    instructions: [
      SystemProgram.transfer({ fromPubkey: vi.publicKey, toPubkey: PublicKey.default, lamports: 1 }),
    ],
  }).compileToV0Message(),
);

/** RPC giả: mô phỏng hỏng ⇒ fail-safe phải cho `warning`, KHÔNG BAO GIỜ `safe`. */
const rpc = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (k) => k.map(() => null),
  getFeeForMessage: async () => ({ value: 5000 }),
  getSignaturesForAddress: async () => [],
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
};

const AI_XAU = [
  ["ném lỗi", async () => { throw new Error("mô hình sập"); }],
  ["trả null", async () => null],
  ["trả undefined", async () => undefined],
  ["trả chuỗi", async () => "an toàn"],
  ["trả số", async () => 42],
  ["thiếu trường", async () => ({})],
  ["level giả danger", async () => ({ level: "danger", explanation: "x", aiAdvisory: null, detectedPrimaryAction: null })],
  ["level giả safe", async () => ({ level: "safe", explanation: "x", aiAdvisory: null, detectedPrimaryAction: null })],
  ["aiAdvisory lạ", async () => ({ explanation: "x", aiAdvisory: "TUYET_DOI_AN_TOAN", detectedPrimaryAction: null })],
  ["explanation khổng lồ", async () => ({ explanation: "X".repeat(500_000), aiAdvisory: null, detectedPrimaryAction: null })],
  ["reasonCodes giả", async () => ({ explanation: "x", aiAdvisory: null, detectedPrimaryAction: null, reasonCodes: [] })],
  ["coverage giả", async () => ({ explanation: "x", aiAdvisory: null, detectedPrimaryAction: null, coverage: { analyzed: 99, total: 99, unverifiedPrograms: 0 } })],
  ["diff giả", async () => ({ explanation: "x", aiAdvisory: null, detectedPrimaryAction: null, diff: [] })],
];

// Mốc: chạy KHÔNG có AI để biết verdict thật.
const goc = await inspect({ connection: rpc }, tx, { locale: "vi" });
console.log(`Mốc (không AI): level=${goc.level} · reasonCodes=${goc.reasonCodes.length} · diff=${goc.diff.length}`);
console.log("=".repeat(64));

for (const [ten, fn] of AI_XAU) {
  let r;
  try {
    r = await inspect({ connection: rpc, interpret: fn }, tx, { locale: "vi" });
  } catch (e) {
    loi.push(`${ten}: inspect() NÉM — ${e?.name}: ${String(e?.message).slice(0, 60)}`);
    console.log(`  !! ${ten.padEnd(22)} inspect() NÉM`);
    continue;
  }

  const van = [];
  if (r.level !== goc.level) van.push(`level ${goc.level}→${r.level}`);
  if (r.level === "safe") van.push("level=safe khi mô phỏng HỎNG (vi phạm fail-safe)");
  if (r.reasonCodes.length !== goc.reasonCodes.length) van.push("reasonCodes đổi");
  if (r.diff.length !== goc.diff.length) van.push("diff đổi");
  if (r.coverage.analyzed !== goc.coverage.analyzed) van.push("coverage đổi");
  if (r.aiAdvisory !== null && r.aiAdvisory !== "review_required")
    van.push(`aiAdvisory lạ "${r.aiAdvisory}"`);
  if (typeof r.explanation === "string" && r.explanation.length > 10_000)
    van.push(`explanation ${r.explanation.length} ký tự — không giới hạn`);

  console.log(`  ${van.length ? "!!" : "ok"} ${ten.padEnd(22)} level=${r.level} · adv=${String(r.aiAdvisory)}${van.length ? " · " + van.join(", ") : ""}`);
  for (const v of van) loi.push(`${ten}: ${v}`);
}

console.log("\n" + "=".repeat(64));
console.log(loi.length ? `LỖI: ${loi.length}` : "L2/L3 giữ được ranh giới ở mọi ca.");
for (const x of loi) console.log("  ✗ " + x);

/**
 * ĐƯA FACTS SEED ĐÓNG BĂNG VỀ ĐÚNG BẤT BIẾN CỦA L1 — chạy MỘT lần, 28/09/2026.
 *
 *   node --experimental-strip-types scripts/ky-thuat/chuyen-facts-mo-phong-hong.ts [--kiem]
 *
 * L1 hiện tại (`packages/core/src/l1/fetch.ts`, "MÔ PHỎNG LỖI THÌ MẢNG `accounts` KHÔNG PHẢI
 * DỮ LIỆU") KHÔNG dựng trạng thái sau khi mô phỏng hỏng: `afterByIndex` rỗng ⇒ `accounts`,
 * `tokenAccounts`, `solDelta` rỗng, mọi account tham gia mô phỏng vào `accountKhongDoDuoc`.
 * Facts seed ghi TRƯỚC bản sửa đó mang số dư sau = 0 bịa ra; luật 13 đọc thành "toàn bộ SOL
 * rời ví" và cáo buộc 5 giao dịch mainnet lành của tập âm (`seedBatBien.test.ts`).
 *
 * Việc này CHỈ bỏ phần L1 hiện tại sẽ không bao giờ sinh ra. Không đổi nhãn, không đổi lệnh,
 * không đổi `simulationOk`/`simulationError`/`coverage`/`mints`/`lookupTables`. Giao dịch gốc
 * (`data/seed/tx/*.base64`) giữ nguyên để ai cũng trích lại được.
 * `--kiem`: chỉ in thứ sẽ đổi, không ghi.
 */
import { readFileSync, writeFileSync } from "node:fs";

const KIEM = process.argv.includes("--kiem");
const idx = JSON.parse(readFileSync("data/seed/index.json", "utf8")) as { mau: Array<{ id: string; facts: string }> };
let doi = 0;
for (const m of idx.mau) {
  const p = `data/seed/${m.facts}`;
  const f = JSON.parse(readFileSync(p, "utf8")) as Record<string, unknown> & {
    simulationOk: boolean;
    accounts: Array<{ address: string }>;
    tokenAccounts: Array<{ address: string }>;
    solDelta: Record<string, string>;
    accountKhongDoDuoc?: string[];
  };
  if (f.simulationOk) continue;
  if (!f.accounts.length && !f.tokenAccounts.length && !Object.keys(f.solDelta).length) continue;
  // Account có trạng thái sau BỊA = account đã tham gia mô phỏng ⇒ chưa đo được.
  const khongDo = new Set([...(f.accountKhongDoDuoc ?? []), ...f.accounts.map((a) => a.address), ...f.tokenAccounts.map((t) => t.address)]);
  console.log(`${m.id}: bỏ ${f.accounts.length} account · ${f.tokenAccounts.length} token · ${Object.keys(f.solDelta).length} solDelta → ${khongDo.size} chưa đo`);
  doi++;
  if (KIEM) continue;
  f.accounts = [];
  f.tokenAccounts = [];
  f.solDelta = {};
  f.accountKhongDoDuoc = [...khongDo];
  writeFileSync(p, JSON.stringify(f, null, 2));
}
console.log(`${KIEM ? "sẽ đổi" : "đã đổi"} ${doi} tệp`);

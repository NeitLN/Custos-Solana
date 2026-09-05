/**
 * ĐO MA SÁT TÍCH HỢP — dàn `vi-du-tich-hop/` ra NGOÀI monorepo rồi chạy thật.
 *
 *   node scripts/thu-tich-hop.mjs
 *
 * Khác `thu-goi-nguoi-ngoai.mjs` ở chỗ nó không chỉ hỏi "gói có import được
 * không". Nó chạy một luồng dApp thật trên Devnet — giao dịch bình thường, giao
 * dịch giả danh airdrop, và RPC chết — rồi ghi lại thời gian và số dòng.
 *
 * ⚠️ ĐÂY LÀ TÍCH HỢP DO CHÍNH ĐỘI DỰNG.
 *
 * Nó chứng minh SDK **cài được và dùng được từ vị trí người ngoài**, và đo được
 * tích hợp tốn bao lâu. Nó KHÔNG chứng minh có bên thứ ba nào chọn dùng Custos.
 * Hai câu đó khác nhau, và gộp chúng lại là bịa traction. Guard:
 * `packages/core/test/tichHop.test.ts`.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const GOC = resolve(import.meta.dirname, "..");
const boc = (s) => (win && s.includes(" ") ? `"${s}"` : s);
const chay = (cmd, args, cwd) =>
  execFileSync(boc(cmd), win ? args.map(boc) : args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: win,
  });

/** Đếm dòng mã THẬT: bỏ dòng trống và dòng chú thích. Con số này lên báo cáo. */
function demDongMa(duong) {
  let trongKhoi = false;
  return readFileSync(duong, "utf8")
    .split("\n")
    .filter((d) => {
      const t = d.trim();
      if (trongKhoi) {
        if (t.includes("*/")) trongKhoi = false;
        return false;
      }
      if (t.startsWith("/*")) {
        trongKhoi = !t.includes("*/");
        return false;
      }
      return t !== "" && !t.startsWith("//") && !t.startsWith("*");
    }).length;
}

const san = mkdtempSync(join(tmpdir(), "custos-tich-hop-"));
const bao = { doLuc: new Date().toISOString() };

try {
  console.log("1/4 · đóng gói tarball SDK");
  const thung = join(san, "tarball");
  chay(process.execPath, [join(GOC, "scripts", "dong-goi-sdk.mjs"), thung], GOC);
  const tgz = readdirSync(thung).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 3) throw new Error(`chờ 3 tarball, nhận ${tgz.length}`);

  console.log("2/4 · dàn dApp mẫu ra ngoài monorepo");
  const duAn = join(san, "du-an");
  mkdirSync(duAn, { recursive: true });
  cpSync(join(GOC, "vi-du-tich-hop"), duAn, { recursive: true });
  cpSync(join(GOC, "apps/demo-wallet/public/hien-truong.json"), join(duAn, "hien-truong.json"));

  const duong = (ten) => "file:" + join(thung, tgz.find((f) => f.startsWith(ten))).replaceAll("\\", "/");
  // `overrides` bắt buộc, cùng lý do như `thu-goi-nguoi-ngoai.mjs`: không có nó npm
  // kéo @custos-solana/types TỪ REGISTRY và bài đo sẽ đo bản đã publish, không phải
  // bản vừa đóng gói.
  const goi = {
    "@custos-solana/types": duong("custos-solana-types"),
    "@custos-solana/core": duong("custos-solana-core"),
    "@custos-solana/ai": duong("custos-solana-ai"),
  };
  const pkg = JSON.parse(readFileSync(join(duAn, "package.json"), "utf8"));
  pkg.dependencies = { ...pkg.dependencies, ...goi };
  pkg.overrides = goi;
  writeFileSync(join(duAn, "package.json"), JSON.stringify(pkg, null, 2));

  console.log("3/4 · npm install ở vị trí người ngoài");
  const tCai = Date.now();
  chay(npm, ["install", "--no-audit", "--no-fund", "--loglevel", "error"], duAn);
  bao.msCaiDat = Date.now() - tCai;

  console.log("4/4 · chạy ba kịch bản trên Devnet\n");
  const tChay = Date.now();
  const ra = chay(process.execPath, ["src/chay.js"], duAn);
  bao.msChay = Date.now() - tChay;
  process.stdout.write(ra.trim().split("\n").slice(0, -1).join("\n") + "\n");

  const cuoi = ra.trim().split("\n").at(-1);
  Object.assign(bao, JSON.parse(cuoi));
  bao.dat = bao.kiem.every((k) => k.dat);
} finally {
  rmSync(san, { recursive: true, force: true });
}

bao.dongMaTichHop = demDongMa(join(GOC, "vi-du-tich-hop/src/tich-hop.js"));
// Cài đặt + tới kết quả kịch bản ĐẦU TIÊN. `msChay` là cả script, gồm cả 5 lượt
// benchmark và kịch bản RPC-chết — cộng chúng vào đây là đo sai thứ đang gọi tên.
bao.msDenKetQuaDauTien = bao.msCaiDat + bao.msKetQuaDau;
// Nói rõ ngay trong dữ liệu, để không ai đọc file này rồi kết luận sai.
bao.doiTac = null;
bao.ghiChu =
  "Tích hợp do chính đội dựng. Chứng minh SDK dùng được từ ngoài monorepo; " +
  "KHÔNG chứng minh có bên thứ ba nào đã chọn dùng Custos.";

mkdirSync(join(GOC, "data/tich-hop"), { recursive: true });
writeFileSync(join(GOC, "data/tich-hop/ket-qua.json"), JSON.stringify(bao, null, 2) + "\n");

console.log(`\n  cài đặt            : ${(bao.msCaiDat / 1000).toFixed(1)} s`);
console.log(`  chạy ba kịch bản   : ${(bao.msChay / 1000).toFixed(1)} s`);
console.log(`  -> tới kết quả đầu : ${(bao.msDenKetQuaDauTien / 1000).toFixed(1)} s`);
console.log(`  một lượt inspect() : ${bao.msMotLuotKiem} ms`);
console.log(`  dòng mã tích hợp   : ${bao.dongMaTichHop}`);
console.log("\n→ data/tich-hop/ket-qua.json");
process.exit(bao.dat ? 0 : 1);

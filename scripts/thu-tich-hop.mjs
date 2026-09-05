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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MỘT LƯỢT CHẠY HỎNG PHẢI ĐỂ LẠI BẰNG CHỨNG HỎNG.
 *
 * Bản trước dùng `execFileSync`. Khi `src/chay.js` có check đỏ, nó `process.exit(1)`
 * SAU KHI đã in JSON kết quả — nhưng `execFileSync` ném ngay ở dòng đó, nên:
 *
 *   · stdout mang payload bị vứt;
 *   · `writeFileSync` cuối file không bao giờ chạy;
 *   · `data/tich-hop/ket-qua.json` GIỮ NGUYÊN lượt pass trước đó;
 *   · `npm run nop-bai` đọc file cũ rồi in "✓ Ví dụ tích hợp chạy được 8/8".
 *
 * Đã tái lập: chèn một check đỏ cố ý, harness thoát 1, và file bằng chứng không
 * đổi một byte — vẫn `dat: true` của lượt hôm trước. Người chạy thì nhận một stack
 * trace của Node thay vì danh sách check.
 *
 * Đây là lỗi bằng chứng phát hành: bản đỏ vẫn làm hệ thống trông xanh. Nên schema
 * tách hai thứ từng bị trộn làm một:
 *
 *   lastAttempt     — lượt chạy GẦN NHẤT, pass hay fail. Cổng đọc trường này.
 *   lastSuccessful  — lượt PASS gần nhất. Số benchmark công bố lấy ở đây, và luôn
 *                     phải kèm ngày, vì nó có thể không phải lượt vừa chạy.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const GOC = resolve(import.meta.dirname, "..");
const KQ = "data/tich-hop/ket-qua.json";
const boc = (s) => (win && s.includes(" ") ? `"${s}"` : s);

/** Chạy tiến trình con và TRẢ VỀ kết quả. Không bao giờ ném — người gọi quyết định. */
function chay(cmd, args, cwd) {
  const r = spawnSync(boc(cmd), win ? args.map(boc) : args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: win,
  });
  return {
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    status: r.status,
    signal: r.signal,
    error: r.error ?? null,
  };
}

/** Lỗi mang theo phân loại, để bằng chứng nói được HỎNG KIỂU GÌ. */
class LoiHarness extends Error {
  constructor(loai, thongDiep) {
    super(thongDiep);
    this.loai = loai;
  }
}

/** Bước dựng sân: hỏng là hỏng, không có payload nào để đọc. */
function phaiXong(buoc, r) {
  if (r.error) throw new LoiHarness("harness_error", `${buoc}: ${r.error.message ?? r.error}`);
  if (r.signal) throw new LoiHarness("child_signal", `${buoc}: bị tín hiệu ${r.signal}`);
  if (r.status !== 0) {
    const duoi = (r.stderr || r.stdout).trim().split("\n").slice(-6).join("\n");
    throw new LoiHarness("harness_setup", `${buoc}: thoát ${r.status}\n${duoi}`);
  }
  return r.stdout;
}

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

function chayGit(args) {
  const r = chay("git", args, GOC);
  return r.status === 0 ? r.stdout.trim() : null;
}

/*
 * ĐỌC FILE CŨ ĐỂ GIỮ LẠI LƯỢT PASS, KHÔNG PHẢI ĐỂ DÙNG NÓ BÁO XANH.
 *
 * File v1 (không có `schemaVersion`) mà `dat: true` là một lượt pass thật đã đo
 * được — giữ nó làm `lastSuccessful`. Xoá đi là mất dữ liệu thật; dùng nó làm
 * trạng thái hiện tại là nói dối. Cả hai đều sai, và chúng khác nhau.
 */
function nenCu() {
  const d = join(GOC, KQ);
  if (!existsSync(d)) return null;
  try {
    const cu = JSON.parse(readFileSync(d, "utf8"));
    if (cu.schemaVersion >= 2) return cu.lastSuccessful ?? null;
    return cu.dat === true ? { ...cu, schemaVersion: 1 } : null;
  } catch {
    return null;
  }
}

const san = mkdtempSync(join(tmpdir(), "custos-tich-hop-"));
const batDau = new Date();
const luot = {
  dat: false,
  sourceCommit: chayGit(["rev-parse", "HEAD"]),
  dirtyWorktree: (chayGit(["status", "--porcelain"]) ?? "") !== "",
  node: process.version,
  npm: (() => {
    const r = chay(npm, ["--version"], GOC);
    return r.status === 0 ? r.stdout.trim() : null;
  })(),
  startedAt: batDau.toISOString(),
  finishedAt: null,
  exitCode: null,
  failureCategory: null,
  loi: null,
  kiem: [],
};

try {
  console.log("1/4 · đóng gói tarball SDK");
  const thung = join(san, "tarball");
  phaiXong("đóng gói", chay(process.execPath, [join(GOC, "scripts", "dong-goi-sdk.mjs"), thung], GOC));
  const tgz = readdirSync(thung).filter((f) => f.endsWith(".tgz"));
  if (tgz.length !== 3) throw new LoiHarness("harness_setup", `chờ 3 tarball, nhận ${tgz.length}`);

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
  phaiXong("npm install", chay(npm, ["install", "--no-audit", "--no-fund", "--loglevel", "error"], duAn));
  luot.msCaiDat = Date.now() - tCai;

  console.log("4/4 · chạy ba kịch bản trên Devnet\n");
  const tChay = Date.now();
  const r = chay(process.execPath, ["src/chay.js"], duAn);
  luot.msChay = Date.now() - tChay;
  luot.exitCode = r.status;

  /*
   * KỊCH BẢN ĐỎ VẪN CÓ PAYLOAD — ĐỌC NÓ TRƯỚC KHI KẾT LUẬN.
   *
   * `chay.js` in JSON rồi mới `exit(1)`. Coi exit code khác 0 là "không có gì để
   * đọc" chính là chỗ bản trước đánh mất toàn bộ bằng chứng thất bại.
   */
  const dong = r.stdout.trim().split("\n");
  if (dong.length > 1) process.stdout.write(dong.slice(0, -1).join("\n") + "\n");

  if (r.error) throw new LoiHarness("harness_error", String(r.error.message ?? r.error));
  if (r.signal) throw new LoiHarness("child_signal", `kịch bản bị tín hiệu ${r.signal}`);

  let payload;
  try {
    payload = JSON.parse(dong.at(-1));
  } catch {
    const duoi = (r.stderr || r.stdout).trim().split("\n").slice(-6).join("\n");
    throw new LoiHarness("harness_parse_error", `dòng cuối không phải JSON:\n${duoi}`);
  }

  Object.assign(luot, payload);
  luot.dat = Array.isArray(luot.kiem) && luot.kiem.length > 0 && luot.kiem.every((k) => k.dat);
  if (!luot.dat) {
    luot.failureCategory = "assertion_failure";
    const hong = luot.kiem.filter((k) => !k.dat);
    luot.loi = `${hong.length} kiểm tra không đạt: ${hong.map((k) => k.ten).join(" · ")}`;
  }
} catch (e) {
  luot.dat = false;
  luot.failureCategory = e instanceof LoiHarness ? e.loai : "harness_error";
  luot.loi = e instanceof Error ? e.message : String(e);
  console.error(`\n✖ lượt chạy hỏng [${luot.failureCategory}]\n${luot.loi}\n`);
} finally {
  rmSync(san, { recursive: true, force: true });
}

luot.finishedAt = new Date().toISOString();
luot.dongMaTichHop = demDongMa(join(GOC, "vi-du-tich-hop/src/tich-hop.js"));
// Cài đặt + tới kết quả kịch bản ĐẦU TIÊN. `msChay` là cả script, gồm cả 5 lượt
// benchmark và kịch bản RPC-chết — cộng chúng vào đây là đo sai thứ đang gọi tên.
if (typeof luot.msCaiDat === "number" && typeof luot.msKetQuaDau === "number") {
  luot.msDenKetQuaDauTien = luot.msCaiDat + luot.msKetQuaDau;
}

const bao = {
  schemaVersion: 2,
  // Nói rõ ngay trong dữ liệu, để không ai đọc file này rồi kết luận sai.
  doiTac: null,
  ghiChu:
    "Tích hợp do chính đội dựng. Chứng minh SDK dùng được từ ngoài monorepo; " +
    "KHÔNG chứng minh có bên thứ ba nào đã chọn dùng Custos.",
  // Cổng nộp bài đọc `lastAttempt`. `lastSuccessful` chỉ để trích số benchmark, và
  // ai hiển thị nó đều phải kèm `finishedAt` — nó có thể không phải lượt vừa chạy.
  lastAttempt: luot,
  lastSuccessful: luot.dat ? luot : nenCu(),
};

mkdirSync(join(GOC, "data/tich-hop"), { recursive: true });
writeFileSync(join(GOC, KQ), JSON.stringify(bao, null, 2) + "\n");

if (luot.dat) {
  console.log(`\n  cài đặt            : ${(luot.msCaiDat / 1000).toFixed(1)} s`);
  console.log(`  chạy ba kịch bản   : ${(luot.msChay / 1000).toFixed(1)} s`);
  console.log(`  -> tới kết quả đầu : ${(luot.msDenKetQuaDauTien / 1000).toFixed(1)} s`);
  console.log(`  một lượt inspect() : ${luot.msMotLuotKiem} ms`);
  console.log(`  dòng mã tích hợp   : ${luot.dongMaTichHop}`);
} else {
  console.error(`  phân loại lỗi      : ${luot.failureCategory}`);
  if (bao.lastSuccessful?.finishedAt || bao.lastSuccessful?.doLuc) {
    console.error(
      `  lượt pass gần nhất : ${bao.lastSuccessful.finishedAt ?? bao.lastSuccessful.doLuc}` +
        " — GIỮ LÀM LỊCH SỬ, KHÔNG PHẢI TRẠNG THÁI HIỆN TẠI",
    );
  }
}

console.log(`\n→ ${KQ}`);
process.exit(luot.dat ? 0 : 1);

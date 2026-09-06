import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { docBangChungTichHop, thoiDiem } from "./bangChungTichHop.ts";
import { bangChungConHieuLuc } from "./toTien.ts";

/**
 * CỔNG CHỈ-SẢN-PHẨM.
 *
 *   npm run kiem-san-pham
 *
 * `npm run nop-bai -- --strict` trộn chất lượng sản phẩm với việc nộp hồ sơ: video,
 * lịch thi, tag phát hành. Đó là thước đo đúng cho câu hỏi "nộp được chưa", và là
 * thước đo SAI cho câu hỏi "sản phẩm tốt chưa" — nó đỏ vì những thứ không nằm trong
 * mã, nên nhìn vào nó không biết được code đang ở đâu.
 *
 * Cổng này chỉ hỏi về sản phẩm. Nó KHÔNG hỏi về video, lịch thi, hay bất kỳ việc
 * trình bày nào; hai cổng tồn tại song song, không cái nào thay cái nào.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NÓ TỰ CHẠY THỨ NÓ TUYÊN BỐ.
 *
 * Bài học đắt nhất của repo này: một artifact đang xanh không chứng minh gì về commit
 * hiện tại. `data/tich-hop/ket-qua.json` từng giữ `dat: true` suốt qua một lượt chạy
 * đỏ. Nên ở đây, thứ nào chạy được trong vài giây thì cổng CHẠY, không đọc lại kết
 * quả cũ. Thứ nào quá đắt hoặc cần quyền ngoài thì phải tự khai đúng trạng thái —
 * và `CHƯA ĐO` không bao giờ được đọc thành `ĐẠT`.
 */

const NL = String.fromCharCode(10);

/*
 * SÁU TRẠNG THÁI, KHÔNG PHẢI HAI.
 *
 * "Không kiểm được" và "kiểm rồi, hỏng" là hai chuyện khác nhau, và gộp chúng lại
 * là cách một cổng nói dối mà vẫn đúng cú pháp.
 */
type TrangThai =
  | "DAT" // chạy rồi, đạt
  | "HONG" // chạy rồi, không đạt — đây là lỗi sản phẩm
  | "KHONG_KIEM_DUOC" // thiếu mạng/công cụ; KHÔNG phải đạt, cũng không phải lỗi
  | "CU" // có kết quả nhưng thuộc commit khác
  | "CHUA_DO" // chưa ai đo bao giờ
  | "CHO_CHU_DU_AN"; // cần quyền ngoài

type O = { ten: string; tt: TrangThai; chiTiet: string };

const o: O[] = [];
const them = (ten: string, tt: TrangThai, chiTiet: string) => {
  o.push({ ten, tt, chiTiet });
  const dau = { DAT: "✓", HONG: "✖", KHONG_KIEM_DUOC: "?", CU: "~", CHUA_DO: "·", CHO_CHU_DU_AN: "⏸" }[tt];
  console.log(`  ${dau} ${ten.padEnd(38)} ${chiTiet}`);
};

const NHANH = process.argv.includes("--nhanh");

function chay(cmd: string, args: string[]) {
  // Chỉ `npm` mới cần shell trên Windows (nó là `.cmd`). `git` và `node` thì không —
  // và `shell: true` nối chuỗi tham số thay vì escape, nên Node cảnh báo DEP0190.
  // Ở đây mọi tham số đều là hằng do repo viết, nhưng không cần shell thì đừng bật.
  return spawnSync(cmd, args, {
    encoding: "utf8",
    shell: process.platform === "win32" && cmd === "npm",
    maxBuffer: 64 * 1024 * 1024,
  });
}

const git = (args: string[]) => {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
};

const HEAD = git(["rev-parse", "HEAD"]) ?? "";

console.log(`CỔNG CHỈ-SẢN-PHẨM · ${HEAD.slice(0, 7)}${NHANH ? " · chế độ nhanh" : ""}${NL}`);

// ── 1 · typecheck + toàn bộ test ────────────────────────────────────────────
if (NHANH) {
  them("Typecheck và bộ test", "CHUA_DO", "bỏ qua ở chế độ --nhanh");
} else {
  const r = chay("npm", ["run", "check"]);
  const so = /^ℹ pass (\d+)$/m.exec(r.stdout ?? "")?.[1];
  const fail = /^ℹ fail (\d+)$/m.exec(r.stdout ?? "")?.[1];
  them(
    "Typecheck và bộ test",
    r.status === 0 ? "DAT" : "HONG",
    r.status === 0 ? `${so} test pass · 0 fail` : `${fail ?? "?"} ca đỏ`,
  );
}

// ── 2 · cổng tích hợp tất định ──────────────────────────────────────────────
{
  const r = chay("npm", ["run", "thu-tich-hop:deterministic"]);
  const n = /=== .*· (\d+) kiểm tra ===/.exec(r.stdout ?? "")?.[1];
  them(
    "Cổng tích hợp tất định",
    r.status === 0 && (r.stdout ?? "").includes("TAT-DINH-OK") ? "DAT" : "HONG",
    r.status === 0 ? `${n} kiểm tra, fixture — không mạng` : "có kiểm tra không đạt",
  );
}

// ── 3 · gói dùng được từ ngoài + bẫy đối kháng trên artifact ────────────────
if (NHANH) {
  them("Gói dùng được từ ngoài + 10 bẫy", "CHUA_DO", "bỏ qua ở chế độ --nhanh");
} else {
  const r = chay("npm", ["run", "thu-goi"]);
  const ra = (r.stdout ?? "") + (r.stderr ?? "");
  const bay = /DOI-KHANG-OK (\d+)\/(\d+)/.exec(ra);
  if (r.status === 0 && bay) {
    them("Gói dùng được từ ngoài + bẫy", "DAT", `${bay[1]}/${bay[2]} bẫy bị chặn trên tarball`);
  } else if (/ENOTFOUND|EAI_AGAIN|network|ETIMEDOUT/i.test(ra)) {
    // Không có mạng thì KHÔNG kiểm được — khác hẳn với "gói hỏng".
    them("Gói dùng được từ ngoài + bẫy", "KHONG_KIEM_DUOC", "không tải được phụ thuộc");
  } else {
    them("Gói dùng được từ ngoài + bẫy", "HONG", "xem `npm run thu-goi`");
  }
}

// ── 4 · bằng chứng live thuộc đúng commit này ───────────────────────────────
{
  const bc = docBangChungTichHop();
  const l = bc?.lanGanNhat;
  if (!bc || !l) {
    them("Lượt live gần nhất", "CHUA_DO", "chưa chạy `npm run thu-tich-hop:devnet`");
  } else if (bc.schemaVersion < 2) {
    them("Lượt live gần nhất", "CU", "schema v1 — không ghi được lượt hỏng");
  } else if (l.dat !== true) {
    // Lượt live hỏng vì MẠNG không phải lỗi sản phẩm. Nói đúng loại, đừng gộp.
    const haTang = /rpc|timeout|blockhash|simulation/i.test(l.failureCategory ?? "");
    them(
      "Lượt live gần nhất",
      haTang ? "KHONG_KIEM_DUOC" : "HONG",
      `${l.failureCategory} — ${haTang ? "hạ tầng, không phải lỗi phát hiện" : "lỗi sản phẩm"}`,
    );
  } else if (l.dirtyWorktree) {
    them("Lượt live gần nhất", "CU", "đo trên cây có mã chưa commit");
  } else {
    /*
     * ĐÒI `sourceCommit === HEAD` LÀ MỘT CỔNG KHÔNG BAO GIỜ MỞ ĐƯỢC.
     *
     * Đo xong phải commit kết quả, và commit đó làm HEAD đổi. Tôi đã viết đúng cái
     * đó ở bản đầu của chính file này — lần thứ sáu cùng một lỗi trong repo. Quy tắc
     * thật nằm ở `toTien.ts`: SHA phải là tổ tiên, và từ đó tới HEAD chỉ tài liệu
     * được đổi.
     */
    const kl = bangChungConHieuLuc(l.sourceCommit);
    them(
      "Lượt live gần nhất",
      kl.con ? "DAT" : kl.nongCan ? "KHONG_KIEM_DUOC" : "CU",
      kl.con ? `PASS · ${kl.vi} · ${thoiDiem(l)}` : kl.vi,
    );
  }
}

// ── 5 · runtime chỉ Devnet ──────────────────────────────────────────────────
{
  const r = chay("git", ["grep", "-l", "mainnet-beta", "--", "packages", "apps/*/src", "vi-du-tich-hop/src"]);
  const dinh = (r.stdout ?? "")
    .split(NL)
    .map((x) => x.trim())
    .filter((x) => x && !x.includes("/test/"));
  them(
    "Runtime chỉ Devnet",
    dinh.length === 0 ? "DAT" : "HONG",
    dinh.length === 0 ? "không endpoint Mainnet nào trong runtime" : dinh.join(", "),
  );
}

// ── 6 · không khoá trong bundle công khai ───────────────────────────────────
{
  if (!existsSync("site")) {
    // Chưa build thì chưa có gì để soi. Nói thế, đừng nói "sạch".
    them("Không khoá trong bundle", "CHUA_DO", "chưa có `site/` — chạy build trước");
  } else {
    const r = chay("node", ["scripts/soi-ro-ri-khoa.mjs", "site"]);
    them(
      "Không khoá trong bundle",
      r.status === 0 ? "DAT" : "HONG",
      r.status === 0 ? "đã soi bundle công khai" : "xem `npm run soi-khoa`",
    );
  }
}

/*
 * ── 7 · số liệu khớp artifact ──────────────────────────────────────────────
 *
 * MỘT CỔNG KHÔNG ĐƯỢC LÀM BẨN CÂY RỒI TỰ ĐỎ VÌ CHÍNH VIỆC ĐÓ.
 *
 * Bản đầu chạy `dong-bo-so-tai-lieu.mjs` — vốn GHI FILE — rồi vài dòng sau ô "cây
 * làm việc sạch" thấy file chưa commit và báo hỏng. Cổng tự tạo ra lỗi mà nó tố cáo.
 * Đây là lần thứ năm cùng hình dạng lỗi đó trong repo này.
 *
 * Nên: ghi nhớ file nào ĐANG sạch, chạy đồng bộ, xem file nào vừa bẩn lên, rồi TRẢ
 * LẠI đúng những file đó. File người dùng đang sửa dở thì không đụng tới.
 */
if (NHANH) {
  them("Số liệu khớp artifact", "CHUA_DO", "bỏ qua ở chế độ --nhanh");
} else {
  const banDau = new Set(
    (git(["status", "--porcelain"]) ?? "")
      .split(NL)
      .map((d) => d.slice(3).trim())
      .filter(Boolean),
  );

  const r = chay("node", ["scripts/dong-bo-so-tai-lieu.mjs", "--da-do"]);

  const sau = (git(["status", "--porcelain"]) ?? "")
    .split(NL)
    .map((d) => d.slice(3).trim())
    .filter(Boolean);
  const doCong = sau.filter((f) => !banDau.has(f));

  // Trả lại đúng thứ cổng vừa làm bẩn, không đụng thứ người dùng đang sửa.
  for (const f of doCong) git(["checkout", "--", f]);

  them(
    "Số liệu khớp artifact",
    r.status !== 0 ? "HONG" : doCong.length === 0 ? "DAT" : "HONG",
    r.status !== 0
      ? "bước đồng bộ hỏng"
      : doCong.length === 0
        ? "mọi tài liệu khớp một nguồn"
        : `${doCong.length} tài liệu lệch số đo (${doCong.join(", ")}) — chạy \`npm run so-lieu\``,
  );
}

// ── 8 · registry và source nói cùng một chuyện ──────────────────────────────
{
  const vLocal = (JSON.parse(readFileSync("packages/ai/package.json", "utf8")) as { version: string }).version;
  const r = chay("npm", ["view", "@custos-solana/ai", "version"]);
  const vReg = r.status === 0 ? (r.stdout ?? "").trim() : null;
  if (vReg === null) {
    them("Registry khớp source", "KHONG_KIEM_DUOC", "không hỏi được registry");
  } else if (vReg === vLocal) {
    them("Registry khớp source", "DAT", `cả hai ${vReg}`);
  } else {
    // Không phải lỗi mã: publish cần quyền npm của chủ dự án.
    them("Registry khớp source", "CHO_CHU_DU_AN", `registry ${vReg} · source ${vLocal} — cần publish`);
  }
}

// ── 9 · accessibility trên chính bản dựng hiện tại ──────────────────────────
{
  const D = "data/a11y/ket-qua.json";
  if (!existsSync(D)) {
    them("Accessibility bản hiện tại", "CHUA_DO", "chưa có `data/a11y/ket-qua.json`");
  } else {
    const a = JSON.parse(readFileSync(D, "utf8")) as {
      sourceCommit?: string;
      viPham?: Array<{ impact?: string }>;
    };
    const nang = (a.viPham ?? []).filter((v) => v.impact === "serious" || v.impact === "critical");
    if (a.sourceCommit !== HEAD) {
      them("Accessibility bản hiện tại", "CU", `đo tại ${(a.sourceCommit ?? "?").slice(0, 7)}`);
    } else {
      them(
        "Accessibility bản hiện tại",
        nang.length === 0 ? "DAT" : "HONG",
        nang.length === 0 ? "không vi phạm serious/critical" : `${nang.length} vi phạm nặng`,
      );
    }
  }
}

// ── 10 · lỗ hổng phụ thuộc có xử trí, không chỉ có số ───────────────────────
{
  const r = chay("npm", ["audit", "--json"]);
  let tong: Record<string, number> | null = null;
  try {
    tong = (JSON.parse(r.stdout ?? "{}") as { metadata?: { vulnerabilities?: Record<string, number> } })
      .metadata?.vulnerabilities ?? null;
  } catch {
    tong = null;
  }
  const D = "docs/PHU-THUOC.md";
  if (tong === null) {
    them("Lỗ hổng phụ thuộc có xử trí", "KHONG_KIEM_DUOC", "không chạy được `npm audit`");
  } else if (!existsSync(D)) {
    // Biết số mà không nói định làm gì với nó thì chưa phải là đã xử lý.
    them("Lỗ hổng phụ thuộc có xử trí", "CHUA_DO", `${tong["high"] ?? 0} high · ${tong["moderate"] ?? 0} moderate, chưa có ${D}`);
  } else if ((tong["critical"] ?? 0) > 0) {
    them("Lỗ hổng phụ thuộc có xử trí", "HONG", `${tong["critical"]} critical`);
  } else {
    them("Lỗ hổng phụ thuộc có xử trí", "DAT", `${tong["high"] ?? 0} high · ${tong["moderate"] ?? 0} moderate, đã ghi xử trí`);
  }
}

// ── 11 · cây làm việc sạch ──────────────────────────────────────────────────
{
  const ban = git(["status", "--porcelain"]);
  them(
    "Cây làm việc sạch",
    ban === "" ? "DAT" : "HONG",
    ban === "" ? `HEAD ${HEAD.slice(0, 7)}` : `${ban!.split(NL).length} file chưa commit`,
  );
}

// ── tổng kết ────────────────────────────────────────────────────────────────
const dem = (t: TrangThai) => o.filter((x) => x.tt === t).length;
const hong = o.filter((x) => x.tt === "HONG");
const chuaRo = o.filter((x) => x.tt === "KHONG_KIEM_DUOC" || x.tt === "CU" || x.tt === "CHUA_DO");
const cho = o.filter((x) => x.tt === "CHO_CHU_DU_AN");

console.log(
  `${NL}${dem("DAT")} đạt · ${hong.length} hỏng · ${chuaRo.length} chưa rõ · ${cho.length} chờ chủ dự án`,
);

if (chuaRo.length > 0) {
  console.log(`${NL}  CHƯA RÕ — không được đọc thành đạt:`);
  for (const x of chuaRo) console.log(`    ${x.ten} — ${x.chiTiet}`);
}
if (cho.length > 0) {
  console.log(`${NL}  CHỜ CHỦ DỰ ÁN:`);
  for (const x of cho) console.log(`    ${x.ten} — ${x.chiTiet}`);
}

/*
 * MÃ THOÁT CHỈ PHẢN ÁNH LỖI SẢN PHẨM.
 *
 * `CHUA_DO` và `KHONG_KIEM_DUOC` không làm cổng đỏ — chúng không phải lỗi mã, và
 * biến chúng thành đỏ sẽ dạy người ta bỏ qua màu đỏ. Nhưng chúng cũng KHÔNG được
 * đếm vào phần "đạt", nên dòng tổng kết luôn in riêng ra.
 */
if (hong.length > 0) {
  console.error(`${NL}✖ SẢN PHẨM CHƯA ĐẠT — ${hong.length} ô hỏng:`);
  for (const x of hong) console.error(`    ${x.ten} — ${x.chiTiet}`);
  process.exit(1);
}
console.log(`${NL}✓ Không ô nào hỏng.${chuaRo.length > 0 ? " Còn ô chưa đo — xem ở trên." : ""}`);

/**
 * CHẠY BẪY ĐỐI KHÁNG TRÊN GÓI ĐÃ PHÁT HÀNH — không phải trên tarball local.
 *
 *   node scripts/thu-goi-registry.mjs [phienBan]
 *
 * Vì sao cần lệnh riêng, khi `thu-goi` đã chạy đủ mười bẫy:
 *
 * `thu-goi` đóng gói mã HIỆN TẠI rồi kiểm bản vừa đóng. Nó trả lời "mã hôm nay có
 * an toàn không". Nó KHÔNG trả lời "thứ người ta `npm install` hôm nay có an toàn
 * không" — và hai câu đó đã lệch nhau suốt từ khi `0.2.0` chưa được publish.
 *
 * Trước khi có lệnh này, tài liệu của repo viết "gói npm không có lớp bảo vệ nào",
 * dựa trên việc grep thấy thiếu tên hàm trong `dist`. Thiếu tên là bằng chứng gián
 * tiếp; nó không chứng minh lời bịa TỚI ĐƯỢC người dùng. Muốn nói câu đó thì phải đo
 * đúng câu đó.
 *
 * Kết quả đo ngày 06/09/2026 trên `ai@0.1.2` + `core@0.1.1`:
 *
 *     9/10 bẫy đưa lời bịa tới người dùng
 *     1/10 bị chặn — câu chứa "an toàn", vốn đã nằm trong danh sách cấm của 0.1.2
 *     0/10 làm đổi `level` — engine luật không hề bị chạm
 *
 * Con số cuối quan trọng ngang hai con số đầu: kể cả bản chưa vá, AI vẫn không
 * quyết định được phán quyết. Lớp neo bảo vệ LỜI VĂN, không bảo vệ verdict.
 *
 * Lệnh này KHÔNG nằm trong CI: nó phụ thuộc registry và cố ý đỏ khi registry còn
 * phục vụ bản cũ. Nó là phép đo để trích dẫn, và là bài kiểm nghiệm thu sau khi
 * publish `0.2.0`.
 */
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const GOC = resolve(import.meta.dirname, "..");
const NL = String.fromCharCode(10);
const PHIEN_BAN = process.argv[2] ?? "latest";

const chay = (cmd, args, cwd) =>
  spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    shell: win && cmd === npm,
    maxBuffer: 64 * 1024 * 1024,
  });

const san = mkdtempSync(join(tmpdir(), "custos-registry-"));
let ma = 1;

try {
  console.log(`1/3 · dựng project trống ngoài monorepo`);
  const duAn = join(san, "du-an");
  mkdirSync(duAn, { recursive: true });
  writeFileSync(
    join(duAn, "package.json"),
    JSON.stringify({ name: "thu-registry", private: true, type: "module" }, null, 2),
  );

  console.log(`2/3 · npm install TỪ REGISTRY (@${PHIEN_BAN}) — không dùng file: hay overrides`);
  const cai = chay(
    npm,
    [
      "install",
      "--no-audit",
      "--no-fund",
      "--loglevel",
      "error",
      `@custos-solana/core@${PHIEN_BAN}`,
      `@custos-solana/ai@${PHIEN_BAN}`,
      "@solana/web3.js@^1",
    ],
    duAn,
  );
  if (cai.status !== 0) {
    console.error(`✖ không cài được từ registry:${NL}${(cai.stderr || cai.stdout || "").trim()}`);
    process.exit(1);
  }

  // Đọc thẳng manifest: project tiêu thụ là ESM (`type: module`) nên `require` trong
  // `node -p` không dùng được ở đó.
  const ver = (goi) =>
    JSON.parse(readFileSync(join(duAn, "node_modules", ...goi.split("/"), "package.json"), "utf8"))
      .version;
  console.log(`      ai=${ver("@custos-solana/ai")} · core=${ver("@custos-solana/core")}`);

  console.log(`3/3 · mười bẫy đối kháng trên chính gói vừa cài${NL}`);
  cpSync(join(GOC, "scripts", "tieu-thu-doi-khang.mjs"), join(duAn, "doi-khang.mjs"));
  const r = chay(process.execPath, ["doi-khang.mjs"], duAn);
  const ra = (r.stdout ?? "") + (r.stderr ?? "");

  /*
   * Đọc DÒNG TỔNG KẾT do chính bộ bẫy in ra, không cào regex trên toàn stdout.
   *
   * Bản đầu đếm bằng regex và ra "chặn được 1/28" cho một bộ mười bẫy: thông báo
   * `assert.deepEqual` in danh sách thất bại hai lần, nên mỗi bẫy lọt bị đếm ba lần.
   */
  const m = /DOI-KHANG-TONG tong=(\d+) chan=(\d+) lotChu=(\d+) doiLevel=(\d+)/.exec(ra);
  if (!m) {
    console.error(`✖ bộ bẫy không in dòng tổng kết — không kết luận từ số đoán:${NL}${ra.slice(-800)}`);
    process.exit(1);
  }
  const [tong, chan, lot, doiLevel] = m.slice(1).map(Number);

  for (const d of ra.split(NL).filter((d) => /CHẶN |ĐỐI CHỨNG|DOI-KHANG-OK/.test(d))) {
    console.log(`  ${d.trim()}`);
  }

  console.log(
    `${NL}  chặn được          : ${chan}/${tong}` +
      `${NL}  lọt tới người dùng : ${lot}` +
      `${NL}  làm đổi \`level\`    : ${doiLevel}`,
  );

  /*
   * GHI LẠI PHÉP ĐO, ĐỪNG BẮT NGƯỜI ĐỌC TIN LỜI KỂ.
   *
   * Tài liệu của repo từng nói "npm install hôm nay vẫn lấy 0.1.2" ở bốn chỗ, gõ
   * tay. Khi `0.2.0` lên registry, cả bốn câu thành sai cùng lúc và không guard nào
   * biết. Nên kết quả nghiệm thu đi vào một artifact, và guard đối chiếu với nó.
   */
  mkdirSync(join(GOC, "data", "registry"), { recursive: true });
  writeFileSync(
    join(GOC, "data/registry/ket-qua.json"),
    JSON.stringify(
      {
        doLuc: new Date().toISOString(),
        sourceCommit:
          chay("git", ["rev-parse", "HEAD"], GOC).status === 0
            ? chay("git", ["rev-parse", "HEAD"], GOC).stdout.trim()
            : null,
        phienBanHoi: PHIEN_BAN,
        ai: ver("@custos-solana/ai"),
        core: ver("@custos-solana/core"),
        tong,
        chan,
        lotChu: lot,
        doiLevel,
        dat: r.status === 0,
      },
      null,
      2,
    ) + NL,
  );
  console.log(`${NL}→ data/registry/ket-qua.json`);

  if (r.status === 0) {
    console.log(`✓ Gói trên registry chặn đủ mười bẫy.`);
    ma = 0;
  } else {
    console.error(
      `${NL}✖ Gói trên registry KHÔNG chặn đủ. Đây là thứ người ta \`npm install\` hôm nay.`,
    );
    if (doiLevel === 0) {
      console.error("  (nhưng `level` không đổi ở bẫy nào — engine luật vẫn nguyên vẹn)");
    }
  }
} finally {
  rmSync(san, { recursive: true, force: true });
}

process.exit(ma);

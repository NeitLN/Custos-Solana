/**
 * ĐÓNG GÓI SDK thành tarball cài được từ NGOÀI monorepo.
 *
 *   node scripts/dong-goi-sdk.mjs [thư-mục-đích]
 *
 * Vì sao cần script này thay vì `npm pack` thẳng:
 *
 *   Trong monorepo, `exports` của ba gói trỏ vào `./src/index.ts`. Đó là chủ ý —
 *   Vite và `node --experimental-strip-types` đọc thẳng nguồn, không cần build,
 *   nên vòng lặp dev nhanh và không có bước biên dịch nào để quên.
 *
 *   Nhưng NGƯỜI NGOÀI không dùng được cách đó: Node từ chối bóc kiểu TypeScript
 *   cho file nằm trong `node_modules` — `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.
 *   Đây là giới hạn của Node, không phải cấu hình sai.
 *
 *   `publishConfig` KHÔNG cứu được, và điều này đã phải học hai lần:
 *
 *     - lần 1: npm chỉ áp nó khi `npm publish`, không áp khi `npm pack`.
 *     - lần 2, đắt hơn: npm đã BỎ HỖ TRỢ `publishConfig.main/types/exports` hoàn
 *       toàn. Nó chỉ in `npm warn Unknown publishConfig config "main"` rồi lờ đi.
 *       Ba gói 0.1.0 đã lên registry với `main: "./src/index.ts"` — tức là hỏng với
 *       mọi người cài bằng JavaScript. Và npm không cho publish đè một bản đã có.
 *
 * Nên: build ra `dist`, chép package.json sang THƯ MỤC DÀN với `exports` trỏ `dist`,
 * rồi pack — hoặc publish — TỪ ĐÓ. Repo không bị sửa, luồng dev không đổi một dòng.
 *
 *   node scripts/dong-goi-sdk.mjs --publish
 *
 * Publish là hành động đối ngoại không hoàn tác được, nên nó KHÔNG phải mặc định:
 * phải gõ cờ, và npm sẽ hỏi mã 2FA của chính chủ tài khoản.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/*
 * ARTIFACT PHẢI MANG ĐÚNG BẢN VÁ MÀ SOURCE ĐANG CÓ.
 *
 * Chuyện đã xảy ra thật: `@custos-solana/ai@0.1.2` lên registry TRƯỚC khi bản vá
 * grounding được thêm vào. Source trong repo có `dungNeo`, tarball local có, mọi
 * test xanh — nhưng người cài từ npm nhận đúng bản mà mô hình chèn được địa chỉ ví
 * BỊA vào câu người dùng đọc trước khi ký. Version npm là bất biến nên không sửa
 * đè được; chỉ còn cách phát hành bản mới.
 *
 * Không ai phát hiện được bằng cách đọc code: cả hai phía đều "đúng", chỉ lệch thời
 * điểm. Nên kiểm ngay tại chỗ TẠO artifact, trên chính file sẽ được gửi đi.
 */
const DAU_AN_BAO_MAT = {
  "@custos-solana/ai": [
    // Neo grounding: mô hình không được bịa địa chỉ ví hay số tiền.
    "dungNeo",
    "DIA_CHI_DAY_DU",
    // Neo cho địa chỉ viết tắt và cho `detectedPrimaryAction` — thêm sau lần bump
    // 0.1.3, nên artifact của bản đó phải mang cả hai.
    "DIA_CHI_VIET_TAT",
    "neoHanhDong",
    // Neo chiều tài sản — thêm sau 0.2.0, artifact phải mang theo.
    "nguocChieu",
  ],
};

function soiDauAnBaoMat(tenGoi, thuMucDan) {
  const can = DAU_AN_BAO_MAT[tenGoi];
  if (!can) return;
  const gom = [];
  const quet = (d) => {
    for (const f of readdirSync(d, { withFileTypes: true })) {
      const duong = join(d, f.name);
      if (f.isDirectory()) quet(duong);
      else if (/\.(js|cjs|mjs|d\.ts)$/.test(f.name)) gom.push(readFileSync(duong, "utf8"));
    }
  };
  quet(join(thuMucDan, "dist"));
  const chu = gom.join(NL_KY_TU);
  const thieu = can.filter((x) => !chu.includes(x));
  if (thieu.length > 0) {
    console.error(`
✖ ${tenGoi}: artifact THIẾU dấu ấn bản vá bảo mật: ${thieu.join(", ")}`);
    console.error("  Source và thứ sắp gửi đi không khớp nhau. KHÔNG đóng gói, KHÔNG publish.");
    console.error("  Kiểm `npm run build` của gói đó trước, rồi chạy lại.");
    process.exit(1);
  }
}
const NL_KY_TU = String.fromCharCode(10);

const GOI = ["types", "core", "ai"];
const DAY_LEN = process.argv.includes("--publish");
const DICH = resolve(process.argv.filter((a) => a !== "--publish")[2] ?? "goi-sdk");
const DAN = resolve("node_modules/.dan-sdk");

rmSync(DICH, { recursive: true, force: true });
rmSync(DAN, { recursive: true, force: true });
mkdirSync(DICH, { recursive: true });

const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
// Trên Windows phải `shell: true` để chạy được `.cmd`, mà shell thì tách tham số
// theo dấu cách — và đường dẫn ở máy này có dấu cách ("Viet Tien"). Bọc ngoặc kép,
// nếu không `tsc` nhận đường dẫn vỡ đôi và báo TS5042.
const chay = (cmd, args, cwd) =>
  execFileSync(cmd, win ? args.map((a) => (a.includes(" ") ? `"${a}"` : a)) : args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: win,
  });

for (const g of GOI) {
  const nguon = resolve("packages", g);

  // 1. Biên dịch ra dist (.js + .d.ts, import tương đối đã đổi .ts -> .js).
  chay("npx", ["tsc", "-p", join(nguon, "tsconfig.build.json")], process.cwd());

  // 2. Dàn: chép dist + README, và VIẾT LẠI package.json cho người tiêu thụ.
  const dan = join(DAN, g);
  mkdirSync(dan, { recursive: true });
  cpSync(join(nguon, "dist"), join(dan, "dist"), { recursive: true });
  for (const f of ["README.md", "LICENSE"]) {
    try {
      cpSync(join(nguon, f), join(dan, f));
    } catch {
      /* thiếu file nào thì bỏ qua file đó, không chặn cả lượt đóng gói */
    }
  }

  const p = JSON.parse(readFileSync(join(nguon, "package.json"), "utf8"));
  delete p.private; // tarball phải cài được; vẫn KHÔNG publish trong script này
  delete p.publishConfig;
  delete p.scripts; // `prepack` sẽ chạy lại tsc trong thư mục dàn — không có tsconfig ở đó
  p.main = "./dist/index.js";
  p.types = "./dist/index.d.ts";
  /*
   * GIỮ LẠI MỌI SUBPATH, chỉ đổi đích từ `src/*.ts` sang `dist/*.js`.
   *
   * Bản trước ghi đè `exports` bằng đúng một lối vào `.`, nên subpath
   * `@custos-solana/ai/anthropic` BIẾN MẤT khỏi gói đóng ra — trong khi README của
   * chính gói đó nói đấy là đường DUY NHẤT để nạp adapter. Người cài từ npm gặp
   * ERR_PACKAGE_PATH_NOT_EXPORTED.
   *
   * Đo được bằng `npm run thu-goi`: bài kiểm đóng vai người ngoài, và nó đỏ ngay
   * lượt đầu sau khi tách entry. Đọc `package.json` bằng mắt thì không thấy — hai
   * file đều "đúng", chỉ là bước dàn làm rơi một nửa.
   */
  const loiVao = Object.keys(p.exports ?? { ".": null });
  p.exports = Object.fromEntries(
    loiVao.map((k) => {
      const ten = k === "." ? "index" : k.replace(/^\.\//, "");
      return [k, { types: `./dist/${ten}.d.ts`, default: `./dist/${ten}.js` }];
    }),
  );
  p.files = ["dist", "README.md", "LICENSE"];
  writeFileSync(join(dan, "package.json"), JSON.stringify(p, null, 2) + "\n");

  // 3. Pack — hoặc publish — từ thư mục dàn.
  soiDauAnBaoMat(p.name, dan);

  if (DAY_LEN) {
    // BỎ QUA version đã có trên registry: npm không cho publish đè, và khi chỉ một
    // gói đổi (ví dụ ai@0.1.2) thì hai gói kia vẫn ở version cũ — publish lại chúng
    // là chắc chắn ăn E409 rồi dừng cả chuỗi.
    let daCo = false;
    try {
      const url = "https://registry.npmjs.org/" + p.name.replace("/", "%2f");
      const j = await fetch(url).then((r) => (r.ok ? r.json() : null));
      daCo = Boolean(j && j.versions && j.versions[p.version]);
    } catch {
      /* mạng lỗi thì cứ thử publish, npm sẽ tự báo nếu trùng */
    }
    if (daCo) {
      console.log(`
· bỏ qua ${p.name}@${p.version} — đã có trên registry`);
      continue;
    }
    // `--access public` trên dòng lệnh chứ không qua `publishConfig`: gói có scope
    // mặc định bị coi là riêng tư, và tài khoản miễn phí sẽ ăn lỗi 402.
    //
    // stdio "inherit" là BẮT BUỘC — npm hỏi mã 2FA và người dùng phải gõ được vào.
    console.log(`
→ publish ${p.name}@${p.version}`);
    execFileSync(npm, ["publish", "--access", "public"], {
      cwd: dan,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
  } else {
    const ra = chay(npm, ["pack", "--pack-destination", DICH], dan);
    console.log("✓", ra.trim().split("\n").pop());
  }
}

if (DAY_LEN) {
  console.log("\n✓ Đã publish cả ba gói lên registry.");
} else {
  console.log(`\nBa tarball nằm ở: ${DICH}`);
  console.log("Cài vào một project bất kỳ:  npm install <thư-mục>/*.tgz");
}

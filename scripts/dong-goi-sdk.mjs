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
 *   `publishConfig` không cứu được: npm chỉ áp nó khi `npm publish`, không áp khi
 *   `npm pack` (đã thử, `exports` trong tarball vẫn là `.ts`).
 *
 * Nên: build ra `dist`, chép package.json sang THƯ MỤC DÀN với `exports` trỏ `dist`,
 * rồi pack từ đó. Repo không bị sửa, luồng dev không đổi một dòng nào.
 *
 * KHÔNG publish lên registry. Publish là hành động đối ngoại không hoàn tác được —
 * người dùng tự quyết định và tự chạy.
 */
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const GOI = ["types", "core", "ai"];
const DICH = resolve(process.argv[2] ?? "goi-sdk");
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
  try {
    cpSync(join(nguon, "README.md"), join(dan, "README.md"));
  } catch {
    /* không phải gói nào cũng có README */
  }

  const p = JSON.parse(readFileSync(join(nguon, "package.json"), "utf8"));
  delete p.private; // tarball phải cài được; vẫn KHÔNG publish trong script này
  delete p.publishConfig;
  delete p.scripts; // `prepack` sẽ chạy lại tsc trong thư mục dàn — không có tsconfig ở đó
  p.main = "./dist/index.js";
  p.types = "./dist/index.d.ts";
  p.exports = { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } };
  p.files = ["dist", "README.md"];
  writeFileSync(join(dan, "package.json"), JSON.stringify(p, null, 2) + "\n");

  // 3. Pack từ thư mục dàn.
  const ra = chay(npm, ["pack", "--pack-destination", DICH], dan);
  console.log("✓", ra.trim().split("\n").pop());
}

console.log(`\nBa tarball nằm ở: ${DICH}`);
console.log("Cài vào một project bất kỳ:  npm install <thư-mục>/*.tgz");

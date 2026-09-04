/**
 * ĐÓNG GÓI BẢN TRÌNH DIỄN MANG ĐI.
 *
 *   node scripts/dong-goi-ban-trinh-dien.mjs
 *
 * Ra một thư mục `ban-trinh-dien/` chạy độc lập: không cần repo, không cần
 * `npm install`, chỉ cần Node. Dùng để đưa màn hình cho người được phỏng vấn xem
 * mà không phải dựng cả môi trường dev.
 *
 * VÌ SAO KHÔNG CHÉP THẲNG `dist`: bản dựng thường ghim `base: "/Custos-Solana/"`
 * cho GitHub Pages, nên chép ra chỗ khác là gãy hết đường dẫn tài nguyên. Ở đây
 * build lại với `--base=./` để thư mục chạy được ở BẤT KỲ đâu.
 *
 * VÌ SAO CẢ HAI APP CHUNG MỘT CỔNG: trang tấn công phân giải địa chỉ ví bằng
 * `new URL("..", location.href)`. Đặt nó ở `/tan-cong/` thì ví là thư mục cha —
 * nên luồng tấn công → ví chạy được trong chính thư mục này, không cần hai server.
 *
 * KHÔNG nhúng khoá ký. Người xem mô phỏng được và thấy đủ màn cảnh báo (mô phỏng
 * không cần chữ ký), nhưng không ký được gì: không ai phá được hiện trường demo,
 * và không có khoá riêng nào nằm trong một thư mục được chuyền tay.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const DICH = resolve("ban-trinh-dien");
const win = process.platform === "win32";
const npm = win ? "npm.cmd" : "npm";
const boc = (s) => (win && s.includes(" ") ? `"${s}"` : s);

const chay = (cmd, args) =>
  execFileSync(boc(cmd), win ? args.map(boc) : args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: win,
  });

console.log("1/3 · build lại hai app với đường dẫn TƯƠNG ĐỐI");
for (const [ten, goi] of [
  ["ví mẫu", "@custos-solana/demo-wallet"],
  ["trang tấn công", "@custos-solana/trang-tan-cong"],
]) {
  chay(npm, ["run", "build", "-w", goi, "--", "--base=./"]);
  console.log(`      ${ten}`);
}

console.log("2/3 · gộp vào một thư mục");
rmSync(DICH, { recursive: true, force: true });
mkdirSync(resolve(DICH, "tan-cong"), { recursive: true });
cpSync("apps/demo-wallet/dist", DICH, { recursive: true });
cpSync("apps/trang-tan-cong/dist", resolve(DICH, "tan-cong"), { recursive: true });
// DỪNG HẲN nếu thiếu một file khởi chạy, thay vì âm thầm bỏ qua.
//
// Bản đầu viết `if (existsSync(nguon)) cpSync(...)`. Cộng với một dòng .gitignore
// thiếu dấu `/` đầu — khiến `scripts/ban-trinh-dien/` bị nuốt — thì trên clone sạch
// script sẽ sinh ra một thư mục KHÔNG CHẠY ĐƯỢC và vẫn in dấu ✓. Hỏng im lặng, báo
// cáo thành công: loại lỗi tệ nhất trong cả repo này.
for (const f of ["phuc-vu.mjs", "CHAY.cmd", "chay.sh", "DOC-TRUOC.md"]) {
  const nguon = resolve("scripts/ban-trinh-dien", f);
  if (!existsSync(nguon)) {
    console.error(`✖ thiếu ${nguon}`);
    console.error("  Không có file này thì thư mục sinh ra sẽ không chạy được.");
    process.exit(1);
  }
  cpSync(nguon, resolve(DICH, f));
}

console.log("3/3 · soi rò rỉ khoá riêng");
const ra = chay(process.execPath, ["scripts/soi-ro-ri-khoa.mjs", "ban-trinh-dien"]);
process.stdout.write("      " + ra.trim() + "\n");

console.log(`
✓ ${DICH}

  Chạy:   bấm đúp CHAY.cmd   (hoặc: node phuc-vu.mjs 8080)
  Mở:     http://localhost:8080/phong-van.html

  CẦN MẠNG — màn hình cảnh báo dựng bằng mô phỏng thật trên Devnet.
  Đọc DOC-TRUOC.md trong thư mục trước khi mang đi.
`);

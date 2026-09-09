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
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
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

console.log("3/4 · soi rò rỉ khoá riêng");
const ra = chay(process.execPath, ["scripts/soi-ro-ri-khoa.mjs", "ban-trinh-dien"]);
process.stdout.write("      " + ra.trim() + "\n");

/*
 * 4/4 · ĐƯỜNG DẪN CÁ NHÂN VÀ TRANG BẮT BUỘC.
 *
 * Gói này được mang sang máy khác — USB, máy ban tổ chức, máy mượn. Hai thứ làm nó
 * hỏng ở đó mà máy đội thì không:
 *
 *   · một đường dẫn tuyệt đối lọt vào bundle (sourcemap, banner, chuỗi cấu hình).
 *     Trên máy đội nó vô hại vì đường dẫn đó có thật;
 *   · thiếu một trang. `cpSync` chép cả thư mục nên khó thiếu, nhưng một lần đổi
 *     tên file HTML là đủ, và không có gì báo.
 *
 * Soi khoá riêng ở bước 3 không bắt được cả hai — nó tìm khoá, không tìm đường dẫn.
 */
console.log("4/4 · soi đường dẫn cá nhân và trang bắt buộc");
{
  /*
   * DỰNG TỪ `fromCharCode(92)`, KHÔNG GÕ DẤU GẠCH CHÉO.
   *
   * Bản đầu viết `/[A-Z]:\\Users\\|.../`. Một tầng shell trên đường ghi file nuốt
   * mất một gạch chéo, và regex thành `/[A-Z]:\Users\|.../` — tức khớp chuỗi
   * `C:Users|`, thứ không tồn tại. Guard xanh vĩnh viễn.
   *
   * Phát hiện được chỉ vì kiểm phủ định: nhét một đường dẫn thật vào rồi đóng gói
   * lại, và nó vẫn báo "✓ 0 đường dẫn cá nhân". Không có bước đó thì cái guard này
   * đã đi vào repo như một dòng chữ trấn an.
   *
   * Cách viết dưới đây không có gạch chéo nào để mất.
   */
  const CHEO = String.fromCharCode(92);
  const coDauCaNhan = (t) =>
    new RegExp(`[A-Za-z]:${CHEO}${CHEO}Users${CHEO}${CHEO}`).test(t) ||
    t.includes("/Users/") ||
    /\/home\/[a-z]/.test(t);
  const nhiem = [];
  const di = (thuMuc) => {
    for (const m of readdirSync(thuMuc, { withFileTypes: true })) {
      const p2 = resolve(thuMuc, m.name);
      if (m.isDirectory()) { di(p2); continue; }
      if (!/\.(js|css|html|json|mjs|map|md|cmd|sh)$/i.test(m.name)) continue;
      const t = readFileSync(p2, "utf8");
      if (coDauCaNhan(t)) nhiem.push(p2.slice(DICH.length + 1));
    }
  };
  di(DICH);
  if (nhiem.length) {
    console.error(`✖ ${nhiem.length} file mang đường dẫn tuyệt đối của máy này:`);
    for (const f of nhiem) console.error(`    ${f}`);
    console.error("  Gói mang sang máy khác sẽ hỏng, và trên máy này thì không ai thấy.");
    process.exit(1);
  }

  const TRANG = ["index.html", "phong-van.html", "so-lieu.html", "tan-cong/index.html"];
  const thieu = TRANG.filter((t) => !existsSync(resolve(DICH, t)));
  if (thieu.length) {
    console.error(`✖ thiếu trang: ${thieu.join(", ")}`);
    process.exit(1);
  }
  process.stdout.write(`      ✓ 0 đường dẫn cá nhân · đủ ${TRANG.length} trang${String.fromCharCode(10)}`);
}

console.log(`
✓ ${DICH}

  Chạy:   bấm đúp CHAY.cmd   (hoặc: node phuc-vu.mjs 8080)
  Mở:     http://localhost:8080/phong-van.html

  CẦN MẠNG — màn hình cảnh báo dựng bằng mô phỏng thật trên Devnet.
  Đọc DOC-TRUOC.md trong thư mục trước khi mang đi.
`);

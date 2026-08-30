/**
 * Soi bản build xem có khoá riêng nào lọt vào không.
 *
 *   node scripts/soi-ro-ri-khoa.mjs <thư-mục>
 *
 * Vì sao phép kiểm này phải viết cẩn thận: lần đầu tôi grep `168,93,113` và
 * kết luận "không có khoá trong bản build". Sai. Khoá thật nằm trong bundle
 * dưới dạng `[168, 93, 113, ...]` — CÓ DẤU CÁCH sau dấu phẩy — nên mẫu tìm
 * không khớp. Một phép kiểm an toàn mà tự nó sai thì tệ hơn không có, vì nó
 * tạo cảm giác đã kiểm rồi.
 *
 * Nên ở đây dùng hai lớp:
 *   1. So khớp KHOÁ THẬT trên đĩa, bỏ qua mọi khoảng trắng
 *   2. Bắt mọi mảng số dài trông giống keypair, kể cả khi không có khoá để so
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const thuMuc = process.argv[2] ?? "site";
const KHOA_CO_THE_CO = [".devnet/vi-demo.json"];

function moiFile(d) {
  const ra = [];
  for (const t of readdirSync(d)) {
    const p = join(d, t);
    if (statSync(p).isDirectory()) ra.push(...moiFile(p));
    else if ([".js", ".mjs", ".html", ".json", ".css", ".map"].includes(extname(p))) ra.push(p);
  }
  return ra;
}

/** Bỏ mọi khoảng trắng để so khớp không phụ thuộc cách định dạng. */
const chuan = (s) => s.replace(/\s+/g, "");

const files = existsSync(thuMuc) ? moiFile(thuMuc) : [];
if (files.length === 0) {
  console.error(`không tìm thấy file nào trong "${thuMuc}"`);
  process.exit(1);
}

const loi = [];

// ── lớp 1: so với khoá thật trên đĩa ────────────────────────────
for (const kp of KHOA_CO_THE_CO) {
  if (!existsSync(kp)) continue;
  const bytes = JSON.parse(readFileSync(kp, "utf8"));
  const dauKhoa = chuan(JSON.stringify(bytes.slice(0, 8))).slice(1, -1);
  for (const f of files) {
    if (chuan(readFileSync(f, "utf8")).includes(dauKhoa)) {
      loi.push(`KHOÁ RIÊNG từ ${kp} nằm trong ${f}`);
    }
  }
}

// ── lớp 2: mảng số dài trông giống keypair ──────────────────────
//
// Keypair Solana đúng 64 byte. Ngưỡng đầu tiên tôi đặt là 32 và nó bắt nhầm
// một bảng tra 37 phần tử trong thư viện. Một phép kiểm an toàn hay kêu oan
// thì người ta sẽ tắt nó đi, và tới lúc rò rỉ thật cũng không ai nghe nữa.
const MAU_KEYPAIR = /(?:\d{1,3}\s*,\s*){59,}\d{1,3}/;
for (const f of files) {
  const m = readFileSync(f, "utf8").match(MAU_KEYPAIR);
  if (m) loi.push(`mảng ${m[0].split(",").length} số trông giống keypair trong ${f}`);
}

// ── lớp 3: khoá API nhúng trong URL hoặc chuỗi ──────────────────
//
// Hai lớp trên chỉ bắt được KHOÁ VÍ. Chúng hoàn toàn mù với khoá API — mà đường
// rò rỉ khoá API lại có thật và rất dễ đi vào:
//
//   `dung-hien-truong.ts` đọc biến `CUSTOS_RPC` rồi ghi thẳng vào
//   `apps/demo-wallet/public/hien-truong.json` — file được commit và deploy công khai.
//   Đặt `CUSTOS_RPC=https://devnet.helius-rpc.com/?api-key=...` rồi dựng lại hiện
//   trường là đủ để đẩy khoá lên GitHub Pages.
//
// Script đó nay đã tự lọc phần query trước khi ghi bản công khai. Lớp này là chốt
// thứ hai, cho những đường rò rỉ chưa nghĩ ra.
//
// Ngưỡng độ dài để tránh kêu oan: thư viện hay chứa chuỗi mẫu `api-key=` rỗng hoặc
// `?api-key=${key}`. Chỉ báo khi sau dấu `=` có một giá trị thật đủ dài.
const MAU_KHOA_API = [
  [/[?&](?:api[-_]?key|apikey|access[-_]?token)=[A-Za-z0-9_-]{16,}/i, "khoá API trong URL"],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "khoá Anthropic (sk-ant-…)"],
  [/https?:\/\/[^\s"'`]*:[^\s"'`@/]{8,}@/, "URL có nhúng mật khẩu"],
];
for (const f of files) {
  const noiDung = readFileSync(f, "utf8");
  for (const [mau, ten] of MAU_KHOA_API) {
    const m = noiDung.match(mau);
    // KHÔNG in giá trị khớp ra log — CI công khai, in ra là rò rỉ lần hai.
    if (m) loi.push(`${ten} trong ${f} (vị trí ${m.index}, ${m[0].length} ký tự)`);
  }
}

if (loi.length) {
  console.error("\n✗ PHÁT HIỆN RÒ RỈ KHOÁ TRONG BẢN BUILD\n");
  for (const l of loi) console.error("  •", l);
  console.error("\nKiểm tra: file .env nào đang được nạp lúc build?");
  console.error("`.env.local` bị Vite nạp ở MỌI chế độ — phải dùng `.env.development.local`.\n");
  process.exit(1);
}

console.log(`✓ không thấy khoá riêng trong ${files.length} file của "${thuMuc}"`);

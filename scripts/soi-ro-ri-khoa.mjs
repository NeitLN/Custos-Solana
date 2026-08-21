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

if (loi.length) {
  console.error("\n✗ PHÁT HIỆN RÒ RỈ KHOÁ TRONG BẢN BUILD\n");
  for (const l of loi) console.error("  •", l);
  console.error("\nKiểm tra: file .env nào đang được nạp lúc build?");
  console.error("`.env.local` bị Vite nạp ở MỌI chế độ — phải dùng `.env.development.local`.\n");
  process.exit(1);
}

console.log(`✓ không thấy khoá riêng trong ${files.length} file của "${thuMuc}"`);

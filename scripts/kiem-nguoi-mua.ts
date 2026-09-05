/**
 * ĐẾM VÀ SOI PHỎNG VẤN NGƯỜI MUA.
 *
 *   node --experimental-strip-types scripts/kiem-nguoi-mua.ts
 *
 * Đọc `data/seed/nguoi-mua.json`. Vắng file là trạng thái HỢP LỆ — đội chưa đi hỏi
 * thì con số là "chưa có", và deck lẫn pitch phải nói đúng thế.
 *
 * Ba việc, và việc thứ ba mới là lý do script này tồn tại:
 *
 *   1. ĐẾM. Không ai đếm tay. Số lên sân khấu phải sinh ra từ dữ liệu.
 *
 *   2. SOI DỮ LIỆU CÁ NHÂN. Repo công khai. Một email hay số điện thoại lọt vào
 *      là lộ thông tin của người đã giúp mình — và không rút lại được khỏi git.
 *
 *   3. CHẶN NÂNG CẤP CÂU CHỮ. "Đồng ý xem SDK" KHÔNG phải "pilot". "Nói chuyện
 *      vui vẻ" KHÔNG phải "quan tâm". Script đếm đúng ba mức tách nhau, để không
 *      ai gộp chúng lại cho đẹp — kể cả vô tình, lúc 2 giờ sáng trước ngày thi.
 */
import { existsSync, readFileSync } from "node:fs";

const DUONG = "data/seed/nguoi-mua.json";

type BanGhi = {
  ma?: string;
  ngay?: string;
  vaiTro?: string;
  loaiSanPham?: string;
  kenh?: string;
  vanDeCoThat?: boolean;
  cachDangXuLy?: string;
  blockerTichHop?: string[];
  tieuChiPilot?: string[];
  dongYXemSdk?: boolean;
  dongYPilot?: boolean;
  choPhepTrichDan?: boolean;
  ghiChu?: string;
};

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
const DIEN_THOAI = /(?:\+?84|0)[\s.-]?\d(?:[\s.-]?\d){7,9}\b/;

/** Mã ẩn danh không được chứa dấu cách — "Anh Tuấn Coin98" là tên thật, không phải mã. */
const MA_DUNG = /^[A-Z]\d{2,3}$/;

if (!existsSync(DUONG)) {
  console.log(`chưa có ${DUONG} — đội chưa phỏng vấn người mua nào.`);
  console.log("Đó là một trạng thái hợp lệ. Deck và pitch phải nói CHƯA CÓ, không được đoán.");
  console.log("\nBộ đồ nghề đi hỏi: docs/PHONG-VAN-NGUOI-MUA.md");
  process.exit(0);
}

const ho = JSON.parse(readFileSync(DUONG, "utf8")) as { laViDu?: boolean; ban: BanGhi[] };
if (ho.laViDu) {
  console.warn("⚠ file này mang cờ `laViDu` — DỮ LIỆU MINH HOẠ, không phải người thật.");
  console.warn("  Số bên dưới KHÔNG được ra khỏi máy dev.");
}

const ban = ho.ban ?? [];
const canh: string[] = [];

ban.forEach((b, i) => {
  const ma = b.ma ?? `#${i + 1}`;
  const chu = JSON.stringify(b);
  if (EMAIL.test(chu)) canh.push(`${ma}: có gì đó trông như EMAIL`);
  if (DIEN_THOAI.test(chu)) canh.push(`${ma}: có gì đó trông như SỐ ĐIỆN THOẠI`);
  if (b.ma && !MA_DUNG.test(b.ma)) canh.push(`${ma}: mã nên dạng B01 — chuỗi này nghi là tên thật`);
  if (!b.ngay) canh.push(`${ma}: thiếu ngày phỏng vấn`);
  // Trích dẫn khi chưa xin phép là vi phạm với người đã bỏ thời gian giúp mình.
  if (b.choPhepTrichDan !== true && (b.ghiChu ?? "").includes('"')) {
    canh.push(`${ma}: có trích dẫn nguyên văn nhưng choPhepTrichDan chưa phải true`);
  }
  // Không thể pilot mà lại chưa xem SDK — thứ tự đó là dấu hiệu ghi nhầm mức.
  if (b.dongYPilot === true && b.dongYXemSdk !== true) {
    canh.push(`${ma}: đánh dấu PILOT nhưng chưa đánh dấu đồng ý xem SDK — kiểm lại`);
  }
});

const dem = (f: (b: BanGhi) => boolean) => ban.filter(f).length;
const n = ban.length;

console.log(`\nPHỎNG VẤN NGƯỜI MUA · ${n} cuộc\n`);
if (n === 0) {
  console.log("  file tồn tại nhưng chưa có bản ghi nào.");
  process.exit(0);
}

console.log(`  vấn đề có thật với họ    : ${dem((b) => b.vanDeCoThat === true)}/${n}`);
console.log(`  đồng ý XEM SDK           : ${dem((b) => b.dongYXemSdk === true)}/${n}`);
console.log(`  đồng ý PILOT             : ${dem((b) => b.dongYPilot === true)}/${n}`);
console.log(`  cho phép trích dẫn       : ${dem((b) => b.choPhepTrichDan === true)}/${n}`);

const blocker = new Map<string, number>();
for (const b of ban) for (const x of b.blockerTichHop ?? []) blocker.set(x, (blocker.get(x) ?? 0) + 1);
if (blocker.size > 0) {
  console.log(`\n  blocker tích hợp — thứ quyết định sửa gì tiếp theo:`);
  for (const [k, v] of [...blocker].sort((a, b) => b[1] - a[1])) console.log(`    ${v}×  ${k}`);
}

/*
 * BA MỨC, KHÔNG ĐƯỢC GỘP.
 *
 * "Nói chuyện" ≠ "đồng ý xem SDK" ≠ "pilot". Mỗi bậc là một cam kết khác hẳn về
 * thời gian của họ, và gộp lên một bậc là cách dễ nhất để một con số nhỏ trông to.
 * Đây đúng lỗi mà repo đã phải sửa với chữ "bị gắn cờ" / "bị cáo buộc" / "báo nhầm".
 */
console.log(`\n  Câu được nói trên sân khấu:`);
console.log(`    "Đã nói chuyện với ${n} bên. ${dem((b) => b.dongYXemSdk === true)} đồng ý xem SDK.`);
console.log(`     ${dem((b) => b.dongYPilot === true)} đã cắm thử." — đọc đúng ba số, không gộp.`);

if (canh.length > 0) {
  console.error(`\n✖ ${canh.length} chỗ phải xem lại trước khi commit:`);
  for (const c of canh) console.error(`  · ${c}`);
  process.exit(1);
}
console.log("\n✓ không thấy dữ liệu cá nhân, không thấy mức bị nâng cấp.");

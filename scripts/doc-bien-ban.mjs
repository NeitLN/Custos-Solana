/**
 * ĐỌC BIÊN BẢN ĐÃ ĐIỀN TAY → `data/seed/phong-van.json`.
 *
 *   node scripts/doc-bien-ban.mjs
 *   node scripts/doc-bien-ban.mjs --ghi        # ghi thật, mặc định chỉ xem trước
 *
 * Vì sao cần: `docs/BIEN-BAN-PHONG-VAN.md` là bản trống để điền tay, còn
 * `scripts/kiem-phong-van.ts` chỉ đọc JSON. Giữa hai thứ đó không có gì cả — nên
 * đội điền xong biên bản rồi vẫn không ra được con số, và cách duy nhất còn lại là
 * gõ tay JSON. Gõ tay một lược đồ sáu trường cho năm người là chỗ sinh lỗi.
 *
 * BA ĐIỀU SCRIPT NÀY TỪ CHỐI LÀM:
 *
 *   1. Không suy đoán. Ô trống là ô trống; người chưa hỏi thì bỏ qua, không đẩy
 *      vào JSON dưới dạng bản ghi rỗng — một bản ghi rỗng vẫn làm tăng MẪU SỐ.
 *   2. Không chấp nhận dòng chấm còn nguyên mẫu (`ĐÚNG / MỘT PHẦN / SAI`). Chưa
 *      xoá lựa chọn thừa nghĩa là chưa chấm.
 *   3. Không ghi đè file có sẵn nếu chưa gõ `--ghi`. Mặc định là xem trước.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// Cho phép trỏ sang file khác — để thử script mà không đụng biên bản thật.
const NGUON = process.argv.slice(2).find((a) => a.endsWith(".md")) ?? "docs/BIEN-BAN-PHONG-VAN.md";
const DICH = "data/seed/phong-van.json";
const GHI = process.argv.includes("--ghi");

const DOI_CHAM = { "ĐÚNG": "dung", "MỘT PHẦN": "motPhan", "SAI": "sai" };
const DOI_QD = { "HUỶ": "huy", "KIỂM TRA THÊM": "kiemTraThem", "VẪN KÝ": "ky" };

if (!existsSync(NGUON)) {
  console.error(`✖ không thấy ${NGUON}`);
  process.exit(1);
}
const dong = readFileSync(NGUON, "utf8").split("\n");

/** Gom các dòng trích dẫn `>` ngay sau vị trí `i`, bỏ dòng rỗng dẫn đầu. */
function docTrichDan(i) {
  const ra = [];
  let k = i + 1;
  while (k < dong.length && dong[k].trim() === "") k++;
  while (k < dong.length && dong[k].trimStart().startsWith(">")) {
    ra.push(dong[k].trimStart().replace(/^>\s?/, ""));
    k++;
  }
  return ra.join(" ").trim();
}

/** Chọn đúng MỘT nhãn còn lại trên ô bảng. Còn nguyên mẫu ⇒ chưa chấm ⇒ null. */
function chonNhan(o, bang) {
  const con = Object.keys(bang).filter((n) => o.includes(n));
  // "ĐÚNG" nằm trong "MỘT PHẦN"? Không. Nhưng "SAI" nằm trong "SAI"— chỉ một.
  if (con.length !== 1) return null;
  return bang[con[0]];
}

const ngayDo = (dong.find((d) => d.startsWith("| Ngày phỏng vấn |")) ?? "")
  .split("|")[2]
  ?.trim();

const ban = [];
const boQua = [];

for (let i = 0; i < dong.length; i++) {
  const m = /^### (P\d+)\b(.*)$/.exec(dong[i]);
  if (!m) continue;
  const ma = m[1];
  const dauNguoi = m[2] ?? "";

  // Phạm vi của người này: tới tiêu đề `###` kế tiếp hoặc `## ` kế tiếp.
  let het = dong.length;
  for (let k = i + 1; k < dong.length; k++) {
    if (/^### P\d+/.test(dong[k]) || /^## /.test(dong[k])) {
      het = k;
      break;
    }
  }
  const trong = (k) => k >= i && k < het;

  let quanSat = "";
  let cau1 = "";
  let cau2 = "";
  let cauPhu = "";
  let cham = null;
  let quyetDinh = null;
  let chuVap = "";

  for (let k = i; k < het; k++) {
    const d = dong[k];
    if (d.startsWith("**Quan sát**")) quanSat = docTrichDan(k);
    else if (d.includes("chuyện gì xảy ra với ví")) cau1 = docTrichDan(k);
    else if (d.includes("ký, huỷ, hay cần kiểm tra thêm")) cau2 = docTrichDan(k);
    else if (d.startsWith("**Câu phụ**")) cauPhu = docTrichDan(k);
    else if (trong(k) && d.startsWith("|") && /ĐÚNG|MỘT PHẦN|SAI|HUỶ|VẪN KÝ|KIỂM TRA THÊM/.test(d)) {
      const o = d.split("|").map((x) => x.trim());
      const c = chonNhan(o[1] ?? "", DOI_CHAM);
      const q = chonNhan(o[2] ?? "", DOI_QD);
      if (c) cham = c;
      if (q) quyetDinh = q;
      if (o[3]) chuVap = o[3];
    }
  }

  const thieu = [];
  if (!cau1) thieu.push("câu trả lời nguyên văn");
  if (!cham) thieu.push("mức hiểu (xoá bớt lựa chọn thừa trong bảng)");
  if (!quyetDinh) thieu.push("quyết định (xoá bớt lựa chọn thừa trong bảng)");
  if (thieu.length) {
    boQua.push(`${ma}: thiếu ${thieu.join(" · ")}`);
    continue;
  }

  const ghiChu = [
    dauNguoi.replace(/^\s*—\s*/, "").replace(/_+/g, "").trim(),
    quanSat && `quan sát: ${quanSat}`,
    cau2 && `sẽ làm gì, vì sao: ${cau2}`,
    cauPhu && `câu phụ: ${cauPhu}`,
    chuVap && `chữ vấp: ${chuVap}`,
  ]
    .filter(Boolean)
    .join(" · ");

  ban.push({
    ma,
    luc: ngayDo ? `${ngayDo}` : new Date().toISOString(),
    nguyenVan: cau1,
    cham,
    quyetDinh,
    ghiChu,
  });
}

console.log(`đọc ${NGUON}`);
if (boQua.length) {
  console.log(`\n${boQua.length} người CHƯA đủ dữ liệu — bỏ qua, không đưa vào JSON:`);
  for (const b of boQua) console.log(`  · ${b}`);
  console.log("  (bỏ qua là đúng: một bản ghi rỗng vẫn làm tăng mẫu số)");
}

if (ban.length === 0) {
  console.error(`\n✖ chưa có người nào điền đủ. KHÔNG ghi ${DICH}.`);
  console.error("  Điền biên bản trước, rồi chạy lại.");
  process.exit(1);
}

const hoSo = { phienBan: 1, xuatLuc: new Date().toISOString(), ban };
console.log(`\n${ban.length} người đủ dữ liệu:`);
for (const b of ban) console.log(`  ${b.ma}  ${b.cham.padEnd(8)} ${b.quyetDinh.padEnd(12)} "${b.nguyenVan.slice(0, 56)}"`);

if (!GHI) {
  console.log(`\nXem trước — CHƯA ghi gì. Thêm cờ để ghi thật:`);
  console.log(`  node scripts/doc-bien-ban.mjs --ghi`);
  process.exit(0);
}

if (existsSync(DICH)) {
  console.error(`\n✖ ${DICH} đã tồn tại. Xoá hoặc đổi tên nó trước — script này không ghi đè`);
  console.error("  dữ liệu phỏng vấn đã có, vì ghi đè nhầm là mất dữ liệu không lấy lại được.");
  process.exit(1);
}

writeFileSync(DICH, JSON.stringify(hoSo, null, 2) + "\n");
console.log(`\n✓ đã ghi ${DICH}`);
console.log("  Bước tiếp: node --experimental-strip-types scripts/kiem-phong-van.ts");

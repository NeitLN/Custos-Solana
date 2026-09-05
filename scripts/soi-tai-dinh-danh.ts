/**
 * SOI NGUY CƠ TÁI ĐỊNH DANH TRONG DỮ LIỆU PHỎNG VẤN CÔNG KHAI.
 *
 *   node --experimental-strip-types scripts/soi-tai-dinh-danh.ts
 *   node --experimental-strip-types scripts/soi-tai-dinh-danh.ts --tong-quat-hoa
 *
 * Bộ soi cũ (`soiDuLieuCaNhan`) bắt tên, email, số điện thoại — những thứ định danh
 * TRỰC TIẾP. Nó không bắt thứ nguy hiểm hơn ở đây: **quasi-identifier**.
 *
 * Một mình "20 tuổi" thì vô hại. Một mình "sinh viên Marketing" cũng vậy. Nhưng
 * "20 tuổi · sinh viên Marketing · từng mua crypto trên sàn" kèm một câu nói nguyên
 * văn, trong vòng quen biết của chính người phỏng vấn, thì đủ để người cùng lớp nhận
 * ra. Đây là repo CÔNG KHAI và git không quên.
 *
 * `Có xin phép trước` trong biên bản là consent để PHỎNG VẤN. Nó không tự động là
 * consent để công bố nguyên văn kèm nhân khẩu học lên GitHub. Hai phạm vi khác nhau,
 * và chỉ người tham gia mới cho được cái thứ hai.
 *
 * Script KHÔNG tự sửa dữ liệu. Cờ `--tong-quat-hoa` in ra bản đã tổng quát hoá để
 * người xem trước; ghi đè là quyết định của chủ dự án.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const DUONG = "data/seed/phong-van.json";
const TONG_QUAT = process.argv.includes("--tong-quat-hoa");
const GHI = process.argv.includes("--ghi");

type Ban = { ma?: string; ghiChu?: string; nguyenVan?: string };

if (!existsSync(DUONG)) {
  console.log(`chưa có ${DUONG}`);
  process.exit(0);
}

const ho = JSON.parse(readFileSync(DUONG, "utf8")) as { ban: Ban[] };

/** Tuổi chính xác. Nhóm tuổi phục vụ phân tích y hệt mà lộ ít hơn nhiều. */
// Không tính NHÓM tuổi là tuổi chính xác: mẫu cũ khớp cả "19 tuổi" bên trong
// "18–19 tuổi", nên bộ soi tố cáo chính đầu ra đã tổng quát hoá của nó.
const TUOI = /(?<![\d–-])(\d{2}) tuổi/;

/**
 * Nghề quá cụ thể. Một "sinh viên năm nhất Kinh tế" trong vòng bạn bè của người
 * phỏng vấn là một tập rất nhỏ người.
 */
const NGHE_HEP = [
  /sinh viên năm [a-zăâêôơư]+ [A-ZĐ]/,
  /sinh viên [A-ZĐ][a-zăâêôơưđ ]+/,
  /\b(QA|BA|PM|DevOps|Backend|Frontend) Engineer\b/i,
  /giảng viên [^·]+/,
  /chủ (cửa hàng|doanh nghiệp)[^·]*/,
];

function nhomTuoi(t: number): string {
  if (t < 20) return "18–19";
  if (t < 23) return "20–22";
  if (t < 26) return "23–25";
  return "26+";
}

const canh: Array<{ ma: string; loai: string; chi: string }> = [];

for (const [i, b] of ho.ban.entries()) {
  const ma = b.ma ?? `#${i + 1}`;
  const chu = b.ghiChu ?? "";
  const t = TUOI.exec(chu);
  if (t) canh.push({ ma, loai: "tuổi chính xác", chi: t[0] });
  for (const m of NGHE_HEP) {
    const k = m.exec(chu);
    if (k) {
      canh.push({ ma, loai: "nghề rất cụ thể", chi: k[0].trim().slice(0, 46) });
      break;
    }
  }
  if ((b.nguyenVan ?? "").length > 0) {
    canh.push({ ma, loai: "câu nói nguyên văn", chi: `${(b.nguyenVan ?? "").length} ký tự` });
  }
}

/*
 * TỔNG QUÁT HOÁ THEO TRƯỜNG, KHÔNG BẰNG REGEX TRONG CÂU.
 *
 * Bản đầu dùng regex có lớp ký tự `[a-zăâêôơưđ]` và nó LÀM NÁT tiếng Việt: "sinh
 * viên Ngôn ngữ Anh" thành "sinh viênữ Anh", "Thiết kế" thành "ết kế". Lớp đó
 * thiếu hầu hết dấu — ố, ữ, ế, ấ. Nếu ghi đè thì hỏng dữ liệu phỏng vấn thật.
 *
 * `ghiChu` có cấu trúc rõ: `tuổi · nghề · kinh nghiệm crypto · câu trả lời`. Cắt
 * theo dấu `·` rồi thay CẢ TRƯỜNG thì không đụng vào chữ bên trong.
 */
const NHOM_NGHE: Array<[RegExp, string]> = [
  [/sinh viên/i, "sinh viên"],
  [/giảng viên/i, "giảng viên"],
  [/engineer|kỹ sư|lập trình|developer/i, "kỹ sư phần mềm"],
  [/chủ /i, "chủ hộ kinh doanh"],
  [/freelancer/i, "freelancer"],
  [/game/i, "người chơi game"],
  [/nhân viên|văn phòng/i, "nhân viên văn phòng"],
];

function tongQuatHoa(ghiChu: string): string {
  const truong = ghiChu.split("·").map((t) => t.trim());
  if (truong.length < 2) return ghiChu;

  const t = TUOI.exec(truong[0] ?? "");
  if (t) truong[0] = `${nhomTuoi(Number(t[1]))} tuổi`;

  const nghe = truong[1] ?? "";
  const khop = NHOM_NGHE.find(([m]) => m.test(nghe));
  // Không khớp nhóm nào thì GIỮ NGUYÊN và để bộ soi báo — thà lộ một ô còn hơn
  // âm thầm thay bằng một nhãn sai.
  if (khop) truong[1] = khop[1];

  return truong.join(" · ");
}

/*
 * GHI ĐÈ CẢ HAI SURFACE.
 *
 * `data/seed/phong-van.json` được SINH từ `docs/BIEN-BAN-PHONG-VAN.md`, và cả hai
 * đều nằm trong repo công khai. Sửa mỗi JSON thì lần chạy `doc-bien-ban.mjs` kế
 * tiếp sẽ khôi phục tuổi chính xác từ markdown — bản vá tự tháo.
 */
const BIEN_BAN = "docs/BIEN-BAN-PHONG-VAN.md";

if (GHI) {
  const truoc = JSON.parse(readFileSync(DUONG, "utf8")) as { ban: Ban[] };
  const dem = (f: (b: Ban) => boolean) => truoc.ban.filter(f).length;
  const truocDem = [dem(() => true), dem((b) => (b.nguyenVan ?? "") !== "")];

  const moi = { ...truoc, ban: truoc.ban.map((b) => ({ ...b, ghiChu: tongQuatHoa(b.ghiChu ?? "") })) };
  writeFileSync(DUONG, JSON.stringify(moi, null, 2) + "\n");

  // Markdown: dòng tiêu đề `### P01 — 18 tuổi · nghề · kinh nghiệm`
  const md = readFileSync(BIEN_BAN, "utf8")
    .split("\n")
    .map((d) => {
      const m = /^(### P\d+ — )(.+)$/.exec(d);
      return m ? `${m[1]}${tongQuatHoa(m[2] ?? "")}` : d;
    })
    .join("\n");
  writeFileSync(BIEN_BAN, md);

  const sau = JSON.parse(readFileSync(DUONG, "utf8")) as { ban: Ban[] };
  const sauDem = [sau.ban.length, sau.ban.filter((b) => (b.nguyenVan ?? "") !== "").length];
  // Tổng quát hoá nhân khẩu học KHÔNG được đụng vào mẫu số hay câu trả lời.
  if (truocDem[0] !== sauDem[0] || truocDem[1] !== sauDem[1]) {
    console.error("✖ số bản ghi hoặc số câu trả lời đã đổi — HOÀN NGUYÊN ngay.");
    process.exit(1);
  }
  console.log(`✓ đã tổng quát hoá ${sauDem[0]} bản ghi ở cả JSON lẫn biên bản markdown.`);
  console.log("  Mẫu số và câu trả lời nguyên văn giữ nguyên; chỉ tuổi và nghề rộng ra.");
  process.exit(0);
}

if (TONG_QUAT) {
  console.log("BẢN TỔNG QUÁT HOÁ — xem trước, KHÔNG ghi đè gì\n");
  const chuaNhom: string[] = [];
  for (const b of ho.ban) {
    const moi = tongQuatHoa(b.ghiChu ?? "");
    const nghe = (b.ghiChu ?? "").split("·")[1]?.trim() ?? "";
    if (nghe && !NHOM_NGHE.some(([m]) => m.test(nghe))) chuaNhom.push(`${b.ma}: ${nghe}`);
    console.log(`  ${b.ma}: ${moi.slice(0, 108)}`);
  }
  if (chuaNhom.length > 0) {
    console.log(`\n  ${chuaNhom.length} nghề chưa khớp nhóm nào — GIỮ NGUYÊN, phải xem tay:`);
    for (const c of chuaNhom) console.log(`    ${c}`);
  }
  console.log("\n(Tỉ lệ hiểu/quyết định KHÔNG đổi — chỉ nhân khẩu học rộng ra.)");
  process.exit(0);
}

const theoLoai = new Map<string, number>();
for (const c of canh) theoLoai.set(c.loai, (theoLoai.get(c.loai) ?? 0) + 1);

console.log(`\nSOI TÁI ĐỊNH DANH · ${ho.ban.length} bản ghi công khai\n`);
for (const [k, v] of theoLoai) console.log(`  ${String(v).padStart(3)} bản ghi có ${k}`);

const nhieuTruong = ho.ban.filter((b) => {
  const chu = b.ghiChu ?? "";
  return TUOI.test(chu) && NGHE_HEP.some((m) => m.test(chu)) && (b.nguyenVan ?? "").length > 0;
}).length;

console.log(
  `\n  ${nhieuTruong}/${ho.ban.length} bản ghi mang ĐỒNG THỜI tuổi chính xác + nghề cụ thể + câu nguyên văn.`,
);
console.log("  Tổ hợp đó, trong một vòng quen biết nhỏ, là đủ để nhận ra người.\n");
console.log("  `Có xin phép trước` là consent để PHỎNG VẤN — không tự động là consent");
console.log("  để CÔNG BỐ nguyên văn kèm nhân khẩu học lên một repo công khai.\n");
console.log("  Xem trước bản tổng quát hoá:  --tong-quat-hoa");
console.log("  Quyết định ghi đè thuộc về chủ dự án, không thuộc về script này.");

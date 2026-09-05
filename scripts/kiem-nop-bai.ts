/**
 * CHECKLIST NỘP BÀI — ĐỌC TRẠNG THÁI THẬT, KHÔNG GÕ TAY.
 *
 *   node --experimental-strip-types scripts/kiem-nop-bai.ts
 *
 * Một checklist gõ tay là danh sách của ngày viết nó. Sau ba lần sửa, các ô đã tick
 * không còn phản ánh gì — và đúng ô người ta tin nhất lại là ô sai nhất.
 *
 * Bài này soi repo rồi tự trả lời. Ô nào cần con người thì nói rõ là cần con người,
 * không tự tick.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

type Muc = { ten: string; xong: boolean; chiTiet: string; ai: "máy" | "người" };

const doc = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const json = <T>(p: string): T | null => {
  try {
    return JSON.parse(readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
};

const soLieu = json<{ test: { pass: number; fail: number }; soLuat: number; soMau: number; nguoiMua: number }>(
  "apps/demo-wallet/public/so-lieu.json",
);
const tichHop = json<{ dat: boolean; doiTac: unknown }>("data/tich-hop/ket-qua.json");
const anh = existsSync("docs/nop-bai/anh")
  ? readdirSync("docs/nop-bai/anh").filter((f) => f.endsWith(".png"))
  : [];
const lich = doc("docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md");
const oTrong = (lich.match(/^- \[ \]/gm) ?? []).length;

const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
const sach = execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim() === "";
const theTag = execFileSync("git", ["tag"], { encoding: "utf8" }).trim();

const muc: Muc[] = [
  {
    ten: "Bộ test xanh",
    xong: (soLieu?.test.fail ?? 1) === 0 && (soLieu?.test.pass ?? 0) > 0,
    chiTiet: `${soLieu?.test.pass ?? 0} pass · ${soLieu?.test.fail ?? "?"} fail`,
    ai: "máy",
  },
  {
    ten: "Cây làm việc sạch",
    xong: sach,
    chiTiet: sach ? `HEAD ${sha}` : "còn thay đổi chưa commit",
    ai: "máy",
  },
  {
    ten: "Ví dụ tích hợp chạy được",
    xong: tichHop?.dat === true,
    chiTiet: tichHop?.dat ? "5/5 kịch bản pass" : "chưa chạy `npm run thu-tich-hop`",
    ai: "máy",
  },
  {
    ten: "Deck dựng lại được từ dữ liệu",
    xong: existsSync("docs/nop-bai/CUSTOS-PITCH.pptx") && doc("package.json").includes("pptxgenjs"),
    chiTiet: "pptxgenjs ghim trong devDependencies",
    ai: "máy",
  },
  {
    ten: "Ảnh dự phòng máy tính + điện thoại",
    xong: anh.length >= 8,
    chiTiet: `${anh.length} ảnh trong docs/nop-bai/anh`,
    ai: "máy",
  },
  {
    ten: "Video demo dự phòng",
    xong: false,
    chiTiet: "THỂ LỆ GHI LÀ BẮT BUỘC. Chưa có. Thiếu nó là mất lượt nếu sự cố kỹ thuật",
    ai: "người",
  },
  {
    ten: "Lịch thi xác nhận đủ",
    xong: oTrong === 0,
    chiTiet: oTrong === 0 ? "không còn ô trống" : `${oTrong} câu chưa hỏi BTC`,
    ai: "người",
  },
  {
    ten: "Gói AI có bản vá trên registry",
    xong: false,
    chiTiet: "0.1.3 chưa publish; `npm install` hôm nay vẫn lấy 0.1.2 THIẾU neo grounding",
    ai: "người",
  },
  {
    ten: "Release tag cố định",
    xong: theTag.length > 0,
    chiTiet: theTag.length > 0 ? theTag.split("\n").at(-1)! : "chưa có tag nào",
    ai: "người",
  },
  {
    // Đọc thật qua `gh`, không tick tay. Nếu không có `gh` thì nói là chưa kiểm
    // được — khác hẳn với "chưa làm", và gộp hai thứ đó là tự lừa.
    ten: "Metadata repo (description, homepage, topics)",
    ...(() => {
      try {
        const r = JSON.parse(
          execFileSync("gh", ["repo", "view", "--json", "description,homepageUrl,repositoryTopics"], {
            encoding: "utf8",
          }),
        ) as { description?: string; homepageUrl?: string; repositoryTopics?: unknown[] };
        const du = Boolean(r.description && r.homepageUrl && (r.repositoryTopics?.length ?? 0) >= 3);
        return { xong: du, chiTiet: du ? `${r.repositoryTopics?.length} topic, có mô tả và homepage` : "còn trống" };
      } catch {
        return { xong: false, chiTiet: "không chạy được `gh` — CHƯA KIỂM ĐƯỢC, không phải chưa làm" };
      }
    })(),
    ai: "người",
  } as Muc,
];

/*
 * Ô CÒN TRỐNG VỀ BẰNG CHỨNG — không phải việc, mà là sự thật phải nói ra.
 * Liệt kê ở đây để không ai đọc checklist rồi tưởng đã đủ.
 */
const oTrongBangChung = [
  ["Phỏng vấn người mua", `${soLieu?.nguoiMua ?? 0} — đội quyết định không làm kỳ này`],
  ["Bên thứ ba tích hợp", tichHop?.doiTac ? "có" : "0 — ví dụ tích hợp do chính đội dựng"],
  ["Usability vòng 2", existsSync("data/seed/phong-van-vong-2.json") ? "có" : "chưa chạy"],
  ["Eval với mô hình thật", "BLOCKED_BY_SECRET — cần ANTHROPIC_API_KEY"],
];

const xong = muc.filter((m) => m.xong).length;
console.log(`\nCHECKLIST NỘP BÀI · ${xong}/${muc.length} · HEAD ${sha}\n`);
for (const m of muc) {
  console.log(`  ${m.xong ? "✓" : "·"} ${m.ten.padEnd(42)} ${m.chiTiet}`);
}
console.log(`\n  Ô còn trống về BẰNG CHỨNG — nói ra, không tick:`);
for (const [k, v] of oTrongBangChung) console.log(`    ${String(k).padEnd(28)} ${v}`);

const canNguoi = muc.filter((m) => !m.xong && m.ai === "người");
if (canNguoi.length > 0) {
  console.log(`\n  ${canNguoi.length} việc CHỈ NGƯỜI LÀM ĐƯỢC:`);
  for (const m of canNguoi) console.log(`    · ${m.ten}`);
}
const canMay = muc.filter((m) => !m.xong && m.ai === "máy");
process.exit(canMay.length === 0 ? 0 : 1);

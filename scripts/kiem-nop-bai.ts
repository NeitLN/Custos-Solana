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

/*
 * BA LOẠI CHẶN, KHÔNG PHẢI HAI.
 *
 *   máy    — repo tự kiểm được. Chưa đạt là LỖI, và `--strict` phải đỏ.
 *   người  — cần chủ dự án làm (quay video, publish, tạo tag).
 *   ngoài  — cần bên thứ ba (BTC trả lời, đối tác tích hợp).
 *
 * Gộp ba loại thành một con số "5/10" khiến người đọc không biết cái nào mình sửa
 * được. Và một `exit 0` khi checklist mới 5/10 thì dễ bị đọc thành "đã sẵn sàng" —
 * đúng thứ kế hoạch review cấm.
 */
type Muc = { ten: string; xong: boolean; chiTiet: string; ai: "máy" | "người" | "ngoài" };

const STRICT = process.argv.includes("--strict");

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
const tichHop = json<{ dat: boolean; doiTac: unknown; kiem?: Array<{ dat: boolean }> }>(
  "data/tich-hop/ket-qua.json",
);
const anh = existsSync("docs/nop-bai/anh")
  ? readdirSync("docs/nop-bai/anh").filter((f) => f.endsWith(".png"))
  : [];
const lich = doc("docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md");
const oTrong = (lich.match(/^- \[ \]/gm) ?? []).length;

const NL = String.fromCharCode(10);
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
    // Đếm từ mảng thật. Bản trước ghi cứng "5/5" và nó tụt lại khi số check lên 8 —
    // một checklist nói sai về chính nó thì không ai kiểm được gì bằng nó.
    chiTiet: tichHop?.kiem
      ? `${tichHop.kiem.filter((k) => k.dat).length}/${tichHop.kiem.length} kịch bản pass`
      : "chưa chạy `npm run thu-tich-hop`",
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
    ai: "ngoài",
  },
  {
    ten: "Gói AI có bản vá trên registry",
    xong: false,
    // Đọc version từ package.json — gõ tay ở đây thì nó tụt lại sau mỗi lần bump.
    chiTiet: `${(JSON.parse(doc("packages/ai/package.json")) as { version: string }).version} chưa publish; \`npm install\` hôm nay vẫn lấy 0.1.2 THIẾU neo grounding`,
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

/*
 * KIỂM CHỈ CÓ Ý NGHĨA NGAY TRƯỚC KHI TẠO TAG.
 *
 * Release notes ghi SHA lúc sinh; commit tiếp là nó lệch. Lệch giữa hai lần sinh là
 * BÌNH THƯỜNG, nên `check` thường không chặn. Nhưng tạo tag với release notes trỏ
 * commit khác là phát hành một tài liệu nói về bản khác — lúc đó phải chặn.
 */
if (STRICT) {
  const shaDay = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const rn = doc("docs/nop-bai/RELEASE-NOTES.md");
  const m = /\*\*Commit:\*\* `([0-9a-f]{7,40})`/.exec(rn);
  muc.push({
    ten: "Release notes trỏ đúng HEAD",
    xong: Boolean(m && shaDay.startsWith(m[1]!)),
    chiTiet: m ? `notes: ${m[1]!.slice(0, 7)} · HEAD: ${shaDay.slice(0, 7)}` : "không đọc được SHA",
    ai: "máy",
  });

  // Version claim vs registry: chỉ kiểm khi có mạng; không có thì nói CHƯA KIỂM ĐƯỢC.
  const vLocal = (JSON.parse(doc("packages/ai/package.json")) as { version: string }).version;
  let vReg: string | null = null;
  try {
    vReg = execFileSync("npm", ["view", "@custos-solana/ai", "version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    }).trim();
  } catch {
    vReg = null;
  }
  muc.push({
    ten: "Registry khớp version trong source",
    xong: vReg !== null && vReg === vLocal,
    chiTiet:
      vReg === null
        ? "không hỏi được registry — CHƯA KIỂM ĐƯỢC, không phải đã khớp"
        : `registry ${vReg} · source ${vLocal}`,
    ai: "người",
  });

  // Video: chỉ tick khi có FILE THẬT. Không suy từ tài liệu nói "đã quay".
  const coVideo = existsSync("docs/nop-bai/video") &&
    readdirSync("docs/nop-bai/video").some((f) => /\.(mp4|mov|webm)$/i.test(f));
  const i = muc.findIndex((x) => x.ten === "Video demo dự phòng");
  if (i !== -1) {
    muc[i]!.xong = coVideo;
    muc[i]!.chiTiet = coVideo
      ? `có file trong docs/nop-bai/video`
      : "THỂ LỆ GHI LÀ BẮT BUỘC. Không có file video nào — không tick theo lời, chỉ tick theo file";
  }
}

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
const canNgoai = muc.filter((m) => !m.xong && m.ai === "ngoài");
if (canNgoai.length > 0) {
  console.log(`${NL}  ${canNgoai.length} việc chờ BÊN NGOÀI:`);
  for (const m of canNgoai) console.log(`    · ${m.ten}`);
}

if (!STRICT) {
  console.log(`${NL}  Đây là chế độ thường: chỉ máy-kiểm được mới ảnh hưởng exit code.`);
  console.log(`  Trước khi tạo tag, chạy:  npm run nop-bai -- --strict`);
  process.exit(canMay.length === 0 ? 0 : 1);
}

/*
 * STRICT: mọi ô chưa đạt đều chặn, kể cả ô cần con người.
 *
 * Đây là cổng trước khi tạo tag. Một `exit 0` ở đây nghĩa là "nộp được", nên nó
 * không được xanh khi còn thiếu video hay còn câu chưa hỏi BTC — dù đó không phải
 * lỗi kỹ thuật.
 */
const conThieu = muc.filter((m) => !m.xong);
if (conThieu.length > 0) {
  console.error(`${NL}✖ CHƯA SẴN SÀNG NỘP — ${conThieu.length}/${muc.length} ô chưa đạt:`);
  for (const m of conThieu) console.error(`    [${m.ai}] ${m.ten} — ${m.chiTiet}`);
  process.exit(1);
}
console.log(`${NL}✓ Mọi ô đã đạt. Release candidate tạo được.`);

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Phủ định phải NEO vào cụm bị cấm. Bản trước tự viết mệnh đề miễn trừ ở mỗi file
// và cả hai đều tha mọi dòng chứa chữ "không" — xem `ngonNgu.ts`.
import { laLoiDan, viPhamCum } from "./ngonNgu.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const DU_LIEU = "data/seed/nguoi-mua.json";

/** Số cuộc phỏng vấn người mua THẬT. Vắng file, file ví dụ, hay rỗng đều là 0. */
function soNguoiMua(): number {
  if (!existsSync(join(GOC, DU_LIEU))) return 0;
  const h = JSON.parse(doc(DU_LIEU)) as { laViDu?: boolean; ban?: unknown[] };
  if (h.laViDu) return 0;
  return h.ban?.length ?? 0;
}

/*
 * KHÔNG CÔNG BỐ TRACTION CHƯA CÓ.
 *
 * Đội đã hỏi 20 NGƯỜI DÙNG CUỐI. Chưa hỏi NGƯỜI MUA nào. Hai nhóm khác nhau và
 * trả lời hai câu khác nhau: người dùng nói sản phẩm có dễ hiểu không, người mua
 * nói có ai chịu tích hợp không.
 *
 * Sức ép trộn hai con số này rất lớn, vì một bên có số đẹp còn bên kia trống. Và
 * câu hỏi vặn thì hiển nhiên: "trong 20 người đó, ai là người quyết định tích hợp?"
 * Câu trả lời thật là: không ai.
 *
 * Repo đã phải tách ba chữ "bị gắn cờ" / "bị cáo buộc" / "báo nhầm" vì đúng lỗi
 * này. Lần này khoá trước khi nó xảy ra.
 */
const CUM_TRACTION: Array<[string, RegExp]> = [
  ["nói đã có khách hàng", /(đã có|có) (khách hàng|người mua|bên mua)/i],
  ["nói đã có pilot", /(đang|đã) (chạy |có )?pilot\b/i],
  ["nói ví/dApp đã cam kết", /(ví|dApp)[^.]{0,30}(đã )?cam kết/i],
  ["nói đã phỏng vấn người mua", /phỏng vấn[^.]{0,20}(người mua|ví|dApp)/i],
];


test("không công bố người mua / pilot khi chưa hỏi ai", () => {
  if (soNguoiMua() > 0) return; // có dữ liệu thật rồi thì đây không còn là claim sai

  const pham: string[] = [];
  for (const f of ["README.md", "CLAUDE.md", "CUSTOS.md", "PITCH-VA-PHAN-BIEN.md"]) {
    for (const [i, d] of doc(f).split("\n").entries()) {
      if (laLoiDan(d)) continue;
      for (const [ten, moc] of CUM_TRACTION) {
        if (viPhamCum(d, moc)) pham.push(`${f}:${i + 1} — ${ten}\n      ${d.trim().slice(0, 100)}`);
      }
    }
  }
  assert.deepEqual(
    pham,
    [],
    `Chưa có bản ghi nào trong ${DU_LIEU}. Nói "chưa có" thì mất một chút; để giám\n` +
      "khảo moi ra thì mất nhiều hơn:\n" +
      pham.join("\n"),
  );
});

test("bộ đồ nghề phỏng vấn người mua tách bạch hai nhóm", () => {
  const s = doc("docs/PHONG-VAN-NGUOI-MUA.md");
  // Tài liệu này là thứ người đi hỏi cầm theo. Nó phải tự nói ra ranh giới, vì
  // người đọc nó lúc 11 giờ đêm sẽ không nhớ ngữ cảnh hôm nay.
  assert.match(s, /CHỈ NGƯỜI THẬT LÀM ĐƯỢC/, "phải nói rõ Claude không điền câu trả lời");
  assert.match(s, /không được trộn số|KHÔNG trả lời được câu này/i, "phải tách người dùng cuối khỏi người mua");
  assert.match(s, /choPhepTrichDan/, "phải nêu quy tắc xin phép trước khi trích dẫn");
  assert.match(s, /Chưa đạt thì nói chưa đạt/, "mục tiêu phễu không được công bố như kết quả");
});

test("lược đồ người mua đếm ba mức tách nhau", () => {
  // "nói chuyện" ≠ "đồng ý xem SDK" ≠ "pilot". Gộp lên một bậc là cách dễ nhất để
  // một con số nhỏ trông to.
  const s = doc("scripts/kiem-nguoi-mua.ts");
  for (const truong of ["dongYXemSdk", "dongYPilot", "choPhepTrichDan"]) {
    assert.match(s, new RegExp(truong), `thiếu mức \`${truong}\``);
  }
  assert.match(s, /KHÔNG ĐƯỢC GỘP/, "phải nói rõ vì sao ba mức tách nhau");
});

test("trang số liệu KHÔNG giấu mục chưa đo được khi số bằng 0", () => {
  /*
   * Bẫy tự nhiên của mọi dashboard: bọc mục trong `{x && (…)}`, rồi khi x = 0 thì
   * mục biến mất. Kết quả là trang chỉ hiện thứ đội đã làm được — trông đẹp hơn
   * thực tế, và không ai cố ý làm điều đó.
   *
   * Ô trống chính là thứ giám khảo đi tìm. Nó phải hiện ra, kể cả bằng số 0.
   */
  const s = doc("apps/demo-wallet/src/SoLieu.tsx");
  const i = s.indexOf("Điều đội CHƯA đo được");
  assert.ok(i > 0, "trang số liệu phải có mục nói ra điều chưa đo được");

  // Mục này phải nằm trong một <section> KHÔNG bị bọc điều kiện.
  const truoc = s.slice(Math.max(0, i - 400), i);
  assert.doesNotMatch(
    truoc,
    /\{d\.(nguoiMua|tichHop)[^}]*&&\s*\($/m,
    "mục chưa-đo-được không được bọc trong điều kiện — 0 phải hiện ra, không được biến mất",
  );
  assert.match(s.slice(i, i + 1600), /d\.nguoiMua/, "phải hiện đúng số phỏng vấn người mua");
});

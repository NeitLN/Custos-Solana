import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const DECK = "docs/nop-bai/CUSTOS-PITCH.pptx";
const NL = String.fromCharCode(10);

const S = JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as {
  test: { pass: number };
  soLuat: number;
  soMau: number;
};

/*
 * ARTIFACT NHỊ PHÂN CŨNG PHẢI ĐƯỢC CANH.
 *
 * Deck committed mang số 348 trong khi repo đã ở 355. Không guard nào bắt được, vì
 * mọi guard số liệu chỉ quét file văn bản — và `.pptx` là một file zip.
 *
 * Đó là artifact giám khảo THỰC SỰ NHÌN THẤY. Một con số cũ trên slide đắt hơn cùng
 * con số đó trong README, vì nó được đọc to trước hội đồng.
 */
function chuTrongDeck(): string {
  const san = mkdtempSync(join(tmpdir(), "custos-deck-"));
  try {
    /*
     * `.pptx` LÀ FILE ZIP, KHÔNG PHẢI TAR.
     *
     * Bản đầu dùng `tar -xf` — nó ném lỗi, `catch` nuốt, và test BÁO XANH GIẢ trong
     * khi deck vẫn mang số cũ. Một guard im lặng khi hỏng còn tệ hơn không có guard:
     * nó tạo cảm giác đã được canh.
     */
    execFileSync("unzip", ["-q", "-o", join(GOC, DECK), "-d", san], { stdio: "ignore" });
    const gom: string[] = [];
    const quet = (d: string) => {
      for (const f of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, f.name);
        if (f.isDirectory()) quet(p);
        else if (f.name.endsWith(".xml")) gom.push(readFileSync(p, "utf8"));
      }
    };
    quet(san);
    return gom.join("\n");
  } finally {
    rmSync(san, { recursive: true, force: true });
  }
}

test("deck không mang số test cũ", () => {
  if (!existsSync(join(GOC, DECK))) return;

  /*
   * DỰNG LẠI CHỮ HIỂN THỊ, KHÔNG QUÉT XML THÔ.
   *
   * Hai lần sai trước ở đây:
   *   1. Quét `>NNN<` trong XML thô → báo oan `400`, một giá trị layout.
   *   2. Quét "NNN test" → trượt, vì PowerPoint tách số và chữ thành hai `<a:t>`
   *      khác nhau. Đó chính là lý do deck mang 348 mà không guard nào thấy.
   *
   * `<a:t>` là các đoạn chữ THẬT trên slide. Nối chúng theo thứ tự thì ra đúng câu
   * người xem đọc, và lúc đó "355 test" là một chuỗi liền.
   */
  const chu = chuTrongDeck()
    .split(/<a:t>/)
    .slice(1)
    .map((x) => x.split("</a:t>")[0] ?? "")
    .join("");

  const cu = [...chu.matchAll(/(\d{3})\s*test/g)]
    .map((m) => m[1]!)
    .filter((n) => Number(n) !== S.test.pass);

  assert.deepEqual(
    [...new Set(cu)],
    [],
    `Deck mang số test cũ ${[...new Set(cu)].join(", ")} — số hiện tại là ${S.test.pass}.` +
      `${NL}Dựng lại: node scripts/tao-deck.cjs docs/nop-bai/CUSTOS-PITCH.pptx apps/demo-wallet/public/so-lieu.json`,
  );
});

/*
 * RELEASE NOTES TRỎ ĐÚNG COMMIT.
 *
 * Nó ghi SHA lúc sinh, rồi commit tiếp làm HEAD đổi — và file nói về một commit
 * không phải bản người ta đang đọc. Ở đây chỉ CẢNH BÁO khi lệch, vì lệch là bình
 * thường giữa hai lần sinh; `nop-bai --strict` mới là chỗ chặn trước khi tạo tag.
 */
test("release notes ghi một SHA có thật trong repo", () => {
  const RN = "docs/nop-bai/RELEASE-NOTES.md";
  if (!existsSync(join(GOC, RN))) return;
  const m = /\*\*Commit:\*\* `([0-9a-f]{7,40})`/.exec(doc(RN));
  assert.ok(m, "release notes phải ghi commit");
  let coThat = true;
  try {
    execFileSync("git", ["cat-file", "-e", `${m[1]}^{commit}`], { cwd: GOC, stdio: "ignore" });
  } catch {
    coThat = false;
  }
  assert.ok(coThat, `SHA ${m[1]} không phải commit có thật — release notes đang trỏ vào hư không`);
});

test("checklist nộp bài không hardcode số kịch bản tích hợp", () => {
  // Nó từng ghi cứng "5/5" trong khi dữ liệu có 8 check.
  const s = doc("scripts/kiem-nop-bai.ts");
  assert.doesNotMatch(s, /"\d+\/\d+ kịch bản pass"/, "số kịch bản phải đếm từ dữ liệu, không gõ tay");
  assert.match(s, /tichHop\.kiem\.filter/, "phải đếm từ mảng `kiem` thật");
});

test("dữ liệu tích hợp không có check ĐẠT kèm câu thất bại", () => {
  const KQ = "data/tich-hop/ket-qua.json";
  if (!existsSync(join(GOC, KQ))) return;
  const k = JSON.parse(doc(KQ)) as { kiem: Array<{ ten: string; dat: boolean; chiTiet: string }> };
  const xau = k.kiem
    .filter((x) => x.dat && /^(không|khong)/i.test(x.chiTiet.trim()))
    .map((x) => `${x.ten} → "${x.chiTiet}"`);
  assert.deepEqual(
    xau,
    [],
    "`dat: true` mà `chiTiet` là câu mô tả thất bại — người đọc không biết tin vế nào:\n" + xau.join("\n"),
  );
});

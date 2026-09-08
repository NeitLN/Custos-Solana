import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { commitCoThat } from "./gitKho.ts";
import { docBangChungTichHop } from "../../../scripts/bangChungTichHop.ts";
import { docZip } from "../../../scripts/docZip.ts";

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
  /*
   * `.pptx` LÀ FILE ZIP, KHÔNG PHẢI TAR — và cũng không cần `unzip` ngoài máy.
   *
   * Bản đầu dùng `tar -xf`: nó ném lỗi, `catch` nuốt, test BÁO XANH GIẢ trong khi
   * deck vẫn mang số cũ. Bản thứ hai dùng `unzip` qua `spawnSync` — đúng định dạng,
   * nhưng trên PowerShell không có Git-for-Windows `usr/bin` trong PATH thì nó ném
   * `ENOENT` và bài kiểm ĐỎ dù deck hoàn toàn đúng. Tái hiện được: 402/403.
   *
   * Thiếu công cụ và sản phẩm sai là hai chuyện; một guard trộn chúng lại sẽ dạy
   * người ta bỏ qua màu đỏ. CI chạy Linux nên `unzip` luôn có, và lỗi này không bao
   * giờ lộ ra ở đó.
   *
   * `scripts/docZip.ts` đọc ZIP bằng `node:zlib` — không tiến trình con, không phụ
   * thuộc mới, chạy giống nhau trên mọi nền.
   */
  return docZip(join(GOC, DECK), (ten) => ten.endsWith(".xml"))
    .map((m) => m.noiDung.toString("utf8"))
    .join(String.fromCharCode(10));
}

/*
 * Bài đối chiếu artifact phải NGHỈ trong lượt đo lại.
 *
 * `tao-so-lieu.ts` từ chối ghi khi bộ test đỏ. Nhưng deck và release notes đỏ CHÍNH
 * VÌ chưa được dựng lại theo số mới, mà dựng lại thì cần số mới — tức cần lượt ghi
 * vừa bị chặn. Đây là lần thứ TƯ cùng một bế tắc trong repo này; ba lần trước đã
 * giải bằng `CUSTOS_DANG_DO`, guard mới lại quên.
 */
const DANG_DO = process.env["CUSTOS_DANG_DO"] === "1";
const boQuaKhiDo = { skip: DANG_DO ? "đang đo lại — đối chiếu thuộc về `npm run check`" : false };

test("deck không mang số test cũ", boQuaKhiDo, () => {
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

  // `null` = kho nông cạn (CI `fetch-depth: 1`) — không kiểm được, và đỏ ở đây là
  // đỏ oan: commit cha đơn giản là chưa được tải về.
  const coThat = commitCoThat(m[1]!, GOC);
  if (coThat === null) return;
  assert.ok(coThat, `SHA ${m[1]} không phải commit có thật — release notes đang trỏ vào hư không`);
});

test("checklist nộp bài không hardcode số kịch bản tích hợp", () => {
  // Nó từng ghi cứng "5/5" trong khi dữ liệu có 8 check.
  const s = doc("scripts/kiem-nop-bai.ts");
  assert.doesNotMatch(s, /"\d+\/\d+ kịch bản pass"/, "số kịch bản phải đếm từ dữ liệu, không gõ tay");
  assert.match(s, /\.filter\(\(k\) => k\.dat\)/, "phải đếm từ mảng `kiem` thật");
});

/*
 * CỔNG PHẢI ĐỌC LƯỢT GẦN NHẤT, KHÔNG ĐỌC LƯỢT PASS GẦN NHẤT.
 *
 * Đây là bài kiểm cho chính lỗi vừa sửa: harness đánh rơi lượt fail, file giữ
 * nguyên lượt pass cũ, và checklist in "8/8 kịch bản pass" ngay sau một lượt đỏ.
 */
test("checklist đọc `lanGanNhat`, không đọc `lanPassGanNhat`", () => {
  const s = doc("scripts/kiem-nop-bai.ts");
  assert.match(s, /lanGanNhat/, "trạng thái tích hợp phải lấy từ lượt chạy gần nhất");
  assert.doesNotMatch(
    s,
    /xong:\s*bcTichHop\?\.lanPassGanNhat/,
    "ô trạng thái không được tick bằng lượt pass cũ",
  );
});

test("dữ liệu tích hợp không có check ĐẠT kèm câu thất bại", () => {
  const KQ = "data/tich-hop/ket-qua.json";
  if (!existsSync(join(GOC, KQ))) return;
  const bc = docBangChungTichHop(GOC);
  const k = { kiem: bc?.lanGanNhat?.kiem ?? [] };
  const xau = k.kiem
    .filter((x) => x.dat && /^(không|khong)/i.test(x.chiTiet.trim()))
    .map((x) => `${x.ten} → "${x.chiTiet}"`);
  assert.deepEqual(
    xau,
    [],
    "`dat: true` mà `chiTiet` là câu mô tả thất bại — người đọc không biết tin vế nào:\n" + xau.join("\n"),
  );
});

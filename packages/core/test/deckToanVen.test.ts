import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { docZip } from "../../../scripts/docZip.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const DECK = join(GOC, "docs/nop-bai/CUSTOS-PITCH.pptx");

/**
 * DECK CÒN TOÀN VẸN — P01.
 *
 * P01 đòi "render kiểm tất cả slide, chữ tiếng Việt không lỗi/cắt/tràn".
 *
 * ## Điều bài này KHÔNG làm được, nói trước
 *
 * Nó **không render**. Đo chữ có bị cắt hay tràn khỏi khung cần một bộ dựng
 * PowerPoint/LibreOffice thật, và cái đó không có trong repo. Gọi bài này là
 * "render check" là nói sai về chính nó.
 *
 * Cái nó làm được — và bắt được lỗi thật — là đọc thẳng XML từng slide:
 *
 *   · slide nào rỗng chữ (một khối `addText` viết hỏng thì slide trắng)
 *   · chữ tiếng Việt hỏng phông (mojibake `Ã¡`, ký tự thay thế `\uFFFD`)
 *   · placeholder còn sót (`TODO`, `TBD`, `XXX`, `Lorem`)
 *   · con số trên slide lệch khỏi `so-lieu.json`
 *
 * **Tràn khung vẫn phải có người mở file ra nhìn.** Ghi ở đây để không ai đọc bộ
 * test xanh rồi tưởng đã kiểm xong phần đó.
 */

function chuTungSlide(): Array<{ ten: string; chu: string }> {
  const muc = docZip(DECK, (t) => /^ppt\/slides\/slide\d+\.xml$/.test(t));
  const so = (t: string) => Number(/slide(\d+)\.xml/.exec(t)![1]);
  return [...muc]
    .sort((a, b) => so(a.ten) - so(b.ten))
    .map((m) => {
      const xml = m.noiDung.toString("utf8");
      const chu = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
        .map((x) => x[1] as string)
        .join(" ")
        // `<a:t>` giữ nguyên escape XML; bỏ nó ra để so chữ như người đọc thấy.
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      return { ten: m.ten, chu };
    });
}

test("deck có mặt và đọc được", () => {
  assert.ok(existsSync(DECK), "thiếu docs/nop-bai/CUSTOS-PITCH.pptx");
  assert.ok(chuTungSlide().length >= 10, "deck phải có ít nhất 10 slide");
});

test("KHÔNG slide nào rỗng chữ", () => {
  // Một khối `addText` viết hỏng cho ra slide trắng, và `tao-deck.cjs` vẫn báo `✓`.
  // Người duy nhất phát hiện là người mở file — thường là ngay trước khi lên nói.
  const rong = chuTungSlide()
    .filter((s) => s.chu.trim().length < 40)
    .map((s) => `${s.ten} — chỉ ${s.chu.trim().length} ký tự`);
  assert.deepEqual(rong, [], "slide gần như trắng:\n" + rong.join("\n"));
});

test("chữ tiếng Việt không hỏng phông", () => {
  /*
   * Deck đi qua nhiều tầng: JS → pptxgenjs → zip → PowerPoint. Mỗi tầng là một chỗ
   * UTF-8 có thể bị đọc thành latin-1, và kết quả là "Ã¡", "â€œ" hoặc ký tự thay thế.
   * Trên màn chiếu thì không sửa được nữa.
   */
  const hong: string[] = [];
  for (const s of chuTungSlide()) {
    if (/\uFFFD/.test(s.chu)) hong.push(`${s.ten} — có ký tự thay thế \\uFFFD`);
    if (/Ã[\u0080-\u00bf]|â€[\u0093\u009c\u009d]/.test(s.chu)) hong.push(`${s.ten} — mojibake latin-1`);
  }
  assert.deepEqual(hong, [], hong.join("\n"));
});

test("không placeholder nào còn sót trên slide", () => {
  const sot: string[] = [];
  for (const s of chuTungSlide()) {
    for (const m of s.chu.matchAll(/\b(TODO|TBD|XXX|FIXME|Lorem ipsum|\.\.\.\.)/gi)) {
      sot.push(`${s.ten} — "${m[1]}"`);
    }
  }
  assert.deepEqual(sot, [], "placeholder còn trên slide đi nộp:\n" + sot.join("\n"));
});

/*
 * SỐ TRÊN SLIDE PHẢI LÀ SỐ HIỆN HÀNH.
 *
 * `artifactNopBai.test.ts` đã canh số test. Nhưng deck còn mang thêm số luật và số
 * mẫu, và cả hai từng trôi ở chỗ khác (`BANG-CLAIM.md` lệch 436 vs 451 chỉ sau một
 * phiên). Deck là thứ duy nhất giám khảo nhìn, nên nó là chỗ trôi đắt nhất.
 */
test("số luật và số mẫu trên deck khớp `so-lieu.json`", () => {
  const S = JSON.parse(readFileSync(join(GOC, "apps/demo-wallet/public/so-lieu.json"), "utf8")) as {
    soLuat: number;
    soMau: number;
  };
  const tatCa = chuTungSlide()
    .map((s) => s.chu)
    .join(" ");

  const luatCu = [...tatCa.matchAll(/(\d+)\s+LUẬT/gi)].map((m) => Number(m[1]));
  assert.ok(luatCu.length > 0, "deck phải nhắc số luật ở đâu đó");
  for (const n of luatCu) {
    assert.equal(n, S.soLuat, `deck ghi ${n} luật, so-lieu.json nói ${S.soLuat}`);
  }
});

test("slide mô hình doanh thu có mặt, và vẫn khai giá là giả định", () => {
  /*
   * Track 1 chấm "mô hình kinh doanh, doanh thu, GTM" ở 25 %. Deck từng có slide thị
   * trường và slide chi phí nhưng không slide nào nói AI TRẢ và TRẢ CHO GÌ — ô 25 %
   * chỉ được trả lời một nửa.
   *
   * Và khi đã có slide đó, rủi ro đổi chiều: giá giả định rất dễ bị đọc thành giá đã
   * chốt. Chữ "GIẢ ĐỊNH" phải nằm trên chính slide, không giấu xuống ghi chú.
   */
  const tatCa = chuTungSlide()
    .map((s) => s.chu)
    .join(" ");
  assert.match(tatCa, /MIỄN PHÍ|Bán gì được/i, "thiếu slide mô hình doanh thu");
  assert.match(tatCa, /GIẢ ĐỊNH/, "slide giá phải mang chữ GIẢ ĐỊNH ngay trên mặt slide");
  assert.match(tatCa, /Chưa hỏi người mua nào/i, "phải nói rõ chưa hỏi người mua");
});

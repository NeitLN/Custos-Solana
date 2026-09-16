import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * `.trim()` TRÊN CẢ OUTPUT PORCELAIN ĂN MẤT KHOẢNG TRẮNG ĐẦU CỦA DÒNG ĐẦU TIÊN.
 *
 * Mỗi dòng `git status --porcelain` có tiền tố ba ký tự — `" M "`, `"?? "`, `"M  "`.
 * Hàm trợ giúp `git()` ở hai cổng đều `.trim()` toàn bộ chuỗi trả về, nên dòng đầu
 * mất ký tự đầu, và `slice(3)` sau đó cắt luôn vào tên file:
 *
 *     RAW      " M README.md"  → slice(3) → "README.md"
 *     .trim()  "M README.md"   → slice(3) → "EADME.md"
 *
 * Đã xảy ra thật, và in ra log của `npm run kiem-san-pham`:
 *
 *     error: pathspec 'EADME.md' did not match any file(s) known to git
 *     ✖ Số liệu khớp artifact  5 tài liệu lệch số đo (EADME.md, …)
 *
 * HAI HẬU QUẢ NGƯỢC NHAU, ở hai chỗ gọi:
 *
 *   · `kiem-san-pham.ts` — cổng `git checkout --` từng file để TRẢ LẠI thứ nó vừa
 *     làm bẩn. Tên sai ⇒ `git` ném ⇒ file KHÔNG được trả lại. Cổng tự để rác lại
 *     trên cây mà nó vừa tuyên bố là bẩn.
 *   · `toTien.ts` — tên sai không khớp `dangKe()`, nên một file mã đang bẩn bị đếm
 *     thiếu, và hàm có thể kết luận "cây sạch" khi nó không sạch. Đây là hướng nguy
 *     hiểm hơn: nó nói GIẢM về mức bẩn.
 *
 * Vì sao nó sống lâu: chỉ hỏng ĐÚNG MỘT dòng — dòng đầu theo thứ tự alphabet của tập
 * file đang bẩn. Đổi tập file là lỗi biến mất, nên nó không tái hiện được bằng cách
 * chạy lại.
 */

test("không cổng nào slice(3) trên chuỗi porcelain đã trim cả khối", () => {
  /*
   * Neo vào HÌNH DẠNG lỗi, không vào tên hàm: bất kỳ chỗ nào lấy `git([...])` —
   * vốn `.trim()` — rồi `.split(NL).map(d => d.slice(3))` đều dính.
   *
   * Cho phép `git(["status", ...])` dùng để hỏi "cây có bẩn không" (so với chuỗi
   * rỗng); chỉ cấm lấy TÊN FILE ra từ chuỗi đã trim.
   */
  const pham: string[] = [];
  for (const f of ["scripts/kiem-san-pham.ts", "scripts/toTien.ts"]) {
    const s = doc(f);
    // Bỏ chú thích trước khi quét: cả hai file GIẢI THÍCH lỗi này, và một phép kiểm
    // theo chuỗi không phân biệt "làm X" với "kể rằng X từng sai".
    const ma = s
      .split("\n")
      .filter((d) => {
        const t = d.trim();
        return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
      })
      .join("\n");

    // `git([...])` rồi `.split(...)` rồi `.slice(3)` trong cùng một biểu thức.
    const re = /git\(\[[^\]]*"status"[^\]]*\]\)[^;]{0,200}?\.slice\(3\)/s;
    if (re.test(ma)) pham.push(`${f}: lấy tên file từ chuỗi đã \`.trim()\` cả khối`);
  }
  assert.deepEqual(
    pham,
    [],
    "porcelain phải đọc RAW — `.trim()` cả khối ăn mất khoảng trắng đầu của dòng đầu",
  );
});

test("kiem-san-pham có hàm đọc porcelain riêng, và nó lọc theo ĐỘ DÀI dòng", () => {
  /*
   * `.filter(Boolean)` sau `.map(slice(3))` KHÔNG đủ: nó chỉ bỏ chuỗi rỗng sau khi
   * đã cắt. Dòng rỗng cuối output phải bị loại TRƯỚC, bằng độ dài — nếu không một
   * dòng ngắn hơn 3 ký tự vẫn đi qua `slice(3)` và cho chuỗi rỗng, che mất việc
   * output có hình dạng lạ.
   */
  const s = doc("scripts/kiem-san-pham.ts");
  assert.match(s, /function tenFileBan\(/, "phải có hàm đọc porcelain riêng");
  const i = s.indexOf("function tenFileBan(");
  const than = s.slice(i, s.indexOf("\n}", i));
  assert.match(than, /execFileSync\("git"/, "phải gọi thẳng execFileSync, không qua `git()`");
  assert.doesNotMatch(than, /\.trim\(\)\s*[;\n]\s*.*\.split/s, "không được trim cả khối rồi mới split");
  assert.match(than, /\.length > 3/, "phải lọc dòng theo độ dài trước khi slice(3)");
});

test("phép cắt đúng và phép cắt sai cho kết quả KHÁC nhau — nếu không, bài trên vô nghĩa", () => {
  /*
   * Bài canh chính bài kiểm. Nếu một ngày porcelain đổi định dạng và hai cách cắt cho
   * cùng kết quả, ba bài trên vẫn xanh trong khi thứ chúng canh đã không còn nghĩa.
   */
  const raw = ' M README.md\n M docs/BAO-CAO-TONG.md\n';
  const dung = raw
    .split("\n")
    .filter((d) => d.length > 3)
    .map((d) => d.slice(3).trim());
  const sai = raw
    .trim()
    .split("\n")
    .map((d) => d.slice(3).trim())
    .filter(Boolean);

  assert.deepEqual(dung, ["README.md", "docs/BAO-CAO-TONG.md"]);
  assert.equal(sai[0], "EADME.md", "phép cắt sai phải cho đúng triệu chứng đã quan sát");
  assert.notDeepEqual(dung, sai, "hai phép cắt phải khác nhau, nếu không bài kiểm vô nghĩa");
});

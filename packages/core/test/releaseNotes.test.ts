import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const RN = "docs/nop-bai/RELEASE-NOTES.md";

/*
 * RELEASE NOTES LÀ TÀI LIỆU DỄ TIN NHẤT VÀ DỄ CŨ NHẤT.
 *
 * Nó trông chính thức hơn mọi tài liệu khác, nên người đọc tin nó hơn — kể cả khi
 * số trong đó đã lạc hậu hai tuần. Vì vậy nó phải SINH ra, và phần giới hạn cũng
 * phải sinh ra: chờ ai đó nhớ liệt kê ô còn trống là cách chắc chắn để sót.
 */
test("release notes khớp số liệu hiện tại", () => {
  if (!existsSync(join(GOC, RN))) return; // chưa sinh thì không có gì để lệch
  const s = doc(RN);
  const S = JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as {
    test: { pass: number };
    soLuat: number;
    soMau: number;
  };
  const lech: string[] = [];
  if (!s.includes(`**${S.test.pass}** pass`)) lech.push(`thiếu số test ${S.test.pass}`);
  if (!s.includes(`**${S.soLuat}**`)) lech.push(`thiếu số luật ${S.soLuat}`);
  if (!s.includes(`**${S.soMau}**`)) lech.push(`thiếu số mẫu ${S.soMau}`);
  assert.deepEqual(lech, [], `${RN} lệch — chạy \`npm run release-notes\`:\n` + lech.join("\n"));
});

test("release notes nói ra ô còn trống, không chỉ khoe số", () => {
  if (!existsSync(join(GOC, RN))) return;
  const s = doc(RN);
  assert.match(s, /## Giới hạn/, "phải có mục giới hạn");
  // Bốn ô trống lớn nhất phải xuất hiện chừng nào chúng còn trống.
  const nguoiMua = (JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as { nguoiMua: number }).nguoiMua;
  if (nguoiMua === 0) {
    assert.match(s, /Chưa phỏng vấn người mua/, "còn trống thì phải nói ra");
  }
  assert.match(s, /Chưa bên thứ ba nào tích hợp|bên thứ ba/, "phải nói rõ chưa ai ngoài đội tích hợp");
  assert.match(s, /Devnet/, "phải nói runtime chỉ chạy Devnet");
});

test("release notes cảnh báo bản npm thiếu vá", () => {
  // Người đọc release notes là người sắp `npm install`. Nếu đây không cảnh báo thì
  // không chỗ nào cảnh báo kịp.
  if (!existsSync(join(GOC, RN))) return;
  const s = doc(RN);
  assert.match(s, /0\.1\.2.*THIẾU|THIẾU neo grounding/, "phải nêu đích danh bản thiếu vá");
});

test("không gọi '0 cáo buộc' là false positive trong release notes", () => {
  if (!existsSync(join(GOC, RN))) return;
  const s = doc(RN);
  for (const [i, d] of s.split("\n").entries()) {
    if (!/false positive/i.test(d)) continue;
    assert.match(
      d,
      /không phải|KHÔNG/,
      `${RN}:${i + 1} — nhắc false positive mà không kèm phủ định`,
    );
  }
});

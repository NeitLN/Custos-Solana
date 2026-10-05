import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * REDESIGN TRANG DEMO 06/10 — lớp trình bày `demo-thiet-ke.css`. Ba điều phải giữ:
 *   · nạp SAU CÙNG (sau mọi CSS cũ của trang), nếu không các rule ô-liu cũ thắng lại;
 *   · có bản `prefers-reduced-motion`, và khoảnh khắc chính nằm trong `no-preference`;
 *   · không đếm số (CK-12) — số dư và bảng hậu quả hiện ngay, chỉ hiện dần.
 */

const main = readFileSync("apps/demo-wallet/src/main.tsx", "utf8");
const css = readFileSync("apps/demo-wallet/src/demo-thiet-ke.css", "utf8");

test("lớp redesign nạp sau cùng, sau mọi CSS cũ của trang demo", () => {
  const thuTu = [...main.matchAll(/^import "\.\/(.+\.css)";/gm)].map((m) => m[1]);
  assert.equal(thuTu.at(-1), "demo-thiet-ke.css", `thứ tự nạp: ${thuTu.join(", ")}`);
  for (const cu of ["style.css", "demo-design.css", "wallet-execution.css", "live/live-demo.css"])
    assert.ok(thuTu.indexOf(cu) < thuTu.indexOf("demo-thiet-ke.css"), `${cu} phải nạp trước lớp redesign`);
});

test("chuyển động có bản giảm chuyển động; khoảnh khắc chính chỉ chạy khi người dùng không tắt", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  const khongTat = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
  assert.match(khongTat, /\.result-card \{\s*animation: dm-phan-quyet/);
});

test("không đếm số và không nảy: không keyframe nào đổi nội dung hay vượt quá kích thước cuối", () => {
  assert.doesNotMatch(css, /counter-increment|@property/);
  for (const m of css.matchAll(/scale\(([\d.]+)\)/g)) assert.ok(Number(m[1]) <= 1, `scale(${m[1]}) vượt 1 — nảy`);
});

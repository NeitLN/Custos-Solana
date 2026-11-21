import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * C3, ROADMAP-SAU-MENTOR — góp ý mentor 29/09: người xem tưởng Custos là "trang quét link",
 * và tưởng SolBonus là "web lừa đảo Custos phát hiện bằng URL". Cả hai đều sai về sản phẩm:
 * Custos chạy TRONG VÍ, trên đúng giao dịch sắp ký (ADR-0004).
 */

const doc = (p: string) => readFileSync(p, "utf8");
const tatCa = (thuMuc: string) =>
  readdirSync(thuMuc, { recursive: true })
    .map(String)
    .filter((f) => /\.(tsx?|html)$/.test(f))
    .map((f) => ({ f: join(thuMuc, f), s: doc(join(thuMuc, f)) }));

test("SolBonus tự nhận là dApp độc hại MÔ PHỎNG, không gọi Custos", () => {
  assert.match(doc("apps/trang-tan-cong/src/App.tsx"), /<aside className="bang-mo-phong"[^>]*><span>SIMULATED malicious dApp · Does not call Custos/);
  // R0-4: nhãn rời đầu trang nhưng phải LUÔN nhìn thấy — dải cố định đáy màn hình.
  assert.match(doc("apps/trang-tan-cong/src/attack-design.css"), /\.bang-mo-phong \{\s*position: fixed;/);
  // SOLB hư cấu vẫn phải được nói rõ ở đâu đó trên trang.
  assert.match(doc("apps/trang-tan-cong/src/App.tsx"), /SOLB is a fictional reward/);
});

test("Inspector là công cụ nhà phát triển, và nói người dùng cuối gặp Custos trong ví", () => {
  const s = doc("apps/demo-wallet/src/Inspector.tsx");
  assert.match(s, /Developer tool/);
  assert.match(s, /inside the wallet/);
  assert.match(doc("apps/demo-wallet/soi.html"), /<title>Developer tool — Custos<\/title>/);
});

test("không câu nào ngụ ý Custos xét URL, tên miền hay trang web", () => {
  const SAI =
    /phát hiện (trang|web|website|link|url|tên miền)|quét (link|url|đường link)|dán (link|url|đường link)|chặn (trang|website|tên miền)|kiểm (tra )?(link|url|tên miền)/i;
  const vi = [...tatCa("apps/demo-wallet/src"), ...tatCa("apps/trang-tan-cong/src")].flatMap(({ f, s }) =>
    s
      .split("\n")
      .filter((d) => SAI.test(d) && !/không kiểm đường link/.test(d))
      .map((d) => `${f}: ${d.trim().slice(0, 100)}`),
  );
  assert.deepEqual(vi, []);
  // Bản tiếng Anh của cùng luật: giao diện nay là tiếng Anh.
  const SAI_EN =
    /\b(detects?|scans?|checks?|blocks?) (the |a |any )?(links?|urls?|domains?|websites?|web pages?)\b|\bpaste (a |the )?(link|url)\b/i;
  const en = [...tatCa("apps/demo-wallet/src"), ...tatCa("apps/trang-tan-cong/src")].flatMap(({ f, s }) =>
    s
      .split("\n")
      .filter((d) => SAI_EN.test(d) && !/does not check links/i.test(d))
      .map((d) => `${f}: ${d.trim().slice(0, 100)}`),
  );
  assert.deepEqual(en, []);
});

test("C2 · trang giới thiệu có dải hành trình ký ngay dưới hero, đủ hai ngôn ngữ", async () => {
  const { NOI_DUNG } = await import("../src/landing/content.ts");
  for (const ngon of ["vi", "en"] as const) {
    const h = NOI_DUNG[ngon].hanhTrinh;
    assert.equal(h.buoc.length, 4, `${ngon}: hành trình phải đủ 4 bước`);
    assert.ok(h.ctaNguoiDung && h.ctaNhaPhatTrien);
  }
  const trang = doc("apps/demo-wallet/src/landing/LandingPage.tsx");
  assert.ok(trang.indexOf("<HanhTrinh") > trang.indexOf("<Hero ") && trang.indexOf("<HanhTrinh") < trang.indexOf("<ScenarioExplorer"));
  const dai = doc("apps/demo-wallet/src/landing/HanhTrinh.tsx");
  assert.match(dai, /LINK\.solBonus/);
  assert.match(dai, /LINK\.tichHop/);
});

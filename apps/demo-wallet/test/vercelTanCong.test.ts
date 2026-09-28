import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * BẢN VERCEL PHẢI CÓ TRANG TẤN CÔNG (28/09). Nút "Mở dApp của phiên này" mở
 * `${BASE_URL}tan-cong/` — GitHub Pages có (CI chép vào site/tan-cong), Vercel thì 404 vì
 * buildCommand chỉ dựng ví, và trang tấn công ghim cứng base `/Custos-Solana/tan-cong/`.
 */
test("vercel.json dựng CẢ trang tấn công, chép vào dist/tan-cong của ví", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string; outputDirectory: string };
  assert.match(v.buildCommand, /npm run build -w @custos-solana\/trang-tan-cong|--workspace apps\/trang-tan-cong/);
  assert.match(v.buildCommand, /apps\/trang-tan-cong\/dist[^ ]*\s+apps\/demo-wallet\/dist\/tan-cong/);
  assert.equal(v.outputDirectory, "apps/demo-wallet/dist");
});

test("trang tấn công theo CUSTOS_GOC như ví: gốc tên miền ⇒ /tan-cong/, GitHub Pages ⇒ /Custos-Solana/tan-cong/", () => {
  const c = readFileSync("apps/trang-tan-cong/vite.config.ts", "utf8");
  assert.match(c, /CUSTOS_GOC/);
  assert.match(c, /"\/tan-cong\/"/);
  assert.match(c, /"\/Custos-Solana\/tan-cong\/"/);
});

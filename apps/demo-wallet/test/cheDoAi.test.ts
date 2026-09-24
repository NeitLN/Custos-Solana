import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/**
 * CHẾ ĐỘ AI CỦA TỪNG BẢN BUILD — rà soát 25/09, P1.
 *
 * Vite dev và GitHub Pages không chạy hàm serverless; dò `/api/dien-giai` ở đó luôn ra
 * 404. Bản build phải BIẾT nó có máy chủ AI hay không, qua cờ `VITE_CO_API_AI` — cờ,
 * không phải khoá. Guard này canh ba điều mà nếu trôi thì lỗi quay lại im lặng:
 *
 *   1. chỉ bản Vercel (có `api/`) bật cờ;
 *   2. bản GitHub Pages không bật cờ — nếu bật, nó hứa AI mà không có máy chủ;
 *   3. ví kiểm cờ TRƯỚC khi dò, nên bản không có máy chủ không bắn request 404 nào.
 */
const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("vercel.json bật VITE_CO_API_AI=1 — bản duy nhất đi kèm hàm server", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string };
  assert.match(v.buildCommand, /\bVITE_CO_API_AI=1\b/);
});

test("GitHub Pages KHÔNG bật cờ — bản tĩnh không được hứa AI", () => {
  const y = readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.ok(!/VITE_CO_API_AI/.test(y), "deploy.yml bật cờ AI cho một bản không có máy chủ");
});

test("ví kiểm cờ trước khi dò máy chủ AI", () => {
  const ma = boChuThich(readFileSync("apps/demo-wallet/src/App.tsx", "utf8"));
  const iCo = ma.indexOf('import.meta.env["VITE_CO_API_AI"]');
  const iDo = ma.indexOf("coAiKhong()");
  assert.ok(iCo >= 0, "App.tsx không đọc VITE_CO_API_AI");
  assert.ok(iDo > iCo, "App.tsx dò máy chủ AI trước khi kiểm cờ — bản tĩnh sẽ bắn 404");
});

test("cờ AI không mang khoá: không biến VITE_* nào chứa tên khoá API", () => {
  for (const f of ["vercel.json", ".github/workflows/deploy.yml", "apps/demo-wallet/src/App.tsx"]) {
    const s = readFileSync(f, "utf8");
    assert.ok(!/VITE_[A-Z_]*(ANTHROPIC|API_KEY|SECRET_KEY)/.test(s), `${f} đặt khoá vào biến VITE_*`);
  }
});

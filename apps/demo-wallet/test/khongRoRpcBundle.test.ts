import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/*
 * CK-01 · URL RPC riêng KHÔNG được vào bundle production.
 *
 * Codex review 27/09 tái hiện bằng khoá giả: `duPhongTheoBan(!!DEV, import.meta.env["VITE_RPC_DU_PHONG"], …)`
 * đưa khoá vào 3 file JS production dù hàm nhận không dùng tới khi `DEV` là false — Vite
 * thay chuỗi bằng giá trị thật lúc build, và chỉ cắt được khi cả nhánh `DEV ? … : …` bị loại.
 *
 * Bài đọc mã nguồn: mọi chỗ đọc `VITE_RPC…` phải đứng NGAY sau `DEV ?`.
 */
const GOC = join(import.meta.dirname, "..", "..", "..");
function tep(thuMuc: string): string[] {
  return readdirSync(thuMuc).flatMap((t) => {
    const p = join(thuMuc, t);
    return statSync(p).isDirectory() ? tep(p) : /\.(ts|tsx)$/.test(t) ? [p] : [];
  });
}
const nguon = [
  ...tep(join(GOC, "apps/demo-wallet/src")),
  ...tep(join(GOC, "apps/trang-tan-cong/src")),
  ...readdirSync(join(GOC, "scripts")).filter((t) => t.endsWith(".ts")).map((t) => join(GOC, "scripts", t)),
];

export function docKhongGuard(ma: string): string[] {
  const boChuThich = ma.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const ra: string[] = [];
  const re = /import\.meta\.env\??\.?\[\s*["'](VITE_RPC[A-Z_]*)["']\s*\]/g;
  for (const m of boChuThich.matchAll(re)) {
    const truoc = boChuThich.slice(Math.max(0, m.index! - 40), m.index);
    if (!/DEV\s*\?\s*$/.test(truoc)) ra.push(m[1]!);
  }
  return ra;
}

test("mọi chỗ đọc VITE_RPC… đứng ngay sau `DEV ?` — không URL riêng nào lọt vào bundle", () => {
  const vi: string[] = [];
  for (const f of nguon) for (const bien of docKhongGuard(readFileSync(f, "utf8"))) vi.push(`${f.slice(GOC.length + 1)}: ${bien}`);
  assert.deepEqual(vi, []);
});

test("đối chứng: guard bắt đúng dạng lỗi Codex tìm ra, và cho qua dạng đúng", () => {
  assert.deepEqual(docKhongGuard('f(!!import.meta.env.DEV, import.meta.env["VITE_RPC_DU_PHONG"], x)'), ["VITE_RPC_DU_PHONG"]);
  assert.deepEqual(docKhongGuard('f(import.meta.env?.["VITE_RPC_DU_PHONG"])'), ["VITE_RPC_DU_PHONG"]);
  assert.deepEqual(docKhongGuard('f(import.meta.env.DEV ? import.meta.env["VITE_RPC_DU_PHONG"] : undefined)'), []);
  assert.deepEqual(docKhongGuard('f(import.meta.env?.DEV ? import.meta.env["VITE_RPC"] : undefined)'), []);
});

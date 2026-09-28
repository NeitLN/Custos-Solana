import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

/*
 * TRANG CHÍNH TRÊN VERCEL = TRANG GIỚI THIỆU (chủ dự án, 28/09).
 *
 * Vercel ưu tiên tệp tĩnh `index.html` hơn `rewrites`, nên đổi ở phía trình duyệt: một đoạn
 * script đầu `index.html` chuyển GỐC TRẦN sang `gioi-thieu.html`. Không được làm vỡ:
 *   · bàn giao từ trang tấn công `/#tx=…` (URL ví = gốc + hash — `diaChiDemo.ts`),
 *   · màn thực thi `/?thucThi=1`, và `/vi`, `/index.html`,
 *   · dev server, probe và GitHub Pages (không đặt biến ⇒ không đổi gì).
 */
const html = readFileSync("apps/demo-wallet/index.html", "utf8");
const script = html.match(/<script>\s*\/\/ TRANG CHÍNH[\s\S]*?<\/script>/)?.[0];

function chay(bien: string, url: string): string | null {
  const u = new URL(url);
  let den: string | null = null;
  const location = {
    pathname: u.pathname,
    hash: u.hash,
    search: u.search,
    replace: (x: string) => {
      den = x;
    },
  };
  runInNewContext(script!.replace(/<\/?script>/g, "").replaceAll("%VITE_TRANG_CHINH%", bien), { window: { location } });
  return den;
}

test("bản Vercel: gốc trần ⇒ trang giới thiệu", () => {
  assert.ok(script, "index.html thiếu đoạn chuyển trang chính");
  assert.equal(chay("gioi-thieu", "https://custos-solana.vercel.app/"), "/gioi-thieu.html");
});

test("bản Vercel: bàn giao dApp, màn thực thi, /vi, /index.html VẪN vào ví", () => {
  for (const url of [
    "https://custos-solana.vercel.app/#tx=AQAB",
    "https://custos-solana.vercel.app/?thucThi=1",
    "https://custos-solana.vercel.app/vi",
    "https://custos-solana.vercel.app/index.html",
  ])
    assert.equal(chay("gioi-thieu", url), null, url);
});

test("không đặt biến (dev, probe, GitHub Pages) ⇒ không chuyển gì, kể cả khi Vite để nguyên chỗ giữ", () => {
  assert.equal(chay("%VITE_TRANG_CHINH%", "http://localhost:5188/"), null);
  assert.equal(chay("", "https://neitln.github.io/Custos-Solana/"), null);
});

test("chỉ bản Vercel bật biến; link tới ví trỏ thẳng index.html (không quay vòng về trang giới thiệu)", () => {
  const v = JSON.parse(readFileSync("vercel.json", "utf8")) as { buildCommand: string };
  assert.match(v.buildCommand, /VITE_TRANG_CHINH=gioi-thieu/);
  assert.doesNotMatch(readFileSync(".github/workflows/deploy.yml", "utf8"), /VITE_TRANG_CHINH/);
  assert.match(readFileSync("apps/demo-wallet/src/landing/links.ts", "utf8"), /viMau: noiBase\("index\.html"\)/);
  assert.match(readFileSync("apps/demo-wallet/src/ProductNavigation.tsx", "utf8"), /key: "demo", href: "index\.html"/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * Góp ý mentor 29/09, điểm 3: "chứng minh SDK nằm TRONG signing flow". Điều đó chỉ đúng nếu
 * dApp KHÔNG tự gọi Custos và KHÔNG mượn mã ví — nếu không thì ta lại đang chứng minh ví
 * kiểm giao dịch của chính nó (ROADMAP-SAU-MENTOR mục 1, dòng 3).
 */

const DAPP = "apps/thu-ket-noi/src";
const nguon = () =>
  readdirSync(DAPP)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => ({ f, s: readFileSync(join(DAPP, f), "utf8") }));

/** Chỉ các dòng import thật — chú thích đầu file được phép nhắc tên để giải thích. */
const imports = (s: string) => [...s.matchAll(/^\s*import\s[^;]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]!);

test("dApp thử không import mã ví, core hay ai của Custos", () => {
  for (const { f, s } of nguon())
    for (const i of imports(s)) {
      assert.ok(!/demo-wallet|trang-tan-cong|vi-du-tich-hop/.test(i), `${f} import mã ví: ${i}`);
      assert.ok(!/^@custos-solana\/(core|ai|types)/.test(i), `${f} import Custos ngoài connector: ${i}`);
    }
});

test("dApp thử không gọi inspect() — Custos chỉ chạy trong cửa sổ ví", () => {
  for (const { f, s } of nguon()) {
    const ma = s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert.ok(!/\binspect\s*\(/.test(ma), `${f} gọi inspect()`);
  }
});

test("thứ Custos duy nhất dApp dùng là registerCustosWallet", () => {
  const custos = nguon().flatMap(({ s }) => imports(s).filter((i) => i.startsWith("@custos-solana/")));
  assert.deepEqual([...new Set(custos)], ["@custos-solana/connector"]);
  assert.ok(nguon().some(({ s }) => /registerCustosWallet\(/.test(s)));
});

test("dApp thử dùng wallet-adapter chuẩn để ký và gửi", () => {
  const s = nguon().map((x) => x.s).join("\n");
  assert.match(s, /from "@solana\/wallet-adapter-react"/);
  assert.match(s, /sendTransaction\(/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * DẢI PHẠM VI BẢN DEMO — thiết kế lại 28/09 theo yêu cầu chủ dự án ("cho đẹp").
 *
 * Làm đẹp KHÔNG được làm mất lời khai: quyết định khoá số 7 và thể lệ BTC phạt trình bày sai về
 * mức hoàn thiện. Cả hai màn vẫn phải nói Devnet + không phải tài sản thật, trong một landmark có
 * tên. Và bỏ chữ chạy: CK-12 cấm chuyển động nền cạnh đoạn cảnh báo đang đọc.
 */
const doc = (p: string) => readFileSync(`apps/demo-wallet/src/${p}`, "utf8");

test("Phòng phân tích và Ví của bạn đều dùng dải phạm vi chung, vẫn khai Devnet + không tài sản thật", () => {
  for (const f of ["App.tsx", "WalletExecution.tsx"]) {
    const s = doc(f);
    const m = s.match(/<DaiPhamVi[\s\S]*?<\/DaiPhamVi>/);
    assert.ok(m, `${f} không dùng DaiPhamVi`);
    assert.match(m![0], /Devnet/, `${f}: dải không còn nói Devnet`);
    assert.match(m![0], /không (dùng tài sản thật|có giá trị tiền thật)/i, `${f}: dải không còn nói không phải tài sản thật`);
  }
});

test("dải là landmark có tên và KHÔNG còn chữ chạy (marquee)", () => {
  const c = doc("DaiPhamVi.tsx");
  assert.match(c, /<aside[^>]*aria-label=/, "dải phải là landmark có tên (axe `region`)");
  assert.doesNotMatch(doc("App.tsx"), /scope-bar__track/, "Phòng phân tích vẫn còn dải chữ chạy");
  assert.doesNotMatch(doc("style.css"), /\.dai-pham-vi[^{]*\{[^}]*animation/, "dải mới không được có animation");
});

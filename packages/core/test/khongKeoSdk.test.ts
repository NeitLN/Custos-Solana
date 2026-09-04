import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const NGUON_AI = join(GOC, "packages", "ai", "src");

/*
 * SDK ANTHROPIC KHÔNG ĐƯỢC ĐI VÀO BUNDLE TRÌNH DUYỆT.
 *
 * Đo trên bản build thật ngày 04/09: `apps/demo-wallet/dist` 654 KB, không chứa
 * chuỗi "anthropic" nào. Nó ở ngoài được vì adapter dùng `await import()` — bundler
 * cắt được nhánh đó. Đổi một dòng thành `import ... from "@anthropic-ai/sdk"` ở đầu
 * file là nó vào bundle ngay, và không có gì báo: build vẫn xanh, test vẫn xanh,
 * chỉ có bản công khai nặng thêm và mang theo code của một SDK gọi API có khoá.
 *
 * Nên bài kiểm canh đúng một điều: động thì được, TĨNH thì không.
 */
test("adapter Anthropic chỉ nạp SDK bằng import ĐỘNG", () => {
  const pham: string[] = [];
  for (const f of readdirSync(NGUON_AI).filter((x) => x.endsWith(".ts"))) {
    const src = readFileSync(join(NGUON_AI, f), "utf8");
    for (const [i, d] of src.split("\n").entries()) {
      // `import type` chỉ tồn tại lúc biên dịch, không sinh mã — không sao.
      if (/^\s*import\s+type\s/.test(d)) continue;
      if (/^\s*import\s[^(]*from\s*["']@anthropic-ai\/sdk["']/.test(d)) {
        pham.push(`packages/ai/src/${f}:${i + 1} — ${d.trim()}`);
      }
    }
  }
  assert.deepEqual(
    pham,
    [],
    "Import TĨNH kéo SDK vào bundle trình duyệt. Dùng `await import(\"@anthropic-ai/sdk\")`:\n" +
      pham.join("\n"),
  );
});

test("SDK là peer dependency TUỲ CHỌN, không phải dependency thật", () => {
  // Là `dependencies` thì mọi bên tích hợp đều phải tải SDK về, kể cả bên chỉ dùng
  // đường tất định `dienGiaiKhongAI` — tức là phần lớn.
  const p = JSON.parse(readFileSync(join(GOC, "packages/ai/package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    peerDependenciesMeta?: Record<string, { optional?: boolean }>;
    exports?: Record<string, string>;
  };
  assert.ok(!p.dependencies?.["@anthropic-ai/sdk"], "không được nằm trong `dependencies`");
  assert.ok(p.peerDependencies?.["@anthropic-ai/sdk"], "phải khai là peer dependency");
  assert.equal(p.peerDependenciesMeta?.["@anthropic-ai/sdk"]?.optional, true, "phải TUỲ CHỌN");
  // Subpath riêng để bên tích hợp nạp adapter một cách tường minh; gốc `.` giữ
  // nguyên re-export nên bản 0.1.2 đã phát hành không bị phá.
  assert.equal(p.exports?.["./anthropic"], "./src/anthropic.ts");
});

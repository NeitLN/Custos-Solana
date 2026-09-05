import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const NGUON_AI = join(GOC, "packages", "ai", "src");
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

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

test("entry mặc định KHÔNG re-export adapter Anthropic", () => {
  /*
   * Entry mặc định re-export adapter thì mọi bundler trình duyệt phải đi vào đồ thị
   * của `@anthropic-ai/sdk` để biết nó không cần. Vite in ra hàng loạt cảnh báo
   * `Module "node:fs" has been externalized` — đo được trên bản build thật.
   *
   * Bundle cuối vẫn không chứa SDK, nhưng mỗi bên tích hợp dùng bundler khác sẽ tự
   * phát hiện lại chuyện này. Một gói bảo mật không nên bắt người dùng chứng minh
   * giúp mình rằng thứ họ không cần thì không bị kéo vào.
   */
  const s = doc("packages/ai/src/index.ts");
  assert.doesNotMatch(
    s,
    /^export \{[^}]*dungGoiAnthropic/m,
    "adapter chỉ được nạp qua subpath `@custos-solana/ai/anthropic`",
  );
  const p = JSON.parse(doc("packages/ai/package.json")) as { exports?: Record<string, string> };
  assert.equal(p.exports?.["./anthropic"], "./src/anthropic.ts", "subpath phải còn");
});

test("bỏ đường import cũ thì version phải báo breaking", () => {
  // 0.1.2 trên registry CÓ đường import từ gốc. Bỏ nó mà giữ patch version là lén
  // đổi public API — người cài `^0.1.2` sẽ vỡ mà không có cảnh báo nào.
  const v = (JSON.parse(doc("packages/ai/package.json")) as { version: string }).version;
  const [chinh, phu] = v.split(".").map(Number) as [number, number];
  assert.ok(chinh > 0 || phu >= 2, `version ${v} chưa phản ánh breaking change (cần ≥ 0.2.0)`);
  assert.match(doc("packages/ai/README.md"), /Breaking change ở 0\.2\.0/, "phải có ghi chú chuyển đổi");
});

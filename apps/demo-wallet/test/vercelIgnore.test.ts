import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * Vercel CLI KHÔNG đọc `.gitignore` — chỉ `.vercelignore`. Bản trước loại `.env*` nhưng quên
 * `.devnet/`, nên `vercel deploy` từ máy dev đẩy khoá riêng của ví demo vào nguồn deployment
 * (28/09). Mọi thứ `.gitignore` giữ lại vì là BÍ MẬT phải có mặt ở đây.
 */
const dong = (p: string) =>
  readFileSync(p, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("#"));

test(".vercelignore loại MỌI thứ bí mật mà .gitignore loại (khoá ví, biến môi trường)", () => {
  const vi = new Set(dong(".vercelignore").map((s) => s.replace(/\/$/, "")));
  // Dòng `!` là NGOẠI LỆ được phép commit (`!.env.example`) — không phải bí mật.
  const bimat = dong(".gitignore").filter((s) => !s.startsWith("!") && /devnet|\.env|keypair|\.pem|secret|id\.json/i.test(s));
  assert.ok(bimat.length > 0, ".gitignore không còn khai thư mục bí mật nào — bài này mất căn cứ");
  for (const s of bimat) {
    const goc = s.replace(/\/$/, "").replace(/^\//, "");
    // `.env.local` được phủ bởi `.env.*`; `.devnet/` bởi `.devnet`.
    const phu = vi.has(goc) || (goc.startsWith(".env") && (vi.has(".env.*") || vi.has(".env*")));
    assert.ok(phu, `.vercelignore thiếu "${s}" — Vercel CLI sẽ tải nó lên`);
  }
  assert.ok(vi.has(".devnet"), "khoá ví demo phải bị loại khỏi lượt tải lên Vercel");
});

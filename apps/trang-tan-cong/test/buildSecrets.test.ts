import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function scan(source: string) {
  const dir = mkdtempSync(join(tmpdir(), "custos-scan-"));
  try {
    writeFileSync(join(dir, "bundle.js"), source);
    return spawnSync(process.execPath, ["scripts/soi-ro-ri-khoa.mjs", dir], { encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("scanner accepts published QR tables and Google Fonts URL used by wallet-adapter", () => {
  const qr = readFileSync("node_modules/qrcode/lib/core/error-correction-code.js", "utf8");
  const result = scan(qr + '\nconst font="https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900;1,100..900&display=swap";');
  assert.equal(result.status, 0, result.stderr);
});

test("scanner still rejects unknown byte arrays even AFTER an allowed QR table", () => {
  const qr = readFileSync("node_modules/qrcode/lib/core/error-correction-code.js", "utf8");
  const result = scan(qr + `\nconst leaked=[${Array.from({ length: 64 }, (_, i) => i + 1).join(",")}];`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /mảng 64 số/);
});

test("scanner rejects credentials in URL authority, without printing the secret", () => {
  const result = scan('const rpc="https://demo:fake-password-123@example.invalid/devnet";');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /URL có nhúng mật khẩu/);
  assert.doesNotMatch(result.stderr, /fake-password-123/);
});

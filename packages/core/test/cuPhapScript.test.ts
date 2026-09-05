import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const NL = String.fromCharCode(10);

/*
 * SCRIPT HỎNG CÚ PHÁP VẪN QUA ĐƯỢC `npm run check`. ĐÃ XẢY RA.
 *
 * `scripts/thu-tich-hop.mjs` bị commit với một chuỗi xuống dòng thật nằm giữa dấu
 * nháy — `.split("<newline>")` — và cả bộ 377 test vẫn xanh. Lý do đơn giản: `tsc`
 * không đụng tới `.mjs`/`.cjs`, và không bài test nào NẠP các script đó; bài kiểm
 * cấu trúc chỉ đọc chúng như văn bản.
 *
 * Nên `npm run check` chỉ nói được "mã TypeScript hợp lệ", trong khi người ta đọc
 * nó thành "mọi thứ trong repo chạy được". Khoảng cách giữa hai câu đó vừa nuốt
 * trọn một commit.
 *
 * `node --check` phân tích cú pháp mà KHÔNG chạy — đúng thứ cần ở đây, vì chạy
 * `thu-tich-hop.mjs` trong bộ test là gọi mạng Devnet.
 */
test("mọi script .mjs/.cjs đều phân tích cú pháp được", () => {
  const thuMuc = join(GOC, "scripts");
  const file = readdirSync(thuMuc).filter((f) => f.endsWith(".mjs") || f.endsWith(".cjs"));
  assert.ok(file.length > 0, "không tìm thấy script nào — đường dẫn sai?");

  const hong: string[] = [];
  for (const f of file) {
    const r = spawnSync(process.execPath, ["--check", join(thuMuc, f)], { encoding: "utf8" });
    if (r.status !== 0) {
      hong.push(`${f}: ${(r.stderr ?? "").trim().split(NL).slice(0, 3).join(" | ")}`);
    }
  }

  assert.deepEqual(hong, [], `script không nạp được:${NL}${hong.join(NL)}`);
});

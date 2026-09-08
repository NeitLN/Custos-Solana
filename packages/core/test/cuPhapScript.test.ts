import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
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

/*
 * BỘ TEST KHÔNG ĐƯỢC PHỤ THUỘC CÔNG CỤ NGOÀI CÓ THỂ THIẾU.
 *
 * Guard deck từng gọi `unzip` qua tiến trình con. Trên Linux — nơi CI chạy — nó luôn
 * có, nên lỗi không bao giờ lộ. Trên PowerShell sạch, nó ném `ENOENT` và bài kiểm ĐỎ
 * dù deck hoàn toàn đúng: 402/403.
 *
 * Thiếu công cụ và sản phẩm sai phải cho ra hai kết quả khác nhau. Một bộ test đỏ vì
 * máy người ta thiếu tiện ích sẽ dạy họ bỏ qua màu đỏ.
 *
 * Kiểm CÁCH GỌI, không kiểm từ khoá: chú thích trong `artifactNopBai.test.ts` kể lại
 * chính lỗi này và có nhắc tên công cụ. Một guard bắt cả lời kể sẽ ép người ta xoá
 * lời kể.
 */
test("không bài test nào gọi công cụ giải nén ngoài", () => {
  const thuMuc = join(GOC, "packages/core/test");
  const pham: string[] = [];

  for (const f of readdirSync(thuMuc).filter((x) => x.endsWith(".ts"))) {
    const s = readFileSync(join(thuMuc, f), "utf8");
    for (const cong of ["unzip", "tar", "7z"]) {
      // Chỉ bắt khi nó là ĐỐI SỐ ĐẦU của một lời gọi tiến trình con.
      const mau = new RegExp(`(execFileSync|spawnSync|execSync)\\(\\s*["'\`]${cong}["'\`]`);
      if (mau.test(s)) pham.push(`${f}: gọi \`${cong}\``);
    }
  }

  assert.deepEqual(
    pham,
    [],
    `bộ test gọi công cụ ngoài — máy thiếu nó sẽ đỏ oan:${NL}${pham.join(NL)}` +
      `${NL}Đọc ZIP bằng \`scripts/docZip.ts\` (node:zlib), không cần tiến trình con.`,
  );
});

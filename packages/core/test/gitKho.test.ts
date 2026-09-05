import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { commitCoThat, khoNongCan } from "./gitKho.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

/*
 * BÀI NÀY DỰNG LẠI ĐÚNG THỨ CI LÀM.
 *
 * `actions/checkout@v4` mặc định `fetch-depth: 1`. Guard "release notes ghi một SHA
 * có thật" hỏi `git cat-file` về commit cha — trong kho nông cạn commit đó chưa được
 * tải về, nên câu trả lời là "không có thật", và CI đỏ vì một lý do KHÔNG AI SỬA
 * ĐƯỢC bằng cách sửa repo. Nó đã đỏ thật một lượt.
 *
 * Nên bài kiểm này không đọc code — nó `git clone --depth 1` thật rồi hỏi lại.
 */
test("kho nông cạn trả về `null` (không kiểm được), không phải `false`", () => {
  let cha: string;
  try {
    cha = execFileSync("git", ["rev-parse", "HEAD~1"], { cwd: GOC, encoding: "utf8" }).trim();
  } catch {
    return; // repo mới, chưa có commit cha — không có gì để kiểm
  }

  const san = mkdtempSync(join(tmpdir(), "custos-nongcan-"));
  try {
    execFileSync("git", ["clone", "--quiet", "--depth", "1", `file://${GOC}`, san], {
      stdio: "ignore",
    });

    assert.equal(khoNongCan(san), true, "bản clone --depth 1 phải được nhận là nông cạn");
    assert.equal(
      commitCoThat(cha, san),
      null,
      "trong kho nông cạn, commit cha là KHÔNG KIỂM ĐƯỢC — gọi nó là `false` chính là chỗ CI đỏ oan",
    );
  } catch (e) {
    // Không clone được (git thiếu, sandbox chặn file://) thì bỏ qua, đừng đỏ oan —
    // đúng bài học mà chính bài kiểm này tồn tại để giữ.
    if (!/clone|ENOENT|not found/i.test(String(e))) throw e;
  } finally {
    rmSync(san, { recursive: true, force: true });
  }
});

test("kho đầy đủ vẫn phân biệt được commit thật và commit bịa", () => {
  if (khoNongCan(GOC)) return; // chính CI chạy bài này trong kho nông cạn

  const day = execFileSync("git", ["rev-parse", "HEAD"], { cwd: GOC, encoding: "utf8" }).trim();
  assert.equal(commitCoThat(day, GOC), true, "HEAD phải là commit có thật");
  assert.equal(
    commitCoThat("0".repeat(40), GOC),
    false,
    "SHA bịa phải là `false` — nếu thành `null` thì guard mất hết tác dụng",
  );
});

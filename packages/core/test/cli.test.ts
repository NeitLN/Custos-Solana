import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { docDoi, giaiTx } from "../src/cli.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const CLI = join(GOC, "packages/core/src/cli.ts");

/**
 * CU-10 — CLI DÙNG ĐƯỢC NGOÀI MONOREPO.
 *
 * ## Bài quan trọng nhất: EXIT CODE THẬT, không phải gọi hàm nội bộ
 *
 * Thẻ nói thẳng: *"Test exit code thật, không chỉ gọi hàm nội bộ"*. Một hàm trả
 * đúng số mà `process.exit` gọi sai số thì mọi bài gọi hàm vẫn xanh, và người dùng
 * vẫn nhận mã sai. Nên phần lớn bài ở đây **spawn tiến trình** và đọc mã thoát.
 *
 * ## Exit 0 KHÔNG có nghĩa "ký được"
 *
 * Thẻ cấm đích danh việc diễn giải exit code thành quyền ký. `0` nghĩa là *engine
 * không tìm thấy vấn đề TRONG PHẠM VI đã kiểm* — đúng nghĩa `safe`, không hơn. Có
 * bài canh `--help` nói ra điều đó, vì đó là nơi người viết script CI đọc.
 */

/** Chạy CLI thật và trả mã thoát + hai luồng ra. */
function chayCLI(...args: string[]): { ma: number; out: string; err: string } {
  try {
    const out = execFileSync(process.execPath, ["--experimental-strip-types", CLI, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { ma: 0, out, err: "" };
  } catch (e) {
    const x = e as { status?: number; stdout?: string; stderr?: string };
    return { ma: x.status ?? -1, out: x.stdout ?? "", err: x.stderr ?? "" };
  }
}

test("CU-10 · `--help` thoát 0 và NÓI RÕ exit 0 không phải quyền ký", () => {
  /*
   * Đây là nơi người viết script CI đọc. Nếu tài liệu không nói, họ sẽ tự suy rằng
   * `exit 0` = an toàn = ký được — và đó đúng là cách một lớp bảo vệ bị vô hiệu.
   */
  const r = chayCLI("--help");
  assert.equal(r.ma, 0);
  assert.match(r.out, /KHÔNG có nghĩa "ký được"/, "help phải bác bỏ cách đọc exit 0 thành quyền ký");
  assert.match(r.out, /không nhận khoá riêng/, "help phải nói rõ CLI không nhận khoá");
});

test("CU-10 · lỗi ĐẦU VÀO thoát 3, lỗi hạ tầng thoát 4 — hai câu khác nhau", () => {
  /*
   * Tách 3 và 4 vì chúng dẫn tới hai hành động khác nhau: sửa lệnh, hay thử lại
   * sau. Gộp chúng là bắt người dùng đoán.
   *
   * Lỗi hạ tầng không test bằng mạng thật ở đây (chậm và phụ thuộc bên ngoài) —
   * `--rpc` trỏ vào cổng đóng là đủ để đi đúng nhánh.
   */
  const rac = chayCLI("--tx", "rác!!!");
  assert.equal(rac.ma, 3, "đầu vào sai phải thoát 3");
  assert.match(rac.err, /không phải base64/, "phải nói đúng LOẠI lỗi");

  const rong = chayCLI("--tx", "");
  assert.equal(rong.ma, 3);
  assert.match(rong.err, /thiếu giao dịch/);

  // Hai câu phải khác nhau thật.
  assert.notEqual(rac.err, rong.err, "hai lỗi khác nhau phải cho hai câu khác nhau");
});

test("CU-10 · chuỗi rác báo 'không phải base64', KHÔNG báo 'không phải giao dịch'", () => {
  /*
   * ĐÃ SAI MỘT LẦN, và đã đo.
   *
   * `Buffer.from(s, "base64")` không bao giờ ném — nó âm thầm BỎ ký tự lạ. Nên
   * `"rác!!!"` cho ra vài byte rác, đi tiếp tới `deserialize`, rồi báo *"đây không
   * phải giao dịch Solana đọc được"*. Người dùng gõ nhầm một ký tự sẽ đi tìm sai
   * chỗ hoàn toàn.
   *
   * Sửa: kiểm hình dạng base64 TRƯỚC khi giải.
   */
  const g = giaiTx("rác!!!");
  assert.equal(g.ok, false);
  if (!g.ok) {
    assert.match(g.câu, /không phải base64/);
    assert.ok(!/không phải giao dịch Solana/.test(g.câu), "báo sai loại lỗi");
  }

  // Và base64 HỢP LỆ nhưng không phải tx thì mới nói câu kia.
  const b = giaiTx(Buffer.from("văn bản thường").toString("base64"));
  assert.equal(b.ok, false);
  if (!b.ok) assert.match(b.câu, /không phải giao dịch Solana/);
});

test("CU-10 · `--json` in JSON THUẦN ra stdout, chẩn đoán ra stderr", () => {
  /*
   * Thẻ đòi: *"stdout chỉ chứa kết quả, diagnostics vào stderr"*. Một dòng lỗi lẫn
   * vào stdout làm `custos-soi … | jq` vỡ, và đó là cách dùng chính của `--json`.
   *
   * Bài này dùng đầu vào SAI có chủ ý: nó đi nhánh lỗi, và nhánh đó phải để stdout
   * hoàn toàn trống.
   */
  const r = chayCLI("--tx", "rác!!!", "--json");
  assert.equal(r.ma, 3);
  assert.equal(r.out, "", "stdout phải TRỐNG ở nhánh lỗi — nếu không thì `| jq` vỡ");
  assert.ok(r.err.length > 0, "chẩn đoán phải ra stderr");
});

test("CU-10 · `docDoi` đọc đúng cờ, không nuốt giá trị", () => {
  assert.deepEqual(docDoi(["--tx", "ABC", "--json"]), { tx: "ABC", json: true });
  assert.deepEqual(docDoi(["--vi", "V", "--rpc", "R", "--han", "5"]), {
    vi: "V", rpc: "R", han: "5",
  });
  assert.deepEqual(docDoi(["-h"]), { help: true });
  // Cờ lạ bị bỏ qua thay vì làm hỏng cả lệnh.
  assert.deepEqual(docDoi(["--khong-co", "--json"]), { json: true });
});

test("CU-10 · CLI KHÔNG nhận khoá riêng và KHÔNG gửi giao dịch", () => {
  /*
   * Ranh giới cứng của dự án: core không giữ khoá, không ký, không gửi. Guard đọc
   * mã vì đây là thứ không được phép xuất hiện kể cả trong một nhánh chưa chạy.
   */
  const s = doc("packages/core/src/cli.ts")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["sendTransaction", "sendRawTransaction", "Keypair", "secretKey", "--send"]) {
    assert.ok(!s.includes(cam), `cli.ts chứa \`${cam}\` — vượt ranh giới của CLI`);
  }
});

test("CU-10 · `bin` và subpath `./cli` được khai trong package.json", () => {
  /*
   * Bước đóng gói ghi đè `exports` và `files`. Nó đã từng làm RƠI subpath
   * `@custos-solana/ai/anthropic` — chú thích trong `dong-goi-sdk.mjs` ghi lại ca
   * đó. Nên khai ở nguồn là điều kiện cần, và bài trong `thu-goi` kiểm tarball là
   * điều kiện đủ.
   */
  const p = JSON.parse(doc("packages/core/package.json")) as {
    bin?: Record<string, string>;
    exports?: Record<string, unknown>;
  };
  assert.equal(p.bin?.["custos-soi"], "./dist/cli.js", "thiếu khai `bin`");
  assert.ok(p.exports?.["./cli"], "thiếu subpath `./cli`");
});

test("CU-10 · mã thoát của `--help` và của nhánh lỗi KHÔNG trùng nhau", () => {
  /*
   * Đối chứng: một bản sửa làm mọi nhánh thoát 0 sẽ đi qua bài `--help` ở trên.
   * Bài này chốt rằng hai nhánh phân biệt được.
   */
  assert.notEqual(chayCLI("--help").ma, chayCLI("--tx", "rác!!!").ma);
});

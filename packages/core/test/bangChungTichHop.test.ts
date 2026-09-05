import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { docBangChungTichHop, thoiDiem } from "../../../scripts/bangChungTichHop.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const NL = String.fromCharCode(10);

/*
 * BÀI KIỂM CHO LỖI BẰNG CHỨNG PHÁT HÀNH.
 *
 * Harness cũ dùng `execFileSync`. `vi-du-tich-hop/src/chay.js` in JSON kết quả rồi
 * mới `process.exit(1)`, nên khi có check đỏ, `execFileSync` NÉM ngay — payload trên
 * stdout bị vứt và `writeFileSync` cuối script không bao giờ chạy.
 *
 * Hậu quả đã tái lập được: chèn một check đỏ cố ý, harness thoát 1, và
 * `data/tich-hop/ket-qua.json` không đổi một byte — vẫn `dat: true` của lượt hôm
 * trước. `npm run nop-bai` đọc file đó rồi in ra dấu ✓ cho tích hợp.
 *
 * Một bản đỏ làm hệ thống trông xanh là lỗi tệ hơn chính bản đỏ.
 */

function sanFixture(noiDung: unknown): string {
  const san = mkdtempSync(join(tmpdir(), "custos-bc-"));
  mkdirSync(join(san, "data", "tich-hop"), { recursive: true });
  writeFileSync(join(san, "data/tich-hop/ket-qua.json"), JSON.stringify(noiDung, null, 2));
  return san;
}

test("lượt gần nhất HỎNG không được đọc thành lượt pass cũ", () => {
  const san = sanFixture({
    schemaVersion: 2,
    doiTac: null,
    lastAttempt: {
      dat: false,
      failureCategory: "assertion_failure",
      loi: "1 kiểm tra không đạt",
      finishedAt: "2026-09-06T10:00:00.000Z",
      kiem: [{ ten: "x", dat: false, chiTiet: "hỏng" }],
    },
    lastSuccessful: {
      dat: true,
      finishedAt: "2026-09-05T18:44:42.659Z",
      msDenKetQuaDauTien: 9900,
      msMotLuotKiem: 595,
      dongMaTichHop: 29,
    },
  });
  try {
    const bc = docBangChungTichHop(san);
    assert.equal(bc?.lanGanNhat?.dat, false, "trạng thái hiện tại phải là HỎNG");
    assert.equal(bc?.lanGanNhat?.failureCategory, "assertion_failure");
    // Lượt pass cũ VẪN được giữ — nó là dữ liệu thật, chỉ không phải trạng thái.
    assert.equal(bc?.lanPassGanNhat?.dat, true, "không được xoá lượt pass cũ");
    assert.equal(thoiDiem(bc!.lanPassGanNhat), "2026-09-05T18:44:42.659Z");
  } finally {
    rmSync(san, { recursive: true, force: true });
  }
});

test("schema v1 tự khai là v1, để cổng tạo tag từ chối", () => {
  const san = sanFixture({ dat: true, doLuc: "2026-09-05T17:17:06.143Z", doiTac: null, kiem: [] });
  try {
    const bc = docBangChungTichHop(san);
    // v1 không có chỗ ghi lượt hỏng, nên đọc được nó không có nghĩa là tin được nó.
    assert.equal(bc?.schemaVersion, 1, "phải nói thật rằng đây là schema cũ");
    assert.equal(bc?.lanPassGanNhat?.dat, true, "vẫn giữ được lượt pass đã đo");
  } finally {
    rmSync(san, { recursive: true, force: true });
  }
});

test("thiếu file hoặc file hỏng trả `null`, không ném", () => {
  const san = mkdtempSync(join(tmpdir(), "custos-bc-trong-"));
  try {
    assert.equal(docBangChungTichHop(san), null, "thiếu file thì `null`");
    mkdirSync(join(san, "data", "tich-hop"), { recursive: true });
    writeFileSync(join(san, "data/tich-hop/ket-qua.json"), "{ hỏng");
    assert.equal(docBangChungTichHop(san), null, "JSON hỏng thì `null`, không ném");
  } finally {
    rmSync(san, { recursive: true, force: true });
  }
});

/*
 * GUARD CẤU TRÚC CHO CHÍNH HARNESS.
 *
 * Ba bài trên kiểm người ĐỌC bằng chứng. Bài này kiểm người GHI: nếu ai đó đưa
 * `execFileSync` trở lại, hoặc chuyển lệnh ghi file vào trong `try`, thì lỗi cũ
 * quay lại nguyên vẹn và ba bài trên vẫn xanh.
 */
test("harness tích hợp không dùng execFileSync và luôn ghi bằng chứng", () => {
  const s = doc("scripts/thu-tich-hop.mjs");

  // Hỏi CÁCH DÙNG, không hỏi từ khoá: chú thích ở đầu harness kể lại lỗi cũ và có
  // nhắc tên hàm. Một guard bắt cả lời kể sẽ ép người ta xoá lời kể.
  assert.doesNotMatch(
    s,
    /execFileSync\s*\(|import\s*\{[^}]*\bexecFileSync\b/,
    "`execFileSync` ném khi child thoát khác 0, và payload kết quả nằm trên stdout của chính lượt đó",
  );
  assert.match(s, /spawnSync/, "phải dùng `spawnSync` để đọc được stdout của lượt hỏng");

  // Lệnh ghi phải nằm SAU khối try/catch, không nằm trong nhánh thành công.
  const iCatch = s.indexOf("} catch (e) {");
  const iGhi = s.indexOf("writeFileSync(join(GOC, KQ)");
  assert.ok(iCatch !== -1 && iGhi > iCatch, "ghi bằng chứng phải nằm sau khối bắt lỗi");

  assert.match(s, /lastAttempt: luot/, "`lastAttempt` phải là lượt vừa chạy");
  assert.match(
    s,
    /lastSuccessful: luot\.dat \? luot : nenCu\(\)/,
    "`lastSuccessful` chỉ được cập nhật khi lượt này PASS",
  );
});

/*
 * SINH SỐ LIỆU KHÔNG ĐƯỢC LÀM BẨN CÂY KHI DỮ LIỆU KHÔNG ĐỔI.
 *
 * `sinhLuc` là dấu thời gian trình bày. Ghi nó mỗi lượt khiến `npm run so-lieu` trên
 * cây sạch luôn tạo diff, và cổng "cây làm việc sạch" đỏ vì chính lượt đo vừa chạy.
 * Người ta rồi sẽ commit một diff không mang thông tin gì chỉ để cổng xanh lại.
 *
 * Không chạy được generator trong bộ test — chính nó chạy bộ test — nên đây là guard
 * cấu trúc. Tính chất thật được kiểm bằng tay: `npm run so-lieu && git diff --exit-code`
 * hai lượt liên tiếp.
 */
test("bộ sinh số liệu so nội dung trước khi ghi", () => {
  const s = doc("scripts/tao-so-lieu.ts");
  assert.match(s, /boSinhLuc/, "phải có phép so bỏ qua `sinhLuc`");
  assert.match(s, /if \(giongHet\)/, "giống hệt thì không được ghi lại");
  assert.doesNotMatch(
    s,
    new RegExp("^writeFileSync\\(RA, JSON\\.stringify\\(soLieu, null, 2\\)\\);$", "m"),
    "không được ghi vô điều kiện — đó là chỗ sinh ra diff giả" + NL,
  );
});

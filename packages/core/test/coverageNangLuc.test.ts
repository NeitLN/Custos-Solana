import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeCoverage, chiTietCoverage } from "../src/l1/coverage.ts";
import { VERIFIED_PROGRAMS } from "../src/constants.ts";
import type { Facts, InstructionFact } from "../src/facts.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const THU_MUC = "data/seed/facts";

/**
 * CU-07 — COVERAGE THEO NĂNG LỰC.
 *
 * `coverage.analyzed` đếm `known && decoded !== null` — hai điều kiện khác nhau gộp
 * vào một số. Đo trên corpus, 106 lệnh:
 *
 *     program quen + decode được    36
 *     program quen + CHƯA đọc hiểu  58   <- nhóm LỚN NHẤT
 *     program LẠ                    12
 *
 * 58 lệnh nhóm giữa là *"chương trình quen, lệnh này chưa đọc hiểu"* — cần thêm
 * decoder. 12 lệnh nhóm cuối là *"chương trình lạ"* — người dùng tra được địa chỉ.
 * Hai câu khác nhau, hai hành động khác nhau, và `67 %` không phân biệt được.
 */

function docFacts(p: string): Facts {
  return JSON.parse(doc(p), (_k, v) =>
    typeof v === "string" && /^\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v,
  ) as Facts;
}

function moiFixture(): string[] {
  const d = join(GOC, THU_MUC);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith(".json"));
}

function ix(p: Partial<InstructionFact>): InstructionFact {
  return {
    index: 0, programId: "P", isInner: false, parentIndex: null,
    decoded: null, fromLookupTable: false, chamTaiSanNguoiKy: false, ...p,
  } as InstructionFact;
}

/**
 * Một program CHẮC CHẮN nằm trong danh sách xác minh — lấy từ chính danh sách.
 *
 * `VERIFIED_PROGRAMS` là **Map**, không phải Set: `[...map][0]` cho `[key, value]`.
 * Bản đầu của dòng này lấy cả cặp làm program ID và bài đỏ ngay — đỏ ĐÚNG, vì
 * `Map.has(["11111…", "System"])` là `false`.
 *
 * Lấy từ danh sách thật thay vì gõ cứng một địa chỉ: gõ cứng thì ngày nào đó địa
 * chỉ bị gỡ khỏi danh sách, bài sẽ đỏ vì lý do sai.
 */
const QUEN = [...VERIFIED_PROGRAMS.keys()][0]!;
const LA = "LaHoacKhongCoTrongDanhSach1111111111111111";

test("CU-07 · ba nhóm cộng lại ĐÚNG BẰNG total — không tự làm số đẹp lên", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT.
   *
   * Thẻ cấm đích danh: *"Không làm con số coverage tăng giả nhờ đổi tên mức
   * decode"*. Phép cộng này là thứ chặn điều đó — chuyển một lệnh từ nhóm "chưa
   * đọc hiểu" sang nhóm "hiểu được" mà không thật sự decode nó sẽ làm tổng lệch.
   *
   * Chạy trên toàn corpus chứ không một ca: một bản sửa chỉ đúng với fixture đơn
   * giản sẽ lộ ra ở đây.
   */
  let daKiem = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    const ds = facts.instructions ?? [];
    const c = chiTietCoverage(ds);
    assert.equal(
      c.hieuDuoc + c.quenNhungChuaDoc + c.chuongTrinhLa,
      ds.length,
      `${f}: ba nhóm cộng lại ${c.hieuDuoc + c.quenNhungChuaDoc + c.chuongTrinhLa}, tổng lệnh ${ds.length}`,
    );
    daKiem++;
  }
  assert.ok(daKiem > 0, "không fixture nào chạy được");
});

test("CU-07 · `hieuDuoc` khớp ĐÚNG `coverage.analyzed` cũ", () => {
  /*
   * Mở rộng, không thay thế. `coverage` cũ còn nguyên trong public API và phải giữ
   * đúng nghĩa cũ — nếu hai con số lệch nhau thì consumer đọc cái nào cũng sai.
   */
  let daKiem = 0;
  for (const f of moiFixture()) {
    let facts: Facts;
    try {
      facts = docFacts(`${THU_MUC}/${f}`);
    } catch {
      continue;
    }
    const ds = facts.instructions ?? [];
    assert.equal(
      chiTietCoverage(ds).hieuDuoc,
      computeCoverage(ds).analyzed,
      `${f}: \`hieuDuoc\` lệch \`coverage.analyzed\``,
    );
    assert.equal(
      chiTietCoverage(ds).soChuongTrinhLa,
      computeCoverage(ds).unverifiedPrograms,
      `${f}: số chương trình lạ lệch \`unverifiedPrograms\``,
    );
    daKiem++;
  }
  assert.ok(daKiem > 0);
});

test("CU-07 · phân biệt 'quen nhưng chưa đọc' với 'chương trình lạ'", () => {
  /*
   * Hai câu khác nhau với người dùng:
   *   quen + chưa đọc  -> cần thêm decoder; kiểm lại cũng không ra
   *   chương trình lạ  -> tra được địa chỉ program; đó là hành động cụ thể
   *
   * Gộp chúng là nói rằng hai tình huống ấy giống nhau.
   */
  const c = chiTietCoverage([
    ix({ programId: QUEN, decoded: { kind: "transfer" } }),
    ix({ programId: QUEN, decoded: null }),
    ix({ programId: LA, decoded: null }),
  ]);
  assert.equal(c.hieuDuoc, 1);
  assert.equal(c.quenNhungChuaDoc, 1, "program quen mà chưa decode phải vào nhóm riêng");
  assert.equal(c.chuongTrinhLa, 1);
  assert.equal(c.soChuongTrinhLa, 1);
});

test("CU-07 · danh sách chương trình lạ nói rõ có CHẠM TÀI SẢN không", () => {
  /*
   * Mục 4.2: *"Danh sách chưa hiểu chỉ rõ program/instruction/account liên quan và
   * lý do"*. Một địa chỉ program mà không nói nó có chạm tiền của bạn không thì
   * người đọc không quyết định được gì.
   *
   * Và `chamTaiSan` là `true` nếu BẤT KỲ lệnh nào của program đó chạm — thận trọng
   * là hướng đúng: nói "không chạm" cho một program có chạm là nói giảm.
   */
  const cuoi = chiTietCoverage([
    ix({ programId: LA, chamTaiSanNguoiKy: false }),
    ix({ programId: LA, chamTaiSanNguoiKy: true }),
  ]);
  assert.equal(cuoi.danhSachLa.length, 1);
  assert.equal(cuoi.danhSachLa[0]!.soLenh, 2);
  assert.equal(cuoi.danhSachLa[0]!.chamTaiSan, true, "một lệnh chạm là cả program phải báo chạm");

  /*
   * VÀ LỆNH CHẠM Ở ĐẦU CŨNG PHẢI GIỮ — đây là ca đột biến đã lọt.
   *
   * Bản đầu của bài này chỉ thử lệnh chạm ở CUỐI. Đột biến đổi phép `||` thành
   * `chamTaiSan: ix.chamTaiSanNguoiKy` (chỉ lấy lệnh cuối cùng) mà bài vẫn xanh —
   * vì với thứ tự đó, lệnh cuối tình cờ đúng là lệnh chạm.
   *
   * Một guard chỉ đỏ với đúng một thứ tự đầu vào là guard nửa vời. Thử cả hai
   * chiều thì phép `||` mới thật sự được canh.
   */
  const dau = chiTietCoverage([
    ix({ programId: LA, chamTaiSanNguoiKy: true }),
    ix({ programId: LA, chamTaiSanNguoiKy: false }),
  ]);
  assert.equal(
    dau.danhSachLa[0]!.chamTaiSan,
    true,
    "lệnh chạm nằm ĐẦU cũng phải giữ — không được để lệnh sau ghi đè",
  );
});

test("CU-07 · chương trình CHẠM TÀI SẢN đứng trước trong danh sách", () => {
  // Người dùng cần nhìn thấy trước thứ chạm được vào tiền của họ.
  const KHAC = "ProgramKhac111111111111111111111111111111111";
  const c = chiTietCoverage([
    ix({ programId: LA, chamTaiSanNguoiKy: false }),
    ix({ programId: LA, chamTaiSanNguoiKy: false }),
    ix({ programId: LA, chamTaiSanNguoiKy: false }),
    ix({ programId: KHAC, chamTaiSanNguoiKy: true }),
  ]);
  assert.equal(c.danhSachLa[0]!.programId, KHAC, "chạm tài sản phải lên đầu dù ít lệnh hơn");
  assert.equal(c.danhSachLa[0]!.chamTaiSan, true);
});

test("CU-07 · KHÔNG có risk score phần trăm trong mã", () => {
  /*
   * Mục 11 cấm đích danh: *"Risk score phần trăm, nhãn 'an toàn tuyệt đối'"*. Một
   * con số 0–100 chưa hiệu chuẩn sẽ được đọc thành xác suất an toàn, và đó là điều
   * sản phẩm này tồn tại để không làm.
   */
  const s = doc("packages/core/src/l1/coverage.ts");
  for (const cam of ["riskScore", "diemRuiRo", "* 100", "/ total) * 100"]) {
    assert.ok(!s.includes(cam), `coverage.ts chứa \`${cam}\` — không được sinh risk score`);
  }
});

test("CU-07 · danh sách rỗng ⇒ mọi số bằng 0, không chia cho 0", () => {
  const c = chiTietCoverage([]);
  assert.deepEqual(
    { h: c.hieuDuoc, q: c.quenNhungChuaDoc, l: c.chuongTrinhLa, s: c.soChuongTrinhLa },
    { h: 0, q: 0, l: 0, s: 0 },
  );
  assert.deepEqual(c.danhSachLa, []);
});

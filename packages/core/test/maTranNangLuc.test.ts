import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tomTatNangLuc } from "../src/l1/nang-luc.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const MA_TRAN = "docs/MA-TRAN-NANG-LUC.md";

/**
 * CU-17 — BA BỀ MẶT CÙNG NÓI MỘT PHẠM VI.
 *
 * Thẻ đòi *"Sinh bảng hỗ trợ từ registry/contract có kiểm, không gõ riêng trong
 * UI/docs/CLI"* và *"UI, CLI và docs cùng nói một phạm vi; thêm/giảm capability làm
 * guard phát hiện lệch claim"*.
 *
 * ## Vì sao, đo được
 *
 * `docs/DAC-TA-CORE.md` từng liệt kê **6 program** đã xác minh và có **SPL Memo**.
 * Registry thật có **13 program** và **không có Memo** — sai theo cả hai hướng cùng
 * lúc: thiếu 7 cái có thật, thừa 1 cái không có.
 *
 * Không ai cố ý viết sai. Danh sách gõ tay lúc registry còn 6, rồi registry lớn lên
 * mà không ai quay lại sửa. Cùng hình dạng lỗi repo đã gặp với số test ở sáu tài
 * liệu.
 */

test("CU-17 · ma trận TỒN TẠI và mang đúng con số của registry", () => {
  /*
   * Con số đọc từ `tomTatNangLuc()` chứ không gắn cứng — gắn cứng thì mỗi lần thêm
   * decoder lại phải sửa tay hai nơi, và lần nào quên thì bài đỏ vì lý do sai.
   */
  assert.ok(existsSync(join(GOC, MA_TRAN)), `thiếu ${MA_TRAN} — chạy scripts/tao-ma-tran-nang-luc.ts`);
  const s = doc(MA_TRAN);
  const t = tomTatNangLuc();

  for (const [nhan, so] of [
    ["chương trình đọc được tên", t.soProgramDocTen],
    ["chương trình hiểu hậu quả", t.soProgramHieuHauQua],
    ["lệnh đọc được tên", t.soLenhDocTen],
    ["lệnh hiểu được hậu quả", t.soLenhHieuHauQua],
  ] as const) {
    assert.ok(
      s.includes(`**${so}**`),
      `ma trận không nói con số thật (${nhan} = ${so}) — chạy lại script sinh`,
    );
  }
});

test("CU-17 · MỌI program trong registry có mặt trong ma trận", () => {
  /*
   * Bài này bắt đúng ca đã xảy ra: registry lớn lên mà bảng không theo. Đếm không
   * đủ — phải khớp từng địa chỉ, vì một bảng đúng số nhưng sai người vẫn sai.
   */
  const s = doc(MA_TRAN);
  const thieu = tomTatNangLuc().danhSach.filter((x) => !s.includes(x.programId));
  assert.deepEqual(
    thieu.map((x) => x.programId),
    [],
    "có program trong registry mà ma trận không liệt kê",
  );
});

test("CU-17 · ma trận KHÔNG liệt kê program ngoài registry", () => {
  /*
   * Chiều ngược lại, và là chiều `docs/DAC-TA-CORE.md` đã sai: nó có *SPL Memo* trong
   * khi registry không có. Thừa một dòng là hứa một năng lực không tồn tại.
   */
  const s = doc(MA_TRAN);
  const co = new Set(tomTatNangLuc().danhSach.map((x) => x.programId));
  // Mọi chuỗi base58 dài trong bảng phải là program có thật trong registry.
  const thua = [...s.matchAll(/\|\s*`([1-9A-HJ-NP-Za-km-z]{32,44})`\s*\|/g)]
    .map((m) => m[1]!)
    .filter((p) => !co.has(p));
  assert.deepEqual(thua, [], "ma trận liệt kê program KHÔNG có trong registry");
});

test("CU-17 · ma trận tự khai là TỆP SINH RA, không sửa tay", () => {
  /*
   * Không có dòng này thì người sau sẽ sửa tay, rồi lần chạy script tiếp theo ghi
   * đè công sức của họ — và cả hai bên đều không hiểu chuyện gì xảy ra.
   */
  const s = doc(MA_TRAN);
  assert.match(s, /ĐƯỢC SINH RA/, "ma trận phải tự khai là tệp sinh");
  assert.match(s, /tao-ma-tran-nang-luc\.ts/, "phải nói rõ lệnh sinh lại");
});

test("CU-17 · `docs/DAC-TA-CORE.md` KHÔNG còn gõ tay danh sách program", () => {
  /*
   * Đây là nguồn của lệch claim. Nó phải TRỎ về ma trận, không chép lại.
   *
   * Và nó không được nhắc SPL Memo như một program đã xác minh — Memo không có
   * trong registry, và câu cũ hứa một năng lực không tồn tại.
   */
  const s = doc("docs/DAC-TA-CORE.md");
  const i = s.indexOf("Danh sách program đã xác minh");
  assert.ok(i > 0, "mất mục danh sách program");
  const khoi = s.slice(i, i + 900);
  assert.match(khoi, /MA-TRAN-NANG-LUC/, "phải trỏ về ma trận sinh ra");
  assert.ok(
    !/xác minh[^\n]*SPL Memo/.test(khoi),
    "vẫn liệt kê SPL Memo như program đã xác minh — nó không có trong registry",
  );
});

test("CU-17 · ma trận nói rõ 'known program' KHÁC 'trusted program'", () => {
  /*
   * Thẻ nhắc đích danh: *"'Known program' không có nghĩa 'trusted program'; "
   * 'instruction decoded' không có nghĩa 'risk analyzed'"*.
   *
   * Một bảng liệt kê 13 program dễ bị đọc thành "13 program này an toàn". Bảng phải
   * tự bác bỏ cách đọc đó.
   */
  const s = doc(MA_TRAN);
  assert.match(s, /đáng tin/, "ma trận phải bác bỏ cách đọc 'đã biết = đáng tin'");
  assert.match(s, /Mức năng lực mô tả \*\*Custos\*\*, không mô tả\s+giao dịch/,
    "phải nói rõ bảng mô tả Custos, không mô tả giao dịch");
});

test("CU-17 · ma trận KHÔNG dùng chữ 'hỗ trợ protocol X' trần", () => {
  /*
   * Mục 11 cấm *"decoder hàng loạt dựa vào tên protocol nổi tiếng"*. Viết "đã hỗ trợ
   * Jupiter" cạnh con số 18 lệnh là nói quá — 18 lệnh đó mới chỉ đọc được TÊN.
   */
  const s = doc(MA_TRAN);
  for (const cam of ["đã hỗ trợ Jupiter", "đã hỗ trợ Orca", "hỗ trợ đầy đủ", "hỗ trợ toàn bộ"]) {
    assert.ok(!s.includes(cam), `ma trận chứa "${cam}" — nói quá về mức hoàn thiện`);
  }
});

test("CU-17 · ma trận nói người dùng LÀM ĐƯỢC GÌ với phần chưa hỗ trợ", () => {
  /*
   * Thẻ đòi: *"Với mỗi gap, cho biết người dùng có thể làm gì"*. Một bảng chỉ nói
   * "chưa hỗ trợ" để người đọc đứng đó không biết đi đâu.
   */
  const s = doc(MA_TRAN);
  assert.match(s, /tự tra trên explorer/, "phải nói hành động cụ thể cho program không biết");
  assert.match(s, /Kiểm lại khi mạng ổn định/, "phải phân biệt thiếu TẠM THỜI với chưa hỗ trợ");
});

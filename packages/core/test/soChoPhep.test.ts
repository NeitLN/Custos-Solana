import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import { soChoPhep, soLa } from "../../../scripts/eval-ai.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const facts = (id: string) =>
  giaiDongBangFacts(readFileSync(join(GOC, `data/seed/facts/${id}.json`), "utf8"));

/**
 * BỘ ĐẾM "BỊA SỐ" — bốn lần tố oan, và đây là lần đầu nó có bài kiểm.
 *
 * Lịch sử: nó từng tố 13/33 rồi 27/33 ca trên ĐƯỜNG TẤT ĐỊNH — đường dựng câu từ
 * facts nên không thể bịa. Lượt live 12/09 tố tiếp 10 ca, trong đó **7 ca mô hình
 * nói đúng facts**.
 *
 * Không có bài kiểm nào bắt được ba lần đầu vì `soChoPhep` không export được. Giờ
 * export rồi, và mỗi lần hiệu chỉnh phải để lại một ca ở đây.
 */

/* ── VẾ 1: đừng tố oan ────────────────────────────────────────────────────── */

test("`unverifiedPrograms` là facts, không phải số bịa", () => {
  /*
   * MN-05: coverage {analyzed 1, total 4, unverifiedPrograms 2}. Prompt GỬI con số
   * 2 đó cho mô hình. Mô hình nói "2 chương trình chưa được xác minh" — đọc đúng.
   * Câu mẫu tất định không in nó ra, nên whitelist cũ không có nó.
   */
  const f = facts("MN-05");
  assert.equal(f.coverage.unverifiedPrograms, 2);
  assert.ok(soChoPhep(f, []).has("2"), "unverifiedPrograms phải nằm trong tập cho phép");
});

test("`total - analyzed` là phép trừ trên số đã cho, không phải thông tin mới", () => {
  // MN-05: 4 - 1 = 3 lệnh CHƯA đọc hiểu được. Cấm số này tức là cấm mô hình nói
  // cùng một sự thật theo chiều ngược lại với `analyzed`.
  const f = facts("MN-05");
  assert.equal(f.coverage.total - f.coverage.analyzed, 3);
  assert.ok(soChoPhep(f, []).has("3"));
});

test("bảy câu bị tố oan hôm 12/09 nay đều sạch", () => {
  /*
   * Đây là bài chống trôi ngược: ai thu hẹp whitelist lại sẽ làm bảy ca này đỏ.
   * Cặp [id, số mô hình đã nói] lấy thẳng từ `data/eval/ai-ket-qua.json` lượt đó.
   */
  for (const [id, so] of [
    ["MN-05", "2"],
    ["MN-05", "3"],
    ["MN-06", "2"],
    ["MN-06", "3"],
    ["MN-09", "3"],
    ["MN-10", "2"],
  ] as const) {
    const cho = soChoPhep(facts(id), []);
    assert.deepEqual(soLa(`Có ${so} lệnh.`, cho), [], `${id}: số ${so} vẫn bị tố oan`);
  }
});

/* ── VẾ 2: ĐỐI CHỨNG DƯƠNG — vẫn phải bắt được số sai ─────────────────────── */

test("ba số mô hình nói SAI thật vẫn bị bắt", () => {
  /*
   * ĐÂY LÀ BÀI QUAN TRỌNG NHẤT CỦA FILE.
   *
   * Cách sửa "bộ đếm tố oan" dễ nhất và tệ nhất là nới whitelist tới khi không còn
   * gì bị tố. Lúc đó bộ đếm luôn xanh và đo đúng số không. Ba ca dưới là số mô hình
   * thật đã nói sai hôm 12/09 — nếu chúng không còn đỏ thì việc nới đã đi quá.
   *
   *   MN-07: nói "10 lệnh chưa được diễn giải", facts là 12-0 = 12
   *   MN-08: nói "9 lệnh chưa đọc hiểu được", facts là 11-0 = 11
   *   MN-10: nói "4 lệnh không thể hiểu rõ", facts là 5-0 = 5
   */
  for (const [id, sai] of [
    ["MN-07", "10"],
    ["MN-08", "9"],
    ["MN-10", "4"],
  ] as const) {
    const f = facts(id);
    assert.notEqual(String(f.coverage.total - f.coverage.analyzed), sai, `${id}: tiền đề sai`);
    assert.deepEqual(
      soLa(`Có ${sai} lệnh chưa đọc hiểu được.`, soChoPhep(f, [])),
      [sai],
      `${id}: số ${sai} SAI mà không bị bắt — whitelist đã nới quá tay`,
    );
  }
});

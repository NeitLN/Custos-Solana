import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TRANG = "docs/NGHIEM-THU-VA-BAN-GIAO.md";

/**
 * BÁO CÁO BÀN GIAO — V02.
 *
 * Đây là trang duy nhất trong repo gộp cả bốn loại kết luận vào một chỗ, nên nó cũng
 * là trang dễ bị đọc thành "xong hết" nhất. Áp lực trôi ở đây chỉ đi một chiều: không
 * ai sửa "0 người mua" thành số nhỏ hơn.
 *
 * Bốn bài dưới đây canh đúng bốn điều V02 nói không được làm.
 */

test("bốn nhóm kết luận KHÔNG bị gộp làm một", () => {
  /*
   * "Sản phẩm đã kiểm" và "bằng chứng người dùng" là hai loại khác nhau, và một bảng
   * tiến độ gộp chúng lại sẽ nói sai: 473 test không bù được cho 0 cuộc phỏng vấn
   * người mua.
   */
  const s = doc(TRANG);
  for (const nhom of [
    /Sản phẩm đã kiểm/,
    /Bằng chứng người dùng \/ người mua|Bằng chứng người dùng và người mua/,
    /Hồ sơ nộp/,
    /Hành động phát hành/,
  ]) {
    assert.match(s, nhom, `thiếu nhóm kết luận: ${nhom}`);
  }
});

test("KHÔNG chấm lại điểm 6,95 của CUSTOS.md", () => {
  /*
   * `CUSTOS.md` mục 13 cấm việc này bằng đúng chữ: "tự nâng điểm cho khớp tin mới là
   * đúng thứ mục này sinh ra để chống". V02 lại đòi "chấm lại đúng rubric với căn cứ
   * mới" — hai câu đó chỉ sống chung được nếu bản mới là một ảnh chụp RIÊNG, ghi rõ
   * ngày và người chấm, và KHÔNG đụng vào con số cũ.
   *
   * Bài này canh cả hai vế: trang mới phải tự khai ranh giới, và con số 6,95 phải còn
   * nguyên trong `CUSTOS.md`.
   */
  const s = doc(TRANG);
  assert.match(s, /KHÔNG phải bản chấm lại điểm 6,95/i, "phải tự khai ranh giới");
  assert.match(doc("CUSTOS.md"), /6,95/, "con số cũ phải còn nguyên trong CUSTOS.md");
  assert.doesNotMatch(
    s,
    /điểm mới là \d|nâng lên \d[,.]\d\/10|tổng mới:? \*?\*?\d/i,
    "không được tuyên bố một con số tổng thay thế",
  );
});

test("ô trình bày được đánh dấu TẠM CHẤM", () => {
  // V02: "điểm trình bày chỉ là tạm chấm nếu chưa thấy người trình bày". Chưa ai
  // thấy đội trình bày, kể cả Claude — nên ô 20 % đó không kết luận được.
  assert.match(doc(TRANG), /TẠM CHẤM/, "ô trình bày phải ghi rõ là tạm chấm");
});

test("không hứa giải thưởng, không nâng điểm vì số lượng việc", () => {
  const s = doc(TRANG);
  assert.match(s, /Không hứa giải thưởng/i);
  assert.match(
    s,
    /không tự nâng điểm nào|Không nâng điểm vì đã làm/i,
    "phải nói rõ số việc hoàn thành không nâng điểm",
  );
  // Cụm dự đoán kết quả thi — thứ không được xuất hiện ở bất kỳ dạng nào.
  assert.doesNotMatch(s, /chắc chắn (sẽ )?(vào|đoạt|thắng)|cầm chắc giải/i);
});

test("bốn ô bằng chứng còn trống vẫn được ghi là trống", () => {
  /*
   * Bốn ô này là thứ đắt nhất và cũng dễ bị tick nhất khi hồ sơ trông đã đầy:
   * phỏng vấn người mua, bên thứ ba tích hợp, usability vòng 2, eval mô hình thật.
   */
  const s = doc(TRANG);
  assert.match(s, /Phỏng vấn người mua\*?\*? \| ❌|người mua.*\*\*0\*\*/s);
  assert.match(s, /Bên thứ ba tích hợp\*?\*? \| ❌|tích hợp.*\*\*0\*\*/s);
  assert.match(s, /Usability vòng 2.*chưa chạy/s);
  assert.match(s, /video/i, "phải nêu video còn thiếu");
});

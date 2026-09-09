import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TRANG = "docs/MO-HINH-DOANH-THU.md";

/**
 * MÔ HÌNH DOANH THU LÀ GIẢ THUYẾT — VÀ PHẢI TIẾP TỤC NÓI VẬY.
 *
 * Đây là trang dễ trôi nhất trong repo, vì áp lực trôi chỉ đi một chiều. Không ai
 * sửa "0 người mua đã hỏi" thành một con số thấp hơn; sức ép luôn là bỏ dòng đó đi
 * cho slide đỡ trống.
 *
 * B04 cho phép DONE phần mô hình giả thuyết khi chưa có phản hồi người mua, nhưng
 * kèm một điều kiện: "không được gọi là đã validate kinh doanh". Mấy bài dưới đây
 * canh đúng câu đó.
 */

test("trang doanh thu nói rõ 0 người mua đã được hỏi", () => {
  const s = doc(TRANG);
  assert.match(s, /0 cuộc trò chuyện với người mua/i, "phải nêu con số 0, không nói vòng");
  assert.match(
    s,
    /GIẢ THUYẾT, không phải mô hình đã kiểm chứng/i,
    "phải tự khai là giả thuyết ngay đầu trang",
  );
  // Cờ `s`: câu này xuống dòng giữa chừng trong markdown, và `.` không khớp `\n`
  // nếu thiếu nó. Bài kiểm đỏ vì regex của chính nó, không vì tài liệu sai.
  assert.match(s, /không được gọi.*validate/is, "phải cấm đọc thành đã validate");
});

test("mọi mức giá đều mang nhãn giả định, không có giá nào khai là nguồn", () => {
  /*
   * Neo $49 của Helius/QuickNode là NGUỒN cho câu "người mua quen trả tiền hạ tầng
   * theo tháng". Nó KHÔNG phải nguồn cho giá của Custos. Hai câu đó chỉ cách nhau
   * một bước, và bước đó là chỗ pitch chết ở vòng Q&A.
   */
  const s = doc(TRANG);
  assert.match(s, /\*\*giả định\*\*/, "bảng gói phải gắn nhãn giả định");
  assert.match(
    s,
    /không.*chứng minh gì về giá của Custos|KHÔNG.*price validation/i,
    "phải tách neo $49 khỏi giá của Custos",
  );
});

/*
 * BÀI QUAN TRỌNG NHẤT.
 *
 * Một mô hình kinh doanh không nói được nó SAI khi nào thì không kiểm được, và
 * không kiểm được thì nó là một câu chuyện. Mục điều-kiện-thất-bại là thứ đầu tiên
 * bị cắt khi ai đó dọn tài liệu cho gọn.
 */
test("mô hình nêu điều kiện chính nó KHÔNG khả thi", () => {
  const s = doc(TRANG);
  assert.match(s, /KHÔNG khả thi/i, "phải có mục điều kiện thất bại");
  // Ít nhất bốn điều kiện — một hai cái thì là trang trí, không phải phân tích.
  const muc = s.slice(s.search(/KHÔNG khả thi/i));
  const soDong = muc.split("\n").filter((d) => /^\| .+ \| .+ \|$/.test(d)).length;
  assert.ok(soDong >= 5, `chỉ có ${soDong} dòng điều kiện thất bại — quá ít để là phân tích`);
  assert.match(
    s,
    /không.*là một doanh nghiệp|Nó \*\*không\*\* là một doanh nghiệp/i,
    "phải dám nói kết luận xấu nếu điều kiện xảy ra",
  );
});

test("giấy phép MIT vẫn đúng với điều trang này dựa vào", () => {
  /*
   * Cả mô hình đứng trên một sự thật kiểm được: SDK là MIT nên KHÔNG bán được chính
   * nó. Nếu ai đó đổi licence, lập luận "chỉ bán thứ không copy được" mất chân đế —
   * và trang này sẽ nói một điều không còn đúng.
   */
  for (const p of ["packages/core/package.json", "packages/ai/package.json"]) {
    const j = JSON.parse(doc(p)) as { license?: string };
    assert.equal(j.license, "MIT", `${p}: trang doanh thu giả định MIT`);
  }
  assert.match(doc(TRANG), /MIT/, "trang phải nêu rõ ràng buộc giấy phép");
});

test("không dựng bảng giá thứ hai — biến giá chỉ ở một chỗ", () => {
  // `acvThangUsd` sống trong `do-thi-truong.ts` và có test canh căn cứ. Chép nó sang
  // markdown là tạo bản thứ hai, và hai bản thì trôi — đúng lỗi `BANG-CLAIM.md` vừa
  // dính khi tự gõ tay bốn con số.
  assert.match(doc(TRANG), /acvThangUsd/, "phải trỏ về biến trong script, không chép số");
  assert.match(doc("scripts/do-thi-truong.ts"), /acvThangUsd/, "biến giá phải còn ở script");
});

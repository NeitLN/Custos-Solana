import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const app = readFileSync(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");

/**
 * TB-C03 — RACE, KẾT QUẢ CŨ VÀ GỬI LẶP.
 *
 * Hai loại bài trong file này, và chúng trả lời hai câu khác nhau:
 *
 *   · `probe-race-c03.ts` hỏi **cơ chế có đúng không** — chạy thật, đo thật.
 *   · File này hỏi **App.tsx có nối đúng cơ chế không** — đọc mã.
 *
 * Bài đọc mã yếu hơn bài chạy thật, và tôi ghi rõ điều đó thay vì giả vờ ngược lại:
 * nó không chứng minh hành vi, nó chỉ chặn việc âm thầm tháo bản sửa ra. Bằng chứng
 * hành vi nằm ở probe và ở bài trình duyệt.
 *
 * Vì sao vẫn cần: race ở đây sinh từ ngữ nghĩa React state, không từ DOM. Render
 * `App.tsx` trong Node đòi jsdom + toàn bộ web3.js — một tầng phụ thuộc lớn cho thứ
 * mà hai dòng đọc mã đã chặn được.
 */

test("khoá gửi dùng REF, không dùng state React", () => {
  /*
   * Đây là bản sửa chính. `setState` không cập nhật closure của lượt render hiện
   * tại, nên `if (dangGui) return` — với `dangGui` dẫn xuất từ state — để lọt hai
   * lần bấm trong cùng lượt sự kiện. Probe C03-a đo được: 2 lần gửi thay vì 1.
   */
  assert.match(app, /const dangGuiRef = useRef\(false\)/, "phải có ref khoá gửi");
  assert.match(
    app,
    /if \(dangGuiRef\.current\) return;\s*\n\s*dangGuiRef\.current = true;/,
    "phải khoá NGAY khi handler nhận việc, bằng ref",
  );
  assert.doesNotMatch(
    app,
    /if \(dangGui\) return;/,
    "cổng cũ đọc state React — nó không chặn được bấm đúp",
  );
});

test("khoá gửi được nhả trong `finally`", () => {
  /*
   * Một khoá không nhả thì nút Ký chết vĩnh viễn tới khi tải lại trang — tệ hơn lỗi
   * nó chặn. `guiGiaoDich` không ném, nhưng `doSoDu()` sau đó thì có.
   */
  assert.match(app, /finally \{[\s\S]{0,400}?dangGuiRef\.current = false;/);
});

test("mỗi lượt kiểm tra có ID, và kết quả lượt cũ bị bỏ", () => {
  /*
   * Không có ID lượt thì một lượt CHẬM về sau lượt nhanh sẽ ghi đè kết quả: thẻ
   * cảnh báo thuộc lượt A, `txCho` thuộc lượt B, và nút Ký ký thứ khác với thứ
   * người dùng đang đọc. Probe C03-c.
   */
  assert.match(app, /const luotRef = useRef\(0\)/);
  assert.match(app, /const luot = \+\+luotRef\.current/, "mỗi lượt phải tăng ID");
  assert.match(app, /const conDung = \(\) => luot === luotRef\.current/);
});

test("`ketQua` và `txCho` chỉ được ghi CÙNG NHAU, sau khi kiểm lượt", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT CỦA FILE.
   *
   * `ketQua` là thẻ cảnh báo người dùng đọc; `txCho` là giao dịch nút Ký sẽ ký. Ghi
   * hai thứ đó từ một lượt đã bị thay thế là tạo ra đúng tình huống sản phẩm này
   * sinh ra để chống: **ký một thứ khác với thứ đang hiển thị**.
   */
  /*
   * Mẫu nới ra để nhận cả dòng dựng neo (TB-C06) — nhưng KHÔNG nới điều kiện.
   *
   * Bản đầu canh đúng hai `setState` liền nhau ngay sau `conDung()`. Khi C06 chèn
   * `neoRef.current = neoKetQua(...)` vào giữa, bài này đỏ — và nó đỏ ĐÚNG: mẫu cũ
   * không còn khớp. Nhưng lỗi nó canh thì chưa quay lại: cả ba dòng vẫn nằm sau
   * cùng một phép kiểm lượt, và neo mô tả đúng lượt đó.
   *
   * Nên nới mẫu, không nới điều kiện — và nới theo SỐ CÂU LỆNH, không theo số ký tự.
   *
   * Bản sửa đầu đặt trần 200 ký tự và vẫn đỏ: khoảng cách thật là **531 ký tự**, phần
   * lớn là chú thích. Đếm ký tự thì mỗi lần viết thêm một dòng giải thích lại phải
   * nới trần — một phép kiểm mà ngưỡng của nó phụ thuộc độ dài chú thích thì đo sai
   * thứ cần đo.
   *
   * Cách đúng: bỏ chú thích trước khi so, rồi đòi giữa hai mốc chỉ có **các phép gán
   * thuộc cùng lượt** — không có `await`, không có nhánh `if`, không có `return`.
   * Đó mới là điều kiện thật: không thứ gì xen vào được giữa phép kiểm lượt và hai
   * `setState`.
   */
  const ma = app.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const m = ma.match(
    /if \(!conDung\(\)\) return;([\s\S]*?)setKetQua\(r\);\s*\n\s*setTxCho\(tx\);/,
  );
  assert.ok(m, "không tìm thấy `conDung()` ngay trước hai setState");
  for (const cam of ["await", "if (", "return", "catch"]) {
    assert.ok(
      !m[1]!.includes(cam),
      `giữa phép kiểm lượt và hai setState có \`${cam}\` — lượt có thể đổi ở đó`,
    );
  }
});

test("mọi nhánh ghi state trong lượt kiểm đều qua `conDung()`", () => {
  // Gồm cả nhánh Custos-TẮT, nhánh lỗi, và cờ đang chạy. Bỏ sót một nhánh là để
  // lại đúng một đường cho kết quả cũ đi vào.
  for (const [ten, re] of [
    ["nhánh Custos-TẮT", /if \(conDung\(\)\) setHauQua\(rTat\)/],
    ["nhánh lỗi", /if \(conDung\(\)\) \{\s*\n\s*setKetQua\(null\);\s*\n\s*setLoi\(/],
    ["cờ đang chạy", /if \(conDung\(\)\) setDangChay\(false\)/],
  ] as const) {
    assert.match(app, re, `thiếu kiểm lượt ở ${ten}`);
  }
});

test("gửi xong mà lượt đã đổi thì KHÔNG dọn thẻ kết quả", () => {
  /*
   * Giao dịch đã đi thì không rút lại được, nên `gui` vẫn phản ánh kết cục thật.
   * Nhưng thẻ kết quả đang hiện thuộc lượt khác — xoá nó là xoá nhầm thứ người dùng
   * đang đọc.
   */
  assert.match(app, /if \(luot !== luotRef\.current\) return;/);
});

test("HUỶ vô hiệu lượt kiểm đang bay, không chỉ dọn màn hình", () => {
  /*
   * Lỗi lộ ra lúc làm TB-B03, khi rà ô "Gửi/xác nhận · cancel" của ma trận mục 16.
   *
   * `onHuy` bản cũ gọi `setKetQua(null)` + `setTxCho(null)` nhưng không đụng
   * `luotRef`. Nên lượt `inspect()` đang bay vẫn thoả `conDung()`, và khi về nó ghi
   * lại cả ba thứ vừa bị dọn — đo được ở `probe-race-c03.ts` ca C03-e:
   *
   *     daHuy = true, ketQua = danger, txCho = giao-dich-A, neo = luot-1
   *
   * `txCho` và `neo` là đúng hai thứ `kyVaGui` đòi trước khi cho ký, nên đây không
   * phải giao diện nhấp nháy: người dùng bấm "Chặn & huỷ" một giao dịch Đỏ, rồi nút
   * Ký sống lại trên chính giao dịch đó.
   */
  const onHuy = app.match(/onHuy=\{\(\) => \{[\s\S]*?\n\s{22}\}\}/);
  assert.ok(onHuy, "không tìm thấy handler `onHuy` trong App.tsx");
  const than = onHuy[0];

  assert.match(
    than,
    /luotRef\.current\+\+/,
    "huỷ phải vô hiệu lượt đang bay — nếu không, kết quả về muộn dựng lại thẻ đã huỷ",
  );
  assert.match(
    than,
    /neoRef\.current = null/,
    "huỷ phải xoá neo — neo còn sống nghĩa là `kyVaGui` vẫn có đủ điều kiện cho ký",
  );
  assert.match(than, /setTxCho\(null\)/, "huỷ phải dọn giao dịch chờ");
  assert.match(than, /setKetQua\(null\)/, "huỷ phải dọn thẻ kết quả");
});

test("KHÔNG hứa exactly-once trên toàn mạng", () => {
  /*
   * Thẻ C03 nói đúng chữ: "Không tuyên bố bảo đảm exactly-once trên toàn mạng".
   * Khoá này nằm trong MỘT tab của consumer demo; hai tab là hai tiến trình, và SDK
   * không kiểm soát được điều đó. Ghi ranh giới vào mã để người đọc sau không đọc
   * bản sửa mạnh hơn thực tế.
   */
  assert.match(app, /exactly-once/i, "phải ghi rõ ranh giới ngay tại chỗ khoá");
  assert.match(app, /Hai tab là hai tiến trình|MỘT tab/);
});

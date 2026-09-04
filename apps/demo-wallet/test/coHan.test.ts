import { test } from "node:test";
import assert from "node:assert/strict";
import { coHan, coHanChung, moHan, LoiQuaHan } from "../../../scripts/coHan.ts";

const cho = (ms: number, giaTri = "xong") => new Promise((g) => setTimeout(() => g(giaTri), ms));

test("xong trước hạn thì trả đúng giá trị", async () => {
  assert.equal(await coHan(cho(10, "kết quả"), 500), "kết quả");
});

test("quá hạn thì ném LoiQuaHan, không trả null", async () => {
  // Trả `null` sẽ khiến giao diện không phân biệt được "quá hạn" với "chạy xong
  // nhưng thiếu dữ liệu" — hai thứ nói với người dùng hai câu khác nhau.
  await assert.rejects(() => coHan(cho(400), 30), (e) => {
    assert.ok(e instanceof LoiQuaHan, `chờ LoiQuaHan, nhận ${String(e)}`);
    assert.match(e.message, /quá hạn/);
    return true;
  });
});

test("việc ném lỗi thì lỗi gốc đi qua nguyên vẹn, không bị đổi thành quá hạn", async () => {
  const goc = new Error("RPC từ chối");
  await assert.rejects(() => coHan(Promise.reject(goc), 500), (e) => {
    assert.equal(e, goc, "lỗi gốc bị nuốt — người dùng mất đúng thông tin cần để sửa");
    return true;
  });
});

test("dọn timer sau khi xong — không để tiến trình sống thêm", async () => {
  /*
   * Nếu `clearTimeout` bị bỏ, timer 30 giây vẫn nằm trong vòng lặp sự kiện sau khi
   * việc đã xong. Bài này đo đúng điều đó: `setTimeout` chưa dọn là một handle còn
   * hoạt động, và `process.getActiveResourcesInfo()` đếm được nó.
   */
  const truoc = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
  await coHan(cho(5), 30_000);
  const sau = process.getActiveResourcesInfo().filter((r) => r === "Timeout").length;
  assert.ok(sau <= truoc, `còn ${sau - truoc} timer sống sau khi việc đã xong`);
});

/*
 * NGÂN SÁCH CHUNG — hai chặng nối tiếp không được cấp hai lần giờ.
 *
 * Lỗi thật trong ví: nhánh Custos-TẮT gọi `coHan(…, 12_000)` hai lần liên tiếp, nên
 * người dùng chờ tới 24 giây trong khi thẻ lỗi vẫn ghi "sau 12 giây". Không test nào
 * bắt được vì mỗi lời gọi RIÊNG LẺ đều đúng — cái sai chỉ hiện ra khi cộng lại.
 */
test("hai chặng nối tiếp KHÔNG được cộng dồn thành hai ngân sách", async () => {
  // Đây chính là hình dạng lỗi trong ví: chặng 1 rồi chặng 2, mỗi chặng một hạn
  // đầy. Đo tổng thời gian trôi qua — đó là thứ người dùng thật sự chịu.
  const TONG = 300;
  const han = moHan(TONG);
  const batDau = Date.now();

  await coHanChung(new Promise((ok) => setTimeout(ok, 200)), han); // chặng 1: 200 ms
  await assert.rejects(() => coHanChung(new Promise(() => {}), han), LoiQuaHan); // chặng 2 treo

  const troiQua = Date.now() - batDau;
  assert.ok(
    troiQua < TONG * 1.7,
    `cả lượt phải bỏ cuộc quanh ${TONG} ms, thực tế ${troiQua} ms — chặng 2 được cấp ngân sách mới`,
  );
});

test("hết ngân sách thì bỏ cuộc ngay, không chờ thêm chặng nào", async () => {
  const han = moHan(-1); // đã hết trước khi chặng này bắt đầu
  const batDau = Date.now();
  await assert.rejects(() => coHanChung(new Promise(() => {}), han), LoiQuaHan);
  assert.ok(Date.now() - batDau < 50, "phải từ chối ngay, không dựng timer chờ");
});

test("lỗi quá hạn báo TỔNG thời gian chờ, không báo phần còn lại", async () => {
  // Người dùng đứng chờ cả lượt. Nói "quá hạn sau 3 giây" khi họ vừa chờ 12 giây là
  // một con số đúng về mặt kỹ thuật và sai về mặt sự thật.
  let gio = 0;
  const han = moHan(12_000, () => gio);
  gio = 11_950; // còn 50 ms
  const e = await coHanChung(new Promise(() => {}), han).catch((x: unknown) => x);
  assert.ok(e instanceof LoiQuaHan);
  assert.equal(e.ms, 12_000, "phải là tổng ngân sách, không phải 50");
});

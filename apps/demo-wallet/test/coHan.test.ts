import { test } from "node:test";
import assert from "node:assert/strict";
import { coHan, LoiQuaHan } from "../../../scripts/coHan.ts";

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

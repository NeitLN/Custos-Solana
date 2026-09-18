import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { dungGoiQuaServer, coAiKhong, ChuaCauHinhAI } from "../src/goiAiQuaServer.ts";

/**
 * ĐƯỜNG GỌI AI QUA SERVER — phía trình duyệt.
 *
 * Điều cần chứng minh: client phân biệt được BA ca mà mắt thường dễ gộp làm một —
 * "chưa cấu hình", "gọi hỏng", và "không có hàm server". Gộp chúng lại thì giao
 * diện nói sai với người xem về việc sản phẩm có đang chạy AI hay không.
 */

const fetchGoc = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchGoc;
});

test("server trả 503 ⇒ ném ChuaCauHinhAI, phân biệt được với lỗi thường", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ loi: "CHUA_CAU_HINH" }), { status: 503 })) as typeof fetch;

  await assert.rejects(
    () => dungGoiQuaServer()({ system: "s", user: "u" }),
    (e: Error) => e.name === "ChuaCauHinhAI",
  );
});

test("server trả chữ ⇒ trả đúng chuỗi đó", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ chu: "câu giải thích" }), { status: 200 })) as typeof fetch;

  assert.equal(await dungGoiQuaServer()({ system: "s", user: "u" }), "câu giải thích");
});

test("server trả chuỗi rỗng ⇒ ném, không trả câu rỗng cho người dùng", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ chu: "" }), { status: 200 })) as typeof fetch;

  await assert.rejects(() => dungGoiQuaServer()({ system: "s", user: "u" }));
});

test("usage được chuyển tiếp tới ghiNhanDung — để đo token thật, không ước lượng", async () => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ chu: "x", usage: { input_tokens: 7 } }), {
      status: 200,
    })) as typeof fetch;

  let thay: unknown = null;
  await dungGoiQuaServer({ ghiNhanDung: (u) => (thay = u) })({ system: "s", user: "u" });
  assert.deepEqual(thay, { input_tokens: 7 });
});

/**
 * 404 LÀ CA THẬT, và nó phải trả `false` VÌ ĐỌC MÃ, không vì rơi vào `catch`.
 *
 * Đo được trên trình duyệt: `vite dev` phục vụ tệp tĩnh nên `/api/dien-giai` trả
 * 404. Bản trước trả đúng `false` nhưng qua nhánh `r.ok === false` — đúng vì may,
 * và một nhánh đúng-vì-may sẽ sai ở lần sửa sau.
 */
test("coAiKhong: 404 ⇒ false, 503 ⇒ false, 400 ⇒ true", async () => {
  const dat = (status: number) => {
    globalThis.fetch = (async () => new Response("{}", { status })) as typeof fetch;
  };

  // Mỗi ca một đường dẫn khác nhau — `coAiKhong` giữ kết quả theo đường dẫn.
  dat(404);
  assert.equal(await coAiKhong("/a-404"), false);
  dat(503);
  assert.equal(await coAiKhong("/a-503"), false);
  dat(400);
  assert.equal(await coAiKhong("/a-400"), true, "400 nghĩa là server ĐÃ qua chốt khoá");
});

/**
 * DÒ ĐÚNG MỘT LẦN — hồi quy cho lỗi đo được trên trình duyệt.
 *
 * Probe Playwright thấy `/api/dien-giai` bị gọi HAI lần mỗi lần mở trang: StrictMode
 * chạy effect hai lượt, và cờ `huy` trong cleanup chỉ chặn `setState`, không rút lại
 * request đã bay đi. Sau khi giữ lời hứa lại, đo lại còn đúng một lượt.
 */
test("coAiKhong chỉ gọi mạng một lần cho mỗi đường dẫn", async () => {
  let soLuot = 0;
  globalThis.fetch = (async () => {
    soLuot++;
    return new Response("{}", { status: 400 });
  }) as typeof fetch;

  const duong = "/a-mot-lan";
  const [a, b, c] = await Promise.all([coAiKhong(duong), coAiKhong(duong), coAiKhong(duong)]);

  assert.equal(soLuot, 1, `gọi ${soLuot} lượt cho cùng một đường dẫn`);
  assert.deepEqual([a, b, c], [true, true, true]);
});

test("ChuaCauHinhAI xuất ra được để bên ngoài bắt theo kiểu", () => {
  assert.equal(new ChuaCauHinhAI().name, "ChuaCauHinhAI");
});

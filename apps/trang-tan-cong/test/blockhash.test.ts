import { test } from "node:test";
import assert from "node:assert/strict";
import { conDungDuoc, layBlockhash, TUOI_TOI_DA_MS } from "../src/blockhash.ts";

const BAY_GIO = 1_000_000;

test("blockhash vừa lấy thì dùng được", () => {
  assert.equal(conDungDuoc(BAY_GIO - 1_000, BAY_GIO), true);
});

test("blockhash quá 45 giây thì KHÔNG dùng nữa", () => {
  // Đây là ca mà `setInterval` không cứu được: tab chạy nền bị bóp timer, nên cache
  // già hơn nhiều so với chu kỳ làm mới.
  assert.equal(conDungDuoc(BAY_GIO - 46_000, BAY_GIO), false);
  assert.equal(conDungDuoc(BAY_GIO - 5 * 60_000, BAY_GIO), false);
});

test("đúng mốc 45 giây thì đã hết hạn", () => {
  assert.equal(conDungDuoc(BAY_GIO - TUOI_TOI_DA_MS, BAY_GIO), false);
  assert.equal(conDungDuoc(BAY_GIO - (TUOI_TOI_DA_MS - 1), BAY_GIO), true);
});

test("đồng hồ bị chỉnh lùi thì không tin cache", () => {
  assert.equal(conDungDuoc(BAY_GIO + 10_000, BAY_GIO), false);
});

test("hạn nằm dưới đời sống thật của blockhash (~60 giây)", () => {
  // Canh chính con số: ai nới nó lên quá 60 s là đang tiến vào vùng blockhash chết.
  assert.ok(TUOI_TOI_DA_MS < 60_000, `TUOI_TOI_DA_MS=${TUOI_TOI_DA_MS} đã chạm hạn sống thật`);
});

/*
 * Bốn đường dưới đây KHÔNG bao giờ chạy trong lúc mọi thứ đang tốt. Không có test
 * thì chúng chỉ được chạy lần đầu tiên vào đúng hôm Devnet hỏng, trước giám khảo.
 */
const BAY_GIO_2 = 5_000_000;

test("cache còn hạn thì KHÔNG gọi RPC lần nào", async () => {
  let goi = 0;
  const r = await layBlockhash(
    async () => {
      goi++;
      return { blockhash: "moi" };
    },
    { ma: "cu-nhung-con-moi", luc: BAY_GIO_2 - 1_000 },
    BAY_GIO_2,
  );
  assert.equal(r.ma, "cu-nhung-con-moi");
  assert.equal(r.tuCache, true);
  assert.equal(goi, 0, "đã gọi RPC dù cache còn dùng được");
});

test("cache quá hạn thì gọi lại và trả blockhash MỚI", async () => {
  const r = await layBlockhash(
    async () => ({ blockhash: "moi-tinh" }),
    { ma: "da-chet", luc: BAY_GIO_2 - 60_000 },
    BAY_GIO_2,
  );
  assert.equal(r.ma, "moi-tinh");
  assert.equal(r.tuCache, false);
});

test("RPC treo thì DỪNG theo hạn, không chờ vô hạn", async () => {
  const t0 = Date.now();
  await assert.rejects(
    () => layBlockhash(() => new Promise(() => {}), null, BAY_GIO_2, 40),
    (e: Error) => {
      assert.equal(e.name, "LoiQuaHan", `chờ LoiQuaHan, nhận ${e.name}`);
      return true;
    },
  );
  assert.ok(Date.now() - t0 < 2_000, "không được chờ lâu hơn hạn đã đặt");
});

test("RPC ném lỗi thì lỗi gốc đi qua nguyên vẹn", async () => {
  const goc = new Error("Devnet từ chối kết nối");
  await assert.rejects(
    () => layBlockhash(() => Promise.reject(goc), null, BAY_GIO_2, 5_000),
    (e) => {
      assert.equal(e, goc, "lỗi gốc bị nuốt — mất đúng thông tin cần để sửa");
      return true;
    },
  );
});

test("KHÔNG bao giờ trả blockhash quá hạn làm đường lui khi RPC hỏng", async () => {
  // Đây là cám dỗ dễ hiểu nhất khi RPC lỗi: "thôi dùng tạm cái cũ". Làm vậy thì
  // giao dịch bị Devnet từ chối, và demo hỏng ở một chỗ khó hiểu hơn nhiều.
  await assert.rejects(
    () =>
      layBlockhash(
        () => Promise.reject(new Error("mạng hỏng")),
        { ma: "hash-da-chet", luc: BAY_GIO_2 - 120_000 },
        BAY_GIO_2,
        5_000,
      ),
    /mạng hỏng/,
  );
});

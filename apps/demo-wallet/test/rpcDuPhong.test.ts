import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchDuPhong, danhSachRpc } from "../../../scripts/rpcDuPhong.ts";

/*
 * Review 26/09, mục 3.3: `api.devnet.solana.com` ngừng trả `getAccountInfo` và
 * `getMultipleAccounts` hơn một giờ, trong khi `getBalance` vẫn trả trong 0,16 s. Mọi luồng
 * live của Custos đọc tài khoản ở mỗi lượt kiểm, nên tất cả dừng theo một endpoint.
 */

const A = "https://a.example", B = "https://b.example";
const than = (method: string) => ({ method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }) });
const ok = (url: string) => new Response(JSON.stringify({ tu: url }), { status: 200 });

function giaLap(hanhVi: Record<string, "ok" | "treo" | "429" | "loi">) {
  const goi: string[] = [];
  const transport = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); goi.push(url);
    const kieu = hanhVi[url];
    if (kieu === "429") return new Response("{}", { status: 429 });
    if (kieu === "loi") throw new TypeError("fetch failed");
    if (kieu === "treo") {
      return new Promise<Response>((_, tuChoi) => init?.signal?.addEventListener("abort", () => tuChoi(new Error("aborted"))));
    }
    return ok(url);
  }) as typeof fetch;
  return { goi, transport };
}

test("endpoint đầu TREO khi đọc ⇒ chuyển sang endpoint kế, không chờ vô hạn", async () => {
  const g = giaLap({ [A]: "treo", [B]: "ok" });
  const f = fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport });
  const r = await f(A, than("getMultipleAccounts"));
  assert.deepEqual(await r.json(), { tu: B });
});

test("429 hoặc lỗi mạng ⇒ thử endpoint kế", async () => {
  for (const kieu of ["429", "loi"] as const) {
    const g = giaLap({ [A]: kieu, [B]: "ok" });
    const r = await fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport })(A, than("getAccountInfo"));
    assert.deepEqual(await r.json(), { tu: B }, kieu);
  }
});

test("lệnh GHI (sendTransaction) KHÔNG bao giờ được chuyển sang endpoint khác", async () => {
  // Gửi lại một giao dịch đã ký ở nơi khác sau khi quá hạn là thứ luồng ký cố ý không
  // làm (`live/rpc.ts`): người dùng phải thấy "chưa rõ đã gửi chưa", không phải một lần gửi hai.
  const g = giaLap({ [A]: "loi", [B]: "ok" });
  await assert.rejects(fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport })(A, than("sendTransaction")));
  assert.deepEqual(g.goi, [A]);
});

test("endpoint vừa trả lời tốt được ưu tiên ở lượt sau — không chờ quá hạn lần nữa", async () => {
  const g = giaLap({ [A]: "treo", [B]: "ok" });
  const f = fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport });
  await f(A, than("getAccountInfo"));
  g.goi.length = 0;
  await f(A, than("getAccountInfo"));
  assert.deepEqual(g.goi, [B], "lượt thứ hai phải đi thẳng tới B");
});

test("mọi endpoint hỏng ⇒ lỗi nổi ra, không nuốt", async () => {
  const g = giaLap({ [A]: "loi", [B]: "loi" });
  await assert.rejects(fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport })(A, than("getAccountInfo")));
});

test("MỌI endpoint trả 429 ⇒ trả lại phản hồi 429 để web3.js tự chờ và thử lại", async () => {
  const g = giaLap({ [A]: "429", [B]: "429" });
  const r = await fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport })(A, than("getAccountInfo"));
  assert.equal(r.status, 429);
});

test("danh sách endpoint: chính trước, dự phòng sau, bỏ trùng và rỗng — KHÔNG tự thêm bên thứ ba", () => {
  assert.deepEqual(danhSachRpc(A, ` ${B} , ,${A}`), [A, B]);
  assert.deepEqual(danhSachRpc(A, undefined), [A], "không khai dự phòng thì chỉ có endpoint chính");
});

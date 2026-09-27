import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchDuPhong,
  ketNoiDuPhong,
  locRpcCongKhai,
  laLoiCuaEndpoint,
  taoBoChon,
  type QuanSatRpc,
} from "../../../scripts/rpcDuPhong.ts";

/*
 * CK-01 — RPC ĐÁNG TIN Ở MỨC VẬN HÀNH, không chỉ có URL dự phòng.
 *
 * Roadmap chung kết đòi đúng những ca này, và nói thẳng "không chỉ test đổi host là
 * pass": endpoint A trả balance nhưng treo đọc account; huỷ; phản hồi đến muộn; lỗi
 * JSON-RPC trong HTTP 200; và nguồn của từng lượt đọc phải ghi được.
 */

const A = "https://a.example", B = "https://b.example";
const than = (method: string) => ({ method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }) });

type HanhVi = "ok" | "treo" | "429" | "loi" | { jsonrpc: number } | { cham: number };

/** `hanhVi[url][method]` — mỗi endpoint cư xử khác nhau THEO PHƯƠNG THỨC, như Devnet 26/09. */
function giaLap(hanhVi: Record<string, Record<string, HanhVi> | HanhVi>) {
  const goi: Array<{ url: string; method: string }> = [];
  const transport = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = JSON.parse(String(init?.body)).method as string;
    goi.push({ url, method });
    const theoUrl = hanhVi[url]!;
    const kieu: HanhVi =
      typeof theoUrl === "object" && !("jsonrpc" in theoUrl) && !("cham" in theoUrl)
        ? ((theoUrl as Record<string, HanhVi>)[method] ?? "ok")
        : (theoUrl as HanhVi);
    const choHuy = () =>
      new Promise<Response>((_, tuChoi) => init?.signal?.addEventListener("abort", () => tuChoi(new Error("aborted"))));
    if (kieu === "429") return new Response("{}", { status: 429 });
    if (kieu === "loi") throw new TypeError("fetch failed");
    if (kieu === "treo") return choHuy();
    if (typeof kieu === "object" && "jsonrpc" in kieu) {
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: kieu.jsonrpc, message: "x" } }), { status: 200 });
    }
    if (typeof kieu === "object" && "cham" in kieu) {
      // Phản hồi ĐẾN MUỘN: vẫn trả về sau `cham` ms dù đã bị huỷ — như mạng thật.
      return new Promise<Response>((xong) => setTimeout(() => xong(new Response(JSON.stringify({ tu: url, muon: true }))), kieu.cham));
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tu: url } }), { status: 200 });
  }) as typeof fetch;
  return { goi, transport };
}

test("A trả balance nhưng TREO đọc account; B sống ⇒ account đi qua B, và nguồn ghi đúng từng lượt", async () => {
  const g = giaLap({ [A]: { getAccountInfo: "treo", getMultipleAccounts: "treo" }, [B]: "ok" });
  const nhat: QuanSatRpc[] = [];
  const f = fetchDuPhong([A, B], { msMoiLuot: 40, transport: g.transport, ghiNhan: (q) => nhat.push(q) });

  const rBal = await f(A, than("getBalance"));
  assert.equal(((await rBal.json()) as { result: { tu: string } }).result.tu, A, "balance vẫn lấy từ A");
  const rAcc = await f(A, than("getAccountInfo"));
  assert.equal(((await rAcc.json()) as { result: { tu: string } }).result.tu, B, "account phải đi qua B");

  // Hai lượt đọc THÀNH CÔNG ở hai nguồn khác nhau — bên gọi phải thấy được điều đó.
  const nguonOk = new Set(nhat.filter((q) => q.ketQua === "ok").map((q) => q.nguon));
  assert.deepEqual([...nguonOk].sort(), ["a.example", "b.example"]);
  assert.ok(nhat.some((q) => q.nguon === "a.example" && q.method === "getAccountInfo" && q.ketQua === "quaHan"));
});

test("HUỶ giữa chừng ⇒ ném ngay, KHÔNG thử endpoint kế, và lượt sau bị chặn trước khi gửi", async () => {
  const g = giaLap({ [A]: "treo", [B]: "ok" });
  const ac = new AbortController();
  const nhat: QuanSatRpc[] = [];
  const f = fetchDuPhong([A, B], { msMoiLuot: 5_000, transport: g.transport, signal: ac.signal, ghiNhan: (q) => nhat.push(q) });
  const dang = f(A, than("getMultipleAccounts"));
  setTimeout(() => ac.abort(), 20);
  await assert.rejects(dang);
  assert.deepEqual(g.goi.map((x) => x.url), [A], "đã huỷ mà vẫn thử B — lượt cũ tiếp tục bắn request");
  // web3.js tự thử lại khi gặp lỗi: lượt kế phải bị chặn TRƯỚC khi chạm transport.
  await assert.rejects(f(A, than("getMultipleAccounts")), /huỷ/);
  assert.equal(g.goi.length, 1);
  assert.ok(nhat.every((q) => q.ketQua === "huy"));
});

test("phản hồi ĐẾN MUỘN sau khi huỷ không được trả về như kết quả", async () => {
  const g = giaLap({ [A]: { cham: 60 }, [B]: "ok" });
  const ac = new AbortController();
  const f = fetchDuPhong([A], { msMoiLuot: 5_000, transport: g.transport, signal: ac.signal });
  // Transport giả KHÔNG tôn trọng signal (trả muộn) — fetchDuPhong vẫn phải bảo toàn huỷ:
  // lượt đã huỷ trước khi gọi thì không gọi; lượt huỷ giữa chừng không được coi là ok.
  ac.abort();
  await assert.rejects(f(A, than("getAccountInfo")));
  assert.equal(g.goi.length, 0);

  // Ca khó: huỷ SAU khi đã gửi, transport phớt lờ signal và vẫn trả "ok" lúc 60 ms.
  const ac2 = new AbortController();
  const nhat: QuanSatRpc[] = [];
  const f2 = fetchDuPhong([A], { msMoiLuot: 5_000, transport: g.transport, signal: ac2.signal, ghiNhan: (q) => nhat.push(q) });
  const dang = f2(A, than("getAccountInfo"));
  setTimeout(() => ac2.abort(), 20);
  await assert.rejects(dang, "phản hồi đến sau khi huỷ vẫn được trả như kết quả hợp lệ");
  assert.ok(!nhat.some((q) => q.ketQua === "ok"), "lượt đã huỷ vẫn được ghi là nguồn trả lời tốt");
});

test("lỗi JSON-RPC của ENDPOINT trong HTTP 200 ⇒ chuyển; lỗi của YÊU CẦU ⇒ không chuyển", async () => {
  const gMay = giaLap({ [A]: { jsonrpc: -32005 }, [B]: "ok" });
  const r1 = await fetchDuPhong([A, B], { msMoiLuot: 50, transport: gMay.transport })(A, than("getAccountInfo"));
  assert.equal(((await r1.json()) as { result: { tu: string } }).result.tu, B, "node chậm (-32005) mà không chuyển");

  const gYeuCau = giaLap({ [A]: { jsonrpc: -32602 }, [B]: "ok" });
  const r2 = await fetchDuPhong([A, B], { msMoiLuot: 50, transport: gYeuCau.transport })(A, than("getAccountInfo"));
  assert.equal(((await r2.json()) as { error: { code: number } }).error.code, -32602);
  assert.deepEqual(gYeuCau.goi.map((x) => x.url), [A], "tham số sai thì đổi endpoint chỉ đốt thời gian");

  // Cả hai cùng lỗi endpoint ⇒ trả lại phản hồi lỗi để web3.js báo, không nuốt.
  const gCaHai = giaLap({ [A]: { jsonrpc: -32603 }, [B]: { jsonrpc: -32005 } });
  const r3 = await fetchDuPhong([A, B], { msMoiLuot: 50, transport: gCaHai.transport })(A, than("getAccountInfo"));
  assert.ok(((await r3.json()) as { error?: unknown }).error, "lỗi bị nuốt thành phản hồi rỗng");
});

test("mã lỗi của endpoint là danh sách TƯỜNG MINH, không phải cả dải -320xx", () => {
  // Bản đầu coi cả -32000…-32099 là lỗi endpoint; code review 27/09 chỉ ra Solana đặt lỗi
  // của yêu cầu trong chính dải đó (xem bài kế). Mã lạ trong dải mặc định KHÔNG chuyển.
  for (const m of [-32005, -32603, -32016, -32029]) assert.ok(laLoiCuaEndpoint(m), String(m));
  for (const m of [-32000, -32099, -32600, -32601, -32602, -32700, -31999, -32100, 0]) assert.ok(!laLoiCuaEndpoint(m), String(m));
});

test("bộ chọn DÙNG CHUNG giữa hai lượt kiểm: lượt sau không chờ lại endpoint vừa treo", async () => {
  const g = giaLap({ [A]: "treo", [B]: "ok" });
  const boChon = taoBoChon();
  await fetchDuPhong([A, B], { msMoiLuot: 30, transport: g.transport, boChon })(A, than("getAccountInfo"));
  g.goi.length = 0;
  await fetchDuPhong([A, B], { msMoiLuot: 30, transport: g.transport, boChon })(A, than("getAccountInfo"));
  assert.deepEqual(g.goi.map((x) => x.url), [B]);
});

test("một endpoint nhưng có ghi nhận ⇒ vẫn bọc, nguồn vẫn ghi được", async () => {
  const nhat: QuanSatRpc[] = [];
  const g = giaLap({ [A]: "ok" });
  const c = ketNoiDuPhong([A], { transport: g.transport, ghiNhan: (q: QuanSatRpc) => nhat.push(q) });
  /*
   * Gọi QUA CHÍNH Connection mà `ketNoiDuPhong` dựng (Codex review lần 2, mục 10): bản cũ
   * dựng một `fetchDuPhong` riêng rồi kiểm cái đó, nên bỏ `ghiNhan` khỏi điều kiện `canBoc`
   * vẫn xanh. Kết quả giả không đúng dạng blockhash nên web3 từ chối — thứ cần kiểm là lời
   * gọi đã đi qua transport bọc và nguồn được ghi.
   */
  await c.getLatestBlockhash().catch(() => {});
  assert.deepEqual(g.goi.map((x) => [x.url, x.method]), [[A, "getLatestBlockhash"]]);
  assert.deepEqual(nhat.map((q) => [q.nguon, q.method, q.ketQua]), [["a.example", "getLatestBlockhash", "ok"]]);
});

test("bản PRODUCTION chỉ nhận RPC Devnet công khai, và lý do bỏ không làm rò chính khoá", () => {
  const { giu, bo } = locRpcCongKhai([
    "https://devnet.rpcpool.com",
    "https://solana-devnet.api.onfinality.io/public",
    "https://api.devnet.solana.com/",
    "https://devnet.helius-rpc.com/?api-key=BI-MAT-123",
    "https://solana-devnet.g.alchemy.com/v2/BI-MAT-456",
    "https://user:BI-MAT-789@devnet.rpcpool.com",
    "http://api.devnet.solana.com",
    "https://evil.example/",
    "không-phải-url",
  ]);
  assert.deepEqual(giu, [
    "https://devnet.rpcpool.com",
    "https://solana-devnet.api.onfinality.io/public",
    "https://api.devnet.solana.com/",
  ]);
  assert.equal(bo.length, 6);
  const chuLyDo = JSON.stringify(bo);
  assert.ok(!chuLyDo.includes("BI-MAT"), `lý do bỏ chứa khoá: ${chuLyDo}`);
});

test("production KHÔNG đọc biến môi trường; chỉ đọc cấu hình hiện trường đã lọc", async () => {
  const { duPhongTheoBan } = await import("../../../scripts/rpcDuPhong.ts");
  const env = "https://devnet.helius-rpc.com/?api-key=BI-MAT";
  const cauHinh = ["https://devnet.rpcpool.com", "https://x.example/?api-key=BI-MAT", 42];
  assert.deepEqual(duPhongTheoBan(false, env, cauHinh), ["https://devnet.rpcpool.com"]);
  assert.deepEqual(duPhongTheoBan(false, env, undefined), [], "production tự thêm nhà cung cấp khi không ai khai");
  // DEV: máy của đội, biến môi trường của chính máy đó — cấu hình công khai không chen vào.
  assert.deepEqual(duPhongTheoBan(true, `${env}, https://b.example`, cauHinh), [env, "https://b.example"]);
});

test("hiện trường khai `rpcDuPhong` sai kiểu ⇒ cấu hình hỏng, không âm thầm bỏ qua", async () => {
  const { xacThucHienTruong } = await import("../src/hienTruong.ts");
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const ht = JSON.parse(readFileSync(fileURLToPath(new URL("../public/hien-truong.json", import.meta.url)), "utf8"));
  assert.equal(xacThucHienTruong(ht), null);
  assert.equal(xacThucHienTruong({ ...ht, rpcDuPhong: ["https://devnet.rpcpool.com"] }), null);
  assert.match(xacThucHienTruong({ ...ht, rpcDuPhong: "https://devnet.rpcpool.com" }) ?? "", /rpcDuPhong/);
  assert.match(xacThucHienTruong({ ...ht, rpcDuPhong: [1] }) ?? "", /rpcDuPhong/);
});

test("code review 27/09 · lỗi CỦA YÊU CẦU trong dải -320xx (sai chữ ký, sai phiên bản tx) KHÔNG làm chuyển endpoint", async () => {
  for (const ma of [-32003, -32013, -32015]) {
    assert.ok(!laLoiCuaEndpoint(ma), `${ma} là lỗi của yêu cầu — đổi endpoint chỉ đốt thời gian`);
    const g = giaLap({ [A]: { jsonrpc: ma }, [B]: "ok" });
    await fetchDuPhong([A, B], { msMoiLuot: 50, transport: g.transport })(A, than("simulateTransaction"));
    assert.deepEqual(g.goi.map((x) => x.url), [A], `${ma}: đã thử cả B`);
  }
  for (const ma of [-32603, -32005, -32004, -32016]) assert.ok(laLoiCuaEndpoint(ma), String(ma));
});

test("code review 27/09 · hết hạn KHI ĐANG ĐỌC BODY ⇒ không ghi 'ok', chuyển endpoint kế", async () => {
  // Header về kịp, body thì treo tới khi signal huỷ — đúng ca clone().json() từng nuốt lỗi.
  const goi: string[] = [];
  const transport = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); goi.push(url);
    if (url === A) {
      const body = new ReadableStream({
        start(c) {
          c.enqueue(new TextEncoder().encode('{"jsonrpc":"2.0","result":'));
          init?.signal?.addEventListener("abort", () => c.error(new DOMException("hết hạn", "AbortError")));
        },
      });
      return new Response(body, { status: 200 });
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tu: url } }), { status: 200 });
  }) as typeof fetch;
  const nhat: QuanSatRpc[] = [];
  const r = await fetchDuPhong([A, B], { msMoiLuot: 40, transport, ghiNhan: (q) => nhat.push(q) })(A, than("getMultipleAccounts"));
  assert.equal(((await r.json()) as { result: { tu: string } }).result.tu, B);
  assert.ok(!nhat.some((q) => q.nguon === "a.example" && q.ketQua === "ok"), "body hỏng vẫn được ghi là nguồn trả lời tốt");
});

test("phản hồi trả cho web3.js còn NGUYÊN nội dung và mã trạng thái", async () => {
  const g = giaLap({ [A]: "ok" });
  const r = await fetchDuPhong([A], { transport: g.transport })(A, than("getAccountInfo"));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { jsonrpc: "2.0", id: 1, result: { tu: A } });
});

test("genesis: chỉ bỏ endpoint CHỨNG MINH được là khác cluster; chưa đo được thì giữ", async () => {
  const { locTheoGenesis, GENESIS_DEVNET } = await import("../../../scripts/rpcDuPhong.ts");
  const transport = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === "https://treo.example") return new Promise<Response>((_, tc) => init?.signal?.addEventListener("abort", () => tc(new Error("x"))));
    const g = url === "https://mainnet.example" ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" : GENESIS_DEVNET;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: g }));
  }) as typeof fetch;
  const r = await locTheoGenesis(["https://a.example", "https://mainnet.example", "https://treo.example"], { msHan: 40, transport });
  assert.deepEqual(r.dung, ["https://a.example", "https://treo.example"]);
  assert.deepEqual(r.bo, ["https://mainnet.example"]);
});

test("nghiệm thu live 27/09 · genesis gặp 429 thì THỬ LẠI — một lần giới hạn tần suất không được loại endpoint cả phiên", async () => {
  const { genesisCua, GENESIS_DEVNET } = await import("../../../scripts/rpcDuPhong.ts");
  let lan = 0;
  const transport = (async () => {
    lan++;
    return lan === 1
      ? new Response('{"jsonrpc":"2.0","error":{"code":-32029,"message":"Too Many Requests"}}', { status: 429 })
      : new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: GENESIS_DEVNET }));
  }) as typeof fetch;
  assert.equal(await genesisCua("https://a.example", { transport, msGianCach: 5 }), "devnet");
  assert.equal(lan, 2);
  // Khác cluster thì KHÔNG thử lại — đó là câu trả lời, không phải trục trặc.
  let lan2 = 0;
  const khac = (async () => {
    lan2++;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" }));
  }) as typeof fetch;
  assert.equal(await genesisCua("https://b.example", { transport: khac, msGianCach: 5 }), "khacCluster");
  assert.equal(lan2, 1);
});

test("Codex review lần 2, mục 6 · script ghi fixture xác minh genesis TỪNG endpoint, chỉ giữ endpoint CHỨNG MINH là Devnet", async () => {
  const { chiDevnetDaXacMinh, GENESIS_DEVNET } = await import("../../../scripts/rpcDuPhong.ts");
  const C = "https://c.example";
  const transport = (async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url === C) throw new TypeError("fetch failed");
    const g = url === A ? GENESIS_DEVNET : "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: g }));
  }) as typeof fetch;
  const kq = await chiDevnetDaXacMinh([A, B, C], { transport, soLan: 1, msGianCach: 0 });
  // Bản cũ chỉ hỏi genesis qua connection dự phòng: endpoint ĐẦU trả Devnet là cả danh sách
  // được ghi fixture — kể cả B (mainnet) nếu A treo giữa lượt ghi. "Chưa đo" cũng không được giữ.
  assert.deepEqual(kq.dung, [A]);
  assert.deepEqual(kq.bo, [
    { nguon: "b.example", ly: "khacCluster" },
    { nguon: "c.example", ly: "chuaDo" },
  ]);
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const src = readFileSync(fileURLToPath(new URL("../../../scripts/ky-thuat/capture-kich-ban.ts", import.meta.url)), "utf8");
  assert.ok(/chiDevnetDaXacMinh\(/.test(src), "capture-kich-ban không xác minh từng endpoint");
  assert.ok(!/\.getGenesisHash\(\)/.test(src), "capture-kich-ban vẫn hỏi genesis qua connection dự phòng");
});

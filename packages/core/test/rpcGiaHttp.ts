import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * RPC JSON giả, phát lại fixture replay qua HTTP thật — review 26/09, mục 3.4.
 *
 * Bài CLI trước đây gọi Devnet thật: khi Devnet ngừng trả dữ liệu tài khoản, `npm test`
 * đỏ và chậm thêm cả phút mà không có dòng mã nào sai. CLI nhận `--rpc`, nên trỏ nó vào
 * server này là kiểm đúng đường sản xuất (HTTP → web3.js → `inspect()`), kín và tất định.
 *
 * NGHIÊM: địa chỉ không có trong fixture thì trả LỖI, không trả `null` — `null` nghĩa là
 * "tài khoản không tồn tại", một dữ kiện khác hẳn "không ghi". Method lạ cũng là lỗi.
 */
type TaiKhoanGhi = {
  data: { __buffer: string };
  executable: boolean;
  lamports: number;
  owner: { __pubkey: string };
  rentEpoch: number;
  space?: number;
} | null;

export async function rpcTuFixture(id: string): Promise<{ url: string; dong: () => Promise<void> }> {
  const fx = JSON.parse(
    readFileSync(fileURLToPath(new URL(`../../../data/benchmark/rpc/${id}.json`, import.meta.url)), "utf8"),
  ) as { banGhi: Array<{ method: string; thamSo: { keys?: string[] }; ketQua: unknown }> };

  const theoDiaChi = new Map<string, TaiKhoanGhi>();
  let moPhong: unknown = null;
  let phi: unknown = { context: { slot: 1 }, value: null };
  for (const b of fx.banGhi) {
    if (b.method === "getMultipleAccountsInfo" && Array.isArray(b.ketQua)) {
      b.thamSo.keys!.forEach((k, i) => theoDiaChi.set(k, (b.ketQua as TaiKhoanGhi[])[i] ?? null));
    } else if (b.method === "simulateTransaction") moPhong = b.ketQua;
    else if (b.method === "getFeeForMessage") phi = b.ketQua;
  }
  const raRpc = (a: TaiKhoanGhi) =>
    a && {
      data: [a.data.__buffer, "base64"],
      executable: a.executable,
      lamports: a.lamports,
      owner: a.owner.__pubkey,
      rentEpoch: a.rentEpoch,
      space: a.space ?? Buffer.from(a.data.__buffer, "base64").length,
    };

  const traLoi = (method: string, params: unknown[]): { result: unknown } | { error: { code: number; message: string } } => {
    switch (method) {
      case "getMultipleAccounts": {
        const keys = params[0] as string[];
        const thieu = keys.filter((k) => !theoDiaChi.has(k));
        if (thieu.length) return { error: { code: -32000, message: `fixture không có ${thieu.join(",")}` } };
        return { result: { context: { slot: 1 }, value: keys.map((k) => raRpc(theoDiaChi.get(k)!)) } };
      }
      case "simulateTransaction":
        return moPhong ? { result: moPhong } : { error: { code: -32000, message: "fixture không có mô phỏng" } };
      case "getFeeForMessage":
        return { result: phi };
      case "getSignaturesForAddress":
        return { result: [] };
      default:
        return { error: { code: -32601, message: `method ${method} không có trong RPC giả` } };
    }
  };

  const sv = createServer((req, res) => {
    let than = "";
    req.on("data", (c) => (than += c));
    req.on("end", () => {
      const yc = JSON.parse(than) as { id: unknown; method: string; params: unknown[] };
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ jsonrpc: "2.0", id: yc.id, ...traLoi(yc.method, yc.params ?? []) }));
    });
  });
  await new Promise<void>((xong) => sv.listen(0, "127.0.0.1", xong));
  const { port } = sv.address() as { port: number };
  return { url: `http://127.0.0.1:${port}`, dong: () => new Promise((xong) => sv.close(() => xong())) };
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { kiemSanSang, GENESIS_DEVNET, type TaoConn } from "../src/preflight.ts";
import type { HienTruong } from "../src/hienTruong.ts";
import type { QuanSatRpc } from "../../../scripts/rpcDuPhong.ts";

/*
 * CK-01 — preflight phải đi ĐÚNG các chặng một lượt phân tích đi, và không được gắn
 * "Sẵn sàng" chỉ vì balance trả lời. Mọi connection ở đây là giả: bài kiểm LOGIC xếp
 * chặng, không kiểm Devnet.
 */

const ht = JSON.parse(
  readFileSync(fileURLToPath(new URL("../public/hien-truong.json", import.meta.url)), "utf8"),
) as HienTruong;

type HanhVi = Partial<Record<"genesis" | "blockhash" | "vi" | "nguon" | "moPhong", "ok" | "treo" | "loi" | "sai">>;

/** Một endpoint giả. `sai` ở genesis = khác cluster; ở nguồn = đổi chủ; ở mô phỏng = err. */
function endpoint(host: string, hv: HanhVi = {}) {
  const lam = <T,>(k: keyof HanhVi, ok: () => T, sai?: () => T): Promise<T> => {
    const kieu = hv[k] ?? "ok";
    if (kieu === "treo") return new Promise(() => {});
    if (kieu === "loi") return Promise.reject(new Error(`lỗi mạng tại https://${host}/?api-key=BI-MAT`));
    return Promise.resolve(kieu === "sai" && sai ? sai() : ok());
  };
  return {
    host,
    conn: {
      getGenesisHash: () => lam("genesis", () => GENESIS_DEVNET, () => "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d"),
      getLatestBlockhash: () => lam("blockhash", () => ({ blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 100 })),
      getAccountInfo: () => lam("vi", () => ({ lamports: 2_000_000_000, owner: null, data: Buffer.alloc(0), executable: false })),
      getParsedAccountInfo: () =>
        lam(
          "nguon",
          () => ({ value: { data: { parsed: { info: { mint: ht.mint, owner: ht.nanNhan, tokenAmount: { amount: "500000000" } } } } } }),
          () => ({ value: { data: { parsed: { info: { mint: ht.mint, owner: ht.keTanCong, tokenAmount: { amount: "500000000" } } } } } }),
        ),
      simulateTransaction: () =>
        lam<{ context: { slot: number }; value: { err: unknown } }>("moPhong", () => ({ context: { slot: 42 }, value: { err: null } }), () => ({ context: { slot: 42 }, value: { err: { InstructionError: [0, "x"] } } })),
    },
  };
}

/** `taoConn` giả: ds một URL ⇒ đúng endpoint đó; nhiều URL ⇒ endpoint đầu còn trong ds. */
function nhaMay(ds: ReturnType<typeof endpoint>[]): TaoConn {
  return (urls, ghiNhan: (q: QuanSatRpc) => void) => {
    const e = ds.find((x) => `https://${x.host}` === urls[0])!;
    // Bọc để ghi nguồn cho các chặng 2…5, như `fetchDuPhong` làm.
    const boc = Object.fromEntries(
      Object.entries(e.conn).map(([k, f]) => [
        k,
        async (...a: unknown[]) => {
          const r = await (f as (...x: unknown[]) => Promise<unknown>)(...a);
          ghiNhan({ method: k, nguon: e.host, ketQua: "ok", ms: 1 });
          return r;
        },
      ]),
    );
    return boc as never;
  };
}

const chay = (ds: ReturnType<typeof endpoint>[], ms = 40) =>
  kiemSanSang(ds.map((d) => `https://${d.host}`), ht, nhaMay(ds), { msMoiBuoc: ms });

test("mọi chặng đạt ⇒ Sẵn sàng, và mỗi chặng mang nguồn + thời gian", async () => {
  const r = await chay([endpoint("a.example")]);
  assert.equal(r.sanSang, true);
  assert.deepEqual(r.buoc.map((b) => [b.ma, b.trangThai]), [
    ["genesis", "dat"], ["blockhash", "dat"], ["vi", "dat"], ["nguon", "dat"], ["moPhong", "dat"],
  ]);
  for (const b of r.buoc.slice(1)) {
    assert.equal(b.nguon, "a.example", b.ma);
    assert.equal(typeof b.ms, "number", String(b.ms));
  }
});

test("balance/blockhash sống nhưng ĐỌC ACCOUNT treo ⇒ KHÔNG sẵn sàng, dừng đúng chặng và nói quá hạn", async () => {
  const r = await chay([endpoint("a.example", { vi: "treo" })]);
  assert.equal(r.sanSang, false);
  const theoMa = Object.fromEntries(r.buoc.map((b) => [b.ma, b.trangThai]));
  assert.equal(theoMa["blockhash"], "dat");
  assert.equal(theoMa["vi"], "quaHan");
  assert.equal(theoMa["nguon"], "chuaDo", "chặng sau chặng hỏng phải là CHƯA ĐO, không phải đạt hay lỗi");
  assert.equal(theoMa["moPhong"], "chuaDo");
});

test("endpoint KHÁC cluster bị loại theo genesis; endpoint Devnet còn lại vẫn chạy tiếp", async () => {
  const r = await chay([endpoint("mainnet.example", { genesis: "sai" }), endpoint("b.example")]);
  assert.deepEqual(r.dsDung, ["https://b.example"]);
  assert.equal(r.endpoint[0]!.genesis, "khacCluster");
  assert.equal(r.sanSang, true);
  assert.ok(r.buoc.slice(1).every((b) => b.nguon === "b.example"), "chặng sau vẫn đi qua endpoint khác cluster");
});

test("KHÔNG endpoint nào xác nhận được Devnet ⇒ không chạy tiếp, không sẵn sàng", async () => {
  const r = await chay([endpoint("a.example", { genesis: "treo" })]);
  assert.equal(r.sanSang, false);
  assert.equal(r.buoc[0]!.trangThai, "quaHan");
  assert.ok(r.buoc.slice(1).every((b) => b.trangThai === "chuaDo"));
});

test("tài khoản nguồn đã ĐỔI CHỦ ⇒ lỗi hiện trường nói rõ, không phải 'quá hạn'", async () => {
  const r = await chay([endpoint("a.example", { nguon: "sai" })]);
  const b = r.buoc.find((x) => x.ma === "nguon")!;
  assert.equal(b.trangThai, "loi");
  assert.match(b.chiTiet ?? "", /đổi chủ/);
  assert.equal(r.sanSang, false);
});

test("mô phỏng ca lành trả err ⇒ không sẵn sàng (ping thành công không đủ)", async () => {
  const r = await chay([endpoint("a.example", { moPhong: "sai" })]);
  assert.equal(r.sanSang, false);
  assert.equal(r.buoc.at(-1)!.trangThai, "loi");
});

test("chi tiết lỗi KHÔNG mang URL đầy đủ — khoá trong query không lọt ra giao diện", async () => {
  const r = await chay([endpoint("a.example", { blockhash: "loi" })]);
  // `dsDung` là cấu hình nội bộ để dựng connection, không bao giờ được hiển thị; phần
  // HIỂN THỊ là `buoc` và `endpoint`.
  const chu = JSON.stringify({ buoc: r.buoc, endpoint: r.endpoint });
  assert.ok(!chu.includes("BI-MAT"), chu);
  assert.ok(!/https?:\/\//.test(chu), `còn URL trong kết quả: ${chu}`);
});

/* ── Codex review lần 2, mục 5 ──────────────────────────────────────────────── */

test("mục 5 · genesis LOẠI mọi endpoint ⇒ lượt kiểm KHÔNG quay về endpoint chính đã bị loại", async () => {
  const { dsChoLuotKiem } = await import("../src/preflight.ts");
  const { ketNoiDuPhong, LoiKhongCoRpcDung } = await import("../../../scripts/rpcDuPhong.ts");
  const cauHinh = ["https://sai-cluster.example", "https://du-phong.example"];
  // Chưa lọc xong: chỉ endpoint chính (thiết kế cũ, giữ nguyên).
  assert.deepEqual(dsChoLuotKiem(null, cauHinh), ["https://sai-cluster.example"]);
  // Lọc xong và còn endpoint đúng cluster: dùng đúng danh sách đó.
  assert.deepEqual(dsChoLuotKiem(["https://du-phong.example"], cauHinh), ["https://du-phong.example"]);
  // Lọc xong mà KHÔNG còn gì: danh sách rỗng — không lén dùng lại endpoint vừa bị chứng minh sai mạng.
  assert.deepEqual(dsChoLuotKiem([], cauHinh), []);
  // Và connection từ danh sách rỗng NÉM lỗi có tên, câu không chứa URL.
  assert.throws(() => ketNoiDuPhong([]), (e: unknown) => e instanceof LoiKhongCoRpcDung && !/https?:/.test((e as Error).message));
});

test("mục 5 · App dùng CÙNG một hàm chọn danh sách cho kịch bản lẫn yêu cầu dApp, và preflight ghi cả danh sách rỗng", () => {
  const app = readFileSync(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.ok(!/dung\.length \? dung :/.test(app), "lọc genesis rỗng vẫn quay về endpoint chính");
  assert.ok(!/if \(kq\.dsDung\.length\) datDsXacMinh/.test(app), "preflight bỏ qua kết quả 'không endpoint nào đúng cluster'");
  assert.ok(!/ketNoiDuPhong\(dsRpc\(htNay\)\)/.test(app), "yêu cầu từ dApp dùng dự phòng CHƯA xác minh genesis");
  assert.ok((app.match(/dsChoLuotKiem\(/g) ?? []).length >= 2, "kịch bản và yêu cầu dApp không đi chung một cửa chọn endpoint");
});

test("tồn đọng review · lọc genesis có NHỚ: hỏi mỗi endpoint một lần cho cả trang, lỗi thì không nhớ", async () => {
  const { taoLocGenesisNho, GENESIS_DEVNET } = await import("../../../scripts/rpcDuPhong.ts");
  let hoi = 0;
  let hong = true;
  const transport = (async (input: RequestInfo | URL) => {
    hoi++;
    if (hong) throw new TypeError("fetch failed");
    const g = String(input).includes("sai") ? "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d" : GENESIS_DEVNET;
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: g }));
  }) as typeof fetch;
  const loc = taoLocGenesisNho({ transport, soLan: 1, msGianCach: 0 });
  const ds = ["https://dung.example", "https://sai.example"];
  // Chưa đo được: giữ cả hai (như locTheoGenesis) và KHÔNG nhớ — lần sau hỏi lại.
  assert.deepEqual(await loc(ds), ds);
  hong = false;
  hoi = 0;
  assert.deepEqual(await loc(ds), ["https://dung.example"]);
  assert.equal(hoi, 2);
  assert.deepEqual(await loc(ds), ["https://dung.example"]);
  assert.equal(hoi, 2, "đã có kết quả mà vẫn hỏi lại genesis");
});

test("tồn đọng review · màn phỏng vấn và trang tấn công dựng connection từ danh sách ĐÃ lọc genesis", () => {
  const doc = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");
  const pv = doc("../src/PhongVan.tsx");
  assert.ok(!/ketNoiDuPhong\(dsRpc\(ht\)\)/.test(pv), "phỏng vấn dùng dự phòng chưa qua genesis");
  assert.ok(/locGenesis\(/.test(pv));
  const tc = doc("../../trang-tan-cong/src/App.tsx");
  assert.ok(/locGenesis\(/.test(tc), "trang tấn công dùng dự phòng chưa qua genesis");
});

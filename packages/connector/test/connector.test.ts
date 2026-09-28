import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CustosWallet,
  HAN_SAN_SANG_MS,
  LoiCustos,
  docThongDiepVi,
  docYeuCau,
  sangBase64,
  type CuaSo,
  type MoiTruong,
} from "../src/index.ts";

/*
 * Spike G0-1 — phép thử T2/T4 phần làm được KHÔNG cần trình duyệt: ranh giới thông điệp,
 * kiểm origin + cửa sổ nguồn, popup bị chặn, cửa sổ đóng giữa chừng, hết hạn không thử lại,
 * batch bị từ chối. Phần cần trình duyệt thật (wallet-adapter nhận ví, popup thật) đo bằng
 * probe Playwright — `apps/thu-ket-noi/tools/probe-spike.py`.
 */

const URL_VI = "http://localhost:5188/ket-noi.html";
const ORIGIN_VI = "http://localhost:5188";
const DIA_CHI = "AqX3FmDzuU1a9FAPpmo9m52ckQFBeExcGhs8qbPEBCLZ";
const KHOA = sangBase64(new Uint8Array(32).fill(1));

type Gui = { m: Record<string, unknown>; o: string };

function dung(opts: { chan?: boolean } = {}) {
  const gui: Gui[] = [];
  const cuaSo: CuaSo & { closed: boolean } = {
    closed: false,
    focus() {},
    postMessage(m, o) {
      gui.push({ m: m as Record<string, unknown>, o });
    },
  };
  let nghe: ((e: { data: unknown; origin: string; source: unknown }) => void) | null = null;
  const hen: Array<{ fn: () => void; ms: number; huy: boolean }> = [];
  let soLanMo = 0;
  const mt: MoiTruong = {
    mo: () => {
      soLanMo++;
      return opts.chan ? null : cuaSo;
    },
    nghe: (fn) => {
      nghe = fn;
      return () => {};
    },
    hen: (fn, ms) => {
      const h = { fn, ms, huy: false };
      hen.push(h);
      return h;
    },
    huyHen: (h) => {
      (h as { huy: boolean }).huy = true;
    },
  };
  const vi = new CustosWallet(URL_VI, mt);
  const tuVi = (data: unknown, origin = ORIGIN_VI, source: unknown = cuaSo) => nghe!({ data, origin, source });
  /** Chạy các hẹn giờ có hạn `ms` (hoặc mọi hẹn nếu không truyền). */
  const chayHen = (ms?: number) => {
    for (const h of hen.splice(0)) if (!h.huy && (ms === undefined || h.ms === ms)) h.fn();
      else if (!h.huy) hen.push(h);
  };
  const choVong = () => new Promise((r) => setImmediate(r));
  return { vi, cuaSo, gui, tuVi, chayHen, choVong, soLanMo: () => soLanMo };
}

async function ketNoi(d: ReturnType<typeof dung>) {
  const p = d.vi.features["standard:connect"].connect();
  d.tuVi({ custos: 1, kieu: "san-sang" });
  await d.choVong();
  const yc = d.gui.at(-1)!;
  d.tuVi({ custos: 1, kieu: "tra-loi", id: yc.m["id"], ok: true, ketQua: { diaChi: DIA_CHI, khoaCongKhai: KHOA } });
  return p;
}

// ── ranh giới thông điệp ─────────────────────────────────────────────────────

test("dApp KHÔNG gửi kèm được trường nào ngoài bytes: khoá lạ ⇒ bỏ CẢ thông điệp", () => {
  const hopLe = { custos: 1, kieu: "ky", id: "abcdefgh-1234", giaoDich: "AQID" };
  assert.ok(docYeuCau(hopLe));
  for (const them of [{ protected: false }, { level: "safe" }, { dongY: true }, { expectedAction: "swap" }])
    assert.equal(docYeuCau({ ...hopLe, ...them }), null, `lọt khoá ${Object.keys(them)[0]}`);
});

test("yêu cầu sai hình dạng ⇒ null: phiên bản, id, base64, kích thước", () => {
  const g = { custos: 1, kieu: "ky", id: "abcdefgh-1234", giaoDich: "AQID" };
  assert.equal(docYeuCau({ ...g, custos: 2 }), null);
  assert.equal(docYeuCau({ ...g, id: "ngắn" }), null);
  assert.equal(docYeuCau({ ...g, giaoDich: "không phải base64!" }), null);
  assert.equal(docYeuCau({ ...g, giaoDich: "A".repeat(1648) }), null, "vượt 1232 byte");
  assert.equal(docYeuCau({ ...g, kieu: "signAndSend" }), null);
  assert.equal(docYeuCau({ custos: 1, kieu: "ket-noi", id: "abcdefgh-1234", giaoDich: "AQID" }), null);
});

test("thông điệp của ví cũng kiểm chặt: lỗi phải là mã đã biết", () => {
  assert.ok(docThongDiepVi({ custos: 1, kieu: "tra-loi", id: "abcdefgh-1234", ok: false, loi: "tu-choi" }));
  assert.equal(docThongDiepVi({ custos: 1, kieu: "tra-loi", id: "abcdefgh-1234", ok: false, loi: "bịa" }), null);
  assert.equal(docThongDiepVi({ custos: 1, kieu: "san-sang", them: 1 }), null);
});

// ── mở cửa sổ ────────────────────────────────────────────────────────────────

test("connect im lặng (autoConnect) KHÔNG mở cửa sổ", async () => {
  const d = dung();
  const r = await d.vi.features["standard:connect"].connect({ silent: true });
  assert.deepEqual(r.accounts, []);
  assert.equal(d.soLanMo(), 0);
});

test("cửa sổ mở ĐỒNG BỘ trong lời gọi connect — trước mọi await", () => {
  const d = dung();
  void d.vi.features["standard:connect"].connect().catch(() => {});
  assert.equal(d.soLanMo(), 1, "mở sau await thì trình duyệt coi là popup không do người dùng");
});

test("popup bị chặn ⇒ lỗi rõ ràng, không treo", async () => {
  const d = dung({ chan: true });
  await assert.rejects(d.vi.features["standard:connect"].connect(), (e: LoiCustos) => e.ma === "cua-so-bi-chan");
});

test("kết nối: gửi tới ĐÚNG origin ví (không '*'), nhận tài khoản, phát sự kiện change", async () => {
  const d = dung();
  const doi: unknown[] = [];
  d.vi.features["standard:events"].on("change", (p) => doi.push(p));
  const r = await ketNoi(d);
  assert.equal(r.accounts[0]?.address, DIA_CHI);
  assert.ok(d.gui.every((g) => g.o === ORIGIN_VI));
  assert.equal(doi.length, 1);
  assert.deepEqual(r.accounts[0]?.chains, ["solana:devnet"]);
});

// ── kiểm nguồn thông điệp ────────────────────────────────────────────────────

test("trả lời từ origin khác hoặc cửa sổ khác ⇒ bị lờ, yêu cầu vẫn chờ", async () => {
  const d = dung();
  await ketNoi(d);
  const tx = new Uint8Array([1, 2, 3]);
  let xong = false;
  const p = d.vi.features["solana:signTransaction"]
    .signTransaction({ account: d.vi.accounts[0]!, transaction: tx })
    .finally(() => (xong = true));
  await d.choVong();
  const id = d.gui.at(-1)!.m["id"];
  const gia = { custos: 1, kieu: "tra-loi", id, ok: true, ketQua: { giaoDichDaKy: "BAUG" } };
  d.tuVi(gia, "https://ke-gian.example");
  d.tuVi(gia, ORIGIN_VI, { khac: true });
  await d.choVong();
  assert.equal(xong, false, "nhận chữ ký từ nguồn không phải cửa sổ ví");
  d.tuVi(gia);
  const [out] = await p;
  assert.deepEqual([...out!.signedTransaction], [4, 5, 6]);
});

// ── ký ───────────────────────────────────────────────────────────────────────

test("yêu cầu ký mang ĐÚNG bytes dApp đưa, và không mang gì khác", async () => {
  const d = dung();
  await ketNoi(d);
  const tx = new Uint8Array([9, 8, 7, 6]);
  void d.vi.features["solana:signTransaction"].signTransaction({ account: d.vi.accounts[0]!, transaction: tx });
  await d.choVong();
  const m = d.gui.at(-1)!.m;
  assert.deepEqual(Object.keys(m).sort(), ["custos", "giaoDich", "id", "kieu"]);
  assert.equal(m["giaoDich"], sangBase64(tx));
  assert.ok(docYeuCau(m), "connector tự gửi thứ mà ví sẽ loại");
});

test("batch hai giao dịch ⇒ từ chối, không gửi gì sang ví", async () => {
  const d = dung();
  await ketNoi(d);
  const a = d.vi.accounts[0]!;
  const truoc = d.gui.length;
  await assert.rejects(
    d.vi.features["solana:signTransaction"].signTransaction(
      { account: a, transaction: new Uint8Array([1]) },
      { account: a, transaction: new Uint8Array([2]) },
    ),
    (e: LoiCustos) => e.ma === "sai-yeu-cau",
  );
  assert.equal(d.gui.length, truoc);
});

test("chain khác Devnet ⇒ từ chối", async () => {
  const d = dung();
  await ketNoi(d);
  await assert.rejects(
    d.vi.features["solana:signTransaction"].signTransaction({
      account: d.vi.accounts[0]!,
      transaction: new Uint8Array([1]),
      chain: "solana:mainnet",
    }),
    (e: LoiCustos) => e.ma === "sai-yeu-cau",
  );
});

test("chưa kết nối ⇒ không ký", async () => {
  const d = dung();
  await assert.rejects(
    d.vi.features["solana:signTransaction"].signTransaction({
      account: { address: DIA_CHI, publicKey: new Uint8Array(32), chains: ["solana:devnet"], features: [] },
      transaction: new Uint8Array([1]),
    }),
    (e: LoiCustos) => e.ma === "chua-ket-noi",
  );
});

test("ví từ chối ⇒ lỗi mang mã tu-choi", async () => {
  const d = dung();
  await ketNoi(d);
  const p = d.vi.features["solana:signTransaction"].signTransaction({
    account: d.vi.accounts[0]!,
    transaction: new Uint8Array([1]),
  });
  await d.choVong();
  d.tuVi({ custos: 1, kieu: "tra-loi", id: d.gui.at(-1)!.m["id"], ok: false, loi: "tu-choi" });
  await assert.rejects(p, (e: LoiCustos) => e.ma === "tu-choi");
});

test("cửa sổ ví đóng giữa chừng ⇒ yêu cầu kết thúc (không treo), tài khoản bị gỡ", async () => {
  const d = dung();
  await ketNoi(d);
  const p = d.vi.features["solana:signTransaction"].signTransaction({
    account: d.vi.accounts[0]!,
    transaction: new Uint8Array([1]),
  });
  await d.choVong();
  d.cuaSo.closed = true;
  d.chayHen(500);
  await assert.rejects(p, (e: LoiCustos) => e.ma === "cua-so-dong");
  assert.deepEqual(d.vi.accounts, []);
});

test("hết hạn chờ ký ⇒ het-han (KHÔNG nói là đã huỷ), và KHÔNG tự gửi lại", async () => {
  const d = dung();
  await ketNoi(d);
  const p = d.vi.features["solana:signTransaction"].signTransaction({
    account: d.vi.accounts[0]!,
    transaction: new Uint8Array([1]),
  });
  await d.choVong();
  const truoc = d.gui.length;
  d.chayHen(5 * 60_000);
  await assert.rejects(p, (e: LoiCustos) => e.ma === "het-han" && /đừng gửi lại/.test(e.message));
  assert.equal(d.gui.length, truoc, "hết hạn mà connector tự gửi lại yêu cầu ký");
});

test("một id chỉ nhận MỘT câu trả lời", async () => {
  const d = dung();
  await ketNoi(d);
  const p = d.vi.features["solana:signTransaction"].signTransaction({
    account: d.vi.accounts[0]!,
    transaction: new Uint8Array([1]),
  });
  await d.choVong();
  const id = d.gui.at(-1)!.m["id"];
  d.tuVi({ custos: 1, kieu: "tra-loi", id, ok: false, loi: "tu-choi" });
  d.tuVi({ custos: 1, kieu: "tra-loi", id, ok: true, ketQua: { giaoDichDaKy: "BAUG" } });
  await assert.rejects(p, (e: LoiCustos) => e.ma === "tu-choi");
});

test("URL ví phải là https (hoặc localhost khi phát triển)", () => {
  assert.throws(() => new CustosWallet("http://vi.example/ket-noi.html"));
  assert.doesNotThrow(() => new CustosWallet("https://custos-solana.vercel.app/ket-noi.html", dung().vi && ({
    mo: () => null, nghe: () => () => {}, hen: () => 0, huyHen: () => {},
  })));
});

// ── Codex 29/09: connect không được treo khi ví chưa kịp "sẵn sàng" ──────────

test("cửa sổ ví đóng TRƯỚC khi báo sẵn sàng ⇒ connect kết thúc bằng lỗi, không treo", async () => {
  const d = dung();
  const p = d.vi.features["standard:connect"].connect();
  d.cuaSo.closed = true;
  d.chayHen(500);
  await assert.rejects(p, (e: LoiCustos) => e.ma === "cua-so-dong");
});

test("cửa sổ ví không bao giờ báo sẵn sàng ⇒ hết hạn chờ, connect kết thúc", async () => {
  const d = dung();
  const p = d.vi.features["standard:connect"].connect();
  d.chayHen(HAN_SAN_SANG_MS);
  await assert.rejects(p, (e: LoiCustos) => e.ma === "vi-khong-phan-hoi");
});

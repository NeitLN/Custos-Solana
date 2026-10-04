import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  Transaction,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import type { InspectResult } from "@custos-solana/types";
import type { Facts } from "@custos-solana/core";
import type { GiaoDichRpc } from "../src/ketNoi/bienNhan.ts";
import { sangBase64, tuBase64, type ThongDiepVi } from "@custos-solana/connector/giao-thuc";
import { CuaSoVi, LoiHienThiDuoc } from "../src/ketNoi/cuaSoVi.ts";

/*
 * Spike G0-1, phía ví. Điều phải chứng minh: Custos kiểm ĐÚNG giao dịch dApp gửi (không
 * dựng lại kịch bản), chữ ký chỉ ra sau khi người dùng bấm, bytes đã ký trùng bytes đã kiểm,
 * và dApp không có đường nào vòng qua bước kiểm.
 */

const VI = Keypair.generate();
const LA = Keypair.generate();
const DAPP = "http://localhost:5190";
const BH = "11111111111111111111111111111111";

function txV0(lamports = 1000, payer = VI.publicKey) {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: BH,
      instructions: [SystemProgram.transfer({ fromPubkey: payer, toPubkey: LA.publicKey, lamports })],
    }).compileToV0Message(),
  );
}

/** Giao dịch legacy — wallet-adapter gửi dạng này khi dApp dùng `Transaction`. */
function txLegacy() {
  const t = new Transaction({ feePayer: VI.publicKey, recentBlockhash: BH }).add(
    SystemProgram.transfer({ fromPubkey: VI.publicKey, toPubkey: LA.publicKey, lamports: 5 }),
  );
  return t.serialize({ requireAllSignatures: false, verifySignatures: false });
}

const KQ = (level: InspectResult["level"]): InspectResult => ({
  level,
  aiAdvisory: null,
  detectedPrimaryAction: null,
  diff: [],
  reasonCodes: level === "safe" ? [] : ["R01"],
  coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
  explanation: "",
});

type Kiem = (tx: VersionedTransaction) => Promise<{ ketQua: InspectResult; facts?: Facts }>;
function dung(opts: { kiem?: Kiem; coKhoa?: boolean; bayGio?: () => number; traCuu?: (c: string) => Promise<GiaoDichRpc | null> } = {}) {
  const gui: Array<{ m: ThongDiepVi; o: string }> = [];
  const daKiem: Uint8Array[] = [];
  const cs = new CuaSoVi({
    viNguoiDung: VI.publicKey.toBase58(),
    gui: (m, o) => gui.push({ m, o }),
    kiem:
      opts.kiem ??
      (async (tx) => {
        daKiem.push(tx.message.serialize());
        return { ketQua: KQ("danger") };
      }),
    khoa: () => (opts.coKhoa === false ? null : VI),
    bayGio: opts.bayGio,
    traCuu: opts.traCuu,
    cho: async () => {},
    soLanTra: 3,
  });
  let n = 0;
  const id = () => `yeu-cau-${String(++n).padStart(4, "0")}`;
  const tuDapp = (data: unknown, origin = DAPP, laOpener = true) => cs.nhan({ data, origin, laOpener });
  const cho = () => new Promise((r) => setImmediate(r));
  return { cs, gui, daKiem, id, tuDapp, cho };
}

function ketNoi(d: ReturnType<typeof dung>) {
  d.tuDapp({ custos: 1, kieu: "ket-noi", id: d.id() });
  d.cs.choKetNoi();
}

const cuoi = (d: ReturnType<typeof dung>) => d.gui.at(-1)!;

// ── nguồn thông điệp ─────────────────────────────────────────────────────────

test("chỉ nghe cửa sổ đã mở ví (opener) — trang khác gửi gì cũng bị lờ", () => {
  const d = dung();
  d.tuDapp({ custos: 1, kieu: "ket-noi", id: d.id() }, DAPP, false);
  assert.equal(d.cs.trangThai.dangCho, null);
});

test("origin bị ghim từ lần xin kết nối: origin khác sau đó bị bỏ", () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) }, "https://ke-gian.example");
  assert.equal(d.cs.trangThai.dangCho, null);
  assert.match(d.cs.trangThai.nhatKy[0]!, /Bỏ thông điệp từ https:\/\/ke-gian\.example/);
});

test("mọi trả lời đi tới ĐÚNG origin dApp đã ghim", async () => {
  const d = dung();
  ketNoi(d);
  assert.equal(cuoi(d).o, DAPP);
  assert.ok(d.gui.every((g) => g.o === DAPP));
});

// ── ranh giới quyền ─────────────────────────────────────────────────────────

test("xin ký trước khi được cho kết nối ⇒ chua-ket-noi, không kiểm, không ký", () => {
  const d = dung();
  const id = d.id();
  // Ghim origin bằng một yêu cầu kết nối rồi từ chối — ví chưa cho kết nối.
  d.tuDapp({ custos: 1, kieu: "ket-noi", id: d.id() });
  d.cs.tuChoi();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(txV0().serialize()) });
  assert.deepEqual(cuoi(d).m, { custos: 1, kieu: "tra-loi", id, ok: false, loi: "chua-ket-noi" });
  assert.equal(d.daKiem.length, 0);
});

test("dApp gửi kèm 'protected: false' ⇒ cả thông điệp bị loại", () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()), protected: false });
  assert.equal(d.cs.trangThai.dangCho, null);
  assert.equal(d.daKiem.length, 0);
});

test("ví không phải người ký của giao dịch ⇒ sai-yeu-cau, không kiểm", () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0(1, LA.publicKey).serialize()) });
  assert.equal((cuoi(d).m as { loi?: string }).loi, "sai-yeu-cau");
  assert.equal(d.daKiem.length, 0);
});

test("phát lại đúng id cũ không mở lại hộp thoại", async () => {
  const d = dung();
  ketNoi(d);
  const yc = { custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) };
  d.tuDapp(yc);
  await d.cho();
  d.cs.tuChoi();
  d.tuDapp(yc);
  assert.equal(d.cs.trangThai.dangCho, null);
  assert.equal(d.daKiem.length, 1);
});

test("đang chờ người dùng ⇒ yêu cầu thứ hai nhận dang-ban", async () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  const id2 = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id: id2, giaoDich: sangBase64(txV0(7).serialize()) });
  assert.deepEqual(cuoi(d).m, { custos: 1, kieu: "tra-loi", id: id2, ok: false, loi: "dang-ban" });
});

// ── kiểm đúng giao dịch của dApp ────────────────────────────────────────────

test("Custos kiểm ĐÚNG bytes dApp gửi — không dựng lại kịch bản", async () => {
  const d = dung();
  ketNoi(d);
  const tx = txV0(424242);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(tx.serialize()) });
  await d.cho();
  assert.deepEqual(d.daKiem[0], tx.message.serialize());
  const dc = d.cs.trangThai.dangCho;
  assert.equal(dc?.kieu === "ky" && dc.pha, "da-kiem");
});

test("giao dịch legacy từ wallet-adapter cũng đọc và kiểm được", async () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txLegacy()) });
  await d.cho();
  assert.equal(d.daKiem.length, 1);
});

// ── quyết định ───────────────────────────────────────────────────────────────

test("Chặn ⇒ tu-choi, không có chữ ký nào gửi đi", async () => {
  const d = dung();
  ketNoi(d);
  const id = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  d.cs.tuChoi();
  assert.deepEqual(cuoi(d).m, { custos: 1, kieu: "tra-loi", id, ok: false, loi: "tu-choi" });
  assert.ok(!d.gui.some((g) => g.m.kieu === "tra-loi" && g.m.ok && g.m.ketQua && "giaoDichDaKy" in g.m.ketQua));
});

test("Custos không kiểm được ⇒ KHÔNG ký được (fail-safe), đóng yêu cầu trả chua-kiem-duoc", async () => {
  const d = dung({ kiem: async () => Promise.reject(new Error("RPC không phải Devnet")) });
  ketNoi(d);
  const id = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  await d.cs.vanKy();
  const dc = d.cs.trangThai.dangCho;
  assert.equal(dc?.kieu === "ky" && dc.pha, "loi-kiem", "vanKy chạy được khi chưa kiểm xong");
  d.cs.tuChoi();
  assert.deepEqual(cuoi(d).m, { custos: 1, kieu: "tra-loi", id, ok: false, loi: "chua-kiem-duoc" });
});

test("Vẫn ký ⇒ trả bytes đã ký: cùng message đã kiểm, chữ ký hợp lệ của ví", async () => {
  const d = dung();
  ketNoi(d);
  const tx = txV0(31337);
  const id = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(tx.serialize()) });
  await d.cho();
  await d.cs.vanKy();
  const m = cuoi(d).m;
  assert.ok(m.kieu === "tra-loi" && m.ok && m.ketQua && "giaoDichDaKy" in m.ketQua, JSON.stringify(m));
  const daKy = VersionedTransaction.deserialize(tuBase64(m.ketQua.giaoDichDaKy));
  assert.deepEqual(daKy.message.serialize(), tx.message.serialize());
  const khoa = await crypto.subtle.importKey("raw", new Uint8Array(VI.publicKey.toBytes()), { name: "Ed25519" }, false, ["verify"]);
  assert.ok(await crypto.subtle.verify({ name: "Ed25519" }, khoa, new Uint8Array(daKy.signatures[0]!), new Uint8Array(daKy.message.serialize())));
  assert.equal(d.cs.trangThai.dangCho, null);
});

test("chưa nạp khoá ⇒ bấm Vẫn ký không tạo gì, yêu cầu vẫn chờ", async () => {
  const d = dung({ coKhoa: false });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  const truoc = d.gui.length;
  await d.cs.vanKy();
  assert.equal(d.gui.length, truoc);
  assert.notEqual(d.cs.trangThai.dangCho, null);
});

test("kết quả kiểm đã cũ ⇒ kiểm lại, KHÔNG ký kết quả cũ", async () => {
  const d = dung({ bayGio: () => Date.now() - 10 * 60_000 });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  const truoc = d.gui.length;
  await d.cs.vanKy();
  await d.cho();
  assert.equal(d.gui.length, truoc, "ký kết quả đã cũ");
  assert.equal(d.daKiem.length, 2, "phải kiểm lại");
});

test("khoá lấy từ VÍ: địa chỉ trả dApp là ví cố định, không phải thứ dApp khai", () => {
  const d = dung();
  ketNoi(d);
  const m = cuoi(d).m;
  assert.ok(m.kieu === "tra-loi" && m.ok && m.ketQua && "diaChi" in m.ketQua);
  assert.equal(m.ketQua.diaChi, VI.publicKey.toBase58());
  assert.deepEqual(tuBase64(m.ketQua.khoaCongKhai), new PublicKey(m.ketQua.diaChi).toBytes());
});

// ── GĐ1 · A2 đối kháng, B1 giao dịch tổng quát, B4 biên nhận ─────────────────

test("A2 · bấm 'Vẫn ký' hai lần liền ⇒ đúng MỘT chữ ký gửi đi", async () => {
  const d = dung();
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  await Promise.all([d.cs.vanKy(), d.cs.vanKy()]);
  const daKy = d.gui.filter((g) => g.m.kieu === "tra-loi" && g.m.ok && g.m.ketQua && "giaoDichDaKy" in g.m.ketQua);
  assert.equal(daKy.length, 1);
});

test("B1 · giao dịch nhiều người ký: chữ ký sẵn có của bên khác được GIỮ NGUYÊN", async () => {
  const d = dung();
  ketNoi(d);
  const DONG = Keypair.generate();
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI.publicKey,
      recentBlockhash: BH,
      instructions: [
        SystemProgram.transfer({ fromPubkey: VI.publicKey, toPubkey: LA.publicKey, lamports: 1 }),
        SystemProgram.transfer({ fromPubkey: DONG.publicKey, toPubkey: LA.publicKey, lamports: 1 }),
      ],
    }).compileToV0Message(),
  );
  tx.sign([DONG]); // dApp ký phần của nó trước, như giao dịch có đồng ký
  const iDong = tx.message.staticAccountKeys.findIndex((k) => k.equals(DONG.publicKey));
  const truoc = new Uint8Array(tx.signatures[iDong]!);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(tx.serialize()) });
  await d.cho();
  await d.cs.vanKy();
  const m = cuoi(d).m;
  assert.ok(m.kieu === "tra-loi" && m.ok && m.ketQua && "giaoDichDaKy" in m.ketQua);
  const sau = VersionedTransaction.deserialize(tuBase64(m.ketQua.giaoDichDaKy));
  assert.deepEqual([...sau.signatures[iDong]!], [...truoc], "chữ ký của đồng ký bị xoá");
});

test("B1 · giao dịch v0 dùng lookup table đọc, kiểm và ký được; bảng tra giữ nguyên", async () => {
  const d = dung();
  ketNoi(d);
  const alt = new AddressLookupTableAccount({
    key: Keypair.generate().publicKey,
    state: { deactivationSlot: 2n ** 64n - 1n, lastExtendedSlot: 0, lastExtendedSlotStartIndex: 0, addresses: [LA.publicKey] },
  });
  const tx = new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI.publicKey,
      recentBlockhash: BH,
      instructions: [SystemProgram.transfer({ fromPubkey: VI.publicKey, toPubkey: LA.publicKey, lamports: 1 })],
    }).compileToV0Message([alt]),
  );
  assert.equal(tx.message.addressTableLookups.length, 1);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(tx.serialize()) });
  await d.cho();
  assert.deepEqual(d.daKiem[0], tx.message.serialize());
  await d.cs.vanKy();
  const m = cuoi(d).m;
  assert.ok(m.kieu === "tra-loi" && m.ok && m.ketQua && "giaoDichDaKy" in m.ketQua);
  const sau = VersionedTransaction.deserialize(tuBase64(m.ketQua.giaoDichDaKy));
  assert.equal(sau.message.addressTableLookups[0]!.accountKey.toBase58(), alt.key.toBase58());
});

test("B4 · ký xong ⇒ ví tự tra chữ ký và lập biên nhận; KHÔNG gửi gì lên mạng", async () => {
  const tra: string[] = [];
  const d = dung({
    traCuu: async (c) => {
      tra.push(c);
      return tra.length < 2
        ? null
        : { meta: { err: null, postBalances: [1] }, transaction: { message: { accountKeys: [VI.publicKey.toBase58()] } } };
    },
  });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  await d.cs.vanKy();
  for (let i = 0; i < 5; i++) await d.cho();
  const bn = d.cs.trangThai.bienNhan!;
  assert.equal(bn.pha, "thanh-cong");
  assert.equal(tra.length, 2);
  assert.ok(tra.every((c) => c === bn.chuKy));
  // Mock `kiem` không trả Facts ⇒ không có dự báo ⇒ không được chấm "khớp".
  assert.equal(bn.khopHet, null);
});

test("B4 · không thấy giao dịch sau hết lượt tra ⇒ 'chua-thay', không kết luận thêm", async () => {
  const d = dung({ traCuu: async () => null });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  await d.cs.vanKy();
  for (let i = 0; i < 6; i++) await d.cho();
  assert.equal(d.cs.trangThai.bienNhan?.pha, "chua-thay");
});

test("B4 · lỗi mạng khi tra KHÔNG thành 'thất bại' — tra tiếp", async () => {
  let lan = 0;
  const d = dung({
    traCuu: async () => {
      if (++lan === 1) throw new Error("mạng");
      return { meta: { err: null, postBalances: [1] }, transaction: { message: { accountKeys: [VI.publicKey.toBase58()] } } };
    },
  });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  await d.cs.vanKy();
  for (let i = 0; i < 5; i++) await d.cho();
  assert.equal(d.cs.trangThai.bienNhan?.pha, "thanh-cong");
});

test("B4 · Chặn ⇒ không có biên nhận, không tra gì", async () => {
  let tra = 0;
  const d = dung({ traCuu: async () => (tra++, null) });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  d.cs.tuChoi();
  await d.cho();
  assert.equal(d.cs.trangThai.bienNhan, null);
  assert.equal(tra, 0);
});

// ── Codex 29/09 ─────────────────────────────────────────────────────────────

test("ngắt khi yêu cầu ký đang chờ ⇒ yêu cầu bị huỷ, 'Vẫn ký' không còn tác dụng", async () => {
  const d = dung();
  ketNoi(d);
  const id = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  d.tuDapp({ custos: 1, kieu: "ngat", id: d.id() });
  assert.equal(d.cs.trangThai.dangCho, null);
  assert.ok(d.gui.some((g) => g.m.kieu === "tra-loi" && g.m.id === id && !g.m.ok));
  await d.cs.vanKy();
  assert.ok(!d.gui.some((g) => g.m.kieu === "tra-loi" && g.m.ok && g.m.ketQua && "giaoDichDaKy" in g.m.ketQua));
});

test("ngắt KHI đang ký ⇒ chữ ký không rời ví, dApp nhận chua-ro (không báo sai là chưa ký)", async () => {
  const d = dung();
  ketNoi(d);
  const id = d.id();
  d.tuDapp({ custos: 1, kieu: "ky", id, giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  const dangKy = d.cs.vanKy();
  d.tuDapp({ custos: 1, kieu: "ngat", id: d.id() });
  await dangKy;
  assert.ok(!d.gui.some((g) => g.m.kieu === "tra-loi" && g.m.ok && g.m.ketQua && "giaoDichDaKy" in g.m.ketQua));
  assert.ok(d.gui.some((g) => g.m.kieu === "tra-loi" && g.m.id === id && !g.m.ok && g.m.loi === "chua-ro"));
});

test("lỗi RPC nguyên văn KHÔNG lên giao diện — có thể chứa URL kèm khoá", async () => {
  const d = dung({
    kiem: async () => Promise.reject(new Error("403: https://devnet.example-rpc.com/?api-key=BI-MAT-123 forbidden")),
  });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  const dc = d.cs.trangThai.dangCho;
  assert.ok(dc?.kieu === "ky" && dc.pha === "loi-kiem");
  assert.ok(!(dc.loi ?? "").includes("BI-MAT-123"), "lộ khoá RPC lên giao diện");
  assert.ok(!(dc.loi ?? "").includes("api-key"));
});

test("lỗi do chính ví soạn (LoiHienThiDuoc) vẫn hiện nguyên câu", async () => {
  const d = dung({ kiem: async () => Promise.reject(new LoiHienThiDuoc("RPC x không phải Solana Devnet — không kiểm, không ký.")) });
  ketNoi(d);
  d.tuDapp({ custos: 1, kieu: "ky", id: d.id(), giaoDich: sangBase64(txV0().serialize()) });
  await d.cho();
  const dc = d.cs.trangThai.dangCho;
  assert.ok(dc?.kieu === "ky" && /không phải Solana Devnet/.test(dc.loi ?? ""));
});

test("code-review 04/10 · dApp ngắt khi lời xin kết nối còn chờ ⇒ bỏ ghim origin, origin khác lại xin được", () => {
  const d = dung();
  d.tuDapp({ custos: 1, kieu: "ket-noi", id: d.id() });
  d.tuDapp({ custos: 1, kieu: "ngat", id: d.id() });
  assert.equal(d.cs.trangThai.originDapp, null, "giữ ghim origin của một kết nối chưa từng được cho phép");
  d.tuDapp({ custos: 1, kieu: "ket-noi", id: d.id() }, "https://dapp-khac.example");
  assert.equal(d.cs.trangThai.dangCho?.origin, "https://dapp-khac.example");
});

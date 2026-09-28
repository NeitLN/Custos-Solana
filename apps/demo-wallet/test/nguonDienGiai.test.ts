import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { giaiDongBangFacts } from "../../../packages/core/src/facts-io.ts";
import { dienGiaiKhongAI } from "@custos-solana/ai";
import { theoDoiDienGiai } from "../src/live/interpreter.ts";
import { ChuaCauHinhAI } from "../src/goiAiQuaServer.ts";

/*
 * CK-09 — NHÃN NGUỒN DIỄN GIẢI THEO ĐÚNG LƯỢT, THEO ĐÚNG CÂU ĐANG HIỆN.
 *
 * Roadmap: "Health check xanh không đồng nghĩa lượt cụ thể đã dùng AI. Model response đến
 * muộn không đổi inspection đang hiển thị." Bản trước ở Phòng phân tích đặt nhãn "do mô hình
 * viết" TRƯỚC khi gọi, nên khi bộ chắn lùi về câu mẫu hoặc quá hạn, câu mẫu vẫn mang nhãn AI.
 */
const facts = giaiDongBangFacts(
  readFileSync(fileURLToPath(new URL("../../../data/seed/facts/MN-04.json", import.meta.url)), "utf8"),
);
const json = (cau: string) => JSON.stringify({ detectedPrimaryAction: null, explanation: cau, aiAdvisory: null });
const CAU_DUNG = "Mô phỏng không thành công. Custos đọc hiểu 0/8 lệnh, nên chưa nói chắc giao dịch làm gì.";
const CAU_BI_CHAN = "Mô phỏng không thành công. Có 0 lệnh chưa đọc hiểu được.";
const nen = async () => (await dienGiaiKhongAI(facts, [], "vi")).explanation;

test("chưa chạy lượt nào ⇒ chưa có nhãn (không đoán trước)", () => {
  assert.equal(theoDoiDienGiai(null).nguon(), null);
});

test("không gọi mô hình ⇒ 'tatDinh'", async () => {
  const t = theoDoiDienGiai(null);
  const r = await t.interpreter(facts, [], "vi");
  assert.equal(r.explanation, await nen());
  assert.equal(t.nguon(), "tatDinh");
});

test("mô hình trả câu QUA bộ chắn ⇒ 'moHinh', và câu hiện đúng là câu mô hình", async () => {
  const t = theoDoiDienGiai(async () => json(CAU_DUNG));
  const r = await t.interpreter(facts, [], "vi");
  assert.equal(r.explanation, CAU_DUNG);
  assert.equal(t.nguon(), "moHinh");
});

test("mô hình trả lời nhưng BỘ CHẮN lùi về câu mẫu ⇒ KHÔNG được gắn nhãn AI", async () => {
  const t = theoDoiDienGiai(async () => json(CAU_BI_CHAN));
  const r = await t.interpreter(facts, [], "vi");
  assert.equal(r.explanation, await nen());
  assert.equal(t.nguon(), "moHinhBiChan");
});

test("server chưa cấu hình ⇒ 'chuaCauHinh'; lỗi khác ⇒ 'moHinhLoi'", async () => {
  const a = theoDoiDienGiai(async () => {
    throw new ChuaCauHinhAI();
  });
  await a.interpreter(facts, [], "vi");
  assert.equal(a.nguon(), "chuaCauHinh");
  const b = theoDoiDienGiai(async () => {
    throw new Error("server trả 500");
  });
  await b.interpreter(facts, [], "vi");
  assert.equal(b.nguon(), "moHinhLoi");
});

test("QUÁ HẠN ⇒ 'moHinhQuaHan'; mô hình trả MUỘN không đổi nhãn đã chốt", async () => {
  let tra!: (s: string) => void;
  const t = theoDoiDienGiai(() => new Promise<string>((ok) => (tra = ok)), 5);
  const r = await t.interpreter(facts, [], "vi");
  assert.equal(r.explanation, await nen());
  assert.equal(t.nguon(), "moHinhQuaHan");
  tra(json(CAU_DUNG));
  await new Promise((ok) => setTimeout(ok, 10));
  assert.equal(t.nguon(), "moHinhQuaHan", "câu về muộn đổi nhãn của kết quả đang hiện");
});

test("hai lần diễn giải trong MỘT lượt (đọc lại vì trộn nguồn): lần đầu về muộn không làm sai nhãn lần sau", async () => {
  let lan = 0;
  let traLan1!: (s: string) => void;
  const t = theoDoiDienGiai(() => {
    lan++;
    if (lan === 1) return new Promise<string>((ok) => (traLan1 = ok));
    return new Promise<string>((ok) => setTimeout(() => ok(json(CAU_BI_CHAN)), 15));
  }, 8);
  await t.interpreter(facts, [], "vi"); // lần 1 quá hạn
  const lan2 = t.interpreter(facts, [], "vi"); // lần 2 đang chạy
  traLan1(json(CAU_DUNG)); // lần 1 về muộn, GIỮA lúc lần 2 chạy
  await lan2;
  assert.equal(t.nguon(), "moHinhQuaHan", "lần 2 quá hạn (15 ms > 8 ms) — không được thành 'moHinh' nhờ lần 1");
});

test("Phòng phân tích: nhãn đặt CÙNG CHỖ với kết quả của đúng lượt, không đặt trước lúc gọi", () => {
  const app = readFileSync(fileURLToPath(new URL("../src/App.tsx", import.meta.url)), "utf8");
  assert.ok(!/setChieuDienGiai\("moHinh"\)/.test(app), "vẫn đặt nhãn AI trước khi mô hình trả lời");
  assert.ok(!/setChieuDienGiai\(e instanceof Error/.test(app), "lỗi của lượt cũ vẫn đổi được nhãn lượt mới");
  assert.ok((app.match(/theoDoiDienGiai\(/g) ?? []).length >= 1);
  // Mọi lần đặt kết quả thẻ cảnh báo kèm nhãn của chính lượt đó.
  assert.ok(/setKetQua\(r\);\s*\n\s*setChieuDienGiai\(/.test(app), "kết quả kịch bản không kèm nhãn của lượt");
});

test("CK-09 · MỌI trường thật sự gửi cho mô hình đều có câu công khai phạm vi — thêm trường mà quên nói thì đỏ", async () => {
  const { DU_LIEU_GUI_MO_HINH } = await import("../src/live/interpreter.ts");
  let daGui = "";
  const t = theoDoiDienGiai(async ({ user }) => {
    daGui = user;
    return json(CAU_DUNG);
  });
  await t.interpreter(facts, ["X"], "vi");
  const khoa = Object.keys(JSON.parse(daGui)).sort();
  assert.deepEqual(Object.keys(DU_LIEU_GUI_MO_HINH).sort(), khoa);
  const canhBao = readFileSync(fileURLToPath(new URL("../src/CanhBao.tsx", import.meta.url)), "utf8");
  assert.ok(/DU_LIEU_GUI_MO_HINH/.test(canhBao), "thẻ cảnh báo không hiện phạm vi dữ liệu gửi mô hình");
});

test("CK-04 · nhãn nguồn ngắn thấy được cạnh 'Xem chi tiết' khi CHƯA mở", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/CanhBao.tsx", import.meta.url)), "utf8");
  const i = src.indexOf('{moRong ? "Thu gọn" : "Xem chi tiết"}');
  const j = src.indexOf("{moRong && (", i);
  assert.ok(i > 0 && j > i);
  assert.ok(/NHAN_NGUON\[nguonChu\]\.ngan/.test(src.slice(i, j)), "nhãn ngắn chỉ hiện sau khi mở chi tiết");
});

test("Codex lần 3, mục 1 · lượt A quá hạn Ở L1, lượt B xong trước; A gọi L3 muộn KHÔNG được đè nhãn của B", async () => {
  const { ganNhanTheoLuot } = await import("../src/live/interpreter.ts");
  const nhan: string[] = [];
  let goi: import("@custos-solana/ai").GoiMoHinh | null = async () => json(CAU_DUNG);
  const g = ganNhanTheoLuot((s) => nhan.push(s), () => goi);
  // `inspect` giả: chờ L1 (tuỳ ca) rồi mới gọi L3 — đúng thứ tự của inspect thật.
  const inspectGia = (cho: Promise<void>) =>
    g.bocInspect(async (deps: { interpret?: import("@custos-solana/core").Interpreter }) => {
      await cho;
      return deps.interpret!(facts, [], "vi");
    });
  // Phiên gọi L3 qua interpreter do phiên dựng MỖI LẦN — như LiveSession.
  const deps = { interpret: (...a: Parameters<import("@custos-solana/core").Interpreter>) => g.interpreter()(...a) };
  let xongL1A!: () => void;
  const luotA = inspectGia(new Promise<void>((ok) => (xongL1A = ok)))(deps); // A kẹt ở L1
  goi = async () => json(CAU_BI_CHAN);
  await inspectGia(Promise.resolve())(deps); // B xong: bộ soi lùi ⇒ "moHinhBiChan"
  assert.deepEqual(nhan, ["moHinhBiChan"]);
  goi = async () => json(CAU_DUNG);
  xongL1A(); // A giờ mới gọi L3, mô hình trả câu hợp lệ
  await luotA;
  assert.deepEqual(nhan, ["moHinhBiChan"], "lượt A (đã bị bỏ) đè nhãn 'moHinh' lên kết quả của B");
});

test("Codex lần 3, mục 1 · màn thực thi dùng `ganNhanTheoLuot` và bọc `inspect` của phiên", () => {
  const src = readFileSync(fileURLToPath(new URL("../src/WalletExecution.tsx", import.meta.url)), "utf8");
  assert.ok(/ganNhanTheoLuot\(/.test(src) && /bocInspect\(inspect\)/.test(src), "thế hệ vẫn tăng lúc L3 bắt đầu");
});

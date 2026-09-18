import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chayLaiTuJson, chayLaiTuReceipt } from "../src/replay.ts";
import { dungReceipt, receiptRaJson, docReceipt } from "../src/receipt.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import type { Facts } from "../src/facts.ts";
import type { InspectResult } from "../../types/src/index.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

function mauCoFacts(): { facts: Facts; id: string } {
  const idx = JSON.parse(readFileSync(GOC + "data/seed/index.json", "utf8")) as {
    mau: Array<Record<string, unknown>>;
  };
  const m = idx.mau.find((x) => typeof x["facts"] === "string");
  assert.ok(m, "seed dataset không có mẫu nào kèm facts");
  return {
    facts: giaiDongBangFacts(readFileSync(GOC + "data/seed/" + m["facts"], "utf8")),
    id: String(m["id"]),
  };
}

/** Dựng `InspectResult` từ chính engine — không gõ tay verdict. */
function ketQuaThat(facts: Facts): InspectResult {
  const l2 = danhGia(facts);
  return {
    level: l2.level,
    aiAdvisory: null,
    detectedPrimaryAction: null,
    diff: [],
    reasonCodes: l2.reasonCodes,
    coverage: facts.coverage,
    explanation: "giải thích lúc xuất",
  };
}

test("CU-12 · chạy lại từ biên lai `rieng` cho ĐÚNG verdict đã ghi", () => {
  const { facts } = mauCoFacts();
  const json = receiptRaJson(dungReceipt(ketQuaThat(facts), "rieng", facts));

  const r = chayLaiTuJson(json);
  assert.ok(r.ok, `replay thất bại: ${r.ok === false ? r.loi : ""}`);
  assert.equal(r.chayLai.level, r.nguyenVan.level, "verdict chạy lại khác verdict đã ghi");
  assert.deepEqual(
    [...r.chayLai.reasonCodes].sort(),
    [...r.nguyenVan.reasonCodes].sort(),
    "mã lý do khác nhau",
  );
  assert.equal(r.engineDaDoi, false, "engine không đổi mà báo đã đổi");
  assert.equal(r.toanVen, true);
});

test("CU-12 · replay KHÔNG gọi mạng — đọc mã, không tin lời", () => {
  /*
   * "Replay offline" mà lén gọi RPC thì mọi kết luận rút ra từ nó đều vô giá trị.
   * Guard đọc mã nên nó đỏ ngay ở `npm test`, không cần dựng môi trường không mạng.
   *
   * Bỏ chú thích trước khi tìm: chú thích trong file này CÓ nhắc `Connection` và
   * `RPC`, và một guard khớp phải chú thích của chính nó là lỗi đã mắc hai lần
   * trong repo (xem CU-13).
   */
  const ma = readFileSync(fileURLToPath(new URL("../src/replay.ts", import.meta.url)), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const cam of ["Connection", "fetch(", "@solana/web3.js", "async ", "await "]) {
    assert.ok(!ma.includes(cam), `replay.ts có \`${cam}\` — không còn là offline`);
  }
});

test("CU-12 · biên lai `chiaSe` bị TỪ CHỐI replay, không bịa Facts", () => {
  /*
   * Đường quan trọng nhất của thẻ. Bản `chiaSe` trông rất giống bản đầy đủ, và
   * "dựng Facts rỗng rồi chạy" sẽ cho ra một verdict trông hợp lệ mà không dựa
   * trên gì cả — tệ hơn hẳn việc từ chối.
   */
  const { facts } = mauCoFacts();
  const json = receiptRaJson(dungReceipt(ketQuaThat(facts), "chiaSe", facts));

  const r = chayLaiTuJson(json);
  assert.equal(r.ok, false, "bản chia sẻ KHÔNG được replay");
  assert.ok(r.ok === false && /Facts/.test(r.loi), `lý do không nói rõ thiếu gì: ${r.ok === false ? r.loi : ""}`);
});

test("CU-12 · sửa MỘT byte ⇒ toàn vẹn sai, nhưng vẫn chạy lại được", () => {
  /*
   * Nghiệm thu đòi "sửa một byte gây integrity error". Nhưng *integrity error*
   * không được hiểu thành *từ chối đọc*: người ta cần xem biên lai bị sửa nói gì,
   * và cần biết nó đã bị sửa. Hai thông tin, hai trường.
   */
  const { facts } = mauCoFacts();
  const json = receiptRaJson(dungReceipt(ketQuaThat(facts), "rieng", facts));

  const sua = json.replace('"explanation": "giải thích lúc xuất"', '"explanation": "giải thích lúc xuấT"');
  assert.notEqual(sua, json, "phép sửa không đổi gì — ca kiểm vô nghĩa");

  const r = chayLaiTuJson(sua);
  assert.ok(r.ok, "biên lai bị sửa vẫn phải chạy lại được");
  assert.equal(r.toanVen, false, "sửa một byte mà vẫn báo toàn vẹn");

  const goc = chayLaiTuJson(json);
  assert.ok(goc.ok && goc.toanVen, "biên lai chưa sửa phải toàn vẹn");
});

test("CU-12 · engine đổi ⇒ trả CẢ HAI verdict, không im lặng chọn một", () => {
  /*
   * Dựng tình huống bằng cách sửa verdict ĐÃ GHI trong biên lai — tương đương
   * biên lai xuất bởi một phiên bản engine khác.
   *
   * Điều bài này canh: `engineDaDoi` bật, VÀ cả hai verdict cùng có mặt. Chọn một
   * rồi im lặng là giấu đúng thông tin người đọc cần.
   */
  const { facts } = mauCoFacts();
  const that = ketQuaThat(facts);
  const khac: InspectResult = {
    ...that,
    level: that.level === "danger" ? "warning" : "danger",
    reasonCodes: ["MA_CU_KHONG_CON"],
  };

  const r = chayLaiTuReceipt(dungReceipt(khac, "rieng", facts), true);
  assert.ok(r.ok);
  assert.equal(r.engineDaDoi, true, "hai verdict khác nhau mà không báo engine đã đổi");
  assert.equal(r.nguyenVan.level, khac.level, "mất verdict đã ghi");
  assert.equal(r.chayLai.level, that.level, "mất verdict engine hiện tại");
});

test("CU-12 · `engineDaDoi` KHÔNG bật vì L3 vắng mặt — đối chứng", () => {
  /*
   * ĐỐI CHỨNG quan trọng nhất của file này.
   *
   * L3 không chạy lúc replay, nên `explanation` và `aiAdvisory` luôn khác biên
   * lai gốc. Nếu `khacNhau()` so cả chúng thì `engineDaDoi` bật ở MỌI lượt — cờ
   * luôn bật là cờ vô dụng, và bài "engine đổi" ở trên vẫn xanh.
   */
  const { facts } = mauCoFacts();
  const co = { ...ketQuaThat(facts), explanation: "câu dài do mô hình sinh", aiAdvisory: "review_required" as const };

  const r = chayLaiTuReceipt(dungReceipt(co, "rieng", facts), true);
  assert.ok(r.ok);
  assert.equal(r.engineDaDoi, false, "L3 vắng mặt bị đọc nhầm thành engine đã đổi");
  assert.equal(r.chayLai.aiAdvisory, null, "replay không được tự dựng aiAdvisory");
  assert.equal(r.chayLai.explanation, "", "replay không được bịa lời giải thích");
});

test("CU-12 · nhãn `Dữ liệu ghi lại` đi CÙNG kết quả, không nằm trong README", () => {
  const { facts } = mauCoFacts();
  const r = chayLaiTuReceipt(dungReceipt(ketQuaThat(facts), "rieng", facts, new Date("2026-09-18T10:30:00Z")), true);
  assert.ok(r.ok);
  assert.equal(r.nhan.nguon, "du_lieu_ghi_lai");
  assert.match(r.nhan.cau, /Dữ liệu ghi lại/, "nhãn không nói rõ đây là dữ liệu cũ");
  assert.match(r.nhan.cau, /không phải trạng thái chuỗi hiện tại/, "nhãn không cảnh báo về độ mới");
  assert.equal(r.nhan.taoLuc, "2026-09-18T10:30:00.000Z");
});

test("CU-12 · payload không tin cậy bị từ chối, không ném", () => {
  const XAU = ["", "{{{", "null", "[]", '{"phienBan":999,"cheDo":"rieng","hash":"x"}', '{"facts":{}}'];
  for (const s of XAU) {
    const r = chayLaiTuJson(s);
    assert.equal(r.ok, false, `đáng lẽ phải từ chối: ${s.slice(0, 30)}`);
    assert.ok(r.ok === false && r.loi.length > 0, "từ chối mà không nói lý do");
  }
});

test("CU-12 · replay dùng ĐÚNG bộ luật của sản phẩm, không có bộ thứ hai", () => {
  /*
   * Thẻ dặn "không tạo bộ luật offline riêng". Bài này so kết quả replay với lời
   * gọi `danhGia()` trực tiếp — lệch nghĩa là đã có bộ luật thứ hai ở đâu đó.
   */
  const { facts } = mauCoFacts();
  const truc = danhGia(facts);
  const r = chayLaiTuReceipt(dungReceipt(ketQuaThat(facts), "rieng", facts), true);

  assert.ok(r.ok);
  assert.equal(r.chayLai.level, truc.level);
  assert.deepEqual([...r.chayLai.reasonCodes].sort(), [...truc.reasonCodes].sort());
  assert.equal(r.chayLai.coverage.analyzed, facts.coverage.analyzed, "coverage bị tính lại thay vì đọc từ Facts");
});

test("CU-12 · chạy lại NHIỀU mẫu của corpus, không chỉ một", () => {
  /*
   * Một mẫu duy nhất có thể đúng vì may. Bài này chạy toàn bộ mẫu có `facts` và
   * đòi mọi mẫu round-trip được.
   */
  const idx = JSON.parse(readFileSync(GOC + "data/seed/index.json", "utf8")) as {
    mau: Array<Record<string, unknown>>;
  };
  const coFacts = idx.mau.filter((m) => typeof m["facts"] === "string");
  assert.ok(coFacts.length >= 5, `chỉ có ${coFacts.length} mẫu kèm facts — quá ít để kết luận`);

  let dem = 0;
  for (const m of coFacts) {
    const f = giaiDongBangFacts(readFileSync(GOC + "data/seed/" + m["facts"], "utf8"));
    const r = chayLaiTuJson(receiptRaJson(dungReceipt(ketQuaThat(f), "rieng", f)));
    assert.ok(r.ok, `${m["id"]}: replay thất bại`);
    assert.equal(r.engineDaDoi, false, `${m["id"]}: verdict lệch sau round-trip`);
    dem++;
  }
  assert.equal(dem, coFacts.length);
});

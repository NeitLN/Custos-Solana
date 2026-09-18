import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  dungReceipt,
  docReceipt,
  receiptRaJson,
  factsTuReceipt,
  PHIEN_BAN_RECEIPT,
} from "../src/receipt.ts";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import type { InspectResult } from "../../types/src/index.ts";
import type { Facts } from "../src/facts.ts";

/**
 * Một fixture THẬT từ seed dataset — không tự bịa Facts.
 *
 * Bịa Facts ở đây sẽ làm bài "secret nằm sâu trong Facts" trở nên vô nghĩa: tôi sẽ
 * vô tình dựng một cấu trúc nông hơn thực tế và bài vẫn xanh.
 */
function factsThat(): Facts {
  const p = fileURLToPath(new URL("../../../data/seed/", import.meta.url));
  const idx = JSON.parse(readFileSync(p + "index.json", "utf8")) as { mau: Array<Record<string, unknown>> };
  const coFacts = idx.mau.find((m) => typeof m["facts"] === "string");
  assert.ok(coFacts, "seed dataset không có mẫu nào kèm facts");
  return giaiDongBangFacts(readFileSync(p + (coFacts["facts"] as string), "utf8"));
}

const ketQua = (them: Partial<InspectResult> = {}): InspectResult => ({
  level: "warning",
  aiAdvisory: null,
  detectedPrimaryAction: null,
  diff: [{ label: "Số dư", before: "500", after: "0", severity: "danger" }],
  reasonCodes: ["R01"],
  coverage: { analyzed: 1, total: 2, unverifiedPrograms: 1 },
  explanation: "giải thích",
  ...them,
});

/* ── Corpus secret giả — tiêu chí nghiệm thu số 1 ───────────────────────────── */

/**
 * Hai nhóm secret mà người dùng chọn cho CU-11, mỗi nhóm là rủi ro ĐÃ ĐO trong
 * repo này chứ không phải lo xa:
 *
 *   RPC credential — `VITE_RPC` do người chạy demo đặt, và RPC thương mại để
 *     credential trong query (`?api-key=…`) hoặc trong path. Lỗi RPC mang nguyên
 *     URL vào `simulationError`, và `simulationError` đi thẳng vào biên lai.
 *
 *   Đường dẫn máy — chính bug đã sửa ở commit `e112ddd`: lỗi Node mang
 *     `C:\Users\<tên>\…` vào nhật ký công khai.
 */
const CORPUS_SECRET: Array<[string, string, RegExp]> = [
  ["Helius api-key", "https://mainnet.helius-rpc.com/?api-key=abc123-secret-key", /abc123-secret-key/],
  ["QuickNode token", "https://x.solana-mainnet.quiknode.pro/9f8e7d6c5b4a3210/", /9f8e7d6c5b4a3210/],
  ["Alchemy path", "https://solana-mainnet.g.alchemy.com/v2/RG9fS3cRe7Key", /RG9fS3cRe7Key/],
  ["đường dẫn Windows", "ENOENT: open 'C:" + String.fromCharCode(92) + "Users" + String.fromCharCode(92) + "Viet Tien" + String.fromCharCode(92) + ".config" + String.fromCharCode(92) + "id.json'", /Viet Tien/],
  ["đường dẫn POSIX", "Cannot find module '/home/nguoidung/duan/secret.json'", /nguoidung/],
];

test("CU-11 · corpus secret giả KHÔNG lọt vào biên lai, ở cả hai chế độ", () => {
  for (const [ten, doc, loRa] of CORPUS_SECRET) {
    for (const cheDo of ["rieng", "chiaSe"] as const) {
      // Secret đi vào qua chữ tự do — đường thật của nó là `simulationError`
      // được L3 kể lại, hoặc `explanation`.
      const r = dungReceipt(
        ketQua({ explanation: `mô phỏng hỏng: ${doc}` }),
        cheDo,
        factsThat(),
      );
      const json = receiptRaJson(r);
      assert.ok(!loRa.test(json), `${ten} (${cheDo}) lọt ra biên lai:\n${json.slice(0, 400)}`);
    }
  }
});

test("CU-11 · secret nằm SÂU trong Facts cũng bị che — đối chứng", () => {
  /*
   * ĐỐI CHỨNG cho bài trên. Bài trên chỉ đặt secret ở `explanation`, tức tầng một.
   * Nếu `cheSauRong` chỉ che tầng mặt thì bài đó vẫn xanh trong khi Facts — phần
   * lớn nhất của biên lai chế độ `rieng` — vẫn hở.
   */
  const f = factsThat();
  const ban = {
    ...f,
    simulationError: "failed: https://rpc.example.com/?api-key=SECRET-TRONG-FACTS",
  };
  const json = receiptRaJson(dungReceipt(ketQua(), "rieng", ban));
  assert.ok(!/SECRET-TRONG-FACTS/.test(json), "secret trong Facts không bị che");
});

test("CU-11 · che nhưng GIỮ thông tin chẩn đoán — đối chứng", () => {
  /*
   * Hai bài trên cũng xanh nếu biên lai xoá sạch mọi chuỗi. Biên lai trống thì
   * không nói được gì, và "không lọt secret" trở thành vô nghĩa.
   */
  const r = dungReceipt(ketQua({ explanation: "đọc hiểu 2/3 lệnh, mô phỏng thất bại" }), "rieng", factsThat());
  assert.match(r.ketQua.explanation, /đọc hiểu 2\/3 lệnh/, "mất thông tin chẩn đoán");
  assert.equal(r.ketQua.level, "warning", "mất verdict");
  assert.equal(r.ketQua.reasonCodes.length, 1, "mất mã lý do");
});

/* ── Round-trip: bigint, Unicode, thiếu trường ──────────────────────────────── */

test("CU-11 · round-trip giữ nguyên bigint trong Facts", () => {
  /*
   * KHÔNG đọc `phiUocTinh` ở đây, dù nó là bigint rõ ràng nhất.
   *
   * Bản đầu của bài này đỏ với "phiUocTinh thành undefined", và tôi suýt đi sửa
   * `receipt.ts`. Đo lại thì `data/seed/facts/R01-pos.json` **không hề có** trường
   * đó — fixture được đóng băng trước khi `phiUocTinh` tồn tại. Đúng cái bẫy đã
   * ghi trong CU-16.
   *
   * Nên bài đọc bigint TỪ CHÍNH fixture: đi tìm mọi bigint thật sự có mặt, rồi
   * đòi tất cả sống sót. Thêm trường mới vào Facts cũng không làm bài này giòn.
   */
  const f = factsThat();
  const r = dungReceipt(ketQua(), "rieng", f);
  const lai = factsTuReceipt(r);
  assert.ok(lai, "chế độ rieng phải lấy lại được Facts");

  const timBigint = (x: unknown, duong = "facts"): Array<[string, bigint]> => {
    if (typeof x === "bigint") return [[duong, x]];
    if (Array.isArray(x)) return x.flatMap((v, i) => timBigint(v, `${duong}[${i}]`));
    if (x && typeof x === "object") {
      return Object.entries(x).flatMap(([k, v]) => timBigint(v, `${duong}.${k}`));
    }
    return [];
  };

  const goc = timBigint(f);
  assert.ok(goc.length > 0, "fixture không có bigint nào — bài này không kiểm được gì");

  const sau = new Map(timBigint(lai).map(([d, v]) => [d, v]));
  for (const [duong, v] of goc) {
    assert.ok(sau.has(duong), `${duong}: bigint biến mất sau round-trip`);
    assert.equal(sau.get(duong), v, `${duong}: giá trị đổi`);
  }
  assert.equal(sau.size, goc.length, "số bigint sau round-trip khác lúc đầu");
});

test("CU-11 · Unicode và ký tự điều khiển đi qua an toàn", () => {
  const CA: Array<[string, string]> = [
    ["tiếng Việt có dấu", "Cần xem kỹ — đổi chủ tài khoản"],
    ["emoji", "cảnh báo 🚨 nghiêm trọng"],
    ["CJK", "警告：帐户所有权已更改"],
    ["RTL", "تحذير"],
  ];
  for (const [ten, chu] of CA) {
    const r = dungReceipt(ketQua({ explanation: chu }), "chiaSe");
    const doc = docReceipt(receiptRaJson(r));
    assert.ok(doc.ok, `${ten}: không đọc lại được`);
    assert.equal(doc.receipt.ketQua.explanation, chu, `${ten}: chữ bị đổi`);
    assert.ok(doc.toanVen, `${ten}: hash không khớp sau round-trip`);
  }

  // Ký tự điều khiển thì BỊ bỏ — nó chèn dòng giả vào bản đọc được.
  const bomBidi = dungReceipt(ketQua({ explanation: "an toàn\u202Everything" }), "chiaSe");
  assert.ok(!/\u202E/.test(receiptRaJson(bomBidi)), "ký tự đảo chiều Bidi lọt vào biên lai");
});

test("CU-11 · thiếu trường và JSON hỏng bị từ chối, không ném", () => {
  const XAU: Array<[string, string]> = [
    ["rỗng", ""],
    ["không phải JSON", "{{{"],
    ["null", "null"],
    ["mảng", "[]"],
    ["thiếu phienBan", JSON.stringify({ cheDo: "rieng", hash: "x" })],
    ["thiếu hash", JSON.stringify({ phienBan: PHIEN_BAN_RECEIPT, cheDo: "rieng" })],
    ["cheDo lạ", JSON.stringify({ phienBan: PHIEN_BAN_RECEIPT, cheDo: "cong-khai", hash: "x" })],
    ["phienBan tương lai", JSON.stringify({ phienBan: PHIEN_BAN_RECEIPT + 99, cheDo: "rieng", hash: "x" })],
  ];
  for (const [ten, s] of XAU) {
    const r = docReceipt(s);
    assert.equal(r.ok, false, `${ten}: đáng lẽ phải bị từ chối`);
    assert.ok(r.ok === false && r.loi.length > 0, `${ten}: từ chối mà không nói lý do`);
  }
});

/* ── not_replayable và toàn vẹn ─────────────────────────────────────────────── */

test("CU-11 · bản chia sẻ tự khai KHÔNG replay được, kèm lý do", () => {
  const r = dungReceipt(ketQua(), "chiaSe", factsThat());
  assert.notEqual(r.khongReplayDuoc, null, "bản chia sẻ phải tự khai không replay được");
  assert.match(r.khongReplayDuoc!, /Facts/, "lý do phải nói rõ thiếu gì");
  assert.equal(r.facts, undefined, "bản chia sẻ KHÔNG được mang Facts");
  assert.equal(factsTuReceipt(r), null, "bản chia sẻ không được trả Facts");
});

test("CU-11 · chế độ rieng THIẾU Facts cũng khai, không giả vờ đầy đủ", () => {
  const r = dungReceipt(ketQua(), "rieng");
  assert.notEqual(r.khongReplayDuoc, null, "thiếu Facts mà vẫn khai replay được");
  assert.equal(factsTuReceipt(r), null);
});

test("CU-11 · sửa một byte làm hash không khớp, nhưng vẫn ĐỌC được", () => {
  /*
   * `toanVen` tách khỏi `ok` có chủ ý: biên lai bị sửa là tình huống khác hẳn biên
   * lai hỏng. Gộp lại là buộc người gọi đoán xem chuyện gì đã xảy ra.
   */
  const json = receiptRaJson(dungReceipt(ketQua(), "chiaSe"));
  const sua = json.replace('"level": "warning"', '"level": "safe"');
  assert.notEqual(sua, json, "phép sửa không đổi gì — ca kiểm vô nghĩa");

  const r = docReceipt(sua);
  assert.ok(r.ok, "biên lai bị sửa vẫn phải đọc được");
  assert.equal(r.toanVen, false, "sửa nội dung mà hash vẫn khớp");

  const goc = docReceipt(json);
  assert.ok(goc.ok && goc.toanVen, "biên lai chưa sửa phải toàn vẹn");
});

test("CU-11 · biên lai KHÔNG chứa raw tx, chữ ký, và tự khai giới hạn", () => {
  const r = dungReceipt(ketQua(), "rieng", factsThat());
  const json = receiptRaJson(r);

  for (const cam of ["rawTx", "signature", "signatures", "secretKey", "privateKey"]) {
    assert.ok(!new RegExp(`"${cam}"`).test(json), `biên lai chứa trường cấm: ${cam}`);
  }

  // Giới hạn đi CÙNG biên lai ra ngoài, không nằm trong README.
  const chu = r.ranhGioi.join(" ");
  assert.match(chu, /KHÔNG phải chữ ký/, "không tự khai hash ≠ chữ ký");
  assert.match(chu, /KHÔNG phải ẩn danh/, "không tự khai che ≠ ẩn danh");
  assert.match(chu, /L2/, "không tự khai level đến từ engine luật");
});

test("CU-11 · hash KHÔNG tự khớp khi đổi chế độ — đối chứng", () => {
  /*
   * Bài toàn vẹn ở trên cũng xanh nếu `tinhHash` trả hằng số. Bài này đòi hai biên
   * lai khác nội dung phải cho hai hash khác nhau.
   */
  const a = dungReceipt(ketQua(), "chiaSe", undefined, new Date("2026-09-18T00:00:00Z"));
  const b = dungReceipt(ketQua(), "rieng", factsThat(), new Date("2026-09-18T00:00:00Z"));
  assert.notEqual(a.hash, b.hash, "hash không phụ thuộc nội dung");
  assert.equal(a.hash.length, 64, "không phải sha256 hex");
});

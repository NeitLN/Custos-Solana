import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Keypair, SystemProgram, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { extractFacts } from "../src/l1/fetch.ts";
import { danhGia } from "../src/l2/evaluate.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CU-03 — NGỮ CẢNH MÔ PHỎNG, và một giả thuyết bị chính phép đo bác bỏ.
 *
 * Trước thẻ này, toàn bộ ngữ cảnh RPC bị nén thành MỘT BIT (`simulationOk`). Một
 * lượt mô phỏng thành công và một lượt mô phỏng thành công TRÊN BLOCKHASH KHÁC
 * trông y hệt nhau — trong khi chúng nói hai điều rất khác nhau về việc message
 * gốc có còn gửi được không.
 *
 * ## Một giả thuyết đã bị chính phép đo bác bỏ
 *
 * Lần đo đầu trên Devnet cho: blockhash tươi ⇒ `replacementBlockhash` giống hệt
 * gốc; blockhash slot −300 ⇒ khác gốc. Nhìn như một phép đo lifetime hoàn hảo.
 *
 * Lặp lại thì bác bỏ: với blockhash **vừa lấy xong**, RPC vẫn trả hash khác — ba
 * lượt liên tiếp đều khác, không phụ thuộc options. Lượt đầu là ngoại lệ.
 *
 * Nên `chayTrenBlockhashGoc === false` KHÔNG có nghĩa blockhash hết hạn. Nó chỉ
 * nói: **kết quả mô phỏng mô tả một message khác với message sẽ được ký** — đúng
 * điều mục 4.4 đòi ghi lại, và là ngữ cảnh để trình bày trung thực chứ không phải
 * tín hiệu rủi ro.
 *
 * Bộ này chạy OFFLINE bằng fake connection — hành vi RPC đã đo riêng và ghi ở
 * `facts.ts`. Bài live nằm trong `thu-tich-hop:devnet`.
 */

const VI = Keypair.generate();
const LA = Keypair.generate();

function txVoi(blockhash: string): VersionedTransaction {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: VI.publicKey,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({ fromPubkey: VI.publicKey, toPubkey: LA.publicKey, lamports: 1 }),
      ],
    }).compileToV0Message(),
  );
}

/** Connection giả: trả đúng thứ cần để `extractFacts` chạy hết, không chạm mạng. */
function connGia(opts: {
  replacementBlockhash?: { blockhash: string; lastValidBlockHeight: number } | null;
  slot?: number;
  apiVersion?: string;
  unitsConsumed?: number;
  err?: unknown;
  nem?: boolean;
}) {
  return {
    getFeeForMessage: async () => ({ value: 5000 }),
    getMultipleAccountsInfo: async (keys: unknown[]) => keys.map(() => null),
    getAddressLookupTable: async () => ({ value: null }),
    getSignaturesForAddress: async () => [],
    simulateTransaction: async () => {
      if (opts.nem) throw new Error("RPC chết");
      return {
        context: { slot: opts.slot ?? 123, apiVersion: opts.apiVersion ?? "4.3.0-rc.0" },
        value: {
          err: opts.err ?? null,
          accounts: null,
          logs: [],
          unitsConsumed: opts.unitsConsumed ?? 450,
          innerInstructions: [],
          ...(opts.replacementBlockhash === undefined
            ? {}
            : { replacementBlockhash: opts.replacementBlockhash }),
        },
      };
    },
  } as never;
}

const BH_A = "11111111111111111111111111111111";
const BH_B = "So11111111111111111111111111111111111111112";

test("CU-03 · RPC dùng ĐÚNG blockhash gốc ⇒ chayTrenBlockhashGoc = true", async () => {
  /*
   * Ca HIẾM trên Devnet — đo lặp lại cho thấy RPC hầu như luôn thay hash khác, kể
   * cả với blockhash vừa lấy xong. Vẫn phải đúng khi nó xảy ra.
   */
  const f = await extractFacts(
    connGia({ replacementBlockhash: { blockhash: BH_A, lastValidBlockHeight: 999 } }),
    txVoi(BH_A),
  );
  assert.ok(f.nguCanh, "phải có ngữ cảnh");
  assert.equal(f.nguCanh!.blockhashGoc, BH_A);
  assert.equal(f.nguCanh!.blockhashThayThe, BH_A);
  assert.equal(f.nguCanh!.chayTrenBlockhashGoc, true);
});

test("CU-03 · RPC thay hash KHÁC ⇒ chayTrenBlockhashGoc = false", async () => {
  /*
   * Ca THƯỜNG GẶP — đo trên Devnet: hầu hết mọi lượt đều rơi vào đây.
   *
   * Mô phỏng vẫn PASS, nhưng nó nói về một message KHÁC với message sẽ được ký.
   * Đúng điều mục 4.4 đòi ghi lại: *"thành công của simulation đã thay blockhash
   * không chứng minh message gốc còn gửi được"*.
   *
   * KHÔNG được đọc thành "blockhash gốc đã hết hạn" — phép đo lặp lại đã bác bỏ
   * cách đọc đó.
   */
  const f = await extractFacts(
    connGia({ replacementBlockhash: { blockhash: BH_B, lastValidBlockHeight: 999 } }),
    txVoi(BH_A),
  );
  assert.equal(f.nguCanh!.chayTrenBlockhashGoc, false);
  assert.equal(f.nguCanh!.blockhashGoc, BH_A);
  assert.equal(f.nguCanh!.blockhashThayThe, BH_B);
  // Và nó KHÔNG được biến thành lỗi mô phỏng.
  assert.equal(f.simulationOk, true, "hash khác không phải lỗi mô phỏng");
});

test("CU-03 · RPC KHÔNG khai replacementBlockhash ⇒ null, KHÔNG phải true", async () => {
  /*
   * Fail-safe của dự án: thiếu dữ liệu không bao giờ được đọc thành kết luận có
   * lợi. Một provider không trả trường này thì ta KHÔNG BIẾT nó chạy trên hash
   * nào — và `true` ở đây là nói rằng ta biết.
   */
  const f = await extractFacts(connGia({ replacementBlockhash: undefined }), txVoi(BH_A));
  assert.equal(f.nguCanh!.blockhashThayThe, null);
  assert.equal(f.nguCanh!.chayTrenBlockhashGoc, null, "không đủ dữ liệu phải là null");
  assert.notEqual(f.nguCanh!.chayTrenBlockhashGoc, true);
});

test("CU-03 · ngữ cảnh được ghi KỂ CẢ khi mô phỏng lỗi", async () => {
  /*
   * Ghi ngữ cảnh phải xảy ra TRƯỚC khi xét `v.err`. Đặt sau thì một lượt hỏng sẽ
   * không có slot lẫn apiVersion — mà đó đúng là lúc người đọc cần biết nhất lượt
   * đo diễn ra ở đâu.
   */
  const f = await extractFacts(
    connGia({ err: "AccountNotFound", slot: 777, replacementBlockhash: { blockhash: BH_A, lastValidBlockHeight: 5 } }),
    txVoi(BH_A),
  );
  assert.equal(f.simulationOk, false, "tiền đề: mô phỏng phải hỏng");
  assert.equal(f.nguCanh!.slot, 777, "lượt hỏng vẫn phải ghi slot");
  assert.equal(f.nguCanh!.apiVersion, "4.3.0-rc.0");
});

test("CU-03 · RPC ném lỗi ⇒ ngữ cảnh toàn null, không có số bịa", async () => {
  const f = await extractFacts(connGia({ nem: true }), txVoi(BH_A));
  assert.equal(f.simulationOk, false);
  assert.equal(f.nguCanh!.slot, null);
  assert.equal(f.nguCanh!.blockhashThayThe, null);
  assert.equal(f.nguCanh!.chayTrenBlockhashGoc, null);
  // `blockhashGoc` đọc từ transaction nên vẫn có — nó không đến từ RPC.
  assert.equal(f.nguCanh!.blockhashGoc, BH_A);
});

test("CU-03 · blockhash khác KHÔNG được nâng verdict", async () => {
  /*
   * BÀI ĐỐI CHỨNG, và là bài dễ làm sai nhất.
   *
   * `replaceRecentBlockhash: true` là BẮT BUỘC với giao dịch chưa ký, nên hash bị
   * thay là chuyện vận hành bình thường — không phải dấu hiệu tấn công. Nâng
   * verdict vì nó sẽ biến mọi giao dịch có blockhash cũ thành Vàng, đúng cái bẫy
   * quyết định số 6 của CLAUDE.md cấm: *"Gắn Đỏ cho sự tồn tại của một tính năng
   * là cách nhanh nhất tạo false positive"*.
   *
   * Ngữ cảnh là thứ để NÓI RA, không phải để cảnh báo.
   */
  const giong = await extractFacts(
    connGia({ replacementBlockhash: { blockhash: BH_A, lastValidBlockHeight: 9 } }),
    txVoi(BH_A),
  );
  const khac = await extractFacts(
    connGia({ replacementBlockhash: { blockhash: BH_B, lastValidBlockHeight: 9 } }),
    txVoi(BH_A),
  );
  assert.equal(giong.nguCanh!.chayTrenBlockhashGoc, true);
  assert.equal(khac.nguCanh!.chayTrenBlockhashGoc, false, "tiền đề: hai ca phải khác nhau");

  const a = danhGia(giong);
  const b = danhGia(khac);
  assert.equal(a.level, b.level, "blockhash bị thay đã làm đổi verdict — không được");
  assert.deepEqual(a.reasonCodes, b.reasonCodes, "blockhash bị thay đã thêm mã lý do");
});

test("CU-03 · `nguCanh` là trường TUỲ CHỌN — Facts cũ vẫn hợp lệ", () => {
  /*
   * Ràng buộc CU-01: mở rộng bằng trường tuỳ chọn, không phá hợp đồng. Fixture và
   * test dựng `Facts` bằng tay không có `nguCanh`, và chúng phải chạy nguyên vẹn —
   * 740 bài hiện có là phép kiểm đó.
   */
  const s = doc("packages/core/src/facts.ts");
  assert.match(s, /nguCanh\?: NguCanhMoPhong;/, "`nguCanh` phải là tuỳ chọn");
});

test("CU-03 · ghi ngữ cảnh TRƯỚC khi xét lỗi — đọc mã", () => {
  // Thứ tự này là điều kiện của bài "ghi kể cả khi lỗi" ở trên; neo lại để một bản
  // sửa sau không lặng lẽ đảo nó.
  const s = doc("packages/core/src/l1/fetch.ts").replace(/\/\*[\s\S]*?\*\//g, "");
  const iGhi = s.indexOf("nguCanh = {");
  const iLoi = s.indexOf("if (v.err) {");
  assert.ok(iGhi > 0 && iLoi > 0, "không tìm thấy hai mốc");
  assert.ok(iGhi < iLoi, "ngữ cảnh phải được ghi trước nhánh xét lỗi");
});

test("CU-03 · tài liệu KHÔNG được khai `false` là blockhash hết hạn", () => {
  /*
   * NEO MỘT SỰ THẬT ĐÃ ĐO, chống lại cách đọc sai hấp dẫn nhất.
   *
   * `chayTrenBlockhashGoc === false` trông rất giống một phép đo lifetime, và tôi
   * đã suýt xây tính năng cảnh báo lên trên nó trước khi lặp lại phép đo. Bài này
   * tồn tại để lần sau không ai đi lại đúng đường đó mà không thấy gì cản.
   */
  const s = doc("packages/core/src/facts.ts");
  const i = s.indexOf("chayTrenBlockhashGoc");
  assert.ok(i > 0, "không tìm thấy trường");
  const khoi = s.slice(Math.max(0, i - 2600), i + 200);
  assert.match(
    khoi,
    /KHÔNG đo được lifetime|không có nghĩa blockhash gốc hết hạn/i,
    "tài liệu của trường phải nói rõ nó KHÔNG đo lifetime",
  );
  assert.match(khoi, /ngoại lệ|bác bỏ/i, "phải ghi lại phép đo đã bác bỏ giả thuyết");
});

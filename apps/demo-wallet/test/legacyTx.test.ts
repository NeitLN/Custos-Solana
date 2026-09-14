import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VersionedTransaction,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import { extractFacts } from "../../../packages/core/src/l1/fetch.ts";

/**
 * TB-B03 — HỌ CA "LEGACY" CỦA MA TRẬN MỤC 16.
 *
 * Ô này là ô duy nhất của ma trận mà rà lại thấy **trống thật**: hành vi đúng, và
 * không một bài kiểm nào khoá nó lại. Cả repo không có một dòng mã nào nhắc tới chữ
 * `legacy` — nên nếu ai đó siết `extractFacts` theo hướng chỉ nhận v0, không gì đỏ.
 *
 * Điều đo được trước khi viết file này:
 *
 *   · `VersionedTransaction.deserialize` **nhận** byte legacy và trả
 *     `message.version === "legacy"`.
 *   · `message.addressTableLookups` là `[]`, không phải `undefined`.
 *   · `extractFacts` chạy trọn vẹn: `nguoiKy` 1, `instructions` 1, coverage 1/1.
 *
 * Nên đây **không phải bản vá**, và file này không được đọc thành một bản vá. Nó
 * khoá một hành vi đang đúng, và ghi phạm vi của nó: Custos đi qua đường
 * `VersionedTransaction`, nên legacy được hỗ trợ **qua bề mặt API đó** — đúng chữ
 * của ma trận: *"Giao dịch legacy qua bề mặt API được hỗ trợ"*.
 */

/** Connection giả: mọi account null, mô phỏng thành công, không ALT. */
const connRong = {
  getSignaturesForAddress: async () => [],
  getMultipleAccountsInfo: async (k: unknown[]) => k.map(() => null),
  getFeeForMessage: async () => ({ value: 5000 }),
  getAddressLookupTable: async () => ({ value: null }),
  simulateTransaction: async () => ({
    value: { err: null, logs: [], accounts: [], unitsConsumed: 150 },
  }),
};

/** Dựng một giao dịch legacy thật rồi đưa qua `VersionedTransaction.deserialize`. */
function txLegacy(): VersionedTransaction {
  const kp = Keypair.generate();
  const t = new Transaction();
  t.add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: Keypair.generate().publicKey,
      lamports: 1000,
    }),
  );
  t.recentBlockhash = "11111111111111111111111111111111";
  t.feePayer = kp.publicKey;
  return VersionedTransaction.deserialize(
    t.serialize({ requireAllSignatures: false, verifySignatures: false }),
  );
}

test("giao dịch legacy đi qua `VersionedTransaction` và giữ đúng nhãn version", () => {
  /*
   * Bài này canh giả định nền của mọi bài dưới. Nếu web3.js đổi cách nhận byte
   * legacy, cả họ ca này sai từ gốc chứ không phải sai ở Custos.
   */
  const tx = txLegacy();
  assert.equal(tx.message.version, "legacy");
  assert.deepEqual(
    tx.message.addressTableLookups,
    [],
    "legacy phải có mảng ALT RỖNG, không phải undefined — `extractFacts` đọc trường này",
  );
});

test("`extractFacts` chạy trọn vẹn trên giao dịch legacy", async () => {
  /*
   * Đây là điều thật sự cần khoá: một thay đổi ở L1 giả định `message.version === 0`
   * hoặc giả định có `addressTableLookups` khác rỗng sẽ làm bài này đỏ.
   */
  const f = await extractFacts(connRong as never, txLegacy());

  assert.equal(f.nguoiKy.length, 1, "legacy một người ký phải ra đúng một `nguoiKy`");
  assert.equal(f.instructions.length, 1);
  assert.equal(f.simulationOk, true, "legacy không được tự rơi vào nhánh mô phỏng hỏng");
  assert.equal(f.coverage.total, 1);
  assert.equal(
    f.coverage.analyzed,
    1,
    "SystemProgram.transfer là chương trình đã xác minh — legacy không được làm mất coverage",
  );
});

test("legacy KHÔNG bị đối xử như có Address Lookup Table", async () => {
  /*
   * Ranh giới dễ trôi: một giao dịch legacy không thể có ALT. Nếu L1 gọi
   * `getAddressLookupTable` cho nó thì hoặc mã đang đoán sai kiểu, hoặc một nhánh v0
   * chạy nhầm — cả hai đều đáng đỏ.
   */
  let soLanHoiALT = 0;
  const conn = {
    ...connRong,
    getAddressLookupTable: async () => {
      soLanHoiALT++;
      return { value: null };
    },
  };
  await extractFacts(conn as never, txLegacy());
  assert.equal(soLanHoiALT, 0, "legacy không có ALT — không được tốn một lượt RPC cho nó");
});

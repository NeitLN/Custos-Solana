import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { extractFacts } from "../src/l1/fetch.ts";
import { danhGia } from "../src/l2/evaluate.ts";

const BLOCKHASH = "11111111111111111111111111111111";

function txDonGian(payer: PublicKey) {
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 }),
      ],
    }).compileToV0Message(),
  );
}

/** RPC giả: mô phỏng luôn thất bại. Không chạm mạng. */
const rpcHong = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (keys: PublicKey[]) => keys.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
} as never;

test("FAIL-SAFE — mô phỏng hỏng thì coverage.analyzed phải là 0", async () => {
  const f = await extractFacts(rpcHong, txDonGian(Keypair.generate().publicKey));

  assert.equal(f.simulationOk, false);
  assert.equal(f.coverage.total, 1, "vẫn phải đếm đủ số lệnh");
  assert.equal(
    f.coverage.analyzed,
    0,
    "đọc được TÊN lệnh không có nghĩa là hiểu HẬU QUẢ — mô phỏng hỏng thì không hiểu gì cả",
  );
});

test("FAIL-SAFE — mô phỏng hỏng thì L2 không bao giờ ra safe", async () => {
  // Bất biến này TỪNG được cưỡng chế trong validator của gói types. Chỗ đó sai:
  // `InspectResult` không mang danh sách instruction nên validator không biết
  // phần chưa đọc hiểu có chạm được vào tài sản người ký hay không, và luật ở
  // đó bắt buộc warning cho mọi giao dịch mainnet (coverage trung bình 8%).
  //
  // Bất biến giờ nằm ở L2, nơi có đủ dữ liệu để quyết định đúng.
  const f = await extractFacts(rpcHong, txDonGian(Keypair.generate().publicKey));
  const r = danhGia(f);

  assert.equal(f.simulationOk, false);
  assert.notEqual(r.level, "safe", "không chạy thử được thì không được nói là bình thường");
  assert.equal(r.level, "warning");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import { inspect } from "../src/inspect.ts";
import { dinhDangSo } from "../src/diff.ts";
import { validateInspectResult } from "../../types/src/validate.ts";

const BLOCKHASH = "11111111111111111111111111111111";
const tx = () => {
  const payer = Keypair.generate().publicKey;
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: BLOCKHASH,
      instructions: [
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 }),
      ],
    }).compileToV0Message(),
  );
};

/** RPC giả — mô phỏng luôn thất bại. Không chạm mạng. */
const rpc = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (k: PublicKey[]) => k.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
} as never;

test("inspect() trả về InspectResult hợp lệ theo hợp đồng", async () => {
  const r = await inspect({ connection: rpc }, tx());
  assert.deepEqual(validateInspectResult(r), []);
});

test("vắng L3 thì sản phẩm vẫn chạy — verdict và mã lý do nguyên vẹn", async () => {
  const r = await inspect({ connection: rpc }, tx());
  assert.equal(r.level, "warning", "fail-safe vẫn phải hoạt động khi không có L3");
  assert.equal(r.explanation, "");
  assert.equal(r.aiAdvisory, null);
  assert.equal(r.detectedPrimaryAction, null);
});

test("L3 NÉM LỖI cũng không được làm sập lượt kiểm tra", async () => {
  const r = await inspect(
    {
      connection: rpc,
      interpret: async () => {
        throw new Error("mô hình quá hạn");
      },
    },
    tx(),
  );
  assert.equal(r.level, "warning", "verdict của L2 phải giữ nguyên khi L3 hỏng");
  assert.deepEqual(validateInspectResult(r), []);
});

test("L3 KHÔNG thể sửa được level — kiểu dữ liệu chặn từ đầu", async () => {
  const r = await inspect(
    {
      connection: rpc,
      // Hàm này cố tình trả về thêm `level`. Kiểu Interpreter không có trường đó,
      // nên nó không bao giờ tới được kết quả cuối.
      interpret: async () =>
        ({
          detectedPrimaryAction: { type: "transfer" },
          explanation: "một lời giải thích",
          aiAdvisory: null,
          level: "safe",
        }) as never,
    },
    tx(),
  );
  assert.equal(r.level, "warning", "level vẫn do L2 quyết, không phải L3");
  assert.equal(r.explanation, "một lời giải thích");
});

test("expectedAction LỆCH ⇒ nâng nghi ngờ", async () => {
  const r = await inspect(
    {
      connection: rpc,
      interpret: async () => ({
        detectedPrimaryAction: { type: "swap" },
        explanation: "",
        aiAdvisory: null,
      }),
    },
    tx(),
    { expectedAction: { type: "transfer" } },
  );
  assert.equal(r.aiAdvisory, "review_required");
});

test("expectedAction KHỚP ⇒ KHÔNG tắt cảnh báo nào (dApp độc hại khai đúng được)", async () => {
  const r = await inspect(
    {
      connection: rpc,
      interpret: async () => ({
        detectedPrimaryAction: { type: "transfer" },
        explanation: "",
        aiAdvisory: "review_required" as const,
      }),
    },
    tx(),
    { expectedAction: { type: "transfer" } },
  );
  assert.equal(r.aiAdvisory, "review_required", "khớp ngữ cảnh không được xoá cảnh báo đã có");
  assert.equal(r.level, "warning", "và không được hạ verdict");
});

test("định dạng số theo kiểu Việt Nam", () => {
  assert.equal(dinhDangSo(500_000_000n, 6), "500,0");
  assert.equal(dinhDangSo(0n, 6), "0,0");
  assert.equal(dinhDangSo(1_234_567_890n, 6), "1.234,56789");
  assert.equal(dinhDangSo(-5_000n, 9), "−0,000005");
});

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
  /*
   * Thêm ở TB-B04 sau khi mutation lộ ra lỗ.
   *
   * Đảo `!==` thành `===` ở quy tắc bất đối xứng (`inspect.ts`) chỉ làm **một** bài
   * đỏ — bài "LỆCH ⇒ nâng nghi ngờ". Bài này thì không, vì nó đặt sẵn
   * `aiAdvisory: "review_required"` từ L3, nên hai assert trên vẫn đúng dù quy tắc
   * đã bị đảo ngược hoàn toàn.
   *
   * `loiKhaiLech` là thứ phân biệt được: nó CHỈ được đặt khi lời khai lệch, và nó
   * có mặt trong `InspectResult`. Khai KHỚP mà trường này xuất hiện nghĩa là Custos
   * đang tố một dApp trung thực — đúng chiều sai mà quy tắc bất đối xứng cấm.
   */
  assert.equal(
    (r as { loiKhaiLech?: unknown }).loiKhaiLech,
    undefined,
    "lời khai KHỚP thì không được ghi nhận là lệch",
  );
});

test("định dạng số theo kiểu Việt Nam", () => {
  assert.equal(dinhDangSo(500_000_000n, 6), "500,0");
  assert.equal(dinhDangSo(0n, 6), "0,0");
  assert.equal(dinhDangSo(1_234_567_890n, 6), "1.234,56789");
  assert.equal(dinhDangSo(-5_000n, 9), "−0,000005");
});

/* ── QA · L3 trả dữ liệu MÉO, không phải L3 ném lỗi ─────────────────────────── */

test("QA · aiAdvisory lạ từ L3 bị ép về null, không lọt ra hợp đồng", async () => {
  /*
   * BUG THẬT, tìm ra khi dò ranh giới L2/L3.
   *
   * `inspect()` bọc lời gọi L3 trong try/catch, nên một mô hình NÉM LỖI thì an
   * toàn. Nhưng một mô hình TRẢ VỀ sai hình dạng thì không ném gì cả — ba trường
   * của L3 được gán thẳng vào kết quả, không qua kiểm tra nào.
   *
   * Hậu quả đo được: `CanhBao.tsx:352` so sánh đúng chuỗi
   * `aiAdvisory === "review_required"`. Một giá trị lạ làm biểu thức đó thành
   * false, tức banner "cần kiểm tra thủ công" BIẾN MẤT. Đây là fail-OPEN đúng
   * trên thứ duy nhất L3 được phép cảnh báo.
   *
   * `validateInspectResult` đã có sẵn luật này từ trước — nó chỉ chưa bao giờ
   * được áp lên dữ liệu ĐẾN TỪ L3.
   */
  const XAU: unknown[] = ["TUYET_DOI_AN_TOAN", "safe", "", 0, 1, {}, [], true];
  for (const adv of XAU) {
    const r = await inspect(
      {
        connection: rpc,
        interpret: (async () => ({
          explanation: "x",
          aiAdvisory: adv,
          detectedPrimaryAction: null,
        })) as never,
      },
      tx(),
    );
    assert.equal(r.aiAdvisory, null, `aiAdvisory ${JSON.stringify(adv)} lọt được ra ngoài`);
    assert.deepEqual(validateInspectResult(r), [], `hợp đồng vỡ với ${JSON.stringify(adv)}`);
  }
});

test("QA · aiAdvisory HỢP LỆ vẫn đi qua — đối chứng", async () => {
  /*
   * ĐỐI CHỨNG. Bài trên cũng xanh nếu ta ép aiAdvisory = null vô điều kiện, và
   * như thế thì L3 mất hẳn khả năng yêu cầu kiểm tra thủ công — sửa một lỗ
   * fail-open bằng cách tạo một lỗ to hơn.
   */
  const r = await inspect(
    {
      connection: rpc,
      interpret: async () => ({
        explanation: "x",
        aiAdvisory: "review_required" as const,
        detectedPrimaryAction: null,
      }),
    },
    tx(),
  );
  assert.equal(r.aiAdvisory, "review_required", "L3 phải còn quyền yêu cầu kiểm tra thủ công");
});

test("QA · L3 trả kiểu SAI HẲN không làm vỡ hợp đồng", async () => {
  /*
   * Mô hình thật trả chuỗi, số, hoặc object thiếu trường — đều KHÔNG ném lỗi,
   * nên try/catch không đỡ. Đo trước khi sửa: `explanation` thành `undefined`,
   * vi phạm "explanation phải là string".
   */
  const XAU: unknown[] = ["an toàn", 42, null, undefined, {}, [], 0];
  for (const ra of XAU) {
    const r = await inspect(
      { connection: rpc, interpret: (async () => ra) as never },
      tx(),
    );
    assert.deepEqual(
      validateInspectResult(r),
      [],
      `L3 trả ${JSON.stringify(ra)} làm vỡ hợp đồng`,
    );
    assert.equal(r.level, "warning", "verdict của L2 phải nguyên vẹn");
  }
});

test("QA · chữ do L3 sinh bị giới hạn độ dài trước khi vào kết quả", async () => {
  /*
   * `explanation` và `detectedPrimaryAction.type` được render thẳng vào thẻ cảnh
   * báo (CanhBao.tsx:220 và :266). React có escape nên KHÔNG phải XSS — đây là
   * vấn đề bố cục: nửa triệu ký tự đẩy verdict thật ra khỏi màn hình.
   *
   * Một mô hình chạy loạn, hoặc một mô hình bị chèn prompt qua metadata token,
   * đều đi đúng đường này.
   */
  const r = await inspect(
    {
      connection: rpc,
      interpret: async () => ({
        explanation: "X".repeat(500_000),
        aiAdvisory: null,
        detectedPrimaryAction: { type: "Y".repeat(500_000) },
      }),
    },
    tx(),
  );
  assert.ok(
    r.explanation.length <= 4_000,
    `explanation dài ${r.explanation.length} ký tự — không có trần`,
  );
  assert.ok(
    (r.detectedPrimaryAction?.type.length ?? 0) <= 200,
    `detectedPrimaryAction.type dài ${r.detectedPrimaryAction?.type.length} ký tự`,
  );
  assert.equal(r.level, "warning", "verdict của L2 phải nguyên vẹn");
});

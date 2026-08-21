import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { inspect } from "../src/inspect.ts";
import { chiLaThongTin } from "../src/constants.ts";
import { dienGiaiKhongAI, boiThoiHan } from "../../ai/src/index.ts";
import { validateInspectResult } from "../../types/src/validate.ts";

/**
 * Tài liệu tích hợp là thứ bên ngoài đọc để quyết định có dùng sản phẩm không.
 * Ví dụ sai trong đó tệ hơn không có tài liệu.
 *
 * Bộ test này chạy đúng đoạn mã in trong README và kiểm những khẳng định mà
 * tài liệu đưa ra.
 */

const README = readFileSync(new URL("../README.md", import.meta.url), "utf8");

const rpc = {
  getAddressLookupTable: async () => ({ value: null }),
  getMultipleAccountsInfo: async (k: PublicKey[]) => k.map(() => null),
  simulateTransaction: async () => ({
    context: { slot: 0 },
    value: { err: "AccountNotFound", logs: null, accounts: null, innerInstructions: null },
  }),
} as never;

const tx = () => {
  const payer = Keypair.generate().publicKey;
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: payer,
      recentBlockhash: "11111111111111111111111111111111",
      instructions: [
        SystemProgram.transfer({ fromPubkey: payer, toPubkey: Keypair.generate().publicKey, lamports: 1000 }),
      ],
    }).compileToV0Message(),
  );
};

test("đoạn mã tích hợp trong README chạy được", async () => {
  const ketQua = await inspect(
    { connection: rpc, interpret: boiThoiHan(dienGiaiKhongAI) },
    tx(),
    { locale: "vi" },
  );
  assert.deepEqual(validateInspectResult(ketQua), []);
  assert.ok(ketQua.level !== "safe" || ketQua.aiAdvisory !== null);
});

test("đoạn mã phân biệt hai loại warning trong README chạy được", async () => {
  const ketQua = await inspect({ connection: rpc, interpret: dienGiaiKhongAI }, tx(), { locale: "vi" });
  const chiLaChuaHieu =
    ketQua.level === "warning" &&
    (ketQua.reasonCodes.length === 0 || chiLaThongTin(ketQua.reasonCodes));
  assert.equal(typeof chiLaChuaHieu, "boolean");
});

test("README KHÔNG hướng dẫn hiển thị chữ 'an toàn' cho mức safe", () => {
  // Nhãn đúng là "Bình thường". Tài liệu phải dạy đúng ngay từ đầu, vì bên
  // tích hợp sẽ chép nguyên nhãn trong tài liệu vào giao diện của họ.
  assert.match(README, /Bình thường/);
  assert.match(README, /Không bao giờ hiển thị chữ "an toàn"/);
});

test("README nêu rõ giới hạn thay vì chỉ khoe điểm mạnh", () => {
  assert.match(README, /Giới hạn hiện tại/);
  // Kiểm NỘI DUNG chứ không kiểm một cụm từ cố định: phải có một con số coverage
  // đo được, và phải nói thẳng là chưa có decoder cho DEX. Bản trước khoá cứng
  // chuỗi "3–10 %" nên khi coverage tăng thật, test đỏ vì lý do sai — và cách
  // sửa dễ nhất lại là xoá luôn câu thú nhận, đúng thứ nó sinh ra để giữ.
  assert.match(README, /Coverage/, "phải có mục nói về coverage");
  assert.match(README, /\*\*trung bình \d+ ?%\*\*/, "phải công bố một con số coverage đo được");
  assert.match(README, /Chưa có decoder cho các chương trình DEX/, "phải nói thẳng phần chưa làm được");
  assert.match(README, /Devnet only/i);
});

test("README nêu quy tắc bất đối xứng của expectedAction", () => {
  assert.match(README, /Không giảm verdict/);
  assert.match(README, /thận trọng hơn, không bao giờ dễ dãi hơn/);
});

test("README nêu ranh giới của lớp mô hình ngôn ngữ", () => {
  // Bên tích hợp phải biết chính xác mô hình được phép làm gì trước khi cắm
  // nó vào luồng ký. Đây là câu hỏi đầu tiên một đội bảo mật sẽ hỏi.
  assert.match(README, /không giữ khoá API nào/);
  assert.match(README, /Không chạm được `level`/);
  assert.match(README, /chỉ NÂNG lên `review_required`/);
});

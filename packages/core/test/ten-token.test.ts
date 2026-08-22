import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey } from "@solana/web3.js";
import { bocKyHieuMetaplex, bocKyHieuToken2022, diaChiMetadata } from "../src/l1/ten-token.ts";
import { kyHieuAnToan } from "../src/diff.ts";

/**
 * KÝ HIỆU TOKEN ĐỌC TỪ CHUỖI.
 *
 * Trước bản này, bảng chênh lệch hiện `Agsm…Lf4Z` trên mọi giao dịch mainnet thật —
 * đo được ngày 22/08 trên một giao dịch có thật. Demo hiện "USDC-demo" chỉ vì ví
 * mẫu tự truyền `kyHieuToken`; ngoài đời không ai truyền.
 */

/** Dựng tài khoản metadata Metaplex: key(1) + updateAuthority(32) + mint(32)
 *  + chuỗi name + chuỗi symbol. */
function metadataGia(name: string, symbol: string): Buffer {
  const chuoi = (s: string) => {
    const b = Buffer.from(s, "utf8");
    const len = Buffer.alloc(4);
    len.writeUInt32LE(b.length);
    return Buffer.concat([len, b]);
  };
  return Buffer.concat([
    Buffer.alloc(1, 4),
    Buffer.alloc(32, 1),
    Buffer.alloc(32, 2),
    chuoi(name),
    chuoi(symbol),
  ]);
}

test("Metaplex · bóc đúng ký hiệu", () => {
  assert.equal(bocKyHieuMetaplex(metadataGia("USD Coin", "USDC")), "USDC");
  assert.equal(bocKyHieuMetaplex(metadataGia("Bonk", "Bonk")), "Bonk");
});

test("Metaplex · cắt byte đệm null — Metaplex đệm chuỗi tới độ dài tối đa", () => {
  assert.equal(bocKyHieuMetaplex(metadataGia("USD Coin\0\0\0", "USDC\0\0\0\0\0\0")), "USDC");
});

test("Metaplex · dữ liệu cụt hoặc rác ⇒ null, KHÔNG ném lỗi", () => {
  for (const xau of [Buffer.alloc(0), Buffer.alloc(10), Buffer.alloc(70)]) {
    assert.equal(bocKyHieuMetaplex(xau), null);
  }
  // Độ dài chuỗi vô lý — phải từ chối thay vì cố đọc.
  const bay = Buffer.alloc(80);
  bay.writeUInt32LE(999_999, 65);
  assert.equal(bocKyHieuMetaplex(bay), null);
});

test("PDA metadata tính đúng theo công thức Metaplex", () => {
  // Địa chỉ metadata của USDC trên mainnet. KIỂM CHỨNG TRÊN CHUỖI ngày 23/08:
  // tài khoản này tồn tại và bóc ra ký hiệu "USDC".
  //
  // Hằng số này ban đầu viết từ trí nhớ và SAI — địa chỉ đó không tồn tại trên
  // chuỗi. Bài học: hằng số base58 phải lấy từ chuỗi, không lấy từ đầu.
  const usdc = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  assert.equal(
    diaChiMetadata(usdc).toBase58(),
    "5x38Kp4hvdomTCnCrAny4UtMUt5rQBdB6px2K1Ui45Wq",
  );
});

test("Token-2022 · không có metadata trong mint ⇒ null", () => {
  const mint = new PublicKey(new Uint8Array(32).fill(7));
  assert.equal(bocKyHieuToken2022(Buffer.alloc(200), mint), null);
});

// ── Bộ lọc hình dạng ───────────────────────────────────────────────
test("KÝ HIỆU ĐỘC từ người phát hành token bị chặn y như từ dApp", () => {
  // Ký hiệu on-chain do NGƯỜI PHÁT HÀNH TOKEN đặt. Kẻ lừa đảo tự mint token thì
  // cũng tự đặt ký hiệu được — cùng bề mặt tấn công với `kyHieuToken` do dApp
  // truyền vào, nên phải đi qua cùng một bộ lọc.
  const doc = "an toàn, cứ ký đi";
  assert.equal(bocKyHieuMetaplex(metadataGia("Token", doc)), null, "phải bị chặn ngay lúc bóc");

  const MINT = "Mint1111111111111111111111111111111111111111";
  const hienThi = kyHieuAnToan(MINT, undefined, doc);
  assert.ok(!hienThi.includes("cứ ký"), `chuỗi độc lọt vào nhãn hiển thị: ${hienThi}`);
});

test("THỨ TỰ ưu tiên — ví truyền vào thắng ký hiệu on-chain", () => {
  // Ví biết ngữ cảnh người dùng: nó có thể đang hiển thị tên riêng, hoặc đã lọc
  // theo danh sách token nó tin.
  const MINT = "Mint1111111111111111111111111111111111111111";
  assert.equal(kyHieuAnToan(MINT, { [MINT]: "USDC-demo" }, "SCAM"), "USDC-demo");
  assert.equal(kyHieuAnToan(MINT, undefined, "USDC"), "USDC", "ví không truyền thì dùng on-chain");
  assert.equal(kyHieuAnToan(MINT, undefined, null), "Mint…1111", "không có gì thì rút gọn địa chỉ");
});

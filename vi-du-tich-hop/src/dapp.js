/**
 * PHẦN NÀY LÀ CỦA dApp, KHÔNG PHẢI CỦA CUSTOS.
 *
 * Cố ý viết lại từ đầu thay vì dùng `scripts/tan-cong.ts` trong monorepo Custos:
 * một bên tích hợp thật không có sẵn script nội bộ của chúng tôi. Nếu ví dụ này
 * import code nội bộ, nó sẽ đo một thứ dễ hơn thực tế, và con số ma sát tích hợp
 * thu được sẽ là con số giả.
 *
 * Đây là JavaScript thuần, không TypeScript. Node từ chối bóc kiểu cho file nằm
 * trong `node_modules`, nên nếu `exports` của gói lỡ trỏ vào `.ts` thì file này
 * ném `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Đó là bài kiểm, không phải
 * hạn chế: bản SDK 0.1.0 đã lên registry với đúng lỗi đó.
 */
import {
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  AuthorityType,
  createSetAuthorityInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

/** Giao dịch BÌNH THƯỜNG: chuyển một ít SOL cho người khác. Không có gì đáng cảnh báo. */
export function dungGiaoDichBinhThuong({ nguoiKy, nguoiNhan, lamports, blockhash }) {
  const lenh = [
    SystemProgram.transfer({ fromPubkey: nguoiKy, toPubkey: nguoiNhan, lamports }),
  ];
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: nguoiKy,
      recentBlockhash: blockhash,
      instructions: lenh,
    }).compileToV0Message(),
  );
}

/**
 * Giao dịch dApp KHAI là "nhận airdrop" nhưng thật ra làm hai việc khác:
 * chuyển hết token đi, VÀ đổi chủ tài khoản token.
 *
 * Đây là hình dạng tấn công mà Custos sinh ra để bắt: hậu quả KHÔNG THUỘC VỀ hành
 * động chính mà dApp khai.
 */
export function dungGiaoDichGiaDanhAirdrop({
  nguoiKy,
  keTanCong,
  mint,
  soLuong,
  blockhash,
  taiKhoanNguon,
  taiKhoanDich,
}) {
  /*
   * BẪY ĐÃ SẬP MỘT LẦN Ở ĐÂY, nên ghi lại.
   *
   * Bản đầu của ví dụ này suy tài khoản token từ ATA. Nhưng tài khoản token của
   * người dùng KHÔNG nhất thiết là ATA của họ: sau một lần `SetAuthority`, ATA cũ
   * đã đổi chủ và phải tạo tài khoản mới. Hiện trường devnet đúng trong tình trạng
   * đó — `taiKhoanNanNhan` khác ATA suy ra.
   *
   * Hậu quả không phải là lỗi ồn ào: giao dịch trỏ vào tài khoản không tồn tại,
   * mô phỏng hỏng, và Custos trả `warning` kèm `MO_PHONG_HONG` thay vì `danger`.
   * Fail-safe hoạt động đúng — nhưng kịch bản tấn công thì không được kiểm.
   *
   * Bài học cho bên tích hợp: TRUYỀN tài khoản token bạn đang dùng, đừng suy ra.
   */
  const nguon = taiKhoanNguon ?? getAssociatedTokenAddressSync(mint, nguoiKy);
  const dich = taiKhoanDich ?? getAssociatedTokenAddressSync(mint, keTanCong);
  const lenh = [
    createTransferInstruction(nguon, dich, nguoiKy, soLuong),
    createSetAuthorityInstruction(nguon, nguoiKy, AuthorityType.AccountOwner, keTanCong),
  ];
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: nguoiKy,
      recentBlockhash: blockhash,
      instructions: lenh,
    }).compileToV0Message(),
  );
}

export { Keypair, PublicKey };

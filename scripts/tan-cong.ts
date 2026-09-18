import {
  Keypair, PublicKey, SystemProgram, TransactionInstruction,
  TransactionMessage, VersionedTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID, createTransferInstruction, createSetAuthorityInstruction,
  createApproveInstruction, AuthorityType, getAssociatedTokenAddressSync,
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
 * TRUNG THỰC LÀ RÀNG BUỘC, KHÔNG PHẢI TUỲ CHỌN (docs/CUSTOS.md quyết định 7):
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

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * NĂM DỰNG GIAO DỊCH BỔ SUNG — mỗi cái nhắm ĐÚNG MỘT luật, có tiền điều kiện đọc
 * được trong `packages/core/src/l2/rules.ts`.
 *
 * Nguyên tắc chung với hàm tấn công gốc: KHÔNG dàn dựng hậu quả mà giao dịch
 * không thật sự gây ra. Mỗi hàm dưới đây ghi rõ luật nào nó kích hoạt và VÌ SAO
 * tiền điều kiện của luật đó thoả — nếu sửa luật mà quên sửa đây, test kịch bản
 * (`scripts/ky-thuat/`, `kichBan.test.ts`) chuyển đỏ.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * NHÓM «thưởng nhưng mất token» — mồi nhử có thật, hậu quả cũng có thật.
 *
 * Khác hàm `dungGiaoDichTanCong` ở chỗ nó KHÔNG đổi chủ tài khoản: chỉ chuyển
 * tiền đi, kèm memo hứa hẹn phần thưởng. Đây là ca dùng để nói về khoảng cách
 * giữa LỜI HỨA trên giao diện và HÀNH VI trong giao dịch, mà không cần tới một
 * luật Đỏ nào.
 *
 * Luật kích hoạt: 11 KHÔNG kích hoạt (chỉ một loại tài sản rời ví — xem chú
 * thích `ra.length < 2` trong luật 11). Cái được gắn cờ là `PROGRAM_CHUA_XAC_MINH`
 * nếu memo chạm tài sản, và phần lệch do L3 nhận diện. Nói cách khác: đây là
 * kịch bản mà **engine đúng khi KHÔNG la làng**, và câu chuyện nằm ở `expectedAction`.
 */
export function dungGiaoDichThuongGiaMatToken(p: ThamSoTanCong): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  const ataKeTanCong = p.taiKhoanDich ?? getAssociatedTokenAddressSync(p.mint, p.keTanCong);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        new TransactionInstruction({
          keys: [],
          programId: MEMO_PROGRAM,
          data: Buffer.from("claim reward 5000 BONUS", "utf8"),
        }),
        createTransferInstruction(
          ataNanNhan, ataKeTanCong, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID,
        ),
      ],
    }).compileToV0Message(),
  );
}

/**
 * NHÓM «đổi chủ tài khoản» — luật 1, mức Đỏ.
 *
 * Tiền điều kiện của luật 1: `ownerBefore === signer` và `ownerBefore !== ownerAfter`.
 * Vì vậy `SetAuthority` phải nhắm vào ATA CỦA CHÍNH NẠN NHÂN. Nhắm vào tài khoản
 * của người khác thì luật bỏ qua — đúng thiết kế, vì đó không phải mất mát của
 * người sắp ký.
 *
 * KHÔNG kèm `Transfer`: đây là khác biệt cố ý với `dungGiaoDichTanCong`. Ở đây số
 * dư KHÔNG đổi, chỉ quyền kiểm soát đổi — và bảng chênh lệch phải phản ánh đúng
 * như vậy. Quyết định 7 của docs/CUSTOS.md: hiện 500 → 0 mà không có Transfer là dàn dựng.
 */
export function dungGiaoDichDoiChu(p: ThamSoTanCong): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        createSetAuthorityInstruction(
          ataNanNhan, p.nanNhan, AuthorityType.AccountOwner, p.keTanCong, [], TOKEN_PROGRAM_ID,
        ),
      ],
    }).compileToV0Message(),
  );
}

/**
 * NHÓM «cấp quyền rút vượt số dư» — luật 3, mức Đỏ.
 *
 * NGƯỠNG LÀ THỨ QUAN TRỌNG NHẤT Ở ĐÂY. Luật 3 chỉ kích hoạt khi
 * `delegatedAmountAfter > amountBefore`. Cấp quyền rút ĐÚNG BẰNG số dư là hành vi
 * chuẩn của nhiều dApp và cố ý KHÔNG bị gắn cờ (ca âm tính R03-neg).
 *
 * Nên hàm này nhận `soLuong` là hạn mức uỷ quyền và bên gọi phải truyền một số
 * LỚN HƠN số dư. Cặp đối chứng nằm ở `dungGiaoDichCapQuyenVuaDu` — hai giao dịch
 * gần như giống hệt, chỉ khác con số, và engine phân biệt được. Đó là bằng chứng
 * luật có ngưỡng thật chứ không gắn cờ mọi lệnh Approve.
 */
export function dungGiaoDichCapQuyenRut(p: ThamSoTanCong): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        createApproveInstruction(
          ataNanNhan, p.keTanCong, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID,
        ),
      ],
    }).compileToV0Message(),
  );
}

/**
 * ĐỐI CHỨNG GẦN của nhóm trên — cấp quyền rút VỪA ĐỦ, engine phải IM.
 *
 * Cùng một instruction `Approve`, cùng một delegate, chỉ khác hạn mức: bằng đúng
 * số dư thay vì vượt. Luật 3 bỏ qua ca này.
 *
 * Vì sao cặp này đáng có mặt trong demo: nó là cách duy nhất chứng minh trước mặt
 * giám khảo rằng Custos không gắn cờ theo TÊN INSTRUCTION. Một sản phẩm gắn cờ mọi
 * `Approve` trông cũng "bắt được" ca xấu y hệt — chỉ có ca âm tính mới phân biệt
 * được hai thứ đó.
 *
 * ⚠️ HÀM NÀY TỪNG LÀ MỘT ALIAS RỖNG. Bản đầu viết `return dungGiaoDichCapQuyenRut(p)`
 * — tức đối chứng dựng ra giao dịch GIỐNG HỆT ca xấu, nên nó không chứng minh được
 * gì cả: hai bên luôn cho cùng kết quả, và "engine phân biệt được" là câu nói suông.
 * Đối chứng phải khác ca xấu ở ĐÚNG MỘT BIẾN, và ở đây biến đó là hạn mức.
 *
 * Nên hàm nhận `soDu` riêng và cấp quyền đúng bằng nó, bất kể `p.soLuong` là bao nhiêu.
 */
export function dungGiaoDichCapQuyenVuaDu(
  p: ThamSoTanCong & { soDu: bigint },
): VersionedTransaction {
  return dungGiaoDichCapQuyenRut({ ...p, soLuong: p.soDu });
}

/**
 * NHÓM «trao quyền đóng tài khoản» — luật 2, mức Đỏ.
 *
 * Tiền điều kiện: `closeAuthorityAfter` khác trước, khác null, và KHÔNG phải chính
 * người ký. Trao quyền đóng cho bên thứ ba nghĩa là bên đó đóng được tài khoản và
 * lấy phần lamport đặt cọc — hậu quả nhỏ hơn đổi chủ, nhưng vẫn là quyền người
 * dùng không định trao.
 */
export function dungGiaoDichTraoQuyenDong(p: ThamSoTanCong): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        createSetAuthorityInstruction(
          ataNanNhan, p.nanNhan, AuthorityType.CloseAccount, p.keTanCong, [], TOKEN_PROGRAM_ID,
        ),
      ],
    }).compileToV0Message(),
  );
}

/**
 * NHÓM «chuyển thêm ngoài hành động chính» — nhiều Transfer trong một giao dịch.
 *
 * Người dùng nghĩ mình gửi cho bạn; giao dịch gửi cho bạn RỒI gửi tiếp cho một ví
 * lạ. Lệnh đầu đúng như mong đợi, nên đọc lướt lệnh đầu rồi ký là mất tiền.
 *
 * Đây là nhóm cho thấy vì sao Custos đọc CHÊNH LỆCH TRẠNG THÁI chứ không đọc lệnh
 * đầu tiên: tổng số token rời ví là tổng của hai lệnh, và bảng chênh lệch hiện ra
 * con số cuối cùng chứ không phải con số người dùng tưởng.
 */
export function dungGiaoDichChuyenThem(
  p: ThamSoTanCong & { banBe: PublicKey; taiKhoanBanBe: PublicKey; soLuongThem: bigint },
): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  const ataKeTanCong = p.taiKhoanDich ?? getAssociatedTokenAddressSync(p.mint, p.keTanCong);
  return new VersionedTransaction(
    new TransactionMessage({
      payerKey: p.nanNhan,
      recentBlockhash: p.blockhash,
      instructions: [
        // Lệnh người dùng MONG ĐỢI — gửi cho bạn bè.
        createTransferInstruction(
          ataNanNhan, p.taiKhoanBanBe, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID,
        ),
        // Lệnh KHÔNG thuộc hành động chính — gửi tiếp cho ví lạ.
        createTransferInstruction(
          ataNanNhan, ataKeTanCong, p.nanNhan, p.soLuongThem, [], TOKEN_PROGRAM_ID,
        ),
      ],
    }).compileToV0Message(),
  );
}

/**
 * NHÓM «thiếu dữ liệu» — luật 14, và nó KHÔNG phải cáo buộc.
 *
 * Tiền điều kiện luật 14: giao dịch cần nhiều hơn một chữ ký VÀ ví không khai
 * `nguoiDung`. Khi đó `signer` mặc định là người TRẢ PHÍ, có thể không phải người
 * dùng — nên Custos phải nói "tôi không chắc đang bảo vệ ai" thay vì im lặng phân
 * tích nhầm ví.
 *
 * Dựng bằng cách đặt `payerKey` là một ví khác và để nạn nhân ký với tư cách chủ
 * tài khoản token. Giao dịch cần HAI chữ ký, và đó chính là tiền điều kiện.
 *
 * Nhóm này bắt buộc phải có trong demo vì nó là bằng chứng của fail-safe: thiếu
 * thông tin ⇒ Vàng, không bao giờ Xanh. Một sản phẩm chỉ khoe ca Đỏ thì không
 * chứng minh được điều đó.
 */
export function dungGiaoDichThieuDuLieu(
  p: Omit<ThamSoTanCong, "keTanCong"> & { nguoiTraPhi: PublicKey; banBe: PublicKey },
): VersionedTransaction {
  const ataNanNhan = p.taiKhoanNguon ?? getAssociatedTokenAddressSync(p.mint, p.nanNhan);
  const ataBan = p.taiKhoanDich ?? getAssociatedTokenAddressSync(p.mint, p.banBe);
  return new VersionedTransaction(
    new TransactionMessage({
      // Người trả phí KHÁC người sở hữu token ⇒ hai chữ ký.
      payerKey: p.nguoiTraPhi,
      recentBlockhash: p.blockhash,
      instructions: [
        createTransferInstruction(
          ataNanNhan, ataBan, p.nanNhan, p.soLuong, [], TOKEN_PROGRAM_ID,
        ),
      ],
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

export { Keypair, SystemProgram };

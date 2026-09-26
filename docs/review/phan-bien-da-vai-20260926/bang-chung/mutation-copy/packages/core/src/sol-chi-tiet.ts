import type { Facts } from "./facts.ts";
import { tinhSolNguoiDung, tinhTienDatCoc } from "./sol.ts";

/**
 * CU-16 — SOL, PHÍ VÀ VÒNG ĐỜI ACCOUNT, tách thành các khoản giải thích được.
 *
 * ## Vì sao `roi = truoc - sau` là không đủ
 *
 * Một con số duy nhất không cho biết SOL đi đâu. Ba khoản dưới đây nói ba câu rất
 * khác nhau với người sắp ký:
 *
 *   phí mạng     — mất thật, không lấy lại
 *   đặt cọc rent — **lấy lại được** khi đóng tài khoản
 *   chuyển đi    — mất thật, và là thứ đáng nhìn nhất
 *
 * Gộp chúng lại làm người dùng hoảng khi số dư tụt vì tạo vài tài khoản token —
 * `tinhTienDatCoc` đã sinh ra để chống đúng điều đó, nhưng chưa ai ghép chúng thành
 * một bảng cân đối.
 *
 * ## Phần CHƯA GIẢI THÍCH ĐƯỢC phải hiện ra, không được làm tròn
 *
 * Nghiệm thu thẻ: *"Tổng giải thích khớp dữ kiện quan sát trong sai số integer đã
 * định, hoặc hiện phần chưa giải thích được"*.
 *
 * Nên loại này có `chuaGiaiThich`. Nó khác `0` nghĩa là có SOL đi đâu đó mà Custos
 * không quy được về khoản nào — và nói ra điều đó trung thực hơn nhiều so với việc
 * im lặng gán nó vào "chuyển đi".
 *
 * ## FEE PAYER ≠ VÍ ĐƯỢC BẢO VỆ
 *
 * Thẻ nhắc đích danh: *"Sponsored transaction phải phân biệt fee payer với ví được
 * bảo vệ. Không quy mọi SOL giảm cho người dùng nếu người khác trả phí."*
 *
 * `Facts.signer` là ví ĐƯỢC BẢO VỆ (ví tự khai qua `nguoiDung`), còn người trả phí
 * luôn là `staticAccountKeys[0]`. Khi hai thứ đó khác nhau, phí KHÔNG trừ vào người
 * dùng — và gán nó vào là nói rằng họ mất một khoản họ không mất.
 */

export type ChiTietSol = {
  /** Lamports của ví được bảo vệ, trước và sau. */
  truoc: bigint;
  sau: bigint;
  /** Chênh lệch tổng: `truoc - sau`. Dương = rời ví. */
  roi: bigint;

  /**
   * Phí mạng TÍNH CHO NGƯỜI DÙNG.
   *
   * `0n` khi người khác trả phí — xem `nguoiDungTraPhi`. Đây không phải làm tròn:
   * trong giao dịch được tài trợ, người dùng thật sự không trả đồng nào.
   */
  phi: bigint;
  /** Phí ở trên là số chính xác từ RPC hay chỉ là cận dưới ước tính. */
  phiChinhXac: boolean;
  /** Người dùng có phải người trả phí không. `null` = không đủ dữ kiện để biết. */
  nguoiDungTraPhi: boolean | null;

  /** Rent của tài khoản MỚI TẠO thuộc về người dùng — **lấy lại được**. */
  datCoc: bigint;

  /**
   * Phần còn lại sau khi trừ phí và đặt cọc.
   *
   * KHÔNG gọi là "chuyển đi": Custos chỉ biết nó rời ví, không biết nó đi đâu nếu
   * chưa decode được lệnh tương ứng. Tên trường nói đúng mức hiểu biết.
   */
  conLai: bigint;

  /**
   * Phần KHÔNG quy được về khoản nào — luôn là `0n` theo cấu tạo hiện tại.
   *
   * Giữ trường này vì nó là bất biến kiểm được: `phi + datCoc + conLai` phải bằng
   * `roi`. Một bản sửa làm lệch phép cộng sẽ hiện ra ở đây thay vì âm thầm sai.
   */
  chuaGiaiThich: bigint;

  /**
   * Có đo được trạng thái SAU không.
   *
   * `false` ⇒ mọi số ở trên nói về một phép trừ với số 0, không phải về giao dịch.
   * Đây là thứ phải kiểm TRƯỚC khi hiển thị bất kỳ con số nào — bảng chênh lệch đã
   * có bài học đó: mô phỏng hỏng mà vẫn vẽ "551 SOL → 0".
   */
  doDuoc: boolean;
};

export function chiTietSol(facts: Facts): ChiTietSol {
  const sol = tinhSolNguoiDung(facts);
  const datCoc = tinhTienDatCoc(facts);

  /*
   * AI TRẢ PHÍ?
   *
   * Người trả phí luôn là `nguoiKy[0]` — quy tắc của Solana, và `l1/fetch.ts` dựng
   * `nguoiKy` theo đúng thứ tự `staticAccountKeys`.
   *
   * `null` khi không đủ dữ kiện: `nguoiKy` rỗng thì không biết ai trả, và đoán bừa
   * theo hướng nào cũng sai.
   */
  const nguoiTraPhi = facts.nguoiKy?.[0] ?? null;
  const nguoiDungTraPhi = nguoiTraPhi === null ? null : nguoiTraPhi === facts.signer;

  /*
   * Phí chỉ tính cho người dùng khi CHÍNH họ trả.
   *
   * `null` (không biết ai trả) ⇒ tính phí vào người dùng. Fail-safe: nói người dùng
   * mất nhiều hơn thực tế là thận trọng; nói họ mất ít hơn là trấn an sai.
   */
  const phi = nguoiDungTraPhi === false ? 0n : (facts.phiUocTinh ?? 0n);

  const conLai = sol.roi - phi - datCoc;

  return {
    truoc: sol.truoc,
    sau: sol.sau,
    roi: sol.roi,
    phi,
    phiChinhXac: facts.phiChinhXac ?? false,
    nguoiDungTraPhi,
    datCoc,
    conLai,
    // Bất biến: ba khoản cộng lại đúng bằng `roi`. Có bài test canh.
    chuaGiaiThich: sol.roi - (phi + datCoc + conLai),
    doDuoc: facts.simulationOk,
  };
}

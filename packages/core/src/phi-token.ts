/**
 * CU-14 — PHÍ CHUYỂN CỦA TOKEN-2022, VÀ SỐ THỰC NHẬN.
 *
 * ## Công thức lấy từ mã nguồn protocol, không tự suy
 *
 * `solana.com/docs/tokens/extensions/transfer-fees` nêu hai tham số và một ví dụ
 * (200 token, 150 bps, cap 10 ⇒ phí 3) nhưng **không nói rounding**. Rounding là
 * chi tiết quyết định, nên lấy từ `calculate_fee` của chính token-2022:
 *
 * ```rust
 * let numerator = (pre_fee_amount as u128).checked_mul(transfer_fee_basis_points)?;
 * let raw_fee = Self::ceil_div(numerator, ONE_IN_BASIS_POINTS)?;
 * Some(cmp::min(raw_fee, u64::from(self.maximum_fee)))
 * ```
 *
 * Ba điều dễ làm sai, và cả ba đều đổi kết quả:
 *
 *   1. **LÀM TRÒN LÊN**, không xuống. `ceil_div` = `(numerator + d − 1) / d`.
 *      Một chuyển khoản 1 đơn vị với 1 bps vẫn mất phí 1, không phải 0.
 *   2. **Cap áp SAU CÙNG**, sau khi làm tròn — không phải trước.
 *      3. bps = 0 hoặc số tiền = 0 ⇒ phí 0, thoát sớm trước cả phép nhân.
 *
 * Test vector trong `phiToken.test.ts` được tính TAY từ công thức trên, không chép
 * đầu ra của chính hàm này — thẻ cấm đích danh việc dùng implementation làm oracle.
 *
 * ## Ba con số KHÁC NHAU, không được cộng dồn
 *
 *   `phiToken`    — token bị giữ lại bởi extension. Người nhận mất phần này.
 *   `phiMang`     — lamport trả cho validator. KHÔNG phải token, không cùng đơn vị.
 *   `thucNhan`    — số người nhận thật sự nhận được.
 *
 * Cộng `phiToken` với `phiMang` là cộng hai đơn vị khác nhau. Chúng nằm ở ba
 * trường riêng và `ChiTietPhi` không có trường tổng.
 *
 * ## Token thu phí KHÔNG phải dấu hiệu nguy hiểm
 *
 * Transfer fee là năng lực hợp lệ của giao thức, có ca dùng chính đáng. File này
 * **không** sinh `level` và không có mã lý do nào — nó chỉ tính số. Gắn cờ vì một
 * token có thu phí là cách nhanh nhất tạo false positive (CUSTOS.md mục 06).
 */

const MOT_PHAN_VAN = 10_000n; // ONE_IN_BASIS_POINTS

/** Cấu hình phí đang có hiệu lực, đọc từ mint. */
export type CauHinhPhi = {
  /** Điểm cơ bản: 150 = 1,5 %. */
  diemCoBan: number;
  /** Trần phí tuyệt đối, theo đơn vị nhỏ nhất của token. */
  phiToiDa: bigint;
  /** Epoch mà cấu hình này áp dụng — ghi lại để biết đã tính bằng gì. */
  epoch: number | null;
};

export type ChiTietPhi = {
  /** Số ghi trong lệnh chuyển. */
  soGui: bigint;
  /** Phí TOKEN bị extension giữ lại. */
  phiToken: bigint;
  /** Số người nhận thật sự nhận. `soGui − phiToken`. */
  thucNhan: bigint;
  /**
   * Nguồn của con số.
   *
   * `uocTinh` — tính từ config. `quanSat` — đọc từ kết quả mô phỏng.
   * `khongBiet` — thiếu config hoặc thiếu epoch. Ba trạng thái, không gộp.
   */
  nguon: "uocTinh" | "quanSat" | "khongBiet";
  /** Cấu hình đã dùng để tính. `null` khi `nguon === "khongBiet"`. */
  cauHinh: CauHinhPhi | null;
  /** Vì sao không tính được. Chỉ có khi `nguon === "khongBiet"`. */
  lyDo?: string;
};

/**
 * Phí chuyển theo đúng `calculate_fee` của token-2022.
 *
 * Trả `null` khi tham số không hợp lệ — người gọi phải xử lý, thay vì nhận một số
 * 0 trông như "không mất phí".
 */
export function tinhPhiChuyen(soGui: bigint, ch: CauHinhPhi): bigint | null {
  if (soGui < 0n) return null;
  if (!Number.isInteger(ch.diemCoBan) || ch.diemCoBan < 0 || ch.diemCoBan > 10_000) return null;
  if (ch.phiToiDa < 0n) return null;

  // Thoát sớm ĐÚNG như protocol: bps 0 hoặc số tiền 0 ⇒ phí 0.
  if (ch.diemCoBan === 0 || soGui === 0n) return 0n;

  const tuSo = soGui * BigInt(ch.diemCoBan);
  // ceil_div: (tuSo + d − 1) / d. LÀM TRÒN LÊN — đây là chỗ dễ sai nhất.
  const phiTho = (tuSo + MOT_PHAN_VAN - 1n) / MOT_PHAN_VAN;
  // Cap áp SAU CÙNG.
  return phiTho < ch.phiToiDa ? phiTho : ch.phiToiDa;
}

/**
 * Số thực nhận, kèm nguồn của con số.
 *
 * Thiếu config ⇒ `khongBiet`, KHÔNG suy từ ký hiệu token. Một token tên "USDC"
 * không đảm bảo điều gì về phí của nó; ký hiệu là thứ kẻ tấn công đặt được.
 */
export function chiTietPhi(soGui: bigint, ch: CauHinhPhi | null): ChiTietPhi {
  if (ch === null) {
    return {
      soGui,
      phiToken: 0n,
      thucNhan: soGui,
      nguon: "khongBiet",
      cauHinh: null,
      lyDo: "không đọc được cấu hình phí của mint",
    };
  }
  if (ch.epoch === null) {
    return {
      soGui,
      phiToken: 0n,
      thucNhan: soGui,
      nguon: "khongBiet",
      cauHinh: ch,
      lyDo: "không biết epoch hiện tại nên không biết cấu hình nào đang hiệu lực",
    };
  }

  const phi = tinhPhiChuyen(soGui, ch);
  if (phi === null) {
    return {
      soGui,
      phiToken: 0n,
      thucNhan: soGui,
      nguon: "khongBiet",
      cauHinh: ch,
      lyDo: "cấu hình phí không hợp lệ",
    };
  }

  return { soGui, phiToken: phi, thucNhan: soGui - phi, nguon: "uocTinh", cauHinh: ch };
}

/**
 * Chọn cấu hình đang hiệu lực giữa hai bản.
 *
 * Token-2022 giữ `olderTransferFee` và `newerTransferFee`; bản mới có hiệu lực từ
 * một epoch được ghi sẵn. Trước epoch đó thì bản CŨ vẫn đang chạy.
 *
 * Không biết epoch hiện tại ⇒ `null`, để `chiTietPhi` ghi `khongBiet`. Đoán bừa
 * một trong hai bản là đưa ra con số không ai kiểm chứng được.
 */
export function cauHinhHieuLuc(
  cu: CauHinhPhi,
  moi: CauHinhPhi,
  epochHienTai: number | null,
): CauHinhPhi | null {
  if (epochHienTai === null || moi.epoch === null) return null;
  return epochHienTai >= moi.epoch ? moi : cu;
}

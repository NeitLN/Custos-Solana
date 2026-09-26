import { VERIFIED_PROGRAMS } from "../constants.ts";
import type { InstructionFact } from "../facts.ts";

/**
 * `total`    = TẤT CẢ instruction, kể cả inner (CPI).
 * `analyzed` = instruction có program đã xác minh VÀ decode được.
 * `unverifiedPrograms` = số program ID KHÁC NHAU ngoài danh sách xác minh.
 *
 * Đếm cả inner instruction là có chủ đích: hành vi độc hại thường nằm trong CPI.
 * Xem docs/DAC-TA-CORE.md mục 2.4.
 */
export function computeCoverage(instructions: InstructionFact[]) {
  const unverified = new Set<string>();
  let analyzed = 0;
  for (const ix of instructions) {
    const known = VERIFIED_PROGRAMS.has(ix.programId);
    if (!known) unverified.add(ix.programId);
    if (known && ix.decoded !== null) analyzed++;
  }
  return { analyzed, total: instructions.length, unverifiedPrograms: unverified.size };
}

/**
 * CU-07 — COVERAGE THEO NĂNG LỰC, thay cho một con số gây hiểu nhầm.
 *
 * ## Vì sao `analyzed/total` là không đủ
 *
 * `analyzed` đếm `known && decoded !== null` — **hai điều kiện khác nhau gộp vào
 * một số**. Ba cách trượt khỏi nó nói ba câu rất khác nhau với người dùng, và
 * `67 %` không phân biệt được cái nào:
 *
 * Đo trên toàn corpus — 106 lệnh, và con số làm rõ vì sao việc tách là cần thiết:
 *
 * ```
 *   program đã xác minh + decode được     36
 *   program đã xác minh + KHÔNG decode    58   <- nhóm LỚN NHẤT
 *   program lạ          + decode được      0
 *   program lạ          + KHÔNG decode    12
 * ```
 *
 * 58 lệnh ở nhóm thứ hai là *"chương trình quen, nhưng lệnh này Custos chưa đọc
 * hiểu"* — rất khác với 12 lệnh *"chương trình hoàn toàn lạ"*. Gộp chúng lại là
 * nói với người dùng rằng hai tình huống ấy giống nhau.
 *
 * ## Điều loại này KHÔNG làm
 *
 * - **Không** sinh risk score 0–100. Mục 11 của `docs/roadmap/UPDATE-CUSTOS.md` cấm đích danh:
 *   một con số phần trăm chưa hiệu chuẩn sẽ được đọc thành xác suất an toàn.
 * - **Không** làm `analyzed` tăng lên bằng cách đổi tên mức decode. Bốn nhóm dưới
 *   đây cộng lại đúng bằng `total`, và có bài test canh phép cộng đó.
 * - **Không** khẳng định "decode được" nghĩa là "hiểu hậu quả kinh tế". Đọc được
 *   tên lệnh không đồng nghĩa biết nó làm gì với tiền của người dùng.
 */
export type ChiTietCoverage = {
  /** Program đã xác minh VÀ decode được. Bằng đúng `coverage.analyzed`. */
  hieuDuoc: number;
  /**
   * Program đã xác minh nhưng lệnh KHÔNG decode được.
   *
   * Câu với người dùng: *"chương trình quen, nhưng lệnh này chưa đọc hiểu"*. Kiểm
   * lại cũng không ra — cần thêm decoder, không phải thêm dữ liệu.
   */
  quenNhungChuaDoc: number;
  /**
   * Program NGOÀI danh sách xác minh.
   *
   * Câu khác hẳn: *"chương trình này Custos chưa biết"*. Người dùng tra được địa
   * chỉ program, và đó là hành động cụ thể họ làm được.
   */
  chuongTrinhLa: number;
  /** Số program ID KHÁC NHAU chưa xác minh — dùng để hiển thị danh sách. */
  soChuongTrinhLa: number;
  /**
   * Chương trình lạ nào, và chạm tài sản người ký hay không.
   *
   * Mục 4.2 đòi *"Danh sách chưa hiểu chỉ rõ program/instruction/account liên quan
   * và lý do"*. Một địa chỉ program mà không nói nó có chạm tiền của bạn không thì
   * người đọc không quyết định được gì.
   */
  danhSachLa: Array<{ programId: string; soLenh: number; chamTaiSan: boolean }>;
};

export function chiTietCoverage(instructions: InstructionFact[]): ChiTietCoverage {
  let hieuDuoc = 0;
  let quenNhungChuaDoc = 0;
  let chuongTrinhLa = 0;
  const la = new Map<string, { soLenh: number; chamTaiSan: boolean }>();

  for (const ix of instructions) {
    const quen = VERIFIED_PROGRAMS.has(ix.programId);
    if (!quen) {
      chuongTrinhLa++;
      const cu = la.get(ix.programId);
      la.set(ix.programId, {
        soLenh: (cu?.soLenh ?? 0) + 1,
        // `true` nếu BẤT KỲ lệnh nào của program này chạm tài sản — thận trọng là
        // hướng đúng ở đây: nói "không chạm" cho một program có chạm là nói giảm.
        chamTaiSan: (cu?.chamTaiSan ?? false) || ix.chamTaiSanNguoiKy,
      });
      continue;
    }
    if (ix.decoded !== null) hieuDuoc++;
    else quenNhungChuaDoc++;
  }

  return {
    hieuDuoc,
    quenNhungChuaDoc,
    chuongTrinhLa,
    soChuongTrinhLa: la.size,
    danhSachLa: [...la.entries()]
      .map(([programId, v]) => ({ programId, ...v }))
      // Chạm tài sản lên trước — đó là thứ người dùng cần nhìn đầu tiên.
      .sort((a, b) => Number(b.chamTaiSan) - Number(a.chamTaiSan) || b.soLenh - a.soLenh),
  };
}

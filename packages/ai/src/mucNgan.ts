import type { InspectResult } from "@custos/types";
import { NHAN, chiLaThongTin } from "@custos/core";

/**
 * MỨC 1 — NGẮN. `DAC-TA-L3.md` mục 6.
 *
 * Đây là câu duy nhất phần lớn người dùng sẽ đọc. Ai đang vội bấm nút thì không
 * đọc hết một đoạn văn, và mục 7 của cùng tài liệu đo mức độ hiểu **bằng chính
 * màn hình mức 1** — nên câu này là thứ quyết định con số đó.
 *
 * Bốn nguyên tắc, đúng như mục 1 của đặc tả:
 *   - gọi tên HẬU QUẢ, không gọi tên cơ chế
 *   - số tiền đứng đầu câu
 *   - không dấu chấm than, không doạ, không khuyên mua bán
 *   - không nói "an toàn" cho bất kỳ mức nào
 *
 * Dựng TỪ `InspectResult`, không cần `Facts`: bên tích hợp chỉ có kết quả trả
 * về, và hợp đồng đã đóng băng nên không thêm trường nào được. Mọi con số lấy
 * nguyên từ `diff` — mức Ngắn KHÔNG được tự tính lại gì, nếu không nó sẽ nói
 * một đằng còn bảng chênh lệch hiện một nẻo.
 */

/** Bỏ phần đuôi "sau khi ký" để lấy tên token trong nhãn số dư. */
const tenTuNhan = (label: string, tienTo: string) =>
  label.slice(tienTo.length).replace(/ sau khi ký$/, "").trim();

export function tomTat(ketQua: InspectResult): string {
  const nang = ketQua.diff.filter((d) => d.severity === "danger");
  const cau: string[] = [];

  for (const d of nang) {
    if (d.label.startsWith(NHAN.SO_DU)) {
      const ten = tenTuNhan(d.label, NHAN.SO_DU);
      cau.push(
        d.after === "0" || d.after === "0,0"
          ? `Toàn bộ ${ten} trong ví bạn sẽ bị chuyển đi`
          : `${ten} trong ví bạn sẽ giảm từ ${d.before} xuống ${d.after}`,
      );
    } else if (d.label.startsWith(NHAN.CHU_SO_HUU)) {
      cau.push(`tài khoản ${tenTuNhan(d.label, NHAN.CHU_SO_HUU)} của bạn sẽ đổi chủ sang ${d.after}`);
    } else if (d.label.startsWith(NHAN.DUOC_PHEP_RUT)) {
      cau.push(`${d.after} sẽ được quyền rút ${tenTuNhan(d.label, NHAN.DUOC_PHEP_RUT)} của bạn bất cứ lúc nào`);
    } else if (d.label.startsWith(NHAN.QUYEN_DONG)) {
      cau.push(`${d.after} sẽ được quyền đóng tài khoản ${tenTuNhan(d.label, NHAN.QUYEN_DONG)} của bạn`);
    } else if (d.label.startsWith(NHAN.CHUONG_TRINH)) {
      cau.push(`một tài khoản của bạn sẽ chuyển sang quyền điều khiển của ${d.after}`);
    } else if (d.label === NHAN.CHUYEN_SOL) {
      cau.push(`${d.after.replace(/^−/, "")} sẽ rời khỏi ví bạn — phần lớn số SOL bạn đang có`);
    }
  }

  if (cau.length > 0) {
    // Số tiền đứng đầu câu: dòng số dư và dòng SOL luôn được xếp lên trước.
    const s = cau.join(", và ");
    return `${s.charAt(0).toUpperCase()}${s.slice(1)}. Sau khi ký, bạn không lấy lại được.`;
  }

  // Không có hậu quả nặng nào đo được. Nói về giới hạn của phép đo, KHÔNG trấn an.
  if (ketQua.level !== "safe") {
    if (ketQua.coverage.total > ketQua.coverage.analyzed) {
      const con = ketQua.coverage.total - ketQua.coverage.analyzed;
      return `Có ${con} phần của giao dịch này chúng tôi chưa đọc hiểu được, nên chưa nói chắc nó làm gì với ví bạn.`;
    }
    return "Có vài điểm trong giao dịch này bạn nên xem kỹ trước khi ký.";
  }

  // Mức `safe`. Nhãn hiển thị là "Bình thường" — tuyệt đối không dùng chữ "an toàn".
  return "Không thấy dấu hiệu nào trong danh sách chúng tôi kiểm tra được.";
}

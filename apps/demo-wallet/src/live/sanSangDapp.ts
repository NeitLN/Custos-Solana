/**
 * VÌ SAO KHỐI dApp CHƯA DÙNG ĐƯỢC — một câu, đúng bước tiếp theo (chủ dự án 28/09: "dùng được thật").
 *
 * Điều kiện mở giữ nguyên như `ready` trong `WalletExecution.tsx`; hàm này chỉ NÓI RA điều kiện đầu
 * tiên còn thiếu, theo thứ tự người dùng gặp. `null` ⇒ dùng được.
 */
export function lyDoDappChuaSan(t: {
  /** Trình duyệt cho lưu trạng thái công khai (localStorage). */
  luuDuoc: boolean;
  /** Có phiên đã lưu từ lượt trước, người dùng chưa khôi phục cũng chưa bỏ. */
  phienLuuChoXuLy: boolean;
  canSign: boolean;
  coPhien: boolean;
  doiChu: boolean;
  daDong: boolean;
  dangBan: boolean;
  coYeuCau: boolean;
}): string | null {
  if (!t.luuDuoc)
    return "Trình duyệt đang chặn lưu trạng thái cho trang này — cho phép lưu dữ liệu trang rồi tải lại.";
  if (t.phienLuuChoXuLy)
    return "Có phiên đã lưu từ lượt trước — bấm “Khôi phục phiên đã lưu” ở trên (hoặc “Bỏ bản lưu cục bộ” để bắt đầu phiên mới).";
  if (!t.canSign) return "Bước 1: bấm “Chọn file khoá (.json)…” ở trên và chọn .devnet/vi-demo.json của ví demo.";
  if (!t.coPhien) return "Bước 2: bấm “Ký tạo phiên thử nghiệm” — tạo token DEMO trên Devnet cho ứng dụng dùng.";
  if (t.doiChu)
    return "Tài khoản token của phiên này đã đổi chủ ở lượt trước — tạo phiên mới trong “Cài đặt và dữ kiện của phiên”.";
  if (t.daDong) return "Tài khoản token của phiên này đã đóng — tạo phiên mới trong “Cài đặt và dữ kiện của phiên”.";
  if (t.coYeuCau) return "Đang có một yêu cầu ký đang chờ bạn quyết định ở khung bên cạnh.";
  if (t.dangBan) return "Đang xử lý thao tác trước…";
  return null;
}

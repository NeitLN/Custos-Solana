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
  chuaRo?: boolean;
}): string | null {
  if (!t.luuDuoc)
    return "The browser is blocking storage for this page — allow site data, then reload.";
  if (t.phienLuuChoXuLy)
    return "Restore the saved session to keep using the app. If no transaction is pending, you can also discard the saved copy and create a new session.";
  if (t.chuaRo) return "The previous transaction has an unresolved result. Look it up in the confirmation panel before trying again; do not resend.";
  // Chưa có khoá ⇒ khối nạp khoá nằm CUỐI thẻ ví, mục "Dành cho người trình diễn" (R0-5) — không phải "ở trên".
  if (!t.canSign)
    return "Step 1 (presenter): click “Choose key file (.json)…” in the “For the presenter” section below and pick .devnet/vi-demo.json.";
  if (!t.coPhien) return "Step 2: click “Sign to create a test session” — this creates DEMO tokens on Devnet for the app to use.";
  if (t.doiChu)
    return "This session's token account changed owner in a previous run — create a new session in “Session settings and facts”.";
  if (t.daDong) return "This session's token account is closed — create a new session in “Session settings and facts”.";
  if (t.coYeuCau) return "A signing request is waiting for your decision in the panel alongside.";
  if (t.dangBan) return "Processing the previous action…";
  return null;
}

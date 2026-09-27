/**
 * LỖI RPC NÓI BẰNG TIẾNG NGƯỜI — CK-01/CK-12.
 *
 * Nghiệm thu live 27/09: sau khi tạo phiên, thẻ lỗi hiện nguyên chuỗi JSON của nhà cung
 * cấp (`failed to get info about account … 429 {"jsonrpc":"2.0","error":{"code":-32029,…`).
 * Không lộ bí mật, nhưng người trình bày không đọc được nó trên máy chiếu, và câu gốc có
 * thể mang URL endpoint (URL có thể chứa khoá).
 *
 * Hai điều KHÔNG được làm ở đây:
 *   · nói "chưa có gì được gửi" — lỗi đọc có thể xảy ra SAU khi giao dịch đã gửi (tra
 *     cứu kết quả). Trạng thái gửi do phiên nói, không do câu lỗi đoán;
 *   · nuốt lỗi thành chữ chung chung — mã 429 và "quá hạn" là hai tình huống khác nhau
 *     với người vận hành (đợi hạn mức phục hồi vs. endpoint treo).
 */
export function moTaLoiLive(tho: string): string {
  const sach = tho.replace(/https?:\/\/\S+/g, "(endpoint)");
  if (/\b429\b|Too Many Requests|-32029|rate.?limit/i.test(sach)) {
    return "Nhà cung cấp RPC Devnet đang giới hạn tần suất (HTTP 429) khi Custos đọc dữ liệu. Đợi ít phút rồi thử lại.";
  }
  if (/timed out|timeout|AbortError|aborted/i.test(sach)) {
    return /account|tài khoản/i.test(sach)
      ? "RPC Devnet không trả lời trong hạn khi đọc tài khoản (quá hạn). Đợi ít phút rồi thử lại."
      : "RPC Devnet không trả lời trong hạn (quá hạn). Đợi ít phút rồi thử lại.";
  }
  return sach;
}

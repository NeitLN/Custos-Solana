/**
 * LỌC DÒNG NHẬT KÝ KỸ THUẬT TRƯỚC KHI NÓ RA GIAO DIỆN — thẻ TB-S02.
 *
 * Nhật ký kỹ thuật hiển thị trên trang (`<pre>{nhatKy.join("\n")}</pre>`), và nó
 * nhận nguyên văn `e.message` của lỗi RPC. Thẻ S02 nói đúng hai điều về chỗ này:
 * *"không nối chuỗi lỗi RPC chứa secret lên UI/log công khai"* và *"không thực thi
 * HTML"*.
 *
 * ĐÃ ĐO, không phải lo xa. Trỏ `Connection` vào một endpoint trả trang lỗi HTML thì
 * `e.message` là:
 *
 *   failed to get recent blockhash: Error: 502 Bad Gateway: <!DOCTYPE html><html>
 *   <head><meta charset="utf-8">…<link rel="icon" href="/.safeline/static/favi…
 *
 * Hai vấn đề, và cái thứ hai tệ hơn:
 *
 *   1. Rác — cả trang HTML đổ vào một khối `<pre>` giữa buổi demo.
 *   2. **Rò rỉ.** `VITE_RPC` là URL do người chạy demo đặt, và RPC thương mại dùng
 *      credential trong query (`?api-key=…` của Helius, đường dẫn token của
 *      QuickNode). Lượt đo cụ thể ở trên KHÔNG rò — nhưng "thư viện này hôm nay
 *      không in URL vào lỗi" là một tính chất của thư viện, không phải một bảo đảm
 *      của sản phẩm. Lọc ở đầu ra thì nó không phụ thuộc thư viện nữa.
 *
 * React escape nội dung nên `<script>` KHÔNG thực thi — nhưng đó là phòng tuyến của
 * React, không phải của ví. Nếu một ngày ai đó đổi sang `dangerouslySetInnerHTML`
 * hoặc chép dòng này vào một `innerHTML`, thì lớp lọc này là thứ còn lại.
 */

/** Độ dài tối đa một dòng nhật ký. Dài hơn thì cắt và ghi rõ đã cắt. */
const TOI_DA = 300;

/*
 * Những gì bị che, theo thứ tự nguy hiểm giảm dần.
 *
 * Che URL là quy tắc RỘNG có chủ ý: giữ scheme và host để người đọc còn biết lỗi ở
 * đâu, bỏ toàn bộ phần sau host vì đó là chỗ credential nằm. Danh sách "tên tham số
 * nào là secret" sẽ luôn thiếu — mỗi nhà cung cấp đặt một kiểu.
 */
const QUY_TAC: Array<{ tim: RegExp; thay: string }> = [
  // URL có credential trong query hoặc path: giữ host, bỏ phần còn lại.
  { tim: /\bhttps?:\/\/([^\s/]+)\/\S*/gi, thay: "$1/…" },
  // URL chỉ có host — vẫn giữ, nó không phải secret.
  { tim: /\bhttps?:\/\/([^\s/]+)\b/gi, thay: "$1" },
  /*
   * Thẻ HTML, khai báo doctype và comment — xoá hẳn, không escape. Nhật ký kỹ thuật
   * không có lý do gì mang thẻ.
   *
   * Bản đầu dùng `/<\/?[a-z][^>]*>/` và **bỏ sót `<!DOCTYPE html>`** — `<!` không
   * khớp `[a-z]`. Test với chuỗi lỗi thật bắt được ngay: đầu ra còn
   * `502 Bad Gateway: <!DOCTYPE html>`. Nay khớp mọi thứ mở bằng `<` và đóng bằng
   * `>`, gồm cả `<!-- -->`.
   */
  { tim: /<[!/]?[a-z][^>]*>/gi, thay: "" },
  { tim: /<!--[\s\S]*?-->/g, thay: "" },
  // Dấu `<` hoặc `>` còn lại lẻ loi: không phải thẻ, nhưng cũng không có lý do ở đây.
  { tim: /[<>]/g, thay: "" },
  /*
   * ĐƯỜNG DẪN HỆ THỐNG — che phần thư mục, giữ tên tệp.
   *
   * ĐÃ TÁI HIỆN: lỗi Node mang nguyên đường dẫn vào nhật ký, và nhật ký này hiển
   * thị trên trang công khai:
   *
   *   ENOENT: no such file or directory, open 'C:\Users\<tên>\.config\solana\id.json'
   *   Cannot find module '/home/<tên>/duan/secret.json'
   *
   * Cả hai lộ TÊN NGƯỜI DÙNG hệ điều hành. Quy tắc URL ở trên không bắt được vì
   * đây không phải URL — `file:///…` thì bắt được, `C:\…` và `/home/…` thì không.
   *
   * Giữ tên tệp cuối vì nó là thông tin chẩn đoán thật ("thiếu id.json" khác hẳn
   * "thiếu config.toml"); bỏ phần thư mục vì đó là chỗ tên người dùng nằm.
   */
  /*
   * Lớp ký tự CHO PHÉP dấu cách trong tên thư mục.
   *
   * Bản đầu dùng `[^\s\\/…]` và dừng ngay ở `Viet Tien` — tên người dùng Windows
   * thường CÓ dấu cách, nên quy tắc chỉ che được nửa đường dẫn và vẫn lộ tên.
   *
   * Dừng ở dấu nháy, ngoặc hoặc hai dấu cách liên tiếp: đó là ranh giới thật của
   * một đường dẫn trong câu lỗi, còn một dấu cách đơn thì vẫn nằm trong tên thư mục.
   */
  { tim: /\b[A-Za-z]:[\\/](?:[^\\/'"()]*?[\\/])*([^\\/'"()\s]+)/g, thay: "…/$1" },
  { tim: /\/(?:home|Users|root|var|tmp|opt|etc)\/(?:[^\s/'"]+\/)*([^\s/'"]+)/g, thay: "…/$1" },
  // Ký tự điều khiển và Bidi — xuống dòng chèn câu giả, U+202E đảo chiều hiển thị.
  { tim: /[\u0000-\u0008\u000b-\u001f​-‏‪-‮]/g, thay: "" },
];

/**
 * Làm sạch một dòng trước khi đưa vào nhật ký hiển thị.
 *
 * KHÔNG phải hàm bảo mật chống XSS — React đã escape. Đây là lớp giảm thiệt hại:
 * bỏ thứ không có lý do xuất hiện trong nhật ký kỹ thuật, và không để một URL có
 * credential lọt ra màn hình vì một thư viện nào đó quyết định in nó.
 */
export function locDongNhatKy(s: string): string {
  let ra = s;
  for (const { tim, thay } of QUY_TAC) ra = ra.replace(tim, thay);
  // Gộp khoảng trắng: sau khi xoá thẻ HTML thường còn lại hàng loạt dấu cách.
  ra = ra.replace(/\s+/g, " ").trim();
  if (ra.length > TOI_DA) ra = `${ra.slice(0, TOI_DA)}… (đã cắt ${ra.length - TOI_DA} ký tự)`;
  return ra;
}

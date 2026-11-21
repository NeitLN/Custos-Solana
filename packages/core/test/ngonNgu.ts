/**
 * PHỦ ĐỊNH PHẢI NEO VÀO CỤM BỊ CẤM — dùng chung cho mọi guard câu chữ.
 *
 * Không phải file `.test.ts` nên bộ chạy test bỏ qua nó; nó chỉ là thư viện.
 *
 * Vì sao tồn tại: cùng một lỗi đã xảy ra BA lần, mỗi lần ở một guard khác nhau.
 *
 *   1. `claim.test.ts` — miễn trừ mọi đoạn chứa `không nói`, nên nó tha luôn câu
 *      "ví hiện tại KHÔNG NÓI gì": một claim, không phải lời dặn.
 *   2. `claim.test.ts` — cho phủ định nhảy 40 ký tự bất kỳ, nên chữ "không" trong
 *      "khi KHÔNG hiểu," (mệnh đề khác) đủ làm guard tưởng cả câu là đính chính.
 *   3. `nguoiMua.test.ts` và `tichHop.test.ts` — miễn trừ mọi DÒNG chứa "không".
 *      Tiếng Việt có "không" ở khắp nơi, nên câu bịa "đã có khách hàng đầu tiên,
 *      không phải chỉ là demo" đi thẳng qua.
 *
 * Ba lần cùng một hình dạng: guard tự tha cho đúng thứ nó sinh ra để bắt. Nên
 * logic này chỉ được viết MỘT LẦN, ở đây.
 *
 * Quy tắc: phủ định chỉ tính khi nó đứng NGAY TRƯỚC cụm bị cấm và không vượt qua
 * dấu câu. "Chúng em không tuyên bố là giải pháp duy nhất" là đính chính;
 * "khi không hiểu, ví hiện tại không nói gì" thì không.
 */

/** Phủ định hợp lệ: sát cụm bị cấm, không nhảy qua dấu câu. */
// Cờ `i` là BẮT BUỘC: bản trước không có nó, nên "Đội quyết định KHÔNG phỏng vấn"
// viết hoa không khớp `không` viết thường — và guard tố cáo đúng câu phủ định.
const PHU_DINH_TRUOC = /(không|chưa|đừng|tránh|thay vì|nói rằng mình là|bị cấm)[^.,:;]{0,25}$/i;

/*
 * BỎ DẤU NHẤN MARKDOWN TRƯỚC MỌI PHÉP SO KHỚP.
 *
 * `**Không** gọi con số đó là "false positive"` là một lời dặn — nhưng dấu `**` chen
 * giữa "Không" và "gọi" làm mọi mẫu hụt. Guard khi đó tố cáo đúng câu cấm nói.
 *
 * Cùng lý do đã bỏ dấu nhấn ở đường kiểm theo đoạn: viết đậm là hình thức, không
 * phải nội dung, và nó không được đổi kết luận theo chiều nào.
 */
const boDauNhan = (chu: string) => chu.replace(/\*+/g, "");

/** `true` khi `moc` khớp trong `chu` mà KHÔNG có phủ định neo ngay trước. */
export function viPhamCum(chu: string, moc: RegExp): boolean {
  // `exec` cần cờ toàn cục bị tắt để index ổn định qua nhiều lần gọi.
  chu = boDauNhan(chu);
  const m = new RegExp(moc.source, moc.flags.replace("g", "")).exec(chu);
  if (!m) return false;

  /*
   * CÂU HỎI KHÔNG PHẢI LỜI KHẲNG ĐỊNH.
   *
   * Bảng Q&A trong pitch có dòng: "Đã có ví bên thứ ba nào tích hợp chưa? | Chưa."
   * Cụm bị cấm nằm ở vế HỎI. Chặn nó là chặn đúng chỗ đội đang tự nêu ô còn trống
   * — và một guard chặn cả sự trung thực thì người ta sẽ tắt guard.
   */
  const sau = chu.slice(m.index);
  const hoi = sau.search(/\?/);
  const het = sau.search(/[.|]/);
  if (hoi !== -1 && (het === -1 || hoi < het)) return false;

  return !PHU_DINH_TRUOC.test(chu.slice(0, m.index));
}

/**
 * Câu đang DẶN đừng nói, chứ không phải đang nói.
 *
 * `KHÔNG` viết hoa là quy ước dặn dò của repo, và phải có động từ theo sau —
 * `KHÔNG` trần thì trùng với mọi chữ "không" thường khi bật cờ không phân biệt hoa
 * thường. Trích nguyên văn câu bị cấm cũng là dấu hiệu của lời dặn.
 */
export function laLoiDan(chuTho: string): boolean {
  const chu = boDauNhan(chuTho);
  return (
    /KHÔNG (nói|viết|gọi|dùng|được|tuyên bố|công bố|đếm|gộp)/.test(chu) ||
    /không được (nói|viết|gọi|dùng|phát biểu|tính|đếm|công bố)/i.test(chu) ||
    /đừng (nói|gọi|thêm|dùng)/i.test(chu) ||
    /bị cấm|không tuyên bố/i.test(chu) ||
    /(chưa có|chưa ai|chưa ví|chưa bên|chưa đo|nếu chưa)/i.test(chu) ||
    // `không nói "an toàn"` — lời dặn thật thường trích nguyên văn câu bị cấm.
    // Lời dặn thật thường trích nguyên văn câu bị cấm, và giữa động từ với dấu
    // ngoặc có thể xen vài chữ: `không gọi con số đó là "false positive"`.
    /không (nói|gọi)[^."”]{0,24}["“']/i.test(chu) ||
    // Trích một câu hỏi: đang nêu câu người khác hỏi, không phải đang khẳng định.
    /["“][^"”]*\?["”]/.test(chu)
  );
}

/*
 * ── BẢN TIẾNG ANH ──────────────────────────────────────────────────────────────
 *
 * Web công khai nay viết tiếng Anh, nên guard cấm claim cần hiểu phủ định tiếng Anh.
 * Tách hàm riêng thay vì gộp vào `viPhamCum`: thêm "not"/"no" vào bộ phủ định chung sẽ
 * để một chữ tiếng Anh lạc trong tài liệu tiếng Việt miễn tội cho một claim tiếng Việt.
 *
 * Cùng hai quy tắc với bản tiếng Việt: phủ định NEO ngay trước cụm (trong ~30 ký tự,
 * không qua dấu câu), và câu hỏi thì không phải lời khẳng định.
 */
const PHU_DINH_TRUOC_EN =
  /(\bnot\b|\bnever\b|\bno\b|n['’]t\b|\bcannot\b|\bnor\b|\bwithout\b|\bavoid\w*|\binstead of\b|\bclaim(s|ing)? to be\b|\bforbidden\b|\bbanned\b)[^.,:;]{0,30}$/i;

export function viPhamCumEn(chu: string, moc: RegExp): boolean {
  chu = boDauNhan(chu);
  const m = new RegExp(moc.source, moc.flags.replace("g", "")).exec(chu);
  if (!m) return false;

  const sau = chu.slice(m.index);
  const hoi = sau.search(/\?/);
  const het = sau.search(/[.|]/);
  if (hoi !== -1 && (het === -1 || hoi < het)) return false;

  // Phủ định tiếng Việt cũng tính: chú thích tiếng Việt hay trích nguyên văn cụm tiếng
  // Anh bị cấm — `không đổi "không phát hiện" thành "fully secure"`.
  const truoc = chu.slice(0, m.index);
  return !PHU_DINH_TRUOC_EN.test(truoc) && !PHU_DINH_TRUOC.test(truoc);
}

/** Lời dặn tiếng Anh: "do not say …", "never call it …" — đang CẤM claim, không phải nói nó. */
export function laLoiDanEn(chuTho: string): boolean {
  const chu = boDauNhan(chuTho);
  return (
    /\b(do not|don['’]t|never|must not|should not|may not) (say|write|call|use|claim|state|count|describe|present|report)\b/i.test(chu) ||
    /\b(we|custos) (do|does) not claim\b/i.test(chu) ||
    /\bnot yet (measured|labell?ed)\b|\bno ground truth\b|\bbefore ground truth\b/i.test(chu) ||
    /["“][^"”]*\?["”]/.test(chu)
  );
}

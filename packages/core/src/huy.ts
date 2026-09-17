/**
 * CU-22 — HUỶ THẬT MỘT LƯỢT KIỂM, không chỉ ngừng chờ.
 *
 * ## Khoảng cách mà `coHan.ts` đã tự khai
 *
 * `coHan()` ghi thẳng ở chú thích: *"KHÔNG huỷ việc đang chạy. Promise không huỷ
 * được, nên hàm này chỉ ngừng CHỜ."* Trung thực, và đúng với những gì nó làm — nhưng
 * hệ quả là mỗi lượt quá hạn để lại một request HTTP vẫn đang chạy, và một phản hồi
 * về muộn vẫn tiêu băng thông của lượt mới.
 *
 * `docs/NGAN-SACH-RPC.md` gọi đúng tên điều này: **ngừng chờ ≠ huỷ request**.
 *
 * ## Đo được, không đoán
 *
 * Ba phép đo trên `@solana/web3.js` đang ghim, chạy với Devnet thật:
 *
 * ```
 *   Connection nhận `fetch` tuỳ chỉnh   : có
 *   web3.js TỰ truyền signal            : KHÔNG
 *   tự gắn signal ⇒ abort cắt request   : CÓ — ném AbortError
 * ```
 *
 * Nên đường duy nhất là **tự bọc `fetch`**, và nó hoạt động.
 *
 * ## Điều module này KHÔNG hứa
 *
 * - **Không hứa huỷ được mọi transport.** Một `Connection` do consumer tự dựng với
 *   fetch riêng của họ sẽ bỏ qua signal này. Hàm trả về cờ `coThatSuHuy` để nơi gọi
 *   biết mình đang ở trường hợp nào, thay vì tin rằng đã huỷ.
 * - **Không biến huỷ thành kết luận.** Huỷ là *"ta ngừng hỏi"*, không phải *"giao
 *   dịch có vấn đề"*. Fail-safe của dự án vẫn áp: không đủ dữ liệu ⇒ `warning`.
 * - **Không tự thử lại.** Retry là quyết định của người gọi.
 */

export type KetNoiCoHuy = {
  /**
   * `fetch` để truyền vào `new Connection(url, { fetch })`.
   *
   * Kiểu lấy theo `globalThis.fetch` để khớp chữ ký web3.js mong đợi mà không phải
   * import kiểu nội bộ của nó.
   */
  fetch: typeof globalThis.fetch;
  /** Cắt mọi request đang bay. Gọi nhiều lần là vô hại. */
  huy(): void;
  /** Đã huỷ chưa — để nơi gọi không xử lý kết quả về muộn. */
  daHuy(): boolean;
  /**
   * Số request đã đi ra. Đo được, dùng cho ngân sách RPC và cho test.
   *
   * Đếm ở đây chứ không đếm ở tầng trên: tầng trên không thấy được các lời gọi mà
   * web3.js tự gộp hay tự lặp.
   */
  soRequest(): number;
};

/**
 * Dựng một bộ `fetch` có thể huỷ.
 *
 * Mỗi request được gắn signal của CÙNG một controller, nên một lần `huy()` cắt tất
 * cả — kể cả những request web3.js phát ra sau đó.
 *
 * Signal của người gọi (nếu có) được **kết hợp**, không bị thay thế: một consumer
 * đã có `AbortSignal` riêng vẫn phải huỷ được.
 */
export function ketNoiCoHuy(fetchGoc: typeof globalThis.fetch = globalThis.fetch): KetNoiCoHuy {
  const ac = new AbortController();
  let dem = 0;

  const f: typeof globalThis.fetch = (url, opts) => {
    dem++;
    /*
     * KẾT HỢP HAI SIGNAL, không ghi đè.
     *
     * `AbortSignal.any` có từ Node 20; nếu môi trường không có thì lui về signal
     * của ta — mất khả năng huỷ theo signal của người gọi, nhưng KHÔNG mất khả
     * năng huỷ theo `huy()`. Lui về hướng giữ được nhiều hơn.
     */
    const cuaNguoiGoi = opts?.signal ?? undefined;
    const signal =
      cuaNguoiGoi && typeof AbortSignal.any === "function"
        ? AbortSignal.any([ac.signal, cuaNguoiGoi])
        : (cuaNguoiGoi ?? ac.signal);
    return fetchGoc(url, { ...opts, signal });
  };

  return {
    fetch: f,
    huy: () => ac.abort(),
    daHuy: () => ac.signal.aborted,
    soRequest: () => dem,
  };
}

/**
 * Lỗi này có phải do HUỶ không?
 *
 * Phân biệt quan trọng: một lượt bị huỷ **không phải** một lượt thất bại. Trình bày
 * "không kiểm được giao dịch" cho một thao tác người dùng chủ động huỷ là nói sai,
 * và nó làm người dùng nghĩ sản phẩm hỏng.
 *
 * `AbortError` là tên chuẩn của `DOMException` khi abort; một số runtime dùng
 * `code: 20`. Kiểm cả hai vì cả hai đều gặp trong thực tế.
 */
export function laHuy(e: unknown): boolean {
  if (e instanceof Error && e.name === "AbortError") return true;
  if (typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === 20) {
    return true;
  }
  /*
   * `Connection` của web3.js bọc lỗi fetch vào một Error thường, nên chuỗi là đường
   * lui cuối. Hẹp nhất có thể để không nuốt nhầm lỗi khác.
   *
   * `This` và `The` — cả hai, vì runtime khác nhau dùng khác nhau. Bản đầu của tôi
   * chỉ có `The` (chép theo trí nhớ), và bài test đỏ ngay: Node 24 ném
   * *"This operation was aborted"*. Đo trên runtime thật, đừng chép theo trí nhớ.
   */
  return e instanceof Error && /\bAbortError\b|Th(is|e) operation was aborted/.test(e.message);
}

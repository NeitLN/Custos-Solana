import type { GoiMoHinh } from "./moHinh.ts";

/**
 * Adapter GỌI THẬT tới Anthropic — file DUY NHẤT trong `@custos-solana/ai` biết tên
 * một nhà cung cấp mô hình cụ thể.
 *
 * Ranh giới đã khoá: Custos không nhúng SDK nhà cung cấp nào vào LÕI. File này
 * không vi phạm điều đó — `moHinh.ts` (nơi chứa mọi luật chơi: soi đầu ra, bất
 * đối xứng aiAdvisory, chặn câu trấn an) không import gì từ đây. `dienGiaiBangMoHinh`
 * chỉ nhận một hàm `GoiMoHinh`; file này là MỘT cách triển khai hàm đó, và bên
 * tích hợp có thể viết cách khác cho OpenAI, Gemini, hay mô hình tự host — không
 * đụng một dòng nào trong lõi.
 *
 * `@anthropic-ai/sdk` là devDependency, chỉ dùng cho script đánh giá và cho bên
 * tích hợp nào chọn dùng Anthropic — không phải phần bắt buộc của SDK Custos.
 */
export type TuyChonAnthropic = {
  /** Đọc từ biến môi trường nếu không truyền — KHÔNG hard-code khoá. */
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  /**
   * Số lần SDK thử lại một lượt gọi hỏng. Mặc định của SDK Anthropic là **2**, tức
   * một `messages.create` có thể thành **ba** lượt HTTP khi gặp 429 hoặc 5xx.
   *
   * Vì sao phải khai ra: `NGAN-SACH-RPC.md` mục 4 ghi thẳng *"Chưa làm: truyền
   * `maxRetries` tường minh để biến nó thành một trần thật"*, và artifact eval ghi
   * `datMaxRetriesTuongMinh: false` để phần chi phí không giả định mỗi lần kiểm là
   * đúng một lượt gọi. Không đặt được thì con số token trên slide là cận dưới của
   * một khoảng mà không ai biết cận trên.
   *
   * KHÔNG đổi mặc định. Hạ nó xuống 0 làm sản phẩm kém chịu lỗi hơn để đổi lấy một
   * con số đẹp hơn — sai hướng. Thứ thiếu là *khai báo*, không phải *ít retry hơn*.
   */
  maxRetries?: number;
  /**
   * Nhận số token thật của mỗi lượt gọi, để đo chi phí.
   *
   * Chỉ có nhà cung cấp mới biết con số này — đếm ký tự rồi chia ra token là ước
   * lượng, mà đơn vị kinh tế đưa lên slide thì không được đứng trên ước lượng.
   * `scripts/do-token-mo-hinh.ts` dùng móc này.
   */
  ghiNhanDung?: (u: { vao: number; ra: number }) => void;
};

/**
 * Xuất ra để bộ eval GHI ĐÚNG model đã gọi, thay vì gõ lại tên ở chỗ khác.
 *
 * `scripts/eval-ai.ts` trước đây ghi `moHinh: "claude-haiku-4-5-20251001"` bằng chuỗi
 * gõ tay. Đổi mặc định ở đây mà quên sửa bên đó thì báo cáo khai một model, mã gọi
 * một model khác — và không có gì báo, vì cả hai đều là chuỗi hợp lệ.
 */
export const MODEL_MAC_DINH = "claude-haiku-4-5-20251001";

/**
 * Trần token đầu ra mặc định.
 *
 * Đây là **mặc định**, không phải trần cứng: `tuyChon.maxTokens` đè được. Và nó chỉ
 * tính đầu RA — token đầu vào không nằm trong con số này, mà nhà cung cấp tính tiền
 * cả hai. Xem `docs/DON-VI-KINH-TE.md`.
 */
export const TOKEN_RA_MAC_DINH = 400;

/**
 * Số lần thử lại — **bằng đúng mặc định của SDK Anthropic**, khai ra thay vì thừa hưởng.
 *
 * Xuất ra để `eval-ai.ts` ghi vào artifact đúng con số mã đang dùng, thay vì gõ lại
 * `2` ở chỗ khác. Đó là lỗi cùng loại với `MODEL_MAC_DINH`: đổi ở đây mà quên sửa bên
 * kia thì báo cáo khai một đằng, mã chạy một nẻo, và không có gì báo vì cả hai đều là
 * số hợp lệ.
 */
export const RETRY_MAC_DINH = 2;

export function dungGoiAnthropic(tuyChon: TuyChonAnthropic = {}): GoiMoHinh {
  const apiKey = tuyChon.apiKey ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "Thiếu ANTHROPIC_API_KEY. Đặt biến môi trường trước khi gọi dungGoiAnthropic(), " +
        "hoặc truyền apiKey trực tiếp. Không hard-code khoá vào code.",
    );
  }

  return async ({ system, user }) => {
    // Import động: chỉ tải SDK khi thực sự gọi, để phần còn lại của @custos-solana/ai
    // không kéo theo phụ thuộc này nếu bên tích hợp không dùng adapter này.
    //
    // `@anthropic-ai/sdk` là OPTIONAL PEER DEPENDENCY: cài @custos-solana/ai một mình
    // thì đường tất định (`dienGiaiKhongAI`) chạy đủ, không cần SDK. Chỉ adapter này
    // cần nó — nên nếu thiếu, báo lỗi RÕ RÀNG thay vì để ERR_MODULE_NOT_FOUND khó hiểu.
    let Anthropic: typeof import("@anthropic-ai/sdk").default;
    try {
      ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
    } catch {
      throw new Error(
        "Adapter Anthropic cần gói '@anthropic-ai/sdk' mà project chưa cài. " +
          "Chạy `npm i @anthropic-ai/sdk`, hoặc dùng `dienGiaiKhongAI` (đường tất định, " +
          "không cần mô hình).",
      );
    }
    /*
     * `maxRetries` TƯỜNG MINH — TB-P02.
     *
     * SDK mặc định 2, tức một lượt gọi có thể thành BA lượt HTTP. Bản trước không
     * truyền gì nên nó thừa hưởng mặc định đó, và `NGAN-SACH-RPC.md` mục 4 phải ghi
     * *"Chưa làm: truyền `maxRetries` tường minh để biến nó thành một trần thật"*.
     *
     * Giữ NGUYÊN giá trị 2. Thứ thiếu là lời khai, không phải ít retry hơn: hạ nó
     * xuống làm sản phẩm kém chịu lỗi để đổi lấy một con số chi phí đẹp hơn.
     */
    const client = new Anthropic({ apiKey, maxRetries: tuyChon.maxRetries ?? RETRY_MAC_DINH });

    const r = await client.messages.create({
      model: tuyChon.model ?? MODEL_MAC_DINH,
      max_tokens: tuyChon.maxTokens ?? TOKEN_RA_MAC_DINH,
      system,
      messages: [{ role: "user", content: user }],
    });

    tuyChon.ghiNhanDung?.({ vao: r.usage.input_tokens, ra: r.usage.output_tokens });

    const khoi = r.content.find((k) => k.type === "text");
    if (!khoi || khoi.type !== "text") {
      throw new Error("Anthropic không trả về khối văn bản nào");
    }
    return khoi.text;
  };
}

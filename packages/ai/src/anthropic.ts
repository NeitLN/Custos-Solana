import type { GoiMoHinh } from "./moHinh.ts";

/**
 * Adapter GỌI THẬT tới Anthropic — file DUY NHẤT trong `@custos/ai` biết tên
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
};

const MODEL_MAC_DINH = "claude-haiku-4-5-20251001";

export function dungGoiAnthropic(tuyChon: TuyChonAnthropic = {}): GoiMoHinh {
  const apiKey = tuyChon.apiKey ?? process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "Thiếu ANTHROPIC_API_KEY. Đặt biến môi trường trước khi gọi dungGoiAnthropic(), " +
        "hoặc truyền apiKey trực tiếp. Không hard-code khoá vào code.",
    );
  }

  return async ({ system, user }) => {
    // Import động: chỉ tải SDK khi thực sự gọi, để phần còn lại của @custos/ai
    // không kéo theo phụ thuộc này nếu bên tích hợp không dùng adapter này.
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey });

    const r = await client.messages.create({
      model: tuyChon.model ?? MODEL_MAC_DINH,
      max_tokens: tuyChon.maxTokens ?? 400,
      system,
      messages: [{ role: "user", content: user }],
    });

    const khoi = r.content.find((k) => k.type === "text");
    if (!khoi || khoi.type !== "text") {
      throw new Error("Anthropic không trả về khối văn bản nào");
    }
    return khoi.text;
  };
}

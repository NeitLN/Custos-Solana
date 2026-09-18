/**
 * HÀM SERVER — nơi DUY NHẤT trong cả dự án được thấy `ANTHROPIC_API_KEY`.
 *
 * ## Vì sao phải có file này
 *
 * Bản demo là một trang tĩnh. Một trang tĩnh KHÔNG giữ được bí mật: mọi thứ
 * bundler nhét vào JS đều tải về máy người xem, và `VITE_*` thì nằm thẳng trong
 * mã nguồn bản build. Nhúng khoá vào đó không phải là "tiện hơn một chút" — nó
 * là công bố khoá. Anthropic quét khoá lộ và thu hồi tự động, nên cách đó còn
 * hỏng ngay giữa buổi demo.
 *
 * Nên lớp AI chạy ở đây, và trình duyệt chỉ gửi DỮ KIỆN ĐÃ LỌC rồi nhận lại chữ.
 *
 * ## Ranh giới KHÔNG được vượt (docs/CUSTOS.md quyết định 1)
 *
 * Hàm này trả về đúng một chuỗi văn bản thô của mô hình. Nó KHÔNG trả `level`,
 * KHÔNG trả verdict, và KHÔNG được phép sinh ra hai thứ đó. Mọi phép soi đầu ra
 * — neo số liệu, chặn câu trấn an, kiểm ngược chiều tài sản — vẫn chạy ở phía
 * client trong `dienGiaiBangMoHinh`. Server ở đây chỉ là cái ống dẫn có khoá.
 *
 * Đặt như vậy có chủ đích: nếu server bị chiếm, kẻ chiếm được nó vẫn không đổi
 * được verdict, vì verdict không đi qua đây.
 *
 * ## Cấu hình cần có
 *
 *   ANTHROPIC_API_KEY   bắt buộc — đặt ở biến môi trường của nhà cung cấp hosting
 *   CUSTOS_AI_MODEL     tuỳ chọn — mặc định lấy từ MODEL_MAC_DINH
 *   CUSTOS_CHO_PHEP     tuỳ chọn — danh sách origin, phân tách bằng dấu phẩy
 *
 * KHÔNG commit `.env`. Xem `.env.example`.
 */

/**
 * CHẠY TRÊN EDGE RUNTIME.
 *
 * Chọn Edge chứ không phải Node vì hàm này chỉ làm đúng một việc: chuyển tiếp một
 * lượt `fetch` có gắn khoá. Nó không đụng tới `fs`, không cần SDK nhà cung cấp, và
 * không nạp `@anthropic-ai/sdk` — chính vì vậy `api/dien-giai.ts` gọi thẳng HTTP
 * thay vì dùng adapter Node trong `packages/ai/src/anthropic.ts`.
 *
 * `Request`/`Response` chuẩn Web là đúng thứ handler này đã nhận và trả, nên bộ
 * kiểm `apiDienGiai.test.ts` chạy được trên Node mà không cần giả lập gì của Vercel.
 */
export const config = { runtime: "edge" };

/** Trần độ dài đầu vào. Prompt đo được dài ~1 200 ký tự; 20 000 là dư xa. */
const TRAN_VAO = 20_000;

/** Trần token đầu ra — giữ bằng `TOKEN_RA_MAC_DINH` của adapter. */
const TOKEN_RA = 400;

const MODEL_MAC_DINH = "claude-haiku-4-5-20251001";

type Yeu = { system?: unknown; user?: unknown };

/**
 * Origin được phép gọi. Rỗng nghĩa là chỉ cho cùng origin — mặc định chặt, và
 * bên triển khai phải chủ động nới ra, không phải chủ động siết vào.
 */
function choPhep(origin: string | null): string | null {
  const ds = (process.env["CUSTOS_CHO_PHEP"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ds.length === 0) return null;
  return origin && ds.includes(origin) ? origin : null;
}

function traLoi(body: unknown, status: number, origin: string | null): Response {
  const h: Record<string, string> = { "content-type": "application/json; charset=utf-8" };
  const ok = choPhep(origin);
  if (ok) {
    h["access-control-allow-origin"] = ok;
    h["vary"] = "origin";
  }
  return new Response(JSON.stringify(body), { status, headers: h });
}

export default async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: choPhep(origin)
        ? {
            "access-control-allow-origin": choPhep(origin)!,
            "access-control-allow-methods": "POST, OPTIONS",
            "access-control-allow-headers": "content-type",
            "vary": "origin",
          }
        : {},
    });
  }

  if (req.method !== "POST") {
    return traLoi({ loi: "chỉ nhận POST" }, 405, origin);
  }

  /*
   * `.trim()` KHÔNG phải thừa — nó chặn một ca hỏng có thật và rất khó chẩn đoán.
   *
   * Dán khoá vào `vercel env add` (hoặc vào ô trên dashboard) rất dễ kèm theo một
   * ký tự xuống dòng hoặc khoảng trắng cuối. `curl` tự cắt phần thừa đó nên thử
   * bằng curl thì thấy bình thường — nhưng `new Headers()` trong Edge runtime
   * GIỮ NGUYÊN nó và gửi lên, và nhà cung cấp trả về lỗi xác thực.
   *
   * Triệu chứng vì vậy rất dễ dẫn sai hướng: cùng một khoá, gọi thẳng bằng curl
   * thì 200, gọi qua hàm server thì hỏng — làm người ta đi tìm lỗi trong code.
   */
  const khoa = process.env["ANTHROPIC_API_KEY"]?.trim();
  if (!khoa) {
    /*
     * NÓI THẲNG LÀ CHƯA CẤU HÌNH, mã 503.
     *
     * Client phân biệt được ca này với ca "mô hình lỗi", và giao diện hiện đúng
     * chữ "chưa cấu hình AI" thay vì vờ như đã gọi rồi thất bại. Một sản phẩm
     * bảo mật không được mập mờ về chuyện nó có đang chạy hay không.
     */
    return traLoi({ loi: "CHUA_CAU_HINH", chiTiet: "server chưa có ANTHROPIC_API_KEY" }, 503, origin);
  }

  let than: Yeu;
  try {
    than = (await req.json()) as Yeu;
  } catch {
    return traLoi({ loi: "thân yêu cầu không phải JSON" }, 400, origin);
  }

  const { system, user } = than;
  if (typeof system !== "string" || typeof user !== "string") {
    return traLoi({ loi: "cần hai trường chuỗi `system` và `user`" }, 400, origin);
  }
  if (system.length + user.length > TRAN_VAO) {
    return traLoi({ loi: "đầu vào vượt trần" }, 413, origin);
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": khoa,
        "anthropic-version": "2023-06-01",
        /*
         * KHOÁ CẤP TỔ CHỨC CẦN THÊM HEADER NÀY — ca hỏng thật trên production,
         * và nó giả dạng thành lỗi khác rất giỏi.
         *
         * Một khoá `sk-ant-…` hợp lệ, đủ 108 ký tự, không ký tự lạ, vẫn bị từ chối
         * nếu nó CHƯA GẮN WORKSPACE. Anthropic trả:
         *
         *   invalid_request_error — "This API key is not scoped to a workspace, so
         *   this request must include the anthropic-workspace-id header…"
         *
         * Mã 400 khiến nó trông y hệt lỗi payload, và vì `authentication_error`
         * KHÔNG xuất hiện nên cũng không nghĩ tới khoá. Cùng một đoạn mã chạy tốt
         * với khoá đã gắn workspace và hỏng với khoá chưa gắn — khác biệt nằm ở
         * thuộc tính của khoá, không nằm ở request.
         *
         * Vắng biến này thì không gửi header, tức giữ nguyên hành vi cũ cho khoá
         * đã gắn workspace.
         */
        ...(process.env["ANTHROPIC_WORKSPACE_ID"]?.trim()
          ? { "anthropic-workspace-id": process.env["ANTHROPIC_WORKSPACE_ID"]!.trim() }
          : {}),
      },
      body: JSON.stringify({
        /*
         * `||` CHỨ KHÔNG PHẢI `??` — và khác biệt đó từng làm hỏng cả đường AI.
         *
         * `??` chỉ bắt `null` và `undefined`. Trên Edge runtime của Vercel, một biến
         * môi trường CHƯA KHAI đọc ra là chuỗi RỖNG, không phải `undefined`. Nên
         * `"" ?? MODEL_MAC_DINH` cho `""`, và request gửi đi mang `model: ""`.
         *
         * Triệu chứng đo được trên production:
         *   {"loi":"MO_HINH_LOI","ma":400,"loai":"invalid_request_error"}
         * và Anthropic nói rõ: `model: String should have at least 1 character`.
         *
         * Nó dẫn sai hướng rất mạnh: lỗi 400 trông như khoá hỏng, nên người ta đi
         * đặt lại khoá — trong khi khoá vẫn đúng từ đầu. Phân biệt được là nhờ
         * `invalid_request_error` KHÁC `authentication_error`; khoá sai thật thì
         * Anthropic trả vế sau.
         */
        model: process.env["CUSTOS_AI_MODEL"]?.trim() || MODEL_MAC_DINH,
        max_tokens: TOKEN_RA,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!r.ok) {
      /*
       * KHÔNG chuyển tiếp nguyên văn thân lỗi của nhà cung cấp: nó có thể chứa
       * mảnh thông tin về cấu hình. Chỉ trả mã trạng thái.
       *
       * NHƯNG mã HTTP một mình không đủ để chẩn đoán. Một lượt 400 từ Anthropic có
       * thể là khoá sai, model không tồn tại, hoặc payload hỏng — ba nguyên nhân,
       * ba cách sửa khác nhau, và đứng ngoài thì không phân biệt được.
       *
       * Nên lấy THÊM đúng trường `error.type` — một chuỗi enum ngắn do Anthropic
       * định nghĩa (`authentication_error`, `not_found_error`, `invalid_request_error`).
       * Nó KHÔNG chứa khoá, không chứa endpoint, không chứa thân request. Đây là
       * ranh giới cố ý: đủ để chẩn đoán, không đủ để rò rỉ.
       */
      let loai: string | null = null;
      try {
        const than = (await r.json()) as { error?: { type?: string } };
        const t = than.error?.type;
        // Danh sách trắng: chỉ cho qua chuỗi enum ngắn, không cho qua câu văn tự do.
        if (typeof t === "string" && /^[a-z_]{1,40}$/.test(t)) loai = t;
      } catch {
        /* thân không phải JSON — bỏ qua, mã trạng thái vẫn đủ dùng */
      }
      return traLoi({ loi: "MO_HINH_LOI", ma: r.status, ...(loai ? { loai } : {}) }, 502, origin);
    }

    const j = (await r.json()) as { content?: Array<{ type: string; text?: string }>; usage?: unknown };
    const chu = (j.content ?? [])
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("");

    return traLoi({ chu, usage: j.usage ?? null }, 200, origin);
  } catch {
    return traLoi({ loi: "MO_HINH_LOI" }, 502, origin);
  }
}

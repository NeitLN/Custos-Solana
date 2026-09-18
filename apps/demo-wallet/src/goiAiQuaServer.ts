import type { GoiMoHinh } from "@custos-solana/ai";

/**
 * GỌI MÔ HÌNH QUA SERVER — phía trình duyệt.
 *
 * Đây là một cách triển khai `GoiMoHinh`, đúng cái giao diện mà
 * `dienGiaiBangMoHinh` nhận. Nghĩa là TOÀN BỘ phép soi đầu ra của L3 — neo số
 * liệu, chặn câu trấn an, kiểm ngược chiều tài sản — vẫn chạy ở client, y hệt
 * như khi gọi adapter Node. Server chỉ thay chỗ giữ khoá, không thay luật chơi.
 *
 * Nói cách khác: server bị chiếm cũng không đổi được `level`, vì `level` không đi
 * qua đó. Xem `api/dien-giai.ts`.
 */

/** Lỗi phân biệt được: server chưa có khoá. Giao diện nói "chưa cấu hình", không nói "lỗi". */
export class ChuaCauHinhAI extends Error {
  constructor() {
    super("server chưa cấu hình ANTHROPIC_API_KEY");
    this.name = "ChuaCauHinhAI";
  }
}

export type TuyChonGoi = {
  /** Đường dẫn hàm server. Mặc định cùng origin. */
  duongDan?: string;
  /** Hạn cho một lượt gọi. Vượt thì ném, và L3 rơi về câu tất định. */
  hanMs?: number;
  /** Nhận usage thật do server chuyển tiếp — để đo token, không ước lượng. */
  ghiNhanDung?: (u: unknown) => void;
};

export function dungGoiQuaServer(t: TuyChonGoi = {}): GoiMoHinh {
  const duongDan = t.duongDan ?? "/api/dien-giai";
  const hanMs = t.hanMs ?? 8_000;

  return async ({ system, user }) => {
    /*
     * HUỶ THẬT BẰNG AbortController, không chỉ ngừng chờ.
     *
     * `NGAN-SACH-RPC.md` phân biệt rõ hai thứ: "ngừng chờ" để lại request vẫn chạy
     * và vẫn tốn token; "huỷ" mới thật sự cắt. Ở đây cắt được nên cắt.
     */
    const boDieuKhien = new AbortController();
    const dongHo = setTimeout(() => boDieuKhien.abort(), hanMs);

    try {
      const r = await fetch(duongDan, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ system, user }),
        signal: boDieuKhien.signal,
      });

      if (r.status === 503) {
        const j = (await r.json().catch(() => ({}))) as { loi?: string };
        if (j.loi === "CHUA_CAU_HINH") throw new ChuaCauHinhAI();
      }
      if (!r.ok) throw new Error(`server trả ${r.status}`);

      const j = (await r.json()) as { chu?: string; usage?: unknown };
      if (typeof j.chu !== "string" || j.chu === "") throw new Error("server trả chuỗi rỗng");
      if (j.usage) t.ghiNhanDung?.(j.usage);
      return j.chu;
    } finally {
      clearTimeout(dongHo);
    }
  };
}

/**
 * Hỏi server đã cấu hình AI chưa, KHÔNG tốn một lượt gọi mô hình.
 *
 * Giao diện cần biết điều này TRƯỚC khi người dùng bấm, để hiện đúng nhãn thay vì
 * hứa một thứ rồi thất bại. Gửi thân rỗng: server kiểm khoá trước khi kiểm thân,
 * nên ca "chưa cấu hình" trả 503 còn ca "đã cấu hình" trả 400 vì thiếu trường.
 *
 * 400 ở đây là CÂU TRẢ LỜI ĐÚNG, không phải lỗi — nó chứng minh server đã qua
 * được chốt khoá.
 */
/**
 * Kết quả dò, giữ lại theo đường dẫn.
 *
 * ĐO ĐƯỢC TRÊN TRÌNH DUYỆT, không phải lo xa: probe Playwright thấy `/api/dien-giai`
 * bị gọi **hai lần** mỗi lần mở trang. StrictMode ở chế độ dev chạy effect hai lượt,
 * và `huy` trong cleanup chỉ chặn `setState` — nó không rút lại request đã bay đi.
 *
 * Dò hai lần không sai kết quả, nhưng nó là hai lượt gọi mạng cho một câu hỏi có
 * đáp án cố định trong suốt phiên. Giữ lời hứa lại thì lượt thứ hai dùng chung
 * lượt thứ nhất.
 */
const daDo = new Map<string, Promise<boolean>>();

export function coAiKhong(duongDan = "/api/dien-giai"): Promise<boolean> {
  const cu = daDo.get(duongDan);
  if (cu) return cu;
  const moi = doMotLan(duongDan);
  daDo.set(duongDan, moi);
  return moi;
}

async function doMotLan(duongDan: string): Promise<boolean> {
  try {
    const r = await fetch(duongDan, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });

    /*
     * ĐỌC MÃ TRẠNG THÁI TƯỜNG MINH, không rơi vào `catch` rồi đoán.
     *
     * Ba ca khác nhau, và chúng ĐỀU không phải lỗi mạng:
     *
     *   400  server CHẠY và đã qua chốt khoá — chỉ thiếu trường. ⇒ CÓ AI.
     *   503  server chạy nhưng chưa cấu hình khoá.               ⇒ KHÔNG.
     *   404  không có hàm server nào ở đường này.                ⇒ KHÔNG.
     *
     * Ca 404 là ca THẬT và hay gặp nhất khi phát triển: `vite dev` phục vụ tệp
     * tĩnh, nó không chạy hàm serverless. Trước đây ca này rơi xuống `r.ok === false`
     * rồi trả `false` — ĐÚNG KẾT QUẢ nhưng vì lý do sai, và một nhánh đúng-vì-may
     * thì sẽ sai ngay lần sửa sau. Nay nói thẳng ra.
     */
    if (r.status === 400) return true;
    return r.ok;
  } catch {
    // Chỉ lỗi mạng thật mới tới đây.
    return false;
  }
}

/**
 * GIỚI HẠN THỜI GIAN CHO MỘT VIỆC BẤT ĐỒNG BỘ.
 *
 * Vì sao cần: `inspect()` gọi RPC Devnet. Devnet chậm hoặc mất mạng thì lời hứa
 * không bao giờ giải quyết — vòng quay cứ quay, và trên sân khấu thì đó là im
 * lặng vô hạn trước mặt giám khảo. Không có timeout thì không có đường thoát.
 *
 * Ba điều cố ý:
 *
 *  1. NÉM `LoiQuaHan` chứ không trả `null`. Phía giao diện cần phân biệt "quá hạn"
 *     với "chạy xong nhưng thiếu dữ liệu" — hai thứ đó nói với người dùng hai câu
 *     khác nhau, và gộp chúng lại là bỏ mất thông tin ngay chỗ cần nhất.
 *  2. DỌN TIMER trong `finally`. Không dọn thì mỗi lần bấm để lại một timer sống
 *     đến hết hạn; trong một app chạy suốt buổi demo, đó là rác tích dần.
 *  3. KHÔNG huỷ việc đang chạy. Promise không huỷ được, nên hàm này chỉ ngừng CHỜ.
 *     Nói rõ ở đây để không ai tưởng nó đã cắt lời gọi RPC.
 */
export class LoiQuaHan extends Error {
  // Gán tường minh chứ không dùng parameter property (`constructor(public ms)`):
  // Node chạy TypeScript ở chế độ CHỈ BÓC KIỂU, mà parameter property phải SINH mã
  // gán — nên nó ném ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX. Cả repo chạy bằng chế độ đó.
  readonly ms: number;

  constructor(ms: number) {
    super(`quá hạn sau ${ms} ms`);
    this.name = "LoiQuaHan";
    this.ms = ms;
  }
}

export function coHan<T>(viec: Promise<T>, ms: number): Promise<T> {
  let dongHo: ReturnType<typeof setTimeout> | undefined;
  const chuong = new Promise<never>((_, tuChoi) => {
    dongHo = setTimeout(() => tuChoi(new LoiQuaHan(ms)), ms);
  });
  return Promise.race([viec, chuong]).finally(() => clearTimeout(dongHo));
}

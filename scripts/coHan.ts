/**
 * GIỚI HẠN THỜI GIAN CHO MỘT VIỆC BẤT ĐỒNG BỘ.
 *
 * Đặt ở `scripts/` vì CẢ HAI app đều cần: ví bọc `inspect()`, trang tấn công bọc
 * lượt lấy blockhash. `scripts/` đã là lớp dùng chung sẵn có (`tan-cong.ts` được cả
 * hai import). Nhân bản 30 dòng này sang app thứ hai thì sớm muộn hai bản lệch nhau;
 * để app này import app kia thì tạo phụ thuộc sai chiều.
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

/**
 * MỘT HẠN CHUNG CHO CẢ LƯỢT, KHÔNG PHẢI MỖI CHẶNG MỘT HẠN.
 *
 * `coHan(viec, 12_000)` gọi hai lần nối tiếp là hai ngân sách 12 giây riêng —
 * người dùng chờ tới 24 giây trong khi thẻ lỗi vẫn ghi "sau 12 giây". Đo được
 * trong ví: nhánh Custos-TẮT lấy blockhash (chặng 1) rồi mô phỏng lại (chặng 2),
 * mỗi chặng một hạn mới.
 *
 * Người dùng chờ MỘT việc — "kiểm tra giao dịch này" — nên ngân sách thuộc về
 * việc đó, và mọi chặng bên trong chia nhau phần còn lại. Hết giờ ở chặng hai thì
 * lỗi phải nói ra con số người dùng thật sự đã chờ, tức là tổng, không phải phần.
 */
export type Han = {
  /** Mili-giây còn lại; ≤ 0 nghĩa là đã hết. */
  conLai(): number;
  /** Tổng ngân sách ban đầu — con số nói với người dùng. */
  readonly tong: number;
};

export function moHan(tong: number, bayGio: () => number = Date.now): Han {
  const het = bayGio() + tong;
  return { conLai: () => het - bayGio(), tong };
}

/** Như `coHan`, nhưng lấy phần còn lại của ngân sách chung thay vì một hạn mới. */
export function coHanChung<T>(viec: Promise<T>, han: Han): Promise<T> {
  const con = han.conLai();
  // Hết ngân sách trước cả khi chặng này bắt đầu: từ chối ngay, đừng cấp thêm giờ.
  // Báo `tong` chứ không báo `con`, vì đó mới là khoảng người dùng đã đứng chờ.
  if (con <= 0) return Promise.reject(new LoiQuaHan(han.tong));
  return coHan(viec, con).catch((e) => {
    throw e instanceof LoiQuaHan ? new LoiQuaHan(han.tong) : e;
  });
}

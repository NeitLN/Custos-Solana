/**
 * HỢP ĐỒNG CHUNG — ĐÓNG BĂNG 22/08/2026
 *
 * Đây là giao thức phối hợp giữa bốn vai. Không ai sửa file này một mình;
 * đổi kiểu ở đây phải có đồng ý của cả bốn người. Vai A giữ bút.
 *
 * Hai ranh giới được cưỡng chế bằng chính kiểu dữ liệu, không bằng lời dặn:
 *   1. `level` chỉ do L2 (engine luật) sinh ra. AI không tạo và không sửa.
 *   2. Hàm diễn giải của L3 (`interpret`) KHÔNG có `level` trong kiểu trả về.
 *
 * Xem CLAUDE.md và DAC-TA-CORE.md.
 */

/** Verdict chính thức. Nhãn hiển thị tiếng Việt: Bình thường / Cần xem kỹ / Nguy hiểm.
 *  Không bao giờ hiển thị chữ "an toàn" — xem DAC-TA-L3.md mục 4. */
export type Level = "safe" | "warning" | "danger";

/** Tín hiệu riêng của L3. Không làm thay đổi `level`.
 *  AI không được xác nhận an toàn, cũng không được kết luận nguy hiểm —
 *  nó chỉ được yêu cầu người dùng kiểm tra thủ công. */
export type AiAdvisory = "review_required" | null;

export type PrimaryAction = {
  type: string;
  from?: string;
  to?: string;
};

export type DiffEntry = {
  label: string;
  before: string;
  after: string;
  /** Giữ nguyên `string` theo hợp đồng đã đóng băng. Giá trị dùng: "danger" | "warning" | "info". */
  severity: string;
  /**
   * Địa chỉ ĐẦY ĐỦ, chỉ có mặt khi `before`/`after` là địa chỉ đã rút gọn.
   *
   * Đây KHÔNG phải tiện nghi hiển thị mà là một vá bảo mật. Rút gọn `CRZa…picz`
   * giữ 4 ký tự đầu và 4 ký tự cuối; kẻ tấn công mài được một địa chỉ vanity khớp
   * đúng 8 ký tự đó, và người dùng đối chiếu bằng mắt sẽ thấy y hệt địa chỉ quen.
   * Một lớp bảo mật chỉ hiện bản rút gọn thì tự bịt mắt mình trước đúng trò đó.
   *
   * Trường tuỳ chọn nên không phá hợp đồng đã đóng băng: mã cũ bỏ qua được.
   */
  truocDayDu?: string;
  sauDayDu?: string;
};

export type Coverage = {
  analyzed: number;
  total: number;
  unverifiedPrograms: number;
};

export type InspectResult = {
  /** CHỈ L2 — vai A */
  level: Level;
  /** CHỈ L3 — vai C */
  aiAdvisory: AiAdvisory;
  /** Suy ra TỪ GIAO DỊCH, không phải từ lời khai của dApp — vai C */
  detectedPrimaryAction: PrimaryAction | null;
  /** vai A */
  diff: DiffEntry[];
  /** vai A */
  reasonCodes: string[];
  /** vai A */
  coverage: Coverage;
  /** vai C */
  explanation: string;
  /** Có mặt khi ngữ cảnh dApp khai LỆCH với hành động được nhận diện.
   *  Trường tuỳ chọn nên không phá hợp đồng đã đóng băng: mã cũ bỏ qua được.
   *  Khớp thì trường này VẮNG MẶT — và khớp không bao giờ làm giảm verdict. */
  loiKhaiLech?: { khai: string; nhanDien: string };
  /**
   * Dấu vết từ verdict về dữ kiện đã đo. Thẻ TB-X01.
   *
   * CHỈ có mặt khi người gọi bật `chanDoan: true`. Vắng mặt là mặc định, và mã cũ
   * bỏ qua được — cùng cách `loiKhaiLech` đã làm.
   *
   * Nó KHÔNG phải nguồn kết luận: `level` vẫn chỉ do L2 sinh, và bật/tắt trường này
   * không đổi một bit nào của verdict. Nó chỉ nói *"cảnh báo này dựa trên dữ kiện
   * nào"* — thứ trước đây chỉ tồn tại trong câu tiếng Việt của `detail`.
   */
  chanDoan?: ChanDoan;
};

/**
 * Chẩn đoán nội bộ — có version, và các khoá là ID ổn định.
 *
 * `phienBan` để consumer biết mình đang đọc schema nào; thẻ đòi *"diagnostic schema
 * nội bộ có version"*.
 *
 * Mọi khoá ở đây là base58 hoặc số thứ tự — **không** dùng text tiếng Việt để join.
 * Lý do cụ thể: `diff.ts` từng nối cảnh báo với dòng bảng bằng `detail.includes(...)`
 * và im lặng sai hai lần (luật 13, luật 11).
 */
export type ChanDoan = {
  phienBan: 1;
  /** Mỗi cảnh báo: từ mã lý do → luật → dữ kiện. */
  canhBao: Array<{
    ruleId: number;
    reasonCode: string;
    level: Level;
    /** Dữ kiện luật đã dựa vào. Rỗng ⇒ luật chưa khai, xem `thieuBangChung`. */
    bangChung: Array<{ loai: string; khoa: string }>;
  }>;
  /**
   * Cảnh báo chưa truy vết được tới dữ kiện.
   *
   * Thẻ đòi: *"Khi thiếu liên kết, hiển thị 'chưa có bằng chứng truy vết chi tiết'
   * thay vì suy diễn instruction gây lỗi từ vị trí trong mảng."* Nên chỗ này đếm ra,
   * không đoán bù.
   */
  thieuBangChung: number;
  /** Nguồn của từng con số — để người đọc biết dữ kiện đến từ tầng nào. */
  nguon: { tang: "L1"; coverage: Coverage; simulationOk: boolean };
};

/**
 * Ngữ cảnh do ví/dApp cung cấp. KHÔNG ĐÁNG TIN TUYỆT ĐỐI.
 *
 * Quy tắc bất đối xứng (CUSTOS.md mục 03):
 *   - lệch với detectedPrimaryAction  ⇒ nâng nghi ngờ (aiAdvisory)
 *   - khớp                            ⇒ KHÔNG giảm verdict, KHÔNG tắt cảnh báo nào
 * Một dApp độc hại hoàn toàn có thể khai đúng để trông vô hại.
 */
export type InspectOptions = {
  locale?: "vi";
  expectedAction?: PrimaryAction;
  /** Ký hiệu token theo địa chỉ mint, để hiển thị "USDC" thay vì "4YDg…Wpv1".
   *  Chỉ ảnh hưởng cách hiển thị — KHÔNG bao giờ ảnh hưởng verdict. */
  kyHieuToken?: Record<string, string>;
  /**
   * Địa chỉ ví NGƯỜI DÙNG mà Custos phải bảo vệ.
   *
   * Thêm ngày 22/08 sau audit bảo mật (SECURITY-AUDIT.md — F1b). Trường TUỲ CHỌN
   * nên không phá hợp đồng đã đóng băng: mã cũ bỏ qua được.
   *
   * Vì sao cần: mặc định Custos bảo vệ `staticAccountKeys[0]`, tức NGƯỜI TRẢ PHÍ.
   * Trong giao dịch được tài trợ phí, đó không phải người dùng — và khi đó mọi
   * luật đều nhắm vào ví của bên kia. Chỉ ví mới biết địa chỉ nào là của người
   * dùng, nên nó phải nói ra.
   *
   * KHÔNG PHẢI ngữ cảnh kiểu `expectedAction`: đây là ví tự khai địa chỉ của
   * chính mình, không phải dApp khai ý định. Vắng mặt mà giao dịch có nhiều
   * người ký ⇒ Custos nâng nghi ngờ thay vì đoán.
   */
  nguoiDung?: string;
  /**
   * Bật dấu vết chẩn đoán (TB-X01). Mặc định TẮT.
   *
   * Tắt là mặc định có chủ ý: `chanDoan` mang địa chỉ đầy đủ của mọi tài khoản liên
   * quan, và phần lớn consumer không cần chúng trong đường hiển thị. Thẻ đòi *"tách
   * raw diagnostics nhạy cảm khỏi phần hiển thị/export mặc định"*.
   *
   * Bật hay tắt **không đổi verdict** và **không thêm một lượt RPC nào** — dữ liệu
   * lấy từ `l2.hits` đã tính xong.
   */
  chanDoan?: boolean;
};

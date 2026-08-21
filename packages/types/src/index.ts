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
};

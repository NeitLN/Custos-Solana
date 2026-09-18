import type { Level } from "@custos-solana/types";

/**
 * CU-18 — POLICY CỦA VÍ, TÁCH HẲN KHỎI ENGINE.
 *
 * Engine (L2) trả lời *"giao dịch này có gì"*. Policy trả lời *"ví của tôi có cho
 * ký không"*. Hai câu khác nhau, hai chủ thể khác nhau, và trộn chúng là cách
 * nhanh nhất để một bên âm thầm ghi đè bên kia.
 *
 * ## Bất biến quan trọng nhất: policy CHỈ được thận trọng hơn
 *
 * Giống quy tắc bất đối xứng của `expectedAction` (CUSTOS.md mục 03), và vì cùng
 * một lý do: nếu policy nới được kết luận của engine thì kẻ tấn công chỉ cần làm
 * ví nạp một profile dễ dãi, và toàn bộ lớp phát hiện trở thành trang trí.
 *
 *   engine `danger`  ⇒ quyết định KHÔNG BAO GIỜ là `allow`.
 *
 * `capDo()` cưỡng chế điều này ở một chỗ duy nhất, và có bài đối chứng chạy **toàn
 * bộ truth table** để không ai nới được bằng cách thêm nhánh.
 *
 * ## Profile đến TỪ VÍ, không từ giao dịch
 *
 * Thẻ nói đích danh: *"không lấy policy từ tx/dApp payload"*. Một dApp độc hại tự
 * khai profile của mình là chuyện phải chặn bằng thiết kế, không bằng lời dặn —
 * nên `danhGiaPolicy()` nhận profile qua tham số riêng, và không có đường nào cho
 * nó đọc dữ liệu giao dịch. Có guard đọc mã.
 *
 * ## Điều file này KHÔNG làm
 *
 * - Không đụng `level`, `reasonCodes`, `diff`, `coverage`. Nó **đọc** chúng.
 * - Không có allowlist bỏ qua hành vi quan sát được. Xem `ChoPhepProgram`.
 * - Không ghi gì lên chain, không ký gì.
 */

/** Đổi khi luật quyết định đổi, để biên bản cũ đọc được là của luật nào. */
export const PHIEN_BAN_POLICY = 1;

export type QuyetDinh = "allow" | "review" | "block";

/** Mã lý do của POLICY. Tách hẳn không gian tên với mã lý do của engine. */
export type MaPolicy =
  | "POLICY__ENGINE_DANGER"
  | "POLICY__ENGINE_WARNING"
  | "POLICY__COVERAGE_THAP"
  | "POLICY__PROGRAM_LA"
  | "POLICY__PHIEN_QUA_CU"
  | "POLICY__PHIEN_KHONG_RO"
  | "POLICY__PROFILE_CHAT_HON";

export type ProfileVi = {
  /** Tên để hiển thị *ai* đã ra quyết định. Thẻ đòi UI nói được điều này. */
  ten: string;
  /**
   * Engine `warning` thì chặn luôn hay chỉ bắt xem lại.
   *
   * KHÔNG có tuỳ chọn nào cho `danger`, và đó là chủ ý: `danger` luôn `block`.
   */
  warningLaBlock: boolean;
  /**
   * Ngưỡng coverage. Dưới ngưỡng ⇒ ít nhất `review`.
   *
   * Mặc định 0 nghĩa là KHÔNG dùng ngưỡng — vì coverage thấp là chuyện bình
   * thường trên mainnet (đo được: trung bình 8 %), và bắt buộc review ở đó là
   * cảnh báo mọi giao dịch. Ví nào muốn chặt hơn thì tự đặt.
   */
  nguongCoverage: number;
  /** Có program chưa xác minh ⇒ ít nhất `review`. */
  programLaLaReview: boolean;
};

export const PROFILE_MAC_DINH: ProfileVi = {
  ten: "mặc định",
  warningLaBlock: false,
  nguongCoverage: 0,
  programLaLaReview: false,
};

/** Dữ kiện policy đọc. Tất cả do ví/engine cung cấp, KHÔNG do dApp. */
export type BoiCanhPolicy = {
  /** Verdict của L2. Policy đọc, không sửa. */
  level: Level;
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
  /**
   * Phiên kiểm còn dùng được không.
   *
   * `null` nghĩa **không biết**, và không biết KHÔNG được đọc thành còn tốt —
   * fail-safe giống toàn bộ phần còn lại của sản phẩm.
   */
  phienConDung: boolean | null;
};

export type KetQuaPolicy = {
  quyetDinh: QuyetDinh;
  phienBanPolicy: number;
  /** Profile nào đã ra quyết định này. */
  profile: string;
  maLyDo: MaPolicy[];
  /** Câu tiếng Việt cho UI, nói rõ AI quyết định. */
  cau: string;
};

const NANG: Record<QuyetDinh, number> = { allow: 0, review: 1, block: 2 };

/** Lấy quyết định NGHIÊM HƠN. Đây là chỗ duy nhất hai quyết định gặp nhau. */
function capDo(a: QuyetDinh, b: QuyetDinh): QuyetDinh {
  return NANG[b] > NANG[a] ? b : a;
}

/**
 * Quyết định của ví.
 *
 * `profile` là tham số RIÊNG, không nằm trong `boiCanh` — để không có đường nào
 * cho một payload giao dịch mang theo profile của chính nó.
 */
export function danhGiaPolicy(
  boiCanh: BoiCanhPolicy,
  profile: ProfileVi = PROFILE_MAC_DINH,
): KetQuaPolicy {
  const ma: MaPolicy[] = [];
  let qd: QuyetDinh = "allow";

  // 1 · Verdict engine. `danger` không có đường nào thành `allow`.
  if (boiCanh.level === "danger") {
    qd = capDo(qd, "block");
    ma.push("POLICY__ENGINE_DANGER");
  } else if (boiCanh.level === "warning") {
    qd = capDo(qd, profile.warningLaBlock ? "block" : "review");
    ma.push("POLICY__ENGINE_WARNING");
    if (profile.warningLaBlock) ma.push("POLICY__PROFILE_CHAT_HON");
  }

  // 2 · Phiên kiểm. Không biết ⇒ review, KHÔNG allow.
  if (boiCanh.phienConDung === false) {
    qd = capDo(qd, "block");
    ma.push("POLICY__PHIEN_QUA_CU");
  } else if (boiCanh.phienConDung === null) {
    qd = capDo(qd, "review");
    ma.push("POLICY__PHIEN_KHONG_RO");
  }

  // 3 · Ngưỡng do ví đặt. Chỉ làm chặt hơn, không bao giờ nới.
  const { analyzed, total, unverifiedPrograms } = boiCanh.coverage;
  if (profile.nguongCoverage > 0 && total > 0 && analyzed / total < profile.nguongCoverage) {
    qd = capDo(qd, "review");
    ma.push("POLICY__COVERAGE_THAP");
  }
  if (profile.programLaLaReview && unverifiedPrograms > 0) {
    qd = capDo(qd, "review");
    ma.push("POLICY__PROGRAM_LA");
  }

  return {
    quyetDinh: qd,
    phienBanPolicy: PHIEN_BAN_POLICY,
    profile: profile.ten,
    maLyDo: ma,
    cau: cauChoNguoiDoc(qd, profile.ten, boiCanh.level),
  };
}

/**
 * Câu cho UI.
 *
 * Nói rõ **ai** quyết định và **dựa trên gì** — thẻ đòi *"UI giải thích được ai đưa
 * ra quyết định nào"*. Một dòng "Bị chặn" không nói ai chặn sẽ bị người dùng đọc
 * thành "Custos bảo giao dịch này xấu", trong khi có thể chỉ là ví đang đặt chặt.
 */
function cauChoNguoiDoc(qd: QuyetDinh, tenProfile: string, level: Level): string {
  const nhan = { safe: "bình thường", warning: "cần xem kỹ", danger: "nguy hiểm" }[level];
  if (qd === "block") return `Ví (quy tắc "${tenProfile}") chặn ký. Engine xếp giao dịch ở mức ${nhan}.`;
  if (qd === "review") return `Ví (quy tắc "${tenProfile}") yêu cầu bạn xem lại trước khi ký. Engine xếp ở mức ${nhan}.`;
  return `Ví (quy tắc "${tenProfile}") không chặn. Engine xếp ở mức ${nhan} — đây KHÔNG phải lời bảo đảm an toàn.`;
}

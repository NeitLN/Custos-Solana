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
  /**
   * Số liệu THÔ của dòng này — CU-06, mục 4.2 của `UPDATE-CUSTOS.md`.
   *
   * ## Vì sao cần, khi đã có `before`/`after`
   *
   * `before` và `after` là chuỗi ĐÃ FORMAT theo quy ước tiếng Việt: dấu chấm phân
   * nhóm nghìn, dấu phẩy thập phân. Một consumer muốn cộng, so sánh hay quy đổi
   * phải **parse ngược** chuỗi đó — và parse ngược một chuỗi hiển thị là cách chắc
   * chắn nhất để một bản sửa định dạng làm hỏng phép tính của người khác.
   *
   * Mục 4.2 nói thẳng: *"Giữ raw amounts, decimals, mint và account; format chỉ ở
   * UI"* và *"Không gộp hai mint có cùng symbol"*.
   *
   * ## Vì sao là chuỗi chứ không phải `bigint`
   *
   * `InspectResult` phải `JSON.stringify` được — receipt (CU-11) và replay (CU-12)
   * đều đi qua JSON, và `bigint` ném `TypeError` ở đó. Chuỗi thập phân giữ đủ độ
   * chính xác và không mất mát khi tuần tự hoá.
   *
   * Trường TUỲ CHỌN: dòng không nói về số lượng (chủ sở hữu, chương trình điều
   * khiển) thì vắng mặt, và mã cũ bỏ qua được.
   */
  soLieu?: {
    /** Giá trị thô trước, dạng chuỗi thập phân base-unit. */
    truoc: string;
    /** Giá trị thô sau, dạng chuỗi thập phân base-unit. */
    sau: string;
    /** Số chữ số thập phân của token. SOL là 9. */
    decimals: number;
    /**
     * Mint của token này. Vắng mặt với dòng SOL gốc (không phải wSOL).
     *
     * Đây là thứ phân biệt hai token TRÙNG KÝ HIỆU — `kyHieu` không làm được
     * điều đó, và gộp chúng là đúng lỗi mục 4.2 cấm.
     */
    mint?: string;
    /** Địa chỉ tài khoản mang số dư này, khi dòng nói về một tài khoản cụ thể. */
    taiKhoan?: string;
  };
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
    bangChung: Array<{
      loai: string;
      khoa: string;
      /**
       * Nguồn của dữ kiện — CU-04, mục 4.2 của `UPDATE-CUSTOS.md`.
       *
       * Bốn trạng thái, không phải hai, vì chúng nói bốn câu khác nhau với người
       * đang quyết định có kiểm lại hay không:
       *
       *   `observed`    đọc thẳng từ RPC trong lượt này
       *   `derived`     suy từ dữ kiện đã đọc (ví dụ hiệu số trước/sau)
       *   `missing`     lượt này không đọc được — kiểm lại CÓ THỂ ra
       *   `unsupported` Custos chưa hỗ trợ — kiểm lại cũng KHÔNG ra
       *
       * Gộp `missing` vào `unsupported` là nói với người dùng rằng sản phẩm không
       * hỗ trợ thứ mà thật ra nó chỉ không đọc được lần này.
       *
       * Trường TUỲ CHỌN để mã đọc `ChanDoan` bản trước không vỡ.
       */
      nguon?: "observed" | "derived" | "missing" | "unsupported";
      /** Vì sao `missing`/`unsupported`. Vắng mặt với hai trạng thái còn lại. */
      lyDo?: string;
      /** Lệnh liên quan. Vắng mặt KHÔNG có nghĩa "không lệnh nào" — xem CU-04. */
      lenh?: Array<{ index: number; isInner: boolean; parentIndex: number | null }>;
    }>;
  }>;
  /**
   * Cảnh báo chưa truy vết được tới dữ kiện.
   *
   * Thẻ đòi: *"Khi thiếu liên kết, hiển thị 'chưa có bằng chứng truy vết chi tiết'
   * thay vì suy diễn instruction gây lỗi từ vị trí trong mảng."* Nên chỗ này đếm ra,
   * không đoán bù.
   */
  thieuBangChung: number;
  /**
   * Dữ kiện luật KHAI mà `Facts` không có. Rỗng là điều kiện đúng.
   *
   * Khác hẳn `thieuBangChung`, và sự khác nhau đó là điểm chính của CU-04:
   *
   *   `thieuBangChung`  luật CHƯA KHAI gì  — chưa hoàn thiện
   *   `bangChungTreo`   luật KHAI SAI      — đang nói dối về căn cứ của nó
   *
   * Một ID trỏ vào hư không tệ hơn không có ID: nó mời người đọc đi kiểm rồi để
   * họ gặp 404. Trường tuỳ chọn để bản `ChanDoan` cũ không vỡ.
   */
  bangChungTreo?: Array<{ ruleId: number; loai: string; khoa: string }>;
  /** Nguồn của từng con số — để người đọc biết dữ kiện đến từ tầng nào. */
  nguon: {
    tang: "L1";
    coverage: Coverage;
    simulationOk: boolean;
    /**
     * Coverage theo NĂNG LỰC — CU-07.
     *
     * `coverage.analyzed` gộp hai điều kiện khác nhau: *program đã xác minh* và
     * *lệnh decode được*. Nên một con số như `36/106` không cho biết 70 lệnh còn
     * lại thiếu vì lý do gì — mà ba lý do đó dẫn tới ba hành động khác nhau của
     * người dùng.
     *
     * Đo trên corpus, 106 lệnh:
     *
     *   program quen + decode được    36
     *   program quen + CHƯA đọc hiểu  58   <- nhóm lớn nhất, cần thêm decoder
     *   program LẠ                    12   <- người dùng tra được địa chỉ program
     *
     * Bốn nhóm cộng lại đúng bằng `total`, và có bài test canh phép cộng đó — để
     * không ai làm con số đẹp lên bằng cách đổi tên mức decode.
     *
     * KHÔNG phải risk score. Mục 11 cấm đích danh việc thêm một phần trăm chưa
     * hiệu chuẩn, vì nó sẽ bị đọc thành xác suất an toàn.
     *
     * Trường tuỳ chọn: `ChanDoan` bản trước không có, và mã cũ bỏ qua được.
     */
    chiTiet?: {
      hieuDuoc: number;
      quenNhungChuaDoc: number;
      chuongTrinhLa: number;
      soChuongTrinhLa: number;
      danhSachLa: Array<{ programId: string; soLenh: number; chamTaiSan: boolean }>;
    };
  };
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

/** Đầu ra của L1. Đây là thứ DUY NHẤT mà L2 và L3 được nhìn thấy —
 *  L3 không bao giờ nhận giao dịch thô. Xem DAC-TA-CORE.md mục 2.4 và 5.1. */

export type TokenAccountFact = {
  address: string;
  mint: string;
  /** ví sở hữu số dư */
  ownerBefore: string | null;
  ownerAfter: string | null;
  amountBefore: bigint;
  amountAfter: bigint;
  delegateBefore: string | null;
  delegateAfter: string | null;
  delegatedAmountAfter: bigint;
  closeAuthorityBefore: string | null;
  closeAuthorityAfter: string | null;
  /** program sở hữu chính account đó — ĐỪNG NHẦM với ownerBefore/After */
  programOwnerBefore: string | null;
  programOwnerAfter: string | null;
};

export type MintFact = {
  address: string;
  /** Ký hiệu token đọc TỪ CHUỖI (Metaplex, hoặc extension metadata của Token-2022).
   *
   *  `null` = không đọc được, và khi đó hiển thị quay về địa chỉ rút gọn. Đây là
   *  chuỗi do NGƯỜI PHÁT HÀNH TOKEN đặt, nên vẫn là dữ liệu không đáng tin: nó đã
   *  đi qua cùng bộ lọc hình dạng với `kyHieuToken` do dApp truyền vào. */
  kyHieu: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  permanentDelegate: string | null;
  transferHookProgramId: string | null;
  isToken2022: boolean;
  decimals: number;
};

export type InstructionFact = {
  index: number;
  programId: string;
  isInner: boolean;
  parentIndex: number | null;
  /**
   * Lệnh đã đọc hiểu.
   *
   * `authority` chỉ có với những lệnh mà nó CÓ NGHĨA và ta đọc được từ danh sách
   * account — hiện là các lệnh chuyển/đốt của SPL Token. Vắng mặt nghĩa là chưa
   * bóc được, KHÔNG có nghĩa là "không có ai". Luật phải xử lý hai chuyện đó khác nhau.
   */
  decoded: { kind: string; authority?: string } | null;
  fromLookupTable: boolean;
  /** Lệnh này có ghi vào tài khoản nào thuộc người ký không?
   *  Không đọc hiểu một lệnh chỉ đáng lo khi lệnh đó CHẠM ĐƯỢC vào tài sản
   *  của người ký. Lệnh lạ không ghi gì của bạn thì không hại được bạn. */
  chamTaiSanNguoiKy: boolean;
};

/** MỌI account được theo dõi, không chỉ tài khoản token.
 *  Cần cho luật 12: `SystemProgram.assign` tác động lên account thường,
 *  nên nếu chỉ nhìn `tokenAccounts` sẽ bỏ lọt đúng vector của ca Coinspect. */
export type AccountFact = {
  address: string;
  isSigner: boolean;
  /** program sở hữu account */
  programOwnerBefore: string | null;
  programOwnerAfter: string | null;
  lamportsBefore: bigint;
  lamportsAfter: bigint;
};

export type Facts = {
  /**
   * Địa chỉ Custos đang BẢO VỆ.
   *
   * Mặc định là `staticAccountKeys[0]`, tức người trả phí. Nhưng trong giao dịch
   * được tài trợ phí, người trả phí KHÔNG phải người dùng — và khi đó mọi luật
   * đều nhắm nhầm ví. Ví/dApp truyền `InspectOptions.nguoiDung` để chỉ đúng địa
   * chỉ cần bảo vệ. Xem SECURITY-AUDIT.md — F1b.
   */
  signer: string;
  /** MỌI địa chỉ phải ký giao dịch này. Nhiều hơn một mà không có chỉ định thì
   *  Custos không biết đang bảo vệ ai, và phải nói ra thay vì đoán. */
  nguoiKy: string[];
  /** Ví/dApp có chỉ định rõ người dùng không. */
  nguoiDungDuocChiDinh: boolean;
  /**
   * Phí mạng, tính bằng lamport.
   *
   * Lấy từ `getFeeForMessage` của RPC — con số CHÍNH XÁC, kể cả phí ưu tiên.
   * Kiểm trên bốn giao dịch mainnet: khớp từng lamport với `meta.fee` thật.
   *
   * Lui về ước tính (5000 mỗi chữ ký, cộng phí ưu tiên nếu đọc được cả giá lẫn
   * hạn mức compute unit) khi RPC không trả lời. Khi đó `phiChinhXac` là `false`
   * và nhãn hiển thị phải nói rõ là ước tính.
   */
  phiUocTinh: bigint;
  /** Phí ở trên có phải số chính xác từ RPC không, hay chỉ là cận dưới. */
  phiChinhXac: boolean;
  simulationOk: boolean;
  simulationError: string | null;
  accounts: AccountFact[];
  tokenAccounts: TokenAccountFact[];
  mints: MintFact[];
  solDelta: Record<string, bigint>;
  /** Tuổi ví nhận, tính bằng GIỜ. `null` = không tra được.
   *
   *  Đây là dữ liệu LÀM GIÀU, không phải dữ liệu đo. Tra cứu thất bại thì luật
   *  liên quan không kích hoạt — và KHÔNG được đẩy verdict lên warning vì lý do
   *  đó. Xem DAC-TA-CORE.md mục 3.3: fail-safe áp cho đường decode, không áp
   *  cho đường làm giàu. Áp nhầm thì mọi giao dịch ra Vàng. */
  tuoiViNhan: Record<string, number | null>;
  instructions: InstructionFact[];
  lookupTables: { address: string; resolved: boolean }[];
  /**
   * Account CÓ MẶT trong giao dịch nhưng KHÔNG đo được trạng thái sau.
   *
   * Đây là chỗ `Facts` phân biệt "đo được và bằng không" với "chưa đo được".
   * Trước khi có trường này, cả hai đều rơi về `null` rồi bị đọc như "số dư 0,
   * không đổi chủ" — sai theo cả hai chiều cùng lúc: bỏ lọt tấn công vì tưởng
   * không có gì đổi, và bịa ra mất mát vì tưởng số dư về 0.
   *
   * Ba nguồn: bị cắt ở trần `MAX_SIM_ACCOUNTS`, RPC không trả dữ liệu account,
   * và mô phỏng hỏng. Rỗng nghĩa là phép đo đầy đủ.
   *
   * Xem docs/bao-mat/SECURITY-AUDIT.md — F2 và A1.
   */
  accountKhongDoDuoc: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
};

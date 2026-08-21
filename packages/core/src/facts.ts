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
   * Phí mạng ước tính, tính bằng lamport.
   *
   * ĐÂY LÀ CẬN DƯỚI, không phải con số chính xác: phí cơ bản 5000 lamport mỗi
   * chữ ký thì chắc chắn, còn phí ưu tiên chỉ tính được khi giao dịch có CẢ
   * `setComputeUnitPrice` lẫn `setComputeUnitLimit` đọc được. Thiếu một trong
   * hai thì phần ưu tiên bỏ qua thay vì đoán.
   *
   * Vì là cận dưới, phần lamport rời ví vượt quá con số này có thể vẫn còn lẫn
   * một ít phí. Luật dùng ngưỡng theo TỈ LỆ số dư nên sai số đó không đủ để
   * kích hoạt cảnh báo — nhãn hiển thị thì có thể lệch vài nghìn lamport.
   */
  phiUocTinh: bigint;
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

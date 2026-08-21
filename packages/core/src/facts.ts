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
  decoded: { kind: string } | null;
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
  signer: string;
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
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
};

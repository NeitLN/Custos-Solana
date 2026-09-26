/** Đầu ra của L1. Đây là thứ DUY NHẤT mà L2 và L3 được nhìn thấy —
 *  L3 không bao giờ nhận giao dịch thô. Xem docs/DAC-TA-CORE.md mục 2.4 và 5.1. */

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

/**
 * NGỮ CẢNH CỦA MỘT LƯỢT MÔ PHỎNG — CU-03, mục 4.4 của `docs/roadmap/UPDATE-CUSTOS.md`.
 *
 * ## Vì sao `simulationOk: boolean` là không đủ
 *
 * Custos gọi `simulateTransaction` với `replaceRecentBlockhash: true` — bắt buộc,
 * vì `sigVerify: false` và giao dịch chưa ký. Hệ quả là **RPC thay blockhash khác
 * vào trước khi chạy thử**.
 *
 * Nên một lượt mô phỏng PASS không chứng minh message gốc còn gửi được: nó chứng
 * minh *một message giống hệt nhưng mang blockhash khác* chạy được. Nếu blockhash
 * gốc đã hết hạn, giao dịch thật sẽ bị từ chối — trong khi Custos vừa báo bình
 * thường.
 *
 * Đo trên Devnet thật (`api.devnet.solana.com`, apiVersion 4.3.0-rc.0): RPC **có**
 * trả `value.replacementBlockhash` gồm `blockhash` và `lastValidBlockHeight`, và
 * `context.slot`. Cả hai đang bị `extractFacts` vứt đi.
 *
 * ## Điều loại này KHÔNG khẳng định
 *
 * - `slot` **không** biến nhiều lời gọi RPC thành một snapshot chung. Mỗi lời gọi
 *   có slot riêng; ghi lại slot của lượt mô phỏng không có nghĩa `getMultipleAccounts`
 *   trước đó đọc cùng một trạng thái.
 * - `apiVersion` là **RPC tự khai**. Nó giúp tái lập, không phải bằng chứng.
 * - Không trường nào ở đây chứng minh RPC nói thật. Xem `THREAT-MODEL.md`.
 */
export type NguCanhMoPhong = {
  /** Slot mà RPC khai lúc trả kết quả mô phỏng. `null` khi không đọc được. */
  slot: number | null;
  /** Phiên bản RPC tự khai — để tái lập, KHÔNG phải bằng chứng. */
  apiVersion: string | null;
  /**
   * Blockhash mà RPC dùng để chạy thử, do chính RPC khai.
   *
   * `null` ⇒ RPC không khai. Khi đó **không được kết luận là không thay** —
   * thiếu dữ liệu là thiếu dữ liệu.
   */
  blockhashThayThe: string | null;
  /** `lastValidBlockHeight` của blockhash RPC dùng — không phải của blockhash gốc. */
  hanBlockhashThayThe: number | null;
  /**
   * Blockhash trong message GỐC, để đối chiếu.
   *
   * Đọc từ chính transaction, không từ RPC.
   */
  blockhashGoc: string | null;
  /**
   * Mô phỏng có chạy trên ĐÚNG blockhash của message gốc không?
   *
   * ## Một giả thuyết đã bị chính phép đo bác bỏ — ghi lại để không ai thử lại
   *
   * Lần đo đầu trên Devnet cho: blockhash tươi ⇒ `replacementBlockhash` **giống hệt**
   * gốc; blockhash slot −300 ⇒ **khác** gốc. Nhìn như một phép đo lifetime hoàn hảo,
   * và tôi đã suýt xây tính năng "cảnh báo blockhash hết hạn" lên trên nó.
   *
   * Lặp lại thì bác bỏ. Đếm trên 8 lượt, **mỗi lượt lấy blockhash mới ngay trước
   * khi mô phỏng**: `replacementBlockhash` giống gốc **6 lần**, khác gốc **2 lần**.
   * Cùng một điều kiện, hai kết quả — nên nó phụ thuộc thời điểm RPC xử lý, không
   * phụ thuộc việc blockhash còn hiệu lực hay không. Cũng không phụ thuộc options:
   * `accounts` và `innerInstructions` cho cùng kết quả.
   *
   * Nên trường này **KHÔNG đo được lifetime**. Nó chỉ nói đúng một điều:
   *
   *   `false` ⇒ RPC đã dùng một hash khác để chạy thử. Điều này XẢY RA HẦU HẾT
   *             mọi lượt, kể cả khi blockhash gốc còn tươi nguyên. Nó KHÔNG có
   *             nghĩa blockhash gốc hết hạn.
   *   `true`  ⇒ RPC tình cờ dùng đúng hash gốc. Hiếm.
   *   `null`  ⇒ không đủ dữ liệu để so.
   *
   * Giá trị thật của nó: nói ra rằng **kết quả mô phỏng mô tả một message khác
   * với message sẽ được ký** — đúng điều mục 4.4 đòi ghi lại. Nó là ngữ cảnh để
   * trình bày trung thực, KHÔNG phải tín hiệu rủi ro.
   *
   * KHÔNG dùng để nâng verdict, và có bài đối chứng canh điều đó.
   */
  chayTrenBlockhashGoc: boolean | null;
  /** Compute unit đã tiêu, nếu RPC trả. */
  computeDaTieu: number | null;
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
  /**
   * Ngữ cảnh của lượt mô phỏng — CU-03.
   *
   * TUỲ CHỌN để không phá hợp đồng: `Facts` cũ dựng bằng tay trong fixture và test
   * vẫn hợp lệ, và mọi chỗ đọc đều phải chịu được `undefined`.
   *
   * Vì sao cần: trước CU-03, toàn bộ ngữ cảnh RPC được nén thành **một bit**
   * (`simulationOk`). Một lượt mô phỏng thành công và một lượt mô phỏng thành công
   * TRÊN BLOCKHASH KHÁC trông y hệt nhau — trong khi chúng nói hai điều rất khác
   * nhau về việc message gốc có còn gửi được không.
   */
  nguCanh?: NguCanhMoPhong;
  accounts: AccountFact[];
  tokenAccounts: TokenAccountFact[];
  mints: MintFact[];
  solDelta: Record<string, bigint>;
  /** Tuổi ví nhận, tính bằng GIỜ. `null` = không tra được.
   *
   *  Đây là dữ liệu LÀM GIÀU, không phải dữ liệu đo. Tra cứu thất bại thì luật
   *  liên quan không kích hoạt — và KHÔNG được đẩy verdict lên warning vì lý do
   *  đó. Xem docs/DAC-TA-CORE.md mục 3.3: fail-safe áp cho đường decode, không áp
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

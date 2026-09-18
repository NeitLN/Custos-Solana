/**
 * Nội dung VI/EN — MỘT schema, hai bản dịch.
 *
 * `NoiDung` là kiểu dẫn xuất từ chính bản tiếng Việt, và bản tiếng Anh phải khớp
 * nó. Thiếu một key thì `tsc` đỏ — đó là cách rẻ nhất để bản EN không lặng lẽ rơi
 * lại phía sau khi ai đó thêm chữ mới (mục 10).
 *
 * Bản EN dịch TRUNG THÀNH giới hạn: *"không đổi 'không phát hiện' thành 'fully
 * secure'"*. Mọi câu về phạm vi, mẫu và điều Custos không làm đều giữ nguyên lực.
 */

export type Ngon = "vi" | "en";

export const VI = {
  meta: {
    title: "Custos — Hiểu giao dịch Solana trước khi ký",
    description:
      "Khám phá Custos: mô phỏng giao dịch Solana, xem thay đổi tài sản và quyền kiểm soát, rồi kiểm tra dữ kiện đứng sau cảnh báo. Bản demo trên Devnet.",
  },

  chung: {
    boQuaToiNoiDung: "Bỏ qua, tới nội dung chính",
    moDemo: "Mở demo Custos",
    xemCachHoatDong: "Xem cách hoạt động",
    moMenu: "Mở menu",
    dongMenu: "Đóng menu",
    doiNgonNgu: "Ngôn ngữ",
    tiengViet: "Tiếng Việt",
    tiengAnh: "English",
    moTabMoi: "mở trong tab mới",
    nguonDuLieu: "Nguồn dữ liệu",
    xemDiaChiDayDu: "Xem địa chỉ đầy đủ",
    daSaoChep: "Đã sao chép",
    khongSaoChepDuoc: "Chưa sao chép được. Bạn có thể chọn và sao chép nội dung.",
    mauThieu: "Chưa tải được kết quả mẫu. Thử lại hoặc mở demo.",
  },

  nav: {
    brand: "Custos",
    brandPhu: "Solana transaction insights",
    muc: [
      { nhan: "Cách hoạt động", dich: "#cach-hoat-dong" },
      { nhan: "Trải nghiệm", dich: "#trai-nghiem" },
      { nhan: "Cho nhà phát triển", dich: "#nha-phat-trien" },
      { nhan: "FAQ", dich: "#faq" },
    ],
  },

  hero: {
    kicker: "Kiểm tra giao dịch Solana trước ký",
    h1: "Hiểu điều bạn sắp ký.",
    moTa: "Xem thay đổi tài sản và quyền kiểm soát trong giao dịch Solana, cùng dữ kiện đứng sau mỗi cảnh báo.",
    ctaPhu: "Xem tình huống A/B",
    goiMoAB: "Cùng số dư. Khác quyền kiểm soát.",
    ghiChu: "Bản thử nghiệm Devnet · Không dùng tài sản thật",
    phieu: {
      tieuDe: "Phân tích giao dịch",
      nhanMau: "Kết quả mẫu đã lưu",
      mang: "Devnet",
      hanhDong: "Chuyển 10 token",
      nhomTaiSan: "Tài sản",
      nhomQuyen: "Quyền kiểm soát",
      nhanSoDu: "Số dư token",
      nhanQuyen: "Chủ tài khoản token",
      chuBan: "Bạn",
      diaChiKhac: "địa chỉ khác",
      cauCanhBao: "Có thao tác đổi chủ trong transaction mẫu.",
      xemDoiChieu: "Xem đối chiếu và bằng chứng",
      caption: "Minh họa từ một lượt mô phỏng Devnet; không phải giao dịch đã gửi.",
    },
  },

  dai: [
    { manh: "Solana Devnet", phu: "Môi trường thử nghiệm" },
    { manh: "SDK", phu: "Dành cho ví và dApp" },
    { manh: "Inspector", phu: "Kiểm tra transaction" },
    { manh: "Bằng chứng", phu: "Xem dữ kiện và giới hạn" },
  ],

  pipeline: {
    h2: "Cách Custos kiểm một giao dịch.",
    moTa: "Ba bước dưới đây là đường đi thật của một lượt kiểm, không phải sơ đồ minh họa.",
    buoc: [
      {
        tieuDe: "Nhận transaction chưa ký",
        moTa: "Ví hoặc dApp đưa giao dịch vào trước bước ký. Custos không cần khóa riêng.",
      },
      {
        tieuDe: "Mô phỏng và phân tích",
        moTa: "Chạy mô phỏng trên mạng, đọc thay đổi tài khoản, rồi áp bộ luật phát hiện.",
      },
      {
        tieuDe: "Trả kết quả kèm dữ kiện",
        moTa: "Kết quả đi cùng dữ kiện liên quan và phạm vi đã đọc hiểu được.",
      },
    ],
    ghiChu: "Ví hoặc dApp tích hợp Custos quyết định cách dùng kết quả trong luồng ký.",
  },

  giaTri: {
    the: [
      {
        tieuDe: "Xem hậu quả",
        moTa: "Đối chiếu trạng thái trước và sau mô phỏng để thấy thay đổi về tài sản, phí và quyền.",
      },
      {
        tieuDe: "Hiểu cảnh báo",
        moTa: "Đọc hành vi đáng chú ý bằng ngôn ngữ rõ ràng, cùng phạm vi Custos đã kiểm được.",
      },
      {
        tieuDe: "Kiểm bằng chứng",
        moTa: "Đi từ cảnh báo tới dữ kiện liên quan và mở thêm chi tiết khi cần kiểm sâu.",
      },
    ],
  },

  ab: {
    h2: "Cùng chuyển 10 token. Khác quyền kiểm soát.",
    moTa: "Hai tình huống dưới đây cùng để lại 490 token trong lượt mô phỏng mẫu. Nhưng một tình huống còn chuyển quyền kiểm soát tài khoản sang địa chỉ khác.",
    nhanNguon: "Kết quả mẫu đã lưu · hai simulation độc lập",
    chonA: "A · Chỉ chuyển",
    chonB: "B · Chuyển và đổi chủ",
    cotTruong: "Mục so sánh",
    moTaBang: "Đối chiếu hai tình huống mẫu A và B theo từng mục.",
    dongDoiChieu: "A và B đều còn 490 token sau mô phỏng; chỉ B có thao tác đổi chủ tài khoản.",
    hang: {
      tokenChuyen: "Token chuyển",
      soDuSau: "Số dư sau mô phỏng",
      doiChu: "Thao tác đổi chủ tài khoản",
      ketLuan: "Kết luận lượt mẫu",
    },
    giaTri: {
      tokenChuyen: "10",
      khongCoDoiChu: "Không có trong transaction mẫu",
      coDoiChu: "Có",
      ketLuanA: "Không phát hiện nguy hiểm trong phần đã đọc",
      ketLuanB: "Phát hiện thay đổi quyền kiểm soát",
    },
    moBangChungB: "Xem dữ kiện của ca B",
    dongBangChungB: "Đóng dữ kiện ca B",
    moBangChungA: "Xem dữ kiện của ca A",
    dongBangChungA: "Đóng dữ kiện ca A",
    bangChung: {
      tieuDe: "Dữ kiện đứng sau cảnh báo",
      dieuThayDoi: "Điều thay đổi",
      dieuThayDoiGiaTri: "Chủ sở hữu token account",
      truoc: "Trước",
      sau: "Sau",
      nguon: "Nguồn",
      nguonGiaTri: "Kết quả mô phỏng mẫu trên Devnet",
      luat: "Mã luật",
      kiemSau: "Xem chi tiết kỹ thuật",
      diaChiDayDu: "Địa chỉ đầy đủ",
      gioiHan: "Giới hạn",
      gioiHanND:
        "Đây là hai lượt mô phỏng độc lập. Chúng không chứng minh cùng một ảnh chụp trạng thái, và không có giao dịch nào được gửi lên mạng.",
      khongCoCanhBao:
        "Tình huống A không có mã cảnh báo nào trong lượt mẫu. Đây là kết luận về phần đã đọc, không phải lời bảo đảm an toàn.",
      doLuc: "Đo lúc",
      commitNguon: "Commit nguồn",
      moArtifact: "Mở dữ liệu nguồn",
      khongDuReplay:
        "Dữ liệu hiển thị ở đây đã được rút gọn để công bố. Nó không đủ để chạy lại engine.",
    },
    cta: "Mở demo để kiểm tra",
    ctaGhiChu: "Bạn sẽ chuyển sang ứng dụng demo.",
    ketLuan: "Số tiền là một phần của câu chuyện. Quyền kiểm soát cũng cần được nhìn thấy.",
  },


  devs: {
    h2: "Đưa phần kiểm tra vào trước bước ký.",
    moTa: "Tích hợp Custos vào ví hoặc dApp để phân tích transaction chưa ký, hiển thị cảnh báo và cho người dùng xem dữ kiện liên quan.",
    soDo: ["Ứng dụng tạo giao dịch", "Custos phân tích", "Hiển thị kết quả"],
    soDoNhanh: ["Kiểm tra phiên và sự đồng ý", "Chuyển đến bộ ký của ví"],
    luongTieuDe: "Từ transaction đến bước ký",
    luongPhanTich: "Phân tích giao dịch",
    luongDieuKien: "Điều kiện ký do ví quản lý",
    luongMoTa: ["Giao dịch chưa ký từ ví hoặc dApp", "Mô phỏng và phân tích thay đổi", "Cảnh báo, dữ kiện và phạm vi đã đọc"],
    luongNhanhMoTa: ["Gắn kết quả với đúng giao dịch và sự đồng ý", "Áp dụng điều kiện ký của ví"],
    codeChuThich: ["Đọc kết quả trước khi xử lý bước ký.", "phạm vi đã đọc hiểu", "thay đổi để hiển thị"],
    ghiChu:
      "SDK cung cấp kết quả phân tích. Ứng dụng tích hợp chịu trách nhiệm gắn kết quả với đúng giao dịch và xử lý điều kiện ký.",
    codeTieuDe: "Ví dụ phân tích một giao dịch",
    codeGhiChu:
      "Ví dụ phân tích; xem hướng dẫn consumer trước khi nối vào bước ký. Gói công khai trên npm là 0.1.1 và chưa có mọi thay đổi trong mã nguồn.",
    lien: [
      { nhan: "Đọc hướng dẫn SDK", khoa: "sdkDocs" },
      { nhan: "Mở Inspector", khoa: "inspector" },
      { nhan: "Xem hướng dẫn CLI", khoa: "cliDocs" },
    ],
  },

  bangChung: {
    h2: "Có dữ kiện để xem, có giới hạn để biết.",
    moTa: "Bạn có thể mở mã nguồn, xem cách đo và kiểm tra các tình huống đã ghi nhận. Kết quả cần được đọc cùng phạm vi hỗ trợ và điều kiện mô phỏng.",
    muc: [
      {
        tieuDe: "Mã nguồn và hướng dẫn",
        moTa: "Toàn bộ mã nguồn, tài liệu tích hợp SDK và consumer tham chiếu.",
        khoa: "repo",
      },
      {
        tieuDe: "Số liệu kèm cách đo",
        moTa: "Các con số của dự án, kèm lệnh và điều kiện đã dùng để đo.",
        khoa: "soLieu",
      },
      {
        tieuDe: "Phạm vi hỗ trợ",
        moTa: "Chương trình nào Custos đọc hiểu được, và đọc tới mức nào.",
        khoa: "phamVi",
      },
      {
        tieuDe: "Tình huống minh họa",
        moTa: "Artifact gốc của hai tình huống A/B trên trang này.",
        khoa: "nguonMau",
      },
    ],
    gioiHan:
      "Custos không bảo đảm một giao dịch an toàn tuyệt đối. Dữ liệu thiếu, chương trình chưa hỗ trợ và thay đổi trạng thái mạng có thể giới hạn kết quả. Bản demo dùng Solana Devnet.",
  },

  faq: {
    h2: "Câu hỏi thường gặp",
    moTa: "Phạm vi, giới hạn và cách đọc kết quả của Custos.",
    muc: [
      {
        hoi: "Custos có phải một ví mới không?",
        dap: "Custos tập trung vào phân tích giao dịch trước ký. Dự án có ví mẫu để trình diễn cách tích hợp; mục tiêu không phải yêu cầu người dùng chuyển tài sản sang một ví mới.",
      },
      {
        hoi: "Tôi có cần nhập seed phrase hoặc dùng tài sản thật để thử không?",
        dap: "Không cần cho website và luồng tình huống mẫu này. Demo sử dụng Devnet. Không nhập seed phrase hoặc khóa riêng vào trang giới thiệu hay Inspector.",
      },
      {
        hoi: "Kết quả “không phát hiện nguy hiểm” có nghĩa là an toàn tuyệt đối không?",
        dap: "Không. Kết quả chỉ có ý nghĩa trong phạm vi dữ liệu và chương trình đã phân tích. Hãy đọc coverage, dữ kiện còn thiếu và giới hạn đi kèm.",
      },
      {
        hoi: "AI có quyết định giao dịch nguy hiểm không?",
        dap: "Kết luận của lớp luật tất định được tách khỏi phần diễn giải. Nếu dùng AI để hỗ trợ giải thích, phần đó không được tự thay verdict hoặc sáng tạo dữ kiện.",
      },
      {
        hoi: "Tôi có thể thử transaction khác không?",
        dap: "Có thể dùng Inspector với đầu vào và mạng nằm trong phạm vi được công cụ hỗ trợ. Inspector phân tích transaction; không nhập khóa riêng và không coi kết quả là bảo đảm an toàn.",
      },
      {
        hoi: "Website đang chạy kiểm tra trực tiếp hay hiển thị kết quả mẫu?",
        dap: "Khung giới thiệu và phần A/B trên trang có nhãn kết quả mẫu đã lưu. Nút mở demo dẫn tới ứng dụng để chạy kiểm tra. Chế độ live hoặc replay phải được ghi rõ tại nơi hiển thị kết quả.",
      },
      {
        hoi: "Custos có tự chặn mọi ví ký giao dịch nguy hiểm không?",
        dap: "Không. Ví hoặc dApp cần tích hợp và xử lý kết quả đúng. Consumer tham chiếu là nơi dự án minh họa các điều kiện trước khi gọi signer.",
      },
      {
        hoi: "Tôi bắt đầu tích hợp từ đâu?",
        dap: "Mở hướng dẫn SDK và consumer mẫu. Kiểm phiên bản gói, phạm vi hỗ trợ và hành vi khi mô phỏng lỗi trước khi kết nối vào luồng ký của ứng dụng.",
      },
    ],
  },

  cuoi: {
    h2: "Xem giao dịch bằng một góc nhìn khác.",
    moTa: "Bắt đầu từ một tình huống mẫu, rồi mở dữ kiện đứng sau cảnh báo.",
    lienPhu: "Đọc tài liệu tích hợp",
  },

  footer: {
    dinhVi: "Phân tích giao dịch Solana trước khi ký.",
    lien: [
      { nhan: "Demo ví mẫu", khoa: "viMau" },
      { nhan: "Inspector", khoa: "inspector" },
      { nhan: "Tài liệu SDK", khoa: "sdkDocs" },
      { nhan: "GitHub", khoa: "repo" },
      { nhan: "Số liệu", khoa: "soLieu" },
    ],
    ghiChu: "Bản thử nghiệm trên Solana Devnet.",
  },
} as const;

/**
 * Bản EN phải khớp đúng hình dạng của VI — `tsc` cưỡng chế điều đó.
 *
 * `Mem` nới mọi string literal của `as const` thành `string`, nhưng GIỮ
 * `readonly`: bản VI dùng `as const` nên mảng của nó là `readonly`, và một kiểu
 * mutable sẽ không nhận được nó.
 *
 * Bản đầu tôi bỏ `readonly` rồi `as NoiDung` để ép — `tsc` từ chối đúng lý do
 * ("neither type sufficiently overlaps"). Ép kiểu ở đây sẽ vô hiệu hoá chính phép
 * kiểm mà kiểu này sinh ra để làm: bắt bản EN thiếu key.
 */
export type NoiDung = Mem<typeof VI>;

type Mem<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Mem<U>[]
    : T extends object
      ? { readonly [K in keyof T]: Mem<T[K]> }
      : T;

export const EN: NoiDung = {
  meta: {
    title: "Custos — Understand Solana transactions before signing",
    description:
      "Explore Custos: simulate Solana transactions, review asset and account-control changes, and inspect the evidence behind warnings. Devnet demo.",
  },

  chung: {
    boQuaToiNoiDung: "Skip to main content",
    moDemo: "Open the Custos demo",
    xemCachHoatDong: "See how it works",
    moMenu: "Open menu",
    dongMenu: "Close menu",
    doiNgonNgu: "Language",
    tiengViet: "Tiếng Việt",
    tiengAnh: "English",
    moTabMoi: "opens in a new tab",
    nguonDuLieu: "Data source",
    xemDiaChiDayDu: "Show the full address",
    daSaoChep: "Copied",
    khongSaoChepDuoc: "Could not copy. You can select and copy the content.",
    mauThieu: "Could not load the sample. Retry or open the demo.",
  },

  nav: {
    brand: "Custos",
    brandPhu: "Solana transaction insights",
    muc: [
      { nhan: "How it works", dich: "#cach-hoat-dong" },
      { nhan: "Explore", dich: "#trai-nghiem" },
      { nhan: "For developers", dich: "#nha-phat-trien" },
      { nhan: "FAQ", dich: "#faq" },
    ],
  },

  hero: {
    kicker: "Solana transaction checks before signing",
    h1: "Understand what you’re about to sign.",
    moTa: "Review changes to assets and account control in a Solana transaction, with evidence behind each warning.",
    ctaPhu: "Explore the A/B example",
    goiMoAB: "Same balance. Different account control.",
    ghiChu: "Devnet prototype · Do not use real assets",
    phieu: {
      tieuDe: "Transaction analysis",
      nhanMau: "Recorded sample",
      mang: "Devnet",
      hanhDong: "Transfer 10 tokens",
      nhomTaiSan: "Assets",
      nhomQuyen: "Account control",
      nhanSoDu: "Token balance",
      nhanQuyen: "Token account owner",
      chuBan: "You",
      diaChiKhac: "another address",
      cauCanhBao: "The sample transaction changes the account owner.",
      xemDoiChieu: "See the comparison and evidence",
      caption: "Based on a recorded Devnet simulation. No transaction was broadcast.",
    },
  },

  dai: [
    { manh: "Solana Devnet", phu: "Test environment" },
    { manh: "SDK", phu: "For wallets and dApps" },
    { manh: "Inspector", phu: "Check a transaction" },
    { manh: "Evidence", phu: "See the data and limits" },
  ],

  pipeline: {
    h2: "How Custos checks a transaction.",
    moTa: "These three steps are the real path of a check, not an illustrative diagram.",
    buoc: [
      {
        tieuDe: "Receive an unsigned transaction",
        moTa: "A wallet or dApp passes the transaction in before signing. Custos never needs a private key.",
      },
      {
        tieuDe: "Simulate and analyze",
        moTa: "Run the simulation, read account changes, then apply the detection rules.",
      },
      {
        tieuDe: "Return the result with evidence",
        moTa: "The result comes with the relevant data and the scope that was analyzed.",
      },
    ],
    ghiChu: "The wallet or dApp that integrates Custos decides how to use the result in its signing flow.",
  },

  giaTri: {
    the: [
      {
        tieuDe: "See the effects",
        moTa: "Compare state before and after simulation to understand changes to assets, fees, and permissions.",
      },
      {
        tieuDe: "Understand the warning",
        moTa: "Read a clear description of the finding and the scope of the analysis.",
      },
      {
        tieuDe: "Inspect the evidence",
        moTa: "Follow a warning to the relevant data and open technical details when needed.",
      },
    ],
  },

  ab: {
    h2: "Same 10-token transfer. Different account control.",
    moTa: "Both recorded examples leave 490 tokens after simulation. One also transfers control of the token account to another address.",
    nhanNguon: "Recorded sample · two independent simulations",
    chonA: "A · Transfer only",
    chonB: "B · Transfer and change owner",
    cotTruong: "Compared field",
    moTaBang: "Comparison of recorded scenarios A and B, field by field.",
    dongDoiChieu: "Both A and B leave 490 tokens after simulation; only B changes the account owner.",
    hang: {
      tokenChuyen: "Tokens transferred",
      soDuSau: "Balance after simulation",
      doiChu: "Account owner change",
      ketLuan: "Recorded result",
    },
    giaTri: {
      tokenChuyen: "10",
      khongCoDoiChu: "Not present in the sample transaction",
      coDoiChu: "Present",
      ketLuanA: "No danger detected in the analyzed scope",
      ketLuanB: "Account control changes detected",
    },
    moBangChungB: "View the data for scenario B",
    dongBangChungB: "Close the data for scenario B",
    moBangChungA: "View the data for scenario A",
    dongBangChungA: "Close the data for scenario A",
    bangChung: {
      tieuDe: "The data behind the warning",
      dieuThayDoi: "What changed",
      dieuThayDoiGiaTri: "Token account owner",
      truoc: "Before",
      sau: "After",
      nguon: "Source",
      nguonGiaTri: "Recorded Devnet simulation",
      luat: "Rule code",
      kiemSau: "Show technical details",
      diaChiDayDu: "Full address",
      gioiHan: "Limits",
      gioiHanND:
        "These are two independent simulations. They do not prove a shared state snapshot, and no transaction was broadcast.",
      khongCoCanhBao:
        "Scenario A produced no reason codes in this recorded run. That is a statement about the analyzed scope, not a guarantee of safety.",
      doLuc: "Measured at",
      commitNguon: "Source commit",
      moArtifact: "Open the source data",
      khongDuReplay:
        "The data shown here is reduced for publication. It is not sufficient to replay the engine.",
    },
    cta: "Open the demo to check",
    ctaGhiChu: "This opens the demo application.",
    ketLuan: "The amount is part of the story. Account control matters too.",
  },


  devs: {
    h2: "Add inspection before signing.",
    moTa: "Integrate Custos into a wallet or dApp to analyze unsigned transactions, display warnings, and expose the relevant evidence.",
    soDo: ["App builds a transaction", "Custos analyzes it", "Display the result"],
    soDoNhanh: ["Check session and consent", "Hand off to the wallet signer"],
    luongTieuDe: "From transaction to signing",
    luongPhanTich: "Transaction analysis",
    luongDieuKien: "Signing conditions belong to the wallet",
    luongMoTa: ["Unsigned transaction from a wallet or dApp", "Simulate and analyze changes", "Warnings, evidence and analyzed coverage"],
    luongNhanhMoTa: ["Bind the result to the transaction and consent", "Apply the wallet’s signing conditions"],
    codeChuThich: ["Read the result before handling signing.", "analyzed coverage", "changes to display"],
    ghiChu:
      "The SDK provides analysis. The consumer is responsible for binding it to the correct transaction and enforcing signing conditions.",
    codeTieuDe: "Example: analyzing one transaction",
    codeGhiChu:
      "Analysis example; read the consumer guide before wiring this into a signing step. The published npm package is 0.1.1 and does not yet include every change in the source.",
    lien: [
      { nhan: "Read the SDK guide", khoa: "sdkDocs" },
      { nhan: "Open Inspector", khoa: "inspector" },
      { nhan: "View CLI documentation", khoa: "cliDocs" },
    ],
  },

  bangChung: {
    h2: "Evidence you can inspect. Limits you can understand.",
    moTa: "Explore the source code, measurement methods, and recorded scenarios. Read every result alongside its supported scope and simulation conditions.",
    muc: [
      {
        tieuDe: "Source code and guides",
        moTa: "The full source, SDK integration guide, and reference consumer.",
        khoa: "repo",
      },
      {
        tieuDe: "Numbers with their methods",
        moTa: "Project measurements, with the commands and conditions used to produce them.",
        khoa: "soLieu",
      },
      {
        tieuDe: "Supported scope",
        moTa: "Which programs Custos can read, and how deeply it reads them.",
        khoa: "phamVi",
      },
      {
        tieuDe: "Recorded scenarios",
        moTa: "The source artifact for the two A/B scenarios on this page.",
        khoa: "nguonMau",
      },
    ],
    gioiHan:
      "Custos does not guarantee that a transaction is safe. Missing data, unsupported programs, and changing network state can limit its results. The demo uses Solana Devnet.",
  },

  faq: {
    h2: "Frequently asked questions",
    moTa: "Scope, limits, and how to read a Custos result.",
    muc: [
      {
        hoi: "Is Custos a new wallet?",
        dap: "Custos focuses on transaction analysis before signing. The project includes a demo wallet to show integration; it does not ask you to move assets into a new wallet.",
      },
      {
        hoi: "Do I need a seed phrase or real assets to try it?",
        dap: "No, not for this website and its sample flow. The demo uses Devnet. Do not enter a seed phrase or private key into the landing page or Inspector.",
      },
      {
        hoi: "Does “no danger detected” mean a transaction is completely safe?",
        dap: "No. The result is limited to the data and programs analyzed. Review coverage, missing evidence, and the stated limitations.",
      },
      {
        hoi: "Does AI decide whether a transaction is dangerous?",
        dap: "Deterministic rule results are separate from explanations. If AI helps explain a result, it must not override the verdict or invent evidence.",
      },
      {
        hoi: "Can I inspect another transaction?",
        dap: "Use Inspector for inputs and networks within its supported scope. Its analysis is not a guarantee of safety, and it does not need your private key.",
      },
      {
        hoi: "Is this page running a live check or showing a sample?",
        dap: "The product preview and A/B section show labeled, recorded samples. The demo button opens the application for further checks. Live and replay modes must be labeled where results appear.",
      },
      {
        hoi: "Does Custos automatically stop every wallet from signing?",
        dap: "No. A wallet or dApp must integrate it and handle its results correctly. The reference consumer demonstrates checks before calling a signer.",
      },
      {
        hoi: "Where should I start integrating?",
        dap: "Read the SDK guide and reference consumer. Verify package versions, supported scope, and failure handling before connecting analysis to your signing flow.",
      },
    ],
  },

  cuoi: {
    h2: "Take another look before you sign.",
    moTa: "Start with a sample scenario, then inspect the data behind the warning.",
    lienPhu: "Read the integration guide",
  },

  footer: {
    dinhVi: "Solana transaction analysis before signing.",
    lien: [
      { nhan: "Demo wallet", khoa: "viMau" },
      { nhan: "Inspector", khoa: "inspector" },
      { nhan: "SDK guide", khoa: "sdkDocs" },
      { nhan: "GitHub", khoa: "repo" },
      { nhan: "Numbers", khoa: "soLieu" },
    ],
    ghiChu: "Devnet prototype.",
  },
};

export const NOI_DUNG: Record<Ngon, NoiDung> = { vi: VI, en: EN };

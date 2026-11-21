import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  dungGiaoDichLanhTinh,
  dungGiaoDichThuongGiaMatToken,
  dungGiaoDichDoiChu,
  dungGiaoDichCapQuyenRut,
  dungGiaoDichCapQuyenVuaDu,
  dungGiaoDichTraoQuyenDong,
  dungGiaoDichChuyenThem,
  dungGiaoDichThieuDuLieu,
} from "../../../scripts/tan-cong.ts";
import { dungTxTanCongSong, canSoDu, HienTruongChuaSan } from "../../../scripts/hienTruongSong.ts";
import type { HienTruong } from "./hienTruong.ts";

/**
 * SỔ ĐĂNG KÝ KỊCH BẢN — một nơi duy nhất mô tả mọi tình huống demo.
 *
 * ## Vì sao cần một sổ đăng ký thay vì thêm nhánh `if` vào App.tsx
 *
 * Bản trước có đúng hai kịch bản và chúng sống trong một union hai nhánh
 * (`type Kich = "tanCong" | "lanhTinh"`) cùng một `dungTx` với một biểu thức ba
 * ngôi. Thêm kịch bản thứ ba vào hình dạng đó nghĩa là sửa bốn chỗ rời nhau:
 * union, `dungTx`, danh sách nút, và nhãn hiển thị. Quên một chỗ thì nút hiện ra
 * mà bấm vào chạy nhầm giao dịch — một lỗi không có gì bắt được.
 *
 * ## Ranh giới quan trọng nhất trong file này
 *
 * `bangChungMongDoi` là **kỳ vọng của người viết kịch bản**, KHÔNG phải kết quả.
 * Nó không bao giờ được hiển thị như thể engine đã kết luận như vậy, và không bao
 * giờ được trộn vào `InspectResult`. Nó tồn tại cho đúng hai việc:
 *
 *   1. Test đối chiếu: chạy thật rồi so — lệch thì kịch bản hoặc luật đã đổi.
 *   2. Ghi chú cho người trình bày: biết trước nên chờ thấy gì.
 *
 * Có guard đọc mã canh điều này trong `kichBan.test.ts`.
 *
 * ## Số lượng lấy từ CHUỖI, không từ file cấu hình (rà soát 25/09)
 *
 * `dungTx` nhận `soDuNguon` — số dư THẬT của tài khoản nguồn, đọc bằng
 * `docNguonSong()` ngay trước khi dựng. Bản trước đọc `ht.soLuong` trong
 * `hien-truong.json` rồi vá bằng "chia đôi", tức vẫn tin một con số đã trôi. Kịch
 * bản nào cần số dư mà số dư không đủ thì NÉM `HienTruongChuaSan` — giao diện báo
 * "hiện trường chưa sẵn sàng", không đẩy một giao dịch hỏng qua engine rồi trình bày
 * kết quả như phân tích thật.
 */

/** Mức hỗ trợ — kịch bản chạy được tới đâu trong môi trường hiện tại. */
export type MucHoTro =
  /** Dựng được giao dịch thật và mô phỏng trên Devnet. */
  | "devnet"
  /** Chỉ phát lại được từ fixture đã đóng băng; không dựng được tại chỗ. */
  | "phatLai"
  /** Chưa hỗ trợ trong bản này — nêu ra để không ai tưởng là bỏ sót. */
  | "chuaHoTro";

export type NhomRuiRo =
  | "thuongGiaMatToken"
  | "doiChu"
  | "capQuyen"
  | "chuyenThem"
  | "quyenDong"
  | "doiChung"
  | "thieuDuLieu";

/** Thứ `dungTx` cần ngoài hiện trường tĩnh: blockhash và số dư sống. */
export type NguCanhDung = {
  blockhash: string;
  /** Số dư THẬT của tài khoản token nguồn, đơn vị thô — từ `docNguonSong()`. */
  soDuNguon: bigint;
};

export type KichBan = {
  /** ID ỔN ĐỊNH — dùng trong URL, nhật ký và biên bản. Không đổi khi sửa nhãn. */
  id: string;
  nhom: NhomRuiRo;
  tieuDe: string;
  /** Câu mời — thứ một trang độc hại sẽ nói để người dùng bấm. */
  loiMoi: string;
  /** Tiền điều kiện: cần gì trong hiện trường thì kịch bản mới dựng được. */
  tienDieuKien: string;
  hoTro: MucHoTro;
  /**
   * Ca đối chứng của kịch bản này, nếu có: ID của một kịch bản gần giống mà engine
   * phải IM. Một ca xấu không có đối chứng thì không phân biệt được "engine bắt
   * đúng" với "engine gắn cờ mọi thứ".
   */
  doiChung?: string;
  /** Lời khai của dApp — cố ý GIAN ở các nhóm tấn công. Xem quy tắc bất đối xứng. */
  khai?: { type: string };
  /**
   * Ví KHÔNG khai `nguoiDung` khi kiểm kịch bản này.
   *
   * ⚠️ TRƯỜNG NÀY TỒN TẠI VÌ MỘT LỖI ĐÃ XẢY RA (rà soát 25/09). Ví luôn truyền
   * `nguoiDung: ht.nanNhan`, nên luật 14 — "không rõ đang bảo vệ ai" — KHÔNG BAO GIỜ
   * bật trên giao diện. Script mô phỏng Devnet lại bỏ `nguoiDung` cho ca này, nên
   * script "qua" trong khi giao diện hiện một thứ khác. Hai đường chạy lệch nhau
   * vì mỗi bên tự quyết.
   *
   * Nay cả ví lẫn script đọc CÙNG trường này. Không còn chỗ nào tự quyết.
   */
  khongKhaiNguoiDung?: true;
  /**
   * KỲ VỌNG, KHÔNG PHẢI KẾT QUẢ. Đọc chú thích đầu file trước khi dùng trường này.
   * `maMongDoi` là mã lý do người viết kịch bản chờ thấy; rỗng nghĩa là chờ engine im.
   */
  bangChungMongDoi: { maMongDoi: string[]; ghiChu: string };
  /** Dựng giao dịch. Ném `HienTruongChuaSan` nếu số dư sống không đủ cho kịch bản. */
  dungTx: (ht: HienTruong, nc: NguCanhDung) => VersionedTransaction;
};

/** Gom các `new PublicKey` dùng chung, để mỗi kịch bản chỉ viết phần khác nhau. */
function chung(ht: HienTruong, nc: NguCanhDung) {
  return {
    nanNhan: new PublicKey(ht.nanNhan),
    mint: new PublicKey(ht.mint),
    blockhash: nc.blockhash,
    taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
  };
}

/** Một token nguyên, tính theo đơn vị thô. */
function motToken(ht: HienTruong): bigint {
  return 10n ** BigInt(ht.decimals);
}

/** Mười token — lượng cố định cho các kịch bản không cần quét số dư. */
function muoiToken(ht: HienTruong): bigint {
  return 10n * motToken(ht);
}

export const KICH_BAN: KichBan[] = [
  {
    id: "thuong-gia-mat-token",
    nhom: "thuongGiaMatToken",
    tieuDe: "Claim a reward, but tokens leave the wallet",
    loiMoi: "Get 5,000 BONUS free — just sign to verify your wallet.",
    tienDieuKien: "The source account holds at least 10 tokens.",
    hoTro: "devnet",
    khai: { type: "airdrop" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Cố ý KHÔNG chờ mã Đỏ nào. Một loại tài sản rời ví là hành vi bình thường " +
        "của ví (luật 11 bỏ qua khi chỉ có một mint). Điều đáng nói nằm ở chỗ dApp " +
        "khai 'airdrop' trong khi giao dịch chuyển tiền ĐI — phần lệch do L3 nêu.",
    },
    dungTx: (ht, nc) => {
      canSoDu(nc.soDuNguon, muoiToken(ht), "reward-claim scenario");
      return dungGiaoDichThuongGiaMatToken({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
        soLuong: muoiToken(ht),
      });
    },
  },
  {
    id: "doi-chu-tai-khoan",
    nhom: "doiChu",
    tieuDe: "Token account owner changes",
    loiMoi: "Upgrade your wallet to Pro — sign to activate.",
    tienDieuKien: "The token account must currently belong to the signer (rule 1 requires ownerBefore === signer).",
    hoTro: "devnet",
    khai: { type: "upgrade" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
      ghiChu:
        "Số dư KHÔNG đổi — chỉ quyền kiểm soát đổi. Bảng chênh lệch phải phản ánh " +
        "đúng vậy; hiện số dư giảm ở ca này là dàn dựng (docs/CUSTOS.md quyết định 7).",
    },
    dungTx: (ht, nc) =>
      dungGiaoDichDoiChu({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
      }),
  },
  {
    id: "cap-quyen-vuot-so-du",
    nhom: "capQuyen",
    tieuDe: "Delegate allowance above the balance",
    loiMoi: "Let the exchange fill orders for you automatically.",
    tienDieuKien: "The delegate allowance must be GREATER than the current balance, otherwise rule 3 stays silent.",
    hoTro: "devnet",
    doiChung: "cap-quyen-vua-du",
    khai: { type: "approve" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_APPROVE_DELEGATE_LON"],
      ghiChu: "Cặp với ca đối chứng bên dưới: cùng instruction, chỉ khác hạn mức.",
    },
    // Hai lần số dư SỐNG cộng một token: luôn vượt, bất kể hiện trường trôi tới đâu.
    dungTx: (ht, nc) =>
      dungGiaoDichCapQuyenRut({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: nc.soDuNguon * 2n + motToken(ht),
      }),
  },
  {
    id: "cap-quyen-vua-du",
    nhom: "doiChung",
    tieuDe: "Delegate allowance within the balance — control case",
    loiMoi: "Let the exchange fill exactly the amount you ordered.",
    tienDieuKien: "The allowance does NOT EXCEED the live balance. The engine must stay SILENT.",
    hoTro: "devnet",
    khai: { type: "approve" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Ca ÂM TÍNH và nó quan trọng ngang ca dương. Không có nó thì không phân " +
        "biệt được 'bắt đúng Approve xấu' với 'gắn cờ mọi Approve'.",
    },
    /*
     * MỘT NỬA SỐ DƯ SỐNG — nằm dưới ngưỡng của luật 3 với biên rộng.
     *
     * Bản trước lấy `ht.soLuong` (500 000 000) từ file cấu hình trong khi số dư thật
     * là 490 000 000: ca ĐỐI CHỨNG vượt số dư và tự trả `danger`. Rồi được vá thành
     * "một nửa số cấu hình" — tức vẫn tin một con số đã trôi. Nay tính từ chuỗi.
     */
    dungTx: (ht, nc) => {
      if (nc.soDuNguon < 2n) throw new HienTruongChuaSan("source account is empty — the control case needs a positive allowance");
      return dungGiaoDichCapQuyenVuaDu({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
        soDu: nc.soDuNguon / 2n,
      });
    },
  },
  {
    id: "trao-quyen-dong",
    nhom: "quyenDong",
    tieuDe: "Hand over the right to close the account",
    loiMoi: "Clean up junk accounts to reclaim rent.",
    tienDieuKien: "The new closeAuthority must differ from the signer (rule 2 skips it when you keep the authority).",
    hoTro: "devnet",
    khai: { type: "cleanup" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__CLOSE_OR_FREEZE"],
      ghiChu:
        "Hậu quả nhỏ hơn đổi chủ — bên kia đóng được tài khoản và lấy lamport đặt " +
        "cọc. Vẫn là quyền người dùng không định trao.",
    },
    dungTx: (ht, nc) =>
      dungGiaoDichTraoQuyenDong({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
      }),
  },
  {
    id: "chuyen-them-ngoai-hanh-dong",
    nhom: "chuyenThem",
    tieuDe: "Extra transfer beyond the primary action",
    loiMoi: "Send 10 tokens to a friend — plus a small network fee.",
    tienDieuKien: "The source account holds at least 20 tokens; needs both the friend wallet and the attacker wallet.",
    hoTro: "devnet",
    khai: { type: "transfer" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Lệnh ĐẦU đúng như người dùng mong đợi; lệnh thứ hai mới là phần thừa. " +
        "Đây là nhóm cho thấy vì sao phải đọc chênh lệch trạng thái thay vì đọc " +
        "lệnh đầu tiên — tổng rời ví là tổng của cả hai lệnh.",
    },
    dungTx: (ht, nc) => {
      canSoDu(nc.soDuNguon, 2n * muoiToken(ht), "extra-transfer scenario");
      return dungGiaoDichChuyenThem({
        ...chung(ht, nc),
        keTanCong: new PublicKey(ht.keTanCong),
        taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
        banBe: new PublicKey(ht.banBe),
        taiKhoanBanBe: new PublicKey(ht.taiKhoanBanBe),
        soLuong: muoiToken(ht),
        soLuongThem: muoiToken(ht),
      });
    },
  },
  {
    id: "thieu-du-lieu",
    nhom: "thieuDuLieu",
    tieuDe: "Unclear whose wallet is being protected",
    loiMoi: "Co-sign a transaction with another wallet to get a reward.",
    tienDieuKien:
      "The transaction needs TWO signatures and the wallet does NOT declare `nguoiDung`. The fee payer must hold SOL " +
      "on Devnet, otherwise the simulation fails before any rule can run.",
    hoTro: "devnet",
    khongKhaiNguoiDung: true,
    bangChungMongDoi: {
      maMongDoi: ["NGUOI_DUNG_KHONG_RO"],
      ghiChu:
        "Nhóm THIẾU DỮ LIỆU, không phải nhóm tấn công. Custos phân tích theo người trả " +
        "phí, nên lệnh uỷ quyền trên tài khoản của NGƯỜI KHÁC không luật nào thấy — và " +
        "luật 14 phải nói ra 'tôi không chắc đang bảo vệ ai'. Thiếu thông tin ⇒ Vàng.",
    },
    dungTx: (ht, nc) =>
      dungGiaoDichThieuDuLieu({
        // Người trả phí phải CÓ SOL — bản trước dùng ví kẻ tấn công (0 SOL) và
        // mô phỏng trả `AccountNotFound`. Xem chú thích trong `tan-cong.ts`.
        nguoiTraPhi: new PublicKey(ht.nanNhan),
        chuKhac: new PublicKey(ht.banBe),
        taiKhoanChuKhac: new PublicKey(ht.taiKhoanBanBe),
        uyQuyenCho: new PublicKey(ht.keTanCong),
        soLuong: motToken(ht),
        blockhash: nc.blockhash,
      }),
  },
  {
    id: "lanh-tinh",
    nhom: "doiChung",
    tieuDe: "Benign transaction — control case",
    loiMoi: "Send 10 tokens to a friend.",
    tienDieuKien: "The source account holds at least 10 tokens; needs the friend wallet in the Devnet setup.",
    hoTro: "devnet",
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu: "Ca âm tính gốc của dự án. Engine phải cho Xanh hoặc Vàng-thông-tin.",
    },
    dungTx: (ht, nc) => {
      canSoDu(nc.soDuNguon, muoiToken(ht), "send-to-friend scenario");
      return dungGiaoDichLanhTinh({
        ...chung(ht, nc),
        banBe: new PublicKey(ht.banBe),
        taiKhoanDich: new PublicKey(ht.taiKhoanBanBe),
        soLuong: muoiToken(ht),
      });
    },
  },
  {
    id: "tan-cong-day-du",
    nhom: "doiChu",
    tieuDe: "Full attack — transfer and owner change",
    loiMoi: "Claim your gift — sign to receive it.",
    tienDieuKien: "The source account still has a balance and still belongs to the victim; needs the attacker wallet.",
    hoTro: "devnet",
    khai: { type: "airdrop" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
      ghiChu:
        "Kịch bản gốc của dự án: vừa chuyển tiền THẬT vừa đổi chủ, nên bảng chênh " +
        "lệch hiện số dư giảm là TRUNG THỰC.",
    },
    /*
     * CÙNG MỘT HÀM với trang tấn công và màn phỏng vấn — `dungTxTanCongSong`.
     *
     * Trước đây ba nơi tự dựng ca này, mỗi nơi tự chọn số lượng. Bản vá "chia đôi"
     * chỉ tới được sổ này; trang tấn công vẫn chuyển 500 000 000 từ tài khoản còn
     * 490 000 000 và ví nhận một giao dịch hỏng. Một hàm thì một chỗ để đúng.
     */
    dungTx: (ht, nc) => dungTxTanCongSong(ht, nc.blockhash, nc.soDuNguon),
  },
];

/** Tra theo ID. Trả `undefined` nếu không có — bên gọi phải xử lý, không đoán bừa. */
export function timKichBan(id: string): KichBan | undefined {
  return KICH_BAN.find((k) => k.id === id);
}

/** Số nhóm rủi ro PHÂN BIỆT, không tính nhóm đối chứng và nhóm thiếu dữ liệu. */
export function soNhomRuiRo(): number {
  const bo = new Set(
    KICH_BAN.filter((k) => k.nhom !== "doiChung" && k.nhom !== "thieuDuLieu").map((k) => k.nhom),
  );
  return bo.size;
}

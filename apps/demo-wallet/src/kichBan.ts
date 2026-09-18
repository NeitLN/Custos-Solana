import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import {
  dungGiaoDichTanCong,
  dungGiaoDichLanhTinh,
  dungGiaoDichThuongGiaMatToken,
  dungGiaoDichDoiChu,
  dungGiaoDichCapQuyenRut,
  dungGiaoDichCapQuyenVuaDu,
  dungGiaoDichTraoQuyenDong,
  dungGiaoDichChuyenThem,
  dungGiaoDichThieuDuLieu,
} from "../../../scripts/tan-cong.ts";
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
 * Với bảy nhóm, cách đó không trụ được. Sổ đăng ký làm mỗi kịch bản thành MỘT
 * bản ghi, và giao diện duyệt danh sách thay vì gõ tay từng nhánh.
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
 * Nếu bao giờ giao diện vẽ `bangChungMongDoi` cạnh verdict mà không phân biệt
 * rõ, thì demo đang trình bày kỳ vọng như bằng chứng — đúng thứ thể lệ BTC trừ
 * điểm. Có guard đọc mã canh điều này trong `kichBan.test.ts`.
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
   * KỲ VỌNG, KHÔNG PHẢI KẾT QUẢ. Đọc chú thích đầu file trước khi dùng trường này.
   * `maMongDoi` là mã lý do người viết kịch bản chờ thấy; rỗng nghĩa là chờ engine im.
   */
  bangChungMongDoi: { maMongDoi: string[]; ghiChu: string };
  /** Dựng giao dịch. Ném nếu hiện trường thiếu trường cần thiết. */
  dungTx: (ht: HienTruong, blockhash: string) => VersionedTransaction;
};

/** Gom các `new PublicKey` dùng chung, để mỗi kịch bản chỉ viết phần khác nhau. */
function chung(ht: HienTruong, blockhash: string) {
  return {
    nanNhan: new PublicKey(ht.nanNhan),
    mint: new PublicKey(ht.mint),
    blockhash,
    taiKhoanNguon: new PublicKey(ht.taiKhoanNanNhan),
  };
}

/** Số token nhỏ dùng cho các kịch bản không cần quét sạch số dư. */
function motIt(ht: HienTruong): bigint {
  return 10n * 10n ** BigInt(ht.decimals);
}

export const KICH_BAN: KichBan[] = [
  {
    id: "thuong-gia-mat-token",
    nhom: "thuongGiaMatToken",
    tieuDe: "Nhận thưởng nhưng token rời ví",
    loiMoi: "Nhận 5 000 BONUS miễn phí — chỉ cần ký để xác nhận ví.",
    tienDieuKien: "Cần tài khoản token của nạn nhân còn số dư.",
    hoTro: "devnet",
    khai: { type: "airdrop" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Cố ý KHÔNG chờ mã Đỏ nào. Một loại tài sản rời ví là hành vi bình thường " +
        "của ví (luật 11 bỏ qua khi chỉ có một mint). Điều đáng nói nằm ở chỗ dApp " +
        "khai 'airdrop' trong khi giao dịch chuyển tiền ĐI — phần lệch do L3 nêu.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichThuongGiaMatToken({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
        soLuong: motIt(ht),
      }),
  },
  {
    id: "doi-chu-tai-khoan",
    nhom: "doiChu",
    tieuDe: "Đổi chủ tài khoản token",
    loiMoi: "Nâng cấp ví lên bản Pro — ký để kích hoạt.",
    tienDieuKien: "Tài khoản token phải đang thuộc về người ký (luật 1 đòi ownerBefore === signer).",
    hoTro: "devnet",
    khai: { type: "upgrade" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
      ghiChu:
        "Số dư KHÔNG đổi — chỉ quyền kiểm soát đổi. Bảng chênh lệch phải phản ánh " +
        "đúng vậy; hiện 500 → 0 ở đây là dàn dựng (docs/CUSTOS.md quyết định 7).",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichDoiChu({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
      }),
  },
  {
    id: "cap-quyen-vuot-so-du",
    nhom: "capQuyen",
    tieuDe: "Cấp quyền rút vượt số dư",
    loiMoi: "Cho phép sàn giao dịch tự động khớp lệnh hộ bạn.",
    tienDieuKien: "Hạn mức uỷ quyền phải LỚN HƠN số dư hiện có, nếu không luật 3 im.",
    hoTro: "devnet",
    doiChung: "cap-quyen-vua-du",
    khai: { type: "approve" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_APPROVE_DELEGATE_LON"],
      ghiChu: "Cặp với ca đối chứng bên dưới: cùng instruction, chỉ khác hạn mức.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichCapQuyenRut({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        // Vượt hẳn số dư: nhân đôi rồi cộng thêm, để không phụ thuộc số dư lúc chạy.
        soLuong: BigInt(ht.soLuong) * 2n + motIt(ht),
      }),
  },
  {
    id: "cap-quyen-vua-du",
    nhom: "doiChung",
    tieuDe: "Cấp quyền rút vừa đủ — đối chứng",
    loiMoi: "Cho phép sàn giao dịch khớp đúng khối lượng bạn đặt.",
    tienDieuKien:
      "Hạn mức phải KHÔNG VƯỢT số dư THẬT trên chuỗi tại lúc chạy. Engine phải IM.",
    hoTro: "devnet",
    khai: { type: "approve" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Ca ÂM TÍNH và nó quan trọng ngang ca dương. Không có nó thì không phân " +
        "biệt được 'bắt đúng Approve xấu' với 'gắn cờ mọi Approve'.",
    },
    /*
     * ⚠️ DÙNG MỘT NỬA, KHÔNG DÙNG `ht.soLuong` NGUYÊN.
     *
     * Bản đầu cấp đúng `BigInt(ht.soLuong)` và nó SAI — phát hiện khi mô phỏng
     * thật trên Devnet, không phải khi đọc lại mã:
     *
     *   ht.soLuong (cấu hình)     = 500 000 000
     *   số dư THẬT trên chuỗi     = 490 000 000   ← hiện trường đã trôi
     *
     * 500 000 000 > 490 000 000 nên luật 3 kích hoạt, và ca ĐỐI CHỨNG trả về
     * `danger`. Engine đúng; kịch bản sai. Lỗi nằm ở giả định "số trong file cấu
     * hình bằng số dư đang có" — một giả định hỏng dần sau mỗi lần diễn.
     *
     * `dungTx` là hàm ĐỒNG BỘ nên không đọc được số dư tại chỗ. Lấy một nửa thì
     * ca âm còn đúng kể cả khi hiện trường đã trôi khá nhiều, mà vẫn là con số
     * hợp lệ để cấp quyền. Test `kichBan.test.ts` canh quan hệ ≤ này.
     */
    dungTx: (ht, bh) =>
      dungGiaoDichCapQuyenVuaDu({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
        soDu: BigInt(ht.soLuong) / 2n,
      }),
  },
  {
    id: "trao-quyen-dong",
    nhom: "quyenDong",
    tieuDe: "Trao quyền đóng tài khoản",
    loiMoi: "Dọn dẹp tài khoản rác để nhận lại phí thuê.",
    tienDieuKien: "closeAuthority mới phải khác người ký (luật 2 bỏ qua khi tự giữ quyền).",
    hoTro: "devnet",
    khai: { type: "cleanup" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__CLOSE_OR_FREEZE"],
      ghiChu:
        "Hậu quả nhỏ hơn đổi chủ — bên kia đóng được tài khoản và lấy lamport đặt " +
        "cọc. Vẫn là quyền người dùng không định trao.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichTraoQuyenDong({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        soLuong: 0n,
      }),
  },
  {
    id: "chuyen-them-ngoai-hanh-dong",
    nhom: "chuyenThem",
    tieuDe: "Chuyển thêm ngoài hành động chính",
    loiMoi: "Gửi 10 token cho bạn bè — kèm phí mạng nhỏ.",
    tienDieuKien: "Cần cả ví bạn bè và ví kẻ tấn công trong hiện trường.",
    hoTro: "devnet",
    khai: { type: "transfer" },
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu:
        "Lệnh ĐẦU đúng như người dùng mong đợi; lệnh thứ hai mới là phần thừa. " +
        "Đây là nhóm cho thấy vì sao phải đọc chênh lệch trạng thái thay vì đọc " +
        "lệnh đầu tiên — tổng rời ví là tổng của cả hai lệnh.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichChuyenThem({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
        banBe: new PublicKey(ht.banBe),
        taiKhoanBanBe: new PublicKey(ht.taiKhoanBanBe),
        soLuong: motIt(ht),
        soLuongThem: motIt(ht),
      }),
  },
  {
    id: "thieu-du-lieu",
    nhom: "thieuDuLieu",
    tieuDe: "Không rõ đang bảo vệ ai",
    loiMoi: "Giao dịch được tài trợ phí — bạn không phải trả gì.",
    tienDieuKien:
      "Cần NHIỀU HƠN MỘT chữ ký và ví KHÔNG khai `nguoiDung`. Người trả phí khác " +
      "chủ tài khoản token là cách dựng ra điều đó.",
    hoTro: "devnet",
    bangChungMongDoi: {
      maMongDoi: ["NGUOI_DUNG_KHONG_RO"],
      ghiChu:
        "Nhóm THIẾU DỮ LIỆU, không phải nhóm tấn công. Đây là bằng chứng của " +
        "fail-safe: thiếu thông tin ⇒ Vàng, không bao giờ Xanh. Một demo chỉ " +
        "khoe ca Đỏ không chứng minh được điều đó.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichThieuDuLieu({
        ...chung(ht, bh),
        nguoiTraPhi: new PublicKey(ht.keTanCong),
        banBe: new PublicKey(ht.banBe),
        taiKhoanDich: new PublicKey(ht.taiKhoanBanBe),
        soLuong: motIt(ht),
      }),
  },
  {
    id: "lanh-tinh",
    nhom: "doiChung",
    tieuDe: "Giao dịch lành tính — đối chứng",
    loiMoi: "Gửi 10 token cho bạn bè.",
    tienDieuKien: "Cần ví bạn bè trong hiện trường.",
    hoTro: "devnet",
    bangChungMongDoi: {
      maMongDoi: [],
      ghiChu: "Ca âm tính gốc của dự án. Engine phải cho Xanh hoặc Vàng-thông-tin.",
    },
    dungTx: (ht, bh) =>
      dungGiaoDichLanhTinh({
        ...chung(ht, bh),
        banBe: new PublicKey(ht.banBe),
        taiKhoanDich: new PublicKey(ht.taiKhoanBanBe),
        soLuong: motIt(ht),
      }),
  },
  {
    id: "tan-cong-day-du",
    nhom: "doiChu",
    tieuDe: "Tấn công đầy đủ — chuyển tiền và đổi chủ",
    loiMoi: "Nhận quà tặng — ký để nhận.",
    tienDieuKien:
      "Cần tài khoản nạn nhân còn số dư THẬT ≥ số chuyển, và ví kẻ tấn công.",
    hoTro: "devnet",
    khai: { type: "airdrop" },
    bangChungMongDoi: {
      maMongDoi: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
      ghiChu:
        "Kịch bản gốc của dự án: vừa chuyển tiền THẬT vừa đổi chủ, nên bảng chênh " +
        "lệch hiện số dư giảm là TRUNG THỰC.",
    },
    /*
     * ⚠️ CHUYỂN MỘT NỬA, KHÔNG CHUYỂN `ht.soLuong` NGUYÊN — cùng gốc lỗi với
     * `cap-quyen-vua-du`, và ca này đã HỎNG THẬT trên Devnet trước khi sửa:
     *
     *   InstructionError[1] = Custom(1)   "Error: insufficient funds"
     *
     * Vì `ht.soLuong` = 500 000 000 còn số dư thật chỉ còn 490 000 000. Mô phỏng
     * hỏng ⇒ engine trả `MO_PHONG_HONG` + `TRANG_THAI_DO_KHUYET` và KHÔNG thấy
     * được `SPL_SET_AUTHORITY__ACCOUNT_OWNER` — tức kịch bản tấn công chủ lực của
     * demo mất luôn mã lý do quan trọng nhất của nó.
     *
     * Đây KHÔNG phải lỗi engine: fail-safe chạy đúng (mô phỏng hỏng ⇒ Vàng, không
     * bao giờ Xanh). Lỗi ở kịch bản, vì nó giả định số cấu hình bằng số dư đang có.
     *
     * Chuyển một nửa thì lệnh `Transfer` còn chạy được kể cả sau nhiều lượt diễn,
     * nên bảng chênh lệch vẫn hiện số dư giảm THẬT — đúng quyết định 7 của docs/CUSTOS.md.
     */
    dungTx: (ht, bh) =>
      dungGiaoDichTanCong({
        ...chung(ht, bh),
        keTanCong: new PublicKey(ht.keTanCong),
        taiKhoanDich: new PublicKey(ht.taiKhoanKeTanCong),
        soLuong: BigInt(ht.soLuong) / 2n,
      }),
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

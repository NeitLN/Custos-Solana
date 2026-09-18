import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { SO_LENH_DOC_DUOC, VI_TRI_AUTHORITY } from "./decode.ts";
import { BANG_IDL } from "./bang-idl.ts";
import { VERIFIED_PROGRAMS } from "../constants.ts";

/**
 * CU-13 — REGISTRY DECODER TỰ KHAI PHẠM VI NĂNG LỰC.
 *
 * ## Điều thẻ cấm, và nó cấm vì một lý do đo được
 *
 * *"Tách nhận dạng cấu trúc IDL với semantic adapter. Không hardcode 'đã hỗ trợ DEX'
 * chỉ vì đọc được instruction name."*
 *
 * Đo trên chính registry hiện tại — con số sinh từ `tomTatNangLuc()`, không gõ tay:
 *
 * ```
 *   13 program · 377 lệnh đọc được TÊN
 *    2 program ·   8 lệnh hiểu được HẬU QUẢ   (SPL Token và Token-2022)
 * ```
 *
 * **Khoảng cách 377 ↔ 8 là toàn bộ nội dung của thẻ này.** Đọc được `"swap"` từ IDL
 * của Jupiter **không** có nghĩa Custos biết swap đó lấy bao nhiêu của ai — nó chỉ
 * biết lệnh tên là `swap`.
 *
 * Program lớn nhất trong registry (`LBUZKhRx…`, 77 lệnh) ở mức `docDuocTen`: Custos
 * đọc được tên cả 77 lệnh và **không hiểu hậu quả của lệnh nào**.
 *
 * Nói "đã hỗ trợ Jupiter" dựa trên con số 18 lệnh là nói quá, và mục 11 của
 * `docs/roadmap/UPDATE-CUSTOS.md` cấm đích danh *"decoder hàng loạt dựa vào tên protocol nổi
 * tiếng nhưng không có dữ liệu xác định gap"*.
 *
 * ## Ba mức, không phải hai
 *
 * `khongBiet` → `docDuocTen` → `hieuHauQua`
 *
 * Mức giữa là mức đông nhất và là mức dễ bị khai khống nhất, vì nó *trông* như đã
 * hỗ trợ: log đẹp, tên lệnh đúng, không có lỗi nào. Tách nó ra là cách duy nhất để
 * không tự lừa mình.
 */

/** Mức hiểu của Custos với một chương trình. Ba mức, và chúng không thay nhau được. */
export type MucNangLuc =
  /** Không đọc được gì — kể cả tên lệnh. */
  | "khongBiet"
  /** Đọc được TÊN lệnh, nhưng chưa biết hậu quả kinh tế của nó. */
  | "docDuocTen"
  /** Đọc được tên VÀ suy được hậu quả (ai mất gì, cho ai). */
  | "hieuHauQua";

export type NangLucProgram = {
  programId: string;
  muc: MucNangLuc;
  /** Số lệnh đọc được TÊN. `0` với `khongBiet`. */
  soLenhDocTen: number;
  /**
   * Tên các lệnh Custos suy được HẬU QUẢ.
   *
   * Rỗng ở mức `docDuocTen` — và đó là điểm chính: một program có 77 lệnh đọc được
   * tên mà danh sách này rỗng thì Custos không hiểu hậu quả của lệnh nào cả.
   */
  lenhHieuHauQua: string[];
  /** Tên lệnh đọc từ IDL công bố trên chuỗi, hay từ bảng viết tay trong repo. */
  nguonNhanDang: "idl-tren-chuoi" | "bang-trong-repo";
  /** Có nằm trong danh sách chương trình đã xác minh không. */
  daXacMinh: boolean;
};

/**
 * Lệnh nào Custos suy được hậu quả.
 *
 * Hiện chỉ có SPL Token: `VI_TRI_AUTHORITY` cho biết account nào là authority, và
 * từ đó phân biệt *"chủ tài khoản tự chuyển"* với *"permanent delegate ra tay"* —
 * hai chuyện trông giống hệt nhau trên bảng chênh lệch.
 *
 * Một lệnh không có ở đây vẫn có thể đọc được tên. Hai chuyện khác nhau.
 */
const LENH_HIEU_HAU_QUA = new Set(Object.keys(VI_TRI_AUTHORITY));

/** Địa chỉ lấy từ `@solana/spl-token`, không gõ tay. */
const SPL_TOKEN_ID = TOKEN_PROGRAM_ID.toBase58();
const TOKEN_2022_ID = TOKEN_2022_PROGRAM_ID.toBase58();

/** Program mà bảng lệnh do đội viết tay, không sinh từ IDL. */
function nguonCua(programId: string): NangLucProgram["nguonNhanDang"] {
  return BANG_IDL.has(programId) ? "idl-tren-chuoi" : "bang-trong-repo";
}

export function nangLucCua(programId: string): NangLucProgram {
  const soLenh = SO_LENH_DOC_DUOC.get(programId) ?? 0;
  if (soLenh === 0) {
    return {
      programId,
      muc: "khongBiet",
      soLenhDocTen: 0,
      lenhHieuHauQua: [],
      nguonNhanDang: nguonCua(programId),
      daXacMinh: VERIFIED_PROGRAMS.has(programId),
    };
  }

  /*
   * HIỂU HẬU QUẢ chỉ áp cho SPL Token và Token-2022 — hai program mà
   * `VI_TRI_AUTHORITY` mô tả bố cục account CỐ ĐỊNH của chúng.
   *
   * Không suy rộng ra program khác dù tên lệnh trùng: một program tự đặt tên lệnh
   * là `transfer` không có nghĩa bố cục account của nó giống SPL Token, và đọc
   * account thứ 2 làm authority ở đó là bịa ra một quan hệ không có.
   *
   * Nhận diện bằng ĐỊA CHỈ PROGRAM lấy từ `@solana/spl-token`, không bằng số lệnh.
   * Bản đầu của tôi viết `soLenh === 44` — một con số đúng hôm nay và sai im lặng
   * ngay khi bảng lệnh đổi. Nhận diện một program bằng số lệnh của nó là dựa vào
   * thứ không định danh gì cả.
   */
  const laSplToken = programId === SPL_TOKEN_ID || programId === TOKEN_2022_ID;
  const hieu = laSplToken ? [...LENH_HIEU_HAU_QUA] : [];

  return {
    programId,
    muc: hieu.length > 0 ? "hieuHauQua" : "docDuocTen",
    soLenhDocTen: soLenh,
    lenhHieuHauQua: hieu,
    nguonNhanDang: nguonCua(programId),
    daXacMinh: VERIFIED_PROGRAMS.has(programId),
  };
}

export type TomTatNangLuc = {
  soProgramDocTen: number;
  soProgramHieuHauQua: number;
  /** Tổng lệnh đọc được TÊN trên toàn registry. */
  soLenhDocTen: number;
  /** Tổng lệnh hiểu được HẬU QUẢ. Con số này nhỏ hơn nhiều, và phải nói ra. */
  soLenhHieuHauQua: number;
  danhSach: NangLucProgram[];
};

/**
 * Bảng năng lực của toàn registry — sinh từ chính bảng decode, không gõ tay.
 *
 * Mục 4.2 và CU-17 đòi *"Sinh bảng hỗ trợ từ registry/contract có kiểm, không gõ
 * riêng trong UI/docs/CLI"*. Một con số gõ tay ở ba nơi sẽ lệch nhau ở lần sửa thứ
 * nhất, và repo này đã có bài học đó với số test.
 */
export function tomTatNangLuc(): TomTatNangLuc {
  const danhSach = [...SO_LENH_DOC_DUOC.keys()].map(nangLucCua);
  const hieu = danhSach.filter((x) => x.muc === "hieuHauQua");
  return {
    soProgramDocTen: danhSach.length,
    soProgramHieuHauQua: hieu.length,
    soLenhDocTen: danhSach.reduce((s, x) => s + x.soLenhDocTen, 0),
    soLenhHieuHauQua: hieu.reduce((s, x) => s + x.lenhHieuHauQua.length, 0),
    danhSach: danhSach.sort((a, b) => b.soLenhDocTen - a.soLenhDocTen),
  };
}

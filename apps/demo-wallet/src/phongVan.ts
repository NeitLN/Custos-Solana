/**
 * LƯỢC ĐỒ VÀ PHÉP ĐẾM CHO DỮ LIỆU PHỎNG VẤN.
 *
 * Một nơi duy nhất, dùng chung bởi `/phong-van.html` (nơi nhập) và
 * `scripts/kiem-phong-van.ts` (nơi đếm). Trước đây nhãn nằm trong trang còn phép
 * chuẩn hoá nằm trong script — hai bản mô tả cùng một thứ, và hai bản thì trôi.
 *
 * Con số sinh ra ở đây được đọc trên sân khấu. Vì vậy mọi thứ trong file này
 * nghiêng về phía TỪ CHỐI hơn là phía đoán: thà báo "chưa đủ dữ liệu" còn hơn
 * đưa ra một tỉ lệ không có gì đỡ.
 */

export const PHIEN_BAN_LUOC_DO = 1;

export type Cham = "dung" | "motPhan" | "sai";
export type QuyetDinh = "huy" | "kiemTraThem" | "ky";

/**
 * Nguồn gốc phép đo — chép từ bảng đầu `docs/BIEN-BAN-PHONG-VAN.md`, không gõ tay
 * lần hai. Một con số phỏng vấn không kèm nguồn gốc thì giám khảo không kiểm được,
 * mà không kiểm được thì nó không đáng tin hơn một con số bịa.
 */
export type NguonGoc = {
  /** Nguyên văn ô "Ngày phỏng vấn" — một KHOẢNG, ví dụ "29/08 và 30/08/2026". */
  khoangPhongVan: string;
  aiHoi: string;
  cachHoi: string;
};

export type Ban = {
  /** Mã ẩn danh do người phỏng vấn đặt (P1, P2…). KHÔNG BAO GIỜ là tên thật. */
  ma?: string;
  /**
   * Lúc bản ghi được SỐ HOÁ, không phải lúc cuộc phỏng vấn diễn ra.
   *
   * Hai thứ này lệch nhau nhiều ngày và đã từng bị đọc nhầm thành một: bản JSON
   * đầu tiên có cả 20 mốc thời gian nằm cách nhau ĐÚNG 1 mili-giây trong ngày
   * 04/09 — dấu vết của lần chạy `doc-bien-ban.mjs`, trong khi người thật được
   * hỏi ngày 29 và 30/08. Ai đọc field tên `luc` cũng sẽ hiểu là giờ phỏng vấn,
   * và kết luận cả 20 cuộc diễn ra trong 3 mili-giây.
   *
   * Ngày phỏng vấn thật nằm ở `nguonGoc.khoangPhongVan` — theo KHOẢNG, vì biên
   * bản chỉ ghi tới mức khoảng. Không suy ra ngày cho từng người: không ai ghi
   * lại ai được hỏi hôm nào, và đoán ra thì đó là bịa.
   */
  nhapLuc: string;
  nguyenVan: string;
  cham: Cham;
  quyetDinh: QuyetDinh;
  ghiChu: string;
};

/** Bản xuất có cấu trúc ổn định — thứ được commit vào `data/seed/`. */
export type HoSoPhongVan = {
  phienBan: number;
  /** true nghĩa là DỮ LIỆU MINH HOẠ, không phải người thật. Xem `laViDu()`. */
  laViDu?: boolean;
  xuatLuc: string;
  /** Vòng phỏng vấn. Vắng nghĩa là vòng 1 — mẻ đầu chưa có trường này. */
  vong?: number;
  /**
   * Commit của giao diện ĐÃ CHIẾU cho người tham gia.
   *
   * Vòng 1 không ghi, nên phải truy ngược bằng `git log` mới biết lúc đó tấm cảnh
   * báo là bản nền tối — và con số 13/20 vì thế đo trên một giao diện không còn
   * tồn tại. Ghi ở đây để không phải truy ngược lần nữa.
   */
  phienBanUi?: string;
  /** Vắng khi bản ghi được nhập trực tiếp trong trang, chưa qua biên bản markdown. */
  nguonGoc?: NguonGoc;
  ban: Ban[];
};

export const NHAN_CHAM: Record<Cham, string> = {
  dung: "ĐÚNG — nêu được mất tiền HOẶC mất quyền kiểm soát",
  motPhan: "MỘT PHẦN — nêu được một vế, hoặc chỉ biết có gì đó nguy hiểm",
  sai: "SAI — hiểu ngược, hoặc nói chuyện không liên quan",
};

export const NHAN_QD: Record<QuyetDinh, string> = {
  huy: "HUỶ",
  kiemTraThem: "KIỂM TRA THÊM rồi mới quyết",
  ky: "VẪN KÝ",
};

const DOI_CHAM: Record<string, Cham> = { "ĐÚNG": "dung", "MỘT PHẦN": "motPhan", "SAI": "sai" };
const DOI_QD: Record<string, QuyetDinh> = {
  "HUỶ": "huy",
  "KIỂM TRA THÊM": "kiemTraThem",
  "VẪN KÝ": "ky",
};

export const chuanCham = (c: string): string => DOI_CHAM[c] ?? c;
export const chuanQD = (q: string | undefined): string | undefined =>
  q === undefined ? undefined : (DOI_QD[q] ?? q);

/**
 * Đọc cả hai dạng: mảng trần (bản xuất cũ) và hồ sơ có phiên bản (bản mới).
 * Bản cũ vẫn đọc được vì đội có thể đã dán ra file trước khi lược đồ đổi.
 */
export function docHoSo(thoJson: unknown): HoSoPhongVan {
  if (Array.isArray(thoJson)) {
    return { phienBan: 0, xuatLuc: "", ban: thoJson as Ban[] };
  }
  const h = thoJson as Partial<HoSoPhongVan>;
  if (!h || !Array.isArray(h.ban)) throw new Error("không phải hồ sơ phỏng vấn: thiếu mảng `ban`");
  /*
   * GIỮ NGUYÊN METADATA. Kiểu trả về có `vong`, `phienBanUi`, `nguonGoc` — nhưng bản
   * trước không đọc chúng, nên mọi hồ sơ đi qua hàm này đều mất phiên bản giao diện
   * đã chiếu và nguồn gốc mẻ mẫu. Đúng thứ vòng 1 đã phải truy ngược bằng `git log`.
   *
   * Vắng thì để vắng — không tự điền, vì một `phienBanUi` bịa còn tệ hơn không có.
   */
  return {
    phienBan: h.phienBan ?? 0,
    xuatLuc: h.xuatLuc ?? "",
    ban: h.ban,
    ...(h.laViDu ? { laViDu: true } : {}),
    ...(typeof h.vong === "number" ? { vong: h.vong } : {}),
    ...(h.phienBanUi ? { phienBanUi: h.phienBanUi } : {}),
    ...(h.nguonGoc ? { nguonGoc: h.nguonGoc } : {}),
  };
}

/**
 * Số liệu tổng hợp. `x/n` chứ không chỉ phần trăm — với n nhỏ thì phần trăm làm
 * mẫu số biến mất, và "67 %" nghe như đo trên trăm người khi thật ra là 2/3.
 */
export function tongHop(ban: Ban[]) {
  const dem = (c: string) => ban.filter((b) => chuanCham(b.cham) === c).length;
  const demQD = (q: string) => ban.filter((b) => chuanQD(b.quyetDinh) === q).length;
  return {
    n: ban.length,
    hieu: { dung: dem("dung"), motPhan: dem("motPhan"), sai: dem("sai") },
    quyetDinh: { huy: demQD("huy"), kiemTraThem: demQD("kiemTraThem"), ky: demQD("ky") },
  };
}

/**
 * DỮ LIỆU CÁ NHÂN KHÔNG ĐƯỢC COMMIT.
 *
 * File này đi thẳng vào một repo công khai. Một số điện thoại lọt vào đó là hỏng
 * cho người đã tin đội đủ để ngồi trả lời — và không gỡ lại được, vì lịch sử git
 * giữ nguyên.
 */
export function soiDuLieuCaNhan(ban: Ban[]): string[] {
  const canh: string[] = [];
  const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]+/;
  // Số điện thoại VN: 9–11 chữ số liền, có thể có +84 hoặc dấu cách/gạch.
  const DIEN_THOAI = /(?:\+?84|0)[\s.-]?\d(?:[\s.-]?\d){7,9}\b/;
  ban.forEach((b, i) => {
    const ma = b.ma ?? `#${i + 1}`;
    for (const [ten, v] of [["nguyên văn", b.nguyenVan], ["ghi chú", b.ghiChu]] as const) {
      if (!v) continue;
      if (EMAIL.test(v)) canh.push(`${ma}: có email trong ${ten} — gỡ trước khi commit`);
      if (DIEN_THOAI.test(v)) canh.push(`${ma}: có thể là số điện thoại trong ${ten} — kiểm rồi gỡ`);
    }
    if (b.ma && /\s/.test(b.ma.trim())) {
      canh.push(`${ma}: mã người tham gia có dấu cách — nghe như tên thật, hãy dùng P1, P2…`);
    }
  });
  return canh;
}

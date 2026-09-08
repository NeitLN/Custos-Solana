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

  /*
   * ─── TỪ ĐÂY XUỐNG LÀ TRƯỜNG CỦA VÒNG 2 ──────────────────────────────────
   *
   * TẤT CẢ đều `?`, và đó không phải sự lười.
   *
   * Hai mươi bản ghi vòng 1 là phỏng vấn NGƯỜI THẬT, đã commit, không sửa lại được
   * — không ai đi hỏi lại hai mươi người xem hồi đó họ hiểu dòng coverage thế nào.
   * Bắt buộc các trường này là làm hai mươi bản ghi thật thành "không hợp lệ", và
   * bước tiếp theo bao giờ cũng là ai đó điền bừa cho qua.
   *
   * `xacThucBan` vì vậy chỉ kiểm khi trường CÓ MẶT: nhãn lạ là hỏng, vắng mặt là
   * hợp lệ. Vắng nghĩa là "vòng đó không hỏi", khác hẳn "hỏi mà không trả lời".
   */

  /**
   * Câu 3 vòng 2 — chỉ vào dòng "đã đọc hiểu 2 trên 3 lệnh": *dòng này nói gì?*
   *
   * `sai` nghĩa là hiểu thành điểm an toàn ("2/3 ổn rồi"). Đây là hiểu NGƯỢC, và là
   * thứ vòng 1 chưa từng đo. `khongBiet` khác `sai`: không đoán được thì không phải
   * hiểu ngược, và gộp hai cái làm ngưỡng ≤10 % thành vô nghĩa.
   */
  hieuCoverage?: HieuCoverage;

  /**
   * Câu 4 vòng 2 — phí ở đây là bao nhiêu, có liên quan số tiền có thể mất không?
   *
   * `co` nghĩa là dùng phí để kết luận thiệt hại nhỏ. Vòng 1 có 2 người mắc lỗi này
   * và ngưỡng vòng 2 cho nó là **0 người**.
   */
  docNhamPhi?: DocNhamPhi;

  /**
   * Kênh phỏng vấn. Ảnh hưởng tới việc số đo có dùng được không:
   * qua tin nhắn thì người ta có thời gian tra cứu, nên "thời gian đọc" đo được là
   * thời gian gõ phím. Giao thức chỉ cho đo thời gian ở nhóm video/trực tiếp.
   */
  kenh?: Kenh;

  /** Lý do của quyết định — câu 2 hỏi "làm gì, VÌ SAO". Vế sau trước đây bị dồn vào `ghiChu`. */
  lyDoQuyetDinh?: string;

  /**
   * Nút người tham gia THẬT SỰ bấm trên thẻ cảnh báo.
   *
   * Tách khỏi `quyetDinh` — thứ do người phỏng vấn chấm từ lời nói. Hai cái có thể
   * lệch nhau: nói "chắc em huỷ" rồi tay vẫn bấm ký là một quan sát đáng giá, và
   * gộp chúng làm một là xoá mất đúng chỗ đó.
   *
   * Đây là phần MỞ RỘNG của vòng 2, không có ở vòng 1 — không đưa vào bảng so sánh
   * hai vòng.
   */
  bamThat?: "huy" | "ky";
};

export type HieuCoverage = "dung" | "sai" | "khongBiet";
export type DocNhamPhi = "co" | "khong";
export type Kenh = "video" | "goiThoai" | "trucTiep" | "tinNhan";

export const NHAN_HIEU_COVERAGE: Record<HieuCoverage, string> = {
  dung: "ĐÚNG — nói được đây là phần đã đọc hiểu, còn phần chưa hiểu",
  sai: "SAI — hiểu thành điểm an toàn, tỉ lệ an toàn, hoặc «2/3 ổn rồi»",
  khongBiet: "KHÔNG BIẾT — không đoán được dòng đó nói gì",
};

export const NHAN_DOC_NHAM_PHI: Record<DocNhamPhi, string> = {
  co: "CÓ — nói phí là khoản mất, hoặc dùng phí để kết luận thiệt hại nhỏ",
  khong: "KHÔNG — tách được phí khỏi tài sản có thể mất",
};

export const NHAN_KENH: Record<Kenh, string> = {
  video: "Gọi video",
  goiThoai: "Gọi thoại",
  trucTiep: "Trực tiếp",
  tinNhan: "Tin nhắn — KHÔNG đo thời gian đọc",
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

  /*
   * HAI TRỤC VÒNG 2 CÓ MẪU SỐ RIÊNG, KHÔNG DÙNG `n`.
   *
   * Vòng 1 không hỏi hai câu này, nên 20 bản ghi vòng 1 để trống. Chia cho `n` là
   * lấy 0/20 rồi báo "0 % hiểu sai coverage" — nghe như một kết quả tốt, trong khi
   * sự thật là CHƯA HỎI AI CẢ.
   *
   * Ngưỡng của giao thức là "≤ 10 % hiểu coverage thành điểm an toàn". Mẫu số của
   * tỉ lệ đó phải là số người ĐƯỢC HỎI, nên `daHoi` đi kèm mọi lần đếm — cùng lý do
   * `x/n` được giữ ở trên thay vì chỉ in phần trăm.
   */
  const coCoverage = ban.filter((b) => b.hieuCoverage !== undefined);
  const coPhi = ban.filter((b) => b.docNhamPhi !== undefined);
  const demKenh = (k: string) => ban.filter((b) => b.kenh === k).length;

  return {
    n: ban.length,
    hieu: { dung: dem("dung"), motPhan: dem("motPhan"), sai: dem("sai") },
    quyetDinh: { huy: demQD("huy"), kiemTraThem: demQD("kiemTraThem"), ky: demQD("ky") },

    hieuCoverage: {
      daHoi: coCoverage.length,
      dung: coCoverage.filter((b) => b.hieuCoverage === "dung").length,
      sai: coCoverage.filter((b) => b.hieuCoverage === "sai").length,
      khongBiet: coCoverage.filter((b) => b.hieuCoverage === "khongBiet").length,
    },
    docNhamPhi: {
      daHoi: coPhi.length,
      co: coPhi.filter((b) => b.docNhamPhi === "co").length,
      khong: coPhi.filter((b) => b.docNhamPhi === "khong").length,
    },
    bamThat: {
      daBam: ban.filter((b) => b.bamThat !== undefined).length,
      huy: ban.filter((b) => b.bamThat === "huy").length,
      ky: ban.filter((b) => b.bamThat === "ky").length,
      // Nói một đằng bấm một nẻo. Con số này chỉ có nghĩa khi CẢ HAI đều có mặt.
      lechVoiLoiNoi: ban.filter(
        (b) => b.bamThat !== undefined && chuanQD(b.quyetDinh) !== b.bamThat,
      ).length,
    },
    kenh: {
      video: demKenh("video"),
      goiThoai: demKenh("goiThoai"),
      trucTiep: demKenh("trucTiep"),
      tinNhan: demKenh("tinNhan"),
      // Giao thức: chỉ đo thời gian đọc ở nhóm video/trực tiếp. Qua tin nhắn thì con
      // số đo được là thời gian gõ phím, không phải thời gian đọc.
      doDuocThoiGian: demKenh("video") + demKenh("trucTiep"),
    },
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


/*
 * ĐỌC KHO LƯU CỤC BỘ — XÁC THỰC, VÀ KHÔNG BAO GIỜ TỰ XOÁ DỮ LIỆU.
 *
 * Trang phỏng vấn từng làm `JSON.parse(localStorage.getItem(KHOA) ?? "[]") as Ban[]`.
 * `catch` chỉ bắt lỗi cú pháp JSON; một giá trị hợp lệ về cú pháp nhưng sai kiểu —
 * `{}` chẳng hạn — đi lọt, rồi `ban.filter is not a function` làm TRẮNG TRANG. Tái
 * hiện được.
 *
 * Ở đây dữ liệu là biên bản phỏng vấn NGƯỜI THẬT, gõ tay, không có bản sao ở đâu
 * khác và không có backend. Nên quy tắc khác với `hien-truong.json`:
 *
 *   · KHÔNG tự xoá, KHÔNG tự sửa. Dữ liệu không đọc được vẫn phải giữ nguyên văn
 *     để người phỏng vấn xuất ra và cứu bằng tay.
 *   · Báo rõ hỏng ở đâu, thay vì im lặng quay về danh sách rỗng — quay về rỗng là
 *     cách chắc chắn nhất để ai đó gõ đè lên hai mươi biên bản.
 */

export type KetQuaDocKho =
  | { loai: "trong" }
  | { loai: "ok"; ban: Ban[] }
  /** `tho` là nguyên văn trong kho, giữ để xuất ra file cứu dữ liệu. */
  | { loai: "hong"; lyDo: string; tho: string };

/** `null` nghĩa là bản ghi hợp lệ; chuỗi là lý do, viết cho người đọc. */
export function xacThucBan(x: unknown, i: number): string | null {
  if (x === null || typeof x !== "object" || Array.isArray(x)) {
    return `bản ghi #${i + 1} không phải đối tượng`;
  }
  const o = x as Record<string, unknown>;
  if (typeof o["nguyenVan"] !== "string") return `bản ghi #${i + 1} thiếu \`nguyenVan\``;
  if (!["dung", "motPhan", "sai"].includes(String(o["cham"]))) {
    return `bản ghi #${i + 1} có \`cham\` lạ: ${String(o["cham"])}`;
  }
  const qd = o["quyetDinh"];
  if (qd !== undefined && !["huy", "kiemTraThem", "ky"].includes(String(qd))) {
    return `bản ghi #${i + 1} có \`quyetDinh\` lạ: ${String(qd)}`;
  }

  /*
   * TRƯỜNG VÒNG 2: VẮNG LÀ HỢP LỆ, NHÃN LẠ LÀ HỎNG.
   *
   * Hai mươi bản ghi vòng 1 không có trường nào trong số này, và chúng là phỏng vấn
   * người thật đã commit. Bắt buộc là biến chúng thành "không hợp lệ" — rồi ai đó
   * sẽ điền bừa cho qua, và hai mươi cuộc phỏng vấn thật thành hai mươi con số bịa.
   *
   * Nhưng một nhãn SAI thì phải chặn: `hieuCoverage: "tam-duoc"` không đếm được vào
   * ngưỡng nào cả, và im lặng bỏ qua nó là để một bản ghi hỏng trông như bản ghi đủ.
   */
  const nhan: Array<[string, string[]]> = [
    ["hieuCoverage", ["dung", "sai", "khongBiet"]],
    ["docNhamPhi", ["co", "khong"]],
    ["kenh", ["video", "goiThoai", "trucTiep", "tinNhan"]],
    ["bamThat", ["huy", "ky"]],
  ];
  for (const [ten, hopLe] of nhan) {
    const v = o[ten];
    if (v !== undefined && !hopLe.includes(String(v))) {
      return `bản ghi #${i + 1} có \`${ten}\` lạ: ${String(v)}`;
    }
  }
  if (o["lyDoQuyetDinh"] !== undefined && typeof o["lyDoQuyetDinh"] !== "string") {
    return `bản ghi #${i + 1} có \`lyDoQuyetDinh\` không phải chuỗi`;
  }
  return null;
}

export function docKho(tho: string | null): KetQuaDocKho {
  if (tho === null || tho.trim() === "") return { loai: "trong" };

  let x: unknown;
  try {
    x = JSON.parse(tho);
  } catch {
    return { loai: "hong", lyDo: "không phải JSON hợp lệ", tho };
  }

  if (!Array.isArray(x)) {
    // Đây chính là ca đã tái hiện: `{}` parse được nhưng không phải mảng.
    return { loai: "hong", lyDo: `dữ liệu là ${x === null ? "null" : typeof x}, không phải mảng`, tho };
  }

  for (let i = 0; i < x.length; i++) {
    const lyDo = xacThucBan(x[i], i);
    if (lyDo !== null) return { loai: "hong", lyDo, tho };
  }
  return { loai: "ok", ban: x as Ban[] };
}

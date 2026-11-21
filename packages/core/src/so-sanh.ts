import type { Facts, InstructionFact } from "./facts.ts";

/**
 * CU-20 — SO SÁNH HAI GIAO DỊCH / HAI KẾT QUẢ.
 *
 * ## Hai loại so sánh, và trộn chúng là buộc tội sai người
 *
 *   `cauTruc`    — so BYTE và cấu trúc message. Tất định: cùng đầu vào, cùng kết
 *                  quả, ở mọi lúc. Khác nhau ⇒ **giao dịch thật sự khác**.
 *
 *   `quanSat`    — so hai lần ĐỌC của cùng một giao dịch ở hai thời điểm. Khác
 *                  nhau có thể chỉ vì trạng thái chuỗi đã đổi giữa hai lần đọc.
 *
 * Đây là ranh giới quan trọng nhất của thẻ: **state drift KHÔNG tự chứng minh dApp
 * tráo giao dịch**. Số dư một tài khoản đổi giữa hai lần mô phỏng là chuyện bình
 * thường trên chuỗi đang chạy. Gọi đó là "dApp tráo giao dịch" là buộc tội một
 * hành vi cụ thể dựa trên bằng chứng không nói điều đó — đúng thứ `docs/CUSTOS.md` mục
 * 06 cấm.
 *
 * Nên `KetQuaSoSanh.loai` luôn có mặt, và câu tiếng Việt của mỗi loại khác nhau.
 *
 * ## Khớp dòng bằng ĐỊNH DANH BỀN, không bằng vị trí
 *
 * Thêm một lệnh vào đầu danh sách sẽ đẩy mọi lệnh sau xuống một bậc. So theo vị
 * trí sẽ báo "mọi lệnh đều đổi" — đúng kỹ thuật, vô dụng với người đọc.
 *
 * Cũng không khớp theo ký hiệu token: ký hiệu do metadata đặt, và metadata là thứ
 * kẻ tấn công điều khiển được.
 */

export type LoaiSoSanh = "cauTruc" | "quanSat";

export type DongKhac = {
  /** Định danh bền của dòng — địa chỉ, hoặc `programId#chỉ số trong nhóm`. */
  khoa: string;
  truong: string;
  a: string | null;
  b: string | null;
};

export type KetQuaSoSanh = {
  loai: LoaiSoSanh;
  giongNhau: boolean;
  khacBiet: DongKhac[];
  /** Câu tiếng Việt — khác nhau theo loại, vì hai loại nói hai điều khác nhau. */
  cau: string;
};

/**
 * So sánh CẤU TRÚC hai giao dịch.
 *
 * Khác biệt ở đây là tất định: hai message khác byte là hai giao dịch khác nhau,
 * không phụ thuộc thời điểm đọc.
 */
/** Chữ hiển thị của phép so, theo ngôn ngữ. Khoá dòng (`khoa`) là địa chỉ — không dịch. */
const CHU_SO_SANH = {
  vi: {
    giaoDich: "giao dịch", nguoiKyChinh: "người ký chính", soNguoiKy: "số người ký",
    lenhCoMat: "lệnh có mặt", loaiLenh: "loại lệnh", tuLookup: "từ lookup table",
    chuSau: "chủ sở hữu sau", soDuSau: "số dư sau", delegateSau: "delegate sau", quyenDongSau: "quyền đóng sau",
    chuaDoc: "(chưa đọc hiểu)",
    cauTrucGiong: "Hai giao dịch giống nhau ở những gì Custos đọc được.",
    cauTrucKhac: (n: number) => `Hai giao dịch KHÁC NHAU ở ${n} chỗ. Đây là so sánh cấu trúc — khác biệt không phụ thuộc thời điểm đọc.`,
    quanSatGiong: "Hai lần đọc cho kết quả giống nhau.",
    quanSatKhac: (n: number) => `Hai lần đọc khác nhau ở ${n} chỗ. Trạng thái chuỗi có thể đã đổi giữa hai lần đọc — điều này KHÔNG chứng minh giao dịch bị tráo.`,
  },
  en: {
    giaoDich: "transaction", nguoiKyChinh: "primary signer", soNguoiKy: "number of signers",
    lenhCoMat: "instruction present", loaiLenh: "instruction type", tuLookup: "from lookup table",
    chuSau: "owner after", soDuSau: "balance after", delegateSau: "delegate after", quyenDongSau: "close authority after",
    chuaDoc: "(not understood)",
    cauTrucGiong: "The two transactions are the same in everything Custos could read.",
    cauTrucKhac: (n: number) => `The two transactions DIFFER in ${n} ${n === 1 ? "place" : "places"}. This is a structural comparison — the differences do not depend on when the data was read.`,
    quanSatGiong: "The two reads gave the same result.",
    quanSatKhac: (n: number) => `The two reads differ in ${n} ${n === 1 ? "place" : "places"}. On-chain state may have changed between the two reads — this does NOT prove the transaction was swapped.`,
  },
} as const;

export function soSanhCauTruc(a: Facts, b: Facts, locale: "vi" | "en" = "vi"): KetQuaSoSanh {
  const khac: DongKhac[] = [];
  const c = CHU_SO_SANH[locale];

  them(khac, c.giaoDich, c.nguoiKyChinh, a.signer, b.signer);
  /*
   * `Array.isArray` chứ không `a.nguoiKy.length` thẳng.
   *
   * Fixture đóng băng trước khi `nguoiKy` tồn tại thì KHÔNG có trường này, và bản
   * đầu ném `Cannot read properties of undefined`. Cùng lớp lỗi với `phiUocTinh`
   * ở CU-11 — corpus là dữ liệu thật, và dữ liệu thật có lịch sử.
   *
   * Đây là phép so, không phải phép kiểm: thiếu trường ở CẢ HAI bên nghĩa là
   * không có gì để so, không phải "khác nhau".
   */
  them(khac, c.giaoDich, c.soNguoiKy, soNguoiKy(a), soNguoiKy(b));

  // Lệnh: khớp theo programId + thứ tự TRONG CÙNG program, không theo vị trí tuyệt đối.
  const la = nhomLenh(a.instructions);
  const lb = nhomLenh(b.instructions);
  for (const khoa of new Set([...la.keys(), ...lb.keys()])) {
    const x = la.get(khoa) ?? null;
    const y = lb.get(khoa) ?? null;
    if (x === null || y === null) {
      /*
       * Nêu lệnh đó LÀ GÌ, không chỉ nói "có thêm một lệnh".
       *
       * Bản đầu ghi `"có"` và bài kiểm SetAuthority đỏ đúng lý do: với người đọc,
       * *"có thêm một lệnh"* kém xa *"có thêm một SetAuthority trao quyền cho X"*.
       * Lệnh mới là thứ đáng đọc nhất trong cả phép so.
       */
      them(khac, khoa, c.lenhCoMat, moTaLenh(x, c.chuaDoc), moTaLenh(y, c.chuaDoc));
      continue;
    }
    them(khac, khoa, c.loaiLenh, x.decoded?.kind ?? null, y.decoded?.kind ?? null);
    them(khac, khoa, "authority", x.decoded?.authority ?? null, y.decoded?.authority ?? null);
    them(khac, khoa, c.tuLookup, `${x.fromLookupTable}`, `${y.fromLookupTable}`);
  }

  // Tài khoản token: khớp theo ĐỊA CHỈ, không theo ký hiệu token.
  const ta = new Map(a.tokenAccounts.map((t) => [t.address, t]));
  const tb = new Map(b.tokenAccounts.map((t) => [t.address, t]));
  for (const dc of new Set([...ta.keys(), ...tb.keys()])) {
    const x = ta.get(dc);
    const y = tb.get(dc);
    them(khac, dc, c.chuSau, x?.ownerAfter ?? null, y?.ownerAfter ?? null);
    them(khac, dc, c.soDuSau, chuoiSo(x?.amountAfter), chuoiSo(y?.amountAfter));
    them(khac, dc, c.delegateSau, x?.delegateAfter ?? null, y?.delegateAfter ?? null);
    them(khac, dc, c.quyenDongSau, x?.closeAuthorityAfter ?? null, y?.closeAuthorityAfter ?? null);
  }

  const giongNhau = khac.length === 0;
  return {
    loai: "cauTruc",
    giongNhau,
    khacBiet: khac,
    cau: giongNhau ? c.cauTrucGiong : c.cauTrucKhac(khac.length),
  };
}

/**
 * So sánh HAI LẦN QUAN SÁT của cùng một giao dịch.
 *
 * Câu trả về cố tình KHÔNG buộc tội. Hai lần đọc khác nhau có thể vì trạng thái
 * chuỗi đã đổi — và cũng có thể vì giao dịch bị tráo. Custos phân biệt được hai
 * khả năng đó bằng `khopNeo` (so byte), không bằng phép so này.
 */
export function soSanhQuanSat(truoc: Facts, sau: Facts, locale: "vi" | "en" = "vi"): KetQuaSoSanh {
  const co = soSanhCauTruc(truoc, sau, locale);
  const c = CHU_SO_SANH[locale];
  const giongNhau = co.khacBiet.length === 0;
  return {
    loai: "quanSat",
    giongNhau,
    khacBiet: co.khacBiet,
    cau: giongNhau ? c.quanSatGiong : c.quanSatKhac(co.khacBiet.length),
  };
}

function them(ra: DongKhac[], khoa: string, truong: string, a: string | null, b: string | null): void {
  if (a !== b) ra.push({ khoa, truong, a, b });
}

const chuoiSo = (v: bigint | undefined): string | null => (v === undefined ? null : `${v}`);

/**
 * Mô tả một lệnh cho người đọc: loại lệnh, và authority nếu có.
 *
 * `null` nghĩa lệnh KHÔNG có mặt ở bên đó — khác hẳn "có mặt nhưng không đọc
 * hiểu", vốn trả `"(chưa đọc hiểu)"`.
 */
function moTaLenh(ix: InstructionFact | null, chuaDoc: string): string | null {
  if (ix === null) return null;
  const loai = ix.decoded?.kind ?? chuaDoc;
  return ix.decoded?.authority ? `${loai} → ${ix.decoded.authority}` : loai;
}

/** `null` khi Facts không mang trường này — xem chú thích ở `soSanhCauTruc`. */
const soNguoiKy = (f: Facts): string | null =>
  Array.isArray(f.nguoiKy) ? `${f.nguoiKy.length}` : null;

/**
 * Định danh bền cho một lệnh: `programId#thứ tự trong chính program đó`.
 *
 * Thêm một lệnh của program KHÁC vào đầu danh sách sẽ không làm lệch khoá của các
 * lệnh còn lại — đó là toàn bộ mục đích. So theo `index` tuyệt đối sẽ báo "mọi
 * lệnh đều đổi" khi chỉ có một lệnh được chèn vào.
 */
function nhomLenh(ds: InstructionFact[]): Map<string, InstructionFact> {
  const dem = new Map<string, number>();
  const ra = new Map<string, InstructionFact>();
  for (const ix of ds) {
    const n = dem.get(ix.programId) ?? 0;
    dem.set(ix.programId, n + 1);
    ra.set(`${ix.programId}#${n}`, ix);
  }
  return ra;
}

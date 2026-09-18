/**
 * Fixture cho phần A/B của landing — tách tối thiểu từ artifact đã kiểm.
 *
 * ## Vì sao không import thẳng `docs/review/.../scenarios.json`
 *
 * Đặc tả mục 9.2 cấm đích danh: *"Không import `docs/review/*` trực tiếp vào app
 * runtime."* File gốc là biên bản một lượt review — nó mang cả `chanDoan` đầy đủ,
 * danh sách bằng chứng và trường nội bộ. Đưa nguyên nó vào bundle là vừa nặng vừa
 * công bố nhiều hơn mức cần.
 *
 * Nên ở đây là bản **rút gọn có chủ đích**, và `nguonGoc` ghi lại đúng nơi truy
 * ngược. Có test đối chiếu từng giá trị quan trọng với file gốc
 * (`landingSample.test.ts`) để bản rút gọn không trôi khỏi nguồn.
 *
 * ## Đây KHÔNG phải receipt đủ để replay
 *
 * Mục 9.2 đòi nói rõ điều này khi giảm dữ liệu để public. Fixture dưới đây chỉ đủ
 * để HIỂN THỊ; nó không mang `Facts`, nên không ai chạy lại được engine từ nó.
 */

/** Đổi khi hình dạng fixture đổi kiểu làm bản cũ đọc sai. */
export const PHIEN_BAN_FIXTURE = 1;

/**
 * Nguồn của từng dữ kiện.
 *
 * `observed` — đọc được từ kết quả mô phỏng.
 * `structural` — suy từ CẤU TRÚC transaction (ví dụ: không có lệnh đổi chủ).
 *
 * Phân biệt hai cái này là điều kiện để không phạm lỗi mục 6.5: *"Không suy
 * before/after owner của A chỉ từ việc không có `diff`."*
 */
export type NguonDuKien = "observed" | "structural";

export type DongKetQua = {
  /** Khoá dịch trong `content.ts`, không phải chữ hiển thị. */
  khoa: "tokenChuyen" | "soDuSau" | "doiChu" | "ketLuan";
  nguon: NguonDuKien;
};

export type CaMau = {
  id: "a" | "b";
  /** Tên ca trong artifact gốc — để truy ngược. */
  tenTrongArtifact: string;
  level: "safe" | "danger";
  /** Số dư, giữ dạng chuỗi raw + decimals để UI tự format (mục 9.2). */
  soDu: { truoc: string; sau: string; decimals: number };
  /** Có thao tác đổi chủ tài khoản trong transaction mẫu không. */
  doiChu: null | { truoc: string; sau: string; sauDayDu: string };
  reasonCodes: string[];
  coverage: { analyzed: number; total: number; unverifiedPrograms: number };
};

export type FixtureLanding = {
  phienBan: number;
  loai: "recorded-sample";
  nguonGoc: {
    /** Thời điểm ĐO, lấy từ artifact — không phải thời điểm mở trang. */
    doLuc: string;
    sourceCommit: string;
    moTa: string;
    /** Giao dịch có được gửi lên mạng không. Ở đây luôn `false`. */
    daGui: boolean;
    duongDanArtifact: string;
  };
  /** Ghi thẳng trong dữ liệu: đây không đủ để replay. */
  khongPhaiReceipt: true;
  ca: CaMau[];
};

/**
 * Giá trị dưới đây chép từ `docs/review/demo-wow-20260918/scenarios.json`.
 *
 * Cặp ca dùng cho A/B là `gui-10` và `gui-10-va-doi-chu` — cả hai cùng
 * 500 → 490, khác nhau đúng ở chỗ đổi chủ tài khoản. Đó là toàn bộ điểm nhớ của
 * trang.
 *
 * KHÔNG lấy từ `scenarios-base-units.json`: mục 9.2 cấm đích danh, vì bản đó đo
 * bằng base unit nên gắn nhãn "10 token" lên nó là sai đơn vị.
 */
export const FIXTURE: FixtureLanding = {
  phienBan: PHIEN_BAN_FIXTURE,
  loai: "recorded-sample",
  nguonGoc: {
    doLuc: "2026-09-17T21:39:12.650Z",
    sourceCommit: "dd7e776b03706f6cc587a494160e57660280041f",
    moTa: "Hai lượt mô phỏng ĐỘC LẬP trên Solana Devnet, giao dịch chưa ký.",
    daGui: false,
    duongDanArtifact: "docs/review/demo-wow-20260918/scenarios.json",
  },
  khongPhaiReceipt: true,
  ca: [
    {
      id: "a",
      tenTrongArtifact: "gui-10",
      level: "safe",
      soDu: { truoc: "500000000", sau: "490000000", decimals: 6 },
      /*
       * `null` nghĩa: KHÔNG CÓ thao tác đổi chủ trong transaction mẫu.
       *
       * Đây là kết luận về CẤU TRÚC transaction (`nguon: "structural"`), không
       * phải một phép đo owner trước/sau. Artifact của ca này không mang dòng
       * owner nào, nên hiển thị một cặp trước/sau ở đây sẽ là bịa dữ kiện.
       */
      doiChu: null,
      reasonCodes: [],
      coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
    },
    {
      id: "b",
      tenTrongArtifact: "gui-10-va-doi-chu",
      level: "danger",
      soDu: { truoc: "500000000", sau: "490000000", decimals: 6 },
      doiChu: {
        truoc: "Bạn",
        sau: "CRZa…picz",
        sauDayDu: "CRZaSPkMcJsFrsbcQs8zVCsxGcTUXLYmmotm4fwepicz",
      },
      reasonCodes: ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
      coverage: { analyzed: 1, total: 1, unverifiedPrograms: 0 },
    },
  ],
};

/** Nguồn của từng dòng hiển thị, dùng chung cho cả hai ca. */
export const NGUON_DONG: DongKetQua[] = [
  { khoa: "tokenChuyen", nguon: "observed" },
  { khoa: "soDuSau", nguon: "observed" },
  { khoa: "doiChu", nguon: "structural" },
  { khoa: "ketLuan", nguon: "observed" },
];

export function layCa(id: "a" | "b"): CaMau {
  const ca = FIXTURE.ca.find((c) => c.id === id);
  if (!ca) throw new Error(`fixture thiếu ca ${id}`);
  return ca;
}

/**
 * Format số token từ raw + decimals.
 *
 * Tự format thay vì lưu sẵn chuỗi vì mục 10 đòi *"định dạng số theo locale và giữ
 * decimals chính xác"* — và hai locale hiển thị khác nhau (`490,0` với `490.0`).
 *
 * Dùng `BigInt` cho phần nguyên: số token có thể vượt `Number.MAX_SAFE_INTEGER`
 * khi decimals lớn, và một phép chia dấu phẩy động ở đây sẽ sai ở chữ số cuối —
 * đúng chỗ người đọc đang kiểm tiền.
 */
export function dinhDangToken(raw: string, decimals: number, locale: "vi" | "en"): string {
  const am = raw.startsWith("-");
  const so = BigInt(am ? raw.slice(1) : raw);
  const chia = 10n ** BigInt(decimals);
  const nguyen = so / chia;
  const du = so % chia;

  const dauThapPhan = locale === "vi" ? "," : ".";
  const phanNguyen = nguyen.toLocaleString(locale === "vi" ? "vi-VN" : "en-US");

  // Bỏ số 0 thừa ở đuôi, nhưng giữ ít nhất một chữ số thập phân.
  const duChuoi = du.toString().padStart(decimals, "0").replace(/0+$/, "") || "0";
  return `${am ? "-" : ""}${phanNguyen}${dauThapPhan}${duChuoi}`;
}

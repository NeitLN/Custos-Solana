import type { InspectResult, Locale } from "@custos-solana/types";
import { sha256Hex } from "./sha256.ts";
import type { Facts } from "./facts.ts";
import { dongBangFacts, giaiDongBangFacts } from "./facts-io.ts";
import { locDongNhatKy } from "./che-nhay-cam.ts";

/**
 * CU-11 — BIÊN LAI XUẤT RA NGOÀI.
 *
 * Hai chế độ, và khác biệt giữa chúng là điều duy nhất đáng nhớ ở file này:
 *
 *   `rieng`  — hồ sơ đủ để chạy lại (replay). Mang theo `Facts`.
 *   `chiaSe` — bản đưa cho người khác. KHÔNG mang `Facts`, nên KHÔNG replay được.
 *
 * Bản chia sẻ không replay được là **hệ quả cố ý**, không phải thiếu sót: `Facts`
 * chứa toàn bộ trạng thái tài khoản đã đọc, và đưa nó cho người lạ là đưa nhiều
 * hơn những gì người xuất định đưa. Biên lai tự ghi `khongReplayDuoc` kèm lý do
 * thay vì im lặng — CU-12 sẽ từ chối replay nó thay vì bịa `Facts`.
 *
 * ĐIỀU FILE NÀY KHÔNG LÀM, và không được nói là có làm:
 *
 *   - `hash` chỉ chứng minh **nội dung không đổi kể từ lúc xuất**. Nó KHÔNG phải
 *     chữ ký, KHÔNG chứng minh ai xuất, và KHÔNG chứng minh RPC đã nói thật. Ai
 *     sửa biên lai đều tính lại được hash.
 *   - Che dữ liệu KHÔNG phải ẩn danh. Địa chỉ ví và chữ ký giao dịch là dữ liệu
 *     công khai trên chuỗi và liên kết được tới danh tính. Biên lai nói thẳng
 *     điều này trong chính nó.
 *   - Không có `rawTx` và không có chữ ký trong bất kỳ chế độ nào. Không có cờ
 *     để bật.
 */

/** Đổi version khi hình dạng biên lai đổi kiểu làm bản cũ đọc sai. */
export const PHIEN_BAN_RECEIPT = 1;

export type CheDoReceipt = "rieng" | "chiaSe";

export type Receipt = {
  phienBan: number;
  cheDo: CheDoReceipt;
  taoLuc: string;
  /** Kết quả của chính lượt kiểm đó. `level` vẫn chỉ đến từ L2. */
  ketQua: InspectResult;
  /** Chỉ có ở chế độ `rieng`. Vắng mặt là lý do không replay được. */
  facts?: unknown;
  /** Vì sao biên lai này không chạy lại được. `null` nghĩa là chạy lại được. */
  khongReplayDuoc: string | null;
  /** Toàn vẹn nội dung — KHÔNG phải chữ ký. Xem chú thích đầu file. */
  hash: string;
  /** Câu tự khai về giới hạn, đi cùng biên lai ra ngoài. */
  ranhGioi: string[];
};

const RANH_GIOI = [
  "hash chỉ chứng minh nội dung không đổi kể từ lúc xuất — KHÔNG phải chữ ký, không chứng minh ai xuất, không chứng minh RPC nói thật",
  "che dữ liệu KHÔNG phải ẩn danh: địa chỉ ví và chữ ký giao dịch là dữ liệu công khai trên chuỗi, liên kết được tới danh tính",
  "biên lai không chứa raw transaction và không chứa chữ ký, ở mọi chế độ",
  "level trong biên lai do engine luật (L2) sinh, không do mô hình ngôn ngữ",
];

/** Cùng bốn ranh giới, bản tiếng Anh — cùng mức mạnh, không nói nhẹ đi. */
const RANH_GIOI_EN = [
  "the hash only proves the content has not changed since export — it is NOT a signature, it does not prove who exported it, and it does not prove the RPC told the truth",
  "redaction is NOT anonymity: wallet addresses and transaction signatures are public on-chain data and can be linked to an identity",
  "the receipt contains no raw transaction and no signature, in every mode",
  "the level in the receipt is produced by the rule engine (L2), not by a language model",
];

const KHONG_REPLAY = {
  vi: {
    chiaSe: "bản chia sẻ cố ý không mang Facts — Facts chứa toàn bộ trạng thái tài khoản đã đọc",
    khongCo: "không có Facts của lượt kiểm này",
  },
  en: {
    chiaSe: "the shareable copy deliberately carries no Facts — Facts contain the full account state that was read",
    khongCo: "no Facts for this check",
  },
} as const;

/** Trần độ dài cho chữ tự do đi vào biên lai. */
const TRAN_CHU = 4_000;

/**
 * Che và cắt một chuỗi trước khi cho vào biên lai.
 *
 * Dùng chung quy tắc với nhật ký của ví (`che-nhay-cam.ts`) — đó là lý do module
 * đó được chuyển lên core. Hai bộ quy tắc song song thì vá một bên, bên kia hở.
 */
function sach(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = locDongNhatKy(v);
  return s.length <= TRAN_CHU ? s : s.slice(0, TRAN_CHU - 1) + "…";
}

/** Đi khắp cấu trúc, che mọi chuỗi. Giữ nguyên hình dạng và các kiểu khác. */
function cheSauRong(x: unknown): unknown {
  if (typeof x === "string") return sach(x);
  if (Array.isArray(x)) return x.map(cheSauRong);
  if (x && typeof x === "object") {
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, cheSauRong(v)]));
  }
  return x;
}

/**
 * Hash nội dung biên lai, bỏ chính trường `hash` ra khỏi phép tính.
 *
 * Dùng `sha256Hex` tự viết chứ không `node:crypto`: bản đầu dùng `node:crypto` và
 * làm **trắng cả hai trang** trên Chromium (Vite externalize module của Node). Xem
 * `sha256.ts`.
 */
function tinhHash(r: Omit<Receipt, "hash">): string {
  return sha256Hex(JSON.stringify(r));
}

/**
 * Dựng biên lai từ một lượt kiểm.
 *
 * `facts` là tuỳ chọn: vắng nó thì kể cả chế độ `rieng` cũng không replay được, và
 * biên lai phải nói ra điều đó thay vì trông như đầy đủ.
 */
export function dungReceipt(
  ketQua: InspectResult,
  cheDo: CheDoReceipt,
  facts?: Facts,
  taoLuc: Date = new Date(),
  locale: Locale = "vi",
): Receipt {
  const sachKetQua = cheSauRong(ketQua) as InspectResult;

  let khongReplayDuoc: string | null = null;
  let factsRa: unknown;

  if (cheDo === "chiaSe") {
    khongReplayDuoc = KHONG_REPLAY[locale].chiaSe;
  } else if (!facts) {
    khongReplayDuoc = KHONG_REPLAY[locale].khongCo;
  } else {
    // Đi qua facts-io để bigint sống sót qua JSON, rồi che chuỗi.
    factsRa = cheSauRong(JSON.parse(dongBangFacts(facts)));
  }

  const phan: Omit<Receipt, "hash"> = {
    phienBan: PHIEN_BAN_RECEIPT,
    cheDo,
    taoLuc: taoLuc.toISOString(),
    ketQua: sachKetQua,
    ...(factsRa === undefined ? {} : { facts: factsRa }),
    khongReplayDuoc,
    ranhGioi: locale === "en" ? RANH_GIOI_EN : RANH_GIOI,
  };

  return { ...phan, hash: tinhHash(phan) };
}

export function receiptRaJson(r: Receipt): string {
  return JSON.stringify(r, null, 2);
}

export type KetQuaDoc =
  | { ok: true; receipt: Receipt; toanVen: boolean }
  | { ok: false; loi: string };

/**
 * Đọc biên lai từ JSON.
 *
 * `toanVen` tách khỏi `ok` có chủ ý: một biên lai **đọc được nhưng đã bị sửa** là
 * tình huống khác hẳn một biên lai hỏng, và người gọi cần phân biệt được. Gộp hai
 * thứ vào một cờ là buộc họ đoán.
 */
const LOI_DOC = {
  vi: {
    json: "không phải JSON đọc được",
    object: "biên lai phải là object",
    thieuPhienBan: "thiếu phienBan",
    phienBan: (v: unknown) => `phienBan ${v} không đọc được (bản này đọc ${PHIEN_BAN_RECEIPT})`,
    cheDo: "cheDo không hợp lệ",
    thieuHash: "thiếu hash",
  },
  en: {
    json: "not readable JSON",
    object: "a receipt must be an object",
    thieuPhienBan: "missing phienBan",
    phienBan: (v: unknown) => `phienBan ${v} cannot be read (this version reads ${PHIEN_BAN_RECEIPT})`,
    cheDo: "invalid cheDo",
    thieuHash: "missing hash",
  },
} as const;

export function docReceipt(s: string, locale: Locale = "vi"): KetQuaDoc {
  const L = LOI_DOC[locale];
  let v: unknown;
  try {
    v = JSON.parse(s);
  } catch {
    return { ok: false, loi: L.json };
  }
  if (typeof v !== "object" || v === null) return { ok: false, loi: L.object };

  const o = v as Record<string, unknown>;
  if (typeof o["phienBan"] !== "number") return { ok: false, loi: L.thieuPhienBan };
  if (o["phienBan"] !== PHIEN_BAN_RECEIPT) {
    return { ok: false, loi: L.phienBan(o["phienBan"]) };
  }
  if (o["cheDo"] !== "rieng" && o["cheDo"] !== "chiaSe") return { ok: false, loi: L.cheDo };
  if (typeof o["hash"] !== "string") return { ok: false, loi: L.thieuHash };

  const { hash, ...phan } = o as unknown as Receipt;
  return { ok: true, receipt: o as unknown as Receipt, toanVen: tinhHash(phan) === hash };
}

/**
 * Lấy lại `Facts` từ biên lai để chạy lại (CU-12 dùng).
 *
 * Trả `null` khi biên lai không mang Facts — người gọi phải xử lý, và đó là điểm
 * khác biệt giữa *từ chối replay* và *bịa Facts rỗng rồi chạy*.
 */
export function factsTuReceipt(r: Receipt): Facts | null {
  if (r.khongReplayDuoc !== null || r.facts === undefined) return null;
  return giaiDongBangFacts(JSON.stringify(r.facts));
}

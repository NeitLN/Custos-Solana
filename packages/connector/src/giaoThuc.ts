/**
 * GIAO THỨC dApp ↔ CỬA SỔ VÍ — spike G0-1, `docs/roadmap/ROADMAP-SAU-MENTOR.md` mục 2.
 *
 * Hàm thuần, không đụng `window`: cả connector (trang dApp) lẫn cửa sổ ví dùng CHUNG một
 * bản kiểm, và Node test được mà không cần trình duyệt.
 *
 * ## Ranh giới quyền — điều quan trọng nhất của file này
 *
 * dApp chỉ được gửi ĐÚNG ba loại yêu cầu, mỗi loại một tập khoá cố định: xin kết nối, xin
 * ký bytes, ngắt. Không có trường nào để dApp nói "tắt Custos", "giao dịch này an toàn",
 * "người dùng đã đồng ý", hay khai `expectedAction`. Khoá lạ ⇒ cả thông điệp bị loại, không
 * phải bị lờ đi một phần — lờ đi một phần là cách một trường mới lặng lẽ lọt vào sau này.
 *
 * Origin và cửa sổ nguồn KHÔNG nằm trong thông điệp: trình duyệt cấp chúng qua
 * `MessageEvent.origin` / `.source`, và bên nhận kiểm ở đó. Trường tự khai trong thân
 * thông điệp thì ai cũng giả được.
 */

/** Đánh dấu thông điệp của giao thức này, kèm phiên bản. Đổi hình dạng ⇒ tăng số. */
export const PHIEN_BAN = 1;

/** Giao dịch Solana tối đa 1232 byte ⇒ base64 tối đa 1644 ký tự. */
export const BYTE_TOI_DA = 1232;
const BASE64_TOI_DA = Math.ceil(BYTE_TOI_DA / 3) * 4;

const MAU_ID = /^[A-Za-z0-9-]{8,64}$/;
const MAU_BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MAU_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// ── dApp → ví ────────────────────────────────────────────────────────────────

export type YeuCau =
  | { custos: 1; kieu: "ket-noi"; id: string }
  | { custos: 1; kieu: "ky"; id: string; giaoDich: string }
  | { custos: 1; kieu: "ngat"; id: string };

const KHOA_YEU_CAU: Record<YeuCau["kieu"], readonly string[]> = {
  "ket-noi": ["custos", "kieu", "id"],
  ky: ["custos", "kieu", "id", "giaoDich"],
  ngat: ["custos", "kieu", "id"],
};

// ── ví → dApp ────────────────────────────────────────────────────────────────

/** Mã lỗi ví trả cho dApp. Câu hiển thị nằm ở `CAU_LOI`, không để dApp tự đặt. */
export type MaLoi =
  | "tu-choi" // người dùng bấm Từ chối / Chặn
  | "chua-kiem-duoc" // Custos không kiểm xong ⇒ không ký (fail-safe)
  | "chua-ro" // đã hỏi signer nhưng không có chữ ký hợp lệ — KHÔNG thử lại
  | "dang-ban" // đang có một yêu cầu khác chờ người dùng
  | "sai-yeu-cau" // bytes không đọc được, ví không phải người ký, …
  | "chua-ket-noi";

export const CAU_LOI: Record<MaLoi, string> = {
  "tu-choi": "Người dùng đã từ chối trong ví.",
  "chua-kiem-duoc": "Custos chưa kiểm được giao dịch này nên ví không ký.",
  "chua-ro": "Không rõ ví đã ký hay chưa — đừng gửi lại yêu cầu, hãy kiểm tra trong ví.",
  "dang-ban": "Ví đang chờ người dùng quyết định một yêu cầu khác.",
  "sai-yeu-cau": "Ví không nhận yêu cầu này.",
  "chua-ket-noi": "Ứng dụng chưa được người dùng cho kết nối.",
};

export type KetQuaKetNoi = { diaChi: string; khoaCongKhai: string };
export type KetQuaKy = { giaoDichDaKy: string };

export type ThongDiepVi =
  | { custos: 1; kieu: "san-sang" }
  | { custos: 1; kieu: "tra-loi"; id: string; ok: true; ketQua: KetQuaKetNoi | KetQuaKy | null }
  | { custos: 1; kieu: "tra-loi"; id: string; ok: false; loi: MaLoi }
  | { custos: 1; kieu: "doi-tai-khoan"; diaChi: string | null };

// ── kiểm ─────────────────────────────────────────────────────────────────────

function laObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function dungKhoa(o: Record<string, unknown>, khoa: readonly string[]): boolean {
  const co = Object.keys(o);
  return co.length === khoa.length && khoa.every((k) => Object.hasOwn(o, k));
}

export function laBase64GiaoDich(s: unknown): s is string {
  return typeof s === "string" && s.length > 0 && s.length <= BASE64_TOI_DA && MAU_BASE64.test(s);
}

/** Yêu cầu từ dApp — hoặc `null` nếu sai bất kỳ điều gì. Không sửa, không lọc bớt. */
export function docYeuCau(x: unknown): YeuCau | null {
  if (!laObject(x) || x["custos"] !== PHIEN_BAN) return null;
  const kieu = x["kieu"];
  if (kieu !== "ket-noi" && kieu !== "ky" && kieu !== "ngat") return null;
  if (!dungKhoa(x, KHOA_YEU_CAU[kieu])) return null;
  if (typeof x["id"] !== "string" || !MAU_ID.test(x["id"])) return null;
  if (kieu === "ky" && !laBase64GiaoDich(x["giaoDich"])) return null;
  return x as YeuCau;
}

/** Thông điệp từ ví — hoặc `null`. Connector dùng, cùng nguyên tắc: sai là bỏ cả. */
export function docThongDiepVi(x: unknown): ThongDiepVi | null {
  if (!laObject(x) || x["custos"] !== PHIEN_BAN) return null;
  switch (x["kieu"]) {
    case "san-sang":
      return dungKhoa(x, ["custos", "kieu"]) ? (x as ThongDiepVi) : null;
    case "doi-tai-khoan": {
      if (!dungKhoa(x, ["custos", "kieu", "diaChi"])) return null;
      const d = x["diaChi"];
      return d === null || (typeof d === "string" && MAU_BASE58.test(d)) ? (x as ThongDiepVi) : null;
    }
    case "tra-loi": {
      if (typeof x["id"] !== "string" || !MAU_ID.test(x["id"])) return null;
      if (x["ok"] === false) {
        return dungKhoa(x, ["custos", "kieu", "id", "ok", "loi"]) &&
          typeof x["loi"] === "string" &&
          Object.hasOwn(CAU_LOI, x["loi"])
          ? (x as ThongDiepVi)
          : null;
      }
      if (x["ok"] !== true || !dungKhoa(x, ["custos", "kieu", "id", "ok", "ketQua"])) return null;
      const kq = x["ketQua"];
      if (kq === null) return x as ThongDiepVi;
      if (!laObject(kq)) return null;
      if (dungKhoa(kq, ["diaChi", "khoaCongKhai"]))
        return typeof kq["diaChi"] === "string" &&
          MAU_BASE58.test(kq["diaChi"]) &&
          typeof kq["khoaCongKhai"] === "string" &&
          MAU_BASE64.test(kq["khoaCongKhai"])
          ? (x as ThongDiepVi)
          : null;
      if (dungKhoa(kq, ["giaoDichDaKy"])) return laBase64GiaoDich(kq["giaoDichDaKy"]) ? (x as ThongDiepVi) : null;
      return null;
    }
    default:
      return null;
  }
}

// ── mã hoá bytes — không dùng Buffer: connector chạy trong trang dApp bất kỳ ─────

export function sangBase64(b: Uint8Array): string {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

export function tuBase64(s: string): Uint8Array {
  const bin = atob(s);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}

/** Id yêu cầu: ngẫu nhiên, không đoán được, khớp `MAU_ID`. */
export function taoId(): string {
  return globalThis.crypto.randomUUID();
}

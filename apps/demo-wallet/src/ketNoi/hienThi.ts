/**
 * CHỮ HIỂN THỊ CỦA CỬA SỔ KÝ — review UX 11/2026, mục "Signing window và Block".
 *
 * Mọi thứ ở đây CHỈ đọc `InspectResult` (và `facts.simulationOk` của chính lượt kiểm) để soạn chữ.
 * Không hàm nào trả hay sửa `level`: mức do L2 quyết, ở đây chỉ đặt tên cho nó bằng đúng ba từ
 * của Phòng phân tích (Normal / Review carefully / Danger).
 *
 * Nhận dạng loại dòng theo CẢ HAI bộ nhãn của core (`CHU_BANG.vi` và `.en`): kết quả tiếng Việt vẫn
 * được đọc đúng, và dòng không nhận ra được thì mọi kết luận "đo được" đều tắt (fail closed).
 *
 * Tách khỏi `ket-noi.tsx` để test Node chạy thẳng, không cần trình duyệt.
 */
import type { InspectResult } from "@custos-solana/types";
import { chiLaThongTin, CHU_BANG, dinhDangSo, REASON } from "@custos-solana/core";
import { tomTat } from "@custos-solana/ai";

type Dong = InspectResult["diff"][number];
type KhoaNhan = keyof typeof CHU_BANG.en.nhan;

/** Cùng từ vựng với thẻ kết quả của Phòng phân tích (`CanhBao.tsx`, `NHAN`). */
export const NHAN_MUC: Record<InspectResult["level"], { chu: string; phu: string }> = {
  safe: { chu: "Normal", phu: "No danger signs found in the parts we could read" },
  warning: { chu: "Review carefully", phu: "There is information you should verify before continuing" },
  danger: { chu: "Danger", phu: "You should not sign this transaction" },
};

/**
 * C1 — "thiếu dữ liệu" KHÁC "phát hiện hành vi nguy hiểm" (ADR-0004 mục 3, BOI-CANH-DU-AN.md bảng ba chữ).
 * Chỉ có mã thông tin (hoặc không mã nào) mà vẫn không Xanh ⇒ cờ vì THIẾU, không phải cáo buộc.
 */
export function cauLoaiCo(r: InspectResult): string | null {
  if (r.level === "safe") return null;
  return r.reasonCodes.length === 0 || chiLaThongTin(r.reasonCodes)
    ? "Custos flagged this because it LACKS THE INFORMATION to reach a conclusion — not because it found harmful behavior. Check carefully yourself before signing."
    : null;
}

/** Mã nói rằng phép đo KHÔNG trọn — có mã nào thì không kết luận gì kiểu "đo được là không có". */
export const MA_DO_KHONG_TRON: readonly string[] = [
  REASON.MO_PHONG_HONG,
  REASON.ALT_KHONG_GIAI_DUOC,
  REASON.TRANG_THAI_DO_KHUYET,
  REASON.CHUONG_TRINH_KHONG_RO,
  REASON.NGUOI_DUNG_KHONG_RO,
  REASON.PROGRAM_CHUA_XAC_MINH,
];

const KHOA_BANG: readonly KhoaNhan[] = ["SO_DU_SOL", "DAT_COC", "PHI", "PHI_UOC", "CHUA_DOC"];
const KHOA_TIEN_TO: readonly KhoaNhan[] = ["SO_DU", "CHU_SO_HUU", "DUOC_PHEP_RUT", "QUYEN_DONG", "CHUONG_TRINH"];
const BAN: readonly string[] = [CHU_BANG.vi.ban, CHU_BANG.en.ban];
const TOI: readonly string[] = [CHU_BANG.vi.toi, CHU_BANG.en.toi];

/** Loại dòng + tên token (nếu có), nhận theo cả hai ngôn ngữ. `null` = dòng lạ. */
export function loaiDong(label: string): { khoa: KhoaNhan; ten: string } | null {
  for (const chu of [CHU_BANG.en, CHU_BANG.vi]) {
    for (const k of KHOA_BANG) if (label === chu.nhan[k]) return { khoa: k, ten: "" };
    for (const k of KHOA_TIEN_TO) {
      const tt = chu.nhan[k];
      if (!label.startsWith(tt)) continue;
      let ten = label.slice(tt.length);
      for (const duoi of [chu.sauKhiKy, chu.duoiTaiKhoan]) if (duoi && ten.endsWith(duoi)) ten = ten.slice(0, -duoi.length);
      return { khoa: k, ten: ten.trim() };
    }
  }
  return null;
}

function soTho(d: Dong): { truoc: bigint; sau: bigint; decimals: number } | null {
  const s = d.soLieu;
  if (!s) return null;
  try {
    return { truoc: BigInt(s.truoc), sau: BigInt(s.sau), decimals: s.decimals };
  } catch {
    return null;
  }
}

/**
 * Phép đo có TRỌN không: mô phỏng chạy (của chính lượt này), độ phủ đủ, không mã "đo không trọn",
 * không dòng "chưa đọc được", và mọi dòng đều nhận ra được loại. Thiếu một điều ⇒ `false`.
 */
export function daDoTron(r: InspectResult, simulationOk: boolean | undefined): boolean {
  if (simulationOk !== true) return false;
  const { analyzed, total } = r.coverage;
  if (total <= 0 || analyzed !== total) return false;
  if (r.reasonCodes.some((c) => MA_DO_KHONG_TRON.includes(c))) return false;
  for (const d of r.diff) {
    const l = loaiDong(d.label);
    if (!l || l.khoa === "CHUA_DOC") return false;
  }
  return true;
}

/**
 * "SOL or tokens coming in: none" — dApp hứa phần thưởng, nên sự thật đáng giá nhất là giao dịch KHÔNG
 * mang gì về. Chỉ `true` khi điều đó được ĐO (xem `daDoTron`), không bao giờ từ lời dApp, và:
 *   · MỌI dòng số dư có số thô và không dòng nào tăng (tính ròng, theo mô phỏng);
 *   · không dòng quyền nào chuyển quyền kiểm soát VỀ người ký (cột sau là "You"/"Bạn").
 * Chỉ thêm thông tin: không đụng `level`.
 */
export function khongCoGiVao(r: InspectResult, simulationOk: boolean | undefined): boolean {
  if (!daDoTron(r, simulationOk)) return false;
  for (const d of r.diff) {
    const l = loaiDong(d.label)!;
    if (l.khoa === "SO_DU" || l.khoa === "SO_DU_SOL") {
      const s = soTho(d);
      if (!s || s.sau > s.truoc) return false;
    } else if (KHOA_TIEN_TO.includes(l.khoa) && BAN.includes(d.after.trim())) {
      return false;
    } else if (d.soLieu && !soTho(d)) {
      return false;
    }
  }
  return true;
}

function noiCau(ds: string[]): string {
  if (ds.length <= 1) return ds.join("");
  return `${ds.slice(0, -1).join(", ")} and ${ds[ds.length - 1]}`;
}

/**
 * CÂU HẬU QUẢ — dòng đầu tiên sau băng mức, ghép từ CHÍNH bảng chênh lệch; số lấy từ số thô `soLieu`,
 * địa chỉ lấy nguyên từ bảng. Ví dụ: "If you sign: 250.0 DEMO leaves your wallet and your DEMO token
 * account — with the remaining 250.0 DEMO in it — gets a new owner (7oGP…AQFm)."
 *
 * `tuBang`: câu dựng từ các dòng bảng (khi đó diễn giải của SDK không cần lặp lại).
 * Không dòng nào dựng được câu ⇒ Danger nêu mã lý do; mức khác dùng câu của Phòng phân tích (`tomTat`).
 */
export function cauHauQua(r: InspectResult, simulationOk?: boolean): { cau: string; tuBang: boolean } {
  const dong = r.diff.map((d) => ({ d, l: loaiDong(d.label), s: soTho(d) }));
  // Số dư CÒN LẠI trong tài khoản token sắp đổi chủ — để câu đổi chủ không nói nhẹ đi phần mất.
  const conLai = new Map<string, string>();
  for (const { l, s } of dong)
    if (l?.khoa === "SO_DU" && s) conLai.set(l.ten, s.sau > 0n ? dinhDangSo(s.sau, s.decimals, "en") : "0");

  const cau: string[] = [];
  for (const { d, l, s } of dong) {
    if (!l) continue;
    const t = l.ten;
    switch (l.khoa) {
      case "SO_DU":
      case "SO_DU_SOL": {
        const ten = l.khoa === "SO_DU_SOL" ? "SOL" : t;
        if (s && s.sau < s.truoc) cau.push(`${dinhDangSo(s.truoc - s.sau, s.decimals, "en")} ${ten} leaves your wallet`);
        else if (s && s.sau > s.truoc) cau.push(`${dinhDangSo(s.sau - s.truoc, s.decimals, "en")} ${ten} comes into your wallet`);
        else if (!s) cau.push(`your ${ten} balance changes from ${d.before} to ${d.after}`);
        break;
      }
      case "CHU_SO_HUU": {
        if (BAN.includes(d.after.trim())) cau.push(`you become the owner of a ${t} token account`);
        else if (BAN.includes(d.before.trim())) {
          const con = conLai.get(t);
          cau.push(
            con === undefined
              ? `your ${t} token account gets a new owner (${d.after})`
              : con === "0"
                ? `your (now empty) ${t} token account gets a new owner (${d.after})`
                : `your ${t} token account — with the remaining ${con} ${t} in it — gets a new owner (${d.after})`,
          );
        } else cau.push(`the owner of a ${t} token account changes from ${d.before} to ${d.after}`);
        break;
      }
      case "DUOC_PHEP_RUT": {
        const tach = TOI.find((x) => d.after.includes(x));
        const [vi, hanMuc] = tach ? d.after.split(tach) : [d.after, undefined];
        cau.push(`${vi} may withdraw ${hanMuc ? `up to ${hanMuc} ` : ""}${t} from you at any time`);
        break;
      }
      case "QUYEN_DONG":
        cau.push(
          BAN.includes(d.after.trim())
            ? `you get the right to close a ${t} token account`
            : `${d.after} gets the right to close your ${t} token account`,
        );
        break;
      case "CHUONG_TRINH":
        // Nhãn chỉ mang địa chỉ tài khoản — chưa chứng minh được là của người ký.
        cau.push(`an account in this transaction comes under the control of ${d.after}`);
        break;
      default:
        break;
    }
  }

  const vao = khongCoGiVao(r, simulationOk) ? " Nothing comes in." : "";
  if (cau.length > 0) return { cau: `If you sign: ${noiCau(cau)}.${vao}`, tuBang: true };

  const phi = dong.find(({ l }) => l?.khoa === "PHI" || l?.khoa === "PHI_UOC");
  if (phi && daDoTron(r, simulationOk) && r.diff.length === 1)
    return { cau: `If you sign: only the network fee ${phi.d.after} leaves your wallet.${vao}`, tuBang: true };

  if (r.level === "danger") {
    const ma = r.reasonCodes.join(", ") || "no reason code given";
    return {
      cau: `Danger because of ${ma}. Custos could not express it as a balance or ownership change — read the details before you decide.`,
      tuBang: false,
    };
  }
  return { cau: tomTat(r, "en"), tuBang: false };
}

/**
 * Một dòng bảng để vẽ. Phí không có "trước" ⇒ chỉ in "0.000005 SOL" (giống Phòng phân tích).
 * `docChoMayDoc`: câu cho trình đọc màn hình — mũi tên "→" đọc thành "from … to …".
 */
export function dongHienThi(d: Dong): { nhan: string; truoc: string | null; sau: string; docChoMayDoc: string } {
  const l = loaiDong(d.label);
  const truocRong = d.before.trim() === "" || d.before.trim() === "—";
  const chiSau = (l?.khoa === "PHI" || l?.khoa === "PHI_UOC") && truocRong;
  return chiSau
    ? { nhan: d.label, truoc: null, sau: d.after, docChoMayDoc: `${d.label}: ${d.after}` }
    : { nhan: d.label, truoc: d.before, sau: d.after, docChoMayDoc: `${d.label}: from ${d.before} to ${d.after}` };
}

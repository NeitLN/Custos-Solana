import type { Interpreter, Facts } from "@custos-solana/core";
import type { AiAdvisory } from "@custos-solana/types";
import { dienGiaiMau } from "./templates.ts";
import { nhanDien, moTaHanhDong, moTaLech } from "./nhanDien.ts";

export { dienGiaiMau } from "./templates.ts";
export { nhanDien, moTaHanhDong, moTaLech, type KetQuaNhanDien, type HauQuaLech } from "./nhanDien.ts";
export { dienGiaiBangMoHinh, soiDauRa, dungNeo, neoHanhDong, SYSTEM_PROMPT, type GoiMoHinh } from "./moHinh.ts";
export { tomTat } from "./mucNgan.ts";
export { chiTietKyThuat, type DongKyThuat } from "./mucKyThuat.ts";
export { dungHauQua, type HangHauQua } from "./hauQua.ts";
export { dungGoiAnthropic, type TuyChonAnthropic } from "./anthropic.ts";

/**
 * L3 — diễn giải.
 *
 * Hai tầng, và cần phân biệt rõ vì đây là chỗ dễ nói quá:
 *
 *   LÕI XÁC ĐỊNH (nhanDien.ts) — nhận diện hành động chính và hậu quả lệch.
 *     Chạy bằng logic, không có mô hình. Luôn có mặt, không cần mạng.
 *
 *   LỚP AI (boiThemAI) — viết lại thành câu tiếng Việt tự nhiên, điều chỉnh
 *     theo trình độ người đọc. Có thì tốt hơn, không có vẫn dùng được.
 *
 * Gắn nhãn "AI" cho phần chạy bằng if-else là nói quá. Chúng tôi không làm vậy.
 *
 * Ranh giới không đổi: hàm này KHÔNG trả về `level`. Kiểu `Interpreter` không
 * có trường đó, nên L3 không thể chạm vào verdict kể cả khi muốn.
 */

/** Mã lý do đã được phần "hậu quả lệch" nói tới rồi — nêu lại là lặp. */
const MA_TRUNG: Record<string, string> = {
  doi_chu: "SPL_SET_AUTHORITY__ACCOUNT_OWNER",
  cap_quyen_rut: "SPL_APPROVE_DELEGATE_LON",
  trao_quyen_dong: "SPL_SET_AUTHORITY__CLOSE_OR_FREEZE",
  doi_chuong_trinh: "SYSTEM_ASSIGN_DOI_OWNER",
};

function ghepCau(facts: Facts, reasonCodes: string[], kyHieu?: Record<string, string>): { cau: string; coLech: boolean } {
  const { hanhDong, lech } = nhanDien(facts, kyHieu);
  const phan: string[] = [];

  if (hanhDong) phan.push(`Hành động chính được nhận diện: ${moTaHanhDong(hanhDong)}.`);

  if (lech.length > 0) {
    const ds = lech.map(moTaLech).join("; ");
    phan.push(
      hanhDong
        ? `Nhưng giao dịch còn ${ds} — việc này không phục vụ ${moTaHanhDong(hanhDong)}.`
        : `Giao dịch ${ds}.`,
    );
  }

  // Bỏ những mã lý do mà câu trên đã nói rồi. Nói hai lần cùng một việc làm
  // người đọc tưởng có hai vấn đề khác nhau — đúng thứ cần tránh nhất khi
  // người ta đang vội bấm nút.
  const daNoi = new Set(lech.map((l) => MA_TRUNG[l.loai]).filter(Boolean));
  const conLai = reasonCodes.filter((c) => !daNoi.has(c));

  const mau = dienGiaiMau(facts, conLai);
  // `dienGiaiMau` luôn trả một câu, kể cả khi không còn mã nào. Chỉ ghép thêm
  // khi thật sự còn điều chưa nói.
  if (conLai.length > 0 && mau) phan.push(mau);
  else if (phan.length === 0) phan.push(mau);

  return { cau: phan.join(" "), coLech: lech.length > 0 };
}

/**
 * Bản không dùng mô hình ngôn ngữ.
 *
 * Khác bản trước ở chỗ nó ĐÃ nhận diện được hành động chính — trước đây luôn
 * trả `null` vì câu mẫu không suy ra ý định được. Giờ lõi xác định làm việc đó.
 */
export const dienGiaiKhongAI: Interpreter = async (facts, reasonCodes, _locale, options) => {
  const kyHieu = options?.kyHieuToken;
  const { hanhDong } = nhanDien(facts, kyHieu);
  const { cau, coLech } = ghepCau(facts, reasonCodes, kyHieu);
  return {
    detectedPrimaryAction: hanhDong,
    explanation: cau,
    // Có hậu quả không thuộc hành động chính ⇒ đề nghị người dùng xem kỹ.
    // Đây KHÔNG phải verdict: `level` vẫn do L2 quyết một mình.
    aiAdvisory: (coLech ? "review_required" : null) satisfies AiAdvisory,
  };
};

/**
 * Bọc một Interpreter bằng thời hạn và đường lui.
 *
 * Mô hình chậm hoặc lỗi thì rơi về lõi xác định — người dùng vẫn đọc được,
 * và `level` của L2 không bị đụng tới trong mọi trường hợp.
 */
export function boiThoiHan(that: Interpreter, msToiDa = 4000): Interpreter {
  return async (facts, reasonCodes, locale, options) => {
    try {
      return await Promise.race([
        that(facts, reasonCodes, locale, options),
        new Promise<never>((_, tuChoi) => setTimeout(() => tuChoi(new Error("L3 quá hạn")), msToiDa)),
      ]);
    } catch {
      return dienGiaiKhongAI(facts, reasonCodes, locale, options);
    }
  };
}

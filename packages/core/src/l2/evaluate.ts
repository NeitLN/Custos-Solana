import type { Level } from "@custos/types";
import type { Facts } from "../facts.ts";
import { LUAT, type Rule, type RuleHit } from "./rules.ts";

const THU_TU: Record<Level, number> = { safe: 0, warning: 1, danger: 2 };

export function caoHon(a: Level, b: Level): Level {
  return THU_TU[a] >= THU_TU[b] ? a : b;
}

export type KetQuaL2 = {
  level: Level;
  reasonCodes: string[];
  hits: RuleHit[];
};

/**
 * L2 — engine luật. Đây là nơi DUY NHẤT sinh ra `level`.
 * AI không tạo và không sửa giá trị này.
 *
 * Fail-safe: không hiểu hết giao dịch thì tối thiểu là `warning`, không bao giờ `safe`.
 *
 * Lưu ý phân biệt (DAC-TA-CORE.md mục 3.3): fail-safe áp cho ĐƯỜNG DECODE
 * (mô phỏng hỏng, instruction không đọc được), KHÔNG áp cho đường làm giàu
 * dữ liệu như tra tuổi ví. Nếu áp cho cả hai thì mọi giao dịch sẽ ra Vàng và
 * người dùng học được cách bỏ qua cảnh báo.
 */
export function danhGia(facts: Facts, luat: Rule[] = LUAT): KetQuaL2 {
  const hits: RuleHit[] = [];
  for (const r of luat) hits.push(...r.danhGia(facts));

  let level: Level = "safe";
  for (const h of hits) level = caoHon(level, h.level);

  // Fail-safe 1 — mô phỏng thất bại: không biết gì về hậu quả.
  if (!facts.simulationOk) level = caoHon(level, "warning");

  // Fail-safe 2 — còn phần chưa đọc hiểu được VÀ phần đó chạm được vào tài sản
  // của người ký.
  //
  // Vì sao có vế thứ hai: đo trên 15 giao dịch mainnet ngẫu nhiên cho ra 15/15
  // "cần xem kỹ", coverage trung bình 8%. Giao dịch mainnet đi qua rất nhiều
  // chương trình ta không decode, nên nếu chỉ nhìn coverage thì Custos cảnh báo
  // MỌI giao dịch — và người dùng sẽ học được cách bỏ qua cảnh báo. Một sản
  // phẩm bảo mật chết vì mệt mỏi cảnh báo cũng nhanh như chết vì bỏ lọt.
  //
  // Lệnh ta không đọc hiểu mà cũng không ghi vào tài khoản nào của người ký
  // thì không hại được người ký TRONG giao dịch này. Con số coverage vẫn hiển
  // thị nguyên vẹn — ta vẫn nói rõ mình chưa hiểu gì. Chỉ là không đẩy verdict
  // lên vì một thứ không chạm tới được người dùng.
  const chuaHieuMaChamDuoc = facts.instructions.some(
    (ix) => ix.decoded === null && ix.chamTaiSanNguoiKy,
  );
  if (facts.coverage.analyzed < facts.coverage.total && chuaHieuMaChamDuoc) {
    level = caoHon(level, "warning");
  }

  // Fail-safe 3 — có lookup table không giải được: danh sách account có thể thiếu,
  // nghĩa là bảng chênh lệch có thể đang bỏ sót thứ gì đó.
  if (facts.lookupTables.some((t) => !t.resolved)) level = caoHon(level, "warning");

  // Giữ thứ tự xuất hiện, bỏ trùng.
  const reasonCodes = [...new Set(hits.map((h) => h.reasonCode))];

  return { level, reasonCodes, hits };
}

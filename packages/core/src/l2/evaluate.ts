import type { Level } from "@custos/types";
import type { Facts } from "../facts.ts";
import { LUAT, type Rule, type RuleHit } from "./rules.ts";
import { REASON } from "../constants.ts";

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

  // Mã lý do sinh ra từ fail-safe, không từ luật nào. Một cảnh báo không có mã
  // là cảnh báo mà giao diện không giải thích được và bên tích hợp không phân
  // loại được — xem SECURITY-AUDIT.md mục A2.
  const maFailSafe: string[] = [];

  // Fail-safe 1 — mô phỏng thất bại: không biết gì về hậu quả.
  if (!facts.simulationOk) {
    level = caoHon(level, "warning");
    maFailSafe.push(REASON.MO_PHONG_HONG);
  }

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
  const chuaHieuMaChamDuoc = facts.instructions.filter(
    (ix) => ix.decoded === null && ix.chamTaiSanNguoiKy,
  );
  if (facts.coverage.analyzed < facts.coverage.total && chuaHieuMaChamDuoc.length > 0) {
    level = caoHon(level, "warning");

    // Luật 9 phát `PROGRAM_CHUA_XAC_MINH` cho lệnh BIẾT tên chương trình, nhưng nó
    // lọc `p !== ""`. Lệnh có `programId` rỗng — sinh ra thật ở `l1/fetch.ts` khi RPC
    // trả inner instruction thiếu `programId` — rơi qua cả hai: luật 9 im, fail-safe
    // này vẫn nâng verdict. Kết quả là `level: "warning"` với `reasonCodes: []`, đúng
    // thứ đoạn chú thích phía trên nói là không được phép.
    //
    // Mã RIÊNG chứ không tái dùng `PROGRAM_CHUA_XAC_MINH`: hai ca khác nhau thật.
    // "Chưa đọc hiểu chương trình X" thì ví còn hiện được địa chỉ X cho người dùng
    // tra cứu; "không biết đó là chương trình gì" thì không có gì để hiện.
    if (chuaHieuMaChamDuoc.some((ix) => ix.programId === "")) {
      maFailSafe.push(REASON.CHUONG_TRINH_KHONG_RO);
    }
  }

  // Fail-safe 3 — có lookup table không giải được: danh sách account có thể thiếu,
  // nghĩa là bảng chênh lệch có thể đang bỏ sót thứ gì đó.
  if (facts.lookupTables.some((t) => !t.resolved)) level = caoHon(level, "warning");

  // Fail-safe 4 — có account KHÔNG ĐO ĐƯỢC trạng thái sau.
  //
  // Khác hẳn fail-safe 2. Fail-safe 2 nói "có lệnh ta không đọc hiểu"; cái này
  // nói "có thay đổi ta không nhìn thấy". Một giao dịch có thể đọc hiểu 100 %
  // số lệnh mà vẫn giấu được hậu quả, nếu account bị ảnh hưởng nằm ngoài tầm
  // đo — đúng ca đã tái hiện được: 131 account, trần RPC 100, account của người
  // ký bị giao cho chương trình lạ ở vị trí 129, verdict ra `safe`.
  //
  // Không cần điều kiện "chạm tài sản người ký" như fail-safe 2: ta không biết
  // account đó là gì thì cũng không biết nó có phải của người ký hay không.
  if ((facts.accountKhongDoDuoc ?? []).length > 0) {
    level = caoHon(level, "warning");
    maFailSafe.push(REASON.TRANG_THAI_DO_KHUYET);
  }

  // Giữ thứ tự xuất hiện, bỏ trùng.
  const reasonCodes = [...new Set([...hits.map((h) => h.reasonCode), ...maFailSafe])];

  return { level, reasonCodes, hits };
}

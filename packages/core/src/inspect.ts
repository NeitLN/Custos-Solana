import type { Connection, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult, InspectOptions, PrimaryAction, AiAdvisory } from "@custos/types";
import { extractFacts } from "./l1/fetch.ts";
import { danhGia } from "./l2/evaluate.ts";
import { dungBangChenhLech } from "./diff.ts";
import type { Facts } from "./facts.ts";

/**
 * Hàm diễn giải của L3.
 *
 * KHÔNG có `level` trong kiểu trả về — ranh giới được cưỡng chế bằng kiểu dữ liệu
 * chứ không bằng lời dặn. AI không thể chạm vào verdict kể cả khi muốn.
 * Xem DAC-TA-L3.md mục 2.
 */
export type Interpreter = (
  facts: Facts,
  reasonCodes: string[],
  locale: "vi",
  options?: InspectOptions,
) => Promise<{
  detectedPrimaryAction: PrimaryAction | null;
  explanation: string;
  aiAdvisory: AiAdvisory;
}>;

export type InspectDeps = {
  connection: Connection;
  /** Tuỳ chọn. Vắng mặt thì sản phẩm vẫn chạy — chỉ mất phần diễn giải. */
  interpret?: Interpreter;
};

/**
 * Bề mặt SDK. Ví hoặc dApp gọi đúng hàm này trước khi cho người dùng ký.
 *
 *   const result = await inspect(deps, transaction, { locale: "vi" });
 *   if (result.level !== "safe" || result.aiAdvisory) showWarning(result);
 *
 * Ba tầng chạy theo đúng thứ tự tin cậy: L1 đo, L2 quyết, L3 diễn giải.
 * Nếu L3 hỏng hoặc quá hạn, `level`, `diff` và `reasonCodes` vẫn nguyên vẹn —
 * người dùng vẫn được bảo vệ, chỉ khó hiểu hơn.
 */
export async function inspect(
  deps: InspectDeps,
  tx: VersionedTransaction,
  options: InspectOptions = {},
): Promise<InspectResult> {
  const facts = await extractFacts(deps.connection, tx, options.nguoiDung);
  const l2 = danhGia(facts);
  const diff = dungBangChenhLech(facts, l2.hits);

  let detectedPrimaryAction: PrimaryAction | null = null;
  let explanation = "";
  let aiAdvisory: AiAdvisory = null;

  if (deps.interpret) {
    try {
      const r = await deps.interpret(facts, l2.reasonCodes, options.locale ?? "vi", options);
      detectedPrimaryAction = r.detectedPrimaryAction;
      explanation = r.explanation;
      aiAdvisory = r.aiAdvisory;
    } catch {
      // L3 hỏng không được làm sập lượt kiểm tra. Verdict của L2 giữ nguyên.
      detectedPrimaryAction = null;
      explanation = "";
      aiAdvisory = null;
    }
  }

  // Quy tắc BẤT ĐỐI XỨNG của expectedAction (CUSTOS.md mục 03):
  //   lệch  => nâng nghi ngờ
  //   khớp  => KHÔNG giảm verdict, KHÔNG tắt cảnh báo nào
  // Một dApp độc hại hoàn toàn có thể khai đúng để trông vô hại.
  const mongDoi = options.expectedAction;
  let loiKhaiLech: { khai: string; nhanDien: string } | null = null;
  if (mongDoi && detectedPrimaryAction && mongDoi.type !== detectedPrimaryAction.type) {
    aiAdvisory = "review_required";
    loiKhaiLech = { khai: mongDoi.type, nhanDien: detectedPrimaryAction.type };
  }

  return {
    level: l2.level, // CHỈ L2 sinh ra giá trị này
    aiAdvisory,
    detectedPrimaryAction,
    diff,
    reasonCodes: l2.reasonCodes,
    coverage: facts.coverage,
    explanation,
    ...(loiKhaiLech ? { loiKhaiLech } : {}),
  };
}

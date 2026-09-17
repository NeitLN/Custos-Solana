import type { Connection, VersionedTransaction } from "@solana/web3.js";
import type { InspectResult, InspectOptions, PrimaryAction, AiAdvisory } from "@custos-solana/types";
import { extractFacts } from "./l1/fetch.ts";
import { danhGia } from "./l2/evaluate.ts";
import { dungBangChenhLech } from "./diff.ts";
import type { Facts } from "./facts.ts";
import { dungChiMuc } from "./bang-chung.ts";
import { chiTietCoverage } from "./l1/coverage.ts";

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
  const diff = dungBangChenhLech(facts, l2.hits, options.kyHieuToken);

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

  /*
   * CHẨN ĐOÁN — dựng TỪ `l2.hits`, tức dữ liệu của CHÍNH lượt này.
   *
   * Thẻ X01 cấm đích danh: *"không gọi lại RPC rồi ghép trace của trạng thái khác
   * vào cảnh báo cũ"*. `l2.hits` là kết quả của `danhGia(facts)` ở trên, và `facts`
   * đến từ đúng một lượt `extractFacts` — nên trace và verdict không thể lệch nhau.
   *
   * Không có lời gọi mạng nào ở đây, và đó là điều kiểm được: `inspect()` gọi đúng
   * 5 method RPC, tất cả nằm trong `extractFacts`.
   */
  /*
   * CHỈ MỤC DỮ KIỆN — CU-04.
   *
   * Dựng từ `facts`, tức dữ liệu của CHÍNH lượt này. `dungChiMuc` không nhận
   * `Connection` và không `await` gì, nên không có đường nào lẫn dữ liệu của một
   * lượt đo khác vào đây — thẻ cấm đích danh việc ghép trace của trạng thái khác
   * vào cảnh báo cũ.
   *
   * Dựng KỂ CẢ khi `chanDoan` tắt: `bangChungTreo` là một phép kiểm tính toàn vẹn,
   * không phải dữ liệu hiển thị. Một luật khai dữ kiện không tồn tại là lỗi của
   * engine, và lỗi đó không được phép chỉ lộ ra khi người gọi bật chẩn đoán.
   */
  const chiMuc = dungChiMuc(facts);
  const treoLo = chiMuc.treoLo(l2.hits);

  const chanDoan = options.chanDoan
    ? {
        phienBan: 1 as const,
        canhBao: l2.hits.map((h) => ({
          ruleId: h.ruleId,
          reasonCode: h.reasonCode,
          level: h.level,
          bangChung: (h.bangChung ?? []).map((b) => {
            const m = chiMuc.tra(b.loai, b.khoa);
            return {
              loai: b.loai,
              khoa: b.khoa,
              /*
               * Nguồn của dữ kiện — CU-04 mục 4.2.
               *
               * `missing` khi luật khai một khoá mà `Facts` không có. Trước đây
               * trường hợp đó im lặng: ID trỏ vào hư không, và người đọc đi kiểm
               * thì gặp 404. Nay nó tự khai ra.
               */
              nguon: m?.nguon ?? ("missing" as const),
              ...(m?.lyDo ? { lyDo: m.lyDo } : {}),
              ...(m?.lenh && m.lenh.length > 0 ? { lenh: m.lenh } : {}),
            };
          }),
        })),
        // Đếm, không đoán bù — xem chú thích `thieuBangChung` trong types.
        thieuBangChung: l2.hits.filter((h) => (h.bangChung ?? []).length === 0).length,
        /**
         * Dữ kiện luật khai mà `Facts` KHÔNG có. Rỗng là điều kiện đúng.
         *
         * Khác hẳn `thieuBangChung`: cái đó đếm luật *chưa khai gì*; cái này đếm
         * luật *khai sai*. Một luật im lặng là chưa hoàn thiện; một luật trỏ vào
         * dữ kiện không tồn tại là đang nói dối về căn cứ của nó.
         */
        bangChungTreo: treoLo,
        nguon: {
          tang: "L1" as const,
          coverage: facts.coverage,
          /*
           * CU-07 — coverage theo NĂNG LỰC, không chỉ một phân số.
           *
           * `coverage.analyzed` gộp hai điều kiện khác nhau (`program đã xác minh`
           * và `decode được`), nên `67 %` không cho biết phần còn lại thiếu vì lý
           * do gì. Đo trên corpus: 58/106 lệnh là "chương trình quen nhưng chưa
           * đọc hiểu lệnh" — nhóm lớn nhất, và rất khác với "chương trình lạ".
           *
           * `coverage` cũ giữ nguyên bên cạnh: đây là mở rộng, không phải thay thế.
           */
          chiTiet: chiTietCoverage(facts.instructions),
          simulationOk: facts.simulationOk,
        },
      }
    : null;

  return {
    level: l2.level, // CHỈ L2 sinh ra giá trị này
    aiAdvisory,
    detectedPrimaryAction,
    diff,
    reasonCodes: l2.reasonCodes,
    coverage: facts.coverage,
    explanation,
    ...(loiKhaiLech ? { loiKhaiLech } : {}),
    ...(chanDoan ? { chanDoan } : {}),
  };
}

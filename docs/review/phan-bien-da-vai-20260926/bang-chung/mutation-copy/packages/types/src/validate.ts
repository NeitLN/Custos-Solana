import type { InspectResult, Level, DiffEntry } from "./index.ts";

const LEVELS: readonly string[] = ["safe", "warning", "danger"];

/**
 * Kiểm tra một giá trị bất kỳ có đúng hợp đồng InspectResult không.
 *
 * Vì sao cần bản chạy-thật thay vì chỉ kiểm tra ở tầng kiểu: JSON import
 * làm "danger" rộng thành string, nên `satisfies` không bắt được gì.
 * Hàm này còn được dùng lại để soi seed dataset của vai D.
 *
 * Trả về danh sách lỗi. Mảng rỗng nghĩa là hợp lệ.
 */
export function validateInspectResult(v: unknown): string[] {
  const e: string[] = [];
  if (typeof v !== "object" || v === null) return ["không phải object"];
  const o = v as Record<string, unknown>;

  if (!LEVELS.includes(o["level"] as string)) {
    e.push(`level phải là safe|warning|danger, nhận được: ${JSON.stringify(o["level"])}`);
  }

  const adv = o["aiAdvisory"];
  if (adv !== null && adv !== "review_required") {
    e.push(`aiAdvisory phải là "review_required" hoặc null, nhận được: ${JSON.stringify(adv)}`);
  }

  const act = o["detectedPrimaryAction"];
  if (act !== null) {
    if (typeof act !== "object" || act === null) e.push("detectedPrimaryAction phải là object hoặc null");
    else if (typeof (act as Record<string, unknown>)["type"] !== "string") {
      e.push("detectedPrimaryAction.type phải là string");
    }
  }

  if (!Array.isArray(o["diff"])) e.push("diff phải là mảng");
  else {
    (o["diff"] as unknown[]).forEach((d, i) => {
      const x = d as Partial<DiffEntry>;
      for (const k of ["label", "before", "after", "severity"] as const) {
        if (typeof x[k] !== "string") e.push(`diff[${i}].${k} phải là string`);
      }
    });
  }

  if (!Array.isArray(o["reasonCodes"]) || (o["reasonCodes"] as unknown[]).some((c) => typeof c !== "string")) {
    e.push("reasonCodes phải là mảng string");
  }

  const cov = o["coverage"] as Record<string, unknown> | undefined;
  if (typeof cov !== "object" || cov === null) e.push("coverage phải là object");
  else {
    for (const k of ["analyzed", "total", "unverifiedPrograms"] as const) {
      if (typeof cov[k] !== "number") e.push(`coverage.${k} phải là number`);
    }
    const a = cov["analyzed"] as number, t = cov["total"] as number;
    if (typeof a === "number" && typeof t === "number") {
      if (a > t) e.push(`coverage.analyzed (${a}) không được lớn hơn total (${t})`);
      if (a < 0 || t < 0) e.push("coverage không được âm");
    }
  }

  if (typeof o["explanation"] !== "string") e.push("explanation phải là string");

  // KHÔNG kiểm tra "safe thì coverage phải đầy đủ" ở đây.
  //
  // Luật đó từng có mặt, và nó SAI khi áp ở tầng này: `InspectResult` không
  // mang theo danh sách instruction, nên validator không biết phần chưa đọc
  // hiểu có chạm được vào tài sản người ký hay không. Đo trên mainnet cho thấy
  // coverage thấp là chuyện bình thường (trung bình 8%) — bắt buộc warning ở
  // đó là cảnh báo mọi giao dịch.
  //
  // Bất biến fail-safe được cưỡng chế ở L2, nơi có đủ dữ liệu, và có test riêng
  // trong packages/core/test/l2.test.ts.

  return e;
}

export function assertInspectResult(v: unknown, ten = "giá trị"): asserts v is InspectResult {
  const e = validateInspectResult(v);
  if (e.length) {
    const dong = [`${ten} không hợp lệ:`, ...e.map((m) => `  - ${m}`)];
    throw new Error(dong.join("\n"));
  }
}

export type { Level };

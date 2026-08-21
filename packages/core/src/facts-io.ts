import type { Facts } from "./facts.ts";

/**
 * Đóng băng và giải đóng băng `Facts`.
 *
 * Vì sao bộ dữ liệu lưu `Facts` chứ không chỉ lưu giao dịch:
 *
 *   Mô phỏng lại một giao dịch phụ thuộc trạng thái chuỗi TẠI THỜI ĐIỂM CHẠY.
 *   Chạy demo một lần là trạng thái đổi, và bộ test sẽ đỏ vì lý do chẳng liên
 *   quan gì tới luật. Đóng băng `Facts` — đầu ra của L1 — làm bộ test trở nên
 *   tất định, chạy được offline, và kiểm đúng thứ cần kiểm: engine luật.
 *
 *   Giao dịch gốc vẫn được lưu kèm để tra lại và để dựng lại `Facts` khi cần.
 *
 * `bigint` không đi qua JSON được, nên số dư lưu dưới dạng chuỗi.
 */

const doiSo = (v: unknown): unknown =>
  typeof v === "bigint" ? `${v}n` : v;

const doiNguoc = (v: unknown): unknown =>
  typeof v === "string" && /^-?\d+n$/.test(v) ? BigInt(v.slice(0, -1)) : v;

function duyet(x: unknown, bien: (v: unknown) => unknown): unknown {
  const y = bien(x);
  if (y !== x) return y;
  if (Array.isArray(x)) return x.map((i) => duyet(i, bien));
  if (x && typeof x === "object") {
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, duyet(v, bien)]));
  }
  return x;
}

export function dongBangFacts(f: Facts): string {
  return JSON.stringify(duyet(f, doiSo), null, 2);
}

export function giaiDongBangFacts(s: string): Facts {
  return duyet(JSON.parse(s), doiNguoc) as Facts;
}

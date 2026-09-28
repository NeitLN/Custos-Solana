import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { giaiDongBangFacts } from "../src/facts-io.ts";
import { danhGia } from "../src/l2/evaluate.ts";
import { MA_THONG_TIN } from "../src/constants.ts";

/*
 * BẤT BIẾN CỦA FACTS ĐÓNG BĂNG — tìm ra khi làm CK-10 (28/09).
 *
 * L1 hiện tại (`l1/fetch.ts`, mục "MÔ PHỎNG LỖI THÌ MẢNG `accounts` KHÔNG PHẢI DỮ LIỆU")
 * không bao giờ dựng trạng thái SAU khi mô phỏng hỏng: `accounts`, `tokenAccounts`,
 * `solDelta` rỗng, mọi account nằm trong `accountKhongDoDuoc`. Nhưng 9 Facts seed ghi TRƯỚC
 * bản sửa đó mang "số dư sau = 0" bịa ra — và luật 13 đọc thành "toàn bộ SOL rời ví":
 * 5 giao dịch mainnet LÀNH trong tập âm bị CÁO BUỘC mà không bài nào đỏ, vì kỳ vọng của
 * từng mẫu chỉ liệt kê vài mã cấm cụ thể.
 *
 * Hai bài dưới canh CẢ HAI tầng: dữ liệu đóng băng phải đúng bất biến của L1; và tập âm
 * không được mang cáo buộc nào ngoài mã đã khai (so cáo buộc THỪA, không chỉ mã cấm).
 */
type Mau = { id: string; cuc: string; kyVong: { coMa?: string[] } };
const IDX = JSON.parse(readFileSync("data/seed/index.json", "utf8")) as { mau: Mau[] };
const facts = (id: string) => giaiDongBangFacts(readFileSync(`data/seed/facts/${id}.json`, "utf8"));

test("mô phỏng HỎNG ⇒ Facts đóng băng KHÔNG có trạng thái sau (đúng bất biến của L1 hiện tại)", () => {
  const sai: string[] = [];
  for (const m of IDX.mau) {
    const f = facts(m.id);
    if (f.simulationOk) continue;
    const co = [
      f.accounts.length && `accounts ${f.accounts.length}`,
      f.tokenAccounts.length && `tokenAccounts ${f.tokenAccounts.length}`,
      Object.keys(f.solDelta).length && `solDelta ${Object.keys(f.solDelta).length}`,
    ].filter(Boolean);
    if (co.length) sai.push(`${m.id}: ${co.join(", ")}`);
  }
  assert.deepEqual(sai, [], "Facts mô phỏng hỏng mà vẫn có trạng thái sau — số bịa từ L1 cũ");
});

test("tập ÂM không mang cáo buộc nào ngoài mã đã khai — so cáo buộc THỪA", () => {
  const thua: string[] = [];
  for (const m of IDX.mau.filter((x) => x.cuc === "am")) {
    const cb = danhGia(facts(m.id)).reasonCodes.filter((c) => !MA_THONG_TIN.has(c) && !(m.kyVong.coMa ?? []).includes(c));
    if (cb.length) thua.push(`${m.id}: ${cb.join(",")}`);
  }
  assert.deepEqual(thua, []);
});

test("mô phỏng hỏng vẫn là Cần xem kỹ, không bao giờ An toàn — bỏ số bịa không được làm hạ mức", () => {
  for (const m of IDX.mau) {
    const f = facts(m.id);
    if (!f.simulationOk) assert.notEqual(danhGia(f).level, "safe", `${m.id}: mô phỏng hỏng mà An toàn`);
  }
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { tomTatNguonL3 } from "../../../scripts/ky-thuat/doChangTomTat.ts";

/*
 * Codex review lần 4, mục 1 — `do-chang.ts --ai` từng ghi "mô hình thật" cho MỌI lượt, kể cả khi
 * khoá bị từ chối hay provider lỗi: `dienGiaiBangMoHinh` nuốt lỗi và trả câu mẫu, nên thời gian
 * L3 của câu mẫu bị gán cho mô hình. Nhãn và số phải theo nguồn THẬT của từng lượt.
 */
test("AI bật mà có lượt lùi về câu mẫu ⇒ nhãn NÓI RA, và thời gian L3 mô hình chỉ tính lượt mô hình trả lời", () => {
  const t = tomTatNguonL3(true, [
    { nguonL3: "moHinh", l3: 2000 },
    { nguonL3: "moHinhBiChan", l3: 1800 },
    { nguonL3: "moHinhLoi", l3: 5 },
    { nguonL3: "moHinhQuaHan", l3: 8000 },
  ]);
  assert.deepEqual(t.demTheoNguon, { moHinh: 1, moHinhBiChan: 1, moHinhLoi: 1, moHinhQuaHan: 1 });
  // Lượt mô hình THẬT TRẢ LỜI (kể cả bị bộ soi lùi) — lỗi/quá hạn không phải thời gian của mô hình.
  assert.deepEqual(t.l3MoHinhTraLoi, [2000, 1800]);
  assert.match(t.nhan, /2\/4/);
  assert.match(t.nhan, /lỗi|quá hạn/);
});

test("AI tắt ⇒ nhãn câu mẫu; AI bật và mọi lượt mô hình trả lời ⇒ không cảnh báo", () => {
  assert.match(tomTatNguonL3(false, [{ nguonL3: "tatDinh", l3: 0 }]).nhan, /câu mẫu tất định/);
  const t = tomTatNguonL3(true, [{ nguonL3: "moHinh", l3: 1 }, { nguonL3: "moHinh", l3: 2 }]);
  assert.match(t.nhan, /mô hình thật/);
  assert.doesNotMatch(t.nhan, /lỗi|quá hạn|lùi/);
});

test("do-chang.ts dùng bộ theo dõi nguồn thật, không nhãn cứng", () => {
  const src = readFileSync("scripts/ky-thuat/do-chang.ts", "utf8");
  assert.ok(/theoDoiDienGiai\(/.test(src), "không theo dõi nguồn L3 của từng lượt");
  assert.ok(/tomTatNguonL3\(/.test(src));
  assert.doesNotMatch(src, /AI \? "mô hình thật \(claude-haiku/, "vẫn gắn nhãn 'mô hình thật' cứng");
});

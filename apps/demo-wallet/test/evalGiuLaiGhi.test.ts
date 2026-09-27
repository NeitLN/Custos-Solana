import { test } from "node:test";
import assert from "node:assert/strict";
import { giuLanDoThat } from "../../../scripts/giuLanDoThat.ts";

/*
 * Codex review lần 2, mục 9 — lượt chạy KHÔNG khoá của tập giữ lại (CK-08) từng ghi đè
 * `data/eval/giu-lai-ket-qua.json` bằng `moHinhThat: "chưa đo"`, xoá mất lượt đo mô hình
 * thật duy nhất (token, vi phạm, câu mẫu) — thứ tốn ngân sách API và không tái lập miễn phí.
 */

const lanThat = {
  doLuc: "2026-09-27T14:32:57.596Z",
  moHinh: "claude-haiku-4-5-20251001",
  promptHash: "p1",
  guardHash: "g1",
  token: { vao: 8422, ra: 2140 },
  moHinhThat: { tomTat: { soCa: 12, daRaViPham: 0 }, chiTiet: [{ id: "x" }] },
};
const lanOffline = {
  doLuc: "2026-09-28T00:00:00.000Z",
  moHinh: null,
  promptHash: "p1",
  guardHash: "g2",
  token: null,
  moHinhThat: { tomTat: "chưa đo — không có khoá", chiTiet: null },
};

test("lượt OFFLINE giữ nguyên lượt đo mô hình thật trước đó, kèm hash lúc đo", () => {
  const ra = giuLanDoThat(lanThat, lanOffline, false);
  const g = ra["liveGanNhat"] as Record<string, unknown>;
  assert.ok(g, "lượt offline xoá mất lượt đo thật");
  assert.deepEqual(g["moHinhThat"], lanThat.moHinhThat);
  assert.deepEqual(g["token"], lanThat.token);
  assert.equal(g["doLuc"], lanThat.doLuc);
  // Bộ chắn đã đổi từ lúc đo: phải NÓI RA, không để người đọc tưởng số cũ đo trên bộ chắn mới.
  assert.equal(g["guardHash"], "g1");
  assert.match(String(ra["luuY"] ?? ""), /bộ chắn|guard/i);
});

test("lượt OFFLINE đọc được cả tệp cũ chưa có `liveGanNhat` (định dạng trước bản sửa)", () => {
  const ra = giuLanDoThat(lanThat, lanOffline, false);
  assert.equal((ra["liveGanNhat"] as Record<string, unknown>)["moHinh"], "claude-haiku-4-5-20251001");
  // Tệp mới đã có liveGanNhat ⇒ lượt offline kế tiếp vẫn giữ nó.
  const lan2 = giuLanDoThat(ra, lanOffline, false);
  assert.deepEqual(lan2["liveGanNhat"], ra["liveGanNhat"]);
});

test("lượt THẬT thay lượt đo cũ; không có lượt thật nào thì không bịa", () => {
  const moi = { ...lanThat, doLuc: "2026-09-29T00:00:00.000Z", token: { vao: 1, ra: 1 } };
  assert.equal((giuLanDoThat(lanThat, moi, true)["liveGanNhat"] as Record<string, unknown>)["doLuc"], moi.doLuc);
  assert.equal(giuLanDoThat(null, lanOffline, false)["liveGanNhat"], null);
  assert.equal(giuLanDoThat(lanOffline, lanOffline, false)["liveGanNhat"], null);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import type { InspectResult, DiffEntry } from "@custos/types";
import { tomTat } from "../src/index.ts";
import { NHAN } from "@custos/core";

/**
 * MỨC 1 — NGẮN.
 *
 * `DAC-TA-L3.md` mục 7 đo mức độ hiểu của người dùng **bằng chính màn hình này**:
 * chiếu lên, không giải thích gì thêm, hỏi "nếu bạn bấm ký thì chuyện gì xảy ra".
 * Con số đó lên sân khấu. Nên câu ở đây phải nói được hậu quả trong một hơi thở.
 */

const kq = (p: Partial<InspectResult> = {}): InspectResult => ({
  level: "danger", aiAdvisory: null, detectedPrimaryAction: null,
  diff: [], reasonCodes: [], explanation: "",
  coverage: { analyzed: 3, total: 3, unverifiedPrograms: 0 }, ...p,
});
const d = (label: string, before: string, after: string, severity = "danger"): DiffEntry =>
  ({ label, before, after, severity });

test("NGẮN · mất sạch số dư ⇒ nói ngay ra hậu quả", () => {
  const c = tomTat(kq({ diff: [d(`${NHAN.SO_DU}USDC-demo sau khi ký`, "500,0", "0,0")] }));
  assert.match(c, /Toàn bộ USDC-demo/);
  assert.match(c, /không lấy lại được/);
  assert.ok(c.length < 160, `mức Ngắn mà dài ${c.length} ký tự thì không còn là mức Ngắn`);
});

test("NGẮN · đổi chủ tài khoản ⇒ nói bằng chữ người thường hiểu", () => {
  const c = tomTat(kq({ diff: [d(`${NHAN.CHU_SO_HUU}USDC-demo`, "Bạn", "CRZa…picz")] }));
  assert.match(c, /đổi chủ sang CRZa…picz/);
  // Không được lộ tên cơ chế — người dùng không cần biết SetAuthority là gì.
  assert.ok(!/SetAuthority|authority|instruction/i.test(c), c);
});

test("NGẮN · vừa mất tiền vừa đổi chủ ⇒ gộp thành MỘT câu", () => {
  const c = tomTat(
    kq({
      diff: [
        d(`${NHAN.SO_DU}USDC-demo sau khi ký`, "500,0", "0,0"),
        d(`${NHAN.CHU_SO_HUU}USDC-demo`, "Bạn", "CRZa…picz"),
      ],
    }),
  );
  assert.match(c, /Toàn bộ USDC-demo/);
  assert.match(c, /đổi chủ/);
  assert.equal(c.split(". ").length, 2, "một câu hậu quả + một câu chốt, không hơn");
});

test("NGẮN · TUYỆT ĐỐI không nói 'an toàn', kể cả khi safe", () => {
  // Quyết định đã khoá: nhãn là "Bình thường", không bao giờ là "an toàn".
  for (const lv of ["safe", "warning", "danger"] as const) {
    const c = tomTat(kq({ level: lv }));
    assert.ok(!/an toàn/i.test(c), `mức ${lv} nói "an toàn": ${c}`);
    assert.ok(!c.includes("!"), "không dấu chấm than");
  }
});

test("NGẮN · chưa đọc hiểu hết ⇒ nói ra, không trấn an", () => {
  const c = tomTat(kq({ level: "warning", coverage: { analyzed: 2, total: 5, unverifiedPrograms: 1 } }));
  assert.match(c, /chưa đọc hiểu/);
  assert.match(c, /3 phần/, "phải nói rõ còn bao nhiêu phần chưa hiểu");
});

test("NGẮN · KHÔNG tự tính lại số — mọi con số lấy nguyên từ bảng chênh lệch", () => {
  // Mức Ngắn nói một đằng còn bảng hiện một nẻo là cách nhanh nhất mất lòng tin.
  const c = tomTat(kq({ diff: [d(`${NHAN.SO_DU}USDC sau khi ký`, "1.234,5", "12,0")] }));
  assert.ok(c.includes("1.234,5") && c.includes("12,0"), c);
});

test("NGẮN · dòng thông tin KHÔNG được lọt vào", () => {
  // Phí mạng và dòng "chưa đọc được" không phải hậu quả của việc ký.
  const c = tomTat(
    kq({
      level: "warning",
      coverage: { analyzed: 3, total: 3, unverifiedPrograms: 0 },
      diff: [d(NHAN.PHI, "0", "−0,000005 SOL", "info"), d(NHAN.CHUA_DOC, "—", "2 tài khoản", "warning")],
    }),
  );
  assert.ok(!c.includes("Phí mạng"), c);
});

test("NGẮN · phần lớn SOL rời ví ⇒ nói theo đúng quy ước số dư của bảng", () => {
  // Bảng dùng quy ước `số dư → số dư`. Mức Ngắn phải nói cùng con số đó, để
  // người đọc đối chiếu được ngay — không tự suy ngược ra mức thay đổi.
  const c = tomTat(kq({ diff: [d(NHAN.SO_DU_SOL, "5,0", "0,1")] }));
  assert.ok(c.includes("5,0") && c.includes("0,1"), `phải nêu cả trước lẫn sau: ${c}`);
});

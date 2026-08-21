import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateInspectResult } from "../src/validate.ts";

const doc = (ten: string) =>
  JSON.parse(readFileSync(new URL(`../../../data/mocks/${ten}.json`, import.meta.url), "utf8"));

for (const ten of ["mock-danger", "mock-warning", "mock-safe"]) {
  test(`${ten} đúng hợp đồng InspectResult`, () => {
    assert.deepEqual(validateInspectResult(doc(ten)), []);
  });
}

test("validator BẮT ĐƯỢC lỗi — level sai", () => {
  const xau = { ...doc("mock-safe"), level: "an toàn" };
  assert.ok(validateInspectResult(xau).some((m) => m.includes("level phải là")));
});

test("validator BẮT ĐƯỢC coverage vô lý", () => {
  const xau = { ...doc("mock-safe"), coverage: { analyzed: 12, total: 11, unverifiedPrograms: 0 } };
  assert.ok(validateInspectResult(xau).some((m) => m.includes("không được lớn hơn")));
});

test("validator KHÔNG chặn safe với coverage khuyết", () => {
  // Đây là hành vi ĐÚNG, không phải lỗ hổng. Giao dịch mainnet thường gọi
  // nhiều chương trình ta không decode; nếu phần đó không chạm được vào tài
  // sản người ký thì nó không làm giao dịch nguy hiểm hơn. Quyết định đó thuộc
  // về L2 — nơi có danh sách instruction — chứ không phải validator.
  const hopLe = { ...doc("mock-safe"), coverage: { analyzed: 2, total: 11, unverifiedPrograms: 3 } };
  assert.deepEqual(validateInspectResult(hopLe), []);
});

test("validator BẮT ĐƯỢC aiAdvisory sai", () => {
  const xau = { ...doc("mock-danger"), aiAdvisory: "nguy hiểm" };
  assert.ok(validateInspectResult(xau).some((m) => m.includes("aiAdvisory")));
});

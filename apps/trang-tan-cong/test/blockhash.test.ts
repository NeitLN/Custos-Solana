import { test } from "node:test";
import assert from "node:assert/strict";
import { conDungDuoc, TUOI_TOI_DA_MS } from "../src/blockhash.ts";

const BAY_GIO = 1_000_000;

test("blockhash vừa lấy thì dùng được", () => {
  assert.equal(conDungDuoc(BAY_GIO - 1_000, BAY_GIO), true);
});

test("blockhash quá 45 giây thì KHÔNG dùng nữa", () => {
  // Đây là ca mà `setInterval` không cứu được: tab chạy nền bị bóp timer, nên cache
  // già hơn nhiều so với chu kỳ làm mới.
  assert.equal(conDungDuoc(BAY_GIO - 46_000, BAY_GIO), false);
  assert.equal(conDungDuoc(BAY_GIO - 5 * 60_000, BAY_GIO), false);
});

test("đúng mốc 45 giây thì đã hết hạn", () => {
  assert.equal(conDungDuoc(BAY_GIO - TUOI_TOI_DA_MS, BAY_GIO), false);
  assert.equal(conDungDuoc(BAY_GIO - (TUOI_TOI_DA_MS - 1), BAY_GIO), true);
});

test("đồng hồ bị chỉnh lùi thì không tin cache", () => {
  assert.equal(conDungDuoc(BAY_GIO + 10_000, BAY_GIO), false);
});

test("hạn nằm dưới đời sống thật của blockhash (~60 giây)", () => {
  // Canh chính con số: ai nới nó lên quá 60 s là đang tiến vào vùng blockhash chết.
  assert.ok(TUOI_TOI_DA_MS < 60_000, `TUOI_TOI_DA_MS=${TUOI_TOI_DA_MS} đã chạm hạn sống thật`);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { moTaLoiLive } from "../src/live/loiRpc.ts";

// Chuỗi THẬT từ nghiệm thu live 27/09 (lượt 2), không dựng tay.
const THAT_429 =
  'failed to get info about account ChupAFymmifSvVqCcYmJEDcrvwaKnf1ufXjoFtm6dpv1: Error: 429 : {"jsonrpc":"2.0","error":{"code":-32029,"message":"Too Many Requests, Please apply an OnFinality API key or contact us to receive a higher rate limit"},"id":"ed00aad9"}';
const THAT_TREO = "failed to get info about account B4gdq5QCogKaafTNBWFVvp8NuR9JVVPYgyBuC5ZmxMYn: TimeoutError: signal timed out";

test("429 của nhà cung cấp ⇒ câu người đọc được, giữ mã 429, không mang JSON gốc", () => {
  const m = moTaLoiLive(THAT_429);
  assert.match(m, /429/);
  assert.doesNotMatch(m, /jsonrpc|OnFinality|-32029/);
});

test("đọc tài khoản quá hạn ⇒ nói quá hạn, KHÁC với 429", () => {
  const m = moTaLoiLive(THAT_TREO);
  assert.match(m, /quá hạn/);
  assert.doesNotMatch(m, /429/);
});

test("KHÔNG khẳng định chưa gửi gì — lỗi đọc có thể đến sau khi đã gửi", () => {
  for (const m of [moTaLoiLive(THAT_429), moTaLoiLive(THAT_TREO)]) assert.doesNotMatch(m, /chưa (có gì|gửi)/i);
});

test("lỗi khác giữ nguyên nghĩa nhưng bỏ URL endpoint (có thể mang khoá)", () => {
  const m = moTaLoiLive("Ví này đang được thao tác trong tab khác. https://x.example/?api-key=BI-MAT");
  assert.match(m, /tab khác/);
  assert.doesNotMatch(m, /BI-MAT|https?:/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/*
 * Ví cần bảo vệ và máy chủ RPC là ĐẦU VÀO của lượt kiểm (Codex review 09/10, P2). Đổi một trong
 * hai mà kết quả cũ — hay lượt đang bay — vẫn hiện là cho người xem đọc kết quả của tham số khác.
 * Kiểm trình duyệt 09/10: đổi ví / RPC ⇒ thẻ kết quả biến mất, 0 pageerror.
 */
const s = readFileSync("apps/demo-wallet/src/Inspector.tsx", "utf8");

test("Inspector: đổi ví hoặc RPC đi qua doiThamSo — bỏ kết quả và cắt request đang chạy", () => {
  assert.match(s, /onChange=\{\(e\) => doiThamSo\(\(\) => setVi\(e\.target\.value\)\)\}/);
  assert.match(s, /onChange=\{\(e\) => doiThamSo\(\(\) => setRpc\(e\.target\.value\)\)\}/);
  const than = s.slice(s.indexOf("const doiThamSo"), s.indexOf("}, []);", s.indexOf("const doiThamSo")));
  assert.match(than, /luot\.current\+\+/, "phải vô hiệu lượt đang bay");
  assert.match(than, /boHuy\.current\?\.huy\(\)/, "phải cắt request, không chỉ bỏ kết quả");
  assert.match(than, /setTt\(\{ pha: "rong" \}\)/, "phải xoá kết quả cũ");
});

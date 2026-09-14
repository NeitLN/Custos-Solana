import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const pkg = () => JSON.parse(doc("package.json")) as { overrides?: Record<string, string> };
const loHong = () =>
  JSON.parse(doc("data/seed/lo-hong.json")) as {
    tong: number;
    theoMucDo: Record<string, number>;
    goi: Array<{ ten: string; mucDo: string }>;
  };

/**
 * TB-S03 — `overrides` LÀ MỘT BẢN VÁ, KHÔNG PHẢI MỘT TUỲ CHỈNH.
 *
 * Sáu advisory biến mất vì hai dòng trong `package.json`. Ai đó dọn dẹp file đó, hoặc
 * một lần `npm install` với lockfile khác, là sáu advisory quay lại — im lặng, vì
 * không có gì trong mã nguồn thay đổi.
 *
 * Đó là loại hồi quy không ai nhìn thấy: test vẫn xanh, build vẫn chạy, chỉ có
 * `npm audit` đổi số và không ai chạy `npm audit` mỗi ngày.
 */

test("`overrides` cho uuid và stream-json còn nguyên", () => {
  const o = pkg().overrides ?? {};
  assert.ok(o["uuid"], "mất override `uuid` — 3 advisory moderate sẽ quay lại");
  assert.ok(o["stream-json"], "mất override `stream-json` — advisory moderate sẽ quay lại");
});

test("override dùng dải MỞ, không dùng `^`", () => {
  /*
   * ĐÂY LÀ BÀI ĐÁNG GIÁ NHẤT FILE, và nó đến từ một lỗi thật của phiên này.
   *
   * Bản đầu viết `"uuid": "^11.1.1"`. `rpc-websockets` vốn đã dùng `uuid@14.0.2` —
   * bản sạch, ngoài dải bị ảnh hưởng — và `^11.1.1` **ép nó xuống** 11.x. `npm ls`
   * báo `invalid: uuid@14.0.2`, tức cây phụ thuộc không còn hợp lệ.
   *
   * Một "bản vá" hạ cấp nhánh vốn an toàn thì không phải bản vá. Dải mở `>=11.1.1`
   * chỉ nâng nhánh cũ (`jayson` → 8.3.2) và để yên nhánh đã sạch.
   */
  const o = pkg().overrides ?? {};
  for (const g of ["uuid", "stream-json"]) {
    const v = o[g] ?? "";
    assert.ok(
      v.startsWith(">="),
      `override \`${g}\` = "${v}" — phải là dải mở \`>=\`. ` +
        "`^` ép nhánh đã dùng bản mới hơn xuống, làm cây phụ thuộc không hợp lệ.",
    );
  }
});

test("số advisory trong `lo-hong.json` khớp thực tế sau khi vá", () => {
  /*
   * Bài này KHÔNG gõ cứng số 5 — nó đọc từ artifact, vì `npm audit` đổi khi thượng
   * nguồn công bố CVE mới. Thứ nó canh là tính nhất quán: `tong` phải bằng tổng các
   * mức, và danh sách gói phải đúng độ dài.
   */
  const lh = loHong();
  const tong = Object.values(lh.theoMucDo).reduce((a, b) => a + b, 0);
  assert.equal(lh.tong, tong, "`tong` không khớp tổng `theoMucDo`");
  assert.equal(lh.goi.length, lh.tong, "số gói không khớp `tong`");
});

test("KHÔNG còn advisory moderate nào — sáu cái đó đã vá thật", () => {
  /*
   * Nếu moderate quay lại, hoặc override bị tháo, hoặc thượng nguồn có CVE mới. Cả
   * hai đều đáng dừng lại xem, và cả hai đều không có dấu hiệu nào khác.
   */
  const lh = loHong();
  assert.equal(
    lh.theoMucDo["moderate"] ?? 0,
    0,
    "moderate quay lại — kiểm `overrides` trong package.json trước, rồi tới CVE mới",
  );
});

test("năm advisory còn lại đều được ghi là CHƯA vá, không phải đã vá", () => {
  /*
   * Áp lực trôi ở đây đi một chiều rõ rệt: sau khi xoá 6/11, rất dễ viết thành "đã
   * xử lý xong lỗ hổng phụ thuộc". Năm cái còn lại đều **high**, và một trong số đó
   * (`bigint-buffer`) nằm **trong bundle trình duyệt**.
   */
  const s = doc("docs/PHU-THUOC.md");
  assert.match(s, /\*\*năm\*\* còn lại \*\*chưa\*\* được vá|năm.*chưa.*được vá/i);
  assert.match(
    s,
    /Không nói.*đã hết moderate nên an toàn hơn/i,
    "phải chặn cách đọc 'xoá moderate = an toàn hơn'",
  );
});

test("`PHU-THUOC.md` không quay lại câu 'cả 11 chưa có bản vá'", () => {
  /*
   * Câu cũ: *"chờ bản vá không phải một kế hoạch"*, áp cho cả 11 advisory. Nó **đúng
   * với 5 high, sai với 6 moderate** — và cái sai đó khiến trang này bỏ lỡ một bản
   * vá có thật suốt năm ngày.
   *
   * Chỉ cấm ở dạng KHẲNG ĐỊNH: trang này có trích lại câu cũ để giải thích vì sao nó
   * sai, và một phép kiểm theo chuỗi không phân biệt được hai điều đó — lỗi đã mắc
   * bốn lần trong repo.
   */
  const dong = doc("docs/PHU-THUOC.md")
    .split("\n")
    .filter((d) => /Cả hai advisory high đều KHÔNG có bản đã vá|chờ bản vá không phải/i.test(d));
  for (const d of dong) {
    assert.ok(
      d.trimStart().startsWith(">") || /high/i.test(d) || /chỉ đúng một nửa|sai với/i.test(d),
      `câu này chỉ được dùng cho nhóm HIGH, hoặc trong ghi chú giải thích: ${d.trim()}`,
    );
  }
});

test("phân loại runtime vẫn nêu `bigint-buffer` có trong bundle", () => {
  // Advisory high nguy hiểm nhất, và là lý do không được nói "rủi ro bằng không".
  const s = doc("docs/PHU-THUOC.md");
  assert.match(s, /bigint-buffer/);
  assert.match(s, /trong bundle|CÓ.*bundle/i);
});

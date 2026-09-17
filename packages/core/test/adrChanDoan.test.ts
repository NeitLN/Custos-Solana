import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const ADR = "docs/adr/0002-chan-doan-tuy-chon.md";

/**
 * TB-X01 — ADR-0002 PHẢI KHỚP MÃ, KHÔNG KỂ LẠI.
 *
 * Thẻ đòi *"ADR ghi vì sao chọn cách đó, impact bundle và compatibility"*. Ba thứ đó
 * đều là **số hoặc quyết định kiểm được**, và cả ba đều trôi theo cách riêng:
 *
 *   · quyết định trôi khi ai đó thêm một entrypoint riêng "cho tiện";
 *   · impact bundle trôi mỗi lần build lại;
 *   · compatibility trôi khi trường tuỳ chọn thành bắt buộc.
 *
 * Bài này neo ADR vào mã, không vào trí nhớ.
 */

test("ADR-0002 còn đó và khai đúng thẻ", () => {
  assert.ok(existsSync(join(GOC, ADR)), `thiếu ${ADR}`);
  const s = doc(ADR);
  assert.match(s, /TB-X01/, "ADR không khai thuộc thẻ nào");
  assert.match(s, /^# ADR-0002 ·/m, "thiếu tiêu đề ADR");
});

test("quyết định trong ADR khớp MÃ: trường tuỳ chọn, KHÔNG entrypoint riêng", () => {
  /*
   * ADR nói chọn trường tuỳ chọn thay vì `inspectChanDoan()`. Nếu ai đó thêm
   * entrypoint riêng sau này mà quên sửa ADR, trang này thành mô tả một kiến trúc
   * không còn tồn tại.
   */
  const s = doc(ADR);
  assert.match(s, /trường tuỳ chọn/i, "ADR không nêu quyết định");

  const t = doc("packages/types/src/index.ts");
  assert.match(t, /chanDoan\?: ChanDoan;/, "`chanDoan` phải là trường TUỲ CHỌN");
  assert.match(t, /chanDoan\?: boolean;/, "cờ bật phải TUỲ CHỌN");

  // Và không có entrypoint thứ hai — đúng điều ADR nói là đã từ chối.
  const core = doc("packages/core/src/index.ts");
  assert.ok(
    !/inspectChanDoan|inspectDiagnostic/.test(core),
    "có entrypoint chẩn đoán riêng — ADR-0002 nói đã chọn cách khác",
  );
});

test("số impact bundle trong ADR là số ĐO ĐƯỢC, có cả trước lẫn sau", () => {
  /*
   * Một ADR ghi "bundle tăng không đáng kể" là một ADR không kiểm được. Thẻ đòi
   * impact bundle, nên phải có hai con số và phần chênh.
   */
  const s = doc(ADR);
  assert.match(s, /352\.482 byte/, "thiếu số bundle TRƯỚC");
  assert.match(s, /353\.254 byte/, "thiếu số bundle SAU");
  assert.match(s, /\+772 byte/, "thiếu phần chênh lệch");
  assert.match(s, /0,22 ?%/, "thiếu tỉ lệ — 772 byte trần không nói được nhiều hay ít");
});

test("ADR nói rõ consumer KHÔNG bật vẫn trả giá bundle đó", () => {
  /*
   * Đây là vế bất lợi của quyết định, và là vế dễ bị cắt nhất khi ai đó muốn ADR gọn
   * hơn. Trường tuỳ chọn không có nghĩa chi phí tuỳ chọn: mã hiển thị vẫn nằm trong
   * bundle dù người dùng không xin.
   */
  const s = doc(ADR);
  assert.match(
    s,
    /không bật.{0,40}vẫn trả giá|vẫn trả giá 772 byte/i,
    "ADR giấu mất chi phí mà consumer không bật vẫn phải chịu",
  );
});

test("nghiệm thu trong ADR khớp bài kiểm thật", () => {
  /*
   * ADR chép lại kết quả đo "RPC=6, verdict giống nhau". Con số đó phải có một bài
   * kiểm đứng sau, nếu không nó là ảnh chụp một lần chạy rồi đóng băng.
   */
  /*
   * NEO VÀO KHỐI ĐO, không quét cả trang — lỗi đã đo được ngay trong bài này.
   *
   * Bản đầu viết `assert.match(s, /RPC=6/)`. Mutation đổi dòng "TẮT : … RPC=6" thành
   * "RPC=nhieu" mà bài **vẫn xanh**: dòng "BẬT : … RPC=6" ngay dưới vẫn khớp. Hai
   * dòng đáng ra bổ trợ nhau lại thành hai chỗ đỡ cho nhau.
   *
   * Cả hai dòng đều phải mang con số — chúng là hai nửa của cùng một phép so.
   */
  const s = doc(ADR);
  assert.match(s, /TẮT : .*RPC=6/, "dòng TẮT không ghi số lượt RPC đo được");
  assert.match(s, /BẬT : .*RPC=6/, "dòng BẬT không ghi số lượt RPC đo được");
  assert.match(s, /từng method/i, "ADR không nói rõ đếm từng method, không chỉ tổng");

  const g = doc("packages/core/test/chanDoanX01.test.ts");
  assert.match(g, /KHÔNG thêm một lượt RPC nào/, "mất bài kiểm số lượt RPC");
  assert.match(g, /assert\.deepEqual\(b\.dem, a\.dem/, "bài kiểm phải so TỪNG method");
});

test("ADR tự khai đúng số luật có bằng chứng, và con số khớp mã", () => {
  /*
   * Áp lực trôi một chiều: "đã có trace đầy đủ" nghe tốt hơn một phân số. Nhưng
   * `thieuBangChung` đếm ra phần còn lại mỗi lượt chạy, nên giấu nó trong ADR sẽ tạo
   * mâu thuẫn giữa tài liệu và đầu ra.
   *
   * NEO VÀO MỤC 6, không quét cả trang: phân số xuất hiện ở hai mục, và mutation đổi
   * riêng mục 6 vẫn xanh nếu mục 3 còn chuỗi khớp. Đây là ô tự khai giới hạn — nó
   * phải đứng được một mình.
   *
   * ── CU-05 đổi con số, nên bài này thôi gắn cứng ──────────────────────────────
   *
   * Bản trước đòi đúng chuỗi `Mới 2/14` và `soKhai === 2`. CU-05 nâng lên 13/14 và
   * bài đỏ — đỏ ĐÚNG, vì ADR lúc đó còn ghi số cũ.
   *
   * Nhưng gắn cứng một con số nghĩa là mỗi lần gắn thêm bằng chứng lại phải sửa tay
   * ở hai nơi, và lần nào quên thì bài đỏ vì lý do sai. Bất biến thật không phải
   * "con số bằng 2" mà là **ADR nói đúng thứ mã đang làm**. Nên bài này ĐẾM từ mã
   * rồi đòi ADR chứa đúng con số đó.
   */
  const s = doc(ADR);
  const i = s.indexOf("## 6 · Điều ADR này KHÔNG làm");
  assert.ok(i > 0, "mất mục 6 — nơi ADR tự khai giới hạn");
  const muc6 = s.slice(i);

  /*
   * Đếm LUẬT, không đếm lần xuất hiện của `bangChung: [`.
   *
   * Một luật có thể khai ở hai nhánh hit khác nhau — luật 4 làm đúng thế. Đếm chuỗi
   * sẽ cho 15 trong khi chỉ có 13 luật, và ADR sẽ bị ép ghi một con số vô nghĩa.
   */
  const rules = doc("packages/core/src/l2/rules.ts");
  const khoi = rules.split(/(?=^export const luat\d+: Rule = \{$)/m);
  const luat = khoi.filter((k) => /^export const luat\d+/.test(k));
  const soKhai = luat.filter((k) => k.includes("bangChung: [")).length;
  const tong = luat.length;
  assert.ok(tong > 0, "không tìm thấy luật nào trong rules.ts");

  assert.ok(
    muc6.includes(`${soKhai}/${tong}`),
    `mã có ${soKhai}/${tong} luật khai bằng chứng, mục 6 của ADR không nói con số đó`,
  );
  assert.match(
    muc6,
    /chưa có bằng chứng truy vết chi tiết/,
    "mục 6 không nêu cách xử lý cảnh báo chưa truy vết được",
  );
});

test("số test trong ADR-0002 khớp phép đo hiện tại, không phải ảnh chụp cũ", () => {
  /*
   * ADR ghi "Bộ test: N pass" trong bảng tương thích. Con số đó trôi mỗi lần thêm
   * bài — và trôi im lặng, vì không ai đối chiếu một dòng trong ADR với `so-lieu.json`.
   *
   * Đã xảy ra: ADR viết `654` trong khi phép đo cho `661`. Nên số này phải vào script
   * đồng bộ (`dong-bo-so-tai-lieu.mjs`) như mọi con số công bố khác, và bài này canh
   * việc đồng bộ đã chạy.
   */
  const S = JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as {
    test: { pass: number };
  };
  assert.match(
    doc(ADR),
    new RegExp(`\\*\\*${S.test.pass} pass, 0 fail\\*\\*`),
    `ADR-0002 không ghi ${S.test.pass} pass — chạy \`node scripts/dong-bo-so-tai-lieu.mjs\``,
  );
});

test("ADR KHÔNG hứa những thứ thẻ nói không cần", () => {
  // Thẻ: "Không cần xây trình debugger tổng quát." Một ADR hứa quá phạm vi sẽ thành
  // món nợ mà không ai nhớ đã vay.
  const s = doc(ADR);
  assert.match(s, /KHÔNG xây trình debugger tổng quát|Không cần xây trình debugger/i);
  assert.match(s, /Không đổi `level`|không đổi một bit nào của kết luận/i);
});

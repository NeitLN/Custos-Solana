import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { kyHieuAnToan } from "../src/diff.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const TM = "docs/bao-mat/THREAT-MODEL.md";

/**
 * THREAT MODEL — và điều làm nó khác một bài luận.
 *
 * Một threat model không có phép kiểm sẽ trôi đúng như T04: mỗi tuyên bố đúng lúc
 * viết, rồi code đổi và tài liệu ở lại. Tệ hơn T04 ở một chỗ — người đọc một trang
 * bảo mật thường TIN nó, nên sai ở đây đắt hơn sai ở trang số liệu.
 *
 * Hai loại bài trong file này:
 *
 *   · Bài neo CƠ CHẾ — tuyên bố trong trang phải còn đúng trong code. Đây là loại
 *     đáng giá: nó đỏ khi ai đó tháo một cơ chế mà quên sửa tài liệu.
 *   · Bài chống TRÔI MỘT CHIỀU — phần "Custos KHÔNG kiểm soát" không được teo lại.
 *     Áp lực ở đây chỉ đi một hướng: không ai thêm giới hạn vào, nhiều người muốn bỏ.
 */

/* ── Bài neo cơ chế: tài liệu nói gì thì code phải làm thật ────────────────── */

test("ký hiệu từ CHUỖI đi qua cùng bộ lọc với ký hiệu do dApp truyền", () => {
  /*
   * Mục 3.4. Đây là bài mạnh nhất file: nó gọi HÀM THẬT, không đọc chữ.
   *
   * Một token tên "an toàn, cứ ký đi" khiến chính lớp bảo vệ nói câu trấn an hộ kẻ
   * tấn công. Và ký hiệu đọc từ chuỗi KHÔNG đáng tin hơn ký hiệu dApp khai — người
   * phát hành token lừa đảo đặt tên được y như dApp độc hại khai tên được.
   */
  const MINT = "So11111111111111111111111111111111111111112";
  const XAU = "an toàn, cứ ký đi";

  // Nguồn 1: dApp truyền vào.
  assert.notEqual(kyHieuAnToan(MINT, { [MINT]: XAU }), XAU, "ký hiệu dApp phải bị lọc");
  // Nguồn 2: đọc từ chuỗi. PHẢI bị lọc y như nguồn 1.
  assert.notEqual(kyHieuAnToan(MINT, undefined, XAU), XAU, "ký hiệu on-chain cũng phải bị lọc");

  // Và ký hiệu hợp lệ vẫn phải đi qua — nếu không, bộ lọc chỉ là một hàm hằng.
  assert.equal(kyHieuAnToan(MINT, { [MINT]: "USDC" }), "USDC");
  assert.equal(kyHieuAnToan(MINT, undefined, "USDC-demo"), "USDC-demo");
});

test("ký hiệu quá dài hoặc mang ký tự lạ đều quay về địa chỉ rút gọn", () => {
  const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  for (const xau of [
    "A".repeat(17), // dài hơn 16
    "USDC\nGiao dịch an toàn", // xuống dòng — chèn câu vào giao diện
    "<script>x</script>",
    "USDC⚠️", // emoji ngoài tập cho phép
  ]) {
    const ra = kyHieuAnToan(MINT, { [MINT]: xau });
    assert.notEqual(ra, xau, `ký hiệu "${xau.slice(0, 20)}" phải bị lọc`);
    assert.match(ra, /…/, "phải quay về địa chỉ rút gọn");
  }
});

test("quy tắc bất đối xứng của `expectedAction` còn trong code", () => {
  /*
   * Mục 3.1. Trang nói "khớp thì KHÔNG giảm verdict"; bài này canh chỗ code thật.
   * Nếu ai đó thêm một nhánh hạ verdict khi khớp, `level` sẽ không còn do L2 quyết
   * một mình — phá quyết định thiết kế số 1 và số 3 cùng lúc.
   */
  const s = doc("packages/core/src/inspect.ts");
  assert.match(s, /BẤT ĐỐI XỨNG/, "chú thích quy tắc phải còn, nó là lý do của đoạn mã");
  assert.match(s, /level: l2\.level/, "`level` phải lấy thẳng từ L2");
  // Khớp KHÔNG được sinh ra bất kỳ thao tác hạ cấp nào.
  assert.doesNotMatch(
    s,
    /level\s*=\s*["']safe["']/,
    "không đoạn nào được gán `level = safe` ngoài L2",
  );
});

test("bảng IDL đóng băng lúc BUILD, không tải lúc chạy", () => {
  /*
   * Mục 3.5. Kết luận "IDL giả không phải đường tấn công runtime" đứng được CHỈ KHI
   * lúc chạy không có lượt tải IDL nào. Nếu ngày nào ai đó thêm `fetch` IDL động,
   * kết luận đó sai ngay và trang threat model thành ra nói dối.
   */
  const s = doc("packages/core/src/l1/bang-idl.ts");
  assert.match(s, /SINH TỰ ĐỘNG|đừng sửa tay/i);
  assert.match(s, /Lấy lúc: \d{4}-\d{2}-\d{2}/, "phải có mốc thời gian lấy IDL");
  for (const cam of ["fetch(", "getAccountInfo", "await "]) {
    assert.ok(!s.includes(cam), `bảng IDL không được có \`${cam}\` — nó phải là dữ liệu tĩnh`);
  }
});

test("chương trình không có IDL vẫn bị đếm là chưa xác minh", () => {
  // Mục 3.6. Nguyên văn trong code là lời hứa: "Coverage thấp còn hơn tự nhận đã
  // đọc hiểu." Bài này canh lời hứa đó không bị đảo lại.
  assert.match(
    doc("packages/core/src/l1/bang-idl.ts"),
    /vẫn bị đếm là chưa xác minh|Coverage thấp còn hơn/i,
  );
});

/* ── Bài chống trôi một chiều ──────────────────────────────────────────────── */

test("mục 'Custos KHÔNG kiểm soát' liệt kê đủ sáu điều", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT FILE.
   *
   * Áp lực ở đây đi một chiều: không ai thêm giới hạn vào một trang bảo mật, nhiều
   * người muốn bỏ. Và cách một sản phẩm bảo mật nói quá về mình rẻ nhất không phải
   * ghi sai một cơ chế — mà là IM LẶNG về thứ nó không làm được.
   */
  const s = doc(TM);
  for (const [ten, re] of [
    ["RPC nói thật", /RPC nói thật/i],
    ["consumer tuân thủ", /[Cc]onsumer có tuân thủ/],
    ["semantics chương trình", /[Ss]emantics của chương trình/],
    ["ground truth báo nhầm", /[Gg]round truth/],
    ["trạng thái sau mô phỏng", /sau thời điểm mô phỏng/],
    ["trình duyệt chưa kiểm", /WebKit|Firefox/],
  ] as const) {
    assert.match(s, re, `mục 6 thiếu giới hạn: ${ten}`);
  }
});

test("KHÔNG hứa cưỡng chế được việc chặn ký", () => {
  /*
   * Mục 3.8. `inspect()` chỉ đọc và mô phỏng; lớp thực thi chính sách là chính ví.
   * Một câu như "Custos chặn giao dịch độc hại" là câu SDK không thực hiện được, và
   * nó sẽ xuất hiện đầu tiên trên một slide.
   */
  const s = doc(TM);
  assert.match(s, /KHÔNG cưỡng chế được/i, "phải nói thẳng ranh giới cưỡng chế");
  assert.match(s, /không nằm giữa người dùng và khoá/i);
});

test("phân biệt decode · xác minh · đo được · kết luận", () => {
  // Mục 4. Gộp bốn thứ này là cách nói quá mà mọi con số vẫn đúng.
  const s = doc(TM);
  assert.match(s, /Decode được ≠ an toàn/i);
  assert.match(s, /Coverage 100 ?% ≠ giao dịch lành/i);
});

test("nói rõ kiểu TypeScript KHÔNG phải bằng chứng an toàn runtime", () => {
  /*
   * Mục 5 — yêu cầu nguyên văn của thẻ S01, và nó đã bắt được T01 thật: ranh giới
   * khai `Promise<unknown>` cho phép bỏ qua nội dung phản hồi mà tsc không phản đối.
   */
  const s = doc(TM);
  assert.match(s, /unknown.*validator|validator chạy lúc chạy/is);
  assert.match(s, /docKetQuaXacNhan/, "phải dẫn tới validator thật trong code");
});

test("dẫn tới audit cũ thay vì thay thế nó", () => {
  // Thẻ S01 nói "bổ sung threat model", không nói dựng lại. Hai trang trả lời hai
  // câu khác nhau; gộp là mất danh sách F1–F6 đã đóng.
  const s = doc(TM);
  assert.match(s, /SECURITY-AUDIT\.md/);
  assert.match(s, /không.*thay|KHÔNG.*thay/i);
});

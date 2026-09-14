import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const SO = "scripts/ky-thuat/so-baseline-b06.ts";

const ma = () =>
  doc(SO)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * TB-B06 — SO SÁNH ĐÓNG GÓP RIÊNG CỦA CUSTOS.
 *
 * Thẻ này dễ gian lận hơn mọi thẻ khác trong nhánh B, và nó nói thẳng hai điều cấm:
 *
 *   · *"không cố tình làm hỏng baseline để tạo thắng lợi"*
 *   · *"đây là so sánh triển khai được mô tả, KHÔNG phải tuyên bố hơn Phantom/Blockaid"*
 *
 * Cả hai đều không kiểm được từ đầu ra: một bảng có baseline bị bịt mắt trông y hệt
 * một bảng trung thực. Nên các bài dưới đọc mã nguồn của chính script so sánh.
 */

/* ── 1 · Baseline không được làm yếu đi ────────────────────────────────────── */

test("B1 đọc `decoded` — nó có đủ decoder, chỉ thiếu tầm nhìn inner", () => {
  /*
   * Cách làm hỏng baseline dễ nhất và khó thấy nhất: cho B1 đọc mỗi `programId` rồi
   * kết luận "không hiểu gì". Khi đó Custos thắng mọi ca, và bảng vô nghĩa.
   *
   * B1 phải đọc `decoded.kind` — tức dùng CHÍNH decoder của Custos. Giới hạn duy
   * nhất của nó là `!ix.isInner`, và đó mới là điều bảng muốn đo.
   */
  const m = ma();
  assert.match(m, /decoded\s*\?\s*`\$\{ix\.decoded\.kind\}`/, "B1 không đọc `decoded.kind`");
  assert.match(m, /instructions\.filter\(\(ix\) => !ix\.isInner\)/, "B1 phải lọc đúng top-level");
});

test("B2 đọc CẢ `solDelta` lẫn chênh lệch token", () => {
  /*
   * Một baseline "chỉ xem balance delta" mà chỉ nhìn SOL sẽ mù ở mọi giao dịch token
   * — tức thua Custos ở gần hết bộ mẫu, vì lý do không liên quan gì tới thiết kế của
   * Custos. Ví thật nào cũng đọc được cả hai.
   */
  const m = ma();
  assert.match(m, /f\.solDelta\[f\.signer\]/, "B2 không đọc solDelta của người ký");
  assert.match(m, /t\.amountAfter < t\.amountBefore/, "B2 không đọc chênh lệch token");
  assert.match(m, /f\.phiUocTinh/, "B2 phải trừ phí — không thì nó kêu ở mọi giao dịch");
});

test("B3 gọi `danhGia` THẬT, không dựng bản sao", () => {
  const m = ma();
  assert.match(m, /import \{ danhGia \} from/, "B3 phải dùng engine sản xuất");
  assert.match(m, /danhGia\(f\)/, "B3 phải chạy `danhGia` trên cùng Facts");
});

/* ── 2 · Kỳ vọng phải đến từ NGƯỜI, không từ đầu ra của Custos ─────────────── */

test("nhãn đúng/sai đối chiếu `index.json`, KHÔNG suy từ verdict Custos", () => {
  /*
   * Bản đầu của bảng in *"Custos im đúng (mẫu kỳ vọng `safe`)"* mà không hề đọc
   * `kyVong` — nó suy ra từ chính `level` của Custos. Oracle vòng tròn: Custos im thì
   * nhãn nói Custos đúng, kể cả khi nó im sai.
   */
  const m = ma();
  assert.match(m, /data\/seed\/index\.json/, "bảng không đọc kỳ vọng do người gán");
  assert.match(m, /KY_VONG/, "thiếu bảng tra kỳ vọng");
  assert.match(m, /khopKyVong/, "không ghi lại việc Custos có khớp kỳ vọng hay không");
});

test("`khong-phai-danger` được so bằng BẤT ĐẲNG THỨC, không so bằng", () => {
  /*
   * 17/38 mẫu mang nhãn khoảng này, gồm cả 10 mẫu `real-mainnet`. So bằng sẽ báo
   * Custos LỆCH ở cả 17 — một con số sai do so nhầm kiểu.
   *
   * Quy ước đã có ở `dataset.test.ts`; bảng này phải dùng lại, không phát minh cách
   * so thứ hai. Hai cách so khác nhau cho cùng một nhãn là cách chắc chắn để hai
   * trang tài liệu nói hai điều khác nhau.
   */
  const m = ma();
  assert.match(m, /khong-phai-danger/, "bảng không xử lý nhãn khoảng");
  assert.match(m, /laKhoang \? r3\.level !== "danger"/, "nhãn khoảng phải so bằng `!== danger`");

  // Và quy ước gốc vẫn còn — nếu `dataset.test.ts` đổi cách so thì bài này nhắc.
  assert.match(
    doc("packages/core/test/dataset.test.ts"),
    /kyVong\.level === "khong-phai-danger"[\s\S]{0,120}notEqual\(r\.level, "danger"/,
    "quy ước gốc ở dataset.test.ts đã đổi — đồng bộ lại cách so trong bảng B06",
  );
});

/* ── 3 · Không tuyên bố hơn sản phẩm chưa chạy ─────────────────────────────── */

test("script nói rõ đây KHÔNG phải so với Phantom/Blockaid", () => {
  /*
   * Nghiệm thu nguyên văn. Ba baseline là ba cách triển khai mô tả trong chính file
   * đó — gọi chúng là "đối thủ" là biến một phép đo thành một lời quảng cáo không
   * kiểm được.
   *
   * Quét CẢ chú thích ở bài này là có chủ đích: câu cảnh báo nằm trong docstring.
   */
  /*
   * NEO VÀO DOCSTRING ĐẦU FILE, không quét cả file — và đây là một lỗi đã mắc ngay
   * trong bài này.
   *
   * Bản đầu viết ba `assert.match` trên toàn bộ `doc(SO)`. Mutation xoá câu *"Nói
   * 'hơn Phantom' cần chạy Phantom, và đội chưa làm điều đó"* khỏi docstring mà bài
   * **vẫn xanh**: chuỗi `Phantom` còn trong `console.log` cuối file, và câu "KHÔNG
   * phải ba sản phẩm" cũng còn ở đó.
   *
   * Ba assert đáng ra bổ trợ nhau lại thành ba chỗ đỡ cho nhau — cùng hình dạng lỗi
   * với `||` trong `adrTechnical.test.ts`. Ranh giới quan trọng nhất của thẻ B06 nằm
   * ở docstring, nơi người đọc mã gặp đầu tiên, nên bài phải đòi nó ở đúng đó.
   */
  const d = doc(SO);
  const docstring = d.slice(0, d.indexOf("*/") + 2);
  assert.ok(docstring.length > 200, "không tìm thấy docstring đầu file");

  assert.match(
    docstring,
    /KHÔNG phải ba sản phẩm|không phải ba sản phẩm/i,
    "docstring thiếu ranh giới: ba baseline không phải ba sản phẩm",
  );
  assert.match(docstring, /Phantom/, "docstring phải nêu đích danh điều KHÔNG được tuyên bố");
  assert.match(
    docstring,
    /phải chạy chúng|chưa làm điều đó/i,
    "docstring phải nói rõ vì sao không tuyên bố được",
  );

  // Và câu đó cũng phải đến được người CHẠY script, không chỉ người đọc mã.
  assert.match(d, /console\.log\([\s\S]{0,300}Phantom/, "đầu ra của script phải mang ranh giới này");
});

test("script KHÔNG chạm mạng", () => {
  const m = ma();
  for (const cam of ["new Connection", "fetch(", "node:http"]) {
    assert.ok(!m.includes(cam), `so-baseline chứa \`${cam}\``);
  }
});

test("`npm run so-baseline` trỏ đúng script", () => {
  const s = (JSON.parse(doc("package.json")) as { scripts: Record<string, string> }).scripts;
  assert.match(s["so-baseline"] ?? "", /so-baseline-b06\.ts/);
});

/* ── 4 · Ca "Custos không thêm gì" phải giữ được ───────────────────────────── */

test("bảng có nhãn cho ca Custos KHÔNG thêm gì và ca baseline báo nhầm", () => {
  /*
   * Thẻ đòi *"lưu cả trường hợp Custos không thêm lợi ích hoặc cảnh báo rộng hơn cần
   * thiết"*. Một bảng chỉ có ô "Custos thắng" là một bảng đã chọn ca.
   *
   * Bốn nhãn phải cùng tồn tại, kể cả khi hiện chưa ca nào rơi vào — xoá nhánh vì
   * "không dùng tới" là cách bảng mất khả năng nói điều bất lợi.
   */
  const m = ma();
  for (const nhan of [
    "THÊM PHÁT HIỆN",
    "BASELINE BÁO NHẦM",
    "CUSTOS BỎ LỌT",
    "KHÔNG thêm gì",
  ]) {
    assert.ok(m.includes(nhan), `bảng thiếu nhãn "${nhan}" — nó không nói được ca bất lợi`);
  }
});

test("năm ca của thẻ đều có mặt, và đều có kỳ vọng để đối chiếu", () => {
  /*
   * Thẻ nêu đích danh: change authority không đổi số dư · hành vi qua CPI · payload
   * tự khai lành · dữ liệu thiếu · một giao dịch hợp lệ.
   */
  const m = ma();
  const idx = JSON.parse(doc("data/seed/index.json")) as {
    mau: Array<{ id: string; kyVong: unknown }>;
  };
  const coKyVong = new Set(idx.mau.map((x) => x.id));

  const canCo = ["R01-pos", "MN-02", "R09-pos", "R04-neg", "R13-neg"];
  for (const id of canCo) {
    assert.ok(m.includes(id), `bảng thiếu ca ${id}`);
    assert.ok(coKyVong.has(id), `${id} không có trong index.json — không đối chiếu được`);
  }
});

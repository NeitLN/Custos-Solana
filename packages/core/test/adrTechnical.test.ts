import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");
const ADR = "docs/adr/0001-doi-huong-technical-build.md";

/**
 * TB-G02 — CÁCH KỂ SẢN PHẨM THEO RUBRIC TECHNICAL.
 *
 * Trang này có một áp lực trôi rất rõ và chỉ đi MỘT chiều: mọi thứ đều muốn biến
 * "đội đang phát triển theo hướng Technical" thành "đội đã đăng ký track Technical".
 * Câu thứ hai nghe gọn hơn, tự tin hơn, và **chưa có bằng chứng**.
 *
 * Bốn nhóm bài dưới đây canh đúng bốn điều thẻ G02 cấm.
 */

/* ── 1 · Hai trạng thái track KHÔNG được gộp ───────────────────────────────── */

test("ADR phân biệt hướng phát triển với đăng ký BTC", () => {
  /*
   * Được phép đổi ≠ biểu mẫu đã đổi. Repo không có cách nào kiểm chứng trạng thái
   * đăng ký, nên nó phải nói "chưa xác nhận" thay vì đoán.
   */
  const s = doc(ADR);
  assert.match(s, /Hướng phát triển/i);
  assert.match(s, /Đăng ký với BTC|Track đăng ký/i);
  assert.match(
    s,
    /chưa có bằng chứng đã cập nhật|chưa xác nhận/i,
    "phải nói rõ trạng thái đăng ký chưa kiểm chứng được",
  );
});

test("README và CLAUDE.md ghi CẢ HAI trạng thái, không chỉ một", () => {
  /*
   * Đây là bài đáng giá nhất nhóm. Ghi mỗi "Best Technical Build" ở README là khai
   * một trạng thái đăng ký không có thật; ghi mỗi track cũ là giấu việc đội đã đổi
   * hướng. Cả hai cách đều sai theo một hướng khác nhau.
   */
  for (const f of ["README.md", "CLAUDE.md"]) {
    const s = doc(f);
    assert.match(s, /Best Product & Business/, `${f} phải còn nêu track ĐĂNG KÝ`);
    assert.match(s, /Best Technical Build/, `${f} phải nêu hướng PHÁT TRIỂN`);
    assert.match(
      s,
      /Track đăng ký|track đăng ký/,
      `${f} phải gọi tên rõ đâu là đăng ký, không để hai tên track trần trụi cạnh nhau`,
    );
  }
});

test("hồ sơ nộp bài ghi form 24/08 thuộc track CŨ", () => {
  // Ô này từng ghi "✅ đã nộp 24/08" trống trơn. Sau khi đổi hướng, dấu ✅ đó nói
  // với người đọc rằng đăng ký đã khớp hướng mới — nó không khớp.
  const s = doc("docs/nop-bai/README.md");
  assert.match(s, /Best Product & Business/);
  assert.match(s, /chưa xác nhận/i);
});

/* ── 2 · KHÔNG chấm lại điểm cũ ────────────────────────────────────────────── */

test("ADR KHÔNG chấm lại 6,95 và không tự đặt một tổng mới", () => {
  /*
   * `CUSTOS.md` mục 13 cấm bằng đúng chữ: *"tự nâng điểm cho khớp tin mới là đúng
   * thứ mục này sinh ra để chống"*. Một ADR đổi track là đúng lúc con số đó bị cám
   * dỗ nhiều nhất — rubric mới, bằng chứng mới, rất tiện để viết một tổng mới.
   *
   * Được phép NHẮC tới 7,4 của review 12/09, nhưng phải gọi đúng tên nó: một ảnh
   * chụp riêng, người chấm khác, rubric khác.
   */
  const s = doc(ADR);
  assert.match(doc("CUSTOS.md"), /6,95/, "con số cũ phải còn nguyên trong CUSTOS.md");
  assert.match(s, /KHÔNG chấm lại|không chấm lại/i);
  assert.doesNotMatch(
    s,
    /tổng mới|điểm mới là \d|nâng lên \d[,.]\d\/10/i,
    "ADR không được tuyên bố một tổng thay thế",
  );
  // Nhắc 7,4 thì phải kèm ranh giới.
  if (s.includes("7,4")) {
    assert.match(
      s,
      /ảnh chụp riêng|người chấm khác|không phải điểm BTC/i,
      "nhắc 7,4 phải kèm ranh giới, nếu không nó đọc thành điểm hiện hành",
    );
  }
});

/* ── 3 · KHÔNG hứa thứ chưa đo được ────────────────────────────────────────── */

test("ADR KHÔNG hứa tỷ lệ phát hiện", () => {
  /*
   * Thẻ G02 nói đúng chữ: *"không hứa tỷ lệ phát hiện"*. Chưa có ground truth cho
   * cohort nên tỉ lệ báo nhầm **chưa đo được** — và một bảng bằng chứng kỹ thuật là
   * đúng chỗ một con số như vậy sẽ lẻn vào.
   */
  const s = doc(ADR);
  assert.doesNotMatch(
    s,
    /tỷ lệ phát hiện \d|phát hiện \d+ ?% giao dịch|bắt được \d+ ?% /i,
    "không được hứa tỷ lệ phát hiện",
  );
  assert.match(s, /chưa đo được|chưa có ground truth/i, "phải nói rõ cái chưa đo được");
});

test("ADR nói rõ mục 25 % có chữ 'smart contract' mà Custos không có", () => {
  /*
   * Rủi ro lớn nhất của quyết định đổi track, và cách duy nhất xử lý nó đúng là nói
   * ra trước. Giấu đi thì giám khảo tự tìm ra trong ba giây.
   *
   * Và ADR phải TỪ CHỐI cách lấp rẻ tiền: thêm một on-chain program chỉ để có
   * contract trong sơ đồ — đúng thứ review 12/09 cảnh báo, và trái quyết định số 5.
   */
  const s = doc(ADR);
  assert.match(s, /smart contract/i);
  assert.match(s, /KHÔNG có smart contract|không có smart contract/i);
  assert.match(
    s,
    /Không.*thêm on-chain program|không thêm smart contract/i,
    "phải nói rõ KHÔNG thêm contract để lấp chỗ",
  );
});

/* ── 4 · Rubric phải đúng nguyên văn thể lệ ────────────────────────────────── */

test("bốn trọng số khớp thể lệ BTC, không gõ theo trí nhớ", () => {
  /*
   * Trọng số là thứ dễ nhớ nhầm nhất (track cũ cũng có 25/30/25/20, chỉ khác thứ
   * tự). Bài này đối chiếu ADR với chính file thể lệ trong repo.
   */
  const theLe = doc("docs/cuoc-thi/Thể lệ UniHackfest 2026.md");
  const s = doc(ADR);

  /*
   * Đòi CẢ tên tiêu chí LẪN trọng số, trên CÙNG một dòng.
   *
   * Bản đầu viết `s.includes(ten) || s.includes(ts + " %")` — và đột biến chứng minh
   * nó vô dụng: đổi "Độ khó… 30 %" thành "Chiều sâu kỹ thuật 35 %" vẫn XANH, vì vế
   * phải chỉ cần chuỗi "25 %" có mặt ở một dòng bất kỳ khác.
   *
   * `||` ở đây là lỗi thiết kế, không phải lỗi gõ: hai vế đáng ra bổ trợ nhau lại
   * thành hai cửa thoát. Đây là lần thứ sáu trong repo một guard không đỏ được, và
   * lần này chỉ phép kiểm phủ định mới lộ.
   *
   * Quét theo DÒNG để tên và trọng số phải đi cùng nhau — tách ra là mất ràng buộc.
   *
   * Và neo vào chính BẢNG (`d.startsWith("|")`), không nhận tiêu đề mục. Phép đột
   * biến thứ hai lộ ra điều này: tách dòng bảng ra làm hai mà bài vẫn xanh, vì mục
   * 4 có tiêu đề `### 25 % · Kiến trúc on-chain/off-chain` cũng chứa đủ cả tên lẫn
   * trọng số. Đó là dương tính giả của phép đột biến chứ không phải guard sai —
   * nhưng một bài rubric thoả được bằng tiêu đề mục thì đang canh nhầm chỗ.
   */
  const dongADR = s.split("\n");
  for (const [ten, ts] of [
    ["Độ khó và chiều sâu kỹ thuật", "30"],
    ["Kiến trúc on-chain/off-chain", "25"],
    ["Mức tận dụng Solana stack", "25"],
    ["Độ hoàn thiện demo", "20"],
  ] as const) {
    assert.ok(theLe.includes(ten), `thể lệ không còn dòng "${ten}" — đọc lại nguồn`);
    assert.ok(
      dongADR.some((d) => d.startsWith("|") && d.includes(ten) && d.includes(`${ts} %`)),
      `bảng rubric của ADR thiếu tiêu chí "${ten}" kèm đúng trọng số ${ts}%`,
    );
  }
});

test("ADR KHÔNG sửa thể lệ hay nguồn lịch", () => {
  /*
   * Hai file đó chép từ văn bản BTC. `lichThi.test.ts` đã canh chúng; bài này canh
   * ý định: ADR phải tự khai là nó không đụng vào.
   */
  const s = doc(ADR);
  assert.match(s, /không.*sửa thể lệ|KHÔNG.*sửa thể lệ/i);
  // Và nguồn lịch phải còn nguyên tên track cũ — đó là điều thể lệ nói.
  assert.match(
    doc("docs/cuoc-thi/THONG-TIN-VONG-HIEN-TAI.md"),
    /Best Product & Business/,
    "nguồn lịch phải giữ đúng tên track trong thể lệ",
  );
});

/* ── 5 · Bằng chứng phải dẫn được về artifact ──────────────────────────────── */

test("mọi con số trong bảng bằng chứng khớp `so-lieu.json`", () => {
  /*
   * ADR là tài liệu dễ lạc hậu nhất: nó chụp một trạng thái rồi nằm yên. Bài này
   * neo nó vào nguồn số duy nhất, nên lần đồng bộ sau sẽ bắt được nếu nó trôi.
   *
   * Dấu thập phân: tài liệu dùng dấu PHẨY tiếng Việt, JSON dùng dấu chấm. Bản đầu
   * của phép kiểm này so thẳng chuỗi và báo "thiếu" cho `6.5`/`11.7` — một dương
   * tính giả của chính phép kiểm, không phải lỗi tài liệu.
   */
  const d = JSON.parse(doc("apps/demo-wallet/public/so-lieu.json")) as {
    soLuat: number;
    soMau: number;
    test: { pass: number };
    cohort: { coveragePhanTram: number };
    chiPhi: { luotGoiRpc: { trungVi: number } };
    tichHop: { msMotLuot: number; dongMa: number };
  };
  const vi = (n: number) => String(n).replace(".", ",");
  const s = doc(ADR);

  for (const [ten, gt] of [
    ["số luật", String(d.soLuat)],
    ["số test", String(d.test.pass)],
    ["số mẫu", String(d.soMau)],
    ["coverage", String(d.cohort.coveragePhanTram)],
    ["lượt RPC", vi(d.chiPhi.luotGoiRpc.trungVi)],
    ["ms một lượt", String(d.tichHop.msMotLuot)],
    ["dòng mã", String(d.tichHop.dongMa)],
  ] as const) {
    assert.ok(s.includes(gt), `ADR thiếu hoặc lệch ${ten} (${gt})`);
  }
});

test("ADR ghi rõ phạm vi CHƯA kiểm", () => {
  // Một bảng bằng chứng không kèm phạm vi thì đọc thành "đã kiểm hết".
  const s = doc(ADR);
  assert.match(s, /Chromium headless/i);
  assert.match(s, /WebKit|Firefox/);
  assert.match(s, /video demo/i, "phải nêu video dự phòng còn thiếu — BTC bắt buộc");
});

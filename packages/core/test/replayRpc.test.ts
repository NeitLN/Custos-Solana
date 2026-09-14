import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/** Bỏ chú thích trước khi quét mã nguồn. */
const maCua = (p: string) =>
  doc(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const CAPTURE = "scripts/ky-thuat/capture-rpc.ts";
const REPLAY = "scripts/ky-thuat/chay-replay.ts";
const ADAPTER = "scripts/ky-thuat/replay-rpc.ts";
const FIX = "data/benchmark/rpc";

/**
 * TB-B02 — REPLAY RPC QUA ĐƯỜNG L1 SẢN XUẤT.
 *
 * Bốn nghiệm thu của thẻ, và ba trong số đó KHÔNG kiểm được từ đầu ra:
 *
 *   · *"chạy khi network bị chặn vẫn tái lập kết quả"* — runner báo "đạt" y hệt dù nó
 *     lén gọi mạng hay không. Chỉ đọc được ở tầng mã nguồn.
 *   · *"thiếu fixture request làm runner báo lỗi"* — cái bẫy ở đây là `extractFacts`
 *     **nuốt** exception thành `simulationError`, nên một fixture thiếu vẫn ra Facts
 *     hợp lệ và tất định. Xem bài "hộp `thieuFixture`" bên dưới.
 *   · *"không được mô tả là thực thi SVM mới"* — một câu trong tài liệu, không phải
 *     một hành vi.
 *
 * Bài duy nhất kiểm được từ đầu ra là tính nhạy fixture, và `chay-replay.ts` tự chạy
 * nó mỗi lượt.
 */

/* ── 1 · Replay KHÔNG có đường ra mạng ─────────────────────────────────────── */

test("`chay-replay.ts` không có đường ra mạng nào", () => {
  /*
   * Bài này canh cái mà nghiệm thu gọi là *"chạy khi network bị chặn"*. Không chặn
   * mạng thật trong test — một runner lén gọi RPC vẫn xanh khi máy có mạng, và đỏ
   * trên CI vì lý do khác. Đọc mã nguồn thì kết luận không phụ thuộc môi trường.
   */
  const ma = maCua(REPLAY);
  for (const cam of ["new Connection", "fetch(", "node:http", "node:https", "undici"]) {
    assert.ok(!ma.includes(cam), `replay chứa \`${cam}\` — nó có đường ra mạng`);
  }
  assert.ok(
    !/from\s+["']@solana\/web3\.js["'][\s\S]{0,200}Connection/.test(ma),
    "replay import `Connection` từ web3.js",
  );
});

test("adapter dùng chung cũng không tự mở kết nối", () => {
  // `replay-rpc.ts` được CẢ capture lẫn replay nạp. Nếu nó tự dựng `Connection` thì
  // đường ra mạng đi vòng qua module dùng chung, và bài trên không thấy.
  const ma = maCua(ADAPTER);
  assert.ok(!ma.includes("new Connection"), "adapter tự dựng `Connection`");
  assert.ok(!ma.includes("fetch("), "adapter gọi `fetch`");
});

test("chỉ `capture-rpc.ts` chạm mạng, và nó đòi khai báo ý định", () => {
  /*
   * Cổng `CUSTOS_CAPTURE=1` không phải thủ tục thừa: gọi nhầm script này trong một
   * vòng CI sẽ ghi đè toàn bộ fixture bằng trạng thái chuỗi của hôm nay — benchmark
   * mất điểm neo mà không ai thấy, vì nó vẫn xanh.
   */
  const ma = maCua(CAPTURE);
  assert.ok(ma.includes("new Connection"), "capture phải là nơi DUY NHẤT chạm mạng");
  assert.match(ma, /CUSTOS_CAPTURE/, "capture thiếu cổng khai báo ý định");
  assert.match(ma, /process\.exit\(2\)/, "capture không thoát khi thiếu cổng");
});

test("`npm run replay-rpc` trỏ vào runner offline, không phải capture", () => {
  // Một script `package.json` trỏ nhầm làm mọi bài trên vô nghĩa: người chạy nghĩ
  // mình replay offline trong khi đang bắn request thật.
  const pkg = JSON.parse(doc("package.json")) as { scripts: Record<string, string> };
  assert.match(pkg.scripts["replay-rpc"] ?? "", /chay-replay\.ts/);
  assert.ok(
    !(pkg.scripts["replay-rpc"] ?? "").includes("capture"),
    "`replay-rpc` gọi script capture",
  );
  assert.match(pkg.scripts["capture-rpc"] ?? "", /capture-rpc\.ts/);
});

/* ── 2 · Thiếu fixture phải NỔI RA, không thành "mô phỏng hỏng" ────────────── */

test("runner ĐỌC hộp `thieuFixture()` sau khi chạy", () => {
  /*
   * BÀI QUAN TRỌNG NHẤT FILE. Đã đo được cả hai chiều bằng mutation.
   *
   * `extractFacts` bọc `simulateTransaction` trong `try/catch` và ghi `e.message` vào
   * `simulationError` (`l1/fetch.ts`). Nên khi replay ném `ThieuFixture`, exception bị
   * nuốt và Facts ra `simulationOk: false` — hợp lệ, tất định, trông như một mẫu
   * "mô phỏng hỏng" bình thường.
   *
   * Đo thật, xoá bản ghi `simulateTransaction` khỏi `R06-pos.json`:
   *
   *   · CÓ đọc hộp  ⇒ ` chưa  R06-pos · thiếu fixture cho simulateTransaction (khoá …)`
   *   · BỎ đọc hộp  ⇒ ` SAI   R06-pos · tất định=✓ nhạy-fixture=✗`
   *
   * Nhánh thứ hai đỏ, nhưng đỏ vì **lý do khác** và chỉ do may: mất mô phỏng ⇒
   * `accounts` rỗng ⇒ không cách đổi nào chạm được Facts. Một mẫu thiếu
   * `getSignaturesForAddress` sẽ không có may mắn đó — nó sẽ báo **đạt**.
   *
   * Nói cách khác `thieuFixture()` là lớp DUY NHẤT canh đúng nguyên nhân, và vì
   * `extractFacts` nuốt exception nên không có cách nào quan sát điều này từ đầu ra.
   */
  const ma = maCua(REPLAY);
  assert.match(ma, /thieuFixture\(\)/, "runner không đọc hộp `thieuFixture`");
  assert.match(
    ma,
    /thieu\s*=\s*thieuFixture\(\)[\s\S]{0,120}throw/,
    "runner đọc hộp nhưng không ném — thiếu fixture sẽ lọt thành `đạt`",
  );
});

test("adapter NÉM khi thiếu fixture, không trả `null` và không gọi mạng", () => {
  /*
   * Trả `null` thì `extractFacts` đọc như "account không tồn tại" — một sự thật khác
   * hẳn "tôi không có dữ liệu". Fixture khuyết biến thành Facts nói sai.
   */
  const ma = maCua(ADAPTER);
  assert.match(ma, /throw\s+e/, "adapter không ném khi thiếu fixture");
  assert.match(ma, /daThieu\.push/, "adapter không ghi lại request thiếu");
  assert.ok(
    !/if\s*\(!bang\.has\(k\)\)[\s\S]{0,160}return\s+null/.test(ma),
    "adapter trả `null` khi thiếu fixture",
  );
});

test("lỗi RPC đã ghi được NÉM LẠI, không đọc thành dữ liệu hợp lệ", () => {
  // Fixture lưu lỗi RPC dưới `{__loi}`. Trả object đó như response làm một lỗi mạng
  // biến thành một response trống rỗng nhưng "thành công".
  const ma = maCua(ADAPTER);
  assert.match(ma, /__loi/, "adapter không xử lý bản ghi lỗi");
  assert.match(ma, /__loi[\s\S]{0,220}throw new Error/, "adapter không ném lại lỗi đã ghi");
  assert.match(maCua(CAPTURE), /__loi/, "capture không ghi lỗi RPC — fixture sẽ khuyết im lặng");
});

/* ── 3 · Fixture không được chứa secret, và phải khai đúng cluster ─────────── */

test("fixture chỉ giữ HOST của endpoint", () => {
  /*
   * Credential của RPC thương mại nằm ở path và query (`/?api-key=…`). Fixture là thứ
   * được commit, nên một endpoint đầy đủ trong đó là rò khoá vĩnh viễn trong git.
   */
  assert.match(maCua(ADAPTER), /new URL\(url\)\.host/, "`locNguon` không lọc về host");
  if (!existsSync(join(GOC, FIX))) return;
  for (const f of readdirSync(join(GOC, FIX)).filter((x) => x.endsWith(".json"))) {
    const fx = JSON.parse(doc(join(FIX, f))) as { nguon: string };
    assert.ok(!fx.nguon.includes("/"), `${f}: \`nguon\` chứa đường dẫn — "${fx.nguon}"`);
    assert.ok(!/[?=]/.test(fx.nguon), `${f}: \`nguon\` chứa query — "${fx.nguon}"`);
  }
});

test("capture TỪ CHỐI ghi mẫu mainnet bằng endpoint không phải mainnet", () => {
  /*
   * Lỗi đã mắc thật: capture `MN-01` (mainnet) bằng RPC devnet "thành công" — 3 bản
   * ghi, không lỗi. Nhưng cả hai lượt `getAddressLookupTable` trả `value: null` vì ALT
   * đó không tồn tại trên devnet.
   *
   * Fixture sinh ra khi đó ghi một sự thật của devnet và dán nhãn mẫu mainnet. Replay
   * từ nó tái lập được — tái lập đúng một kết quả sai. Đó là loại hỏng tệ nhất của
   * benchmark: xanh, ổn định, và nói dối.
   */
  const ma = maCua(CAPTURE);
  assert.match(ma, /real-mainnet/, "capture không phân biệt mẫu mainnet");
  assert.match(ma, /clusterCuaEndpoint/, "capture không suy cluster từ endpoint");
  assert.match(
    ma,
    /real-mainnet[\s\S]{0,120}clusterCuaEndpoint\s*!==\s*["']mainnet-beta["']/,
    "capture không chặn mẫu mainnet trên endpoint khác cluster",
  );
});

test("fixture hiện có đều capture từ devnet, và không mẫu mainnet nào lọt vào", () => {
  // Bài này chấm dữ liệu THẬT trên đĩa, không chấm mã. Nếu ai đó capture tay bằng
  // endpoint khác, nó đỏ.
  if (!existsSync(join(GOC, FIX))) return;
  const mf = JSON.parse(doc("data/benchmark/manifest.json")) as {
    mau: Array<{ id: string; nguonGoc: string }>;
  };
  const nguonGoc = new Map(mf.mau.map((m) => [m.id, m.nguonGoc]));
  for (const f of readdirSync(join(GOC, FIX)).filter((x) => x.endsWith(".json"))) {
    const id = f.slice(0, -5);
    assert.notEqual(
      nguonGoc.get(id),
      "real-mainnet",
      `${id} là mẫu mainnet mà có fixture — kiểm endpoint đã capture`,
    );
    const fx = JSON.parse(doc(join(FIX, f))) as { nguon: string; phienBan: number };
    assert.match(fx.nguon, /devnet/i, `${f}: capture từ "${fx.nguon}", không phải devnet`);
    assert.equal(fx.phienBan, 1, `${f}: phiên bản fixture lạ`);
  }
});

/* ── 4 · Không được mô tả replay là thực thi SVM ───────────────────────────── */

test("cả ba file đều nói rõ replay KHÔNG phải thực thi SVM", () => {
  /*
   * Nghiệm thu nguyên văn: *"Replay RPC không được mô tả là thực thi SVM mới"*.
   *
   * Đây là ranh giới dễ trôi nhất của thẻ, vì "replay 19 mẫu" nghe như đã chạy lại 19
   * giao dịch. Thật ra `simulateTransaction` trong fixture là kết quả một lần chạy SVM
   * **trong quá khứ, trên máy khác**.
   */
  for (const p of [ADAPTER, REPLAY]) {
    assert.match(doc(p), /KHÔNG.{0,20}thực thi SVM|không.{0,20}thực thi SVM/i, `${p} thiếu cảnh báo`);
  }
  assert.match(
    doc(REPLAY),
    /console\.log\([\s\S]{0,200}KHÔNG phải một lần thực thi SVM/,
    "runner không IN ra giới hạn đó — người đọc đầu ra không thấy",
  );
});

test("BENCHMARK.md phân biệt mẫu ĐỦ ĐIỀU KIỆN với mẫu ĐÃ CHẠY", () => {
  /*
   * `l1-replay` có **29** mẫu đủ điều kiện nhưng chỉ **19** chạy được — 10 mẫu
   * `real-mainnet` chưa có fixture vì capture từ chối ghi chúng bằng endpoint devnet.
   *
   * Ghi mỗi "29/38" thì người đọc hiểu thành "29 mẫu đã chứng minh L1 đúng". Khoảng
   * cách 10 mẫu đó là **sự thật cần ghi**, không phải chỗ cần lấp.
   */
  const b = doc("docs/BENCHMARK.md");
  assert.match(b, /19\/29/, "BENCHMARK.md không ghi số mẫu THẬT SỰ chạy được");

  /*
   * NEO VÀO HÀNG TIÊU ĐỀ BẢNG, không quét cả trang — và đây là một lỗi đã mắc ngay
   * trong bài này.
   *
   * Bản đầu viết `assert.match(b, /đủ điều kiện[\s\S]{0,400}đã chạy/i)`. Mutation gộp
   * hai cột bảng thành một cột "Số mẫu" mà bài **vẫn xanh**: đoạn văn bên dưới bảng
   * định nghĩa hai chữ đó (*"Đủ điều kiện = … Đã chạy = …"*) tự thoả regex.
   *
   * Nghĩa là bài canh một câu chữ ở đâu đó trên trang, chứ không canh cấu trúc bảng —
   * đúng thứ nó phải canh. Một bảng gộp cột kèm đoạn văn cũ sẽ qua được.
   */
  const tieuDe = b.split("\n").find((d) => d.startsWith("| Tầng |"));
  assert.ok(tieuDe, "BENCHMARK.md không còn bảng phân tầng");
  assert.match(
    tieuDe,
    /Đủ điều kiện/,
    "hàng tiêu đề bảng tầng thiếu cột 'Đủ điều kiện'",
  );
  assert.match(tieuDe, /Đã chạy/, "hàng tiêu đề bảng tầng thiếu cột 'Đã chạy'");
});

test("số mẫu có fixture khớp con số tài liệu công bố", () => {
  /*
   * Neo con số vào dữ liệu thật. Capture thêm một mẫu mà quên sửa tài liệu ⇒ đỏ; đó
   * là cách duy nhất giữ "19" khỏi trôi thành một con số kể lại.
   */
  if (!existsSync(join(GOC, FIX))) return;
  const so = readdirSync(join(GOC, FIX)).filter((x) => x.endsWith(".json")).length;
  assert.equal(so, 19, `có ${so} fixture nhưng tài liệu ghi 19 — chạy lại và cập nhật số`);
});

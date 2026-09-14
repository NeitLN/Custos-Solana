import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));
const doc = (p: string) => readFileSync(join(GOC, p), "utf8");

/**
 * CI BA TẦNG — tất định · browser · live. Thẻ TB-I03.
 *
 * File workflow có **0 phép kiểm nào** canh trước bài này. Mọi thứ trong đó — thứ tự
 * bước, phiên bản ghim, điều kiện chạy — chỉ đúng chừng nào không ai sửa nhầm, và
 * không ai biết khi nó sai: CI hỏng chỉ lộ ra khi push, tức đúng lúc không muốn biết.
 *
 * Bài này KHÔNG dựng lại một parser YAML. Repo không có `pyyaml`/`js-yaml` trong cây,
 * và cài thêm một gói ngay trước hạn thi để chiều một phép kiểm là đổi lockfile lấy
 * sự tiện. Thứ thật sự hỏng ở một file YAML người viết là thụt lề, khoá trùng, và
 * bất biến bị gỡ — kiểm đúng ba thứ đó theo dòng thì đủ và không thêm phụ thuộc nào.
 *
 * Ba tầng tách nhau vì chúng đỏ vì những lý do KHÁC NHAU:
 *
 *   · tất định — đỏ ⇒ sản phẩm sai. Chặn deploy.
 *   · browser  — đỏ có thể vì Chromium tải hỏng. Chạy tay.
 *   · live     — đỏ có thể vì RPC công cộng chậm. Chạy tay.
 *
 * Gộp chúng lại là dạy người đọc bỏ qua CI, và một CI bị bỏ qua tệ hơn không có CI.
 */

const YML = "?.github/workflows/deploy.yml".slice(1);
const S = doc(YML);
const DONG = S.split("\n");

/*
 * MỌI PHÉP CẮT BẮT ĐẦU TỪ `jobs:`, KHÔNG TỪ ĐẦU FILE.
 *
 * Bản đầu của file này liệt kê job bằng `/^  [a-z0-9-]+:$/` trên cả file — và khối
 * `on:` có `  push:` thụt đúng hai dấu cách y hệt một job. Kết quả: ba bài đỏ cùng
 * lúc, một bài đòi `push` phải có `timeout-minutes`, hai bài kia cắt nhầm thân
 * `build` thành thân của `push` rồi kết luận thiếu bước.
 *
 * Ba bài đỏ, không bài nào chỉ vào một lỗi có thật trong workflow. Đó là lần thứ hai
 * trong phiên này tôi viết một guard đỏ vì lý do sai (lần trước: `indexOf("<GioiHan")`
 * bắt trúng khối đầu trong sáu khối). Cùng một hình dạng: neo vào một mẫu chung thay
 * vì vào đúng vùng cần soi.
 */
const I_JOBS = DONG.findIndex((d) => d === "jobs:");
assert.ok(I_JOBS >= 0, "workflow không còn khoá `jobs:`");

/** Tên mọi job — chỉ tính từ sau `jobs:`, nên `on: push:` không lọt vào. */
const TEN_JOB = DONG.slice(I_JOBS + 1)
  .filter((d) => /^  [a-z0-9-]+:$/.test(d))
  .map((d) => d.trim().slice(0, -1));

/** Cắt đúng thân một job. Nhiều assert quét cả file thì một job che lỗi của job kia. */
function than(ten: string): string {
  const dau = DONG.findIndex((d, i) => i > I_JOBS && d === `  ${ten}:`);
  assert.ok(dau >= 0, `workflow không còn job \`${ten}\``);
  const sau = DONG.findIndex((d, i) => i > dau && /^  [a-z0-9-]+:$/.test(d));
  return DONG.slice(dau, sau < 0 ? DONG.length : sau).join("\n");
}

/** Bỏ dòng chú thích trước khi quét nội dung cấm — xem bài cuối file. */
const KHONG_CHU_THICH = DONG.filter((d) => !d.trimStart().startsWith("#")).join("\n");

test("workflow không có TAB và thụt lề đều là bội của 2", () => {
  /*
   * Hai lỗi YAML im lặng nhất. Tab bị cấm hẳn; thụt lề lẻ thì parser GitHub nhận
   * hoặc từ chối tuỳ chỗ, và khi nó nhận thì cấu trúc lồng ra khác ý người viết.
   */
  const xau: string[] = [];
  DONG.forEach((d, i) => {
    if (d.includes("\t")) xau.push(`dòng ${i + 1}: có TAB`);
    const t = d.trimEnd();
    if (t && !t.trimStart().startsWith("#")) {
      const n = t.length - t.trimStart().length;
      if (n % 2) xau.push(`dòng ${i + 1}: thụt lề ${n} — lẻ`);
    }
  });
  assert.deepEqual(xau, []);
});

test("không job nào bị khai hai lần", () => {
  /*
   * Khoá trùng trong YAML không phải lỗi cú pháp: bản sau ĐÈ bản trước, im lặng.
   * Một job `build` thứ hai viết nhầm sẽ xoá sạch job thật mà log không nói gì.
   */
  const trung = TEN_JOB.filter((t, i) => TEN_JOB.indexOf(t) !== i);
  assert.deepEqual(trung, [], `job khai trùng: ${trung.join(", ")}`);
});

test("MỌI job có timeout hữu hạn", () => {
  /*
   * Mặc định của GitHub là **6 tiếng**. Một bước treo — registry không phản hồi,
   * một probe chờ selector không bao giờ tới — chiếm runner cả buổi tối trong tuần
   * trước hạn thi, và không ai thấy lỗi vì job vẫn "đang chạy".
   *
   * Đòi ở MỌI job, không chỉ job mới: job cũ cũng treo được, và một bài chỉ canh
   * job mới sẽ xanh mãi trong khi lỗ vẫn nguyên.
   */
  assert.ok(TEN_JOB.length >= 5, `chỉ thấy ${TEN_JOB.length} job — bài này đọc sai file?`);
  const thieu = TEN_JOB.filter((t) => !/timeout-minutes:\s*\d+/.test(than(t)));
  assert.deepEqual(thieu, [], `job thiếu timeout-minutes: ${thieu.join(", ")}`);
});

test("tầng tất định nằm TRÊN đường chặn deploy", () => {
  /*
   * `deploy` phụ thuộc `build`, nên mọi bước trong `build` là cổng thật. Bốn bước
   * dưới đây trả lời bốn câu khác nhau, và bỏ bất kỳ cái nào cũng mở một khoảng mù:
   *
   *   check      — bất biến trong mã
   *   replay     — L1 bóc response RPC thô ra Facts có đúng không (test đơn vị bắt
   *                đầu SAU bước bóc, nên nó không phủ câu này)
   *   doi-khang  — năm probe từng bắt bốn lỗi sản phẩm thật
   *   thu-tich-hop:deterministic — Custos xử đúng chưa, trên fixture
   */
  const b = than("build");
  for (const [ten, cum] of [
    ["typecheck + test", "npm run check"],
    ["replay RPC", "npm run replay-rpc"],
    ["bộ đối kháng", "npm run doi-khang"],
    ["tích hợp tất định", "npm run thu-tich-hop:deterministic"],
    ["chặn rò rỉ khoá", "soi-ro-ri-khoa.mjs"],
  ] as const) {
    assert.ok(b.includes(cum), `job build thiếu bước ${ten} (\`${cum}\`)`);
  }
  assert.match(than("deploy"), /needs:\s*build/, "deploy phải phụ thuộc build");
});

test("sinh số liệu chạy TRƯỚC bộ kiểm, không phải sau", () => {
  /*
   * Đây là lỗi đã xảy ra thật, và nó làm HEAD `780cf6d` đỏ 11 bài: `so-lieu.json`
   * sinh sau khi tài liệu đã cập nhật ⇒ guard đối chiếu tài liệu với một file CŨ,
   * hai bên cùng cũ nên vẫn xanh cục bộ.
   *
   * Thứ tự trong workflow là thứ duy nhất ép được điều này, nên canh bằng vị trí.
   */
  /*
   * ĐO TRÊN DÒNG LỆNH, KHÔNG TRÊN CẢ THÂN JOB — và đây là lần thứ ba trong cùng
   * phiên tôi mắc hình dạng lỗi này.
   *
   * Chú thích ngay phía trên bước `npm run check` GIẢI THÍCH thứ tự này, nên nó
   * chứa chuỗi `npm run check` và đứng trước bước `tao-so-lieu.ts` trong file.
   * `indexOf` trên cả thân job bắt trúng lời giải thích: đo được 2536 vs 1676 ⇒
   * "sai thứ tự", trong khi hai bước THẬT nằm ở dòng +50 và +56, đúng thứ tự.
   *
   * Một phép kiểm theo chuỗi không phân biệt "làm X" với "nói về X". Lọc còn dòng
   * lệnh trước, rồi mới so vị trí.
   */
  const lenh = than("build")
    .split("\n")
    .filter((d) => d.trim() && !d.trimStart().startsWith("#"));
  const iSinh = lenh.findIndex((d) => d.includes("scripts/tao-so-lieu.ts"));
  const iKiem = lenh.findIndex((d) => d.includes("npm run check"));
  assert.ok(iSinh >= 0, "job build không còn bước sinh số liệu");
  assert.ok(iKiem >= 0, "job build không còn bước `npm run check`");
  assert.ok(
    iSinh < iKiem,
    `\`tao-so-lieu.ts\` (dòng lệnh ${iSinh}) phải chạy TRƯỚC \`npm run check\` (dòng lệnh ${iKiem}) — ngược lại thì guard đối chiếu tài liệu với số cũ, hai bên cùng cũ nên vẫn xanh`,
  );
});

test("tầng browser và tầng live chạy TAY, không chặn deploy", () => {
  /*
   * Cả hai đỏ được vì lý do KHÔNG phải lỗi sản phẩm. `soi-trinh-duyet.py` đã tự khai
   * điều đó từ trước: *"KHÔNG nằm trong CI, và cố ý như vậy"*. Bài này giữ quyết định
   * ấy bằng máy thay vì bằng trí nhớ.
   */
  for (const t of ["browser", "live-devnet"]) {
    assert.match(
      than(t),
      /if:\s*github\.event_name == 'workflow_dispatch'/,
      `job \`${t}\` phải chạy tay — đặt nó trên đường push là dạy người ta bỏ qua CI`,
    );
  }
  assert.doesNotMatch(
    than("deploy"),
    /needs:[^\n]*(browser|live-devnet)/,
    "deploy không được phụ thuộc hai tầng chạy tay",
  );
});

test("hai tầng chạy tay giữ bằng chứng KỂ CẢ khi đỏ", () => {
  /*
   * `if: always()` là cả điểm của bước upload. Thiếu nó, artifact chỉ còn khi job
   * xanh — tức đúng lúc không ai cần tới nó. Một probe đỏ mà không để lại gì thì
   * người đọc log phải chạy lại trên máy mình để biết chuyện gì.
   */
  for (const t of ["browser", "live-devnet"]) {
    const b = than(t);
    assert.match(b, /uses:\s*actions\/upload-artifact@v\d/, `job \`${t}\` thiếu upload-artifact`);
    const iUp = b.indexOf("upload-artifact");
    const truoc = b.slice(Math.max(0, iUp - 300), iUp);
    assert.match(
      truoc,
      /if:\s*always\(\)/,
      `job \`${t}\`: upload-artifact phải có \`if: always()\`, nếu không artifact mất đúng lúc cần nhất`,
    );
  }
});

test("KHÔNG secret nào ở tầng browser và tầng live", () => {
  /*
   * Thẻ I03 bước 3: *"không nắm khoá mainnet"*. Đây là tính chất kiểm được chứ không
   * phải lời hứa — endpoint đọc từ `hien-truong.json` là Devnet công cộng, và
   * `thu-tich-hop.mjs` không đọc một biến môi trường nào.
   */
  for (const t of ["browser", "live-devnet"]) {
    assert.doesNotMatch(than(t), /secrets\./, `job \`${t}\` dùng secret — thẻ I03 cấm`);
  }
  /*
   * Quét bản KHÔNG chú thích. Chú thích của chính workflow giải thích vì sao nó
   * không chạm mainnet — và một phép kiểm theo chuỗi không phân biệt "làm X" với
   * "nói rằng không làm X". Lỗi này đã mắc nhiều lần trong repo.
   */
  assert.doesNotMatch(
    KHONG_CHU_THICH,
    /mainnet/i,
    "workflow không được chạm mainnet ở bất kỳ tầng nào",
  );
});

test("bộ công cụ ghim ở MỌI job cài phụ thuộc", () => {
  /*
   * Runner từng lấy Node 24.19 trong khi máy dev là 24.12, và `npm ci` vỡ vì hai bản
   * npm dựng cây phụ thuộc khác nhau cho peerOptional native của `ws`. Một job mới
   * quên ghim sẽ gặp lại đúng lỗi đó, và thông báo `EUSAGE` không nói gì về nguyên nhân.
   */
  for (const t of TEN_JOB) {
    const b = than(t);
    if (!b.includes("npm ci")) continue; // job `deploy` không cài gì
    assert.match(b, /node-version:\s*"24\.12\.0"/, `job \`${t}\` không ghim Node 24.12.0`);
    assert.match(b, /npm@11\.6\.2/, `job \`${t}\` không ghim npm 11.6.2`);
  }
});

test("tầng browser ghim cả Python lẫn Playwright, và cài axe từ lockfile", () => {
  /*
   * *"0 vi phạm axe"* chỉ có nghĩa khi nói rõ axe NÀO và Chromium nào — bộ luật của
   * axe-core siết ngưỡng nhiều lần giữa các bản nhỏ. Ba thứ phải cùng ghim:
   * Playwright (kéo theo bản Chromium), Python, và axe-core qua `npm ci`.
   */
  const b = than("browser");
  assert.match(b, /python-version:\s*"3\.\d+"/, "tầng browser phải ghim Python");
  assert.match(b, /requirements\.txt/, "Playwright phải cài từ requirements.txt đã ghim");
  assert.match(b, /npm ci/, "cần `npm ci`: probe đọc `node_modules/axe-core` và so với bản ghim");

  const req = doc("scripts/kiem-trinh-duyet/requirements.txt");
  assert.match(req, /^playwright==\d+\.\d+\.\d+$/m, "requirements.txt phải ghim Playwright chính xác");
});

test("KHÔNG kéo gói không ghim lúc chạy", () => {
  /*
   * `npx --yes <gói>` lấy bản MỚI NHẤT tại thời điểm chạy. Bản đầu của tầng browser
   * dùng `npx --yes wait-on` để chờ hai server — một phụ thuộc không ghim lọt vào
   * đúng workflow mà mọi thứ khác đã ghim. Thay bằng vòng `curl`, vốn có sẵn.
   *
   * QUÉT BẢN KHÔNG CHÚ THÍCH, và đây không phải chi tiết nhỏ: chú thích trong chính
   * workflow kể lại rằng `npx --yes wait-on` đã bị thay. Quét cả file thì bài này đỏ
   * vì lời giải thích, không vì lệnh — tôi đã đo đúng điều đó (quét cả file: dòng
   * 258; bỏ chú thích: rỗng). Một guard đỏ vì lý do sai nguy hiểm ngang guard không
   * đỏ được: người sửa sẽ xoá lời giải thích thay vì sửa lệnh.
   */
  assert.doesNotMatch(
    KHONG_CHU_THICH,
    /npx\s+(--yes|-y)\b/,
    "`npx --yes` kéo bản mới nhất lúc chạy — ghim nó hoặc dùng công cụ có sẵn trên runner",
  );
});

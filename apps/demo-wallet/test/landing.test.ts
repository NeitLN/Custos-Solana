import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FIXTURE, dinhDangToken, layCa } from "../src/landing/sample.ts";
import { VI, EN } from "../src/landing/content.ts";

const GOC = fileURLToPath(new URL("../../../", import.meta.url));

/* ── Fixture phải khớp artifact gốc ───────────────────────────────────────── */

test("WEB-03 · fixture landing khớp ARTIFACT GỐC từng giá trị", () => {
  /*
   * Fixture là bản RÚT GỌN của `docs/review/demo-wow-20260918/scenarios.json`.
   * Rút gọn bằng tay thì sẽ trôi khỏi nguồn — bài này neo nó lại.
   *
   * Đọc artifact thật chứ không chép số vào đây: nếu cả hai cùng gõ tay thì hai
   * bản sai giống nhau và bài vẫn xanh.
   */
  const goc = JSON.parse(
    readFileSync(GOC + "docs/review/demo-wow-20260918/scenarios.json", "utf8"),
  ) as {
    measuredAt: string;
    sourceCommit: string;
    broadcast: boolean;
    cases: Array<{ name: string; result: Record<string, unknown> }>;
  };

  assert.equal(FIXTURE.nguonGoc.doLuc, goc.measuredAt, "thời điểm đo lệch nguồn");
  assert.equal(FIXTURE.nguonGoc.sourceCommit, goc.sourceCommit, "commit nguồn lệch");
  assert.equal(FIXTURE.nguonGoc.daGui, goc.broadcast, "trạng thái broadcast lệch");
  assert.equal(goc.broadcast, false, "artifact báo ĐÃ GỬI — nhãn trên web sẽ sai");

  for (const ca of FIXTURE.ca) {
    const g = goc.cases.find((c) => c.name === ca.tenTrongArtifact);
    assert.ok(g, `artifact không có ca "${ca.tenTrongArtifact}"`);

    const r = g.result as {
      level: string;
      reasonCodes: string[];
      diff: Array<{ label: string; before: string; after: string; soLieu?: Record<string, unknown>; sauDayDu?: string }>;
    };
    assert.equal(ca.level, r.level, `${ca.id}: level lệch`);
    assert.deepEqual(ca.reasonCodes, r.reasonCodes, `${ca.id}: reasonCodes lệch`);

    const dongSoDu = r.diff.find((d) => d.soLieu && "mint" in (d.soLieu ?? {}));
    assert.ok(dongSoDu?.soLieu, `${ca.id}: artifact không có dòng số dư`);
    assert.equal(ca.soDu.truoc, dongSoDu.soLieu["truoc"], `${ca.id}: số dư trước lệch`);
    assert.equal(ca.soDu.sau, dongSoDu.soLieu["sau"], `${ca.id}: số dư sau lệch`);
    assert.equal(ca.soDu.decimals, dongSoDu.soLieu["decimals"], `${ca.id}: decimals lệch`);

    const dongChu = r.diff.find((d) => d.label.includes("Chủ sở hữu"));
    if (ca.doiChu === null) {
      assert.equal(dongChu, undefined, `${ca.id}: fixture nói KHÔNG đổi chủ nhưng artifact có dòng đó`);
    } else {
      assert.ok(dongChu, `${ca.id}: fixture nói CÓ đổi chủ nhưng artifact không có dòng đó`);
      assert.equal(ca.doiChu.sauDayDu, dongChu.sauDayDu, `${ca.id}: địa chỉ đầy đủ lệch`);
    }
  }
});

test("WEB-03 · hai ca A/B để lại CÙNG số dư — đó là toàn bộ điểm nhớ", () => {
  /*
   * Nếu hai ca khác số dư thì câu "cùng chuyển 10 token, khác quyền kiểm soát"
   * không còn đúng, và cả trang mất lý do tồn tại.
   */
  const a = layCa("a");
  const b = layCa("b");
  assert.equal(a.soDu.sau, b.soDu.sau, "hai ca khác số dư sau — tiêu đề trang sẽ sai");
  assert.equal(a.soDu.truoc, b.soDu.truoc);
  assert.notEqual(a.level, b.level, "hai ca cùng level — không có gì để đối chiếu");
});

test("WEB-03 · ca A KHÔNG mang dữ kiện owner — không suy từ việc thiếu diff", () => {
  /*
   * Mục 6.5 cấm đích danh: *"Không suy before/after owner của A chỉ từ việc không
   * có `diff`."* Fixture phải để `null`, và `null` ở đây nghĩa là *không có thao
   * tác đổi chủ trong transaction mẫu* — một kết luận về cấu trúc, không phải một
   * phép đo.
   */
  assert.equal(layCa("a").doiChu, null);
  assert.deepEqual(layCa("a").reasonCodes, []);
});

test("WEB-03 · fixture tự khai KHÔNG đủ để replay", () => {
  assert.equal(FIXTURE.khongPhaiReceipt, true);
  assert.equal(FIXTURE.loai, "recorded-sample");
});

test("WEB-03 · fixture KHÔNG mang khoá, credential hay dữ liệu thừa", () => {
  const tho = JSON.stringify(FIXTURE);
  for (const cam of ["secretKey", "privateKey", "api-key", "apiKey", "seed", "mnemonic", "chanDoan"]) {
    assert.ok(!tho.includes(cam), `fixture công khai chứa \`${cam}\``);
  }
});

/* ── Format số theo locale ────────────────────────────────────────────────── */

test("WEB-03 · format số đúng theo locale, giữ đúng decimals", () => {
  assert.equal(dinhDangToken("490000000", 6, "vi"), "490,0");
  assert.equal(dinhDangToken("490000000", 6, "en"), "490.0");
  assert.equal(dinhDangToken("500000000", 6, "vi"), "500,0");

  // Số lẻ không bị làm tròn mất chữ số.
  assert.equal(dinhDangToken("1234567", 6, "en"), "1.234567");
  assert.equal(dinhDangToken("1000000", 6, "en"), "1.0");

  /*
   * Số vượt `Number.MAX_SAFE_INTEGER`.
   *
   * Đây là lý do hàm dùng `BigInt` chứ không chia dấu phẩy động: một phép chia
   * `Number` ở đây sai đúng chỗ người đọc đang kiểm tiền.
   */
  assert.equal(dinhDangToken("9007199254740993000000", 6, "en"), "9,007,199,254,740,993.0");
});

/* ── Nội dung VI/EN ───────────────────────────────────────────────────────── */

test("WEB-05 · bản EN có ĐỦ mọi key của bản VI", () => {
  /*
   * `tsc` đã cưỡng chế điều này qua kiểu, nhưng bài chạy thật bắt được cả trường
   * hợp ai đó thêm key bằng `as any` hoặc nới kiểu.
   */
  const duyet = (a: unknown, b: unknown, duong: string): void => {
    if (Array.isArray(a)) {
      assert.ok(Array.isArray(b), `${duong}: EN không phải mảng`);
      assert.equal(b.length, a.length, `${duong}: EN có ${b.length} mục, VI có ${a.length}`);
      a.forEach((x, i) => duyet(x, b[i], `${duong}[${i}]`));
      return;
    }
    if (a && typeof a === "object") {
      assert.ok(b && typeof b === "object", `${duong}: EN thiếu object`);
      for (const k of Object.keys(a)) {
        assert.ok(k in (b as object), `${duong}.${k}: EN THIẾU key`);
        duyet((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${duong}.${k}`);
      }
      return;
    }
    assert.equal(typeof b, typeof a, `${duong}: EN sai kiểu`);
    assert.ok(String(b).trim().length > 0, `${duong}: EN rỗng`);
  };
  duyet(VI, EN, "noiDung");
});

test("WEB-05 · bản EN dịch TRUNG THÀNH giới hạn, không nới thành lời bảo đảm", () => {
  /*
   * Mục 10: *"không đổi 'không phát hiện' thành 'fully secure'"*. Đây là chỗ một
   * bản dịch marketing hay trượt, và nó đổi hẳn nghĩa sản phẩm.
   */
  /*
   * Quét phần TRẢ LỜI và phần còn lại, KHÔNG quét câu hỏi FAQ.
   *
   * Bản đầu quét cả `EN` và đỏ ở "completely safe" — chuỗi đó nằm trong chính CÂU
   * HỎI *"Does 'no danger detected' mean a transaction is completely safe?"*, và
   * câu trả lời ngay dưới bắt đầu bằng "No." Một guard đọc câu hỏi rồi kết tội
   * câu trả lời là guard đỏ vì lý do sai.
   */
  const dapAn = EN.faq.muc.map((m) => m.dap).join(" ");
  const conLai = JSON.stringify({ ...EN, faq: undefined });
  const tho = (dapAn + " " + conLai).toLowerCase();

  for (const cam of ["fully secure", "100% safe", "guarantees safety", "completely safe", "always safe"]) {
    assert.ok(!tho.includes(cam), `bản EN có câu nới quá mức: "${cam}"`);
  }
  assert.match(EN.bangChung.gioiHan, /does not guarantee/i, "EN mất câu giới hạn");
  assert.match(EN.ab.giaTri.ketLuanA, /analyzed scope/i, "EN nới kết luận ca A");
});

test("WEB-02 · không có tuyên bố bịa trong CẢ HAI bản", () => {
  const tho = (JSON.stringify(VI) + JSON.stringify(EN)).toLowerCase();
  for (const cam of [
    "bảo mật tuyệt đối",
    "an toàn 100",
    "đã được audit",
    "đối tác chiến lược",
    "hàng nghìn người dùng",
    "trusted by",
    "audited by",
  ]) {
    assert.ok(!tho.includes(cam), `nội dung có tuyên bố chưa có căn cứ: "${cam}"`);
  }
});

/* ── Bundle và link ───────────────────────────────────────────────────────── */

test("WEB-06 · entry landing KHÔNG import bundle của ví", () => {
  /*
   * Mục 11.2: landing không được kéo `main.tsx`, `App.tsx`, core hay web3.js vào
   * đồ thị phụ thuộc ban đầu. Đo được bằng build (`CanhBao.js` 348KB nằm ở chunk
   * khác), nhưng guard đọc mã đỏ ngay ở `npm test` mà không cần build.
   */
  const duong = ["src/landing.tsx", "src/landing/LandingPage.tsx", "src/landing/Hero.tsx",
    "src/landing/ScenarioExplorer.tsx", "src/landing/Sections.tsx", "src/landing/SiteHeader.tsx",
    "src/landing/sample.ts", "src/landing/content.ts", "src/landing/links.ts"];

  for (const f of duong) {
    /*
     * Tìm trên chính DÒNG IMPORT, không quét cả file.
     *
     * Bản đầu quét văn bản (đã bỏ chú thích) và vẫn đỏ ở `Sections.tsx`: chuỗi
     * `@custos-solana/core` nằm trong ĐOẠN CODE MẪU hiển thị cho người đọc — một
     * template literal, không phải một import. Cùng bẫy đã mắc ở CU-25: guard
     * khớp phải thứ nó chỉ đang trích dẫn.
     */
    const dongImport = readFileSync(GOC + "apps/demo-wallet/" + f, "utf8")
      .split("\n")
      .filter((d) => /^\s*import\b/.test(d) || d.includes("require("))
      .join("\n");

    for (const cam of ["@solana/web3.js", "@custos-solana/core", "./App.tsx", "./main.tsx", "./style.css", "./polyfill"]) {
      assert.ok(!dongImport.includes(cam), `${f} import \`${cam}\` — landing sẽ kéo bundle ví`);
    }
  }
});

test("WEB-04 · mọi link nội bộ dựng từ BASE_URL, không gõ tay prefix", () => {
  const ma = readFileSync(GOC + "apps/demo-wallet/src/landing/links.ts", "utf8");
  assert.match(ma, /import\.meta\.env\.BASE_URL/, "links.ts không dùng BASE_URL");

  /*
   * Bỏ chú thích trước khi tìm: `links.ts` GIẢI THÍCH vì sao không gõ tay prefix,
   * nên chính chú thích đó chứa chuỗi bị cấm.
   */
  for (const f of ["links.ts", "Hero.tsx", "Sections.tsx", "SiteHeader.tsx", "ScenarioExplorer.tsx"]) {
    const noi = readFileSync(GOC + "apps/demo-wallet/src/landing/" + f, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "");
    assert.ok(!noi.includes("/Custos-Solana/"), `${f} gõ tay prefix production`);
  }
});

test("WEB-04 · link ngoài trỏ tới file CÓ THẬT trong repo", () => {
  /*
   * Mục 6.8: *"Không nối vào một `README#anchor` không tồn tại."*
   *
   * ĐỌC MÃ chứ không import `links.ts`: file đó dùng `import.meta.env.BASE_URL`
   * — một API của Vite mà Node không có, nên import nó ở đây ném
   * `Cannot read properties of undefined`. Bài này chỉ cần biết link trỏ đi đâu,
   * và điều đó đọc được từ nguồn.
   *
   * Bài không gọi mạng; nó kiểm phần đường dẫn NẰM TRONG repo.
   */
  const ma = readFileSync(GOC + "apps/demo-wallet/src/landing/links.ts", "utf8");

  for (const duong of [
    "packages/core/README.md",
    "docs/MA-TRAN-NANG-LUC.md",
    "docs/review/demo-wow-20260918/scenarios.json",
  ]) {
    assert.ok(ma.includes(duong), `links.ts không trỏ tới ${duong}`);
    assert.doesNotThrow(
      () => readFileSync(GOC + duong, "utf8"),
      `file được link KHÔNG tồn tại trong repo: ${duong}`,
    );
  }

  // URL repo phải khớp remote thật, không phải một tên tổ chức bịa.
  assert.ok(ma.includes("https://github.com/NeitLN/Custos-Solana"), "links.ts sai URL repo");
});

test("WEB-06 · HTML entry có metadata và no-JS fallback có link THẬT", () => {
  const html = readFileSync(GOC + "apps/demo-wallet/gioi-thieu.html", "utf8");

  assert.match(html, /<title>Custos — Hiểu giao dịch Solana trước khi ký<\/title>/);
  assert.match(html, /name="description"/, "thiếu meta description");
  /*
   * `theme-color` phải khớp NAVBAR THẬT, và navbar đã đổi.
   *
   * Bản trước ghim `#17132A` (navbar tím đậm). Sau khi đổi sang hệ xanh ngọc nền
   * sáng, navbar là `--custos-surface` = trắng, nên giá trị cũ sẽ tô thanh trạng
   * thái trình duyệt bằng một màu không còn tồn tại trên trang.
   *
   * Mục 7 của `DIEU-CHINH-UI-CUSTOS.md` liệt đích danh việc sửa test này.
   */
  assert.match(
    html,
    /name="theme-color" content="#FFFFFF"/,
    "theme-color không khớp navbar sáng hiện tại",
  );
  assert.ok(!html.includes("#17132A"), "còn sót màu tím của hướng thiết kế cũ");
  assert.match(html, /<noscript>/, "thiếu fallback no-JS");
  assert.match(html, /github\.com\/NeitLN\/Custos-Solana/, "fallback thiếu link repo thật");

  /*
   * KHÔNG có canonical/og:url tuyệt đối.
   *
   * Mục 13: canonical chỉ đặt sau khi xác định URL chuẩn. URL production chưa
   * được xác nhận đã deploy, nên một URL tuyệt đối ở đây sẽ là URL tự bịa.
   */
  // Bỏ chú thích HTML: phần giải thích VÌ SAO không đặt og:url có nhắc chính tên nó.
  const sach = html.replace(/<!--[\s\S]*?-->/g, "");
  assert.ok(!/rel="canonical"/.test(sach), "có canonical khi URL chuẩn chưa xác nhận");
  assert.ok(!/property="og:url"/.test(sach), "có og:url khi URL production chưa xác nhận");
});

/* ── UIR · hệ màu mới không lẫn màu của hướng cũ ──────────────────────────── */

test("UIR-01 · không còn màu/tên token của hướng thiết kế cũ", () => {
  /*
   * `DIEU-CHINH-UI-CUSTOS.md` mục 7: *"Không giữ `--landing-lilac`,
   * `--landing-lime` làm tên lâu dài rồi gán màu teal; tên token phải phản ánh
   * vai trò."* Và mục 0: *"Không chỉ đổi `lilac` thành xanh rồi giữ nguyên toàn
   * bộ cấu trúc."*
   *
   * Bài này canh cả hai: màu hex cũ KHÔNG còn, và tên token theo màu cũng không.
   */
  /*
   * BỎ CHÚ THÍCH TRƯỚC KHI TÌM.
   *
   * Bản đầu quét văn bản thô và đỏ với `--landing-lilac` — chuỗi đó nằm trong
   * chính CHÚ THÍCH của `brand-tokens.css`, đoạn giải thích vì sao KHÔNG dùng
   * tên đó nữa. Đây là lần thứ tư tôi mắc đúng bẫy "guard khớp phải chú thích
   * của chính nó" đã ghi trong `BAN-GIAO-CHO-CODEX.md`.
   */
  const boChuThich = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
  const css = boChuThich(readFileSync(GOC + "apps/demo-wallet/src/landing/landing.css", "utf8"));
  const tokens = boChuThich(
    readFileSync(GOC + "apps/demo-wallet/src/landing/brand-tokens.css", "utf8"),
  );

  for (const cu of ["#17132A", "#B9A3F3", "#D5F45B", "#F6F2E8", "#211E2E"]) {
    assert.ok(
      !css.toUpperCase().includes(cu) && !tokens.toUpperCase().includes(cu),
      `còn màu của hướng cũ: ${cu}`,
    );
  }
  for (const ten of ["--landing-lilac", "--landing-lime", "--landing-night", "--landing-paper"]) {
    assert.ok(!css.includes(ten) && !tokens.includes(ten), `còn token theo màu cũ: ${ten}`);
  }

  // Và hard shadow đặc trưng của mẫu cũ cũng phải biến mất.
  for (const bong of ["7px 7px 0", "4px 4px 0", "3px 3px 0"]) {
    assert.ok(!css.includes(bong), `còn hard shadow của mẫu cũ: ${bong}`);
  }
});

test("UIR-01 · token màu tách riêng, chỉ chứa BIẾN", () => {
  /*
   * Mục 6: *"Ưu tiên thêm `brand-tokens.css` **chỉ chứa biến màu**."* Lý do là
   * ví và Inspector phải import được bảng màu mà không kéo theo layout của
   * landing — nếu file này mang rule layout thì import nó là nhận side effect.
   */
  const tokens = readFileSync(GOC + "apps/demo-wallet/src/landing/brand-tokens.css", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  // Chỉ được có đúng một khối `:root`, không selector nào khác.
  const selector = [...tokens.matchAll(/^\s*([^@\s/][^{]*)\{/gm)].map((m) => m[1]!.trim());
  assert.deepEqual(selector, [":root"], `token file có selector ngoài :root: ${selector.join(", ")}`);

  for (const cam of ["display:", "padding:", "margin:", "grid-template", "position:"]) {
    assert.ok(!tokens.includes(cam), `brand-tokens.css có thuộc tính layout: ${cam}`);
  }

  // Mọi token đều mang tiền tố vai trò `--custos-`.
  const bien = [...tokens.matchAll(/--([a-z-]+):/g)].map((m) => m[1]!);
  assert.ok(bien.length >= 12, `chỉ có ${bien.length} token`);
  for (const b of bien) {
    assert.ok(b.startsWith("custos-"), `token không theo tiền tố vai trò: --${b}`);
  }
});

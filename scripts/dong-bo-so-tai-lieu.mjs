/**
 * ĐỒNG BỘ SỐ TRONG TÀI LIỆU THEO `so-lieu.json`.
 *
 *   node --experimental-strip-types scripts/tao-so-lieu.ts   # đo lại
 *   node scripts/dong-bo-so-tai-lieu.mjs                     # rồi chép số sang tài liệu
 *
 * Vì sao cần: `claim.test.ts` cho biết tài liệu ĐÃ LỆCH, nhưng sửa tay thì phải mò
 * ba file và dễ sót — chính là lỗi đã xảy ra: một vòng tìm-thay neo theo cụm chữ
 * `250 test` bỏ lọt cả `**250**` trong bảng README lẫn `(250)` trong pitch, im lặng.
 *
 * Script này thay theo VỊ TRÍ DÒNG (mốc regex) chứ không theo cụm chữ, nên số viết
 * kiểu nào cũng bị thay đúng. Nó chỉ đụng những con số có nguồn trong `so-lieu.json`.
 */
import { readFileSync, writeFileSync } from "node:fs";

const S = JSON.parse(readFileSync("apps/demo-wallet/public/so-lieu.json", "utf8"));

// CHẠY MỘT MÌNH LÀ SAI THỨ TỰ, và tôi đã mắc đúng lỗi này hai lần: script chép số
// TỪ `so-lieu.json` sang tài liệu, nên nếu file đó chưa đo lại thì nó chỉ đồng bộ
// tài liệu về một con số đã cũ. Máy vẫn xanh (hai bên cùng cũ), CI mới đỏ — vì CI
// đo lại trước rồi mới so.
//
// Dùng `npm run so-lieu`: nó chạy đo rồi mới chạy đồng bộ.
if (!process.argv.includes("--da-do")) {
  console.warn("⚠ Chạy `npm run so-lieu` thay vì gọi thẳng script này.");
  console.warn("  Chưa đo lại thì đây chỉ đồng bộ tài liệu về một con số CŨ.");
  console.warn("");
}
const { mauDoDuoc: DO, mauTrongCohort: TONG, coveragePhanTram: COV, chamTaiSan: CT } = S.cohort;
const CT_PT = Math.round((CT.hieu * 100) / CT.tong);

/*
 * SỐ LUẬT CÓ CẶP ĐỐI CHỨNG — đếm được, nên không được gõ tay.
 *
 * Ba tài liệu từng ghi cứng "9 luật", kèm cả danh sách "(1, 2, 4, 8, 12)" năm luật
 * còn thiếu. Khi năm ca đối chứng đó được dựng, cả ba câu sai cùng lúc — và không
 * guard nào biết, vì không ai đọc `soLuatCoCapDoiChung` cùng với chúng.
 */
const CAP = S.soLuatCoCapDoiChung ?? 0;
const THIEU_CAP = S.soLuat - CAP;

// Số tích hợp và NGÀY đo nó — cả hai từ `so-lieu.json`, không gõ tay.
const GIAY = String(S.tichHop?.giayDenKetQuaDau ?? "").replace(".", ",");
// Dải đo và số lượt — để câu chữ nói đúng con số là trung vị của bao nhiêu lượt.
const KQ_TH = JSON.parse(readFileSync("data/tich-hop/ket-qua.json", "utf8"));
// SHA và trạng thái của lượt đo GẦN NHẤT. Báo cáo kiểm chứng từng ghi tay `01f5112`
// trong khi bằng chứng đã sang `55734e8` — đúng loại lệch mà chính trang đó tồn tại
// để bắt, và nó tự mắc.
const TH_SHA = (KQ_TH.lastAttempt?.sourceCommit ?? "").slice(0, 7);
const TH_DAT = KQ_TH.lastAttempt?.dat === true;
const SO_LUOT = S.tichHop?.soLuotDo ?? 1;
// Chuỗi đo trải qua nhiều bản dựng thì phải nói ra — gộp im lặng là ngụ ý cùng một bản.
const SO_COMMIT = S.tichHop?.soCommitDo ?? 1;
const CUM_LUOT = SO_COMMIT > 1 ? `${SO_LUOT} lượt trên ${SO_COMMIT} bản dựng` : `${SO_LUOT} lượt`;
const DAI =
  S.tichHop?.giayThapNhat != null && S.tichHop?.giayCaoNhat != null
    ? `${String(S.tichHop.giayThapNhat).replace(".", ",")}–${String(S.tichHop.giayCaoNhat).replace(".", ",")}`
    : null;

const NGAY_PASS = (() => {
  const t = S.tichHop?.ngayPass;
  if (!t) return null;
  const [nam, thang, ngay] = t.slice(0, 10).split("-");
  return `${ngay}/${thang}/${nam}`;
})();
/*
 * KHÔNG RẢI SỐ VÔ NGHĨA VÀO TÀI LIỆU CÔNG KHAI.
 *
 * `CT_PT` là `Math.round(0 * 100 / 0)` khi cohort không đo được mẫu nào — tức là
 * `NaN`. Chuyện đã xảy ra thật: một lượt đo hỏng ghi ra hồ sơ toàn số 0, script này
 * đọc và viết "**NaN % (0/0)**" vào bảng giới hạn trong README của gói core — đúng
 * tài liệu mà bên tích hợp đọc để quyết định có dùng SDK không.
 *
 * Nguồn đã được vá (`do-cohort.ts` không ghi hồ sơ 0 mẫu nữa), nhưng chặn ở đây
 * nữa vì đây là cửa cuối trước khi con số thành chữ trong tài liệu.
 */
for (const [ten, gt] of [
  ["coveragePhanTram", COV],
  ["mauDoDuoc", DO],
  ["mauTrongCohort", TONG],
  ["chạm tài sản %", CT_PT],
  ["test.pass", S.test?.pass],
]) {
  if (!Number.isFinite(gt)) {
    console.error(`✖ ${ten} = ${gt} — KHÔNG đồng bộ tài liệu.`);
    console.error("  Số này vô nghĩa, thường là dấu hiệu một lượt đo hỏng (0 mẫu).");
    console.error("  Chạy lại phép đo cho ra số thật rồi mới đồng bộ.");
    process.exit(1);
  }
}


/** Thay dòng khớp `moc` bằng `dung(dòng cũ)`. Vắng mốc là lỗi: tài liệu đã đổi cấu trúc. */
function thayDong(duong, viec) {
  const dong = readFileSync(duong, "utf8").split("\n");
  let doi = 0;
  for (const [moc, dung] of viec) {
    /*
     * SỬA MỌI DÒNG KHỚP, KHÔNG CHỈ DÒNG ĐẦU.
     *
     * Bản trước dùng `findIndex`: một mốc khớp hai dòng thì dòng thứ hai giữ số cũ,
     * và không có gì báo. Tài liệu khi đó mang HAI con số cho cùng một phép đo —
     * người đọc gặp cái nào trước thì tin cái đó.
     */
    const chiSo = dong.map((d, k) => (moc.test(d) ? k : -1)).filter((k) => k !== -1);
    if (chiSo.length === 0) throw new Error(`${duong}: không còn dòng khớp ${moc} — sửa script, đừng bỏ qua`);
    for (const i of chiSo) {
      const moi = dung(dong[i]);
      if (moi !== dong[i]) {
        dong[i] = moi;
        doi++;
      }
    }
  }
  writeFileSync(duong, dong.join("\n"));
  console.log(`  ${duong}: ${doi} dòng đổi`);
}

console.log(`nguồn: ${S.test.pass} test · ${S.soMau} mẫu · coverage ${COV}% trên ${DO}/${TONG} · chạm tài sản ${CT.hieu}/${CT.tong}`);

// `vi-du-tich-hop/README.md` là surface thứ hai công bố số đo tích hợp. Bản trước
// gõ tay và nó tụt lại 10,8 giây / 1 247 ms trong khi phép đo đã cho 6,9 / 966.
const TH = S.tichHop;
if (TH) {
  thayDong("vi-du-tich-hop/README.md", [
    [/^\| Cài đặt → kết quả đầu tiên \|/, (d) => d.replace(/\*\*[\d,]+ giây\*\*/, `**${String(TH.giayDenKetQuaDau).replace(".", ",")} giây**`)],
    [/^\| Dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${TH.dongMa}**`)],
    [/^\| Một lượt `inspect\(\)` \|/, (d) => d.replace(/\*\*[\d\s]+ ms\*\*/, `**${TH.msMotLuot} ms**`)],
  ]);

  // README gốc công bố CÙNG ba con số ở hai chỗ. Bản trước sửa tay và lệch lại sau
  // mỗi lượt đo — hai lần liên tiếp. Số đo thì đổi mỗi lần chạy; chỗ duy nhất được
  // phép gõ tay là không chỗ nào.
  const giay = String(TH.giayDenKetQuaDau).replace(".", ",");
  thayDong("README.md", [
    [/^\| Cài đặt → kết quả đầu tiên \|/, (d) => d.replace(/\*\*[\d,]+ giây\*\*/, `**${giay} giây**`)],
    // README chỉ giữ bảng tích hợp; câu hỏi cũ lặp số đã được bỏ.
    [/^\| Một lượt kiểm tra \|/, (d) => d.replace(/\*\*\d+ ms\*\*[^|]*/, `**${TH.msMotLuot} ms** — trung vị ${CUM_LUOT} `)],
    [/^\| Dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${TH.dongMa}**`)],
  ]);
}

thayDong("README.md", [
  [/^npx npm@[\d.]+ run check /, (d) => d.replace(/# typecheck \+ \d+ test/, `# typecheck + ${S.test.pass} test`)],
  [/^\| Test \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.test.pass}**`)],
  [/^\| Mẫu trong bộ dữ liệu \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
  // Bảng "bốn loại bằng chứng" nhắc lại hai con số. Không neo thì chúng trôi, và
  // một README nói 330 test ở chỗ này, 412 ở chỗ kia là README không đáng đọc.
  [/^\| \*\*\d+ test\*\* tự động \|/, (d) => d.replace(/\*\*\d+ test\*\*/, `**${S.test.pass} test**`)],
  [/^\| \*\*\d+ mẫu\*\* đã gắn nhãn \|/, (d) => d.replace(/\*\*\d+ mẫu\*\*/, `**${S.soMau} mẫu**`)],
  // README còn công bố "6/6 bẫy" trong khi artifact, trang số liệu, release notes và
  // hai báo cáo đều ghi 13/13. 6/6 là bộ bẫy của một lượt đo CŨ; để nguyên thì người
  // đọc README tưởng bộ đối kháng nhỏ hơn thực tế hơn gấp đôi.
  /*
   * HAI CON SỐ, KHÔNG PHẢI MỘT.
   *
   * "13/13 bẫy bị chặn" một mình không phân biệt được bộ chắn hoạt động với bộ chắn
   * vứt sạch mọi đầu ra mô hình — cả hai cùng cho 13/13, và con số ấy xanh NHẤT đúng
   * lúc lớp AI hỏng nhất. Đối chứng dương phải đi kèm ở mọi chỗ công bố.
   */
  [/^\| \*\*Đánh giá AI\*\* — \d+\/\d+ bẫy bị chặn/, (d) =>
    d
      .replace(/\d+\/\d+ bẫy bị chặn(, \d+\/\d+ câu đúng đi qua)?/,
        `${S.evalAi.soBayChanDuoc}/${S.evalAi.soBay} bẫy bị chặn` +
        (S.evalAi.soDoiChung ? `, ${S.evalAi.soDoiChungQua}/${S.evalAi.soDoiChung} câu đúng đi qua` : ""))],
  /*
   * BẢNG RUBRIC TECHNICAL nhắc lại `inspect()` một lần nữa — và nó ĐÃ TRÔI.
   *
   * Sáu chỗ khác trong repo ghi 656 ms; dòng này ở lại 664 vì nó không có mốc, và nó
   * nằm trong CÙNG file README với dòng "Một lượt kiểm tra | **656 ms**" cách đó 49
   * dòng. Một README tự mâu thuẫn với chính nó ở hai dòng cùng nói một phép đo là
   * README không đáng đọc — đúng câu chú thích ở đầu khối này đã viết cho `330 test`.
   *
   * Thêm mốc riêng thay vì gộp: dòng 30 % và dòng 25 % mang những con số khác nhau,
   * và một `.replace` chung sẽ phải đoán con số nào thuộc dòng nào.
   */
  [/^\| \*\*25 %\*\* Solana stack · hiệu năng \|/, (d) =>
    d.replace(/`inspect\(\)` \*\*\d+ ms\*\*/, `\`inspect()\` **${S.tichHop.msMotLuot} ms**`)],
  [/^\*\*330 tests\*\*|^Measured, not estimated/, (d) => d.replace(/\*\*\d+ tests\*\*/, `**${S.test.pass} tests**`).replace(/\*\*\d+ labelled samples\*\*/, `**${S.soMau} labelled samples**`)],
]);

/*
 * ĐỘ TRỄ PHÍA NGƯỜI DÙNG — ba chỗ công bố, trước nay KHÔNG chỗ nào có neo.
 *
 * Đó là lý do bộ số này trôi HAI lần: `~850 ms` (trung vị 4 lượt sau khi bỏ lượt đầu)
 * sống tới tận P01, rồi bản sửa của P01 (1596/3874/3877) lại lạc hậu ngay sau lượt đo
 * kế tiếp — 15/09 cho p95 quan sát 5359 ms và cao nhất 8896 ms.
 *
 * Sửa tay lần thứ ba chỉ dời thời điểm trôi. Ba dòng dưới đây nay đọc từ
 * `so-lieu.json` như mọi con số công khai khác.
 */
if (S.hieuNang) {
  const H = S.hieuNang;
  const vi = (n) => String(n).replace(".", ",");
  thayDong("docs/HIEU-NANG.md", [
    [/^\| Trung vị \(cả \d+ lượt\) \|/, (d) => d.replace(/\*\*[\d.]+ ms\*\*/, `**${H.trungViMs} ms**`)],
    [/^\| \*\*Percentile 95 quan sát\*\* \|/, (d) => d.replace(/\*\*[\d.]+ ms\*\*/, `**${H.p95QuanSatMs} ms**`)],
    [/^\| Cao nhất \|/, (d) => d.replace(/\*\*[\d.]+ ms\*\*/, `**${H.caoNhatMs} ms**`)],
    [/^\| Dao động \(max\/min\) \|/, (d) => d.replace(/\*\*[\d,]+×\*\*/, `**${vi(H.daoDong)}×**`)],
  ]);
  thayDong("README.md", [
    [/^\| \*\*20 %\*\* demo và trình bày \|/, (d) =>
      d
        .replace(/FCP \*\*\d+ ms\*\*/, `FCP **${H.fcpNguoiMs} ms**`)
        .replace(/bấm→thẻ \*\*n=\d+\*\*/, `bấm→thẻ **n=${H.soMau}**`)
        .replace(/trung vị \*\*[\d.]+ ms\*\*/, `trung vị **${H.trungViMs} ms**`)
        .replace(/p95 quan sát \*\*[\d.]+ ms\*\*/, `p95 quan sát **${H.p95QuanSatMs} ms**`)],
  ]);
  thayDong("docs/adr/0001-doi-huong-technical-build.md", [
    [/^\| Bấm → thẻ kết quả \|/, (d) =>
      d
        .replace(/\*\*n=\d+\*\*/, `**n=${H.soMau}**`)
        .replace(/\d+ lượt hỏng/, `${H.luotHong} lượt hỏng`)
        .replace(/trung vị \*\*[\d.]+ ms\*\*/, `trung vị **${H.trungViMs} ms**`)
        .replace(/p95 quan sát \*\*[\d.]+ ms\*\*/, `p95 quan sát **${H.p95QuanSatMs} ms**`)
        .replace(/dải \*\*[\d.]+–[\d.]+ ms\*\*/, `dải **${H.thapNhatMs}–${H.caoNhatMs} ms**`)
        .replace(/dao động [\d,]+×/, `dao động ${vi(H.daoDong)}×`)],
  ]);
}

// CLAUDE.md đứng ngoài mọi vòng dọn dẹp trước vì không ai nghĩ nó là "tài liệu công
// khai" — nhưng nó là thứ mọi phiên làm việc đọc đầu tiên, nên số cũ ở đây lan ra
// khắp nơi khác.
//
// AGENTS.md là bản sao cùng nội dung cho agent khác (Codex). Bỏ nó ra ngoài thì mỗi
// lượt đồng bộ để lại một con số test cũ đúng ở chỗ agent kia đọc đầu tiên — đã xảy
// ra 25/09 (F-14).
for (const tep of ["CLAUDE.md", "AGENTS.md"]) thayDong(tep, [
  // Dòng này mang HAI con số. Bản trước chỉ đồng bộ số test, nên `soMau` ở đây tụt
  // lại 33 trong khi artifact và README đã 38 — đúng một dòng, hai claim, một cái
  // được canh và một cái không.
  [/^hiện trường devnet thật ·/, (d) =>
    d.replace(/· \d+ test/, `· ${S.test.pass} test`).replace(/· \d+ mẫu dữ liệu/, `· ${S.soMau} mẫu dữ liệu`)],
]);

/*
 * docs/SEED-DATASET.md hoàn toàn nằm ngoài vòng đồng bộ cho tới giờ.
 *
 * Hai dòng dưới đây đều là claim HIỆN HÀNH, không phải số lịch sử: một dòng tự nói
 * "dataset hiện tại có N mẫu", dòng kia là câu soạn sẵn ĐỂ NÓI TRÊN SÂN KHẤU. Cái
 * thứ hai nguy hiểm hơn hẳn — một con số cũ trong tài liệu thì người đọc còn đối
 * chiếu được, còn một con số cũ đọc trước giám khảo thì không rút lại được.
 *
 * Con số "25 mẫu" ở cùng khu vực KHÔNG đụng tới: nó là mục tiêu kế hoạch ban đầu và
 * chính đoạn đó nói rõ như vậy. Đồng bộ nó lên 38 là viết lại lịch sử.
 */
thayDong("docs/SEED-DATASET.md", [
  [/^> hiện tại có \*\*\d+ mẫu\*\*/, (d) => d.replace(/\*\*\d+ mẫu\*\*/, `**${S.soMau} mẫu**`)],
  [/^> \*"\d+ luật, \d+ mẫu kiểm thử/, (d) =>
    d.replace(/\d+ luật, \d+ mẫu kiểm thử/, `${S.soLuat} luật, ${S.soMau} mẫu kiểm thử`)],
]);

// PITCH tự nói "có test canh" về số lỗ hổng — nhưng nó KHÔNG nằm trong danh sách
// canh, nên nó tụt lại 9/3-high trong khi audit đã cho 11/5. Một câu khẳng định có
// guard mà thật ra không có guard là dạng sai tệ nhất: nó tắt luôn sự nghi ngờ.
const LH = JSON.parse(readFileSync("data/seed/lo-hong.json", "utf8"));
thayDong("docs/PITCH-VA-PHAN-BIEN.md", [
  [/^`npm audit` cho \d+ lỗ hổng/, (d) =>
    d.replace(/\d+ lỗ hổng \(\d+ high, \d+ moderate\)/, `${LH.tong} lỗ hổng (${LH.theoMucDo.high} high, ${LH.theoMucDo.moderate} moderate)`)],
  [/Unit\/integration \(\d+\)/, (d) => d.replace(/Unit\/integration \(\d+\)/, `Unit/integration (${S.test.pass})`)],
  // Số test còn nằm trong TIÊU ĐỀ một câu Q&A và trong câu mở của nó. Thiếu hai
  // dòng này thì guard bắt được lệch nhưng không ai sửa được bằng một lệnh —
  // đúng chuyện vừa xảy ra: thêm guard mà quên thêm đường đồng bộ.
  [/^### \d+\. ".* test chứng minh/, (d) => d.replace(/"\d+ test/, `"${S.test.pass} test`)],
  [/^Cái bẫy tự khen\./, (d) => d.replace(/khen\. \d+ test/, `khen. ${S.test.pass} test`)],
  // Chỗ thứ BA trong cùng một file — guard tìm ra, script thì chưa với tới.
  [/^> Câu nói được: \*"Chúng em có bốn loại/, (d) => d.replace(/\d+ test/, `${S.test.pass} test`)],
]);

/*
 * DÒNG PITCH LÀ THỨ ĐƯỢC ĐỌC TO TRƯỚC HỘI ĐỒNG.
 *
 * Nó mang "6,9 giây" trong khi mọi nguồn khác đã sang 7,2 rồi 9,9 — không neo nào
 * với tới, vì câu văn nằm giữa một ô bảng dài. Số sai trên pitch đắt hơn cùng số
 * đó trong README: không ai kịp tra lại khi đang nghe.
 */
if (GIAY) {
  thayDong("docs/PITCH-VA-PHAN-BIEN.md", [
    [
      /^\| \*\*2:00–2:30\*\*/,
      (d) =>
        d
          .replace(/[\d,]+ giây từ `npm install`/, `${GIAY} giây từ \`npm install\``)
          .replace(/\d+ dòng mã\./, `${TH.dongMa} dòng mã.`),
    ],
  ]);
}

// Câu "30 dòng, đọc hết được" nằm ngay trong README của chính ví dụ tích hợp — chỗ
// người tích hợp đọc trước khi quyết định thử. Con số này do `dem-dong.mjs` đo từ
// chính file đó, nên gõ tay là bảo đảm sẽ lệch.
//
// MỐC NÀY ĐÃ GÃY MỘT LẦN, và cách nó gãy đáng ghi lại. TB-I02 đưa hợp đồng ký sang
// `ky.js`, nên câu cũ — "Tất cả nằm trong `src/tich-hop.js`" — thành SAI và bị viết
// lại. Câu mới không khớp mốc nữa, script ném lỗi giữa chừng SAU KHI đã ghi
// `README.md` gốc: một lượt đồng bộ ghi được nửa chừng.
//
// Script làm đúng (nó ném thay vì im lặng bỏ qua). Thứ thiếu là `NEO_DONG_BO` của
// `claim.test.ts` không có dòng này, nên `npm run check` vẫn xanh trong khi mốc đã
// chết — chỉ người chạy `npm run so-lieu` mới biết. Đã thêm neo cùng lúc với sửa này.
//
// Mốc mới bám "nằm trong `src/tich-hop.js` — **N dòng**" thay vì bám chữ mở đầu câu:
// phần đầu câu là văn xuôi và sẽ còn được viết lại, phần này là chỗ con số thật sống.
if (TH?.dongMa) {
  thayDong("vi-du-tich-hop/README.md", [
    [
      /nằm trong `src\/tich-hop\.js` — \*\*\d+ dòng\*\*/,
      (d) => d.replace(/— \*\*\d+ dòng\*\*/, `— **${TH.dongMa} dòng**`),
    ],
  ]);
}

/*
 * BANG-CLAIM.md phải tự tuân quy tắc nó viết ra.
 *
 * Trang đó nói "chỗ duy nhất được phép gõ tay là không chỗ nào" — rồi tự gõ tay bốn
 * con số, và trôi mất hai trong số đó chỉ sau một phiên (436 test khi thực tế 451;
 * 7,2 giây khi thực tế 7,7). Một trang canh tính nhất quán mà tự lệch thì nó là ví
 * dụ ngược cho chính luận điểm của nó.
 */
/*
 * BẢNG BẰNG CHỨNG RUBRIC — thêm 13/09 sau khi nó trôi ngay trong phiên viết ra nó.
 *
 * README mục "Bằng chứng kỹ thuật" và ADR-0001 mục 4 đều gõ tay số test. Chưa đầy
 * một giờ sau, `npm run check` thêm 10 bài và cả hai chỗ nói 556 trong khi thực tế
 * 566 — đúng hình dạng T04-c, lặp lại trong chính tài liệu vừa viết để chống nó.
 *
 * Sửa tay hai chỗ đó là đặt hẹn giờ cho lần lệch sau. Đưa vào đây, và vào
 * `NEO_DONG_BO` của `claim.test.ts`, thì lần sau nó tự đổi.
 */
thayDong("README.md", [
  [/^\| \*\*30 %\*\* độ khó và chiều sâu \|/, (d) =>
    d.replace(/\*\*\d+\*\* test(?: offline)?/, `**${S.test.pass}** test`)
     .replace(/\*\*\d+\*\* luật L2/, `**${S.soLuat}** luật L2`)],
]);

/*
 * ADR-0002 ghi số test trong bảng tương thích. Bản đầu viết tay `654` và nó sai
 * ngay trong phiên viết — phép đo cho `661` sau khi thêm bảy bài guard cho chính
 * ADR đó. Một con số viết tay trong tài liệu kiến trúc là một con số sẽ lệch.
 */
thayDong("docs/adr/0002-chan-doan-tuy-chon.md", [
  [/^\| Bộ test \|/, (d) => d.replace(/\*\*\d+ pass/, `**${S.test.pass} pass`)],
]);

thayDong("docs/adr/0001-doi-huong-technical-build.md", [
  [/^\| Test tự động, offline \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.test.pass}**`)],
  // `msMotLuot` đổi mỗi lần chạy lại devnet — nó trôi ngay trong phiên viết ADR
  // (664 → 656 sau một lượt `thu-tich-hop`). Guard `adrTechnical.test.ts` bắt được,
  // nhưng cách sửa đúng là đưa vào đây chứ không gõ lại số.
  [/^\| Một lượt `inspect\(\)` \|/, (d) => d.replace(/\*\*\d+ ms\*\*/, `**${S.tichHop.msMotLuot} ms**`)],
  [/^\| Lượt gọi RPC mỗi lượt kiểm \|/, (d) =>
    d.replace(/trung vị \*\*[\d,]+\*\*/, `trung vị **${String(S.chiPhi.luotGoiRpc.trungVi).replace(".", ",")}**`)],
  [/^\| Luật L2, mỗi luật có ca dương/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soLuat}**`)],
  [/^\| Mẫu đã gắn nhãn \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
]);

thayDong("docs/BANG-CLAIM.md", [
  [/^\| Test tự động \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.test.pass}**`)],
  [/^\| Mẫu đã gắn nhãn \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
  [/^\| Luật L2 \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soLuat}**`)],
  [/^\| Bẫy đối kháng AI \|/, (d) =>
    d.replace(/\*\*\d+\/\d+\*\*/, `**${S.evalAi.soBayChanDuoc}/${S.evalAi.soBay}**`)],
  [/^\| \*\*Đối chứng dương\*\*/, (d) =>
    d.replace(/\*\*\d+\/\d+\*\*/, `**${S.evalAi.soDoiChungQua}/${S.evalAi.soDoiChung}**`)],
  ...(TH
    ? [
        [/^\| Cài từ ngoài repo tới kết quả đầu \|/, (d) =>
          d.replace(/\*\*[\d,]+ giây\*\*/, `**${String(TH.giayDenKetQuaDau).replace(".", ",")} giây**`)],
        [/^\| Một lượt `inspect\(\)` \|/, (d) => d.replace(/\*\*\d+ ms\*\*/, `**${TH.msMotLuot} ms**`)],
        [/^\| Dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${TH.dongMa}**`)],
      ]
    : []),
]);

/*
 * NGÀY ĐO ĐI KÈM SỐ ĐO.
 *
 * Đây là số mạng công cộng: cùng một bài chạy ba lượt ra 7,2 · 9,9 · 9,9 giây. Một
 * con số trần không kèm ngày đọc như hằng số của sản phẩm, trong khi nó là một lần
 * rút thăm. `ngayPass` đến từ lượt PASS gần nhất trong bằng chứng tích hợp.
 */
if (NGAY_PASS) {
  thayDong("README.md", [
    [
      /^\| Đo trên Devnet, /,
      (d) => d.replace(/Đo trên Devnet, \d{2}\/\d{2}\/\d{4}/, `Đo trên Devnet, ${NGAY_PASS}`),
    ],
  ]);
}

/*
 * SỐ HEADLINE PHẢI TỰ NÓI NÓ LÀ TRUNG VỊ CỦA BAO NHIÊU LƯỢT.
 *
 * "6,8 giây" đọc như một hằng số của sản phẩm. Ba lượt trên cùng một commit cho
 * 6,8 · 9,4 · 6,8 — lượt xấu nhất gần gấp rưỡi lượt tốt nhất. Giấu dải đo đi là
 * để người nghe tự suy ra một độ ổn định không có.
 */
if (GIAY && DAI) {
  thayDong("README.md", [
    [
      /^\| Cài đặt → kết quả đầu tiên \|/,
      () => `| Cài đặt → kết quả đầu tiên | **${GIAY} giây** — trung vị ${CUM_LUOT}, dải ${DAI} |`,
    ],
    [
      /^\| Một lượt kiểm tra \|/,
      () => `| Một lượt kiểm tra | **${S.tichHop.msMotLuot} ms** — trung vị ${CUM_LUOT} |`,
    ],
  ]);
  thayDong("vi-du-tich-hop/README.md", [
    [
      /^\| Cài đặt → kết quả đầu tiên \|/,
      () => `| Cài đặt → kết quả đầu tiên | **${GIAY} giây** — trung vị ${CUM_LUOT}, dải ${DAI} |`,
    ],
    [
      /^\| Một lượt `inspect\(\)` \|/,
      () => `| Một lượt \`inspect()\` | **${S.tichHop.msMotLuot} ms** — trung vị ${CUM_LUOT} |`,
    ],
  ]);
}

thayDong("README.md", [
  [
    /^\| Mẫu trong bộ dữ liệu \|/,
    () =>
      `| Mẫu trong bộ dữ liệu | **${S.soMau}** — cả ${S.soLuat} luật đều có mẫu kích hoạt; ` +
      (THIEU_CAP === 0
        ? `**cả ${CAP} luật** đều có thêm ca đối chứng gần giống, chỉ khác đúng điều kiện quyết định |`
        : `**${CAP} luật** có thêm ca đối chứng gần giống. ${THIEU_CAP} luật còn thiếu được kê tên kèm lý do trong \`packages/core/test/capLuat.test.ts\` |`),
  ],
]);

thayDong("docs/BAO-CAO-KIEM-CHUNG.md", [
  [
    /^\| Luật có ca đối chứng gần giống \|/,
    () =>
      `| Luật có ca đối chứng gần giống | **${CAP}/${S.soLuat}** | \`npm run check\` — ` +
      (THIEU_CAP === 0
        ? "mỗi cặp lệch đúng MỘT điều kiện quyết định |"
        : `${THIEU_CAP} luật thiếu được **kê tên kèm lý do** |`),
  ],
]);

thayDong("docs/BAO-CAO-TONG.md", [
  [
    /^\| Luật tất định \|/,
    () =>
      `| Luật tất định | **${S.soLuat}** — ` +
      (THIEU_CAP === 0 ? `cả ${CAP} luật đều có ca đối chứng gần giống |` : `${CAP} luật có ca đối chứng gần giống |`),
  ],
]);

thayDong("packages/core/README.md", [
  [
    /Coverage chưa đủ trên DeFi/,
    (d) =>
      d
        .replace(/trung bình \d+ ?%/, `trung bình ${COV} %`)
        .replace(/trên \d+\/\d+ giao dịch/, `trên ${DO}/${TONG} giao dịch`)
        .replace(/\*\*\d+ ?% \(\d+\/\d+\)\*\*/, `**${CT_PT} % (${CT.hieu}/${CT.tong})**`),
  ],
  [/^npx npm@[\d.]+ run check /, (d) => d.replace(/# \d+ test/, `# ${S.test.pass} test`)],
]);

/*
 * BÁO CÁO TỔNG CŨNG PHẢI CHẢY TỪ CÙNG MỘT NGUỒN.
 *
 * Nó là trang đầu tiên người mới đọc. Một tài liệu tóm tắt mang số cũ còn sai hơn
 * tài liệu chi tiết mang số cũ, vì nó là thứ được tin mà không kiểm.
 */
thayDong("docs/BAO-CAO-TONG.md", [
  [/^\| Test tự động \|/, (d) => d.replace(/\*\*\d+\*\* pass/, `**${S.test.pass}** pass`)],
  [/^\| Luật tất định \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soLuat}**`)],
  [/^\| Mẫu kiểm thử gắn nhãn \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
  [
    /^\| Bẫy đối kháng AI bị chặn \|/,
    (d) =>
      d.replace(
        /\*\*\d+\/\d+\*\*( · \d+\/\d+ đối chứng qua)?/,
        `**${S.evalAi.soBayChanDuoc}/${S.evalAi.soBay}**` +
          (S.evalAi.soDoiChung ? ` · ${S.evalAi.soDoiChungQua}/${S.evalAi.soDoiChung} đối chứng qua` : ""),
      ),
  ],
  [
    /^\| Tích hợp từ ngoài monorepo \|/,
    (d) =>
      d
        .replace(/\*\*[\d,.]+ giây\*\*/, `**${String(S.tichHop.giayDenKetQuaDau).replace(".", ",")} giây**`)
        .replace(/\*\*\d+ dòng\*\*/, `**${S.tichHop.dongMa} dòng**`)
        .replace(/\*\*\d+ ms\*\*/, `**${S.tichHop.msMotLuot} ms**`),
  ],
  [/^npm run check /, (d) => d.replace(/# \d+ test/, `# ${S.test.pass} test`)],
]);

/*
 * BÁO CÁO KIỂM CHỨNG LÀ TRANG NGƯỜI CHẤM MỞ RA ĐỂ ĐỐI CHIẾU.
 *
 * Nó liệt kê số kèm LỆNH tự kiểm. Một con số cũ ở đây tệ hơn ở bất kỳ đâu khác:
 * người đọc chạy lệnh, thấy lệch, và kết luận đúng rằng repo nói sai về chính mình.
 */
thayDong("docs/BAO-CAO-KIEM-CHUNG.md", [
  [
    /^- Bằng chứng tích hợp đo tại: /,
    () =>
      `- Bằng chứng tích hợp đo tại: \`${TH_SHA}\`, cây làm việc sạch — lượt gần nhất ${
        TH_DAT ? "PASS" : "**HỎNG**"
      }`,
  ],
  [
    /^\| 1 \| Lượt tích hợp gần nhất pass hay fail\?/,
    () =>
      `| 1 | Lượt tích hợp gần nhất pass hay fail? | **${
        TH_DAT ? "PASS" : "HỎNG"
      }** tại \`${TH_SHA}\` | \`ket-qua.json\` → \`lastAttempt\` |`,
  ],
  [/^\| Test tự động \|/, (d) => d.replace(/\*\*\d+\*\* pass/, `**${S.test.pass}** pass`)],
  [/^\| Luật tất định \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soLuat}**`)],
  [/^\| Mẫu kiểm thử gắn nhãn \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.soMau}**`)],
  [
    /^\| Bẫy đối kháng AI bị chặn \|/,
    (d) =>
      d.replace(
        /\*\*\d+\/\d+\*\*( · \d+\/\d+ đối chứng qua)?/,
        `**${S.evalAi.soBayChanDuoc}/${S.evalAi.soBay}**` +
          (S.evalAi.soDoiChung ? ` · ${S.evalAi.soDoiChungQua}/${S.evalAi.soDoiChung} đối chứng qua` : ""),
      ),
  ],
  [
    /^\| Tích hợp từ ngoài monorepo \|/,
    (d) => d.replace(/\*\*[\d,]+ giây\*\*/, `**${GIAY} giây**`),
  ],
  [/^\| — một lượt `inspect\(\)` \|/, (d) => d.replace(/\*\*\d+ ms\*\*/, `**${S.tichHop.msMotLuot} ms**`)],
  [/^\| — dòng mã tích hợp \|/, (d) => d.replace(/\*\*\d+\*\*/, `**${S.tichHop.dongMa}**`)],
  [
    /^\| — dải đo \|/,
    () =>
      `| — dải đo | **${DAI} giây**, trung vị ${CUM_LUOT} | \`data/tich-hop/ket-qua.json\` → \`lichSuPass\` |`,
  ],
  [
    /^\| Phỏng vấn người dùng \*\*thật\*\* \|/,
    (d) =>
      d.replace(
        /\*\*\d+\*\* — \d+ đúng · \d+ một phần · \d+ sai/,
        `**${S.phongVan.n}** — ${S.phongVan.hieu.dung} đúng · ${S.phongVan.hieu.motPhan} một phần · ${S.phongVan.hieu.sai} sai`,
      ),
  ],
  [/^  \*\*382 test chứng minh|^- \*\*\d+ test chứng minh/, (d) => d.replace(/\d+ test/, `${S.test.pass} test`)],
]);

console.log("xong. Chạy `npm run check` để guard xác nhận.");

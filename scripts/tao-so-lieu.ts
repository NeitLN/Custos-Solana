/**
 * GOM MỌI CON SỐ CỦA DỰ ÁN VÀO MỘT FILE, để trang số liệu công khai đọc.
 *
 *   node --experimental-strip-types scripts/tao-so-lieu.ts
 *
 * Vì sao cần: mọi con số của đội đang nằm rải trong repo — kết quả cohort, chi
 * phí, số luật, số test, số mẫu. Giám khảo bấm link demo thì không thấy cái nào,
 * và phần lớn giám khảo sẽ không mở repo.
 *
 * VÌ SAO SINH RA CHỨ KHÔNG GÕ TAY: số gõ tay là số sẽ lệch sau hai lần sửa code
 * mà không ai nhận ra, và trên sân khấu thì đọc một con số đã lệch là đúng cái mà
 * thể lệ gọi là "trình bày sai về dữ liệu". Ở đây mỗi con số đến từ một phép đo có
 * file, và mang theo NGÀY ĐO của chính nó.
 *
 * Số test thì chạy bộ test thật rồi đọc kết quả — không đếm file, vì một file có
 * thể chứa 1 hay 20 ca.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";

const RA = "apps/demo-wallet/public/so-lieu.json";

const docJson = <T>(p: string): T | null =>
  existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null;

type Cohort = {
  doLuc: string;
  coMauDo: number;
  coCohort: number;
  boQua: number;
  coverageTrungBinh: number;
  chamTaiSan: { hieu: number; tong: number };
  verdict: { danger: number; warning: number; safe: number };
  caoBuoc: number;
  warningKhongLyDo: number;
};
type ChiPhi = {
  doLuc: string;
  soMauDoDuoc: number;
  tongLuotGoi: { trungVi: number; thap: number; cao: number };
};

/**
 * Lấy CHÍNH danh sách glob mà `npm run test` dùng, thay vì chép lại.
 *
 * Đã lệch một lần: glob test mở rộng sang `apps/**` cho bốn ca mới, còn script này
 * vẫn chỉ quét `packages/**` — nên nó đo 263 trong khi bộ test thật có 267, và
 * trang số liệu CÔNG KHAI suýt đăng con số thiếu. Guard đối chiếu tài liệu với
 * so-lieu.json không bắt được: cả hai cùng sai một kiểu.
 *
 * Đọc từ package.json thì hai bên không thể lệch nữa.
 */
function globTest(): string[] {
  const lenh = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> })
    .scripts["test"];
  if (!lenh) throw new Error("package.json không có script `test`");
  const g = [...lenh.matchAll(/"([^"]*test[^"]*)"/g)].map((m) => m[1] as string);
  if (g.length === 0) throw new Error(`không rút được glob nào từ: ${lenh}`);
  return g;
}

/** Chạy bộ test thật và đọc số ca. Đếm file thì sai — một file có thể có 20 ca. */
function demTest(): { pass: number; fail: number } | null {
  try {
    const ra = execFileSync(
      process.execPath,
      ["--test", "--experimental-strip-types", ...globTest()],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 64 * 1024 * 1024,
        // Bộ test chứa guard đối chiếu TÀI LIỆU với chính file này. Không tắt nó ở
        // đây thì thành vòng khoá: tài liệu lệch -> guard đỏ -> script từ chối đo ->
        // không bao giờ biết số mới để sửa tài liệu. Lúc ĐANG ĐO thì con số đúng
        // chưa tồn tại, nên so sánh ấy chưa có nghĩa; nó thuộc về `npm run check`.
        env: { ...process.env, CUSTOS_DANG_DO: "1" },
      },
    );
    // Đọc `# tests` (TỔNG số ca), KHÔNG đọc `# pass`.
    //
    // Vì lượt chạy này đặt CUSTOS_DANG_DO nên ba bài đối chiếu tài liệu bị bỏ qua,
    // và ca bỏ qua không tính vào `# pass`. Lấy `# pass` thì trang công khai đăng
    // con số THIẾU đúng bằng số bài bị bỏ qua — 259 thay vì 262. Con số ấy đúng
    // cho lượt đo và sai với mọi người khác chạy `npm run check`.
    // Node 24 in bảng tổng kết dạng `ℹ tests 262`; bản TAP cũ dùng `# tests 262`.
    // Viết thẳng hai regex thay vì dựng bằng template literal: trong template
    // literal, `\d` là escape không hợp lệ và JS lặng lẽ bỏ dấu gạch, biến `(\d+)`
    // thành `(d+)` — regex chạy được, không bao giờ khớp, và script chỉ nói
    // "không đọc được số test". Đúng loại lỗi im lặng nhất.
    const tong = /^(?:#|ℹ) tests (\d+)\s*$/m.exec(ra)?.[1];
    const fail = /^(?:#|ℹ) fail (\d+)\s*$/m.exec(ra)?.[1];
    if (!tong) return null;
    return { pass: Number(tong) - Number(fail ?? 0), fail: Number(fail ?? 0) };
  } catch (e) {
    // Test đỏ thì execFileSync ném, NHƯNG stdout vẫn có "# pass N / # fail M".
    // Đọc nó để báo được "bộ test đỏ N ca" thay vì "không đọc được số test" —
    // hai câu dẫn người sửa đi hai hướng khác nhau.
    const ra = String((e as { stdout?: string }).stdout ?? "");
    const fail = /^(?:#|ℹ) fail (\d+)\s*$/m.exec(ra)?.[1];
    if (fail && Number(fail) > 0) {
      console.error(`✖ bộ test đang đỏ ${fail} ca — không ghi số liệu từ một lần chạy hỏng.`);
      /*
       * IN TÊN CA ĐỎ, ĐỪNG BẢO NGƯỜI TA CHẠY LẠI.
       *
       * Câu "chạy `npm run check` để xem ca nào" vô dụng trên CI: người đọc log
       * không có shell ở đó. Một lượt CI đỏ đã mất vì đúng chuyện này — stdout có
       * sẵn tên ca, script chỉ việc không giấu nó đi.
       */
      const ten = [...ra.matchAll(/^not ok \d+ - (.+)$/gm)].map((x) => x[1]!.trim());
      for (const t of ten.slice(0, 10)) console.error(`  ✖ ${t}`);
      if (ten.length > 10) console.error(`  … và ${ten.length - 10} ca nữa`);
      if (ten.length === 0) console.error("  Chạy `npm run check` để xem ca nào.");
      process.exit(1);
    }
    return null;
  }
}

const cohort = docJson<Cohort>("data/seed/cohort-ket-qua.json");
const chiPhi = docJson<ChiPhi>("data/seed/chi-phi.json");
const test = demTest();

const soLuat = (readFileSync("packages/core/src/l2/rules.ts", "utf8").match(/export const luat\d+/g) ?? []).length;
const soMau = existsSync("data/seed/facts") ? readdirSync("data/seed/facts").filter((f) => f.endsWith(".json")).length : 0;

if (!cohort) console.warn("⚠ chưa có data/seed/cohort-ket-qua.json — chạy scripts/do-cohort.ts");
if (!chiPhi) console.warn("⚠ chưa có data/seed/chi-phi.json — chạy scripts/do-chi-phi.ts");
if (!test) {
  // TRƯỚC ĐÂY chỉ cảnh báo rồi vẫn ghi `test: null` vào so-lieu.json — nghĩa là
  // trang số liệu CÔNG KHAI mất con số mà không ai nhận ra, và thể lệ gọi đó là
  // trình bày sai về dữ liệu. Thà dừng hẳn còn hơn công bố số khuyết.
  console.error("✖ không đọc được số test — nhiều khả năng bộ test đang đỏ.");
  console.error("  Chạy `npm run check` để xem ca nào hỏng, sửa xong rồi chạy lại script này.");
  console.error("  KHÔNG ghi đè so-lieu.json bằng số khuyết.");
  process.exit(1);
}

/**
 * Số phỏng vấn người dùng — đọc từ file đã thu, KHÔNG gõ tay.
 *
 * Vắng file là trạng thái hợp lệ: đội chưa đi hỏi thì `phongVan` là null, và deck
 * lẫn trang số liệu phải nói "chưa đo" chứ không được bịa. Đây là ô 25 % rubric,
 * nên nó là ô đắt nhất để nói sai.
 */
function docPhongVan() {
  const t = docJson<{
    laViDu?: boolean;
    nguonGoc?: { khoangPhongVan?: string };
    ban: Array<Record<string, string>>;
  }>("data/seed/phong-van.json");
  if (!t || !Array.isArray(t.ban) || t.ban.length === 0) return null;
  // File ví dụ mang cờ `laViDu`. Số minh hoạ KHÔNG được ra khỏi máy dev.
  if (t.laViDu) {
    console.warn("⚠ data/seed/phong-van.json là FILE VÍ DỤ — bỏ qua, không đưa số vào");
    return null;
  }
  const dem = (truong: string, gt: string) => t.ban.filter((b) => b[truong] === gt).length;
  return {
    n: t.ban.length,
    // Ngày phỏng vấn chảy từ biên bản ra, không gõ tay ở ba nơi. Bản trước ghi cứng
    // "29–30/08" trong trang số liệu VÀ trong deck — hai bản sao của cùng một sự
    // thật thì sớm muộn cũng lệch, và lệch ở đây là nói sai ngày đo trước giám khảo.
    khoangPhongVan: t.nguonGoc?.khoangPhongVan ?? null,
    hieu: { dung: dem("cham", "dung"), motPhan: dem("cham", "motPhan"), sai: dem("cham", "sai") },
    quyetDinh: {
      huy: dem("quyetDinh", "huy"),
      kiemTraThem: dem("quyetDinh", "kiemTraThem"),
      ky: dem("quyetDinh", "ky"),
    },
    // Người hiểu ĐÚNG mà vẫn ký: phát hiện đáng giá nhất, và là con số dễ bị gộp
    // mất nhất. Tách sẵn ở đây để không ai phải tự tính rồi tính nhầm.
    hieuDungVanKy: t.ban.filter((b) => b["cham"] === "dung" && b["quyetDinh"] === "ky").length,
  };
}

/*
 * BA LOẠI BẰNG CHỨNG MỚI — và một loại cố ý để trống.
 *
 * Trang số liệu trước đây chỉ trưng thứ đội ĐÃ đo. Nhưng với một sản phẩm B2B, ô
 * trống mới là thứ giám khảo tìm: "có ai ngoài đội dùng chưa?". Nói ra trước thì
 * mất một chút; để họ moi ra thì mất nhiều hơn.
 *
 * `nguoiMua` trả 0 khi chưa hỏi ai, và trang phải hiện số 0 đó chứ không giấu mục.
 */
function docTichHop() {
  const t = docJson<{ msDenKetQuaDauTien: number; dongMaTichHop: number; msMotLuotKiem: number; doiTac: unknown; dat: boolean }>(
    "data/tich-hop/ket-qua.json",
  );
  if (!t) return null;
  return {
    giayDenKetQuaDau: Math.round(t.msDenKetQuaDauTien / 100) / 10,
    dongMa: t.dongMaTichHop,
    msMotLuot: t.msMotLuotKiem,
    // `null` nghĩa là CHƯA CÓ đối tác. Trang đọc trường này để không nói quá.
    doiTac: t.doiTac ?? null,
    dat: t.dat,
  };
}

function docEvalAi() {
  const t = docJson<{
    soMau: number;
    boChan: { soBay: number; soBayChanDuoc: number };
    moHinhThat: { trangThai?: string };
  }>("data/eval/ai-ket-qua.json");
  if (!t) return null;
  return {
    soMau: t.soMau,
    soBay: t.boChan.soBay,
    soBayChanDuoc: t.boChan.soBayChanDuoc,
    moHinhThat: t.moHinhThat?.trangThai ?? null,
  };
}

/**
 * Số luật có CẶP kích-hoạt + đối-chứng.
 *
 * Trang số liệu từng nói cứng "luật 13–14 có thêm ca đối chứng" — ít hơn thực tế
 * và sẽ lệch tiếp mỗi lần thêm mẫu. Đếm từ `kyVong`, cùng cách `capLuat.test.ts`
 * đếm, để hai nơi không thể nói khác nhau.
 */
function demCapDoiChung(): number {
  const t = docJson<{ mau: Array<{ luat: number | null; kyVong: { coMa?: string[]; khongCoMa?: string[] } }> }>(
    "data/seed/index.json",
  );
  if (!t) return 0;
  const co = (l: number, k: "coMa" | "khongCoMa") =>
    t.mau.some((m) => m.luat === l && (m.kyVong[k]?.length ?? 0) > 0);
  let n = 0;
  for (let l = 1; l <= 14; l++) if (co(l, "coMa") && co(l, "khongCoMa")) n++;
  return n;
}

/** Số cuộc phỏng vấn NGƯỜI MUA. Vắng file hoặc file ví dụ đều là 0 — và 0 phải hiện ra. */
function docNguoiMua(): number {
  const t = docJson<{ laViDu?: boolean; ban?: unknown[] }>("data/seed/nguoi-mua.json");
  if (!t || t.laViDu) return 0;
  return t.ban?.length ?? 0;
}

const soLieu = {
  sinhLuc: new Date().toISOString(),
  phongVan: docPhongVan(),
  tichHop: docTichHop(),
  evalAi: docEvalAi(),
  nguoiMua: docNguoiMua(),
  soLuatCoCapDoiChung: demCapDoiChung(),
  cohort: cohort && {
    ngayDo: cohort.doLuc,
    mauDoDuoc: cohort.coMauDo,
    mauTrongCohort: cohort.coCohort,
    mauBoQua: cohort.boQua,
    coveragePhanTram: Math.round(cohort.coverageTrungBinh * 100),
    chamTaiSan: cohort.chamTaiSan,
    verdict: cohort.verdict,
    caoBuoc: cohort.caoBuoc,
    warningKhongLyDo: cohort.warningKhongLyDo,
  },
  chiPhi: chiPhi && {
    ngayDo: chiPhi.doLuc,
    soMau: chiPhi.soMauDoDuoc,
    luotGoiRpc: chiPhi.tongLuotGoi,
  },
  test,
  soLuat,
  soMau,
};

writeFileSync(RA, JSON.stringify(soLieu, null, 2));
console.log(`đã ghi -> ${RA}`);
console.log(
  `  ${soLuat} luật · ${soMau} mẫu · ${test ? `${test.pass} test` : "test: chưa đọc được"}` +
    (cohort ? ` · coverage ${Math.round(cohort.coverageTrungBinh * 100)}% trên ${cohort.coMauDo} mẫu` : ""),
);

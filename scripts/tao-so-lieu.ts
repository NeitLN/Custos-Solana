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

/** Chạy bộ test thật và đọc số ca. Đếm file thì sai — một file có thể có 20 ca. */
function demTest(): { pass: number; fail: number } | null {
  try {
    const ra = execFileSync(
      process.execPath,
      ["--test", "--experimental-strip-types", "packages/**/test/*.test.ts"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 },
    );
    const pass = /^# pass (\d+)$/m.exec(ra)?.[1] ?? /pass (\d+)/.exec(ra)?.[1];
    const fail = /^# fail (\d+)$/m.exec(ra)?.[1] ?? /fail (\d+)/.exec(ra)?.[1];
    if (!pass) return null;
    return { pass: Number(pass), fail: Number(fail ?? 0) };
  } catch {
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
if (!test) console.warn("⚠ không đọc được số test");

const soLieu = {
  sinhLuc: new Date().toISOString(),
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

import { ProductHeader } from "./ProductNavigation.tsx";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { docPhatLai, docThucThiLive, docAiThat } from "../../../scripts/bangChungChungKet.ts";

/**
 * TRANG SỐ LIỆU CÔNG KHAI.
 *
 * Mọi con số của đội đang nằm rải trong repo. Giám khảo bấm link demo thì không
 * thấy cái nào, và phần lớn giám khảo sẽ không mở repo.
 *
 * BA QUY TẮC CỦA TRANG NÀY:
 *
 *   1. Không con số nào gõ tay. Tất cả đọc từ `so-lieu.json` do
 *      `scripts/tao-so-lieu.ts` sinh ra từ các phép đo có file.
 *   2. Mỗi con số đi kèm CÁCH ĐO và NGÀY ĐO. Một con số không có nguồn thì không
 *      đáng tin hơn một con số bịa.
 *   3. Nói luôn cả giới hạn của phép đo. Cohort già đi theo thời gian — giao dịch
 *      cũ dần sẽ mô phỏng hỏng — nên số mẫu đo được tụt dần, và coverage tụt theo
 *      VÌ MẪU RỤNG chứ không vì code kém đi. Giấu chuyện đó là tự đặt bẫy cho
 *      chính mình ở phần Q&A.
 */

type SoLieu = {
  sinhLuc: string;
  cohort: {
    ngayDo: string;
    mauDoDuoc: number;
    mauTrongCohort: number;
    mauBoQua: number;
    coveragePhanTram: number;
    chamTaiSan: { hieu: number; tong: number };
    verdict: { danger: number; warning: number; safe: number };
    caoBuoc: number;
    warningKhongLyDo: number;
  } | null;
  chiPhi: {
    ngayDo: string;
    soMau: number;
    luotGoiRpc: { trungVi: number; thap: number; cao: number };
  } | null;
  test: { pass: number; fail: number } | null;
  phongVan: {
    n: number;
    hieu: { dung: number; motPhan: number; sai: number };
    quyetDinh: { huy: number; kiemTraThem: number; ky: number };
    hieuDungVanKy: number;
    /** Khoảng ngày phỏng vấn, chép từ biên bản. `null` khi biên bản chưa ghi. */
    khoangPhongVan: string | null;
  } | null;
  tichHop: {
    giayDenKetQuaDau: number;
    dongMa: number;
    msMotLuot: number;
    /** `null` nghĩa là CHƯA có bên thứ ba nào tích hợp. Trang phải nói đúng thế. */
    doiTac: string | null;
    dat: boolean;
  } | null;
  evalAi: { soMau: number; soBay: number; soBayChanDuoc: number; moHinhThat: string | null } | null;
  /** Vòng chung kết (CK-13): ba loại bằng chứng, ba artifact — xem `scripts/bangChungChungKet.ts`. */
  phatLai?: ReturnType<typeof docPhatLai>;
  thucThiLive?: ReturnType<typeof docThucThiLive>;
  aiThat?: ReturnType<typeof docAiThat>;
  nguoiMua: number;
  soLuatCoCapDoiChung: number;
  soLuat: number;
  soMau: number;
};

const ngay = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

/*
 * `so-lieu.json` do script sinh và được test đối chiếu với tài liệu — KHÔNG sửa tệp đó để
 * dịch. Vài trường của nó mang chữ tiếng Việt; dịch ở đây lúc hiển thị. Câu lạ (script
 * đổi lời) thì hiện nguyên văn, không đoán nghĩa.
 */
const THANG = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Khoảng ngày của biên bản → cách viết tiếng Anh ("Aug 29 and Aug 30, 2026"). Chỉ đổi cách viết, không đổi ngày.
const khoangNgay = (s: string) =>
  s
    .replace(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/g, (m, dd: string, mm: string, yyyy?: string) => {
      const t = THANG[Number(mm) - 1];
      return t ? `${t} ${Number(dd)}${yyyy ? `, ${yyyy}` : ""}` : m;
    })
    .replace(/\s+và\s+/g, " and ");
const GIOI_HAN_DO_TRE: Record<string, string> = {
  "n=10 mỗi ca (<30) nên KHÔNG báo p95; chỉ trung vị và khoảng.":
    "n=10 per case (<30), so NO p95 is reported; only the median and range.",
  "2/9 kịch bản (lanh-tinh, tan-cong-day-du) chưa đo: fixture còn khuyết một lời gọi, phát lại báo thiếu thay vì chạy.":
    "2/9 scenarios (lanh-tinh, tan-cong-day-du) not measured: the fixture is missing one call, so replay reports the gap instead of running.",
  "Một máy, một trình duyệt; không phải máy trình diễn chính thức.":
    "One machine, one browser; not the official demo machine.",
  "Lượt đầu gồm cả tải bộ dữ liệu JSON (~286 KB).": "The first run includes loading the JSON dataset (~286 KB).",
};
const TRANG_THAI_DO: Record<string, string> = { "đã đo": "measured", "chưa đo": "not measured" };

/* Chữ của chuỗi bằng chứng CK-13 — mã lạ thì hiện nguyên mã, không đoán nghĩa. */
const LOAI_GD: Record<string, string> = {
  transfer: "Token transfer",
  attack: "Attack transaction",
  owner: "Account owner change only",
  approve: "Grant spending permission",
  "delegate-transfer": "App uses the permission",
  revoke: "Revoke permission",
  extra: "Extra transfer bundled in",
  "close-authority": "Grant close-account authority",
  close: "App closes the account",
};
const MUC_L2: Record<string, string> = { safe: "Normal", warning: "Review carefully", danger: "Danger" };
const QUYET_DINH: Record<string, string> = { approve: "Signed", override: "Signed after warning / recommendation" };
const DOI_CHIEU: Record<string, string> = { match: "Match", mismatch: "Mismatch", unknown: "Unknown" };
const soEn = (n: number, toiDa = 0) => n.toLocaleString("en-US", { maximumFractionDigits: toiDa });

/*
 * MỘT PHÉP ĐO = MỘT HÀNG, không phải một thẻ.
 *
 * Bản trước xếp bốn thẻ giống hệt nhau thành lưới hai cột. Hai cái sai ở đó:
 *
 *   - Lưới thẻ đều tăm tắp là hình thức mặc định, không phải hình thức đúng. Nội
 *     dung ở đây không phải bốn thứ ngang hàng nhau để liếc qua — mỗi con số kéo
 *     theo hai tới bốn câu giải thích cách đo, và đó mới là phần đáng đọc.
 *   - Nhồi đoạn văn đó vào một cột hẹp làm nó thành 12px, xuống dòng liên tục.
 *     Trang này được CHIẾU LÊN TƯỜNG cho giám khảo ngồi xa đọc.
 *
 * Hàng chạy hết chiều ngang: con số đứng cột trái cố định, tên và cách đo chạy dài
 * bên phải với cỡ chữ đọc được. Con số vẫn nổi vì nó to và lệch hẳn khỏi cột chữ.
 */
function PhepDo({ so, nhan, cachDo }: { so: string; nhan: string; cachDo: string }) {
  return (
    <div className="evidence-measure grid gap-x-5 gap-y-1 border-t border-vien py-4 sm:grid-cols-[7.5rem_1fr]">
      <div className="text-[30px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-chu sm:text-right">
        {so}
      </div>
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-chu">{nhan}</div>
        <p className="mt-1.5 max-w-[68ch] text-[14px] leading-relaxed text-chu-nhat">{cachDo}</p>
      </div>
    </div>
  );
}

/** Ghi chú giới hạn — nói ngay cạnh con số, không giấu ở cuối trang. */
function GioiHan({ tieuDe, children }: { tieuDe: string; children: ReactNode }) {
  return (
    <p className="evidence-limit mt-4 rounded-xl border border-vien bg-white px-4 py-3.5 text-[14px] leading-relaxed text-chu-nhat">
      <span className="font-semibold text-chu">{tieuDe}</span> {children}
    </p>
  );
}

export function SoLieu() {
  const [d, setD] = useState<SoLieu | null | undefined>(undefined);

  useEffect(() => {
    void fetch(`${import.meta.env.BASE_URL}so-lieu.json`)
      .then((r) => (r.ok ? (r.json() as Promise<SoLieu>) : null))
      .then(setD)
      .catch(() => setD(null));
  }, []);

  return (
    <main className="app-shell evidence-shell">
      <div className="evidence-container">
        <ProductHeader active="evidence" label="Evidence" />
        <header className="evidence-heading">
          <p className="tool-eyebrow">VERIFICATION RECORD / CUSTOS</p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-chu sm:text-[30px]">
          Here are the numbers.
          <span>And their limits.</span>
        </h1>
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed text-chu-nhat">
          Every number below comes from a measurement with a file in the repo — none is typed by hand.
          The page updates itself from the most recent measurement.
        </p>

        {d && <div className="evidence-stamp"><span>Data generated from measurements</span><time dateTime={d.sinhLuc}>Updated {ngay(d.sinhLuc)}</time></div>}
        </header>
        {d === undefined && <div className="evidence-status" role="status">Loading the verification record…</div>}
        {d === null && <div className="evidence-status" role="alert"><h2>Could not load the numbers.</h2><p>There is no data to show right now. Try reloading the page or go back to Custos Wallet.</p><button className="nut nut-chinh" type="button" onClick={() => window.location.reload()}>Reload page</button></div>}
        {d && <>
        <nav className="evidence-index" aria-label="Evidence sections">
          {d.cohort && <a href="#du-lieu-cong-khai">Public data</a>}
          {d.phongVan && <a href="#muc-do-hieu">Comprehension</a>}
          {d.tichHop && <a href="#tich-hop">SDK integration</a>}
          {d.phatLai && <a href="#phat-lai">Replay</a>}
          {d.thucThiLive && <a href="#thuc-thi-live">Devnet transactions</a>}
          {d.aiThat && <a href="#ai-that">AI with a real model</a>}
          {d.evalAi && <a href="#danh-gia-ai">AI evaluation</a>}
          <a href="#gioi-han">Not yet measured</a><a href="#san-pham">Product</a>
        </nav>
        <div className="evidence-body">
        {d.cohort && (
          <section className="evidence-section mt-10" id="du-lieu-cong-khai">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              Testing the engine on public data saved offline
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">Measured {ngay(d.cohort.ngayDo)}</p>

            <GioiHan tieuDe="This is historical data, not runtime.">
              Some public transactions were saved as offline data to test the engine.
              The demo and the competition product run{" "}
              <strong className="font-semibold text-chu">entirely on Devnet</strong> — during the demo
              Custos does not connect to mainnet.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={String(d.cohort.caoBuoc)}
                nhan="transactions ACCUSED"
                cachDo={`Accused = carries a reason code that ACCUSES a specific behavior. This is different from the Review carefully level: the ${d.cohort.verdict.warning} transactions at that level are there because INFORMATION or coverage is missing (for example "unverified program", "simulation failed") — caution, not an accusation. That is why this number is ${d.cohort.caoBuoc} even though there are ${d.cohort.verdict.warning} warnings. Measured on ${d.cohort.mauDoDuoc} public SPL transactions saved offline; the cohort has no ground truth labels, so this is NOT precision/recall or a false-positive rate.`}
              />
              <PhepDo
                so={`${d.cohort.coveragePhanTram}%`}
                nhan="of instructions understood"
                cachDo={`Average over ${d.cohort.mauDoDuoc} transactions. For the rest, Custos does NOT guess — it reports that it did not understand and keeps the verdict at a cautious level.`}
              />
              <PhepDo
                so={`${Math.round((d.cohort.chamTaiSan.hieu / Math.max(d.cohort.chamTaiSan.tong, 1)) * 100)}%`}
                nhan="of asset-touching instructions understood"
                cachDo={`${d.cohort.chamTaiSan.hieu}/${d.cohort.chamTaiSan.tong} instructions touch the signer's assets. This number is closer to what matters than overall coverage, because whether an instruction that touches no assets is understood matters less.`}
              />
              <PhepDo
                so={String(d.cohort.warningKhongLyDo)}
                nhan="warnings without a reason"
                cachDo="Every warning must come with a reason code traceable to a specific rule. This number must always be 0 — anything else means some rule is raising an alarm without being able to say why."
              />
            </div>

            <GioiHan tieuDe="Limits of this measurement:">
              measured on a fixed set of {d.cohort.mauTrongCohort} transactions, but only{" "}
              {d.cohort.mauDoDuoc} could still be simulated this time ({d.cohort.mauBoQua} skipped).
              Simulation depends on the current chain state, so the older a transaction, the more likely it
              fails — the sample shrinks over time, and coverage drops <em>because samples drop out</em>, not
              because the code got worse. The script counts and reports the skipped ones instead of quietly
              shrinking the denominator.
            </GioiHan>

            {/*
              Ba mức phân biệt bằng TÊN và bằng chấm có vị trí riêng, không chỉ bằng màu:
              mù màu đỏ/lục là khoảng 8 % nam giới, và máy chiếu còn bóp màu thêm một nấc.
              Dùng đúng nhãn của ví ("Nguy hiểm / Cần xem kỹ / Bình thường") thay vì gọi
              tên màu, để hai bề mặt nói cùng một thứ tiếng.
            */}
            <div className="mt-4 rounded-xl border border-vien bg-white px-4 py-4">
              <p className="text-[14px] text-chu-nhat">
                Verdicts on the {d.cohort.mauDoDuoc} transactions that could be simulated:
              </p>
              <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-2.5">
                {(
                  [
                    ["Danger", d.cohort.verdict.danger, "bg-nguy"],
                    ["Review carefully", d.cohort.verdict.warning, "bg-canh"],
                    ["Normal", d.cohort.verdict.safe, "bg-thuong"],
                  ] as const
                ).map(([ten, n, cham]) => (
                  <div key={ten} className="flex items-baseline gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ${cham}`}
                      aria-hidden="true"
                    />
                    <dt className="text-[14px] text-chu-nhat">{ten}</dt>
                    <dd className="text-[16px] font-semibold tabular-nums text-chu">{n}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 max-w-[68ch] text-[14px] leading-relaxed text-chu-nhat">
                Of these, {d.cohort.caoBuoc} transactions are accused (carry an accusing code); the remaining
                warnings are due to missing information or coverage.
              </p>
            </div>
          </section>
        )}

        {d.phongVan && (
          <section className="evidence-section mt-10" id="muc-do-hieu">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              Do real people understand the warning
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              {d.phongVan.n} people
              {d.phongVan.khoangPhongVan ? ` · interviewed ${khoangNgay(d.phongVan.khoangPhongVan)}` : ""}
            </p>

            <GioiHan tieuDe="Measured on the interface AS IT WAS THEN.">
              The warning card was redesigned after the interview round (Sep 1 and Sep 4). At the time,
              participants saw the <em>Danger</em> level, a 500 → 0 balance table, the account-owner change
              line and <em>&quot;understood 2 of 3 instructions&quot;</em>. The current build keeps that level,
              the owner-change line and that coverage, but the balance differs: the Devnet setup now transfers
              half of the balance read from the chain at run time, so the table no longer shows 500 → 0. The
              look is different too. The numbers below are <strong className="font-semibold text-chu">not</strong>{" "}
              measured on the exact build that is running now.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={`${d.phongVan.hieu.dung}/${d.phongVan.n}`}
                nhan="named the consequence"
                cachDo={`We showed the screen and asked "if you press sign, what happens to your wallet?" — with no explanation beforehand. Counted as CORRECT when the person named losing money OR losing control. ${d.phongVan.hieu.motPhan} people understood partly and ${d.phongVan.hieu.sai} misunderstood; "partly" is NOT merged into "correct".`}
              />
              <PhepDo
                so={`${d.phongVan.quyetDinh.ky}/${d.phongVan.n}`}
                nhan="would still sign after seeing the warning"
                cachDo={`Asked SEPARATELY, after the first answer was written down — asking both at once would itself hint that something is worth cancelling. Of those ${d.phongVan.quyetDinh.ky} people: ${d.phongVan.hieuDungVanKy} UNDERSTOOD the consequence correctly and still chose to sign knowingly (a spare wallet, demo tokens with no value), so only ${d.phongVan.quyetDinh.ky - d.phongVan.hieuDungVanKy} signed because they misread the screen. That is where the product failed, and the team keeps the number as is instead of merging it to look better.`}
              />
              <PhepDo
                so={String(d.phongVan.quyetDinh.huy)}
                nhan="cancelled the transaction"
                cachDo={`Another ${d.phongVan.quyetDinh.kiemTraThem} people said they would check further before deciding. Understanding and acting are TWO separate variables — measuring only understanding is measuring half the story, and the half that is easier to make look good.`}
              />
            </div>

            <GioiHan tieuDe="Limits of this measurement:">
              one person interviewed all {d.phongVan.n} — no scoring drift between several interviewers, but
              also nobody cross-scoring. Interviews were done over text messages and video calls, so for the
              text ones reading time could not be observed, and respondents had time to look things up. The
              anonymized transcript is at <code className="font-mono text-[13px]">docs/BIEN-BAN-PHONG-VAN.md</code>;
              the counts come from <code className="font-mono text-[13px]">scripts/kiem-phong-van.ts</code>, not by hand.
            </GioiHan>
          </section>
        )}

        {d.tichHop && (
          <section className="evidence-section mt-10" id="tich-hop">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              How long it takes an outsider to install this SDK
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              Sample dApp, installed from a tarball in a folder outside the monorepo
            </p>

            {/* Ô này dễ bị đọc quá lên nhất trên cả trang, nên lời cảnh báo đứng
                TRƯỚC con số chứ không nằm dưới dạng chú thích nhỏ. */}
            <GioiHan tieuDe="This integration was built by the team itself.">
              It shows the SDK <strong className="font-semibold text-chu">can be installed and used</strong>{" "}
              from an outsider&apos;s position. It does <strong className="font-semibold text-chu">not</strong> show
              that any third party has chosen to use Custos — none has so far.
            </GioiHan>

            <div className="mt-6">
              <PhepDo
                so={`${soEn(d.tichHop.giayDenKetQuaDau, 1)} s`}
                nhan="from npm install to the first result"
                cachDo="Measures the whole run: installing dependencies, then running three real scenarios on Devnet. No private key needed — inspect() simulates, and simulation does not require a signature."
              />
              <PhepDo
                so={String(d.tichHop.dongMa)}
                nhan="lines of integration code"
                cachDo="Real lines counted, excluding blank lines and comments, in the one file that contains every call to Custos. Three constraints the integrator must keep: the address comes from the WALLET, not from the dApp; context declared by the dApp may only make the product more cautious; and errors BLOCK — they never turn into permission to sign."
              />
              <PhepDo
                so={`${soEn(d.tichHop.msMotLuot)} ms`}
                nhan="for one check on Devnet"
                cachDo="Measured on a real attack scenario: the dApp declares 'claim airdrop' but drains tokens and changes the account owner. Custos returns the Danger level, understood 2/2 instructions."
              />
            </div>
          </section>
        )}

        {/*
          BA LOẠI BẰNG CHỨNG CỦA VÒNG CHUNG KẾT — CK-13. Phát lại, thực thi live và AI thật trả lời
          ba câu hỏi khác nhau; gộp thành một con số "đã kiểm chứng" là nói quá. Mỗi mục một
          artifact, một ngày đo, một giới hạn riêng.
        */}
        {d.phatLai && (
          <section className="evidence-section mt-10" id="phat-lai">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Scenario replay — no network needed</h2>
            <p className="mt-1 text-[14px] text-chu-mo">the current engine re-runs on RPC responses recorded from Devnet</p>
            <div className="mt-6">
              <PhepDo
                so={`${d.phatLai.soKichBan}`}
                nhan="scenarios with fully recorded data"
                cachDo={`Each scenario was recorded from ONE RPC provider (${d.phatLai.nguon.join(", ")})${d.phatLai.ghiTu && d.phatLai.ghiDen ? (ngay(d.phatLai.ghiTu) === ngay(d.phatLai.ghiDen) ? `, recorded on ${ngay(d.phatLai.ghiTu)}` : `, between ${ngay(d.phatLai.ghiTu)} and ${ngay(d.phatLai.ghiDen)}`) : ""}, engine at recording time ${d.phatLai.engineLucGhi}. On replay, the current engine runs again and says so if the result differs from the recording.`}
              />
              {d.phatLai.doTre && (
                <PhepDo
                  so={`${soEn(d.phatLai.doTre.trungViMs)} ms`}
                  nhan="median for one replay in the browser"
                  cachDo={`${soEn(d.phatLai.doTre.soLuot)} runs, lowest ${soEn(d.phatLai.doTre.thapNhatMs)} ms, highest ${soEn(d.phatLai.doTre.caoNhatMs)} ms, measured ${ngay(d.phatLai.doTre.doLuc)} on the production build.`}
                />
              )}
            </div>
            <GioiHan tieuDe="Not a new transaction.">
              Replay uses simulation results from a past run; it does not prove that Devnet answers the same
              way today.
              {d.phatLai.doTre ? ` Limits of the latency measurement, recorded on ${ngay(d.phatLai.doTre.doLuc)}: ${d.phatLai.doTre.gioiHan.map((g) => GIOI_HAN_DO_TRE[g] ?? g).join(" ")}` : ""}
            </GioiHan>
          </section>
        )}

        {d.thucThiLive && (
          <section className="evidence-section mt-10" id="thuc-thi-live">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Real transactions on Devnet</h2>
            <p className="mt-1 text-[14px] text-chu-mo">the fixed demo wallet signs, the chain records, predicted vs. actual is compared</p>
            <div className="mt-6">
              <PhepDo
                so={`${d.thucThiLive.soBienNhan}`}
                nhan="confirmed Devnet transactions with a receipt"
                cachDo={`A receipt records the signature, the balance Custos predicted and the balance read back after the chain confirmed: ${d.thucThiLive.soKhopSoDu}/${d.thucThiLive.soBienNhan} balances match, ${d.thucThiLive.soLechSoDu} mismatch${d.thucThiLive.soChuaRoSoDu ? `, ${d.thucThiLive.soChuaRoSoDu} could not read the balance back after the transaction (not counted as a match)` : ""}. Counted by signature — a transaction counts once even if several checks recorded it.`}
              />
              <PhepDo
                so={`${d.thucThiLive.caDat.length}/${d.thucThiLive.caDat.length + d.thucThiLive.caChuaDat.length}`}
                nhan="acceptance cases passed in the automated probe"
                cachDo={`Passed: ${d.thucThiLive.caDat.join(", ")}.${d.thucThiLive.caChuaDat.length ? ` Not passed: ${d.thucThiLive.caChuaDat.join(", ")}.` : ""}`}
              />
            </div>
            {/*
              CHUỖI BẰNG CHỨNG — CK-13: "ca → inspection → quyết định → chữ ký → đối chiếu". Mỗi
              hàng là một giao dịch đã lên chuỗi; chữ ký mở thẳng Explorer để ai cũng tự kiểm.
            */}
            <details className="evidence-chain mt-4 rounded-xl border border-vien bg-white px-4 py-3">
              <summary className="cursor-pointer text-[14px] font-medium text-chu">
                View {d.thucThiLive.chuoi.length} transactions — from the choice to the on-chain signature
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-[13px] text-chu-nhat">
                  <thead className="text-[12px] text-chu-mo">
                    <tr>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Transaction</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Custos</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">L2 level at decision</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Decision</th>
                      <th scope="col" className="py-1.5 pr-3 font-medium">Signature</th>
                      <th scope="col" className="py-1.5 font-medium">Balance: predicted vs. chain</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.thucThiLive.chuoi.map((x) => (
                      <tr key={x.chuKy} className="border-t border-vien align-top">
                        <td className="py-1.5 pr-3">{LOAI_GD[x.loai] ?? x.loai}</td>
                        <td className="py-1.5 pr-3">{x.baoVe ? "On" : "Off"}</td>
                        <td className="py-1.5 pr-3">
                          {MUC_L2[x.mucL2] ?? x.mucL2}
                          {x.maLyDo.length > 0 && (
                            <span className="block font-mono text-[11px] text-chu-mo">{x.maLyDo.join(", ")}</span>
                          )}
                        </td>
                        <td className="py-1.5 pr-3">{QUYET_DINH[x.quyetDinh] ?? x.quyetDinh}</td>
                        <td className="py-1.5 pr-3">
                          <a
                            className="font-mono underline underline-offset-2"
                            href={`https://explorer.solana.com/tx/${encodeURIComponent(x.chuKy)}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {x.chuKy.slice(0, 8)}…{x.chuKy.slice(-6)}
                            <span className="sr-only"> (opens Explorer in a new tab)</span>
                          </a>
                        </td>
                        <td className="py-1.5">{DOI_CHIEU[x.soDu] ?? x.soDu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[12.5px] text-chu-mo">
                A cancellation has no signature, so it has no row — there is no transaction to trace. "Unknown"
                means the balance could not be read back after the transaction (for example the account was
                closed); it is not counted as a match.
              </p>
            </details>
            {d.thucThiLive.caChuaDat.length > 0 && (
              <GioiHan tieuDe="Not passed, stated plainly.">
                Each failed case has its own reason, recorded in{" "}
                <code className="font-mono text-[13px]">docs/review/ck-20260927/NGHIEM-THU-LIVE.md</code>: some cases
                stopped at the preparation step (read-only) because the public Devnet RPC timed out while reading
                accounts; in some cases the transaction reached the chain but the automated receipt could not read
                it yet, or could not yet attribute the permission change to the right transaction. Cases checked
                manually on chain are not counted in the number above. No transaction was resent.
              </GioiHan>
            )}
          </section>
        )}

        {d.aiThat && (
          <section className="evidence-section mt-10" id="ai-that">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">AI with a real model</h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              {d.aiThat.moHinh}, measured {ngay(d.aiThat.doLuc)} — wording passes through an output checker; the warning level still comes from the rule engine
            </p>
            <div className="mt-6">
              <PhepDo
                so={`${d.aiThat.giuLai.daRaViPham}/${d.aiThat.giuLai.soCa}`}
                nhan="cases where a violation reached the user — held-out set"
                cachDo={`${d.aiThat.giuLai.soCa} cases from ${d.aiThat.giuLai.soHo} families, built from the fixed wallet's replay set, not overlapping the set used to tune the prompt. ${d.aiThat.giuLai.luiVeCauMau}/${d.aiThat.giuLai.soCa} cases fell back to the template sentence because the checker rejected the model's sentence.`}
              />
              <PhepDo
                so={`${d.aiThat.phatTrien.soMauViPham}/${d.aiThat.phatTrien.soMau}`}
                nhan="samples where a violation reached the user — development set"
                cachDo={`The model's sentence was used in ${Math.round(d.aiThat.phatTrien.tyLeDungCauMoHinh * 100)}% of samples; the rest fell back to the template sentence. Median latency ${soEn(d.aiThat.phatTrien.treTrungViMs / 1000, 1)} seconds. The two recorded runs used ${soEn(d.aiThat.tokenVao)} input tokens and ${soEn(d.aiThat.tokenRa)} output tokens.`}
              />
            </div>
            <GioiHan tieuDe={d.aiThat.boChanDaDoi ? "The checker was changed after this run." : "Self-assessed, small sample."}>
              {d.aiThat.boChanDaDoi ? "The numbers above are for the checker at measurement time; not re-measured on the current build. " : ""}
              The team did the scoring itself, and automated checks only catch what a machine can check. No
              violations getting through on this sample does not prove the model is safe.
            </GioiHan>
          </section>
        )}

        {d.evalAi && (
          <section className="evidence-section mt-10" id="danh-gia-ai">
            <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
              What the AI could break
            </h2>
            <p className="mt-1 text-[14px] text-chu-mo">
              running a fake model that deliberately says wrong things, on {d.evalAi.soMau} labeled samples
            </p>

            <div className="mt-6">
              <PhepDo
                so={`${d.evalAi.soBayChanDuoc}/${d.evalAi.soBay}`}
                nhan="traps blocked"
                cachDo="Inventing wallet addresses, inventing amounts, reassuring the user, inserting a danger level on its own, returning garbage, returning nothing. The first two traps ONCE GOT THROUGH: the old filter checked the format and reassuring phrases but not whether the wording was grounded. Fixed — the model never receives a full address, so any address in its output is one it made up."
              />
            </div>

            {/*
             * TIÊU ĐỀ ĐỌC TỪ DỮ LIỆU, KHÔNG GÕ CỨNG.
             *
             * Bản trước gõ cứng "Chưa đo với mô hình thật ở vòng này." ngay cạnh ô
             * in ra `moHinhThat` từ `so-lieu.json`. Sau lượt eval thật ngày 11/09,
             * dữ liệu chuyển sang "đã đo" còn tiêu đề thì không — trang công khai
             * đọc thành: *"Chưa đo với mô hình thật. … Phần đó đánh dấu `đã đo`
             * trong dữ liệu"*, một câu tự mâu thuẫn với chính nó cách nhau hai dòng.
             *
             * Hướng sai là nói GIẢM — báo chưa làm một việc đã làm. Nhưng thể lệ
             * phạt "trình bày sai" chứ không phạt riêng chiều thổi phồng, và một
             * trang số liệu tự mâu thuẫn thì mọi con số khác trên đó cũng mất tin.
             *
             * Chữ gõ tay cạnh một ô đọc từ dữ liệu là chỗ trôi rẻ nhất trong repo
             * này: không guard nào so hai bên, và người sửa dữ liệu không mở file
             * giao diện. Nên tiêu đề phải sinh từ cùng một trường.
             */}
            <GioiHan
              tieuDe={
                d.evalAi.moHinhThat === "đã đo"
                  ? "Measured with a real model — but the benefit is not yet measured."
                  : "Not measured with a real model in this round."
              }
            >
              {d.evalAi.moHinhThat === "đã đo" ? (
                <>
                  The live run is real, recorded in{" "}
                  <code className="font-mono text-[13px]">data/eval/ai-ket-qua.json</code>. What is{" "}
                  <strong>not</strong> measured yet is whether the AI layer helps users understand better: on
                  the measure of naming what could not be read, the model is <strong>on par</strong> with the
                  template sentences, not better. The public demo still deliberately embeds no key, so this
                  page runs the deterministic path. The full method is in{" "}
                  <code className="font-mono text-[13px]">docs/AI-EVALUATION.md</code>.
                </>
              ) : (
                <>
                  It needs an API key, and the public demo deliberately embeds none. That part is marked{" "}
                  <code className="font-mono text-[13px]">{TRANG_THAI_DO[d.evalAi.moHinhThat ?? "chưa đo"] ?? d.evalAi.moHinhThat}</code>{" "}
                  in the data — not left blank for someone to read as 0. The full method is in{" "}
                  <code className="font-mono text-[13px]">docs/AI-EVALUATION.md</code>.
                </>
              )}
            </GioiHan>
          </section>
        )}

        <section className="evidence-section mt-10" id="gioi-han">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">
            What the team has NOT measured yet
          </h2>
          <p className="mt-1 text-[14px] text-chu-mo">
            The current limits, so the results are read within the right scope.
          </p>
          <div className="mt-6">
            <PhepDo
              so={String(d.nguoiMua)}
              nhan="BUYER interviews (wallets, dApps)"
              cachDo="The team has asked end users, not the people who decide on integration. The two groups answer different questions, and one group's numbers cannot stand in for the other's. The question set is drafted in docs/PHONG-VAN-NGUOI-MUA.md."
            />
            <PhepDo
              so={d.tichHop?.doiTac ? "1" : "0"}
              nhan="third-party wallets or dApps integrated"
              cachDo="None yet. The integration example above was built by the team itself — it measures integration friction, not market demand."
            />
          </div>
        </section>

        <section className="evidence-section mt-10" id="san-pham">
          <h2 className="text-[19px] font-semibold tracking-[-0.01em] text-chu">Product</h2>
          <div className="mt-4">
            <PhepDo
              so={String(d.soLuat)}
              nhan="deterministic rules"
              cachDo="The rule engine decides the verdict. The AI does not create or change the verdict — it has its own field and may only recommend a manual check."
            />
            {d.test && (
              <PhepDo
                so={soEn(d.test.pass)}
                nhan="automated tests"
                cachDo={`Actually run when this page was generated, not a file count. ${d.test.fail} tests failing. All ${d.soLuat} rules have a triggering sample; ${d.soLuatCoCapDoiChung} rules also have a near-identical control case that differs only in the deciding condition.`}
              />
            )}
            <PhepDo
              so={String(d.soMau)}
              nhan="test samples"
              cachDo="Each sample records its origin. The accusation count is measured only on public samples saved offline, never mixed with samples the team built."
            />
            {d.chiPhi && (
              <PhepDo
                so={soEn(d.chiPhi.luotGoiRpc.trungVi, 1)}
                nhan="RPC calls per check"
                cachDo={`Median; lowest ${soEn(d.chiPhi.luotGoiRpc.thap, 1)}, highest ${soEn(d.chiPhi.luotGoiRpc.cao, 1)}, measured on ${d.chiPhi.soMau} public transactions saved offline, on ${ngay(d.chiPhi.ngayDo)}. Fetching the transaction itself is not counted — the wallet already has it.`}
              />
            )}
          </div>
        </section>

        <p className="mt-10 max-w-[68ch] border-t border-vien pt-5 text-[14px] leading-relaxed text-chu-mo">
          Generated {new Date(d.sinhLuc).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })} by{" "}
          <code className="font-mono text-[13px] text-chu-nhat">scripts/tao-so-lieu.ts</code>. How each number
          is measured is described in{" "}
          <code className="font-mono text-[13px] text-chu-nhat">docs/SEED-DATASET.md</code> and{" "}
          <code className="font-mono text-[13px] text-chu-nhat">docs/DON-VI-KINH-TE.md</code>.
        </p>
        </div>
        </>}
      </div>
    </main>
  );
}

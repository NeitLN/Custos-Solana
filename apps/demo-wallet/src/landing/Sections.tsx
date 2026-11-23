import type { ReactNode } from "react";
import type { NoiDung } from "./content.ts";
import { LINK } from "./links.ts";
import { DesignIcon } from "./DesignIcon.tsx";
import { GapTrenMobile } from "./ThanhPhanChung.tsx";

/**
 * Các section sau A/B.
 *
 * ## UI-06 — gộp nội dung thay vì rút spacing
 *
 * Bản trước có ba chỗ kể lại cùng một hành trình: ba thẻ giá trị, phần A/B, rồi
 * "bắt đầu trong ba bước" trên nền lilac riêng. Mục 2 nói rõ: *"Loại trùng nội
 * dung trước khi giảm spacing"* và *"không giảm font body"*.
 *
 * Từng còn một section `PipelineSection` (ba bước pipeline + hàng ba giá trị); xem đoạn
 * "Review UX 11/2026" bên dưới về chỗ của nó bây giờ.
 *
 * Section "bắt đầu" nền lilac đã bỏ; hướng dẫn dùng thử nằm cạnh CTA của A/B.
 *
 * Review UX 11/2026: `PipelineSection` (L1 → L3) đã gộp vào sơ đồ hành trình (`HanhTrinh.tsx`), và
 * hàng ba giá trị (vốn đã bị ẩn bằng CSS vì lặp ý) bỏ hẳn. Trên mobile, sơ đồ luồng + code và danh
 * sách FAQ gập thành accordion để trang ngắn lại.
 */

/**
 * Đoạn code cho nhà phát triển — API HIỆN HÀNH.
 *
 * Giữ nguyên từ bản trước: `inspect(deps, tx, options)` trả `InspectResult`. Mục
 * 5 cấm API tưởng tượng và cấm `if safe then sign()` thiếu coverage/consent, nên
 * ví dụ dừng ở chỗ đọc kết quả.
 */
export function DeveloperSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-dark" id="nha-phat-trien">
      <div className="lg-shell lg-dev">
        <header className="integration-heading">
          <h2 className="lg-h2">{t.devs.h2}</h2>
          <p className="lg-lead lg-prose lg-muted-dark lg-dev__mota">{t.devs.moTa}</p>
        </header>
        <GapTrenMobile tomTat={t.devs.moCode}>
        <div className="integration-flow" role="group" aria-label={t.devs.luongTieuDe}>
          <p className="integration-flow__label">{t.devs.luongPhanTich}</p>
          <ol className="integration-flow__steps">
            {t.devs.soDo.map((label, i) => <li className={i === 1 ? "integration-flow__step integration-flow__step--custos" : "integration-flow__step"} key={label}>
              <span className="integration-flow__node" aria-hidden="true">{i === 1 ? <img src={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`} width="22" height="22" alt="" /> : <DesignIcon kind={i === 0 ? "transaction" : "evidence"} />}</span>
              <div><strong>{label}</strong><p>{t.devs.luongMoTa[i]}</p></div>
              {i === 1 && <span className="integration-flow__api" aria-hidden="true">inspect()</span>}
            </li>)}
          </ol>
          <div className="integration-flow__boundary"><span aria-hidden="true">↓</span><p>{t.devs.luongDieuKien}</p></div>
          <ol className="integration-flow__steps integration-flow__steps--wallet">
            {t.devs.soDoNhanh.map((label, i) => <li className="integration-flow__step" key={label}>
              <span className="integration-flow__node" aria-hidden="true">{i === 0 ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="M9 12h6m-3-3v6" /></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3" /></svg>}</span>
              <div><strong>{label}</strong><p>{t.devs.luongNhanhMoTa[i]}</p></div>
            </li>)}
          </ol>
        </div>

        <figure className="lg-code">
          <figcaption className="lg-code__dau">
            <span className="integration-code-file"><span aria-hidden="true">{`{ }`}</span> inspect-transaction.ts</span>
            <span className="integration-code-language">TypeScript</span>
          </figcaption>
          <pre className="lg-code__pre" tabIndex={0} aria-label={t.devs.codeTieuDe}>
            <code>
              <span className="lg-syn-kw">import</span> &#123; <span className="lg-syn-fn">inspect</span> &#125; <span className="lg-syn-kw">from</span> <span className="lg-syn-str">"@custos-solana/core"</span>;{"\n\n"}
              <span className="lg-syn-kw">const</span> {t.devs.codeBienKetQua} = <span className="lg-syn-kw">await</span> <span className="lg-syn-fn">inspect</span>(&#123; connection &#125;, tx, &#123;{"\n"}
              {"  "}locale: <span className="lg-syn-str">"{t.devs.codeLocale}"</span>,{"\n"}
              {"  "}nguoiDung: {t.devs.codeBienVi}.<span className="lg-syn-fn">toBase58</span>(),{"\n"}
              &#125;);{"\n\n"}
              <span className="lg-syn-com">// {t.devs.codeChuThich[0]}</span>{"\n"}
              {`${t.devs.codeBienKetQua}.level;`.padEnd(21)}<span className="lg-syn-com">// "safe" | "warning" | "danger"</span>{"\n"}
              {`${t.devs.codeBienKetQua}.reasonCodes;`.padEnd(21)}<span className="lg-syn-com">// ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"]</span>{"\n"}
              {`${t.devs.codeBienKetQua}.coverage;`.padEnd(21)}<span className="lg-syn-com">// {t.devs.codeChuThich[1]}</span>{"\n"}
              {`${t.devs.codeBienKetQua}.diff;`.padEnd(21)}<span className="lg-syn-com">// {t.devs.codeChuThich[2]}</span>
            </code>
          </pre>
          <p className="lg-caption lg-code__ghichu">{t.devs.codeGhiChu}</p>
        </figure>
        </GapTrenMobile>
        <div className="integration-notes">
          <p className="lg-caption lg-muted-dark lg-dev__ghichu">{t.devs.ghiChu}</p>
          <ul className="lg-dev__lien">
            {t.devs.lien.map((l) => {
              const href = LINK[l.khoa as keyof typeof LINK];
              const ngoai = href.startsWith("http");
              return (
                <li key={l.nhan}>
                  <a
                    className="lg-btn lg-btn--outline"
                    href={href}
                    {...(ngoai ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                  >
                    {l.nhan}
                    {ngoai && <span className="lg-sr"> ({t.chung.moTabMoi})</span>}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Danh sách tài liệu + một đoạn giới hạn nền neutral (không banner khổng lồ). */
export function ProofSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section" id="bang-chung">
      <div className="lg-shell lg-proof-layout">
        <div className="lg-proof-heading">
        <h2 className="lg-h2">{t.bangChung.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-bcs__mota">{t.bangChung.moTa}</p>
        <p className="lg-gioihan lg-prose">{t.bangChung.gioiHan}</p>
        </div>

        <ul className="lg-bcs__ds">
          {t.bangChung.muc.map((m) => {
            const href = LINK[m.khoa as keyof typeof LINK];
            const ngoai = href.startsWith("http");
            return (
              <li key={m.tieuDe} className="lg-bcs__muc">
                <a
                  className="lg-bcs__lien"
                  href={href}
                  {...(ngoai ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  {m.tieuDe}
                  <span aria-hidden="true"> ↗</span>
                  {ngoai && <span className="lg-sr"> ({t.chung.moTabMoi})</span>}
                </a>
                <p className="lg-muted">{m.moTa}</p>
              </li>
            );
          })}
        </ul>

      </div>
    </section>
  );
}

/** FAQ: heading trái, accordion phải trên desktop; native `<details>`. */
export function FAQ({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-surface lg-vien-tren" id="faq">
      <div className="lg-shell lg-faq">
        <div>
          <h2 className="lg-h2">{t.faq.h2}</h2>
          <p className="lg-faq__mota lg-prose">{t.faq.moTa}</p>
        </div>
        <div>
          <GapTrenMobile tomTat={t.faq.moTatCa.replace("{n}", String(t.faq.muc.length))}>
            {t.faq.muc.map((m) => (
              <details key={m.hoi} className="lg-faq__muc">
                <summary className="lg-faq__hoi">{m.hoi}</summary>
                <p className="lg-faq__dap">{m.dap}</p>
              </details>
            ))}
          </GapTrenMobile>
        </div>
      </div>
    </section>
  );
}

/** CTA cuối: một câu + một nút, trên nền sáng (mục 5). */
export function CtaCuoi({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-section--tight lg-vien-tren" id="thu-custos">
      <div className="lg-shell lg-cta__in">
        <div className="lg-cta__chu">
          <h2 className="lg-h2">{t.cuoi.h2}</h2>
          <p className="lg-muted lg-ab__mota">{t.cuoi.moTa}</p>
        </div>
        {/* Kết trang bằng ĐÚNG hành động chủ lực của hero và hành trình (critique 09/10): trước đây nút
            chính dẫn vào phòng phân tích — thứ chính trang này gọi là lối phụ. */}
        <div className="lg-cta__nut">
          {/* Cùng MỘT nút chính với hero; các lối khác là link chữ (review UX 11/2026). */}
          <a className="lg-btn lg-btn--primary" href={LINK.solBonus} target="_blank" rel="noreferrer noopener" aria-describedby="lg-cta-cuoi-ghichu">
            {t.chung.thuNguoiDung}
            <span className="lg-sr"> ({t.chung.moTabMoi})</span>
          </a>
          <p className="lg-caption lg-cta__ghichu" id="lg-cta-cuoi-ghichu">{t.chung.thuNguoiDungGhiChu}</p>
          <p className="lg-cta__lien">
            <a className="lg-link lg-cta__phu" href={LINK.tichHop}>
              {t.hanhTrinh.ctaNhaPhatTrien} <span aria-hidden="true">→</span>
            </a>
            <a className="lg-link lg-cta__phu" href={LINK.viMau}>
              {t.chung.moDemo} <span aria-hidden="true">→</span>
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ t, dieuKhienChuyenDong }: { t: NoiDung; dieuKhienChuyenDong?: ReactNode }) {
  return (
    <footer className="lg-footer lg-dark">
      <div className="lg-shell lg-footer__in">
        <div className="lg-footer__brand">
          <img
            src={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`}
            alt=""
            width={36}
            height={36}
          />
          <div>
            <strong>{t.nav.brand}</strong>
            <p className="lg-caption lg-muted-dark">{t.footer.dinhVi}</p>
          </div>
        </div>

        <ul className="lg-footer__lien">
          {t.footer.lien.map((l) => {
            const href = LINK[l.khoa as keyof typeof LINK];
            const ngoai = href.startsWith("http");
            return (
              <li key={l.nhan}>
                <a
                  href={href}
                  {...(ngoai ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                >
                  {l.nhan}
                  {ngoai && <span className="lg-sr"> ({t.chung.moTabMoi})</span>}
                </a>
              </li>
            );
          })}
        </ul>

        <p className="lg-caption lg-muted-dark lg-footer__ghichu">{t.footer.ghiChu}</p>
        {dieuKhienChuyenDong && <div className="lg-footer__chuyen-dong">{dieuKhienChuyenDong}</div>}
      </div>
    </footer>
  );
}

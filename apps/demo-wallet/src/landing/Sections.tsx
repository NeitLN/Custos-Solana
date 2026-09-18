import type { NoiDung } from "./content.ts";
import { LINK } from "./links.ts";

/**
 * Các section sau A/B.
 *
 * ## UI-06 — gộp nội dung thay vì rút spacing
 *
 * Bản trước có ba chỗ kể lại cùng một hành trình: ba thẻ giá trị, phần A/B, rồi
 * "bắt đầu trong ba bước" trên nền lilac riêng. Mục 2 nói rõ: *"Loại trùng nội
 * dung trước khi giảm spacing"* và *"không giảm font body"*.
 *
 * Nay còn một section `PipelineSection`: ba bước theo pipeline THẬT (nhận tx →
 * mô phỏng → trả kết quả kèm giới hạn), và ba giá trị rút thành một hàng mô tả
 * nhẹ bên dưới, **không đánh số** — số 1/2/3 chỉ dành cho chuỗi pipeline.
 *
 * Section "bắt đầu" nền lilac đã bỏ; hướng dẫn dùng thử nằm cạnh CTA của A/B.
 */

/**
 * Pipeline ba bước + ba giá trị.
 *
 * Chỉ MỘT section nền tối trên cả trang (developer). Các phần còn lại nối bằng
 * khoảng trắng và divider nhẹ (`lg-vien-tren`), thay vì đổi nền mỗi lần.
 */
export function PipelineSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-vien-tren" id="cach-hoat-dong">
      <div className="lg-shell">
        <h2 className="lg-h2">{t.pipeline.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-ab__mota">{t.pipeline.moTa}</p>

        <ol className="lg-pipeline">
          {t.pipeline.buoc.map((b, i) => (
            <li key={b.tieuDe} className="lg-buoc">
              <span className="lg-buoc__so">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="lg-h3">{b.tieuDe}</h3>
              <p className="lg-muted">{b.moTa}</p>
            </li>
          ))}
        </ol>

        <p className="lg-caption lg-pipeline__ghichu">{t.pipeline.ghiChu}</p>

        {/* Ba giá trị — hàng mô tả nhẹ, KHÔNG card, KHÔNG số thứ tự. */}
        <div className="lg-giatri">
          {t.giaTri.the.map((the) => (
            <div key={the.tieuDe} className="lg-giatri__o">
              <h3>{the.tieuDe}</h3>
              <p>{the.moTa}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Đoạn code cho nhà phát triển — API HIỆN HÀNH.
 *
 * Giữ nguyên từ bản trước: `inspect(deps, tx, options)` trả `InspectResult`. Mục
 * 5 cấm API tưởng tượng và cấm `if safe then sign()` thiếu coverage/consent, nên
 * ví dụ dừng ở chỗ đọc kết quả.
 */
const VI_DU_CODE = `import { inspect } from "@custos-solana/core";

const ketQua = await inspect({ connection }, tx, {
  locale: "vi",
  nguoiDung: viNguoiDung.toBase58(),
});

// Chú thích ngắn để dòng không tràn ngang trên màn hình hẹp.
ketQua.level;        // "safe" | "warning" | "danger"
ketQua.reasonCodes;  // ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"]
ketQua.coverage;     // phần đã đọc hiểu được
ketQua.diff;         // thay đổi để hiển thị`;

export function DeveloperSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-dark" id="nha-phat-trien">
      <div className="lg-shell lg-dev">
        <div>
          <h2 className="lg-h2">{t.devs.h2}</h2>
          <p className="lg-lead lg-prose lg-muted-dark lg-dev__mota">{t.devs.moTa}</p>

          <ol className="lg-dev__sodo">
            {t.devs.soDo.map((b, i) => (
              <li key={b}>
                <span>{b}</span>
                {i < t.devs.soDo.length - 1 && <span aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
          <ol className="lg-dev__sodo lg-dev__sodo--nhanh">
            {t.devs.soDoNhanh.map((b, i) => (
              <li key={b}>
                <span>{b}</span>
                {i < t.devs.soDoNhanh.length - 1 && <span aria-hidden="true">→</span>}
              </li>
            ))}
          </ol>
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

        <figure className="lg-code">
          <figcaption className="lg-code__dau">{t.devs.codeTieuDe}</figcaption>
          <pre className="lg-code__pre">
            <code>{VI_DU_CODE}</code>
          </pre>
          <p className="lg-caption lg-code__ghichu">{t.devs.codeGhiChu}</p>
        </figure>
      </div>
    </section>
  );
}

/** Danh sách tài liệu + một đoạn giới hạn nền neutral (không banner khổng lồ). */
export function ProofSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section" id="bang-chung">
      <div className="lg-shell">
        <h2 className="lg-h2">{t.bangChung.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-bcs__mota">{t.bangChung.moTa}</p>

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

        <p className="lg-gioihan lg-prose">{t.bangChung.gioiHan}</p>
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
          {t.faq.muc.map((m) => (
            <details key={m.hoi} className="lg-faq__muc">
              <summary className="lg-faq__hoi">{m.hoi}</summary>
              <p className="lg-faq__dap">{m.dap}</p>
            </details>
          ))}
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
        <div className="lg-cta__nut">
          <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
            {t.chung.moDemo}
          </a>
          <a
            className="lg-btn lg-btn--outline"
            href={LINK.sdkDocs}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t.cuoi.lienPhu}
            <span className="lg-sr"> ({t.chung.moTabMoi})</span>
          </a>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter({ t }: { t: NoiDung }) {
  return (
    <footer className="lg-footer lg-dark">
      <div className="lg-shell lg-footer__in">
        <div className="lg-footer__brand">
          <img
            src={`${import.meta.env.BASE_URL}landing/custos-dino-128.png`}
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
      </div>
    </footer>
  );
}

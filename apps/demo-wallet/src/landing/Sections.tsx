import type { NoiDung } from "./content.ts";
import { LINK } from "./links.ts";

/**
 * Các section còn lại của landing.
 *
 * Gộp trong một file vì mỗi phần dưới đây là một hàm trình bày thuần, không có
 * state riêng. Đặc tả mục 11.1 nói rõ: *"Không nhất thiết tách một file cho một
 * dòng chữ. Component lớn tách khi có state/trách nhiệm riêng."* Hai phần CÓ state
 * — header và A/B — đã ở file riêng.
 */

/** Dải lime thấp. Thông tin tĩnh, không phải logo đối tác (mục 6.3). */
export function DaiThongTin({ t }: { t: NoiDung }) {
  return (
    <section className="lg-dai">
      <ul className="lg-shell lg-dai__ds">
        {t.dai.map((o) => (
          <li key={o.manh} className="lg-dai__o">
            <strong>{o.manh}</strong>
            <span>{o.phu}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Ba giá trị + sơ đồ luồng. Ba thẻ chỉ xuất hiện ĐÚNG MỘT LẦN trên cả trang. */
export function ValueSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-cream" id="cach-hoat-dong">
      <div className="lg-shell">
        <h2 className="lg-h2">{t.giaTri.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-gt__modau">{t.giaTri.moDau}</p>

        <ul className="lg-gt__ds">
          {t.giaTri.the.map((the, i) => (
            <li key={the.tieuDe} className="lg-card lg-gt__the">
              <span className="lg-gt__so" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="lg-h3">{the.tieuDe}</h3>
              <p className="lg-muted">{the.moTa}</p>
            </li>
          ))}
        </ul>

        {/*
          Sơ đồ luồng — đổi NHỊP so với ba thẻ phía trên (mục 3).
          Mũi tên là `aria-hidden` vì chúng trang trí; thứ tự đọc đã nằm trong danh
          sách có thứ tự.
        */}
        <ol className="lg-sodo">
          {t.giaTri.soDo.map((b, i) => (
            <li key={b} className="lg-sodo__buoc">
              <span className="lg-sodo__chu">{b}</span>
              {i < t.giaTri.soDo.length - 1 && (
                <span className="lg-sodo__mui" aria-hidden="true">
                  →
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="lg-caption lg-muted lg-sodo__ghichu">{t.giaTri.soDoGhiChu}</p>
      </div>
    </section>
  );
}

/** Ba bước bắt đầu. */
export function GettingStarted({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-section--tight lg-lilac" id="bat-dau">
      <div className="lg-shell">
        <h2 className="lg-h2">{t.batDau.h2}</h2>
        <ol className="lg-buoc__ds">
          {t.batDau.buoc.map((b, i) => (
            <li key={b.tieuDe} className="lg-buoc">
              <span className="lg-buoc__so" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3 className="lg-h3">{b.tieuDe}</h3>
                <p className="lg-muted">{b.moTa}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="lg-buoc__cuoi">
          <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
            {t.batDau.nut}
            <span aria-hidden="true">→</span>
          </a>
          <p className="lg-caption lg-muted">{t.batDau.ghiChu}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Đoạn code cho nhà phát triển.
 *
 * Đây là API HIỆN HÀNH: `inspect(deps, tx, options)` trả `InspectResult` với
 * `level`, `reasonCodes` và `coverage`. Mục 6.7 cấm API tưởng tượng kiểu
 * `custos.protectWallet()`, và cấm đoạn `if safe then sign()` thiếu
 * coverage/session/consent — nên ví dụ dưới đây DỪNG ở chỗ đọc kết quả và chú
 * thích chỉ sang hướng dẫn consumer.
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
        <div className="lg-dev__chu">
          <h2 className="lg-h2">{t.devs.h2}</h2>
          <p className="lg-lead lg-prose lg-muted-dark lg-dev__mota">{t.devs.moTa}</p>

          <ol className="lg-dev__sodo">
            {t.devs.soDo.map((b, i) => (
              <li key={b}>
                <span>{b}</span>
                {i < t.devs.soDo.length - 1 && <span aria-hidden="true"> → </span>}
              </li>
            ))}
          </ol>
          <ol className="lg-dev__sodo lg-dev__sodo--nhanh">
            {t.devs.soDoNhanh.map((b, i) => (
              <li key={b}>
                <span>{b}</span>
                {i < t.devs.soDoNhanh.length - 1 && <span aria-hidden="true"> → </span>}
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
                    className="lg-btn lg-btn--ghost"
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

/** Danh sách tài liệu 2 cột + câu giới hạn. Không bảng số đếm hoành tráng. */
export function ProofSection({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-cream" id="bang-chung">
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

/**
 * FAQ dùng `<details>`/`<summary>` native.
 *
 * Mục 12.1 cho phép, và đây là lựa chọn ít rủi ro nhất: keyboard, `aria-expanded`
 * và trạng thái mở/đóng do trình duyệt lo. Một accordion tự viết phải làm lại
 * đúng những thứ đó, và thường bỏ sót.
 */
export function FAQ({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-cream lg-section--tight" id="faq">
      <div className="lg-shell lg-faq">
        <h2 className="lg-h2">{t.faq.h2}</h2>
        <div className="lg-faq__ds">
          {t.faq.muc.map((m) => (
            <details key={m.hoi} className="lg-faq__muc">
              <summary className="lg-faq__hoi">{m.hoi}</summary>
              <p className="lg-faq__dap lg-muted">{m.dap}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaCuoi({ t }: { t: NoiDung }) {
  return (
    <section className="lg-section lg-lilac lg-cta" id="thu-custos">
      <div className="lg-shell lg-cta__in">
        <h2 className="lg-h2">{t.cuoi.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-cta__mota">{t.cuoi.moTa}</p>
        <div className="lg-cta__nut">
          <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
            {t.chung.moDemo}
            <span aria-hidden="true">→</span>
          </a>
          <a
            className="lg-btn lg-btn--ghost"
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
            width={40}
            height={40}
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

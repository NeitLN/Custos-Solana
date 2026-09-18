import { useEffect, useId, useRef, useState } from "react";
import type { Ngon, NoiDung } from "./content.ts";
import { LINK } from "./links.ts";

/**
 * Navbar trắng gọn + menu mobile chứa VI/EN.
 *
 * ## UI-02 — vì sao VI/EN chuyển vào menu ở mobile
 *
 * ĐÃ TÁI HIỆN VÀ ĐO trên bản build: ở 320px, ba cụm trên một hàng (brand +
 * VI/EN + nút chữ "Mở menu") cho `scrollWidth = 358`, tràn **38px**. Bản EN tệ
 * hơn — **55px** — vì "Open menu" dài hơn "Mở menu"; và **360px EN cũng tràn
 * 15px**, điều tài liệu chưa ghi.
 *
 * Sửa theo mục 2: ≤640px header chỉ giữ brand và một nút icon 44×44px; VI/EN
 * nằm trong menu mở. Chức năng đổi ngôn ngữ KHÔNG mất — nó đổi chỗ. Nút icon
 * vẫn có tên accessible đầy đủ theo locale qua `.lg-sr`.
 *
 * Không scale header, không `overflow-x: hidden` — cả hai đều là giấu lỗi.
 */
export function SiteHeader({
  t,
  ngon,
  doiNgon,
}: {
  t: NoiDung;
  ngon: Ngon;
  doiNgon: (n: Ngon) => void;
}) {
  const [mo, setMo] = useState(false);
  const [daCuon, setDaCuon] = useState(false);
  const menuId = useId();
  const nutMenu = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setDaCuon(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Escape đóng menu và TRẢ FOCUS về nút mở — nếu không, focus rơi vào khoảng không. */
  useEffect(() => {
    if (!mo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMo(false);
        nutMenu.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mo]);

  return (
    <header className={`lg-header${daCuon ? " lg-header--cuon" : ""}`}>
      <div className="lg-shell lg-header__in">
        <a className="lg-brand" href="#dau-trang">
          <img
            className="lg-brand__symbol"
            src={`${import.meta.env.BASE_URL}brand/custos-symbol.svg`}
            alt=""
            width={36}
            height={36}
          />
          <span className="lg-brand__chu">
            <strong>{t.nav.brand}</strong>
            <span className="lg-brand__phu">{t.nav.brandPhu}</span>
          </span>
        </a>

        <nav className="lg-nav" aria-label={t.nav.brand}>
          <ul className="lg-nav__ds">
            {t.nav.muc.map((m) => (
              <li key={m.dich}>
                <a className="lg-nav__lien" href={m.dich}>
                  {m.nhan}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg-header__phai">
          {/* Ở ≤640px cụm này bị ẩn bằng CSS và bản trong menu tiếp quản. */}
          <BoChonNgon t={t} ngon={ngon} doiNgon={doiNgon} />

          <a className="lg-btn lg-btn--primary lg-header__cta" href={LINK.viMau}>
            {t.chung.moDemo}
          </a>

          {/*
            Nút ICON, không phải nút chữ.
            Chữ "Mở menu"/"Open menu" có chiều rộng khác nhau giữa hai locale, và
            đó là một phần nguyên nhân 320px EN tràn nhiều hơn VI. Tên accessible
            vẫn đầy đủ, chỉ không chiếm chỗ.
          */}
          <button
            ref={nutMenu}
            type="button"
            className="lg-menu-nut"
            aria-expanded={mo}
            aria-controls={menuId}
            onClick={() => setMo((v) => !v)}
          >
            <span className="lg-menu-nut__vach" aria-hidden="true" />
            <span className="lg-sr">{mo ? t.chung.dongMenu : t.chung.moMenu}</span>
          </button>
        </div>
      </div>

      {mo && (
        <div className="lg-menu" id={menuId}>
          <div className="lg-shell">
            <ul className="lg-menu__ds">
              {t.nav.muc.map((m) => (
                <li key={m.dich}>
                  <a className="lg-menu__lien" href={m.dich} onClick={() => setMo(false)}>
                    {m.nhan}
                  </a>
                </li>
              ))}
              <li>
                <a className="lg-menu__lien lg-menu__lien--cta" href={LINK.viMau}>
                  {t.chung.moDemo}
                </a>
              </li>
            </ul>

            {/* VI/EN trong menu — đường truy cập duy nhất ở ≤640px. */}
            <div className="lg-menu__ngon">
              <span className="lg-menu__ngon-nhan" id={`${menuId}-ngon`}>
                {t.chung.doiNgonNgu}
              </span>
              <BoChonNgon t={t} ngon={ngon} doiNgon={doiNgon} nhanBoi={`${menuId}-ngon`} />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/**
 * VI / EN.
 *
 * Nhãn nhìn thấy là `VI`/`EN`; accessible name là tên đầy đủ. Không cờ quốc gia.
 * `aria-pressed` cho biết bản nào đang bật mà không cần màu.
 *
 * Render HAI LẦN (header và menu) nên `aria-label` phải khác nhau khi cả hai
 * cùng trong DOM — dùng `nhanBoi` để bản trong menu trỏ tới nhãn chữ cạnh nó
 * thay vì lặp lại một `aria-label` trùng.
 */
function BoChonNgon({
  t,
  ngon,
  doiNgon,
  nhanBoi,
}: {
  t: NoiDung;
  ngon: Ngon;
  doiNgon: (n: Ngon) => void;
  nhanBoi?: string;
}) {
  return (
    <div
      className="lg-ngon"
      role="group"
      {...(nhanBoi ? { "aria-labelledby": nhanBoi } : { "aria-label": t.chung.doiNgonNgu })}
    >
      <button
        type="button"
        className="lg-ngon__nut"
        aria-pressed={ngon === "vi"}
        onClick={() => doiNgon("vi")}
      >
        <span aria-hidden="true">VI</span>
        <span className="lg-sr">{t.chung.tiengViet}</span>
      </button>
      <button
        type="button"
        className="lg-ngon__nut"
        aria-pressed={ngon === "en"}
        onClick={() => doiNgon("en")}
      >
        <span aria-hidden="true">EN</span>
        <span className="lg-sr">{t.chung.tiengAnh}</span>
      </button>
    </div>
  );
}

import { useEffect, useId, useRef, useState } from "react";
import type { Ngon, NoiDung } from "./content.ts";
import { LINK } from "./links.ts";

/**
 * Navbar sticky + chuyển ngôn ngữ + menu mobile.
 *
 * Ba điều đặc tả mục 6.1 và 7.1 đòi, và cả ba đều là hành vi chứ không phải hình:
 *
 *   1. Menu mobile có TÊN, `aria-expanded`, đóng bằng Escape và khi chọn link,
 *      trả focus về nút mở.
 *   2. Anchor là link THẬT — không `preventDefault`, nên back/forward còn chạy.
 *   3. VI/EN là điều khiển thật, không chỉ đổi navbar.
 *
 * Navbar không đổi chiều cao khi cuộn (mục 7.1): chỉ thêm đường viền dưới để tách
 * khỏi nội dung. Đổi chiều cao sẽ làm cả trang giật một nhịp mỗi lần cuộn qua mốc.
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
            className="lg-brand__dino"
            src={`${import.meta.env.BASE_URL}landing/custos-dino-128.png`}
            alt=""
            width={44}
            height={44}
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
          <BoChonNgon t={t} ngon={ngon} doiNgon={doiNgon} />
          <a className="lg-btn lg-btn--primary lg-header__cta" href={LINK.viMau}>
            {t.chung.moDemo}
            <span aria-hidden="true">→</span>
          </a>
          <button
            ref={nutMenu}
            type="button"
            className="lg-menu-nut"
            aria-expanded={mo}
            aria-controls={menuId}
            onClick={() => setMo((v) => !v)}
          >
            {mo ? t.chung.dongMenu : t.chung.moMenu}
          </button>
        </div>
      </div>

      {/*
        Menu mobile: KHÔNG render khi đóng.

        Giữ nó trong DOM với `display: none` vẫn an toàn cho screen reader, nhưng
        bỏ hẳn thì không có cách nào focus lọt vào nội dung đang ẩn — đúng điều
        mục 12.1 đòi.
      */}
      {mo && (
        <div className="lg-menu" id={menuId}>
          <ul className="lg-shell lg-menu__ds">
            {t.nav.muc.map((m) => (
              <li key={m.dich}>
                <a className="lg-menu__lien" href={m.dich} onClick={() => setMo(false)}>
                  {m.nhan}
                </a>
              </li>
            ))}
            <li>
              <a className="lg-menu__lien lg-menu__lien--cta" href={LINK.viMau}>
                {t.chung.moDemo} →
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

/**
 * VI / EN.
 *
 * Mục 10 cấm dùng cờ quốc gia làm nhãn ngôn ngữ; nhãn nhìn thấy là `VI`/`EN`, còn
 * accessible name là tên đầy đủ ("Tiếng Việt" / "English"). `aria-pressed` cho
 * biết bản nào đang bật mà không cần màu.
 */
function BoChonNgon({
  t,
  ngon,
  doiNgon,
}: {
  t: NoiDung;
  ngon: Ngon;
  doiNgon: (n: Ngon) => void;
}) {
  return (
    <div className="lg-ngon" role="group" aria-label={t.chung.doiNgonNgu}>
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

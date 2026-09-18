import type { NoiDung, Ngon } from "./content.ts";
import { LINK } from "./links.ts";
import { FIXTURE, dinhDangToken, layCa } from "./sample.ts";

/**
 * Hero hai cột: chữ bên trái, khung giao dịch bên phải.
 *
 * Khung bên phải là **DOM/CSS**, không phải ảnh render (mục 6.2). Lý do rất thực
 * tế: một ảnh chứa chữ sẽ mờ trên màn hình retina, không đổi được theo ngôn ngữ,
 * và screen reader không đọc được. Đây lại đúng là chỗ mang thông điệp chính.
 *
 * Số trong khung lấy từ CÙNG fixture với phần A/B bên dưới, nên hai nơi không bao
 * giờ lệch nhau (WEB-03).
 */
export function Hero({ t, ngon }: { t: NoiDung; ngon: Ngon }) {
  const caB = layCa("b");
  const soDuTruoc = dinhDangToken(caB.soDu.truoc, caB.soDu.decimals, ngon);
  const soDuSau = dinhDangToken(caB.soDu.sau, caB.soDu.decimals, ngon);

  return (
    <section className="lg-hero lg-dark" id="dau-trang">
      <div className="lg-shell lg-hero__grid">
        <div className="lg-hero__chu">
          <p className="lg-eyebrow lg-hero__eyebrow">{t.hero.eyebrow}</p>
          <h1 className="lg-h1 lg-hero__h1">{t.hero.h1}</h1>
          <p className="lg-lead lg-prose lg-muted-dark lg-hero__mota">{t.hero.moTa}</p>

          <div className="lg-hero__nut">
            <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
              {t.chung.moDemo}
              <span aria-hidden="true">→</span>
            </a>
            <a className="lg-btn lg-btn--ghost" href="#cach-hoat-dong">
              {t.chung.xemCachHoatDong}
            </a>
          </div>

          <p className="lg-caption lg-muted-dark lg-hero__ghichu">
            <span className="lg-cham" aria-hidden="true" />
            {t.hero.ghiChu}
          </p>
        </div>

        <div className="lg-hero__khung">
          {/*
            Tấm nền nghiêng 3 độ (mục 3). Nội dung đọc được vẫn THẲNG — nghiêng cả
            khung sẽ làm một bảng dữ liệu khó đọc, và đây là bảng người xem cần đọc.
            `aria-hidden` vì nó thuần trang trí.
          */}
          <div className="lg-hero__nen" aria-hidden="true" />

          <article className="lg-panel lg-preview">
            <header className="lg-preview__dau">
              <span className="lg-preview__ten">{t.hero.khung.tieuDe}</span>
              <span className="lg-pill lg-preview__mang">{t.hero.khung.mang}</span>
            </header>

            {/*
              Nhãn "kết quả mẫu" TÁCH khỏi nhãn mạng.

              Mục 6.2 nói rõ: chỉ riêng chữ "Devnet" không đủ phân biệt live với
              mẫu. Một người đọc "Devnet" hoàn toàn có thể nghĩ trang đang chạy
              thật trên Devnet.
            */}
            <p className="lg-preview__nhanmau">
              <span className="lg-pill lg-pill--mau">{t.hero.khung.nhanMau}</span>
            </p>

            <p className="lg-preview__hanhdong">{t.hero.khung.hanhDong}</p>

            <dl className="lg-preview__ds">
              <div className="lg-preview__hang">
                <dt>{t.hero.khung.nhanSoDu}</dt>
                <dd>
                  <span className="lg-preview__truoc">{soDuTruoc}</span>
                  <span aria-hidden="true" className="lg-preview__mui">
                    →
                  </span>
                  <strong>{soDuSau}</strong>
                </dd>
              </div>

              {/*
                Hàng QUYỀN — điểm nhớ của cả trang.

                Không dựa riêng vào màu đỏ (mục 12.1): có icon, có nhãn chữ
                "Quyền thay đổi", và nền riêng. Tắt màu vẫn đọc được nghĩa.
              */}
              <div className="lg-preview__hang lg-preview__hang--nguy">
                <dt>
                  <span className="lg-canhbao-icon" aria-hidden="true">
                    !
                  </span>
                  {t.hero.khung.nhanQuyen}
                </dt>
                <dd>
                  <span className="lg-preview__truoc">{t.hero.khung.chuBan}</span>
                  <span aria-hidden="true" className="lg-preview__mui">
                    →
                  </span>
                  <strong>{t.hero.khung.diaChiKhac}</strong>
                  <span className="lg-pill lg-pill--nguy">{t.hero.khung.quyenThayDoi}</span>
                </dd>
              </div>
            </dl>

            <a className="lg-link lg-preview__lien" href="#trai-nghiem">
              {t.hero.khung.xemTinhHuong} →
            </a>
          </article>

          {/*
            Hai chip instruction — LABEL, không phải button (mục 7.2).

            Chúng không bấm được, nên không được mang hình dạng nút. Cho chúng
            viền và bóng giống nút sẽ là mời người dùng bấm vào một thứ không phản
            hồi.
          */}
          <span className="lg-chip lg-chip--transfer">{t.hero.khung.chipTransfer}</span>
          <span className="lg-chip lg-chip--auth">{t.hero.khung.chipSetAuthority}</span>

          <p className="lg-caption lg-muted-dark lg-preview__caption">{t.hero.khung.caption}</p>
        </div>
      </div>

      <p className="lg-sr" aria-live="off">
        {/* Nguồn dữ liệu khung hero, đọc được bằng screen reader nhưng không chiếm chỗ. */}
        {t.chung.nguonDuLieu}: {FIXTURE.nguonGoc.moTa}
      </p>
    </section>
  );
}

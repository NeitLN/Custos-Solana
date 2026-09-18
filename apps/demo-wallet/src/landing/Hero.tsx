import type { NoiDung, Ngon } from "./content.ts";
import { LINK } from "./links.ts";
import { dinhDangToken, layCa } from "./sample.ts";

/**
 * Hero SÁNG — nền `bg`, phiếu phân tích bên phải.
 *
 * ## Ba thứ đã bỏ so với bản trước
 *
 *   1. **Chip instruction absolute** (UI-03). Đã tái hiện ở 390px: chip
 *      `519,89–558,52` giao với tiêu đề khung `552,27–577,02`, che mất chữ. Sửa
 *      không phải là thêm padding để né một vật trang trí — mà là bỏ hẳn nó.
 *      Thành phần giao dịch giờ nằm trong hàng "Thành phần" thuộc flow thường.
 *   2. **Backplate nghiêng 3 độ** — chi tiết đặc trưng của mẫu cũ, và cũng là
 *      thứ từng đè lên caption.
 *   3. **Hard shadow** `7px 7px 0`. Phiếu dùng border 1px.
 *
 * ## Phiếu chia hai nhóm có nghĩa
 *
 * `TÀI SẢN` và `QUYỀN KIỂM SOÁT` là hai nhóm tách bạch (mục 5) — đó chính là
 * điều sản phẩm muốn người đọc phân biệt. Số lấy từ cùng fixture với phần A/B
 * bên dưới, nên hai nơi không bao giờ lệch nhau.
 */
export function Hero({ t, ngon }: { t: NoiDung; ngon: Ngon }) {
  const caB = layCa("b");
  const soDuTruoc = dinhDangToken(caB.soDu.truoc, caB.soDu.decimals, ngon);
  const soDuSau = dinhDangToken(caB.soDu.sau, caB.soDu.decimals, ngon);

  return (
    <section className="lg-hero" id="dau-trang">
      <div className="lg-shell lg-hero__grid">
        <div>
          <p className="lg-kicker">{t.hero.kicker}</p>
          <h1 className="lg-h1 lg-hero__h1">{t.hero.h1}</h1>
          <p className="lg-lead lg-prose lg-muted lg-hero__mota">{t.hero.moTa}</p>

          <div className="lg-hero__nut">
            <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
              {t.chung.moDemo}
            </a>
            {/* CTA phụ dạng text link (mục 5), không phải nút thứ hai. */}
            <a className="lg-lien-cta" href="#trai-nghiem">
              {t.hero.ctaPhu}
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <p className="lg-caption lg-hero__ghichu">{t.hero.ghiChu}</p>
        </div>

        <article className="lg-panel lg-phieu">
          <header className="lg-phieu__dau">
            <span className="lg-phieu__ten">{t.hero.phieu.tieuDe}</span>
            {/*
              Hai nhãn TÁCH BIỆT: nguồn dữ liệu và mạng.
              Chỉ riêng chữ "Devnet" không phân biệt được mẫu với live — một
              người đọc hoàn toàn có thể nghĩ trang đang chạy thật trên Devnet.
            */}
            <span className="lg-badge lg-badge--mau">{t.hero.phieu.nhanMau}</span>
          </header>

          <p className="lg-phieu__hanhdong">
            <strong>{t.hero.phieu.hanhDong}</strong>
            <span className="lg-badge">{t.hero.phieu.mang}</span>
          </p>

          <div className="lg-phieu__nhom">
            <p className="lg-phieu__nhan-nhom">{t.hero.phieu.nhomTaiSan}</p>
            <dl>
              <div className="lg-phieu__hang">
                <dt>{t.hero.phieu.nhanSoDu}</dt>
                <dd>
                  <span className="lg-phieu__truoc lg-so">{soDuTruoc}</span>
                  <span className="lg-phieu__mui" aria-hidden="true">
                    →
                  </span>
                  <span className="lg-so">{soDuSau}</span>
                </dd>
              </div>
            </dl>
          </div>

          <div className="lg-phieu__nhom">
            <p className="lg-phieu__nhan-nhom">{t.hero.phieu.nhomQuyen}</p>
            <dl>
              {/* Hàng quyền: nền đỏ nhạt + icon + câu mô tả — không chỉ màu. */}
              <div className="lg-phieu__hang lg-phieu__hang--nguy">
                <dt>
                  <span className="lg-icon-nguy" aria-hidden="true">
                    !
                  </span>
                  {t.hero.phieu.nhanQuyen}
                </dt>
                <dd>
                  <span className="lg-phieu__truoc">{t.hero.phieu.chuBan}</span>
                  <span className="lg-phieu__mui" aria-hidden="true">
                    →
                  </span>
                  <strong>{t.hero.phieu.diaChiKhac}</strong>
                </dd>
              </div>
            </dl>
            <p className="lg-phieu__canhbao">{t.hero.phieu.cauCanhBao}</p>
          </div>

          <a className="lg-link lg-phieu__lien" href="#trai-nghiem">
            {t.hero.phieu.xemDoiChieu} <span aria-hidden="true">→</span>
          </a>

          <p className="lg-caption lg-phieu__caption">{t.hero.phieu.caption}</p>
        </article>
      </div>
    </section>
  );
}

/**
 * Hàng thông tin dưới hero — thay dải lime toàn chiều ngang (mục 5).
 *
 * Nằm TRONG `.lg-shell` nên nó cùng mép nội dung với hero. Đây là chỗ lỗi UI-04
 * từng xảy ra: trước kia `<ul class="lg-shell">` bị reset list ăn mất
 * `margin`/`padding`, làm chữ chạm mép màn hình.
 */
export function HangThongTin({ t }: { t: NoiDung }) {
  return (
    <section className="lg-thongtin lg-vien-tren">
      <div className="lg-shell">
        <ul className="lg-thongtin__ds">
          {t.dai.map((o) => (
            <li key={o.manh} className="lg-thongtin__o">
              <strong>{o.manh}</strong>
              <span>{o.phu}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

import { Fragment, type ReactNode } from "react";
import type { NoiDung, Ngon } from "./content.ts";
import { LINK } from "./links.ts";
import { dinhDangToken, layCa } from "./sample.ts";
import { DesignIcon } from "./DesignIcon.tsx";
import { CinematicScene, CINEMA } from "./CinematicScene.tsx";
import { InspectionLens, ResourceIllustration } from "./InspectionArtwork.tsx";
import { ChipMuc } from "./ThanhPhanChung.tsx";

/**
 * Hero cinematic: nền quỹ đạo trang trí và phiếu phân tích thật ở foreground.
 * Mọi chữ/số của phiếu nằm trong flow, tách TÀI SẢN và QUYỀN KIỂM SOÁT.
 * Dữ liệu dùng cùng fixture với A/B; chuyển động không tạo kết quả mô phỏng.
 * H1 giữ accessible name đầy đủ khi các từ được tách để diễn hoạt.
 */
export function Hero({
  t,
  ngon,
  paused,
  dieuKhienChuyenDong,
}: {
  t: NoiDung;
  ngon: Ngon;
  paused: boolean;
  dieuKhienChuyenDong?: ReactNode;
}) {
  const caB = layCa("b");
  const soDuTruoc = dinhDangToken(caB.soDu.truoc, caB.soDu.decimals, ngon);
  const soDuSau = dinhDangToken(caB.soDu.sau, caB.soDu.decimals, ngon);
  const docHieu = t.hero.phieu.docHieu
    .replace("{x}", String(caB.coverage.analyzed))
    .replace("{y}", String(caB.coverage.total));
  const words = (line: string) => line.split(" ").map((word, i) => <Fragment key={i}><span className="cine-word-mask"><span className="cine-word">{word}</span></span>{i < line.split(" ").length - 1 ? " " : ""}</Fragment>);

  return (
    <section className="lg-hero" id="dau-trang">
      <CinematicScene paused={paused} />
      <div className="lg-shell lg-hero__grid">
        <div className="lg-hero__story">
          <p className="lg-kicker">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>{t.hero.kicker}</span>
          </p>
          <h1 className="lg-h1 lg-hero__h1" aria-label={t.hero.h1} key={ngon}>
            <span className="cine-title-line" aria-hidden="true">{words(ngon === "vi" ? "Hiểu điều" : "Understand")}</span>
            <span className="cine-title-line cine-title-line--decision" aria-hidden="true">
              <span className="cine-title-prefix">{words(ngon === "vi" ? "bạn" : "what you’re")}</span>{" "}
              <span className="cine-signature">{words(ngon === "vi" ? "sắp ký." : "about to sign.")}<span className="cine-signature__edge" /></span>
            </span>
          </h1>
          <p className="lg-lead lg-prose lg-muted lg-hero__mota">{t.hero.moTa}</p>

          {/*
            MỘT đường demo (review UX 11/2026): nút chính nói rõ nó mở SolBonus ở origin khác, và dải
            ba bước ngay dưới cho biết sẽ làm gì. Phòng phân tích và ví dụ A/B hạ xuống link chữ.
          */}
          <div className="lg-hero__nut">
            <a className="lg-btn lg-btn--primary lg-hero__cta-chinh" href={LINK.solBonus} target="_blank" rel="noreferrer noopener" aria-describedby="lg-hero-cta-phu">
              {t.chung.thuNguoiDung}
              <span className="lg-sr"> ({t.chung.moTabMoi})</span>
              <span className="cine-action-arrow"><DesignIcon kind="arrow" /></span>
            </a>
            <p className="lg-hero__cta-phu" id="lg-hero-cta-phu">{t.chung.thuNguoiDungGhiChu}</p>
            {/* Chỉ hiện ≤760px (CSS): trên điện thoại `window.open` thường thành tab mới. */}
            <p className="lg-hero__may-tinh">{t.chung.totNhatTrenMayTinh}</p>
          </div>
          <div className="lg-hero__buoc">
            <p className="lg-hero__buoc-nhan" id="lg-buoc-demo">{t.hero.buocDemo.nhan}</p>
            <ol aria-labelledby="lg-buoc-demo">
              {t.hero.buocDemo.buoc.map((b, i) => (
                <li key={b.ten}>
                  <span className="lg-hero__buoc-so" aria-hidden="true">{i + 1}</span>
                  <span><strong>{b.ten}</strong> <span className="lg-hero__buoc-mota">{b.moTa}</span></span>
                </li>
              ))}
            </ol>
          </div>
          <p className="lg-hero__lien-phu">
            <a className="lg-link" href={LINK.viMau}>{t.chung.moDemo} <span aria-hidden="true">→</span></a>
            <a className="lg-link" href="#trai-nghiem">{t.hero.ctaPhu} <span aria-hidden="true">↓</span></a>
          </p>
          <p className="lg-caption lg-hero__ghichu">{t.hero.ghiChu}</p>
        </div>

        <div className="cine-card-stage"><InspectionLens /><div className="cine-card-halo" aria-hidden="true" />
        <article className="lg-panel lg-phieu">
          <header className="lg-phieu__dau">
            <span className="lg-phieu__ten"><DesignIcon kind="scan" />{t.hero.phieu.tieuDe}</span>
            {/*
              Nhãn nói CẢ nguồn dữ liệu lẫn mạng: "Ví dụ đã ghi · Devnet".
              Chỉ riêng chữ "Devnet" không phân biệt được mẫu với live — một
              người đọc hoàn toàn có thể nghĩ trang đang chạy thật trên Devnet.
            */}
            <span className="lg-badge lg-badge--mau">{t.hero.phieu.nhanMau}</span>
          </header>

          <p className="lg-phieu__hanhdong">
            <strong>{t.hero.phieu.hanhDong}</strong>
          </p>

          {/*
            Ba thứ SDK thật sự trả về — mức, mã lý do, coverage — lấy NGUYÊN từ bản ghi ca B
            (`sample.ts`, neo vào artifact bằng `landing.test.ts`). Không gõ tay giá trị nào ở đây.
          */}
          <div className="lg-phieu__ketqua">
            <dl>
              <div className="lg-phieu__ketqua-hang">
                <dt>{t.hero.phieu.nhanMuc}</dt>
                <dd><ChipMuc level={caB.level} t={t} /></dd>
              </div>
              <div className="lg-phieu__ketqua-hang">
                <dt>{t.hero.phieu.nhanLyDo}</dt>
                <dd><code className="lg-mono lg-phieu__lydo">{caB.reasonCodes.join(", ")}</code></dd>
              </div>
              <div className="lg-phieu__ketqua-hang">
                <dt>{t.hero.phieu.nhanDoPhu}</dt>
                <dd className="lg-phieu__dochieu">{docHieu}</dd>
              </div>
            </dl>
          </div>

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
                  <span className="lg-sr"> {t.hero.phieu.thanh} </span>
                  <span className="lg-so">{soDuSau}</span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Chủ mới lấy từ bản ghi (dạng rút gọn; địa chỉ đầy đủ ở `title` và trong bằng chứng A/B). */}
          {caB.doiChu && (
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
                  <span className="lg-owner-node">{t.hero.phieu.chuBan}</span>
                  <span className="lg-phieu__mui" aria-hidden="true">
                    →
                  </span>
                  <span className="lg-sr"> {t.hero.phieu.thanh} </span>
                  <strong className="lg-owner-node lg-owner-node--changed lg-mono" title={caB.doiChu.sauDayDu}>{caB.doiChu.sau}</strong>
                </dd>
              </div>
            </dl>
            <p className="lg-phieu__canhbao">{t.hero.phieu.cauCanhBao}</p>
          </div>
          )}

          <p className="lg-caption lg-phieu__caption">{t.hero.phieu.caption}</p>
        </article>
        </div>
      </div>
      {/*
        Nút dừng chuyển động nằm TRONG luồng trang, ngay dưới phần có hoạt ảnh — trước đây là nút nổi
        cố định góc phải và che chữ/mũi tên (review UX 11/2026). `dieuKhienChuyenDong` do
        `LandingPage` dựng vì trạng thái dừng là của cả trang.
      */}
      <div className="lg-shell cine-hero-foot"><a href="#trai-nghiem"><span className="cine-scroll-line" aria-hidden="true" />{CINEMA[ngon].scroll}<span aria-hidden="true">↓</span></a>{dieuKhienChuyenDong}</div>
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
  const destinations = [LINK.viMau, "#nha-phat-trien", LINK.inspector, "#bang-chung"];
  return (
    <section className="lg-thongtin lg-vien-tren">
      <div className="lg-shell">
        <ul className="lg-thongtin__ds">
          {t.dai.map((o, i) => (
            <li key={o.manh} className="lg-thongtin__o">
              {/* Cả ô là MỘT link — mũi tên tròn chỉ là ký hiệu, không phải vùng bấm riêng. */}
              <a className="cine-resource" href={destinations[i]}>
                <ResourceIllustration index={i} />
                <span className="cine-resource__copy"><strong>{o.manh}</strong><span>{o.phu}</span></span>
                <span className="cine-resource__arrow" aria-hidden="true"><DesignIcon kind="arrow" /></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

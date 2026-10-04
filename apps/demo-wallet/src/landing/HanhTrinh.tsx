import type { NoiDung } from "./content.ts";
import { LINK } from "./links.ts";
import { DesignIcon } from "./DesignIcon.tsx";

/**
 * HÀNH TRÌNH KÝ — C2, ROADMAP-SAU-MENTOR. Bốn bước dApp → ví → Custos trong ví → bạn quyết định,
 * và hai lối vào: thử như người dùng (SolBonus, origin riêng) hoặc tích hợp (trang Tích hợp).
 * Dùng lại lớp `lg-pipeline` của phần "Cách hoạt động"; chỉ thêm biến thể bốn cột.
 */
export function HanhTrinh({ t }: { t: NoiDung }) {
  const h = t.hanhTrinh;
  return (
    <section className="lg-section lg-vien-tren" id="hanh-trinh">
      <div className="lg-shell">
        <h2 className="lg-h2">{h.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-ab__mota">{h.moTa}</p>
        <ol className="lg-pipeline lg-pipeline--bon">
          {h.buoc.map((b, i) => (
            <li key={b.tieuDe} className={`lg-buoc${i === 2 ? " lg-buoc--custos" : ""}`}>
              <div className="lg-step-visual" aria-hidden="true">
                <DesignIcon kind={i === 0 ? "transaction" : i === 2 ? "scan" : "evidence"} />
                <span className="lg-buoc__so">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="lg-h3">{b.tieuDe}</h3>
              <p className="lg-muted">{b.moTa}</p>
            </li>
          ))}
        </ol>
        <div className="lg-hanh-trinh__loi-vao">
          <div>
            <a className="lg-btn lg-btn--primary" href={LINK.solBonus} target="_blank" rel="noreferrer">
              {h.ctaNguoiDung}
              <span className="cine-action-arrow"><DesignIcon kind="arrow" /></span>
            </a>
            <p className="lg-caption">{h.ghiChuNguoiDung}</p>
          </div>
          <div>
            <a className="lg-btn" href={LINK.tichHop}>
              {h.ctaNhaPhatTrien}
              <span className="cine-action-arrow"><DesignIcon kind="arrow" /></span>
            </a>
            <p className="lg-caption">{h.ghiChuNhaPhatTrien}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

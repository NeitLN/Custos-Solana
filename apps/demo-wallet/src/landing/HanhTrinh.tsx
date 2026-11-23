import type { NoiDung } from "./content.ts";
import { LINK } from "./links.ts";
import { DesignIcon } from "./DesignIcon.tsx";
import { GapTrenMobile } from "./ThanhPhanChung.tsx";

/**
 * HÀNH TRÌNH KÝ — C2, ROADMAP-SAU-MENTOR. Bốn bước dApp → ví → Custos trong ví → bạn quyết định,
 * và hai lối vào: thử như người dùng (SolBonus, origin riêng) hoặc tích hợp (trang Tích hợp).
 *
 * Review UX 11/2026: đây là MỘT sơ đồ duy nhất. "Custos kiểm thế nào" (L1 → L2 → L3) từng là một
 * section riêng vẽ lại cùng quy trình; nay nó là phần mở rộng của bước 03, ngay dưới bốn bước.
 * Hai lối vào là link chữ — nút chính của trang chỉ có một, ở hero.
 *
 * `id="cach-hoat-dong"` giữ cho mục "Cách hoạt động" trên header vẫn trỏ đúng chỗ.
 */
export function HanhTrinh({ t }: { t: NoiDung }) {
  const h = t.hanhTrinh;
  const p = t.pipeline;
  return (
    <section className="lg-section lg-vien-tren" id="cach-hoat-dong">
      <div className="lg-shell">
        <h2 className="lg-h2">{h.h2}</h2>
        <p className="lg-lead lg-prose lg-muted lg-ab__mota">{h.moTa}</p>
        <ol className="lg-pipeline lg-pipeline--bon">
          {h.buoc.map((b, i) => (
            <li key={b.tieuDe} className={`lg-buoc${i === 2 ? " lg-buoc--custos" : ""}`}>
              <div className="lg-step-visual" aria-hidden="true">
                <DesignIcon kind={i === 0 ? "transaction" : i === 1 ? "wallet" : i === 2 ? "scan" : "evidence"} />
                <span className="lg-buoc__so">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="lg-h3">{b.tieuDe}</h3>
              <p className="lg-muted">{b.moTa}</p>
            </li>
          ))}
        </ol>

        {/* Bên trong bước 03 — ba lớp thật của một lượt kiểm. Trên mobile gập lại. */}
        <div className="lg-kiem-trong">
          <GapTrenMobile tomTat={p.h2}>
            <h3 className="lg-kiem-trong__tieude">{p.h2}</h3>
            <p className="lg-caption lg-kiem-trong__mota">{p.moTa}</p>
            <ol className="lg-kiem-trong__ds">
              {p.buoc.map((b) => (
                <li key={b.tieuDe}>
                  <h4>{b.tieuDe}</h4>
                  <p>{b.moTa}</p>
                </li>
              ))}
            </ol>
            <p className="lg-caption lg-pipeline__ghichu">{p.ghiChu}</p>
          </GapTrenMobile>
        </div>

        <div className="lg-hanh-trinh__loi-vao">
          <div>
            <a className="lg-link lg-lien-chu" href={LINK.solBonus} target="_blank" rel="noreferrer noopener">
              {h.ctaNguoiDung} <span aria-hidden="true">→</span>
              <span className="lg-sr"> ({t.chung.moTabMoi})</span>
            </a>
            <p className="lg-caption">{h.ghiChuNguoiDung}</p>
          </div>
          <div>
            <a className="lg-link lg-lien-chu" href={LINK.tichHop}>
              {h.ctaNhaPhatTrien} <span aria-hidden="true">→</span>
            </a>
            <p className="lg-caption">{h.ghiChuNhaPhatTrien}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

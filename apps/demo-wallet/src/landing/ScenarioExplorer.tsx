import { useState } from "react";
import type { NoiDung, Ngon } from "./content.ts";
import { LINK } from "./links.ts";
import { FIXTURE, dinhDangToken, layCa, type CaMau } from "./sample.ts";
import { ChipMuc } from "./ThanhPhanChung.tsx";

/**
 * A/B — đối chiếu ĐỒNG THỜI, đặt ngay sau hero.
 *
 * ## UI-05 — vì sao đổi từ "chọn một ca" sang bảng hai cột
 *
 * Bản trước hiển thị một ca tại một thời điểm, nên người xem phải **nhớ** ca vừa
 * rồi để thấy "cùng 490, khác quyền" — chính là điểm nhớ của cả trang. Cột
 * selector bên trái cũng bỏ trống phần lớn chiều cao khi evidence mở.
 *
 * Nay desktop dùng `<table>` semantic: hàng "Thao tác đổi chủ" đặt cạnh nhau nên
 * khác biệt đọc được trong một lần nhìn, không cần thao tác nào.
 *
 * ## Mobile KHÔNG ép bảng vào scroll ngang
 *
 * Mục 5 cấm: *"Không ép bảng desktop rộng vào mobile, không che cột B và không
 * dùng vuốt ngang làm thao tác bắt buộc."* Mobile hiện hai tóm tắt xếp dọc, kèm
 * **một dòng đối chiếu luôn thấy** lấy từ fixture.
 *
 * ## Điều KHÔNG đổi
 *
 * Ca A vẫn ghi "Không có thao tác đổi chủ trong transaction mẫu" — kết luận về
 * CẤU TRÚC transaction, không phải phép đo owner. Không bịa before/after cho A.
 *
 * ## Review UX 11/2026
 *
 * Hàng kết luận thành hàng "Mức cảnh báo": chip đúng `level` của bản ghi + mã lý do của bản ghi.
 * Nhãn nguồn nói rõ đây là "Ví dụ A/B (đã ghi)", và một dòng nói demo trực tiếp dùng token DEMO
 * nên số lượng khác — dữ liệu đã ghi KHÔNG bị sửa cho khớp. Mobile chỉ hiện hàng KHÁC NHAU; phần
 * giống nhau (10 token, còn 490) nằm trong dòng đối chiếu đặt trên hai thẻ.
 */
export function ScenarioExplorer({ t, ngon }: { t: NoiDung; ngon: Ngon }) {
  /* `null` = chưa mở evidence. Khác với "đang mở ca A". */
  const [caBangChung, setCaBangChung] = useState<"a" | "b" | null>(null);

  const a = layCa("a");
  const b = layCa("b");

  return (
    <section className="lg-section lg-surface lg-vien-tren" id="trai-nghiem">
      <div className="lg-shell">
        <div className="lg-ab__dau">
          <h2 className="lg-h2">{t.ab.h2}</h2>
          <p className="lg-lead lg-prose lg-muted lg-ab__mota">{t.ab.moTa}</p>
          <p className="lg-ab__nguon">
            <span className="lg-badge lg-badge--mau">{t.ab.nhanNguon}</span>
          </p>
          <p className="lg-caption lg-ab__live">{t.ab.ghiChuLive}</p>
        </div>

        {/* ── Desktop: bảng hai cột ───────────────────────────────────────── */}
        <div className="lg-ab__bang">
          <table className="lg-bang">
            <caption className="lg-sr">{t.ab.moTaBang}</caption>
            <thead>
              <tr>
                <th scope="col">{t.ab.cotTruong}</th>
                <th scope="col"><span className="lg-case-marker" aria-hidden="true">A</span>{t.ab.chonA}</th>
                <th scope="col"><span className="lg-case-marker lg-case-marker--b" aria-hidden="true">B</span>{t.ab.chonB}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t.ab.hang.tokenChuyen}</th>
                <td>{t.ab.giaTri.tokenChuyen}</td>
                <td>{t.ab.giaTri.tokenChuyen}</td>
              </tr>
              <tr className="lg-balance-comparison">
                <th scope="row">{t.ab.hang.soDuSau}</th>
                <td>{dinhDangToken(a.soDu.sau, a.soDu.decimals, ngon)}</td>
                <td>{dinhDangToken(b.soDu.sau, b.soDu.decimals, ngon)}</td>
              </tr>
              {/* Hàng quyền — trọng tâm của bảng. */}
              <tr className="lg-hang-quyen">
                <th scope="row">{t.ab.hang.doiChu}</th>
                <td className="lg-o-thuong">{t.ab.giaTri.khongCoDoiChu}</td>
                <td className="lg-o-nguy">
                  <span className="lg-icon-nguy" aria-hidden="true">
                    !
                  </span>
                  {t.ab.giaTri.coDoiChu}
                </td>
              </tr>
              {/* Hàng mức — kết luận của bản ghi, chữ đủ lớn để đọc trước tiên. */}
              <tr className="lg-hang-muc">
                <th scope="row">{t.ab.hang.ketLuan}</th>
                <td><OMuc t={t} ca={a} /></td>
                <td><OMuc t={t} ca={b} /></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Mobile: hai tóm tắt + dòng đối chiếu cố định ────────────────── */}
        <div className="lg-ab__tomtat">
          <p className="lg-ab__doichieu">{t.ab.dongDoiChieu}</p>
          <TomTat t={t} ca={a} ten={t.ab.chonA} />
          <TomTat t={t} ca={b} ten={t.ab.chonB} />
        </div>

        <div className="lg-ab__hanhdong">
          {/*
            Hai nút evidence RIÊNG cho từng ca.
            Mục 5: *"Evidence chọn ca nào phải hiện tên ca đó."* Một nút chung
            sẽ lại buộc người xem nhớ ca đang chọn — đúng vấn đề UI-05.
          */}
          <button
            type="button"
            className="lg-btn lg-btn--outline"
            aria-expanded={caBangChung === "a"}
            onClick={() => setCaBangChung((v) => (v === "a" ? null : "a"))}
          >
            {caBangChung === "a" ? t.ab.dongBangChungA : t.ab.moBangChungA}
          </button>
          <button
            type="button"
            className="lg-btn lg-btn--outline"
            aria-expanded={caBangChung === "b"}
            onClick={() => setCaBangChung((v) => (v === "b" ? null : "b"))}
          >
            {caBangChung === "b" ? t.ab.dongBangChungB : t.ab.moBangChungB}
          </button>
        </div>

        {caBangChung && (
          <BangChung
            t={t}
            ca={caBangChung === "a" ? a : b}
            tenCa={caBangChung === "a" ? t.ab.chonA : t.ab.chonB}
          />
        )}

        {/* Link chữ, không phải nút chính: nút chính của cả trang chỉ dẫn tới SolBonus. */}
        <div className="lg-ab__hanhdong lg-ab__lien-phong">
          <a className="lg-link lg-lien-chu" href={LINK.viMau} aria-describedby="lg-ab-cta-ghichu">
            {t.ab.cta} <span aria-hidden="true">→</span>
          </a>
          <p className="lg-caption lg-muted" id="lg-ab-cta-ghichu">{t.ab.ctaGhiChu}</p>
        </div>
      </div>
    </section>
  );
}

/**
 * Ô "Mức cảnh báo" của một ca: chip theo `level` của bản ghi, mã lý do của bản ghi (hoặc nói rõ là
 * không có), và một câu. Câu của ca A giữ "không phải lời bảo đảm an toàn".
 */
function OMuc({ t, ca }: { t: NoiDung; ca: CaMau }) {
  return (
    <div className="lg-o-muc">
      <ChipMuc level={ca.level} t={t} />
      <span className="lg-o-muc__ma">
        {ca.reasonCodes.length > 0 ? (
          <code className="lg-mono">{ca.reasonCodes.join(", ")}</code>
        ) : (
          t.ab.giaTri.khongCoMaLyDo
        )}
      </span>
      <span className={ca.level === "danger" ? "lg-ketluan--danger" : "lg-ketluan--safe"}>
        {ca.id === "a" ? t.ab.giaTri.ketLuanA : t.ab.giaTri.ketLuanB}
      </span>
    </div>
  );
}

/**
 * Tóm tắt một ca cho mobile — CHỈ những hàng khác nhau giữa A và B (thao tác đổi chủ, mức).
 * Hàng giống nhau (token chuyển, số dư sau) đã nằm trong dòng đối chiếu phía trên.
 */
function TomTat({ t, ca, ten }: { t: NoiDung; ca: CaMau; ten: string }) {
  const coDoiChu = ca.doiChu !== null;
  return (
    <section className={`lg-tt${coDoiChu ? " lg-tt--nguy" : ""}`}>
      <h3 className="lg-tt__ten">{ten}</h3>
      <dl>
        <div className="lg-tt__hang">
          <dt>{t.ab.hang.doiChu}</dt>
          <dd className={coDoiChu ? "lg-ketluan--danger" : "lg-muted"}>
            {coDoiChu ? t.ab.giaTri.coDoiChu : t.ab.giaTri.khongCoDoiChu}
          </dd>
        </div>
        <div className="lg-tt__hang lg-tt__hang--muc">
          <dt>{t.ab.hang.ketLuan}</dt>
          <dd><OMuc t={t} ca={ca} /></dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * Panel bằng chứng — mở dưới bảng, full width, nội dung ≤760px.
 *
 * Ca A KHÔNG có cảnh báo nào, nên panel của A nói đúng điều đó thay vì để trống
 * hoặc bịa một dữ kiện. Raw address / commit / ISO nằm trong `<details>` "kiểm
 * sâu" (mục 5), còn phần mặc định hiện thời điểm dễ đọc theo locale.
 */
function BangChung({ t, ca, tenCa }: { t: NoiDung; ca: CaMau; tenCa: string }) {
  const g = t.ab.bangChung;

  return (
    <div className="lg-bc">
      <div className="lg-bc__trong">
        <h3 className="lg-bc__tieude">{g.tieuDe}</h3>
        {/* Tên ca hiện ngay — không để người đọc đoán đang xem ca nào. */}
        <p className="lg-bc__ca">{tenCa}</p>

        {ca.doiChu === null ? (
          <p className="lg-bc__khongco">{g.khongCoCanhBao}</p>
        ) : (
          <dl className="lg-bc__ds">
            <div className="lg-bc__hang">
              <dt>{g.dieuThayDoi}</dt>
              <dd>{g.dieuThayDoiGiaTri}</dd>
            </div>
            <div className="lg-bc__hang">
              <dt>{g.truoc}</dt>
              {/* Fixture ghi "Bạn" = người ký; hiển thị theo ngôn ngữ trang. */}
              <dd>{ca.doiChu.truoc === "Bạn" ? t.hero.phieu.chuBan : ca.doiChu.truoc}</dd>
            </div>
            <div className="lg-bc__hang">
              <dt>{g.sau}</dt>
              <dd>{ca.doiChu.sau}</dd>
            </div>
            <div className="lg-bc__hang">
              <dt>{g.nguon}</dt>
              <dd>{g.nguonGiaTri}</dd>
            </div>
          </dl>
        )}

        {/*
          Kiểm sâu: địa chỉ đầy đủ, mã luật, ISO timestamp, commit.
          Mục 5 đặt chúng ở đây để phần mặc định đọc được, nhưng KHÔNG bỏ chúng —
          địa chỉ đầy đủ là thứ chống vanity address.
        */}
        <details className="lg-bc__sau">
          <summary>{g.kiemSau}</summary>
          <div className="lg-bc__nguon">
            {ca.doiChu !== null && (
              <>
                <p className="lg-caption">
                  <strong>{g.diaChiDayDu}:</strong>{" "}
                  <span className="lg-mono lg-diachi">{ca.doiChu.sauDayDu}</span>
                </p>
                <p className="lg-caption">
                  <strong>{g.luat}:</strong>{" "}
                  <span className="lg-mono">{ca.reasonCodes.join(", ")}</span>
                </p>
              </>
            )}
            <p className="lg-caption">
              <strong>{g.doLuc}:</strong>{" "}
              <time dateTime={FIXTURE.nguonGoc.doLuc}>{FIXTURE.nguonGoc.doLuc}</time>
            </p>
            <p className="lg-caption">
              <strong>{g.commitNguon}:</strong>{" "}
              <span className="lg-mono">{FIXTURE.nguonGoc.sourceCommit.slice(0, 12)}</span>
            </p>
            <p className="lg-caption lg-bc__gioihan">
              <strong>{g.gioiHan}:</strong> {g.gioiHanND}
            </p>
            <p className="lg-caption lg-bc__gioihan">{g.khongDuReplay}</p>
            <p>
              <a className="lg-link" href={LINK.nguonMau} target="_blank" rel="noreferrer noopener">
                {g.moArtifact}
                <span className="lg-sr"> ({t.chung.moTabMoi})</span>
              </a>
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

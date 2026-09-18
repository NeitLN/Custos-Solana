import { useId, useState } from "react";
import type { NoiDung, Ngon } from "./content.ts";
import { LINK } from "./links.ts";
import { FIXTURE, dinhDangToken, layCa, type CaMau } from "./sample.ts";

/**
 * A/B — phần trung tâm của trang.
 *
 * ## Vì sao hai button `aria-pressed` chứ không phải tab pattern
 *
 * Mục 7.3 cho chọn: *"nếu không cần độ phức tạp, dùng hai button với
 * `aria-pressed` và một vùng kết quả có heading rõ"*. Tab pattern đầy đủ đòi quản
 * lý roving tabindex và mũi tên trái/phải — thêm mã, thêm chỗ sai, mà ở đây chỉ có
 * hai lựa chọn. Hai button là thứ ít sai nhất và người dùng bàn phím đi qua bằng
 * Tab như mọi nút khác.
 *
 * ## Không giả lập gọi RPC
 *
 * Đổi A/B cập nhật TRỰC TIẾP. Không spinner, không delay (mục 7.3) — dữ liệu đã
 * nằm trong bundle, và một spinner ở đây sẽ là diễn kịch cho người xem tin rằng
 * trang đang chạy engine.
 */
export function ScenarioExplorer({ t, ngon }: { t: NoiDung; ngon: Ngon }) {
  const [chon, setChon] = useState<"a" | "b">("b");
  const [moBangChung, setMoBangChung] = useState(false);
  const vungId = useId();

  const ca = layCa(chon);

  return (
    <section className="lg-section lg-cream" id="trai-nghiem">
      <div className="lg-shell">
        <div className="lg-ab__dau">
          <h2 className="lg-h2">{t.ab.h2}</h2>
          <p className="lg-lead lg-prose lg-muted lg-ab__mota">{t.ab.moTa}</p>
        </div>

        <div className="lg-panel lg-ab">
          {/*
            Badge nguồn nằm TRONG panel và luôn hiển thị.

            Mục 7.3: *"Badge `Kết quả mẫu đã lưu` luôn còn thấy khi đổi A/B hoặc
            mở bằng chứng."* Đặt nó ngoài panel thì cuộn xuống đọc kết quả là mất
            nhãn — và người xem đang đọc một con số không còn biết nó từ đâu.
          */}
          <p className="lg-ab__nguon">
            <span className="lg-pill lg-pill--mau">{t.ab.nhanNguon}</span>
          </p>

          <div className="lg-ab__than">
            <div className="lg-ab__chon" role="group" aria-label={t.ab.nhomNhan}>
              <button
                type="button"
                className="lg-ab__nut"
                aria-pressed={chon === "a"}
                onClick={() => {
                  setChon("a");
                  setMoBangChung(false);
                }}
              >
                {t.ab.chonA}
              </button>
              <button
                type="button"
                className="lg-ab__nut"
                aria-pressed={chon === "b"}
                onClick={() => {
                  setChon("b");
                  setMoBangChung(false);
                }}
              >
                {t.ab.chonB}
              </button>
            </div>

            <div className="lg-ab__ketqua" id={vungId}>
              <h3 className="lg-h3 lg-ab__tenca">
                {chon === "a" ? t.ab.tenA : t.ab.tenB}
              </h3>
              <BangKetQua t={t} ngon={ngon} ca={ca} />

              <div className="lg-ab__hanhdong">
                <button
                  type="button"
                  className="lg-btn lg-btn--lime"
                  aria-expanded={moBangChung}
                  onClick={() => setMoBangChung((v) => !v)}
                >
                  {moBangChung ? t.ab.dongBangChung : t.ab.nutBangChung}
                </button>
              </div>

              {moBangChung && <BangChung t={t} ca={ca} />}
            </div>
          </div>
        </div>

        <div className="lg-ab__cuoi">
          <p className="lg-ab__ketluan">{t.ab.ketLuan}</p>
          <div className="lg-ab__cta">
            <a className="lg-btn lg-btn--primary" href={LINK.viMau}>
              {t.ab.cta}
              <span aria-hidden="true">→</span>
            </a>
            <p className="lg-caption lg-muted">{t.ab.ctaGhiChu}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Bảng bốn hàng. Hàng quyền đổi hình dạng theo ca, không chỉ đổi màu. */
function BangKetQua({ t, ngon, ca }: { t: NoiDung; ngon: Ngon; ca: CaMau }) {
  const soDuSau = dinhDangToken(ca.soDu.sau, ca.soDu.decimals, ngon);
  const coDoiChu = ca.doiChu !== null;

  return (
    <dl className="lg-bang">
      <div className="lg-bang__hang">
        <dt>{t.ab.hang.tokenChuyen}</dt>
        <dd>{t.ab.giaTri.tokenChuyen}</dd>
      </div>

      <div className="lg-bang__hang">
        <dt>{t.ab.hang.soDuSau}</dt>
        <dd>
          <strong>{soDuSau}</strong>
        </dd>
      </div>

      {/*
        HÀNG QUYỀN.

        Ca A ghi "Không có trong transaction mẫu" — đây là kết luận về CẤU TRÚC
        transaction, không phải phép đo owner trước/sau. Mục 6.5 cấm đích danh việc
        suy owner của A từ chỗ thiếu `diff`, nên ở đây không có cặp trước→sau nào
        cho A.
      */}
      <div className={`lg-bang__hang${coDoiChu ? " lg-bang__hang--nguy" : ""}`}>
        <dt>
          {coDoiChu && (
            <span className="lg-canhbao-icon" aria-hidden="true">
              !
            </span>
          )}
          {t.ab.hang.doiChu}
        </dt>
        <dd>
          {coDoiChu ? (
            <>
              <strong>{t.ab.giaTri.coDoiChu}</strong>
              <span className="lg-bang__doi">
                {ca.doiChu!.truoc}
                <span aria-hidden="true"> → </span>
                <span className="lg-mono">{ca.doiChu!.sau}</span>
              </span>
            </>
          ) : (
            t.ab.giaTri.khongCoDoiChu
          )}
        </dd>
      </div>

      <div className="lg-bang__hang">
        <dt>{t.ab.hang.ketLuan}</dt>
        <dd>
          <span className={`lg-ketluan lg-ketluan--${ca.level}`}>
            {ca.level === "danger" ? t.ab.giaTri.ketLuanB : t.ab.giaTri.ketLuanA}
          </span>
        </dd>
      </div>
    </dl>
  );
}

/**
 * Panel bằng chứng — mở inline, không modal (mục 7.3).
 *
 * Ca A KHÔNG có cảnh báo nào, nên panel của A nói đúng điều đó thay vì để trống
 * hoặc bịa một dữ kiện. Đây là chỗ dễ trượt nhất: một panel rỗng trông như lỗi,
 * và người viết sẽ bị cám dỗ điền vào một dòng nghe hợp lý.
 */
function BangChung({ t, ca }: { t: NoiDung; ca: CaMau }) {
  const g = t.ab.bangChung;

  return (
    <div className="lg-bc">
      <h4 className="lg-bc__tieude">{g.tieuDe}</h4>

      {ca.doiChu === null ? (
        <p className="lg-bc__trong">{g.khongCoCanhBao}</p>
      ) : (
        <dl className="lg-bc__ds">
          <div className="lg-bc__hang">
            <dt>{g.dieuThayDoi}</dt>
            <dd>{g.dieuThayDoiGiaTri}</dd>
          </div>
          <div className="lg-bc__hang">
            <dt>{g.truoc}</dt>
            <dd>{ca.doiChu.truoc}</dd>
          </div>
          <div className="lg-bc__hang">
            <dt>{g.sau}</dt>
            {/*
              Địa chỉ ĐẦY ĐỦ, không rút gọn.

              Rút gọn ở đây là tái tạo đúng lỗ hổng vanity address: hai địa chỉ
              khác nhau có thể trùng 4 ký tự đầu và 4 ký tự cuối. `lg-diachi` cho
              phép ngắt dòng để không tràn ngang trên mobile.
            */}
            <dd className="lg-mono lg-diachi">{ca.doiChu.sauDayDu}</dd>
          </div>
          <div className="lg-bc__hang">
            <dt>{g.luat}</dt>
            <dd className="lg-mono">{ca.reasonCodes.join(", ")}</dd>
          </div>
        </dl>
      )}

      <div className="lg-bc__nguon">
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
        <a
          className="lg-link"
          href={LINK.nguonMau}
          target="_blank"
          rel="noreferrer noopener"
        >
          {g.moArtifact}
          <span className="lg-sr"> ({t.chung.moTabMoi})</span>
        </a>
      </div>
    </div>
  );
}

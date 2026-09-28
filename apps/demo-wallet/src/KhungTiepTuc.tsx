import { useEffect, useRef } from "react";
import type { InspectResult } from "@custos-solana/types";
import { hauQuaNeuKy } from "./hauQuaNeuKy.ts";

/**
 * "NẾU BẠN TIẾP TỤC" — góp ý mentor 28/09: người xem bấm tiếp tục và THẤY mình mất gì.
 *
 * Phòng phân tích không ký, nên khung này nói điều MÔ PHỎNG cho biết và nói rõ như vậy ngay
 * đầu khung. Số lấy từ bảng chênh lệch của chính lượt kiểm (`hauQuaNeuKy`). Không làm số dư của
 * ví bên trái chạy giảm: CK-12 cấm đếm tiền giảm khi chưa có dữ kiện thực thi. Muốn thấy thật
 * trên chuỗi thì đi sang "Ví của bạn".
 */
export function KhungTiepTuc({
  ketQua,
  onChan,
  onMoVi,
}: {
  ketQua: InspectResult;
  onChan: () => void;
  onMoVi?: () => void;
}) {
  const { dong, ghiChuPhamVi } = hauQuaNeuKy(ketQua);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const taiSan = dong.filter((d) => d.loai === "taiSan");
  const quyen = dong.filter((d) => d.loai === "quyen");
  const nguy = ketQua.level === "danger";

  return (
    <section ref={ref} tabIndex={-1} className={`khung-tiep-tuc hien${nguy ? " khung-tiep-tuc--nguy" : ""}`} aria-labelledby="ktt-tieu-de">
      <header className="khung-tiep-tuc__dau">
        <h3 id="ktt-tieu-de">Nếu bạn ký giao dịch này</h3>
        <span className="khung-tiep-tuc__nhan">Theo mô phỏng · chưa có giao dịch nào được gửi</span>
      </header>

      {dong.length === 0 ? (
        <p className="khung-tiep-tuc__trong">
          Mô phỏng không cho thấy số dư hay quyền nào của bạn đổi, ngoài phí mạng.
        </p>
      ) : (
        <>
          {taiSan.map((d) => (
            <div key={d.tieuDe} className={`ktt-tai-san${d.nghiemTrong || d.chenh?.startsWith("−") ? " ktt-tai-san--mat" : ""}`}>
              <div className="ktt-tai-san__ten">{d.tieuDe}</div>
              <div className="ktt-tai-san__so">
                <span>{d.truoc}</span>
                <span aria-hidden="true" className="ktt-mui-ten">→</span>
                <span className="sr-only">thành</span>
                <strong>{d.sau}</strong>
                {d.chenh && <span className="ktt-tai-san__chenh">{d.chenh}</span>}
              </div>
              <p>{d.giaiThich}</p>
            </div>
          ))}
          {quyen.map((d) => (
            <div key={d.tieuDe} className={`ktt-quyen${d.nghiemTrong ? " ktt-quyen--mat" : ""}`}>
              <div className="ktt-quyen__ten">{d.tieuDe}</div>
              <div className="ktt-quyen__doi">
                <span>{d.truoc}</span> <span aria-hidden="true">→</span>
                <span className="sr-only">thành</span> <strong>{d.sau}</strong>
              </div>
              <p>{d.giaiThich}</p>
            </div>
          ))}
        </>
      )}

      {nguy && (
        <p className="khung-tiep-tuc__canh-bao">
          Giao dịch trên Solana không có nút hoàn tác: ký rồi thì những thay đổi trên là vĩnh viễn.
        </p>
      )}
      {ghiChuPhamVi && <p className="khung-tiep-tuc__pham-vi">{ghiChuPhamVi}</p>}

      <div className="khung-tiep-tuc__nut">
        <button type="button" className={`nut nut-quyet-dinh ${nguy ? "nut-nguy" : "nut-chinh"}`} onClick={onChan}>
          {nguy ? "Quay lại & chặn giao dịch" : "Quay lại & huỷ"}
        </button>
        {onMoVi && (
          <button type="button" className="nut nut-quyet-dinh nut-phu" onClick={onMoVi}>
            Ký thật ở “Ví của bạn”
          </button>
        )}
      </div>
    </section>
  );
}

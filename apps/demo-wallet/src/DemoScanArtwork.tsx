import { ArrowIcon, ScanIcon, ShieldIcon } from "./Icons.tsx";

/** An illustrative flow, never a fabricated result or progress indicator. */
export function DemoScanArtwork() {
  return (
    <div className="demo-inspection-map" aria-hidden="true">
      <div className="inspection-input">
        <span className="inspection-caption">Yêu cầu ký</span>
        <div className="inspection-document">
          <ScanIcon className="h-5 w-5" />
          <span>Một giao dịch</span>
          <i /><i /><i />
        </div>
      </div>
      <ArrowIcon className="inspection-arrow h-5 w-5" />
      <div className="inspection-engine">
        <div className="inspection-engine__mark">
          <img src={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`} alt="" width={52} height={52} />
        </div>
        <span>Custos</span>
        <small>Đọc · mô phỏng · giải thích</small>
      </div>
      <ArrowIcon className="inspection-arrow h-5 w-5" />
      <div className="inspection-output">
        <span className="inspection-caption">Nhìn rõ hậu quả</span>
        <div><span className="inspection-node" />Tài sản</div>
        <div><ShieldIcon className="h-3.5 w-3.5" />Quyền kiểm soát</div>
        <div><span className="inspection-node inspection-node--open" />Phần chưa đọc hiểu</div>
      </div>
    </div>
  );
}

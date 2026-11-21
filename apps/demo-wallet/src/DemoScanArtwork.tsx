import { ArrowIcon, ScanIcon, ShieldIcon } from "./Icons.tsx";

/** An illustrative flow, never a fabricated result or progress indicator. */
export function DemoScanArtwork() {
  return (
    <div className="demo-inspection-map" aria-hidden="true">
      <div className="inspection-input">
        <span className="inspection-caption">Signing request</span>
        <div className="inspection-document">
          <ScanIcon className="h-5 w-5" />
          <span>One transaction</span>
          <i /><i /><i />
        </div>
      </div>
      <ArrowIcon className="inspection-arrow h-5 w-5" />
      <div className="inspection-engine">
        <div className="inspection-engine__mark">
          <img src={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`} alt="" width={52} height={52} />
        </div>
        <span>Custos</span>
        <small>Read · simulate · explain</small>
      </div>
      <ArrowIcon className="inspection-arrow h-5 w-5" />
      <div className="inspection-output">
        <span className="inspection-caption">See the consequences</span>
        <div><span className="inspection-node" />Assets</div>
        <div><ShieldIcon className="h-3.5 w-3.5" />Control</div>
        <div><span className="inspection-node inspection-node--open" />Parts not understood</div>
      </div>
    </div>
  );
}

/** Static illustration of inspection, not a result or a live status. */
export function DemoScanArtwork() {
  return <svg className="demo-scan-art" viewBox="0 0 360 150" fill="none" aria-hidden="true">
    <ellipse cx="180" cy="91" rx="143" ry="43" stroke="#d5e3d8" />
    <ellipse cx="180" cy="91" rx="110" ry="29" stroke="#e2ece3" />
    <path d="M68 75h60m105 0h60" stroke="#8ead98" strokeDasharray="3 5" />
    <g transform="translate(37 46) rotate(-9 25 32)">
      <rect width="51" height="65" rx="8" fill="#fff" stroke="#a5beac" />
      <path d="M13 19h24M13 28h24M13 37h15" stroke="#789c83" strokeWidth="2" strokeLinecap="round" />
      <rect x="13" y="48" width="10" height="5" rx="2" fill="#b9d792" />
    </g>
    <rect x="138" y="29" width="85" height="87" rx="23" fill="#dce9d6" />
    <rect x="138" y="22" width="85" height="87" rx="23" fill="#173f30" stroke="#446b51" />
    <image href={`${import.meta.env.BASE_URL}brand/custos-symbol-light.svg`} x="151" y="35" width="60" height="60" />
    <g transform="translate(276 43) rotate(8 24 32)">
      <rect width="49" height="66" rx="8" fill="#fff" stroke="#a5beac" />
      <path d="M13 18h23M13 31h23M13 44h23" stroke="#7b9e86" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="18" r="1" fill="#426c50" /><circle cx="9" cy="31" r="1" fill="#426c50" /><circle cx="9" cy="44" r="1" fill="#426c50" />
    </g>
    <path d="m119 71 4 4-4 4m140-8 4 4-4 4" stroke="#5f896b" strokeLinecap="round" />
  </svg>;
}

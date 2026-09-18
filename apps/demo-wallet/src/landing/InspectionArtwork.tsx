/** Brand illustrations only: never represent live scans, throughput or verdicts. */
export function InspectionLens() {
  return <div className="inspection-lens" aria-hidden="true">
    <svg viewBox="0 0 560 240" fill="none">
      <defs>
        <linearGradient id="lens-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e4f7c8" /><stop offset=".42" stopColor="#9ecf9c" /><stop offset="1" stopColor="#34745d" /></linearGradient>
        <linearGradient id="lens-glass" x1="280" y1="165" x2="280" y2="235" gradientUnits="userSpaceOnUse"><stop stopColor="#abd8a0" stopOpacity=".2" /><stop offset="1" stopColor="#abd8a0" stopOpacity="0" /></linearGradient>
        <radialGradient id="lens-aura"><stop stopColor="#b9de87" stopOpacity=".18" /><stop offset="1" stopColor="#b9de87" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="280" cy="123" rx="204" ry="116" fill="url(#lens-aura)" />
      <path d="m225 155-100 85h310l-100-85" fill="url(#lens-glass)" />
      <g className="inspection-lens__orbit" stroke="#82b8a0" strokeWidth=".75">
        <ellipse cx="280" cy="128" rx="205" ry="53" transform="rotate(-12 280 128)" opacity=".5" />
        <ellipse cx="280" cy="128" rx="173" ry="78" transform="rotate(14 280 128)" opacity=".3" />
        <ellipse cx="280" cy="128" rx="230" ry="85" transform="rotate(-12 280 128)" opacity=".16" />
      </g>
      <g className="inspection-lens__symbol">
        <g transform="translate(190 20) scale(2.8)">
          <path d="M24 6H43L55 18L45 28L37 20H30L20 30V34L30 44H37L45 36L55 46L43 58H24L6 40V24Z" fill="#183f32" transform="translate(0 3)" stroke="#5d9574" strokeWidth=".35" />
          <path d="M24 6H43L55 18L45 28L37 20H30L20 30V34L30 44H37L45 36L55 46L43 58H24L6 40V24Z" fill="url(#lens-metal)" stroke="#c6e5ac" strokeWidth=".25" />
          <path d="M54 26L60 32L54 38L48 32Z" fill="#daf5b9" />
        </g>
      </g>
      <path className="inspection-lens__signal" d="M71 171c83 18 196 4 299-29 43-14 84-32 113-51" stroke="#ccefa9" strokeWidth="2" strokeLinecap="round" strokeDasharray="24 480" />
      <g fill="#b9de87"><circle cx="87" cy="163" r="3" /><circle cx="457" cy="77" r="2" /><circle cx="392" cy="191" r="2" /></g>
      <path d="M280 202v25m-5-5 5 5 5-5" stroke="#8abf99" strokeOpacity=".7" />
    </svg>
  </div>;
}

/** Four distinct destinations, illustrated with network, code, lens and layers. */
export function ResourceIllustration({ index }: { index: number }) {
  return <svg className="cine-resource__art" width="120" height="60" viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    {index === 0 && <>
      <path d="m19 38 33-24 45 21-40 17-38-14Z" opacity=".3" /><path d="m19 38 38-8 40 5M52 14l5 16v22" opacity=".7" />
      <circle cx="57" cy="30" r="9" fill="#183d33" /><circle cx="57" cy="30" r="3" fill="currentColor" />
      {[[19,38],[52,14],[97,35],[57,52]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="3" fill="#102c25" />)}
    </>}
    {index === 1 && <>
      <path d="m29 13-13 17 13 17m62-34 13 17-13 17" opacity=".7" />
      <rect x="43" y="12" width="34" height="36" rx="7" fill="#183d33" /><path d="m62 20-7 20M36 25h-7m62 10h-7" />
      <path d="M51 7V3m10 4V3m10 4V3M51 57v-4m10 4v-4m10 4v-4" opacity=".35" />
    </>}
    {index === 2 && <>
      <circle cx="53" cy="26" r="18" strokeOpacity=".4" /><circle cx="53" cy="26" r="12" fill="#183d33" /><path d="m66 39 15 14M47 26h12m-6-6v12" />
      <path d="M25 12V5h10m44 7V5H69M25 41v7h10" opacity=".5" /><path className="cine-resource__scan" d="M34 26h38" stroke="#d7ecb6" />
    </>}
    {index === 3 && <>
      <path d="m27 37 33 16 33-16M27 29l33 16 33-16" opacity=".45" /><path d="m27 21 33-15 33 15-33 16-33-16Z" fill="#183d33" />
      <path d="m50 21 7 4 13-7" stroke="#d7ecb6" /><path d="M60 37v16" opacity=".4" />
    </>}
  </svg>;
}

/** Original vector gift illustration. Decorative, no reward/status implied. */
export function RewardArtwork() {
  return <svg className="reward-artwork" viewBox="0 0 480 290" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="gift-front" x1="155" y1="90" x2="320" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#f0ac7b"/><stop offset="1" stopColor="#c95f36"/></linearGradient>
      <linearGradient id="gift-top" x1="140" y1="60" x2="300" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe4bb"/><stop offset="1" stopColor="#e69761"/></linearGradient>
    </defs>
    <ellipse cx="244" cy="248" rx="129" ry="19" fill="#352c5410"/>
    <ellipse cx="244" cy="210" rx="193" ry="61" stroke="#d7cfdf" transform="rotate(-15 244 210)"/>
    <g className="reward-artwork__gift">
      <path d="m151 118 100-46 93 43-1 106-99 42-92-46z" fill="url(#gift-front)"/>
      <path d="m244 163 100-48-1 106-99 42z" fill="#a64c31"/>
      <path d="m141 106 109-49 105 47-109 51z" fill="url(#gift-top)"/>
      <path d="m141 106 105 49v25l-105-48z" fill="#e69b63"/>
      <path d="m246 155 109-51v25l-109 51z" fill="#c87647"/>
      <path d="m181 88 25-12 105 48-25 12z" fill="#fff0d4"/>
      <path d="m285 136 26-12v25l-26 12z" fill="#e9ccb0"/>
      <path d="m285 161 23-10v85l-23 10z" fill="#dfb997"/>
      <path d="m181 125 25 12v25l-25-12z" fill="#fff0d4"/>
      <path d="m181 150 25 12v80l-25-12z" fill="#f3d8b7"/>
      <path d="m181 125 109-50 24 11-108 51z" fill="#fff0d4"/>
      <path d="M247 106c-61-11-70-71-42-72 21-1 35 43 42 72Z" fill="#f8e7cc" stroke="#d4a479" strokeWidth="2"/>
      <path d="M247 106c13-65 72-81 76-51 3 21-41 44-76 51Z" fill="#ffedd0" stroke="#d4a479" strokeWidth="2"/>
      <ellipse cx="248" cy="103" rx="17" ry="12" fill="#fce4bf"/>
    </g>
    <g stroke="#a5a0b4" strokeWidth="1.5"><path d="M90 74v16m-8-8h16M383 165v12m-6-6h12"/><circle cx="359" cy="50" r="4"/><path d="m104 190 6 7-7 6-6-7z"/></g>
    <circle cx="392" cy="111" r="3" fill="#d8996f"/>
    <circle cx="95" cy="232" r="3" fill="#aaa0ba"/>
  </svg>;
}

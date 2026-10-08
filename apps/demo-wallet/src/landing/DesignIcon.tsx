/** Small geometric icons shared by the presentation sections. */
export function DesignIcon({ kind, className = "" }: { kind: "transaction" | "scan" | "evidence" | "arrow" | "wallet"; className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "transaction" && <><rect x="5" y="3" width="14" height="18" rx="3" /><path d="M9 8h6M9 12h6M9 16h3" /></>}
      {kind === "scan" && <><path d="M8 3H5a2 2 0 0 0-2 2v3m13-5h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3m8 0h3a2 2 0 0 0 2-2v-3M3 12h18" /><circle cx="12" cy="8" r="1" /><path d="M10 16h4" /></>}
      {kind === "evidence" && <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>}
      {kind === "arrow" && <path d="M5 12h14m-5-5 5 5-5 5" />}
      {/* Ví nhận yêu cầu — bước 02 của hành trình ký; trước đây dùng chung icon "evidence" với bước 04. */}
      {kind === "wallet" && <><path d="M4 7a2 2 0 0 1 2-2h11a1 1 0 0 1 1 1v2" /><rect x="3" y="8" width="18" height="12" rx="2.5" /><path d="M16 14h2" /></>}
    </svg>
  );
}

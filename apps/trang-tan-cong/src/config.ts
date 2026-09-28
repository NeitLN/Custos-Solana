export const URL_VI = import.meta.env["VITE_CUSTOS_KET_NOI"] || (import.meta.env.DEV
  ? `${location.protocol}//${location.hostname}:5188/ket-noi.html`
  : "https://custos-solana.vercel.app/ket-noi.html");
export const RPC = (import.meta.env.DEV ? import.meta.env["VITE_RPC"] : undefined) || "https://api.devnet.solana.com";

/** Bound each HTTP request so a failed public RPC doesn't leave the UI busy forever. */
export const rpcFetch: typeof fetch = (input, init) => fetch(input, {
  ...init, signal: AbortSignal.timeout(15_000),
});

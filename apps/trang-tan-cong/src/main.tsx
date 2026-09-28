import "./polyfill.ts";

import { createRoot } from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { registerCustosWallet } from "@custos-solana/connector";
import App from "./App.tsx";
import { RPC, URL_VI, rpcFetch } from "./config.ts";
import "./style.css";
import "./attack-design.css";

registerCustosWallet({ url: URL_VI });
// wallet-standard-react destroys its adapter in StrictMode's dev cleanup (spike G0-1).
createRoot(document.getElementById("root")!).render(
  <ConnectionProvider endpoint={RPC} config={{ commitment: "confirmed", fetch: rpcFetch, disableRetryOnRateLimit: true }}>
    <WalletProvider wallets={[]} autoConnect={false}><App /></WalletProvider>
  </ConnectionProvider>,
);

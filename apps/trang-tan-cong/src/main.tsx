import "./polyfill.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { LiveAttack } from './LiveAttack.tsx';
import "./style.css";
import "./attack-design.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has('custosLive') ? <LiveAttack /> : <App />}
  </StrictMode>,
);

// PHẢI là dòng đầu tiên — xem polyfill.ts để biết vì sao không gộp vào đây được.
import "./polyfill.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./style.css";
import "./product-presentation.css";
import "./tool-design.css";
import "./demo-design.css";
import "./live/live-demo.css";
import "./wallet-execution.css";
import "./product-workspace.css";
// Keep verdict and signing controls above the shared workspace styles.
import "./demo-thiet-ke.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

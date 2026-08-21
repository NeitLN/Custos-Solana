// PHẢI là dòng đầu tiên — xem polyfill.ts để biết vì sao không gộp vào đây được.
import "./polyfill.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

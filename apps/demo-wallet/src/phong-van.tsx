// Trang này CÓ dựng giao dịch thật nên vẫn cần polyfill Buffer/global.
// PHẢI là dòng đầu tiên — xem polyfill.ts.
import "./polyfill.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PhongVan } from "./PhongVan.tsx";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PhongVan />
  </StrictMode>,
);

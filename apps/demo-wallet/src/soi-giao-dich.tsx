// PHẢI là dòng đầu tiên. Trang này ĐỤNG @solana/web3.js (khác so-lieu.tsx, trang đó
// chỉ đọc JSON nên cố ý bỏ polyfill). Thiếu dòng này thì build vẫn xanh còn trình
// duyệt trắng trang với "Buffer is not defined" — xem polyfill.ts.
import "./polyfill.ts";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SoiGiaoDich } from "./SoiGiaoDich.tsx";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SoiGiaoDich />
  </StrictMode>,
);

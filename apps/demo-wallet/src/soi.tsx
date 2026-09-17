// Inspector CẦN polyfill Buffer/global: nó dùng `@solana/web3.js` để giải mã và mô
// phỏng giao dịch. Khác trang số liệu — trang đó chỉ đọc JSON nên cố ý bỏ polyfill.
import "./polyfill.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Inspector } from "./Inspector.tsx";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Inspector />
  </StrictMode>,
);

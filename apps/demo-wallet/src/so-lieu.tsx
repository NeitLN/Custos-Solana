// Trang số liệu KHÔNG cần polyfill Buffer/global: nó chỉ đọc một file JSON, không
// đụng tới @solana/web3.js. Bỏ polyfill ở đây giữ trang nhẹ và tải nhanh — thứ
// đáng giá khi giám khảo bấm vào giữa một buổi chấm dài.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SoLieu } from "./SoLieu.tsx";
import "./style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SoLieu />
  </StrictMode>,
);

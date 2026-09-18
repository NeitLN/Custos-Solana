/**
 * Entry của trang giới thiệu.
 *
 * KHÔNG import `polyfill.ts`, `App.tsx`, `style.css` hay `@custos-solana/core`.
 *
 * Đây là ràng buộc của mục 11.2, và nó đo được: landing chỉ hiển thị dữ liệu mẫu
 * đã rút gọn, nên không cần `@solana/web3.js` (kéo theo Buffer polyfill), không
 * cần AI client và không cần signer. Import bất kỳ thứ nào trong số đó sẽ nạp cả
 * nhánh phụ thuộc của ví vào một trang giới thiệu — và người xem trả giá bằng
 * thời gian tải.
 *
 * Có guard đọc mã canh điều này trong `landingBundle.test.ts`.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LandingPage } from "./landing/LandingPage.tsx";
import "./landing/landing.css";
import "./landing/presentation.css";
import "./landing/cinematic.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LandingPage />
  </StrictMode>,
);

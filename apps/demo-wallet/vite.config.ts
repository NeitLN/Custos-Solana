import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

/**
 * `base` khác nhau giữa chạy dev và build:
 *
 *   dev   — "/" vì server chạy ở gốc localhost
 *   build — "/Custos-Solana/" vì GitHub Pages phục vụ ở đường dẫn con
 *
 * Không dùng biến môi trường cho việc này: Git Bash trên Windows tự đổi mọi
 * chuỗi trông giống đường dẫn POSIX thành đường dẫn Windows, nên
 * `CUSTOS_BASE=/Custos-Solana/` biến thành `/Program Files/Git/Custos-Solana/`
 * và trang deploy trắng hoàn toàn. Đã dính lỗi này một lần.
 */
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/Custos-Solana/" : "/",
  plugins: [react(), tailwindcss()],

  // ⚠️ BẮT BUỘC — không được xoá.
  // `C:\Users\Viet Tien\postcss.config.mjs` có thật (đã kiểm chứng). Vite leo ngược
  // thư mục để tìm cấu hình PostCSS, và sẽ bắt nhầm file của dự án khác.
  // Dòng này chặn việc leo cây. Đây là bẫy đã cắn ở dự án PawPass.
  css: { postcss: {} },

  // Hai trang, hai entry. Trang số liệu tách riêng chứ không nhét vào SPA của ví:
  // nó có URL riêng gửi cho giám khảo được, và không kéo theo @solana/web3.js.
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("index.html", import.meta.url)),
        soLieu: fileURLToPath(new URL("so-lieu.html", import.meta.url)),
      },
    },
  },

  // @solana/web3.js v1 cần Buffer và global — trình duyệt không có sẵn.
  define: { global: "globalThis" },
  // Dấu gạch chéo cuối là BẮT BUỘC: nó buộc Vite lấy gói npm `buffer`,
  // thay vì externalize builtin cùng tên của Node. Không có nó thì `vite build`
  // vẫn xanh nhưng trình duyệt ném "Buffer is not defined" và trang trắng.
  resolve: { alias: { buffer: "buffer/" } },
  optimizeDeps: { include: ["buffer"] },
}));

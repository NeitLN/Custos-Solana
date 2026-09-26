import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * `base` khác nhau giữa chạy dev và build:
 *
 *   dev   — "/" vì server chạy ở gốc localhost
 *   build — "/Custos-Solana/tan-cong/" vì GitHub Pages phục vụ ở đường dẫn con
 *
 * Không dùng biến môi trường cho việc này: Git Bash trên Windows tự đổi mọi
 * chuỗi trông giống đường dẫn POSIX thành đường dẫn Windows, nên
 * `CUSTOS_BASE=/Custos-Solana/` biến thành `/Program Files/Git/Custos-Solana/`
 * và trang deploy trắng hoàn toàn. Đã dính lỗi này một lần.
 */
export default defineConfig(({ command, isPreview }) => ({
  // `isPreview` cùng lý do với ví — xem `apps/demo-wallet/vite.config.ts`. `vite
  // preview` chạy với `command === "serve"`, nên thiếu nó thì mọi asset rơi xuống
  // SPA fallback và trang trắng, trong khi máy chủ vẫn trả 200.
  base: command === "build" || isPreview ? "/Custos-Solana/tan-cong/" : "/",
  plugins: [react(), tailwindcss()],

  // ⚠️ BẮT BUỘC — không được xoá.
  // `C:\Users\Viet Tien\postcss.config.mjs` có thật (đã kiểm chứng). Vite leo ngược
  // thư mục để tìm cấu hình PostCSS, và sẽ bắt nhầm file của dự án khác.
  // Dòng này chặn việc leo cây. Đây là bẫy đã cắn ở dự án PawPass.
  css: { postcss: {} },

  // Tách thư viện Solana khỏi mã của trang — review 26/09, mục 3.9. Trước đó một chunk
  // 503 kB (Vite cảnh báo). Trang cần web3.js NGAY khi mở (đọc hiện trường, lấy sẵn
  // blockhash) nên tải trễ không bớt được gì; tách ra thì trình duyệt cache được phần
  // thư viện, và mỗi lần sửa trang chỉ phải tải lại phần mã nhỏ.
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // CHỈ tách `@solana`. Bản đầu tách cả `buffer`, `bn.js`… sang chunk khác và trang
          // trắng với "Cannot set properties of undefined (setting 'byteLength')": polyfill
          // `buffer` phải khởi tạo cùng chỗ với mã dùng nó. Kiểm trên bản build thật.
          return /[\\/]node_modules[\\/]@solana[\\/]/.test(id) ? "solana" : undefined;
        },
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

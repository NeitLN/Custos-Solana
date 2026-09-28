import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * dApp thử của spike G0-1. Cố ý KHÔNG dùng chung cấu hình hay mã với ví: đây là "một dApp
 * bất kỳ" — origin riêng (cổng 5190), gói riêng, chỉ biết wallet-adapter và connector.
 */
export default defineConfig({
  base: "/",
  plugins: [react()],
  // ⚠️ Chặn Vite leo cây tìm postcss.config.mjs của repo cha — xem CLAUDE.md, mục Môi trường.
  css: { postcss: {} },
  define: { global: "globalThis" },
  resolve: { alias: { buffer: "buffer/" } },
  optimizeDeps: { include: ["buffer"] },
});

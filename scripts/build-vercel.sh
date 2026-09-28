#!/usr/bin/env bash
# DỰNG BẢN VERCEL — vercel.json chỉ gọi file này (Vercel giới hạn buildCommand 256 ký tự).
#
#   CUSTOS_GOC=1          tên miền gốc: ví ở `/`, trang tấn công ở `/tan-cong/` (không phải /Custos-Solana/)
#   VITE_CO_API_AI=1      bản này đi kèm hàm server `/api/dien-giai` (khoá chỉ ở biến môi trường Vercel)
#   VITE_TRANG_CHINH=gioi-thieu  mở gốc trần thì tới trang giới thiệu (xem apps/demo-wallet/index.html)
#
# Trang tấn công được chép vào `dist/tan-cong/` của ví: nút "Mở dApp của phiên này" mở
# `${BASE_URL}tan-cong/` — thiếu bước này thì Vercel trả 404 (28/09).
set -euo pipefail
CUSTOS_GOC=1 VITE_CO_API_AI=1 VITE_TRANG_CHINH=gioi-thieu npm run build --workspace apps/demo-wallet
CUSTOS_GOC=1 npm run build -w @custos-solana/trang-tan-cong
mkdir -p apps/demo-wallet/dist/tan-cong
cp -r apps/trang-tan-cong/dist/. apps/demo-wallet/dist/tan-cong
# Gate the actual combined deploy output, including the wallet-adapter dependencies.
node scripts/soi-ro-ri-khoa.mjs apps/demo-wallet/dist

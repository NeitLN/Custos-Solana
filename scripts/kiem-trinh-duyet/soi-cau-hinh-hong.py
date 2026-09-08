# -*- coding: utf-8 -*-
"""Cấu hình demo hỏng KHÔNG được làm trắng trang.

    npm run vi                                     # cần server ở 5188
    python scripts/kiem-trinh-duyet/soi-cau-hinh-hong.py <bản-sao-hien-truong.json>

Hồi quy cho F03. `docHienTruong()` từng ép kiểu `as HienTruong` — `as` là lời hứa
với trình biên dịch, không phải phép kiểm lúc chạy. Một file trả `{}` kèm HTTP 200
đi lọt, rồi `ht.nanNhan.slice()` ném và TRANG TRẮNG.

Bài này GHI ĐÈ `apps/demo-wallet/public/hien-truong.json` để dựng ca hỏng, nên nó
đòi đường dẫn bản sao làm tham số và luôn khôi phục trong `finally`. Mất hiện trường
là mất luôn demo, nên nó dừng ngay nếu bản sao không tồn tại.

Bộ test đơn vị `apps/demo-wallet/test/hienTruong.test.ts` canh phần XÁC THỰC và chạy
trong `npm run check`. Bài này canh phần HIỂN THỊ, cần trình duyệt thật.
"""
import asyncio
import json
import shutil
import sys
from pathlib import Path

from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
HT = GOC / "apps" / "demo-wallet" / "public" / "hien-truong.json"
VI = "http://localhost:5188"


def ca_kiem(sao: Path) -> list[tuple[str, str]]:
    goc = json.loads(sao.read_text(encoding="utf-8"))
    return [
        ("{} rỗng", "{}"),
        ("null", "null"),
        ("JSON sai cú pháp", "{ khong-phai-json"),
        ("địa chỉ không hợp lệ", json.dumps({**goc, "nanNhan": "0OIl"})),
        ("thiếu trường bắt buộc", json.dumps({k: v for k, v in goc.items() if k != "mint"})),
    ]


async def chay(sao: Path) -> list[str]:
    hong: list[str] = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for ten, noi_dung in ca_kiem(sao):
            HT.write_text(noi_dung, encoding="utf-8")
            ctx = await b.new_context(viewport={"width": 375, "height": 812})
            pg = await ctx.new_page()
            loi_js: list[str] = []
            pg.on("pageerror", lambda e: loi_js.append(str(e)))

            await pg.goto(VI, wait_until="networkidle")
            await pg.wait_for_timeout(1200)

            chu = (await pg.inner_text("body")).strip()
            co_thong_bao = "Cấu hình demo lỗi" in chu or "Chưa dựng hiện trường" in chu
            # Dữ liệu hỏng KHÔNG được tạo ra thao tác ký nào.
            so_nut_ky = await pg.locator("button:has-text('Ký')").count()

            dat = len(chu) > 40 and co_thong_bao and so_nut_ky == 0
            print(
                f"  {'PASS' if dat else 'FAIL'}  {ten}: {len(chu)} ký tự · "
                f"thông báo={co_thong_bao} · nút Ký={so_nut_ky}"
            )
            if not dat:
                hong.append(f"{ten}: chữ={len(chu)} thông báo={co_thong_bao} lỗiJS={loi_js[:1]}")
            await ctx.close()
        await b.close()
    return hong


async def main() -> None:
    if len(sys.argv) < 2:
        print("✖ thiếu tham số: đường dẫn bản sao hien-truong.json")
        sys.exit(2)
    sao = Path(sys.argv[1])
    if not sao.exists():
        print(f"✖ không thấy bản sao {sao} — dừng, vì bài này ghi đè hiện trường thật")
        sys.exit(2)

    print("CẤU HÌNH HỎNG · không được trắng trang\n")
    try:
        hong = await chay(sao)
    finally:
        # Khôi phục dù có ném giữa chừng: để lại hiện trường hỏng là hỏng luôn demo.
        shutil.copy(sao, HT)
        print("→ đã khôi phục hien-truong.json")

    print("\n" + ("=== TẤT CẢ PASS ===" if not hong else "=== FAIL ===\n" + "\n".join(hong)))
    sys.exit(1 if hong else 0)


asyncio.run(main())

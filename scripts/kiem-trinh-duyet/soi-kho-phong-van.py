# -*- coding: utf-8 -*-
"""Kho phỏng vấn hỏng KHÔNG được làm trắng trang, và KHÔNG được mất dữ liệu.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-kho-phong-van.py

Hồi quy cho F05. Trang làm `JSON.parse(...) as Ban[]`; `catch` chỉ bắt lỗi cú
pháp, nên `{}` đi lọt rồi `ban.filter is not a function` làm trắng trang.

Nhánh `catch` cũ còn tệ hơn ở chỗ khác: nó trả `[]`. Im lặng quay về danh sách
rỗng là cách chắc chắn nhất để người phỏng vấn gõ đè lên hai mươi biên bản — dữ
liệu này gõ tay, không bản sao, không backend. Nên bài kiểm đòi CẢ HAI: có thông
báo, VÀ có nút tải bản sao để cứu bằng tay.
"""
import asyncio, sys
from playwright.async_api import async_playwright
URL = "http://localhost:5188/phong-van.html"
CA = [("{} rỗng", "{}"), ("null", "null"), ("JSON sai cú pháp", "{ hong"),
      ("bản ghi thiếu trường", '[{"cham":"dung"}]')]

async def main():
    hong = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for ten, gt in CA:
            ctx = await b.new_context(viewport={"width": 375, "height": 812})
            await ctx.add_init_script(f"localStorage.setItem('custos.phong-van', {gt!r})")
            pg = await ctx.new_page()
            loi = []
            pg.on("pageerror", lambda e: loi.append(str(e)))
            await pg.goto(URL, wait_until="networkidle")
            await pg.wait_for_timeout(1500)
            chu = (await pg.inner_text("body")).strip()
            co_bao = "Dữ liệu đã lưu không đọc được" in chu
            co_nut = await pg.locator("button:has-text('Tải bản sao')").count()
            dat = len(chu) > 40 and co_bao and co_nut == 1
            print(f"  {'PASS' if dat else 'FAIL'}  {ten}: {len(chu)} ký tự · báo={co_bao} · nút cứu={co_nut}")
            if not dat: hong.append(f"{ten} lỗiJS={loi[:1]}")
            await ctx.close()
        await b.close()
    print("\n" + ("=== TẤT CẢ PASS ===" if not hong else "=== FAIL ===\n" + "\n".join(hong)))
    sys.exit(1 if hong else 0)
asyncio.run(main())

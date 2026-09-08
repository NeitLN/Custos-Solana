# -*- coding: utf-8 -*-
"""Trang phỏng vấn KHÔNG được chờ RPC vô hạn.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-phong-van-treo.py

Hồi quy cho F04. `getLatestBlockhash()` rồi `inspect()` chạy không có deadline
nào bao quanh; RPC không phản hồi thì trang đứng ở "Đang dựng màn hình thật…"
vô hạn — tái hiện tới 13,5 giây và vẫn còn chờ.

Ở đây hậu quả nặng hơn một trang hỏng bình thường: người tham gia phỏng vấn đang
ngồi đợi trước màn hình, và người phỏng vấn không biết nên chờ hay bỏ. Một phép
đo bắt đầu bằng vài phút lúng túng là một phép đo đã hỏng.
"""
import asyncio, sys, time
from playwright.async_api import async_playwright
URL = "http://localhost:5188/phong-van.html"

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 375, "height": 812})
        # Treo mọi lời gọi RPC: khong tra loi, khong loi.
        # CHỈ chặn RPC, không chặn module của trang. Bản đầu dùng "**/*solana*" và
        # chặn luôn @solana/web3.js mà chính trang cần tải — phép thử tự làm hỏng
        # thứ nó đo.
        await ctx.route("https://api.devnet.solana.com/**", lambda r: None)
        pg = await ctx.new_page()
        t0 = time.time()
        await pg.goto(URL, wait_until="domcontentloaded")
        try:
            await pg.wait_for_selector("text=Chưa dựng được màn hình", timeout=40000)
            giay = time.time() - t0
            co_thu_lai = await pg.locator("button:has-text('Thử lại')").count()
            dat = giay < 30 and co_thu_lai == 1
            print(f"  {'PASS' if dat else 'FAIL'}  dừng sau {giay:.1f}s · nút Thử lại={co_thu_lai}")
            sys.exit(0 if dat else 1)
        except Exception as e:
            print(f"  FAIL  không thấy thẻ lỗi sau {time.time()-t0:.1f}s: {str(e)[:80]}")
            sys.exit(1)
        finally:
            await b.close()
asyncio.run(main())

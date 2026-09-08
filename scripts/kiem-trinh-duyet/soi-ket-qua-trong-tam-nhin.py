# -*- coding: utf-8 -*-
"""Kết quả kiểm tra phải NẰM TRONG TẦM NHÌN sau khi bấm.

    npm run vi                                                  # server ở 5188
    python scripts/kiem-trinh-duyet/soi-ket-qua-trong-tam-nhin.py

Hồi quy cho F01. Tái hiện ở 375x812: bấm "Nhan qua tang", cảnh báo bắt đầu ở
y~1241 trong khi scrollY=0. Người dùng thấy nút không phản ứng và tưởng nó hỏng —
trong khi Custos đã chạy xong và đang hiện một cảnh báo Đỏ mà họ không nhìn thấy.

Với sản phẩm này, cảnh báo không được nhìn thấy tương đương không có cảnh báo.

Bài kiểm đo hai thứ, không chỉ một: khối kết quả có trong viewport không, VÀ focus
có chuyển vào đó không — người dùng bàn phím phải đi tiếp được tới nút Huỷ.
"""
import asyncio
import sys

from playwright.async_api import async_playwright

VI = "http://localhost:5188"
KHUNG = [("320", 320, 720), ("375", 375, 812), ("768", 768, 1024)]


async def main() -> None:
    hong = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for ten, w, h in KHUNG:
            ctx = await b.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            await pg.goto(VI, wait_until="networkidle")
            await pg.wait_for_timeout(1200)

            nut = pg.locator("button:has-text('Nhận quà tặng')").first
            if await nut.count() == 0:
                nut = pg.locator("button").filter(has_text="quà").first
            if await nut.count() == 0:
                print(f"  BỎ QUA {ten}px — không thấy nút kịch bản")
                await ctx.close()
                continue

            await nut.click()
            await pg.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=45000)
            await pg.wait_for_timeout(1500)  # chờ cuộn mượt xong

            hop = await pg.evaluate(
                """() => {
                    const o = document.querySelector("[aria-label='Kết quả kiểm tra giao dịch']");
                    const r = o.getBoundingClientRect();
                    return {
                        top: Math.round(r.top),
                        cao: Math.round(r.height),
                        vh: window.innerHeight,
                        scrollY: Math.round(window.scrollY),
                        focusTrongKetQua: o.contains(document.activeElement) || o === document.activeElement,
                    };
                }"""
            )

            # "Trong tầm nhìn" = mép trên nằm trong viewport và còn thấy được phần đầu.
            trong = -10 <= hop["top"] < hop["vh"] - 40
            dat = trong and hop["focusTrongKetQua"]
            print(
                f"  {'PASS' if dat else 'FAIL'}  {ten}px: top={hop['top']} vh={hop['vh']} "
                f"scrollY={hop['scrollY']} focus={hop['focusTrongKetQua']}"
            )
            if not dat:
                hong.append(f"{ten}px: top={hop['top']} vh={hop['vh']} focus={hop['focusTrongKetQua']}")
            await ctx.close()
        await b.close()

    print("\n" + ("=== TẤT CẢ PASS ===" if not hong else "=== FAIL ===\n" + "\n".join(hong)))
    sys.exit(1 if hong else 0)


asyncio.run(main())

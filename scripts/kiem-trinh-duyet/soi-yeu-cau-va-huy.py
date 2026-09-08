# -*- coding: utf-8 -*-
"""Yêu cầu hỏng và thao tác huỷ đều phải có phản hồi THẤY ĐƯỢC.

    npm run vi                                            # server ở 5188
    python scripts/kiem-trinh-duyet/soi-yeu-cau-va-huy.py

Hồi quy cho F06 và F07.

F06 — `docYeuCauNgoai()` trả `null` cho CẢ HAI: "dApp không gửi gì" và "dApp gửi thứ
không đọc được". Mở `#tx=invalid-base64` thì ví về màn hình nghỉ như chưa có chuyện
gì. Người dùng không phân biệt được "chưa có gì để kiểm" với "có thứ để kiểm nhưng
tôi không đọc nổi" — và cái thứ hai đáng để họ dừng lại.

F07 — bấm "Chặn & huỷ" làm card biến mất; xác nhận duy nhất nằm trong nhật ký kỹ
thuật đang đóng. Một hành động bảo mật không có phản hồi thấy được thì người dùng
không biết nó đã xảy ra chưa.

Cách kiểm cố ý KHÔNG dò chữ "an toàn": câu cảnh báo hợp lệ có chứa cụm đó trong một
mệnh đề phủ định ("đây không phải kết luận giao dịch an toàn"), và một phép dò thô
sẽ báo đỏ nhầm chính câu đúng. Thứ cần kiểm là TÍNH CHẤT: payload hỏng không được
sinh ra phán quyết nào.
"""
import asyncio
import sys

from playwright.async_api import async_playwright

VI = "http://localhost:5188"

# Ba nhãn phán quyết của sản phẩm. Payload hỏng không được tạo ra cái nào.
PHAN_QUYET = ["Bình thường", "Cần xem kỹ", "Nguy hiểm"]


async def main() -> None:
    hong: list[str] = []
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ── F06 ────────────────────────────────────────────────────────────
        ctx = await b.new_context(viewport={"width": 375, "height": 812})
        pg = await ctx.new_page()
        await pg.goto(f"{VI}/#tx=invalid-base64", wait_until="networkidle")
        await pg.wait_for_timeout(1500)

        chu = await pg.inner_text("body")
        co_bao = "Không đọc được yêu cầu" in chu
        so_ket_qua = await pg.locator("[aria-label='Kết quả kiểm tra giao dịch']").count()
        nhan_lo = [n for n in PHAN_QUYET if n in chu]

        for ten, dat, chi_tiet in [
            ("F06 · payload hỏng có phản hồi", co_bao, ""),
            ("F06 · không sinh ra khối kết quả", so_ket_qua == 0, f"{so_ket_qua} khối"),
            ("F06 · không hiện nhãn phán quyết nào", not nhan_lo, ", ".join(nhan_lo)),
        ]:
            print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   <<< {chi_tiet}" if not dat else ""))
            if not dat:
                hong.append(ten)
        await ctx.close()

        # ── F07 ────────────────────────────────────────────────────────────
        ctx = await b.new_context(viewport={"width": 375, "height": 812})
        pg = await ctx.new_page()
        await pg.goto(VI, wait_until="networkidle")
        await pg.wait_for_timeout(1200)

        nut = pg.locator("button:has-text('Nhận quà tặng')").first
        if await nut.count() == 0:
            print("  BỎ QUA  F07 — không thấy nút kịch bản (chưa dựng hiện trường?)")
        else:
            await nut.click()
            await pg.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=45000)
            huy = pg.locator("button:has-text('huỷ')").first
            if await huy.count() == 0:
                huy = pg.locator("button:has-text('Huỷ')").first
            await huy.click()
            await pg.wait_for_timeout(900)

            chu = await pg.inner_text("body")
            dat = "Đã huỷ yêu cầu" in chu and "chưa được gửi" in chu
            print(f"  {'PASS' if dat else 'FAIL'}  F07 · huỷ có xác nhận thấy được")
            if not dat:
                hong.append("F07")
        await ctx.close()
        await b.close()

    print("\n" + ("=== TẤT CẢ PASS ===" if not hong else "=== FAIL: " + ", ".join(hong)))
    sys.exit(1 if hong else 0)


asyncio.run(main())

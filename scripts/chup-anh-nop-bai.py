"""CHỤP ẢNH DỰ PHÒNG CHO BUỔI NỘP BÀI.

    python scripts/chup-anh-nop-bai.py

Cần hai server đang chạy: `npm run vi` (5188) và `npm run tan-cong` (5189).

Vì sao cần: thể lệ BTC ghi rõ có video demo dự phòng khi sự cố kỹ thuật. Nhưng
video mất thời gian quay lại mỗi lần giao diện đổi, còn ảnh thì chụp lại trong
30 giây. Ảnh không thay được video — nó là lớp dự phòng THỨ HAI, cho tình huống
máy chiếu không phát được video hoặc mạng hội trường chết giữa chừng.

Ghi commit SHA vào tên file. Một ảnh không biết mình chụp từ bản nào thì không
dùng làm bằng chứng được — đúng bài học từ vòng phỏng vấn đầu tiên.
"""

import asyncio
import subprocess
import sys
from pathlib import Path

for _luong in (sys.stdout, sys.stderr):
    try:
        _luong.reconfigure(encoding="utf-8")
    except Exception:
        pass

try:
    from playwright.async_api import async_playwright
except ImportError:
    sys.exit("Chưa cài Playwright:  pip install -r scripts/kiem-trinh-duyet/requirements.txt")

GOC = Path(__file__).resolve().parents[1]
DICH = GOC / "docs" / "nop-bai" / "anh"
VI, TC = "http://localhost:5188", "http://localhost:5189"

SHA = subprocess.run(
    ["git", "rev-parse", "--short", "HEAD"], cwd=GOC, capture_output=True, text=True
).stdout.strip()

KHUNG = [("may-tinh", 1440, 900), ("dien-thoai", 375, 812)]


async def chup(pg, ten: str, khung: str) -> None:
    duong = DICH / f"{ten}-{khung}-{SHA}.png"
    await pg.screenshot(path=str(duong), full_page=True)
    kb = duong.stat().st_size // 1024
    print(f"  {duong.relative_to(GOC)}  ({kb} KB)")


async def main() -> None:
    DICH.mkdir(parents=True, exist_ok=True)
    print(f"\nCHỤP ẢNH DỰ PHÒNG · commit {SHA}\n")

    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        for khung, w, h in KHUNG:
            ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2)
            pg = await ctx.new_page()

            # 1 · ví ở trạng thái nghỉ
            await pg.goto(VI)
            await pg.wait_for_load_state("networkidle")
            await pg.wait_for_timeout(1500)
            await chup(pg, "1-vi-nghi", khung)

            # 2 · TẤM CẢNH BÁO — phải BẤM NÚT mới có.
            #
            # Bản đầu chỉ mở `?mock=danger` rồi chụp, và ảnh ra là ví ở trạng thái
            # nghỉ: cờ mock chỉ bật dải nhãn, tấm cảnh báo cần một lượt kiểm tra.
            # Tên file khi đó nói dối về nội dung — và một ảnh dự phòng nói dối thì
            # tệ hơn không có ảnh, vì nó chỉ lộ ra lúc đang đứng trên sân khấu.
            await pg.goto(f"{VI}?mock=danger")
            await pg.wait_for_load_state("networkidle")
            await pg.locator("button", has_text="Nhận quà tặng").first.click()
            try:
                await pg.wait_for_selector(".result-card", timeout=60_000)
            except Exception:
                sys.exit("✖ không hiện được tấm cảnh báo — KHÔNG chụp ảnh sai nội dung")
            await pg.wait_for_timeout(900)
            # Kiểm nội dung, không tin cờ mock: phải thấy chữ mức nguy hiểm.
            chu = await pg.inner_text("body")
            if "Nguy hiểm" not in chu and "NGUY HIỂM" not in chu:
                sys.exit("✖ tấm cảnh báo hiện ra nhưng không thấy mức Nguy hiểm — dừng")
            await chup(pg, "2-canh-bao-nguy-hiem", khung)

            # 3 · trang số liệu — nơi mọi con số kèm cách đo
            await pg.goto(f"{VI}/so-lieu.html")
            await pg.wait_for_load_state("networkidle")
            await pg.wait_for_timeout(1500)
            await chup(pg, "3-so-lieu", khung)

            # 4 · trang tấn công giả
            await pg.goto(TC)
            await pg.wait_for_load_state("networkidle")
            await pg.wait_for_timeout(1500)
            await chup(pg, "4-trang-tan-cong", khung)

            await ctx.close()
        await b.close()

    print(f"\n→ {DICH.relative_to(GOC)}")
    print("  Ảnh KHÔNG thay được video demo dự phòng — nó là lớp dự phòng thứ hai.")


asyncio.run(main())

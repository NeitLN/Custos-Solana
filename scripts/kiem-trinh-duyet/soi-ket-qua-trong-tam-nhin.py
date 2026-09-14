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
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import dauvet
from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
VI = "http://localhost:5188"
KHUNG = [("320", 320, 720), ("375", 375, 812), ("768", 768, 1024)]


def ghi_bang_chung(muc: list[dict], hong: list[str]) -> None:
    """Ghi ra `data/a11y/ket-qua-tam-nhin.json` — xem chú thích ở `soi-race-gui.py`.

    Đây là phép đo theo KHUNG MÀN HÌNH, nên biên bản phải nói rõ đo ở những khung
    nào: "kết quả nằm trong tầm nhìn" ở 768px không nói gì về 320px.
    """
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None

    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "ket-qua-tam-nhin.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "khungDaKiem": [{"ten": t, "rong": w, "cao": h} for t, w, h in KHUNG],
                "soKiem": len(muc),
                "soHong": len(hong),
                "kiem": muc,
                "dat": not hong,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("→ data/a11y/ket-qua-tam-nhin.json")


async def main() -> None:
    hong = []
    muc: list[dict] = []
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
            muc.append(
                {
                    "khung": ten,
                    "dat": bool(dat),
                    "top": hop["top"],
                    "vh": hop["vh"],
                    "scrollY": hop["scrollY"],
                    "focusTrongKetQua": hop["focusTrongKetQua"],
                }
            )
            if not dat:
                hong.append(f"{ten}px: top={hop['top']} vh={hop['vh']} focus={hop['focusTrongKetQua']}")
            await ctx.close()
        await b.close()

    print()
    ghi_bang_chung(muc, hong)
    print("\n" + ("=== TẤT CẢ PASS ===" if not hong else "=== FAIL ===\n" + "\n".join(hong)))
    sys.exit(1 if hong else 0)


asyncio.run(main())

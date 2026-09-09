# -*- coding: utf-8 -*-
"""Bộ mang đi có mở được trên một máy khác không — P03.

    node scripts/dong-goi-ban-trinh-dien.mjs
    cd ban-trinh-dien && node phuc-vu.mjs 8099
    python scripts/kiem-trinh-duyet/soi-ban-trinh-dien.py

## Vì sao cần bài này khi script đóng gói đã có bốn bước kiểm

Bốn bước đó kiểm **file**: khoá riêng, đường dẫn cá nhân, trang có mặt. Không bước
nào mở trang ra xem nó có DỰNG được không.

Khoảng cách giữa hai thứ đó có thật và đã gặp: bản dựng production của ví từng phục
vụ một trang trắng hoàn toàn suốt nhiều tuần vì sai `base`, trong khi mọi file đều
có mặt và máy chủ trả 200 (xem `docs/HIEU-NANG.md` mục 4). Một bộ kiểm chỉ đếm file
sẽ nói bộ đó hoàn hảo.

Bộ mang đi còn dễ hỏng hơn: nó chạy bằng `phuc-vu.mjs` chứ không phải Vite, ở cổng
khác, đường dẫn tương đối chứ không phải `/Custos-Solana/`. Ba khác biệt đó chưa
từng được ai mở ra kiểm.

## Điều bài này KHÔNG kiểm

Không kiểm khi MẤT MẠNG. Màn hình cảnh báo dựng bằng mô phỏng thật trên Devnet, nên
không có mạng thì nó hiện thẻ lỗi — đúng thiết kế, và `DOC-TRUOC.md` đã nói. Kịch bản
mất mạng thuộc P02, cùng với video.
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
CONG = 8099
TRANG = [
    ("/", "ví mẫu"),
    ("/phong-van.html", "phỏng vấn"),
    ("/so-lieu.html", "số liệu"),
    ("/tan-cong/", "trang tấn công"),
]

kiem: list[dict] = []


def ck(ten: str, dat: bool, chi_tiet: str = "") -> None:
    kiem.append({"ten": ten, "dat": dat, "chiTiet": chi_tiet})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({chi_tiet})" if chi_tiet else ""))


async def soi(ctx, duong: str, ten: str) -> None:
    pg = await ctx.new_page()
    loiConsole: list[str] = []
    hong4xx: list[str] = []
    pg.on("console", lambda c: loiConsole.append(c.text[:90]) if c.type == "error" else None)
    pg.on(
        "response",
        lambda r: hong4xx.append(f"{r.status} {r.url.rsplit('/', 1)[-1]}") if r.status >= 400 else None,
    )

    try:
        await pg.goto(f"http://localhost:{CONG}{duong}", wait_until="load")
    except Exception as e:
        ck(f"{ten} · mở được", False, str(e)[:70])
        await pg.close()
        return
    await pg.wait_for_timeout(2500)

    # React có mount không — câu hỏi thật, khác hẳn "file có mặt không".
    n = await pg.evaluate("() => document.getElementById('root')?.innerHTML.length ?? -1")
    ck(f"{ten} · ứng dụng dựng được", n > 500, f"#root {n} ký tự")
    # Asset 404 là dấu hiệu kinh điển của sai đường dẫn khi đổi cách phục vụ.
    ck(f"{ten} · không tài nguyên nào 404", not hong4xx, ", ".join(hong4xx[:3]))
    ck(f"{ten} · không lỗi console", not loiConsole, "; ".join(loiConsole[:2]))
    await pg.close()


def ghi() -> None:
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None
    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "ban-trinh-dien.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "cong": CONG,
                "soKiem": len(kiem),
                "soDat": sum(1 for k in kiem if k["dat"]),
                "kiem": kiem,
                "dat": all(k["dat"] for k in kiem),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("→ data/a11y/ban-trinh-dien.json")


async def main() -> None:
    print(f"BỘ MANG ĐI · phục vụ bởi `phuc-vu.mjs` ở cổng {CONG}\n")
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        for duong, ten in TRANG:
            await soi(ctx, duong, ten)
        await ctx.close()
        await b.close()

    print()
    ghi()
    hong = [k["ten"] for k in kiem if not k["dat"]]
    if hong:
        print(f"\n=== {len(hong)} HỎNG ===")
        for h in hong:
            print(f"    {h}")
        sys.exit(1)
    print(f"\n=== TẤT CẢ {len(kiem)} PASS ===")


asyncio.run(main())

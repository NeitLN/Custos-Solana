# -*- coding: utf-8 -*-
"""Handoff trang tấn công → ví, trên nhiều cách gõ địa chỉ cùng một máy.

    npm run vi          # 5188
    npm run tan-cong    # 5189
    python scripts/kiem-trinh-duyet/soi-handoff.py

Hồi quy cho U07.

## Lỗi bài này sinh ra để canh

Địa chỉ ví được suy từ `location`. Bản trước hỏi TÊN MÁY:

    location.hostname === "localhost" && location.port === "5189"

`localhost` và `127.0.0.1` là cùng một máy chủ, chỉ khác cách gõ. Vào bằng cách thứ
hai thì nhánh trên trượt, rơi xuống nhánh "ví là thư mục cha", và ở gốc miền thì thư
mục cha CHÍNH LÀ NÓ.

Đo bằng chính phép giải địa chỉ, chạy trên Node — KHÔNG phải bằng trình duyệt (xem
mục dưới về lý do):

    http://localhost:5189/    -> http://localhost:5188      đúng
    http://127.0.0.1:5189/    -> http://127.0.0.1:5189      CHÍNH NÓ
    http://[::1]:5189/        -> http://[::1]:5189          CHÍNH NÓ

Nghĩa là bấm "Nhận quà tặng" sẽ mở lại trang tấn công. Không lỗi, không cảnh báo,
không có gì xảy ra — kiểu hỏng tệ nhất có thể xảy ra trong một buổi demo trực tiếp.

## Vì sao bài này KHÔNG mở `127.0.0.1` — dù đó chính là ca đã hỏng

Đo được, và nó là chuyện môi trường chứ không phải chuyện sản phẩm:

    http://localhost:5189   -> 200
    http://127.0.0.1:5189   -> TỪ CHỐI KẾT NỐI
    http://localhost:5188   -> 200
    http://127.0.0.1:5188   -> TỪ CHỐI KẾT NỐI

Vite gắn vào `localhost`, và trên Windows `localhost` phân giải ra `::1` trước. Nên
`127.0.0.1` không có ai lắng nghe, ở CẢ HAI cổng. Mở nó ở đây chỉ cho một bài kiểm
đỏ vì môi trường — đúng loại guard mà repo này đã tắt một lần rồi.

Quy tắc giải địa chỉ cho `127.0.0.1`, `[::1]` và IP LAN nằm ở
`packages/core/test/diaChiDemo.test.ts`, nơi `location` là THAM SỐ chứ không phải môi
trường. Tám ca ở đó chạy mọi lúc, không cần server nào.

Việc còn lại của bài này là thứ bài đơn vị không làm được: chứng minh cả chuỗi
handoff còn sống sau khi đổi cách suy địa chỉ — `window.open` trong cử chỉ bấm, URL
mang giao dịch, và ví bên kia thật sự dựng được khối kết quả.

Muốn tái hiện ca `127.0.0.1` bằng tay: `npm run tan-cong -- --host 127.0.0.1` cùng
`npm run vi -- --host 127.0.0.1`.
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
# Chỉ cách gõ mà dev server thật sự lắng nghe — xem docstring.
CACH_GO = ["http://localhost:5189/"]

kiem: list[dict] = []


def ck(ten: str, dat: bool, chi_tiet: str = "") -> None:
    kiem.append({"ten": ten, "dat": dat, "chiTiet": chi_tiet})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({chi_tiet})" if chi_tiet else ""))


async def thu(b, goc: str) -> None:
    print(f"\n{goc}")
    ctx = await b.new_context(viewport={"width": 1280, "height": 900})
    pg = await ctx.new_page()
    await pg.goto(goc, wait_until="networkidle")
    await pg.wait_for_timeout(1500)

    # Chọn theo LỚP, không theo chữ: nhãn nút đổi theo trạng thái tải
    # ("Đang tải…" → nhãn thật), nên bám chữ là bài kiểm hỏng theo nhịp mạng.
    nut = pg.locator("button.nut-nhan").first
    if await nut.count() == 0:
        ck(f"{goc} · có nút nhận quà", False, "không thấy nút")
        await ctx.close()
        return

    # Trang mở tab mới bằng `window.open(..., "noopener")`. Với `noopener` thì
    # `window.open` trả null nên trang KHÔNG tự dò được — nhưng Playwright thì thấy,
    # vì nó quan sát ở tầng context chứ không tầng JS.
    try:
        async with ctx.expect_page(timeout=20000) as ho:
            await nut.click()
        tab = await ho.value
        await tab.wait_for_load_state("domcontentloaded", timeout=20000)
        url = tab.url
    except Exception as e:
        ck(f"{goc} · mở được tab ví", False, str(e)[:70])
        await ctx.close()
        return

    ck(f"{goc} · mở được tab ví", True, url[:60])

    # TÍNH CHẤT CHÍNH: tab mới KHÔNG được là chính trang tấn công.
    ck(
        f"{goc} · tab mới không phải chính trang tấn công",
        not url.startswith(goc.rstrip("/")) or ":5188" in url,
        url[:70],
    )
    ck(f"{goc} · tab mới trỏ đúng cổng ví 5188", ":5188" in url, url[:70])
    # Giao dịch phải đi kèm — mở đúng ví mà không mang tx thì cũng vô dụng.
    ck(f"{goc} · URL mang giao dịch", "#tx=" in url, url[:70])

    # Và ví phải THẬT SỰ hiện kết quả kiểm tra, không chỉ tải trang.
    try:
        await tab.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=45000)
        ck(f"{goc} · ví hiện khối kết quả", True)
    except Exception as e:
        ck(f"{goc} · ví hiện khối kết quả", False, str(e)[:60])

    await ctx.close()


def ghi_bang_chung() -> None:
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None
    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "handoff.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "cachGo": CACH_GO,
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
    print("→ data/a11y/handoff.json")


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for goc in CACH_GO:
            await thu(b, goc)
        await b.close()

    print()
    ghi_bang_chung()
    hong = [k["ten"] for k in kiem if not k["dat"]]
    if hong:
        print(f"\n=== {len(hong)} HỎNG ===")
        for h in hong:
            print(f"    {h}")
        sys.exit(1)
    print(f"\n=== TẤT CẢ {len(kiem)} PASS ===")


asyncio.run(main())

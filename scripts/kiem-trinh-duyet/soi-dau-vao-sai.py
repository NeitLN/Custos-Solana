# -*- coding: utf-8 -*-
"""Đầu vào sai và dữ liệu lớn: app KHÔNG được trắng trang — thẻ TB-S02.

    npm run vi                                           # server ở 5188
    python -X utf8 scripts/kiem-trinh-duyet/soi-dau-vao-sai.py

Nghiệm thu S02 đòi bốn điều, và ba trong bốn chỉ đo được trên trình duyệt thật:

  · app không trắng trang
  · lỗi được phân loại, KHÔNG trở thành `safe`
  · không thực thi HTML
  · input lớn kết thúc trong ngân sách đã chốt

`fuzz-s02.ts` đo tầng L1 trong tiến trình (~20.000 lượt, 5 seed). File này đo tầng
giao diện — nơi một payload hỏng biến thành cái người dùng nhìn thấy.

GIỚI HẠN: Chromium headless, viewport giả lập. Không ký, không gửi.
"""
import asyncio
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import dauvet
from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
VI = "http://localhost:5188"

# Ba nhãn phán quyết. Payload hỏng KHÔNG được sinh ra cái nào.
PHAN_QUYET = ["Bình thường", "Cần xem kỹ", "Nguy hiểm"]

CA = [
    ("base64 hỏng", "invalid-base64!!!"),
    ("rỗng", ""),
    ("quá dài — 12.000 ký tự", "A" * 12000),
    ("HTML trong payload", "<script>window.__bi_chay=1</script>"),
    ("Bidi", "AAAA‮BBBB"),
    ("JSON chứ không phải base64", '{"tx":"x"}'),
    ("base64 hợp lệ nhưng không phải giao dịch", "aGVsbG8gd29ybGQ="),
]


def ghi_bang_chung(muc: list[dict], hong: list[str]) -> None:
    """Ghi ra `data/a11y/dau-vao-sai.json` — xem chú thích cùng tên ở `soi-race-gui.py`.

    Nghiệm thu S02 đòi bốn tính chất, và ba trong bốn chỉ đo được trên trình duyệt
    thật. Không có biên bản thì lần nghiệm thu sau phải chạy lại mới biết, và không
    ai đối chiếu được kết quả với bản giao diện đã đo.
    """
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None

    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "dau-vao-sai.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "the": "TB-S02",
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
    print("→ data/a11y/dau-vao-sai.json")


async def main() -> None:
    hong: list[str] = []
    muc: list[dict] = []

    def ghi(ten: str, dat: bool, chi_tiet: str = "") -> None:
        print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   <<< {chi_tiet}" if not dat else ""))
        muc.append({"ten": ten, "dat": bool(dat), "chiTiet": chi_tiet})
        if not dat:
            hong.append(ten)

    async with async_playwright() as p:
        b = await p.chromium.launch()
        for ten, payload in CA:
            ctx = await b.new_context(viewport={"width": 375, "height": 812})
            pg = await ctx.new_page()
            loi: list[str] = []
            pg.on("console", lambda m: loi.append(m.text) if m.type == "error" else None)

            t0 = time.time()
            await pg.goto(f"{VI}/#tx={payload}", wait_until="networkidle")
            await pg.wait_for_timeout(2000)
            ms = int((time.time() - t0) * 1000)

            chu = await pg.inner_text("body")

            # 1 · KHÔNG trắng trang. Đo bằng nội dung thật, không bằng mã HTTP.
            ghi(f"{ten} · không trắng trang", len(chu.strip()) > 200, f"{len(chu.strip())} ký tự")

            # 2 · Không sinh phán quyết nào từ dữ liệu rác.
            nhan = [n for n in PHAN_QUYET if n in chu]
            ghi(f"{ten} · không phán quyết", not nhan, ", ".join(nhan))

            # 3 · HTML không được thực thi.
            da_chay = await pg.evaluate("() => !!window.__bi_chay")
            ghi(f"{ten} · HTML không thực thi", not da_chay)

            # 4 · Ngân sách: 12 giây là hạn của một lượt kiểm; cộng dư cho tải trang.
            ghi(f"{ten} · xong trong ngân sách", ms < 20000, f"{ms} ms")

            # 5 · Không lỗi JavaScript chưa bắt.
            ghi(f"{ten} · không lỗi console", not loi, " | ".join(loi[:2])[:120])

            await ctx.close()
        await b.close()

    print()
    ghi_bang_chung(muc, hong)
    if hong:
        print(f"HỎNG {len(hong)}: " + "; ".join(hong[:6]))
        sys.exit(1)
    print("Tất cả PASS.")


asyncio.run(main())

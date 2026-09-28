# -*- coding: utf-8 -*-
"""CK-14 — hai ca lỗi còn thiếu bằng chứng trình duyệt trên VÍ (không phải trang giới thiệu).

    npm run vi
    python scripts/kiem-trinh-duyet/soi-ck14-loi.py [--url http://localhost:5188]

  A · STORAGE BỊ CHẶN   `localStorage` ném lỗi khi truy cập (chế độ riêng tư, chính sách
                        trình duyệt). Ví vẫn dựng, Phòng phân tích chạy được ca phát lại,
                        tab "Ví của bạn" vẫn mở; 0 pageerror. `soi-landing.py` mới canh
                        ca này cho trang giới thiệu.
  B · MẤT MẠNG          chặn MỌI request ra ngoài host của app. Phát lại vẫn cho kết quả
                        (không gọi mạng); nguồn "Devnet trực tiếp" phải ra thẻ lỗi đọc được
                        trong hạn, không quay mãi, không có yêu cầu ký.

Các ca lỗi khác của CK-14 đã có test/probe riêng — bảng ở `docs/roadmap/TIEN-DO.md` (CK-14).
"""
import argparse
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
kiem: list[dict] = []


def ck(ten: str, dat: bool, chi_tiet: str = "") -> None:
    kiem.append({"ten": ten, "dat": dat, "chiTiet": chi_tiet})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({chi_tiet})" if chi_tiet else ""))


async def ca_phat_lai(pg) -> bool:
    await pg.get_by_text("Dữ liệu đã ghi", exact=True).click()
    await pg.get_by_role("button", name=re.compile("Tấn công đầy đủ")).first.click()
    await pg.wait_for_selector(".dia-chi-day-du, [role=alert]", timeout=20000)
    return await pg.locator(".dia-chi-day-du").count() > 0


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5188")
    ap.add_argument("--ra", default=str(GOC / "docs/review/ck-20260928/ck14-loi.json"))
    a = ap.parse_args()
    host = urlparse(a.url).netloc
    async with async_playwright() as p:
        b = await p.chromium.launch()

        print("A · storage bị chặn")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        await ctx.add_init_script(
            "for (const k of ['localStorage','sessionStorage'])"
            " Object.defineProperty(window, k, {get(){ throw new DOMException('bị chặn','SecurityError'); }});"
        )
        pg = await ctx.new_page()
        loi: list[str] = []
        pg.on("pageerror", lambda e: loi.append(str(e)[:160]))
        await pg.goto(a.url + "/", wait_until="networkidle")
        ck("ví dựng khi storage bị chặn", await pg.get_by_role("button", name="Phòng phân tích").count() > 0)
        ck("phát lại vẫn ra kết quả", await ca_phat_lai(pg))
        await pg.get_by_role("button", name="Ví của bạn").first.click()
        await pg.wait_for_timeout(1500)
        ck("tab 'Ví của bạn' vẫn mở", await pg.get_by_role("button", name=re.compile("Ký tạo phiên|Khôi phục")).count() > 0)
        ck("0 pageerror khi storage bị chặn", len(loi) == 0, "; ".join(loi[:2]))
        await ctx.close()

        print("B · mất mạng (chỉ host của app trả lời)")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        bi_chan: list[str] = []

        async def chan(route):
            u = urlparse(route.request.url)
            if u.netloc == host:
                await route.continue_()
            else:
                bi_chan.append(u.netloc)
                await route.abort("internetdisconnected")

        await ctx.route("**/*", chan)
        pg = await ctx.new_page()
        loi = []
        pg.on("pageerror", lambda e: loi.append(str(e)[:160]))
        await pg.goto(a.url + "/", wait_until="domcontentloaded")
        await pg.wait_for_timeout(1500)
        ck("mất mạng: phát lại vẫn ra kết quả", await ca_phat_lai(pg))
        await pg.reload(wait_until="domcontentloaded")
        await pg.wait_for_timeout(1000)
        await pg.get_by_text("Devnet trực tiếp", exact=True).click()
        t0 = asyncio.get_event_loop().time()
        await pg.get_by_role("button", name=re.compile("Tấn công đầy đủ")).first.click()
        try:
            await pg.wait_for_selector("[role=alert]", timeout=30000)
            giay = round(asyncio.get_event_loop().time() - t0, 1)
            chu = (await pg.locator("[role=alert]").first.inner_text()).strip()
            ck("mất mạng: live ra thẻ lỗi trong hạn", True, f"{giay}s")
            ck("thẻ lỗi không lộ URL/JSON thô", not re.search(r"https?://|\{\"", chu), chu[:90])
        except Exception as e:
            ck("mất mạng: live ra thẻ lỗi trong hạn", False, str(e)[:120])
        ck("mất mạng: không có yêu cầu ký", await pg.locator(".wallet-request").count() == 0)
        ck("mất mạng: 0 pageerror", len(loi) == 0, "; ".join(loi[:2]))
        await ctx.close()
        await b.close()

    bao = {"luc": datetime.now(timezone.utc).isoformat(), "url": a.url, "kiem": kiem,
           "hostBiChan": sorted(set(bi_chan)),
           "gioiHan": ["Chromium headless; mất mạng mô phỏng bằng chặn request, không rút cáp.",
                       "Storage bị chặn bằng cách làm getter ném lỗi — giống chế độ chặn cookie/site data."]}
    Path(a.ra).parent.mkdir(parents=True, exist_ok=True)
    Path(a.ra).write_text(json.dumps(bao, ensure_ascii=False, indent=1), encoding="utf-8")
    dat = sum(k["dat"] for k in kiem)
    print(f"{dat}/{len(kiem)} đạt → {a.ra}")
    # Mã thoát là thứ CI và người chạy tin — một FAIL phải làm lệnh thất bại (Codex review lần 4).
    if dat != len(kiem):
        raise SystemExit(1)


asyncio.run(main())

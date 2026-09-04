"""KIỂM TRÊN TRÌNH DUYỆT THẬT — khả năng tiếp cận và bốn luồng demo.

    python scripts/kiem-trinh-duyet/soi-trinh-duyet.py

Cần hai server đang chạy: `npm run vi` (5188) và `npm run tan-cong` (5189).

KHÔNG nằm trong CI, và cố ý như vậy: Playwright kéo theo một trình duyệt vài trăm
MB, thêm nó vào đường deploy ngay trước hạn thi là đổi một rủi ro nhỏ lấy một rủi
ro lớn. Nhưng bộ này PHẢI nằm trong repo, vì nếu không thì không ai ngoài người
viết nó lặp lại được kết quả — và một bằng chứng không lặp lại được thì không phải
bằng chứng.

Cài một lần:
    pip install -r scripts/kiem-trinh-duyet/requirements.txt
    playwright install chromium
    npm ci          # axe-core ghim trong devDependencies

Những lỗi bộ này đã tìm ra, mà bộ test đơn vị KHÔNG thấy:
  · `huyRef` mắc kẹt `true` vì StrictMode chạy effect hai lượt -> bấm nút không
    có gì xảy ra, không lỗi, không cảnh báo
  · link "Số liệu" mất tên dưới 640px (chữ bị ẩn, icon thì aria-hidden)
  · tấm cảnh báo trên trang phỏng vấn phối màu ra mảng xám, 11 chỗ dưới WCAG AA
  · `.nut` cao 42px — thiếu 2px so với ngưỡng vùng bấm
"""

import asyncio
import sys

# Console Windows mặc định là cp1252 và chết ngay trên chữ tiếng Việt — mọi nhãn
# kiểm trong bộ này đều có dấu. Đặt ở đây thay vì bắt người chạy nhớ PYTHONIOENCODING.
for _luong in (sys.stdout, sys.stderr):
    try:
        _luong.reconfigure(encoding="utf-8")
    except Exception:
        pass
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    sys.exit("Chưa cài Playwright:  pip install playwright && playwright install chromium")

GOC = Path(__file__).resolve().parents[2]
AXE = GOC / "node_modules" / "axe-core" / "axe.min.js"
VI, TC = "http://localhost:5188", "http://localhost:5189"
KHUNG = [("điện thoại", 375, 812), ("máy tính", 1440, 900)]

loi: list[str] = []


def ck(ten: str, ok: bool, chi_tiet: str = "") -> None:
    print(("  PASS  " if ok else "  FAIL  ") + ten + ("" if ok else "   <<< " + chi_tiet), flush=True)
    if not ok:
        loi.append(ten)


async def soi_axe(pg, ten: str) -> None:
    """Chạy axe-core thật, không dùng checker tự viết.

    Checker tự viết đã sai hai lần: Chrome trả màu dạng `oklch()` và đọc ba số đó
    như RGB cho ra tỉ lệ tương phản vô nghĩa.
    """
    await pg.evaluate(AXE.read_text(encoding="utf-8"))
    kq = await pg.evaluate(
        """async () => await axe.run(document, {
            resultTypes: ['violations'],
            runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] }
        })"""
    )
    v = kq["violations"]
    ck(f"axe · {ten}", not v, "; ".join(f"{x['id']} ({len(x['nodes'])} chỗ)" for x in v))


async def cho_ket_qua(pg, giay: int = 60) -> bool:
    try:
        await pg.wait_for_selector(".result-card", timeout=giay * 1000)
        await pg.wait_for_timeout(700)
        return True
    except Exception:
        return False


AXE_GHIM = "4.13.0"
PLAYWRIGHT_GHIM = "1.61.0"


def phien_ban_axe() -> str:
    """Đọc số phiên bản axe-core từ package.json của chính gói đó."""
    import json

    pkg = AXE.parent / "package.json"
    try:
        return json.loads(pkg.read_text(encoding="utf-8"))["version"]
    except Exception:
        return "?"


def in_phien_ban(chromium: str) -> None:
    """Ghi đúng bộ công cụ đã đo, ngay đầu báo cáo.

    "0 vi phạm axe" là một tuyên bố về MỘT bộ luật cụ thể. axe-core đổi luật giữa các
    bản nhỏ, và Chromium mới tính lại màu lẫn kích thước. Không ghi phiên bản thì
    người đọc không lặp lại được kết quả, mà kết quả không lặp lại được thì không
    dùng làm bằng chứng được — đó cũng là lý do bộ này nằm trong repo ngay từ đầu.
    """
    from importlib.metadata import version as _v

    axe = phien_ban_axe()
    # Gói `playwright` không phơi `__version__`; số phiên bản nằm ở metadata bản cài.
    try:
        pw = _v("playwright")
    except Exception:
        pw = "?"
    print(f"\nChromium {chromium} · Playwright {pw} · axe-core {axe}")
    print(datetime.now(timezone.utc).isoformat(timespec="seconds") + "\n")

    # axe ghim trong package.json, nên lệch là dấu hiệu ai đó cài đè — FAIL thật,
    # vì kết quả lúc đó không so được với lần đo trước.
    ck(f"axe-core đúng bản ghim ({AXE_GHIM})", axe == AXE_GHIM, f"đang chạy {axe}")

    # Playwright thì chỉ cảnh báo: máy khác có thể chưa `pip install -r`, và chặn ở
    # đây sẽ khiến người ta bỏ chạy bộ kiểm thay vì sửa cho khớp.
    if pw != PLAYWRIGHT_GHIM:
        print(f"  CẢNH BÁO  Playwright {pw} ≠ bản ghim {PLAYWRIGHT_GHIM}")
        print(f"            kết quả bên dưới KHÔNG so trực tiếp được với lần đo trước")
        print(f"            pip install -r scripts/kiem-trinh-duyet/requirements.txt")


async def main() -> None:
    if not AXE.exists():
        sys.exit(f"Chưa có {AXE}\n  npm ci   (axe-core ghim trong devDependencies)")

    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        in_phien_ban(b.version)

        # ── A · giao dịch nguy hiểm trong ví ────────────────────────────────
        print("A · ví — giao dịch nguy hiểm")
        for ten, w, h in KHUNG:
            ctx = await b.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            bug: list[str] = []
            pg.on("pageerror", lambda e: bug.append(str(e)[:90]))
            pg.on("console", lambda m: bug.append(m.text[:90]) if m.type == "error" else None)
            await pg.goto(VI)
            await pg.wait_for_load_state("networkidle")
            await pg.wait_for_timeout(2000)
            await soi_axe(pg, f"ví nghỉ · {ten}")
            await pg.locator("button", has_text="Nhận quà tặng").first.click()
            ok = await cho_ket_qua(pg)
            t = await pg.locator("body").inner_text() if ok else ""
            ck(f"{ten} · ra mức Nguy hiểm", "Nguy hiểm" in t)
            ck(f"{ten} · bảng hậu quả 500 → 0", "500" in t and "0,0" in t)
            ck(f"{ten} · coverage 2 trên 3", "2 trên 3" in t)
            ck(f"{ten} · 0 lỗi console", not bug, str(bug[:1]))
            tran = await pg.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            ck(f"{ten} · không tràn ngang", tran == 0, f"+{tran}px")
            if ok:
                await soi_axe(pg, f"ví đang cảnh báo · {ten}")
                cao = await pg.evaluate(
                    """() => [...document.querySelectorAll('button.nut')]
                         .map(e => Math.round(e.getBoundingClientRect().height))"""
                )
                ck(f"{ten} · mọi CTA chính ≥44px", all(x >= 44 for x in cao), str(cao))
            await ctx.close()

        # ── B · giao dịch bình thường ───────────────────────────────────────
        print("\nB · ví — giao dịch bình thường")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(VI)
        await pg.wait_for_load_state("networkidle")
        await pg.wait_for_timeout(2000)
        await pg.locator("button", has_text="Gửi 10 token").first.click()
        ok = await cho_ket_qua(pg)
        t = await pg.locator("body").inner_text() if ok else ""
        ck("lành tính → Bình thường", "Bình thường" in t)
        ck("KHÔNG hiện chữ 'an toàn'", "an toàn tuyệt đối" not in t.lower())
        await ctx.close()

        # ── C · trang tấn công → ví ─────────────────────────────────────────
        print("\nC · trang tấn công → ví")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(TC)
        await pg.wait_for_load_state("networkidle")
        await pg.wait_for_timeout(3500)
        await soi_axe(pg, "trang tấn công")
        await pg.evaluate("() => { window.__u=null; window.open=(u)=>{window.__u=u; return null;}; }")
        await pg.locator("button.nut-nhan").first.click()
        url = await pg.evaluate("() => window.__u")  # đọc NGAY: có await nào trước là null
        ck("window.open gọi ĐỒNG BỘ trong cử chỉ bấm", bool(url))
        ck("URL mang giao dịch + lời khai airdrop", bool(url and "#tx=" in url and "airdrop" in url))
        if url:
            pg2 = await ctx.new_page()
            await pg2.goto(url)
            await pg2.wait_for_load_state("networkidle")
            ok = await cho_ket_qua(pg2)
            t2 = await pg2.locator("body").inner_text() if ok else ""
            ck("ví nhận và ra Nguy hiểm", "Nguy hiểm" in t2)
            ck("bắt được lời khai gian", "một đằng" in t2 or "airdrop" in t2.lower())
        await ctx.close()

        # ── D · Devnet treo → thẻ lỗi → thử lại ─────────────────────────────
        print("\nD · Devnet treo (đường lỗi)")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        treo = {"bat": True}

        async def chan(route):
            if treo["bat"]:
                await asyncio.sleep(60)  # KHÔNG dùng time.sleep: nó chặn cả Playwright
                try:
                    await route.abort()
                except Exception:
                    pass
            else:
                await route.continue_()

        await pg.route("**://api.devnet.solana.com/**", chan)
        await pg.goto(TC)
        await pg.wait_for_timeout(2000)
        t0 = time.time()
        await pg.locator("button.nut-nhan").first.click()
        hien = False
        try:
            await pg.wait_for_selector('[role="alert"]', timeout=25000)
            hien = True
        except Exception:
            pass
        giay = round(time.time() - t0, 1)
        ck(f"thẻ lỗi hiện ra ({giay}s)", hien)
        ck(f"dừng theo hạn ~9s, không chờ ~30s", hien and 8.0 <= giay <= 14.0, f"{giay}s")
        if hien:
            t = await pg.locator('[role="alert"]').inner_text()
            ck("nói rõ là lỗi kết nối, KHÔNG kết luận về giao dịch", "không phải kết luận" in t)
            ck("có đường lui dữ liệu mẫu CÓ NHÃN", "dữ liệu mẫu" in t.lower())
            await soi_axe(pg, "trang tấn công · trạng thái lỗi")
            treo["bat"] = False
            await pg.locator('[role="alert"] button').first.click()
            di = False
            for _ in range(40):
                if "localhost:5188" in pg.url:
                    di = True
                    break
                await pg.wait_for_timeout(300)
            ck("thử lại gọi lại RPC và đi tiếp được", di, pg.url[:60])
        await ctx.close()

        # ── E · giảm chuyển động ────────────────────────────────────────────
        print("\nE · prefers-reduced-motion")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
        pg = await ctx.new_page()
        await pg.goto(VI)
        await pg.wait_for_load_state("networkidle")
        await pg.wait_for_timeout(2000)
        await pg.locator("button", has_text="Nhận quà tặng").first.click()
        ok = await cho_ket_qua(pg)
        ck("cảnh báo vẫn hiện khi tắt chuyển động", ok)
        if ok:
            con = await pg.evaluate(
                """() => [...document.querySelectorAll('.result-card, .reveal-card')]
                     .filter(e => parseFloat(getComputedStyle(e).animationDuration) > 0.05).length"""
            )
            ck("0 animation còn chạy", con == 0, f"{con} khối")
        await ctx.close()

        # ── F · trang số liệu và trang phỏng vấn ────────────────────────────
        print("\nF · trang số liệu · trang phỏng vấn")
        for ten, url, cho in [("số liệu", f"{VI}/so-lieu.html", False), ("phỏng vấn", f"{VI}/phong-van.html", True)]:
            for khung, w, h in KHUNG:
                ctx = await b.new_context(viewport={"width": w, "height": h})
                pg = await ctx.new_page()
                await pg.goto(url)
                await pg.wait_for_load_state("networkidle")
                if cho:
                    await cho_ket_qua(pg)
                else:
                    await pg.wait_for_timeout(1500)
                await soi_axe(pg, f"{ten} · {khung}")
                tran = await pg.evaluate(
                    "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
                )
                ck(f"{ten} · {khung} · không tràn ngang", tran == 0, f"+{tran}px")
                await ctx.close()

        await b.close()

    print("\n" + ("=== TẤT CẢ PASS ===" if not loi else f"=== {len(loi)} FAIL: " + " · ".join(loi)))
    sys.exit(1 if loi else 0)


asyncio.run(main())

# -*- coding: utf-8 -*-
"""CK-12 — cùng một hành trình trên BA engine trình duyệt, nhiều khổ màn, bàn phím, cây trợ năng.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-ck12-ba-trinh-duyet.py [--url http://localhost:5188]

Hành trình: Phòng phân tích → nguồn "Dữ liệu đã ghi" (phát lại, không mạng) → ca "Tấn công
đầy đủ" → thẻ Nguy hiểm. Phát lại để kết quả không phụ thuộc Devnet lúc chạy.

Mỗi engine (chromium, firefox, webkit):
  · KHỔ MÀN   320 / 390 / 768 / 1440, 640 (= 1280 phóng 200 %), máy chiếu 1280×720 và 1024×768:
              không tràn ngang; nút huỷ còn trong trang, cỡ chữ ≥ 14 px.
  · AXE       axe-core ở 1440 và 390 trên thẻ kết quả.
  · BÀN PHÍM  chọn nguồn + chạy ca chỉ bằng Tab/Space/Enter; nút huỷ tới được bằng Tab.
  · TRỢ NĂNG  ảnh chụp cây trợ năng (aria snapshot) của vùng kết quả — thứ trình đọc màn hình
              nhận. ĐÂY KHÔNG PHẢI chạy NVDA/VoiceOver: nó chứng minh tên/vai trò có mặt,
              không chứng minh trải nghiệm nghe.

Ghi JSON + ảnh vào thư mục `--ra`. Engine nào không mở được thì ghi rõ, không tính là đạt.
"""
import argparse
import asyncio
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
AXE = GOC / "node_modules" / "axe-core" / "axe.min.js"
KHO = [(320, 800), (390, 844), (640, 800), (768, 1024), (1024, 768), (1280, 720), (1440, 1000)]
NUT_HUY = re.compile("Chặn & huỷ giao dịch")


async def mo_nguon(pg) -> None:
    """R0-2: bộ chọn nguồn nằm trong <details> "Tuỳ chọn nguồn dữ liệu" mặc định đóng."""
    tom = pg.locator("details.nguon-tuy-chon:not([open]) > summary")
    if await tom.count():
        await tom.click()


async def chay_ca(pg, ban_phim: bool) -> None:
    """Chọn phát lại và chạy ca tấn công; `ban_phim` ⇒ chỉ dùng phím."""
    if not ban_phim:
        await mo_nguon(pg)
        await pg.get_by_text("Dữ liệu đã ghi", exact=True).click()
        await pg.get_by_role("button", name=re.compile("Tấn công đầy đủ")).first.click()
    else:
        radio = pg.get_by_role("radio", name=re.compile("Dữ liệu đã ghi"))
        for _ in range(80):
            await pg.keyboard.press("Tab")
            if await pg.evaluate("document.activeElement?.matches('details.nguon-tuy-chon > summary')"):
                break
        await pg.keyboard.press("Enter")  # mở "Tuỳ chọn nguồn dữ liệu" bằng phím
        for _ in range(80):
            await pg.keyboard.press("Tab")
            if await pg.evaluate("document.activeElement?.name === 'nguon-kiem'"):
                break
        # Trong nhóm radio, mũi tên đổi lựa chọn (hành vi chuẩn của trình duyệt).
        if not await radio.is_checked():
            await pg.keyboard.press("ArrowRight")
        nut = pg.get_by_role("button", name=re.compile("Tấn công đầy đủ")).first
        # Bộ chọn nguồn nằm SAU thẻ tình huống (R0-2) ⇒ lùi bằng Shift+Tab như người dùng bàn phím
        # thật; Tab tiến phải vòng qua cuối trang, và Firefox headless không vòng lại.
        for _ in range(80):
            await pg.keyboard.press("Shift+Tab")
            if await nut.evaluate("e => e === document.activeElement"):
                break
        await pg.keyboard.press("Enter")
    await pg.wait_for_selector(".dia-chi-day-du, [role=alert]", timeout=30000)


async def mot_engine(p, ten: str, url: str, ra: Path) -> dict:
    kq: dict = {"engine": ten, "kho": [], "axe": {}, "loiConsole": []}
    try:
        b = await getattr(p, ten).launch()
    except Exception as e:  # engine chưa cài
        kq["khongMoDuoc"] = str(e).splitlines()[0][:200]
        return kq
    kq["phienBan"] = b.version
    pg = await b.new_page(viewport={"width": 1440, "height": 1000})
    pg.on("console", lambda m: m.type == "error" and kq["loiConsole"].append(m.text[:200]))
    await pg.goto(url + "/", wait_until="networkidle")
    await chay_ca(pg, ban_phim=False)
    kq["mucHienThi"] = (await pg.locator(".canh-bao h3, [data-level]").first.inner_text()).strip()[:40] if await pg.locator(".canh-bao h3, [data-level]").count() else None

    for w, h in KHO:
        await pg.set_viewport_size({"width": w, "height": h})
        await pg.wait_for_timeout(250)
        tran = await pg.evaluate("document.documentElement.scrollWidth - innerWidth")
        nut = pg.get_by_role("button", name=NUT_HUY).first
        co = await nut.count() > 0
        cz = await nut.evaluate("e => parseFloat(getComputedStyle(e).fontSize)") if co else None
        cao = await nut.evaluate("e => e.getBoundingClientRect().height") if co else None
        kq["kho"].append({"w": w, "h": h, "tranPx": tran, "nutHuy": co, "coChuNutHuy": cz, "caoNutHuy": cao,
                          "dat": tran <= 0 and co and (cz or 0) >= 14 and (cao or 0) >= 43.5})  # sai số làm tròn dưới pixel
        if (w, h) in [(1280, 720), (390, 844), (640, 800)]:
            await pg.screenshot(path=str(ra / f"{ten}-{w}x{h}.png"))

    for w in (1440, 390):
        await pg.set_viewport_size({"width": w, "height": 1000})
        await pg.add_script_tag(path=str(AXE))
        v = await pg.evaluate("""async () => (await axe.run(document, {resultTypes: ['violations']})).violations
          .map(v => ({id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target.join(' ')).slice(0, 4)}))""")
        kq["axe"][str(w)] = v

    # Cây trợ năng của vùng kết quả (quanh nút huỷ) — cái trình đọc màn hình nhận.
    await pg.set_viewport_size({"width": 1440, "height": 1000})
    # Vùng nhỏ nhất chứa CẢ mức cảnh báo lẫn nút huỷ = thẻ kết quả.
    vung = pg.locator("section").filter(has=pg.get_by_role("button", name=NUT_HUY)).filter(has=pg.get_by_text("Nguy hiểm", exact=True)).last
    snap = await vung.aria_snapshot()
    (ra / f"{ten}-aria.yaml").write_text(snap, encoding="utf-8")
    kq["aria"] = {
        "coMucCanhBao": bool(re.search(r"Nguy hiểm", snap)),
        "coHaiNhomHauQua": "TÀI SẢN" in snap and "QUYỀN KIỂM SOÁT" in snap,
        "nutSaoChepCoTen": len(re.findall(r'button "Sao chép [^"]+ đầy đủ"', snap)),
        "linkExplorer": len(re.findall(r'link "Explorer', snap)),
        "nutHuyCoTen": bool(re.search(r'button "Chặn & huỷ giao dịch"', snap)),
    }

    # SAO CHÉP THẬT (Codex review lần 3): chuỗi trong clipboard phải là địa chỉ ĐẦY ĐỦ đang hiện
    # trên dòng, không phải bản rút gọn. Chỉ Chromium cấp được quyền đọc clipboard cho Playwright.
    if ten == "chromium":
        await pg.context.grant_permissions(["clipboard-read", "clipboard-write"])
        dong = pg.locator(".dia-chi-day-du li").first
        hien = (await dong.locator("code").inner_text()).strip()
        await dong.locator(".dia-chi-nut").click()
        await pg.wait_for_timeout(200)
        chep = await pg.evaluate("navigator.clipboard.readText()")
        kq["saoChep"] = {"hien": hien, "chep": chep,
                         "dat": chep == hien and "…" not in chep and 32 <= len(chep) <= 44}

    # Bàn phím: trang mới, không chuột.
    pg2 = await b.new_page(viewport={"width": 1440, "height": 1000})
    await pg2.goto(url + "/", wait_until="networkidle")
    try:
        await chay_ca(pg2, ban_phim=True)
        huy = pg2.get_by_role("button", name=NUT_HUY).first
        toi = False
        for _ in range(120):
            await pg2.keyboard.press("Tab")
            if await huy.evaluate("e => e === document.activeElement"):
                toi = True
                break
        vien = await huy.evaluate("e => getComputedStyle(e).outlineStyle + ' ' + getComputedStyle(e).outlineWidth") if toi else None
        kq["banPhim"] = {"chayDuocCa": True, "tabToiNutHuy": toi, "vienFocus": vien}
    except Exception as e:
        kq["banPhim"] = {"chayDuocCa": False, "loi": str(e).splitlines()[0][:200]}
    await b.close()
    return kq


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:5188")
    ap.add_argument("--ra", default=str(GOC / "docs/review/ck-20260928/ck12"))
    a = ap.parse_args()
    ra = Path(a.ra)
    ra.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        ket = [await mot_engine(p, t, a.url, ra) for t in ("chromium", "firefox", "webkit")]
    bao = {"luc": datetime.now(timezone.utc).isoformat(), "url": a.url, "hanhTrinh": "phát lại · Tấn công đầy đủ", "engine": ket,
           "gioiHan": ["Cây trợ năng KHÔNG thay cho chạy NVDA/VoiceOver thật.",
                       "640 px mô phỏng 1280 px phóng 200 % bằng khổ màn, không bằng zoom của trình duyệt.",
                       "WebKit của Playwright trên Windows không phải Safari trên macOS/iOS."]}
    (ra / "ket-qua.json").write_text(json.dumps(bao, ensure_ascii=False, indent=1), encoding="utf-8")
    for k in ket:
        if "khongMoDuoc" in k:
            print(f"{k['engine']:9} KHÔNG MỞ ĐƯỢC: {k['khongMoDuoc']}")
            continue
        hong = [f"{x['w']}x{x['h']}" for x in k["kho"] if not x["dat"]]
        axe = {w: [v["id"] for v in vs] for w, vs in k["axe"].items()}
        print(f"{k['engine']:9} {k['phienBan']:14} khổ hỏng: {hong or 'không'} · axe: {axe} · bàn phím: {k['banPhim']} · aria: {k['aria']} · console: {len(k['loiConsole'])}" + (f" · sao chép: {k['saoChep']}" if 'saoChep' in k else ""))
    print(f"→ {ra / 'ket-qua.json'}")
    # Mã thoát khác 0 khi BẤT KỲ engine nào hỏng một tiêu chí (Codex review lần 4, mục 3).
    hong = [k["engine"] for k in ket if "khongMoDuoc" in k
            or any(not x["dat"] for x in k["kho"]) or any(k["axe"].values())
            or not k.get("banPhim", {}).get("tabToiNutHuy") or not all(k.get("aria", {}).values())
            or not k.get("saoChep", {"dat": True})["dat"]]
    if hong:
        print(f"HỎNG: {', '.join(hong)}")
        raise SystemExit(1)


asyncio.run(main())

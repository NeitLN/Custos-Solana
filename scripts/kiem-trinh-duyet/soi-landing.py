# -*- coding: utf-8 -*-
"""
Probe cho trang giới thiệu (WEB-05/07).

Chạy trên BẢN BUILD dưới prefix production, không phải dev server: đặc tả mục
15.3 đòi kiểm chính thứ sẽ được deploy, và bẫy `isPreview` trong `vite.config.ts`
chỉ lộ ra ở đường này.

    npm run build -w @custos-solana/demo-wallet
    npm run preview -w @custos-solana/demo-wallet -- --port 5197
    python scripts/kiem-trinh-duyet/soi-landing.py
"""
import asyncio
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dauvet  # noqa: E402  — module cạnh file này

from playwright.async_api import async_playwright  # noqa: E402

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

# Cổng đọc từ THAM SỐ, không ghim.
# Mục 8 của `DIEU-CHINH-UI-CUSTOS.md` cảnh báo đích danh: probe cũ ghim 5197, và
# chạy nó khi preview ở cổng khác sẽ kiểm nhầm server — hoặc ERR_CONNECTION_REFUSED
# như lần đầu tôi chạy lại sau khi chuyển sang 5198.
CONG = int(sys.argv[1]) if len(sys.argv) > 1 else 5198
GOC = f"http://localhost:{CONG}/Custos-Solana"
TRANG = f"{GOC}/gioi-thieu.html"

loi: list[str] = []
tong = 0

# Tái dùng đúng axe-core đã ghim trong devDependencies — cùng bản với
# `soi-trinh-duyet.py`. Checker tự viết đã sai hai lần trong repo này (Chrome trả
# màu `oklch()` và đọc ba số đó như RGB cho ra tỉ lệ vô nghĩa).
AXE = pathlib.Path(__file__).resolve().parents[2] / "node_modules" / "axe-core" / "axe.min.js"
vi_pham: list[dict] = []


async def soi_axe(pg, ten: str) -> None:
    await pg.evaluate(AXE.read_text(encoding="utf-8"))
    kq = await pg.evaluate(
        """async () => await axe.run(document, {
            resultTypes: ['violations'],
            runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] }
        })"""
    )
    v = kq["violations"]
    for x in v:
        vi_pham.append({"trang": ten, "luat": x["id"], "impact": x.get("impact"), "soCho": len(x["nodes"])})
    ck(f"axe · {ten}", not v, "; ".join(f"{x['id']} ({len(x['nodes'])} chỗ)" for x in v))


kiem: list[dict] = []


def ck(ten: str, dat: bool, ghi: str = "") -> None:
    global tong
    tong += 1
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({ghi})" if ghi else ""))
    kiem.append({"ten": ten, "dat": dat, "chiTiet": "đạt" if dat else ghi})
    if not dat:
        loi.append(f"{ten}{' — ' + ghi if ghi else ''}")


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()

        # ── A · Dựng trang, cấu trúc và nhãn nguồn ───────────────────────────
        print("A · Dựng trang và cấu trúc")
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        bug: list[str] = []
        rpc: list[str] = []
        pg.on("pageerror", lambda e: bug.append(f"pageerror: {e}"))
        pg.on("console", lambda m: bug.append(f"console: {m.text}") if m.type == "error" else None)
        # Mục 12.3: KHÔNG gọi RPC/AI/analytics khi mở landing.
        pg.on(
            "request",
            lambda r: rpc.append(r.url)
            if any(x in r.url for x in ("solana.com", "anthropic.com", "googleapis"))
            else None,
        )

        await pg.goto(TRANG, wait_until="networkidle")
        await pg.wait_for_timeout(400)

        ck("0 lỗi console/pageerror", len(bug) == 0, str(bug[:1])[:100])
        ck("KHÔNG gọi RPC/AI khi mở trang", len(rpc) == 0, f"{len(rpc)} lời gọi")

        h1 = await pg.locator("h1").all_inner_texts()
        ck("đúng MỘT h1", len(h1) == 1, f"{len(h1)} h1")
        ck("h1 đúng nội dung", "Hiểu điều bạn sắp ký" in (h1[0] if h1 else ""), (h1[0] if h1 else "")[:40])

        for tag in ("header", "nav", "main", "footer"):
            ck(f"có <{tag}>", await pg.locator(tag).count() >= 1)

        # Nhãn "kết quả mẫu" TÁCH khỏi nhãn Devnet (mục 6.2).
        than = await pg.locator("body").inner_text()
        ck("có nhãn 'Kết quả mẫu đã lưu'", "Kết quả mẫu đã lưu" in than)
        ck("có nhãn Devnet riêng", "Devnet" in than)
        ck("không tự xưng 'live'", "đang kiểm tra trực tiếp" not in than.lower())

        # Mục 16.4: không bịa số người dùng/đối tác/bảo mật tuyệt đối.
        for cam in ["100%", "bảo mật tuyệt đối", "được audit", "đối tác", "người dùng tin"]:
            ck(f"không có tuyên bố '{cam}'", cam not in than)

        ck("có câu giới hạn", "không bảo đảm một giao dịch an toàn" in than)

        await soi_axe(pg, "landing VI desktop")

        # ── B · A/B đổi được và bằng chứng mở được ───────────────────────────
        print("\nB · A/B và bằng chứng")
        # UI-05: desktop hiện CẢ HAI ca cùng lúc trong một bảng, không còn nút
        # chọn. Người xem không phải nhớ ca trước để thấy "cùng 490, khác quyền".
        tAB = await pg.locator("#trai-nghiem").inner_text()
        ck("có bảng đối chiếu A/B", await pg.locator("#trai-nghiem table").count() == 1)
        ck("bảng hiện CẢ hai ca cùng lúc", "Chỉ chuyển" in tAB and "Chuyển và đổi chủ" in tAB)
        ck("A: không có thao tác đổi chủ", "Không có trong transaction mẫu" in tAB)
        ck("A: kết luận đúng phạm vi", "Không phát hiện nguy hiểm trong phần đã đọc" in tAB)
        ck("B: phát hiện đổi quyền", "Phát hiện thay đổi quyền kiểm soát" in tAB)
        ck("cả hai cùng số dư 490", tAB.count("490") >= 2, f"{tAB.count('490')} lần")
        ck("badge nguồn hiện trong phần A/B", "Kết quả mẫu đã lưu" in tAB)

        # Evidence theo TỪNG CA — nút nói rõ ca nào (mục 5).
        nutB = pg.get_by_role("button", name="Xem dữ kiện của ca B")
        ck("có nút dữ kiện ca B", await nutB.count() == 1)
        await nutB.click()
        await pg.wait_for_timeout(300)
        tMo = await pg.locator("#trai-nghiem").inner_text()
        ck("bằng chứng B: hiện TÊN ca", "Chuyển và đổi chủ" in tMo)

        # Địa chỉ đầy đủ, mã luật, ISO timestamp và commit nằm trong `<details>`
        # "Xem chi tiết kỹ thuật" (mục 5: phần kiểm sâu). Phải MỞ mới đọc được —
        # `inner_text()` không trả nội dung của `<details>` đang đóng.
        await pg.locator("#trai-nghiem details summary").first.click()
        await pg.wait_for_timeout(250)
        tMo = await pg.locator("#trai-nghiem").inner_text()
        ck("bằng chứng B: mã luật", "SPL_SET_AUTHORITY__ACCOUNT_OWNER" in tMo)
        ck("bằng chứng B: địa chỉ ĐẦY ĐỦ", "CRZaSPkMcJsFrsbcQs8zVCsxGcTUXLYmmotm4fwepicz" in tMo)
        ck("bằng chứng B: commit nguồn", "dd7e776b0370" in tMo)
        ck("bằng chứng B: nói rõ 2 lượt độc lập", "hai lượt mô phỏng độc lập" in tMo.lower())
        ck("bằng chứng B: nói rõ không đủ replay", "không đủ để chạy lại engine" in tMo)

        # Ca A không có cảnh báo -> panel phải NÓI điều đó, không bịa dữ kiện.
        await pg.get_by_role("button", name="Xem dữ kiện của ca A").click()
        await pg.wait_for_timeout(300)
        tA2 = await pg.locator("#trai-nghiem").inner_text()
        ck("bằng chứng A: nói rõ không có mã cảnh báo", "không có mã cảnh báo nào" in tA2)
        ck(
            "bằng chứng A: KHÔNG bịa owner trước/sau",
            "CRZaSPkMcJsFrsbcQs8zVCsxGcTUXLYmmotm4fwepicz" not in tA2,
        )

        # ── C · Link và CTA ──────────────────────────────────────────────────
        print("\nC · Link và CTA")
        hrefs = await pg.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
        ck("không có href='#' rỗng", "#" not in hrefs, str([h for h in hrefs if h == "#"]))
        ck("không có link 'sắp ra mắt'", "sắp ra mắt" not in than.lower())

        noi_bo = [h for h in hrefs if h and h.startswith("/Custos-Solana")]
        ck("CTA dùng BASE_URL production", len(noi_bo) >= 3, f"{len(noi_bo)} link nội bộ")

        for ten, duong in [
            ("ví mẫu", "/Custos-Solana/"),
            ("Inspector", "/Custos-Solana/soi.html"),
            ("số liệu", "/Custos-Solana/so-lieu.html"),
        ]:
            ck(f"có link tới {ten}", duong in hrefs)

        # ── D · Đổi ngôn ngữ ─────────────────────────────────────────────────
        print("\nD · VI/EN")
        await pg.get_by_role("button", name="English").click()
        await pg.wait_for_timeout(300)
        tEN = await pg.locator("body").inner_text()
        ck("EN: h1 đã dịch", "Understand what" in tEN)
        ck("EN: A/B đã dịch", "Transfer and change owner" in tEN)
        ck("EN: FAQ đã dịch", "Is Custos a new wallet?" in tEN)
        ck("EN: giữ nguyên lực câu giới hạn", "does not guarantee that a transaction is safe" in tEN)
        ck("EN: KHÔNG nói 'fully secure'", "fully secure" not in tEN.lower())
        ck("EN: lang đã đổi", await pg.evaluate("() => document.documentElement.lang") == "en")
        ck("EN: title đã đổi", "Understand Solana" in await pg.title())
        ck("EN: URL mang ?lang=en", "lang=en" in pg.url)

        # Đổi ngôn ngữ KHÔNG reset A/B (mục 7.1).
        # Bảng hiện cả hai ca nên không còn "ca đang chọn"; kiểm bảng đã dịch.
        ck("EN: bảng A/B giữ đủ hai cột", "Transfer only" in tEN)

        await soi_axe(pg, "landing EN desktop")

        await pg.get_by_role("button", name="Tiếng Việt").click()
        await pg.wait_for_timeout(250)
        ck("quay lại VI", "Hiểu điều" in await pg.locator("h1").inner_text())
        await ctx.close()

        # ── E · Query lạ và storage bị chặn ──────────────────────────────────
        print("\nE · Locale query và storage")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(f"{TRANG}?lang=zz", wait_until="networkidle")
        ck("query sai ⇒ về VI", "Hiểu điều" in await pg.locator("h1").inner_text())
        await ctx.close()

        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()
        # Chặn localStorage TRƯỚC khi script chạy — mô phỏng chế độ riêng tư.
        await pg.add_init_script(
            "Object.defineProperty(window,'localStorage',{get(){throw new Error('bị chặn')}});"
        )
        bug2: list[str] = []
        pg.on("pageerror", lambda e: bug2.append(str(e)))
        await pg.goto(TRANG, wait_until="networkidle")
        await pg.wait_for_timeout(300)
        ck("storage bị chặn ⇒ trang vẫn dựng", len(await pg.locator("h1").all_inner_texts()) == 1)
        ck("storage bị chặn ⇒ 0 pageerror", len(bug2) == 0, str(bug2[:1])[:80])
        await ctx.close()

        # ── F · Responsive ───────────────────────────────────────────────────
        print("\nF · Responsive")
        for w, h, ten in [(320, 844, "mobile 320"), (390, 844, "mobile 390"), (360, 800, "mobile 360"), (768, 1024, "tablet"), (1440, 900, "laptop"), (1920, 1080, "rộng")]:
            ctx = await b.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            await pg.goto(TRANG, wait_until="networkidle")
            await pg.wait_for_timeout(300)
            tran = await pg.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            ck(f"{ten}: không tràn ngang", tran <= 0, f"{tran}px")
            await ctx.close()

        # Laptop 1440x900: hero phải thấy h1 + CTA + hàng quyền mà KHÔNG cuộn.
        ctx = await b.new_context(viewport={"width": 1440, "height": 900})
        pg = await ctx.new_page()
        await pg.goto(TRANG, wait_until="networkidle")
        await pg.wait_for_timeout(400)
        # `.lg-phieu__hang--nguy` — tên mới sau khi hero đổi sang phiếu phân tích.
        hop = await pg.locator(".lg-phieu__hang--nguy").bounding_box()
        ck("1440×900: hàng quyền nằm trong màn hình đầu", hop is not None and hop["y"] + hop["height"] <= 900,
           f"đáy ở {round(hop['y'] + hop['height']) if hop else '?'}px")

        # ── G · Keyboard và menu mobile ──────────────────────────────────────
        print("\nG · Keyboard")
        await pg.keyboard.press("Tab")
        dau = await pg.evaluate("() => document.activeElement?.textContent ?? ''")
        ck("Tab đầu tiên tới skip link", "Bỏ qua" in dau, dau[:40])

        # Nút chính cao >= 48px, target >= 44px (mục 12.1).
        hopNut = await pg.get_by_role("link", name="Mở demo Custos").first.bounding_box()
        ck("CTA chính cao >= 48px", hopNut is not None and hopNut["height"] >= 48,
           f"{round(hopNut['height']) if hopNut else '?'}px")
        await ctx.close()

        ctx = await b.new_context(viewport={"width": 390, "height": 844})
        pg = await ctx.new_page()
        await pg.goto(TRANG, wait_until="networkidle")
        await pg.wait_for_timeout(300)
        nutMenu = pg.get_by_role("button", name="Mở menu")
        # Nút giờ là ICON, nhưng tên accessible vẫn đầy đủ theo locale (UI-02).
        ck("mobile có nút menu có TÊN accessible", await nutMenu.count() == 1)
        ck("menu đóng ⇒ aria-expanded=false", await nutMenu.get_attribute("aria-expanded") == "false")
        await nutMenu.click()
        await pg.wait_for_timeout(200)
        ck("menu mở ⇒ aria-expanded=true",
           await pg.get_by_role("button", name="Đóng menu").get_attribute("aria-expanded") == "true")
        await pg.keyboard.press("Escape")
        await pg.wait_for_timeout(200)
        ck("Escape đóng menu", await pg.get_by_role("button", name="Mở menu").count() == 1)
        # Nút icon: `textContent` là tên accessible ẩn, không phải chữ nhìn thấy.
        ck(
            "Escape trả focus về nút mở",
            "Mở menu" in await pg.evaluate("() => document.activeElement?.textContent ?? ''"),
        )

        # UI-02: VI/EN chuyển vào menu ở mobile — phải còn dùng được.
        await pg.get_by_role("button", name="Mở menu").click()
        await pg.wait_for_timeout(250)
        ck("mobile: VI/EN nằm trong menu", await pg.get_by_role("button", name="English").count() == 1)
        await pg.get_by_role("button", name="English").last.click()
        await pg.wait_for_timeout(350)
        ck("mobile: đổi được sang EN từ menu", "Understand what" in await pg.locator("h1").inner_text())
        ck(
            "mobile EN: vẫn không tràn ngang",
            await pg.evaluate(
                "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
            )
            <= 1,
        )
        await ctx.close()

        # ── H · Hồi quy: ví, Inspector, số liệu ──────────────────────────────
        print("\nH · Hồi quy các trang cũ")
        for duong, ten, mong in [
            ("/", "ví mẫu", "Custos Wallet"),
            ("/soi.html", "Inspector", "Kiểm một giao dịch"),
            ("/so-lieu.html", "số liệu", "Custos"),
        ]:
            ctx = await b.new_context(viewport={"width": 1280, "height": 900})
            pg = await ctx.new_page()
            bug3: list[str] = []
            pg.on("pageerror", lambda e: bug3.append(str(e)))
            await pg.goto(f"{GOC}{duong}", wait_until="networkidle")
            await pg.wait_for_timeout(700)
            t = await pg.locator("body").inner_text()
            ck(f"{ten} vẫn dựng được", mong in t, f"{len(t.strip())} ký tự")
            ck(f"{ten}: 0 pageerror", len(bug3) == 0, str(bug3[:1])[:70])
            await ctx.close()

        await b.close()

    print("\n" + "=" * 62)
    print(f"{tong - len(loi)}/{tong} PASS" if not loi else f"FAIL: {len(loi)}/{tong}")
    for x in loi:
        print("  ✗ " + x)

    ra = pathlib.Path("data/a11y/landing.json")
    ra.parent.mkdir(parents=True, exist_ok=True)
    ra.write_text(
        json.dumps(
            {
                # `kiem` và `dauVet` theo đúng quy ước biên bản a11y của repo
                # (`bangChungA11y.test.ts`): một biên bản không đếm được số phép
                # kiểm, hoặc không gắn dấu vết giao diện, thì không nói được nó
                # thuộc bản dựng nào.
                "kiem": kiem,
                "soKiem": tong,
                "loi": loi,
                "viPham": vi_pham,
                "dauVet": dauvet.doc("giao-dien"),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf8",
    )
    print(f"→ {ra}")
    if loi:
        sys.exit(1)


asyncio.run(main())

# -*- coding: utf-8 -*-
"""
Regression cho ba lỗi layout đã tái hiện ở baseline `b6d66b1` (UIR-00).

Không khoá text CSS — khoá HÀNH VI ĐO ĐƯỢC:

  UI-02  header tràn ngang ở 320px      -> scrollWidth <= clientWidth + 1
  UI-03  chip absolute đè title/Devnet  -> không box nào giao nhau
  UI-04  list reset làm lệch gutter     -> mọi .lg-shell cùng mép nội dung

Chạy trên bản BUILD dưới prefix production; cổng mặc định 5198 theo mục 8 của
`DIEU-CHINH-UI-CUSTOS.md` (probe cũ ghim 5197 — không kiểm nhầm server khác).

    npm run build -w @custos-solana/demo-wallet
    npm run preview -w @custos-solana/demo-wallet -- --port 5198
    python scripts/kiem-trinh-duyet/soi-layout-landing.py
"""
import asyncio
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dauvet  # noqa: E402

from playwright.async_api import async_playwright  # noqa: E402

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

CONG = 5198
TRANG = f"http://localhost:{CONG}/Custos-Solana/gioi-thieu.html"

kiem: list[dict] = []
loi: list[str] = []
do: dict = {}


def ck(ten: str, dat: bool, ghi: str = "") -> None:
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({ghi})" if ghi else ""))
    kiem.append({"ten": ten, "dat": dat, "chiTiet": "đạt" if dat else ghi})
    if not dat:
        loi.append(f"{ten} — {ghi}")


async def hop(pg, sel: str) -> dict | None:
    """Box model của phần tử đầu tiên khớp selector."""
    return await pg.evaluate(
        """(s) => { const e = document.querySelector(s); if (!e) return null;
             const b = e.getBoundingClientRect(); const c = getComputedStyle(e);
             return { x: b.x, y: b.y, right: b.right, bottom: b.bottom,
                      w: b.width, h: b.height,
                      padL: c.paddingLeft, marL: c.marginLeft }; }""",
        sel,
    )


def giao_nhau(a: dict, b: dict) -> bool:
    """Hai hình chữ nhật có phần chung theo cả hai trục."""
    return a["x"] < b["right"] and b["x"] < a["right"] and a["y"] < b["bottom"] and b["y"] < a["bottom"]


async def main() -> None:
    async with async_playwright() as p:
        br = await p.chromium.launch()

        # ── UI-02 · tràn ngang ──────────────────────────────────────────────
        # Baseline đo được: 320px -> scrollWidth 358 (tràn 38px), nguồn là header.
        print("UI-02 · tràn ngang")
        do["tranNgang"] = {}
        for w, h in [(320, 844), (360, 800), (390, 844), (768, 1024), (1024, 768), (1440, 900)]:
            for lang in ("vi", "en"):
                ctx = await br.new_context(viewport={"width": w, "height": h})
                pg = await ctx.new_page()
                await pg.goto(f"{TRANG}?lang={lang}", wait_until="networkidle")
                await pg.wait_for_timeout(350)
                r = await pg.evaluate(
                    "() => ({ sw: document.documentElement.scrollWidth,"
                    "         cw: document.documentElement.clientWidth })"
                )
                tran = r["sw"] - r["cw"]
                do["tranNgang"][f"{w}-{lang}"] = tran
                ck(f"{w}px {lang.upper()}: không tràn ngang", tran <= 1, f"tràn {tran}px")

                # `overflow-x: hidden` ở html/body là cách GIẤU lỗi, mục 4 cấm.
                oflow = await pg.evaluate(
                    "() => [getComputedStyle(document.documentElement).overflowX,"
                    "       getComputedStyle(document.body).overflowX]"
                )
                ck(
                    f"{w}px {lang.upper()}: không che bằng overflow-x hidden",
                    "hidden" not in oflow,
                    str(oflow),
                )
                await ctx.close()

        # ── UI-03 · chồng lấn trong hero ────────────────────────────────────
        print("\nUI-03 · chồng lấn hero")
        for w, h, ten in [(390, 844, "390px"), (320, 844, "320px"), (1440, 900, "desktop")]:
            ctx = await br.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            await pg.goto(TRANG, wait_until="networkidle")
            await pg.wait_for_timeout(350)

            # Mọi phần tử absolute trong hero không được đè chữ có nghĩa.
            va = await pg.evaluate(
                """() => {
                  const hero = document.querySelector('.lg-hero, [data-hero]');
                  if (!hero) return { loi: 'không tìm thấy hero' };
                  const abs = [...hero.querySelectorAll('*')].filter(
                    e => getComputedStyle(e).position === 'absolute'
                       && e.getBoundingClientRect().width > 0
                       && !e.hasAttribute('aria-hidden'));
                  const chu = [...hero.querySelectorAll('h1,h2,h3,dt,dd,p,span,a,button')]
                    .filter(e => (e.textContent || '').trim().length > 1
                              && e.getBoundingClientRect().width > 0
                              && !e.closest('[aria-hidden="true"]'));
                  const va = [];
                  for (const a of abs) {
                    /*
                     * KHÔNG loại phần tử absolute chỉ vì nó CÓ chữ.
                     *
                     * Bản đầu của guard này lọc `chu.includes(a)` và bỏ sót đúng
                     * lỗi UI-03: `.lg-chip` là một `<span>` có chữ "Transfer",
                     * nên nó vừa nằm trong `abs` vừa nằm trong `chu` và bị loại.
                     * Đo tay ở 390px cho thấy chip 519,89–558,52 giao với title
                     * 552,27–577,02 — guard xanh trong khi lỗi có thật.
                     *
                     * Chỉ bỏ qua phần tử chứa chính khối chữ đang so.
                     */
                    if (a.querySelector('h1,h2,h3,dt,dd')) continue;
                    const ra = a.getBoundingClientRect();
                    for (const t of chu) {
                      if (a.contains(t) || t.contains(a)) continue;
                      const rt = t.getBoundingClientRect();
                      if (ra.x < rt.right && rt.x < ra.right && ra.y < rt.bottom && rt.y < ra.bottom) {
                        va.push({ abs: a.className || a.tagName,
                                  chu: (t.textContent || '').trim().slice(0, 28) });
                      }
                    }
                  }
                  return { va, soAbs: abs.length };
                }"""
            )
            ck(
                f"{ten}: không có phần tử absolute đè chữ trong hero",
                isinstance(va, dict) and not va.get("va"),
                str(va.get("va", va))[:130],
            )
            await ctx.close()

        # ── UI-04 · căn lề container ────────────────────────────────────────
        # Mọi `.lg-shell` phải cùng mép NỘI DUNG (x + padding-left).
        print("\nUI-04 · căn lề")
        for w, h, ten, toi_thieu in [(1440, 900, "desktop 1440", None), (390, 844, "mobile 390", 16)]:
            ctx = await br.new_context(viewport={"width": w, "height": h})
            pg = await ctx.new_page()
            await pg.goto(TRANG, wait_until="networkidle")
            await pg.wait_for_timeout(350)

            mep = await pg.evaluate(
                """() => [...document.querySelectorAll('.lg-shell')].map(e => {
                     const b = e.getBoundingClientRect();
                     const c = getComputedStyle(e);
                     return { ten: e.className.split(' ').slice(0, 2).join('.'),
                              mep: Math.round((b.x + parseFloat(c.paddingLeft)) * 10) / 10 };
                   })"""
            )
            do[f"mep-{w}"] = mep
            gia_tri = sorted({m["mep"] for m in mep})
            ck(
                f"{ten}: mọi .lg-shell cùng mép nội dung (±1px)",
                len(gia_tri) == 0 or (max(gia_tri) - min(gia_tri)) <= 1,
                f"{len(gia_tri)} mép khác nhau: {gia_tri[:5]}",
            )
            if toi_thieu is not None and gia_tri:
                ck(
                    f"{ten}: gutter >= {toi_thieu}px",
                    min(gia_tri) >= toi_thieu,
                    f"nhỏ nhất {min(gia_tri)}px",
                )
            await ctx.close()

        await br.close()

    print("\n" + "=" * 62)
    print(f"{len(kiem) - len(loi)}/{len(kiem)} PASS" if not loi else f"FAIL: {len(loi)}/{len(kiem)}")
    for x in loi:
        print("  ✗ " + x)

    ra = pathlib.Path("data/a11y/landing-layout.json")
    ra.parent.mkdir(parents=True, exist_ok=True)
    ra.write_text(
        json.dumps(
            {"kiem": kiem, "soKiem": len(kiem), "loi": loi, "do": do, "dauVet": dauvet.doc("giao-dien")},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf8",
    )
    print(f"→ {ra}")
    if loi:
        sys.exit(1)


asyncio.run(main())

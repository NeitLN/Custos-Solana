# -*- coding: utf-8 -*-
"""Bàn phím, phóng to, và nội dung dài — ba tiêu chí nghiệm thu còn lại của U06.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-ban-phim-va-phong-to.py

`soi-trinh-duyet.py` chạy axe, và axe KHÔNG kiểm ba thứ này. axe đọc cây DOM tĩnh;
nó không bấm Tab, không thu nhỏ khung, không nhét thêm chữ vào. Đó là lý do một
sản phẩm có thể đạt "0 vi phạm axe" mà vẫn không dùng được bằng bàn phím.

Ba nhóm:

  A · BÀN PHÍM   đi hết được bằng Tab, thấy được mình đang ở đâu, bấm được bằng
                 Enter và Space, và thứ tự phải đưa lựa chọn AN TOÀN lên trước.
  B · PHÓNG TO   reflow ở 320px (WCAG 1.4.10 AA) và ở 640px — tức khung 1280px
                 phóng 200%. Không tràn ngang, CTA vẫn còn đó.
  C · CHỮ DÀI    giải thích dài gấp mười vẫn không làm vỡ khung hay đẩy CTA đi.

## Một điều bài này ĐO ĐƯỢC nhưng KHÔNG gọi là hỏng

Typography của ví dùng px cố định (`text-[12.5px]`). Đặt `font-size` gốc lên 32px
thì chữ **không** to lên — đo được, không suy đoán.

Điều đó KHÔNG phải vi phạm WCAG 1.4.4. Tiêu chí đó nói chữ phải phóng được tới
200% "không cần công nghệ hỗ trợ", và phóng to của trình duyệt làm đúng việc đó
với cả đơn vị px — nhóm B ở dưới chứng minh reflow còn nguyên ở 640px. Cái mất là
người đặt cỡ chữ mặc định lớn trong Chrome sẽ không được hưởng, vì thiết lập đó
chỉ tác động lên đơn vị tương đối.

Nên bài này in ra dòng GHI NHẬN, không phải FAIL. Chuyển toàn bộ px sang rem là
việc riêng, có rủi ro hồi quy thị giác riêng, và không được lẫn vào U06.

Gọi nó là FAIL để rồi đi sửa vội cũng sai như gọi nó là PASS rồi im luôn.
"""
import asyncio
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
VI = "http://localhost:5188"
O_KET_QUA = "[aria-label='Kết quả kiểm tra giao dịch']"

kiem: list[dict] = []
ghi_nhan: list[str] = []


def ck(ten: str, dat: bool, chi_tiet: str = "") -> None:
    kiem.append({"ten": ten, "dat": dat, "chiTiet": chi_tiet})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({chi_tiet})" if chi_tiet else ""))


JS_FOCUS = """() => {
  const e = document.activeElement;
  if (!e || e === document.body) return null;
  const s = getComputedStyle(e);
  return {
    tag: e.tagName,
    chu: ((e.textContent || e.getAttribute("aria-label") || "").trim()).slice(0, 40),
    vienRong: parseFloat(s.outlineWidth) || 0,
    vienKieu: s.outlineStyle,
    bong: s.boxShadow,
  };
}"""


async def den_ket_qua(pg) -> None:
    """Bấm nhận quà rồi chờ thẻ kết quả. Đây là màn hình U06 nói tới."""
    await pg.goto(VI, wait_until="networkidle")
    await pg.wait_for_timeout(1000)
    await pg.locator("button:has-text('Nhận quà tặng')").first.click()
    await pg.wait_for_selector(O_KET_QUA, timeout=45000)
    await pg.wait_for_timeout(1200)


async def nhom_a(b) -> None:
    print("\nA · bàn phím")
    ctx = await b.new_context(viewport={"width": 375, "height": 812})
    pg = await ctx.new_page()
    await den_ket_qua(pg)

    # Đi bằng Tab và ghi lại đường đi. `daGap` chặn vòng lặp vô hạn nếu có bẫy focus.
    duong: list[dict] = []
    daGap: set[tuple[str, str]] = set()
    for _ in range(45):
        await pg.keyboard.press("Tab")
        r = await pg.evaluate(JS_FOCUS)
        if r is None:
            break
        k = (r["tag"], r["chu"])
        if k in daGap:
            break
        daGap.add(k)
        duong.append(r)

    ten = [d["chu"] for d in duong]
    ck("Tab đi được, không bị bẫy focus", 0 < len(duong) < 45, f"{len(duong)} chặng")

    # Bốn thao tác của thẻ kết quả phải nằm trên đường đi. Thiếu một cái nghĩa là
    # người dùng bàn phím không mở được mục đó, dù chuột thì bấm được.
    for can in ["Xem chi tiết", "Chi tiết kỹ thuật", "Chặn & huỷ giao dịch", "Vẫn ký"]:
        ck(f"Tab tới được: {can}", any(can in t for t in ten), " → ".join(ten)[:90])

    # Vòng focus phải THẤY ĐƯỢC. `outline: none` không kèm gì thay thế là kiểu hỏng
    # kinh điển: chuột dùng bình thường, bàn phím thì mù hoàn toàn.
    #
    # PHẢI ĐỌC `outline-style`, KHÔNG CHỈ `outline-width`.
    #
    # Bản đầu của bài này chỉ kiểm `outlineWidth >= 1`. Kiểm phủ định lộ ra là sai:
    # thêm `outline: none !important` vào CSS thì Chromium trả về `outline-style:
    # none` NHƯNG `outline-width` vẫn là `3px` — nó giữ bề rộng đã khai báo dù không
    # vẽ gì. Phép kiểm ấy xanh vĩnh viễn, kể cả khi vòng focus đã biến mất hoàn toàn.
    #
    # Một bài kiểm khả năng tiếp cận không bao giờ đỏ được thì tệ hơn là không có
    # bài nào: nó phát ra sự yên tâm mà nó không có cơ sở để phát.
    def thay_duoc(d: dict) -> bool:
        co_vien = d["vienKieu"] not in ("none", "hidden") and d["vienRong"] >= 1
        return co_vien or d["bong"] not in ("none", "")

    mu = [d["chu"] for d in duong if not thay_duoc(d)]
    ck("mọi chặng có vòng focus thấy được", not mu, str(mu))

    # Thứ tự KHÔNG trung tính. Với một sản phẩm chặn giao dịch, lựa chọn an toàn
    # phải tới trước — người bấm Tab-Enter theo phản xạ sẽ trúng "huỷ", không trúng
    # "vẫn ký". Đây là quyết định sản phẩm, nên nó xứng đáng có một bài kiểm.
    try:
        i_huy = next(i for i, t in enumerate(ten) if "Chặn & huỷ" in t)
        i_ky = next(i for i, t in enumerate(ten) if "Vẫn ký" in t)
        ck("lựa chọn AN TOÀN đứng trước trong thứ tự Tab", i_huy < i_ky, f"huỷ #{i_huy + 1} · ký #{i_ky + 1}")
    except StopIteration:
        ck("lựa chọn AN TOÀN đứng trước trong thứ tự Tab", False, "không thấy đủ hai nút")

    # Enter và Space đều phải mở được khối gập — `<button>` thật thì được cả hai,
    # một `<div onClick>` đội lốt thì chỉ được chuột.
    for phim in ["Enter", " "]:
        nut = pg.locator("button:has-text('Xem chi tiết'), button:has-text('Thu gọn')").first
        await nut.focus()
        truoc = await nut.get_attribute("aria-expanded")
        await pg.keyboard.press(phim)
        await pg.wait_for_timeout(250)
        sau = await pg.locator(
            "button:has-text('Xem chi tiết'), button:has-text('Thu gọn')"
        ).first.get_attribute("aria-expanded")
        ck(f"phím {phim.strip() or 'Space'} mở/đóng được mục chi tiết", truoc != sau, f"{truoc} → {sau}")

    await ctx.close()


async def nhom_b(b) -> None:
    print("\nB · phóng to và chữ lớn")
    # 320px là ngưỡng reflow của WCAG 1.4.10 AA. 640px là khung máy tính 1280px
    # phóng 200% — phóng to của trình duyệt thu nhỏ viewport CSS đúng theo tỉ lệ đó.
    for ten, w in [("320px · reflow AA", 320), ("640px · tương đương zoom 200%", 640)]:
        ctx = await b.new_context(viewport={"width": w, "height": 812})
        pg = await ctx.new_page()
        await den_ket_qua(pg)
        tran = await pg.evaluate(
            "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
        )
        ck(f"{ten} · không tràn ngang", tran <= 0, f"tràn {tran}px")
        thay = await pg.locator("button:has-text('Chặn & huỷ giao dịch')").first.is_visible()
        ck(f"{ten} · CTA chặn vẫn hiện", thay)
        if w == 640:
            truoc = await pg.evaluate(
                "() => getComputedStyle(document.querySelector('button.lien-ket')).fontSize"
            )
            await pg.evaluate("document.documentElement.style.fontSize = '32px'")
            await pg.wait_for_timeout(250)
            sau = await pg.evaluate(
                "() => getComputedStyle(document.querySelector('button.lien-ket')).fontSize"
            )
            if truoc == sau:
                ghi_nhan.append(
                    f"chữ dùng px cố định: font-size gốc 16px→32px nhưng chữ giữ nguyên {sau}. "
                    "Phóng to trình duyệt vẫn hoạt động (xem hai ca reflow ở trên), nên đây "
                    "KHÔNG phải vi phạm 1.4.4; cái mất là thiết lập cỡ chữ mặc định của "
                    "trình duyệt không có tác dụng. Chuyển px→rem là việc riêng."
                )
                print(f"  GHI NHẬN  chữ không đáp ứng font-size gốc ({truoc} → {sau})")
        await ctx.close()


async def nhom_c(b) -> None:
    print("\nC · nội dung dài")
    ctx = await b.new_context(viewport={"width": 375, "height": 812})
    pg = await ctx.new_page()
    await den_ket_qua(pg)
    await pg.locator("button:has-text('Xem chi tiết')").first.click()
    await pg.wait_for_timeout(300)

    # Nhét chữ thẳng vào DOM chứ không thêm một file mock thứ tư: đây là bài kiểm
    # KHUNG, không phải kiểm logic. Thêm mock vào sản phẩm chỉ để đo bố cục là mở
    # thêm một đường cho mock lọt vào buổi demo.
    dai = ("Giao dịch này đổi quyền kiểm soát tài khoản token của bạn sang một địa chỉ khác. " * 24)
    xong = await pg.evaluate(
        """(chu) => {
            const o = document.querySelector("[aria-label='Kết quả kiểm tra giao dịch']");
            const ps = [...o.querySelectorAll("p")].filter((p) => p.textContent.length > 60);
            if (!ps.length) return false;
            ps[ps.length - 1].textContent = chu;
            return true;
        }""",
        dai,
    )
    ck("nhét được chữ dài vào thẻ kết quả", xong)
    await pg.wait_for_timeout(300)
    tran = await pg.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    ck("chữ dài gấp mười không làm tràn ngang", tran <= 0, f"tràn {tran}px")

    # CTA phải còn TRONG luồng, không bị đẩy ra ngoài hay chồng lên nhau.
    hop = await pg.evaluate(
        """() => {
            const n = [...document.querySelectorAll("button.nut")];
            return n.map((e) => { const r = e.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height)}; });
        }"""
    )
    ck("CTA giữ nguyên kích thước sau khi chữ dài ra", all(h["h"] >= 44 and h["w"] > 100 for h in hop), str(hop))
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
    (d / "ban-phim-phong-to.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "soKiem": len(kiem),
                "soDat": sum(1 for k in kiem if k["dat"]),
                "ghiNhan": ghi_nhan,
                "kiem": kiem,
                "dat": all(k["dat"] for k in kiem),
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("→ data/a11y/ban-phim-phong-to.json")


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        await nhom_a(b)
        await nhom_b(b)
        await nhom_c(b)
        await b.close()

    hong = [k["ten"] for k in kiem if not k["dat"]]
    print()
    for g in ghi_nhan:
        print(f"GHI NHẬN · {g}\n")
    ghi_bang_chung()
    if hong:
        print(f"\n=== {len(hong)} HỎNG ===")
        for h in hong:
            print(f"    {h}")
        sys.exit(1)
    print(f"\n=== TẤT CẢ {len(kiem)} PASS ===")


asyncio.run(main())

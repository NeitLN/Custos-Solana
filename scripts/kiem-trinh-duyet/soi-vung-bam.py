# -*- coding: utf-8 -*-
"""Vùng bấm trên thiết bị cảm ứng phải đủ lớn.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-vung-bam.py

Hồi quy cho F08. Đo được: "Xem chi tiết" và "Chi tiết kỹ thuật" cao khoảng 19 px;
link "Số liệu" khoảng 42x34 px. Các CTA chính đã đạt 44 px.

NGƯỠNG Ở ĐÂY LÀ KHUYẾN NGHỊ UX, KHÔNG PHẢI NGƯỠNG WCAG.

WCAG 2.2 AA dùng 24 px kèm ngoại lệ về khoảng cách và mục inline; gọi mọi thứ dưới
44 px là "vi phạm WCAG" là nói sai về tiêu chuẩn. Nên bài này chia hai mức:

    < 24 px   VI PHẠM   dưới cả ngưỡng AA
    < 44 px   CẦN SỬA   đạt AA nhưng khó bấm bằng ngón tay

Chỉ đo trong ngữ cảnh CẢM ỨNG (`has_touch`), vì đó là nơi ngưỡng có nghĩa. Chuột
không cần 44 px.

Không tính các ô ẩn bằng CSS (checkbox 1x1 px) là lỗi: nhãn và công tắc của chúng có
vùng bấm riêng, và đó mới là thứ người dùng chạm.
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
KHUYEN_NGHI = 44
WCAG_AA = 24


def ghi_bang_chung(muc: list[dict], viPham: list[dict], canSua: list[dict]) -> None:
    """Ghi ra `data/a11y/vung-bam.json`.

    Cùng lý do như bài axe: một phép đo chỉ in ra màn hình rồi thôi thì lần sau lại
    phải tin lời kể. `sourceCommit` đi kèm để biết số này thuộc bản giao diện nào —
    đo trên bản cũ rồi khoe cho bản mới là so hai thứ khác nhau.
    """
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None

    d = GOC / "data" / "a11y"
    d.mkdir(parents=True, exist_ok=True)
    (d / "vung-bam.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "khung": {"rong": 375, "cao": 812, "camUng": True},
                "nguong": {"khuyenNghi": KHUYEN_NGHI, "wcag22aa": WCAG_AA},
                "soMuc": len(muc),
                "soViPham": len(viPham),
                "soCanSua": len(canSua),
                "muc": muc,
                "dat": not viPham and not canSua,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("→ data/a11y/vung-bam.json")


async def cho_animation(pg) -> None:
    """Chờ mọi animation HỮU HẠN chạy xong trước khi đo.

    Đo vùng bấm giữa chừng animation là đo một khung hình, không phải đo sản phẩm.
    `SECTION.result-card` chạy `result-in` với `scale(0.994448)`, nên một nút cao
    đúng 44px đo ra 43,76 nếu bắt đúng lúc.

    Bài này trước đây chờ mù `wait_for_timeout(1200)`. Nó ĐÚNG, nhưng đúng do may —
    animation ngắn hơn 1200ms. Đổi thành chờ tường minh thì không phụ thuộc vào may
    nữa, và không tốn 1,2 giây khi animation đã xong sớm.

    Bỏ qua animation lặp vô hạn (`scope-marquee`, `status-pulse`, `brand-float`,
    `network-ping`) — chờ chúng là treo vĩnh viễn. Chúng không đổi kích thước nút.
    """
    await pg.evaluate(
        """async () => {
            const huuHan = document.getAnimations().filter((a) => {
                const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : null;
                return !t || t.iterations !== Infinity;
            });
            await Promise.all(huuHan.map((a) => a.finished.catch(() => {})));
        }""",
    )


async def do_trang(pg, ten: str) -> list[dict]:
    await cho_animation(pg)
    return await pg.evaluate(
        """(nhan) => {
            const ra = [];
            for (const el of document.querySelectorAll("button, a[href], [role=button]")) {
                const s = getComputedStyle(el);
                if (s.display === "none" || s.visibility === "hidden") continue;
                const r = el.getBoundingClientRect();
                // Ô ẩn bằng CSS (checkbox 1x1) không phải thứ người dùng chạm.
                if (r.width <= 2 && r.height <= 2) continue;
                if (r.width === 0 || r.height === 0) continue;
                /*
                 * LÀM TRÒN LÊN LÀ TỰ XOÁ VI PHẠM.
                 *
                 * `Math.round` biến 43,76 thành 44 — đúng con số ngưỡng — nên một nút
                 * thiếu 0,24px đi lọt và bài này báo "26/26 đạt". `soi-boi-canh-x02.py`
                 * đo cùng nút đó, không làm tròn, và thấy 43,8. Hai bài cùng đo một
                 * sản phẩm ra hai kết luận; bài làm tròn là bài sai.
                 *
                 * `Math.floor` để số lẻ luôn nghiêng về phía BÁO, không về phía bỏ qua:
                 * một phép đo an toàn phải sai theo hướng thận trọng. Giữ thêm số thật
                 * ở `caoThat` để biên bản nói được nút thiếu bao nhiêu.
                 */
                ra.push({
                    trang: nhan,
                    chu: (el.textContent || el.getAttribute("aria-label") || "?").trim().slice(0, 34),
                    rong: Math.floor(r.width),
                    cao: Math.floor(r.height),
                    caoThat: Math.round(r.height * 100) / 100,
                });
            }
            return ra;
        }""",
        ten,
    )


async def main() -> None:
    muc: list[dict] = []
    async with async_playwright() as p:
        b = await p.chromium.launch()
        # `has_touch` bật `pointer: coarse` — ngữ cảnh duy nhất mà ngưỡng này có nghĩa.
        ctx = await b.new_context(viewport={"width": 375, "height": 812}, has_touch=True, is_mobile=True)

        pg = await ctx.new_page()
        await pg.goto(VI, wait_until="networkidle")
        await pg.wait_for_timeout(1200)
        muc += await do_trang(pg, "ví")

        nut = pg.locator("button:has-text('Nhận quà tặng')").first
        if await nut.count() > 0:
            await nut.click()
            try:
                await pg.wait_for_selector("[aria-label='Kết quả kiểm tra giao dịch']", timeout=45000)
                await pg.wait_for_timeout(1200)
                # Mở cả hai khối gập để đo nút bên trong.
                for chu in ["Xem chi tiết", "Chi tiết kỹ thuật"]:
                    n = pg.locator(f"button:has-text('{chu}')").first
                    if await n.count() > 0:
                        await n.click()
                        await pg.wait_for_timeout(300)
                muc += await do_trang(pg, "ví · có kết quả")
            except Exception as e:
                print(f"  (bỏ qua phần kết quả: {str(e)[:60]})")

        await pg.goto(f"{VI}/phong-van.html", wait_until="networkidle")
        await pg.wait_for_timeout(1500)
        muc += await do_trang(pg, "phỏng vấn")
        await ctx.close()
        await b.close()

    viPham = [m for m in muc if min(m["rong"], m["cao"]) < WCAG_AA]
    canSua = [m for m in muc if WCAG_AA <= min(m["rong"], m["cao"]) < KHUYEN_NGHI]

    print(f"Đã đo {len(muc)} mục bấm ở 375 px, ngữ cảnh cảm ứng{chr(10)}")
    for ten, ds in [("VI PHẠM (< 24 px)", viPham), (f"CẦN SỬA (< {KHUYEN_NGHI} px)", canSua)]:
        print(f"  {ten}: {len(ds)}")
        for m in ds:
            print(f"    {m['rong']}x{m['cao']}  [{m['trang']}] {m['chu']}")

    # Ghi TRƯỚC khi thoát mã 1: lần chạy hỏng mới là lần cần bằng chứng nhất.
    ghi_bang_chung(muc, viPham, canSua)

    if viPham or canSua:
        print(f"{chr(10)}=== {len(viPham) + len(canSua)} mục chưa đạt {KHUYEN_NGHI} px ===")
        sys.exit(1)
    print(f"{chr(10)}=== TẤT CẢ ĐẠT {KHUYEN_NGHI} px ===")


asyncio.run(main())

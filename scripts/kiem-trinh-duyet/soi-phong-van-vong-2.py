# -*- coding: utf-8 -*-
"""Công cụ phỏng vấn khớp giao thức vòng 2 — I03.

    npm run vi
    python scripts/kiem-trinh-duyet/soi-phong-van-vong-2.py

Giao thức vòng 2 (`docs/GIAO-THUC-PHONG-VAN-VONG-2.md`) hỏi thêm hai câu, ghi thêm
kênh, và tách vế "vì sao" ra khỏi quyết định. Bài này kiểm công cụ có nhận được
chúng không — và quan trọng hơn, có làm hỏng hai mươi bản ghi vòng 1 không.

## Ca đáng giá nhất ở đây là ca KHÔNG điền gì

Vòng 1 đã chạy xong mà không có bốn trường mới. Nếu nút Lưu đòi chúng thì hai mươi
bản ghi thật thành "không hợp lệ", và người phỏng vấn sẽ điền bừa cho qua. Một ô điền
bừa tệ hơn một ô trống: ô trống thì bộ đếm biết mà loại khỏi mẫu số, còn ô bừa thì
được đếm như một câu trả lời thật.

## Và ca nút KHÔNG-LÀM-GÌ

`onHuy={() => {}}`: người tham gia bấm "Chặn & huỷ giao dịch" rồi không thấy gì. Họ
hoặc tưởng giao dịch đã bị chặn thật, hoặc tưởng màn hình hỏng — và câu trả lời cho
câu hỏi ngay bên dưới nhiễm theo. Bài này đòi một lời xác nhận nói rõ **không có giao
dịch nào được gửi**.
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
TRANG = "http://localhost:5188/phong-van.html"
KHOA = "custos.phong-van"
# KHÔNG dùng `[aria-label="Kết quả kiểm tra giao dịch"]`: nhãn đó nằm ở `App.tsx`
# của ví, không ở `CanhBao`, nên trang phỏng vấn không bao giờ có nó. Chờ nút của
# chính thẻ cảnh báo — thứ trang này thật sự dựng ra.
O_KET_QUA = "button:has-text('Chặn & huỷ giao dịch')" 

kiem: list[dict] = []


def ck(ten: str, dat: bool, chi_tiet: str = "") -> None:
    kiem.append({"ten": ten, "dat": dat, "chiTiet": chi_tiet})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({chi_tiet})" if chi_tiet else ""))


async def moTrang(ctx):
    pg = await ctx.new_page()
    # Kho SẠCH mỗi lượt. Bài kiểm đọc `localStorage` để nghiệm thu, nên dữ liệu sót
    # lại từ lượt trước sẽ làm nó đọc nhầm bản ghi của chính nó.
    await pg.add_init_script(f"() => localStorage.removeItem({KHOA!r})")
    await pg.goto(TRANG, wait_until="networkidle")
    await pg.wait_for_selector(O_KET_QUA, timeout=60000)
    await pg.wait_for_timeout(600)
    return pg


async def nhapNguyenVan(pg, chu: str) -> None:
    await pg.fill("#nguyen-van", chu)
    # Nút chấm chỉ mở sau khi đã ghi nguyên văn — chốt của chính giao thức.
    n = pg.locator("button:has-text('Đã chép xong')").first
    if await n.count() > 0:
        await n.click()
        await pg.wait_for_timeout(250)


async def chonNhan(pg, chu: str) -> None:
    """Bấm một nút chấm theo nhãn.

    `has-text` KHÔNG phân biệt hoa thường, nên `has-text("HUỶ")` bắt trúng cả nút
    "Chặn & huỷ giao dịch" của thẻ cảnh báo — bài kiểm bấm nhầm nút của người tham
    gia rồi tưởng người phỏng vấn chưa chấm. Mất một lượt chạy mới thấy.
    """
    # `.first`: khối vòng 1 đứng TRƯỚC trong DOM, khối vòng 2 nằm trong `<details>`
    # ngay sau nó. Nhãn hai bên đều mở đầu bằng "ĐÚNG —"/"SAI —" nên phải phân biệt
    # bằng vị trí, và `chonNhanVong2` bên dưới thu hẹp riêng vào `<details>`.
    await pg.locator(f"button:has-text('{chu}')").first.click()
    await pg.wait_for_timeout(120)


async def chonNhanVong2(pg, chu: str) -> None:
    """Nút trong khối vòng 2 — thu hẹp vào `<details>` để không đụng nhãn vòng 1."""
    await pg.locator(f"details button:has-text('{chu}')").first.click()
    await pg.wait_for_timeout(120)


async def chonDungNhan(pg, chu: str) -> None:
    """Khớp CHÍNH XÁC cả nhãn — dùng cho nhãn ngắn dễ đụng nhau như "HUỶ"."""
    await pg.locator(f'button:text-is("{chu}")').first.click()
    await pg.wait_for_timeout(120)


async def docKho(pg) -> list:
    tho = await pg.evaluate(f"() => localStorage.getItem({KHOA!r})")
    return json.loads(tho) if tho else []


async def nhomNutKhongLamGi(ctx) -> None:
    print("\nA · nút trên thẻ cảnh báo không còn là no-op")
    pg = await moTrang(ctx)

    truoc = await pg.locator("text=Không có giao dịch nào được gửi").count()
    ck("trước khi bấm: KHÔNG hiện lời xác nhận", truoc == 0)

    nut = pg.locator("button:has-text('Chặn & huỷ giao dịch')").first
    ck("thẻ cảnh báo có nút huỷ cho người tham gia bấm", await nut.count() > 0)
    if await nut.count() > 0:
        await nut.click()
        await pg.wait_for_timeout(400)
        hien = await pg.locator("text=Không có giao dịch nào được gửi").count()
        ck("sau khi bấm: nói rõ KHÔNG có giao dịch nào được gửi", hien > 0)
        # `role=status` để trình đọc màn hình đọc ngay, không phải người dùng đi tìm.
        vaiTro = await pg.locator("[role=status]:has-text('Đã ghi nhận')").count()
        ck("lời xác nhận có `role=status`", vaiTro > 0)
    await pg.close()


async def nhomKhongDienGiHet(ctx) -> None:
    print("\nB · lưu được khi KHÔNG điền trường vòng 2 nào")
    pg = await moTrang(ctx)
    await nhapNguyenVan(pg, "Nó lấy mất token của tôi")
    await chonNhan(pg, "ĐÚNG —")
    await chonDungNhan(pg, "HUỶ")

    luu = pg.locator("button:has-text('Lưu người này')").first
    ck("nút Lưu KHÔNG bị khoá khi bỏ trống trường vòng 2", not await luu.is_disabled())
    await luu.click()
    await pg.wait_for_timeout(400)

    ban = await docKho(pg)
    ck("ghi được đúng 1 bản", len(ban) == 1, str(len(ban)))
    if ban:
        b = ban[0]
        # Vắng phải là VẮNG, không phải một giá trị mặc định.
        thua = [k for k in ("hieuCoverage", "docNhamPhi", "lyDoQuyetDinh") if k in b]
        ck("trường không hỏi thì VẮNG hẳn, không điền mặc định", not thua, str(thua))
    await pg.close()


async def nhomDienDu(ctx) -> None:
    print("\nC · điền đủ trường vòng 2 thì ghi đúng nhãn")
    pg = await moTrang(ctx)

    # Người tham gia bấm nút trước — đúng trình tự thật của buổi phỏng vấn.
    nut = pg.locator("button:has-text('Chặn & huỷ giao dịch')").first
    if await nut.count() > 0:
        await nut.click()
        await pg.wait_for_timeout(300)

    await nhapNguyenVan(pg, "Chắc là mất phí thôi")
    await chonNhan(pg, "SAI —")
    await chonDungNhan(pg, "VẪN KÝ")

    mo = pg.locator("summary:has-text('Vòng 2')").first
    ck("khối vòng 2 có mặt", await mo.count() > 0)
    if await mo.count() > 0:
        ck("khối vòng 2 GẬP SẴN — không chen vào luồng vòng 1",
           not await pg.locator("details:has(summary:has-text('Vòng 2'))").first.get_attribute("open"))
        await mo.click()
        await pg.wait_for_timeout(200)
        await chonNhanVong2(pg, "SAI — hiểu thành điểm an toàn")
        await chonNhanVong2(pg, "CÓ — nói phí là khoản mất")
        await chonNhanVong2(pg, "Gọi video")
        await pg.fill("#ly-do-qd", "Thấy phí có mấy đồng nên nghĩ mất ít")

    await pg.locator("button:has-text('Lưu người này')").first.click()
    await pg.wait_for_timeout(400)

    ban = await docKho(pg)
    if not ban:
        ck("ghi được bản ghi vòng 2", False, "kho rỗng")
        await pg.close()
        return
    b = ban[-1]
    for truong, mong in [
        ("hieuCoverage", "sai"),
        ("docNhamPhi", "co"),
        ("kenh", "video"),
        ("bamThat", "huy"),
    ]:
        ck(f"ghi đúng `{truong}` = {mong}", b.get(truong) == mong, str(b.get(truong)))
    ck("ghi `lyDoQuyetDinh` tách khỏi `ghiChu`", bool(b.get("lyDoQuyetDinh")), str(b.get("lyDoQuyetDinh"))[:40])

    # LỆCH GIỮA LỜI NÓI VÀ TAY: chấm "VẪN KÝ" nhưng tay bấm "huỷ". Đây là quan sát
    # đáng giá nhất mà vòng 1 không có, và nó chỉ tồn tại khi hai trường TÁCH nhau.
    ck("`quyetDinh` và `bamThat` là hai trường tách biệt",
       b.get("quyetDinh") == "ky" and b.get("bamThat") == "huy",
       f"{b.get('quyetDinh')} / {b.get('bamThat')}")
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
    (d / "phong-van-vong-2.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
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
    print("→ data/a11y/phong-van-vong-2.json")


async def main() -> None:
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 1280, "height": 1000})
        await nhomNutKhongLamGi(ctx)
        await nhomKhongDienGiHet(ctx)
        await nhomDienDu(ctx)
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

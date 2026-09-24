# -*- coding: utf-8 -*-
"""
Không hồi quy sau bản sửa hiện trường sống (25/09): ví trực tiếp và màn phỏng vấn.

Bốn ca, mỗi ca một kỳ vọng đo được — không phải "thấy chữ Nguy hiểm là đủ":
  · ví · Tấn công đầy đủ        → Nguy hiểm, mã đổi chủ, số dư giảm KHỚP một nửa số dư trước
  · ví · Cấp quyền vừa đủ       → Bình thường (ca đối chứng: engine phải im)
  · ví · Không rõ bảo vệ ai     → Cần xem kỹ, mã NGUOI_DUNG_KHONG_RO, KHÔNG có MO_PHONG_HONG
  · phỏng vấn                   → Nguy hiểm, mã đổi chủ (trước sửa: "Chưa đọc hiểu hết · 0/3")

Chạy: python scripts/kiem-trinh-duyet/soi-khong-hoi-quy-25-09.py [thu_muc_ra]   (cần `npm run vi`)
KHÔNG bấm nút Ký.
"""
import json, re, sys, io, datetime
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
VI = "http://localhost:5188/"


def so_vn(t):
    return float(t.replace(".", "").replace(",", "."))


def doc_the(pg):
    pg.wait_for_selector(".result-card", timeout=60000)
    pg.wait_for_timeout(3000)
    nut = pg.locator(".result-card button", has_text="Chi tiết kỹ thuật")
    if nut.count():
        nut.first.click(); pg.wait_for_timeout(600)
    return pg.locator(".result-card").first.inner_text()


def bam_vi(b, nhan):
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    gui = []
    ctx.on("request", lambda r: gui.append(1) if "sendTransaction" in (r.post_data or "") else None)
    pg = ctx.new_page()
    loi = []
    pg.on("pageerror", lambda e: loi.append(str(e)[:120]))
    pg.goto(VI, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(2500)
    pg.locator(".action-card", has_text=nhan).first.click()
    t = doc_the(pg)
    ctx.close()
    return t, loi, not gui


ket = {"luc": datetime.datetime.now().isoformat(timespec="seconds"), "ca": []}
with sync_playwright() as p:
    b = p.chromium.launch()
    ket["chromium"] = b.version

    t, loi, sach = bam_vi(b, "Tấn công đầy đủ")
    m = re.search(r"Số dư[^\n]*\n?[^\n]*?([\d.]+,\d+)\s*→\s*([\d.]+,\d+)", t)
    khop = bool(m) and abs(so_vn(m.group(2)) - so_vn(m.group(1)) / 2) < 1e-6
    ket["ca"].append({"ca": "vi · tấn công đầy đủ", "so_du": m.group(0).split("\n")[-1] if m else None,
                      "dat": "Nguy hiểm" in t and "SPL_SET_AUTHORITY__ACCOUNT_OWNER" in t and khop and sach and not loi})

    t, loi, sach = bam_vi(b, "vừa đủ")
    ket["ca"].append({"ca": "vi · cấp quyền vừa đủ (đối chứng)",
                      "dat": "Bình thường" in t and "SPL_APPROVE_DELEGATE_LON" not in t and sach and not loi})

    t, loi, sach = bam_vi(b, "Không rõ đang bảo vệ ai")
    ket["ca"].append({"ca": "vi · không rõ bảo vệ ai",
                      "co_ma_14": "NGUOI_DUNG_KHONG_RO" in t, "co_mo_phong_hong": "MO_PHONG_HONG" in t,
                      "dat": "Cần xem kỹ" in t and "NGUOI_DUNG_KHONG_RO" in t and "MO_PHONG_HONG" not in t
                      and sach and not loi})

    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    pg = ctx.new_page()
    pg.goto(VI + "phong-van.html", wait_until="networkidle", timeout=60000)
    t = doc_the(pg)
    ket["ca"].append({"ca": "phỏng vấn", "doc_hieu": re.search(r"Đã đọc hiểu[^\n]*\n?[^\n]*", t).group(0) if "Đã đọc hiểu" in t else None,
                      "dat": "Nguy hiểm" in t and "SPL_SET_AUTHORITY__ACCOUNT_OWNER" in t})
    ctx.close()
    b.close()

for c in ket["ca"]:
    print(("PASS  " if c["dat"] else "FAIL  ") + json.dumps(c, ensure_ascii=False))
ket["dat"] = all(c["dat"] for c in ket["ca"])
json.dump(ket, open(f"{OUT}/khong-hoi-quy.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
sys.exit(0 if ket["dat"] else 1)

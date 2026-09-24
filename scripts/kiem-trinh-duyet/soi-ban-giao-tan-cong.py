# -*- coding: utf-8 -*-
"""
CỔNG DEMO: trang tấn công → ví, kiểm QUAN HỆ giao dịch–bảng chênh lệch–verdict.

Viết cho P0 rà soát 25/09. Lỗi cũ: trang tấn công chuyển 500 000 000 từ tài khoản chỉ
còn 490 000 000, mô phỏng hỏng, ví hiện "Chưa đọc hiểu hết · 0/3". Probe cũ
(`soi-trinh-duyet.py`) lại đòi cố định "500 → 0" — tức nó sẽ đỏ khi mọi thứ ĐÚNG và
xanh chỉ khi hiện trường vừa dựng lại.

Probe này KHÔNG cố định số. Với mỗi lượt nó:
  1. bấm "Nhận" trên trang tấn công, bắt URL bàn giao sang ví;
  2. GIẢI MÃ giao dịch trong URL, lấy lượng Transfer thật và kiểm có SetAuthority;
  3. đọc thẻ kết quả của ví và đòi:
       · mức "Nguy hiểm", mã SPL_SET_AUTHORITY__ACCOUNT_OWNER;
       · dòng số dư: trước − sau == lượng Transfer của CHÍNH giao dịch đó;
       · dòng chủ sở hữu: "Bạn → <địa chỉ khác>";
  4. không có `sendTransaction` nào rời trình duyệt.

Hai ca lỗi chạy bằng chặn mạng (không đụng Devnet):
  · hiện trường đã đổi chủ ⇒ trang tấn công KHÔNG mở ví, hiện thông điệp riêng;
  · RPC không trả lời ⇒ thông điệp mạng, không phải thông điệp hiện trường.

Chạy:  python scripts/kiem-trinh-duyet/soi-ban-giao-tan-cong.py [thu_muc_ra]
Cần hai server dev: `npm run vi` (5188) và `npm run tan-cong` (5189).
KHÔNG bấm nút Ký. Ví dev có khoá demo; probe này chỉ đọc.
"""
import base64, json, re, sys, io, datetime, urllib.parse, tempfile
from playwright.sync_api import sync_playwright

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

TAN_CONG = "http://localhost:5189/"
# Mặc định ghi vào thư mục TẠM, không phải thư mục đang đứng: chạy từ gốc repo từng để
# lại một `ban-giao-tan-cong.json` lạc ở gốc. Muốn lưu bằng chứng thì truyền thư mục.
OUT = sys.argv[1] if len(sys.argv) > 1 else tempfile.gettempdir()
KHUNG = [("desktop", 1440, 900), ("mobile", 375, 812)]
SO_LUOT = 2
MA_DOI_CHU = "SPL_SET_AUTHORITY__ACCOUNT_OWNER"


# ── Giải mã VersionedTransaction đủ để lấy Transfer/SetAuthority ────────────
def shortvec(b, i):
    n = s = 0
    while True:
        x = b[i]; i += 1
        n |= (x & 0x7F) << s; s += 7
        if not x & 0x80:
            return n, i


def giai_ma(b64: str):
    b = base64.b64decode(b64)
    nsig, i = shortvec(b, 0)
    i += 64 * nsig
    if b[i] & 0x80:  # v0
        i += 1
    i += 3  # header
    nkey, i = shortvec(b, i)
    i += 32 * nkey + 32  # keys + blockhash
    nix, i = shortvec(b, i)
    transfer, co_set_auth = 0, False
    for _ in range(nix):
        i += 1  # programIdIndex
        nacc, i = shortvec(b, i); i += nacc
        dlen, i = shortvec(b, i)
        d = b[i:i + dlen]; i += dlen
        if dlen == 9 and d[0] == 3:
            transfer += int.from_bytes(d[1:9], "little")
        if dlen >= 2 and d[0] == 6 and d[1] == 2:
            co_set_auth = True
    return transfer, co_set_auth


def so_vn(t: str) -> float:
    """'490,0' → 490.0 ; '1.010,0' → 1010.0"""
    return float(t.replace(".", "").replace(",", "."))


def doc_the(pg):
    """Mở chi tiết kỹ thuật và trả toàn bộ chữ trong thẻ kết quả."""
    for nhan in ("Chi tiết kỹ thuật",):
        nut = pg.locator("button", has_text=nhan)
        if nut.count():
            nut.first.click(); pg.wait_for_timeout(600)
    return pg.locator(".result-card").first.inner_text()


def mot_luot(ctx, ten: str, luot: int, decimals: int):
    kq = {"khung": ten, "luot": luot, "loi": []}
    gui = []
    ctx.on("request", lambda r: gui.append(r.url) if r.method == "POST"
           and "sendTransaction" in (r.post_data or "") else None)

    pg = ctx.new_page()
    pg.on("pageerror", lambda e: kq["loi"].append(str(e)[:150]))
    pg.goto(TAN_CONG, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(4000)  # để lượt lấy sẵn (blockhash + hiện trường) chạy xong
    with ctx.expect_page(timeout=30000) as moi:
        pg.locator("button", has_text="Nhận").first.click()
    vi = moi.value
    vi.on("pageerror", lambda e: kq["loi"].append("vi: " + str(e)[:150]))
    url = vi.url
    frag = urllib.parse.parse_qs(url.split("#", 1)[1])
    transfer, co_set = giai_ma(frag["tx"][0])
    kq["transfer_tho"] = transfer
    kq["tx_co_set_authority"] = co_set

    vi.wait_for_selector(".result-card", timeout=60000)
    vi.wait_for_timeout(3000)
    t = doc_the(vi)
    kq["verdict_nguy_hiem"] = "Nguy hiểm" in t
    kq["co_ma_doi_chu"] = MA_DOI_CHU in t
    m = re.search(r"Số dư[^\n]*\n?[^\n]*?([\d.]+,\d+)\s*→\s*([\d.]+,\d+)", t)
    if m:
        truoc, sau = so_vn(m.group(1)), so_vn(m.group(2))
        kq["so_du"] = f"{m.group(1)} → {m.group(2)}"
        kq["chenh_khop_transfer"] = abs((truoc - sau) - transfer / 10 ** decimals) < 1e-6
    else:
        kq["so_du"] = None
        kq["chenh_khop_transfer"] = False
    kq["doi_chu_hien"] = bool(re.search(r"Chủ sở hữu[^\n]*\n?[^\n]*Bạn\s*→\s*\S+", t))
    kq["khong_gui_giao_dich"] = not gui
    kq["dat"] = all([kq["verdict_nguy_hiem"], kq["co_ma_doi_chu"], kq["chenh_khop_transfer"],
                     kq["doi_chu_hien"], kq["tx_co_set_authority"], kq["khong_gui_giao_dich"],
                     not kq["loi"]])
    vi.close(); pg.close()
    return kq


def ca_loi(b, ten: str, sua_rpc):
    """Chặn RPC để tạo ca hỏng; trang tấn công KHÔNG được mở ví."""
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    ctx.route("**/*", sua_rpc)
    pg = ctx.new_page()
    pg.goto(TAN_CONG, wait_until="domcontentloaded", timeout=60000)
    pg.wait_for_timeout(6000)
    so_tab = len(ctx.pages)
    pg.locator("button", has_text="Nhận").first.click()
    pg.wait_for_timeout(12000)
    body = pg.inner_text("body")
    kq = {
        "ca": ten,
        "khong_mo_vi": len(ctx.pages) == so_tab and "#tx=" not in pg.url,
        "thong_diep_hien_truong": "Hiện trường demo trên Devnet chưa sẵn sàng" in body,
        "thong_diep_mang": ("không trả lời" in body) or ("Không kết nối được" in body),
    }
    ctx.close()
    return kq


def main():
    ht = json.load(open("apps/demo-wallet/public/hien-truong.json", encoding="utf-8"))
    dec = int(ht["decimals"])
    ket = {"luc": datetime.datetime.now().isoformat(timespec="seconds"), "luot": [], "ca_loi": []}
    with sync_playwright() as p:
        b = p.chromium.launch()
        ket["chromium"] = b.version
        for ten, w, h in KHUNG:
            for n in range(1, SO_LUOT + 1):
                ctx = b.new_context(viewport={"width": w, "height": h})
                r = mot_luot(ctx, ten, n, dec)
                ctx.close()
                ket["luot"].append(r)
                print(f"{'PASS' if r['dat'] else 'FAIL'}  {ten} #{n}  {r.get('so_du')}  "
                      f"transfer={r['transfer_tho']}  ma={r['co_ma_doi_chu']}  loi={r['loi'][:1]}")

        # Ca 1: hiện trường đã đổi chủ — sửa câu trả lời của lượt đọc tài khoản nguồn.
        #
        # ⚠️ web3.js v1 KHÔNG gửi method tên `getParsedAccountInfo`: hàm đó gọi RPC
        # `getAccountInfo` với `encoding: "jsonParsed"`. Bản đầu của probe khớp theo tên
        # hàm JS, nên không chặn được gì, và ca lỗi "chưa đạt" vì probe — không vì sản phẩm.
        def doi_chu(route):
            req = route.request
            body = req.post_data or ""
            if (req.method == "POST" and '"getAccountInfo"' in body and "jsonParsed" in body
                    and ht["taiKhoanNanNhan"] in body):
                r = route.fetch()
                j = r.json()
                try:
                    j["result"]["value"]["data"]["parsed"]["info"]["owner"] = ht["keTanCong"]
                except (KeyError, TypeError):
                    pass
                route.fulfill(response=r, json=j)
            else:
                route.continue_()

        # Ca 2: RPC không trả lời — huỷ mọi POST JSON-RPC.
        def mat_mang(route):
            req = route.request
            if req.method == "POST" and '"jsonrpc"' in (req.post_data or ""):
                route.abort()
            else:
                route.continue_()

        for ten, f in (("hien-truong-doi-chu", doi_chu), ("rpc-mat-mang", mat_mang)):
            r = ca_loi(b, ten, f)
            ket["ca_loi"].append(r)
            print(f"{ten}: {r}")
        b.close()

    dat_luot = all(r["dat"] for r in ket["luot"])
    c1, c2 = ket["ca_loi"]
    dat_loi = (c1["khong_mo_vi"] and c1["thong_diep_hien_truong"]
               and c2["khong_mo_vi"] and c2["thong_diep_mang"] and not c2["thong_diep_hien_truong"])
    ket["dat"] = dat_luot and dat_loi
    print(f"→ {OUT}/ban-giao-tan-cong.json")
    with open(f"{OUT}/ban-giao-tan-cong.json", "w", encoding="utf-8") as fh:
        json.dump(ket, fh, ensure_ascii=False, indent=1)
    print(f"\n{'CỔNG ĐẠT' if ket['dat'] else 'CỔNG CHƯA ĐẠT'} · {sum(r['dat'] for r in ket['luot'])}/{len(ket['luot'])} lượt · ca lỗi {'đạt' if dat_loi else 'CHƯA ĐẠT'}")
    sys.exit(0 if ket["dat"] else 1)


main()

# -*- coding: utf-8 -*-
"""Độ trễ phía NGƯỜI DÙNG — tải trang, bấm → kết quả, số lượt gọi RPC.

    npm run build -w @custos-solana/demo-wallet
    npm run preview -w @custos-solana/demo-wallet -- --port 4173 --strictPort
    python scripts/kiem-trinh-duyet/soi-do-tre.py

Việc D03.

## Vì sao KHÔNG đo trên dev server

`data/tich-hop/ket-qua.json` đã đo độ trễ phía SDK: `msMotLuotKiem`, `msKetQuaDau`,
và từng chặng blockhash/inspect. Nhưng đó là Node gọi thư viện. Người dùng không
sống ở đó — họ bấm một cái nút và chờ một tấm thẻ hiện ra.

Và phải đo trên **bản dựng production**. Dev server của Vite phục vụ hàng trăm module
chưa gộp, chưa minify, kèm HMR: con số tải trang ở đó không nói gì về trang đã deploy.
Đo chỗ dễ rồi gọi tên chỗ khó là cách tự khen bằng một phép đo sai đối tượng.

## Ba thứ đo riêng, vì chúng hỏng vì lý do khác nhau

    A · TẢI TRANG   trước khi người dùng chạm vào gì. Do kích thước bundle và mạng.
    B · BẤM → KẾT QUẢ  do RPC devnet và số lượt gọi. Không liên quan bundle.
    C · SỐ LƯỢT RPC  nguyên nhân gốc của B. Đếm ở tầng mạng, không tin lời kể.

Gộp ba thứ vào một con số "tổng thời gian" là mất luôn khả năng biết phải sửa cái gì.

## Nguội và ấm

`nguoi` = context trình duyệt mới tinh, chưa có cache HTTP nào. Đó là lần đầu một
người mở trang.

`am` = tải lại trong cùng context. Bundle đã nằm trong cache, nên phần còn lại là
thời gian thật của mạng và của việc dựng màn hình.

Chênh lệch giữa hai số nói bundle đang tốn bao nhiêu — và đó là thứ tối ưu được, khác
với độ trễ RPC vốn nằm ngoài tay đội.

## Ít mẫu thì báo trung vị và cao nhất, KHÔNG báo p95

Năm lượt bấm không đủ để một con số p95 có nghĩa; in nó ra chỉ để trông giống một báo
cáo hiệu năng thật. Trung vị và cao nhất là hai con số năm mẫu nói được.

## Điểm ngoại lai là RETRY, không phải khởi động nguội

Phương sai ở đây lớn, và tôi đã suýt gán sai nguyên nhân. Lượt chạy đầu cho
[6926, 836, 839] ms — con số 6926 nằm ở lượt bấm ĐẦU, vừa đủ để kết luận "khởi động
nguội chậm". Lượt chạy sau bác bỏ ngay: [1348, 1347, 1354], lượt đầu không chậm hơn
chút nào.

Ghép thời gian với số lượt gọi RPC của CÙNG lượt bấm thì nguyên nhân thật hiện ra:

    868/7 · 852/7 · 844/7 · 845/7 · 6386/17

Lượt chậm gấp bảy lần cũng là lượt gọi RPC gấp hơn hai lần. Ba lượt chạy đều cho cùng
hình dạng đó, và điểm ngoại lai rơi vào vị trí khác nhau mỗi lần — nên nó là RPC công
cộng trả lỗi rồi client thử lại, không phải khởi động nguội.

Kết luận này chỉ rút ra được vì hai con số nằm CẠNH NHAU. Hai danh sách rời nhau chỉ
cho biết "có một lượt chậm" và "có một lượt gọi nhiều", không cho biết đó là một.
"""
import asyncio
import json
import statistics
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import dauvet
from playwright.async_api import async_playwright

GOC = Path(__file__).resolve().parents[2]
# `vite build` đặt `base: "/Custos-Solana/"` cho bản deploy, nên preview phục vụ ở
# đường dẫn con. Mở "/" vẫn ra HTML nhưng KHÔNG phải trang thật.
TRANG = "http://localhost:4173/Custos-Solana/"
# Năm chứ không ba: phương sai của RPC devnet lớn, và ba mẫu thì một lượt xui làm
# lệch hẳn trung vị. Năm vẫn ÍT — báo trung vị và cao nhất, không báo p95.
SO_LUOT_BAM = 5
O_KET_QUA = "[aria-label='Kết quả kiểm tra giao dịch']"

# Đo là ĐO, không phải chấm đỗ/trượt. Ngưỡng ở đây chỉ để in cảnh báo, và chúng là
# ngưỡng CẢM NHẬN quen thuộc chứ không phải cam kết sản phẩm — nói rõ để không ai
# đọc một dòng cảnh báo thành một SLA.
NGUONG_TAI_TRANG_MS = 3000
NGUONG_BAM_KET_QUA_MS = 5000


async def do_tai_trang(ctx, nhan: str) -> dict:
    pg = await ctx.new_page()
    await pg.goto(TRANG, wait_until="load")
    await pg.wait_for_timeout(400)
    t = await pg.evaluate(
        """() => {
            const n = performance.getEntriesByType("navigation")[0];
            const paint = performance.getEntriesByType("paint");
            const fcp = paint.find((p) => p.name === "first-contentful-paint");
            const js = performance.getEntriesByType("resource")
                .filter((r) => r.name.endsWith(".js"));
            return {
                domContentLoaded: Math.round(n.domContentLoadedEventEnd),
                load: Math.round(n.loadEventEnd),
                fcp: fcp ? Math.round(fcp.startTime) : null,
                soTepJs: js.length,
                // `transferSize` là byte đi qua dây (đã nén). 0 nghĩa là lấy từ cache.
                byteJsQuaDay: js.reduce((s, r) => s + (r.transferSize || 0), 0),
                byteJsGiaiNen: js.reduce((s, r) => s + (r.decodedBodySize || 0), 0),
            };
        }"""
    )
    t["nhan"] = nhan
    # KHÔNG đóng trang ở đây: `kiemDoThat` cần hỏi chính nó xem React có mount không.
    # Bên gọi đóng.
    return t, pg


async def kiemDoThat(pg, t: dict) -> None:
    """Một lượt đo tải trang trên một trang TRẮNG thì không phải một lượt đo.

    ## Bản đầu của guard này cũng hỏng, và hỏng theo đúng kiểu nó định chặn

    Nó kiểm `byteJsQuaDay == 0`. Nhưng máy chủ đâu có trả 0 byte — nó trả `index.html`
    (859 byte) cho mọi file JS, vì SPA fallback. Điều kiện `== 0` không bao giờ đúng,
    và guard im lặng để một trang trắng đi thẳng vào bằng chứng. Dòng in ra còn ghi
    "0 KB" vì `859 // 1024 == 0` — con số duy nhất lộ ra sự thật lại bị phép chia
    làm tròn mất.

    Bài học: đừng hỏi "có bằng 0 không", hỏi "có ĐỦ không". Và tốt hơn cả byte là hỏi
    thẳng thứ mình thật sự cần — **ứng dụng có dựng được không**.

    Nên guard này kiểm HAI điều, và điều thứ hai mới là điều đúng:
    """
    if not t["nhan"].startswith("nguội"):
        return

    # 1. Byte JS phải đủ lớn để là mã thật, không phải một trang fallback.
    #    Bundle nhỏ nhất của repo này đã 32 KB; 20 KB là ngưỡng rộng rãi.
    du_byte = t["byteJsQuaDay"] >= 20 * 1024
    # 2. Và quan trọng hơn: React có mount không. Đây là câu hỏi thật.
    da_dung = await pg.evaluate("() => (document.getElementById('root')?.innerHTML.length ?? 0) > 0")

    if du_byte and da_dung:
        return

    print()
    print("✖ TRANG KHÔNG DỰNG ĐƯỢC — số đo dưới đây sẽ vô nghĩa, dừng ở đây.")
    print(f"    JS qua dây : {t['byteJsQuaDay']} byte trên {t['soTepJs']} tệp")
    print(f"    #root      : {'có nội dung' if da_dung else 'RỖNG'}")
    print(f"    đang mở    : {TRANG}")
    print()
    print("  Nguyên nhân đã gặp: `vite preview` chạy với `command === \"serve\"` nên nhận")
    print("  base `/` trong khi HTML build trỏ `/Custos-Solana/`. Mọi asset rơi xuống SPA")
    print("  fallback và trả `index.html` với mã 200 — không có gì báo lỗi.")
    print("  Cấu hình phải dùng `isPreview`; xem `apps/demo-wallet/vite.config.ts`.")
    sys.exit(1)


async def do_bam_ket_qua(ctx) -> dict:
    """Bấm 'Nhận quà tặng' rồi đo tới lúc thẻ kết quả HIỆN RA.

    Đo tới lúc phần tử xuất hiện, không đo tới lúc promise trong JS xong: người dùng
    tin vào thứ họ nhìn thấy, không tin vào thứ đã resolve.
    """
    ms: list[int] = []
    soRpc: list[int] = []
    for _ in range(SO_LUOT_BAM):
        pg = await ctx.new_page()
        dem = {"n": 0}
        # Đếm ở TẦNG MẠNG. Đọc số lượt gọi từ mã sản phẩm là tin chính thứ đang đo.
        pg.on("request", lambda r: dem.update(n=dem["n"] + 1) if "devnet.solana.com" in r.url else None)

        await pg.goto(TRANG, wait_until="load")
        await pg.wait_for_timeout(800)
        nut = pg.locator("button.nut-nhan, button:has-text('Nhận quà')").first
        if await nut.count() == 0:
            await pg.close()
            continue
        truoc = dem["n"]
        t0 = await pg.evaluate("() => performance.now()")
        await nut.click()
        try:
            await pg.wait_for_selector(O_KET_QUA, timeout=60000)
        except Exception:
            await pg.close()
            continue
        t1 = await pg.evaluate("() => performance.now()")
        ms.append(round(t1 - t0))
        soRpc.append(dem["n"] - truoc)
        await pg.close()
    return {"ms": ms, "soLuotRpc": soRpc}


def tomTat(xs: list[int]) -> dict | None:
    if not xs:
        return None
    return {"soMau": len(xs), "trungVi": round(statistics.median(xs)), "caoNhat": max(xs), "tatCa": xs}


async def main() -> None:
    ket: dict = {}
    async with async_playwright() as p:
        b = await p.chromium.launch()
        moiTruong = {
            "chromium": b.version,
            "khung": {"rong": 1280, "cao": 900},
            "bopMang": "không — mạng thật của máy chạy",
            "rpc": "https://api.devnet.solana.com (mặc định của hiện trường)",
            "banDung": "production (`vite build` + `vite preview`), KHÔNG phải dev server",
        }

        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        ket["taiTrangNguoi"], pgNguoi = await do_tai_trang(ctx, "nguội — context mới, chưa có cache")
        await kiemDoThat(pgNguoi, ket["taiTrangNguoi"])
        await pgNguoi.close()

        ket["taiTrangAm"], pgAm = await do_tai_trang(ctx, "ấm — cùng context, bundle đã cache")
        await pgAm.close()
        bam = await do_bam_ket_qua(ctx)
        await ctx.close()
        await b.close()

    ket["moiTruong"] = moiTruong
    """
    TÁCH LƯỢT ĐẦU RA — nhưng KHÔNG kết luận nó chậm hơn.

    Lượt chạy đầu cho [6926, 836, 839] ms và tôi đã định viết rằng lượt đầu chậm có
    cấu trúc vì phải bắt tay TLS với RPC. Lượt chạy sau bác bỏ ngay: [1348, 1347,
    1354] — lượt đầu không chậm hơn chút nào.

    Nên kết luận đúng KHÔNG phải "lượt đầu chậm", mà là: **phương sai lớn, và ba mẫu
    không đủ để nói 6926 ms là khởi động nguội hay chỉ là một lượt RPC xui.** Gán
    nguyên nhân cho một điểm dữ liệu là đúng thứ trang `BENCHMARK.md` cấm.

    Vẫn tách lượt đầu ra, vì đó là lượt buổi demo nhìn thấy — nhưng tách để ĐỌC
    RIÊNG, không phải để tuyên bố một quy luật.

    Và vẫn báo `caoNhat`: một lượt 6926 ms có thật thì người dùng có thật đã chờ gần
    bảy giây, dù nó hiếm.
    """
    ket["bamLanDau"] = bam["ms"][0] if bam["ms"] else None
    ket["bamCacLuotSau"] = tomTat(bam["ms"][1:])
    ket["bamTatCa"] = tomTat(bam["ms"])
    ket["soLuotRpcMoiLuot"] = tomTat(bam["soLuotRpc"])
    """
    GHÉP CẶP thời gian với số lượt RPC của CÙNG lượt bấm.

    Hai danh sách rời nhau giấu mất quan hệ. Đo được: thời gian
    [1353, 866, 844, 842, 5882] và lượt RPC [7, 7, 7, 7, 16] — nhìn rời thì "có một
    lượt chậm" và "có một lượt gọi nhiều"; nhìn cặp thì thấy ngay ĐÓ LÀ CÙNG MỘT
    LƯỢT, và lượt chậm gấp bảy lần cũng là lượt gọi RPC gấp hơn hai lần.

    Nghĩa là điểm ngoại lai không phải khởi động nguội — nó là RPC devnet trả lỗi rồi
    client thử lại. Kết luận đó chỉ rút ra được khi hai con số nằm cạnh nhau.
    """
    ket["tungLuot"] = [
        {"ms": m, "soLuotRpc": r} for m, r in zip(bam["ms"], bam["soLuotRpc"])
    ]

    print(f"ĐỘ TRỄ PHÍA NGƯỜI DÙNG · {moiTruong['banDung']}\n")
    for k in ("taiTrangNguoi", "taiTrangAm"):
        t = ket[k]
        print(f"  {t['nhan']}")
        print(f"    FCP {t['fcp']} ms · DOMContentLoaded {t['domContentLoaded']} ms · load {t['load']} ms")
        print(
            f"    JS: {t['soTepJs']} tệp · {t['byteJsQuaDay'] // 1024} KB qua dây"
            f" · {t['byteJsGiaiNen'] // 1024} KB sau giải nén"
        )

    b2 = ket["bamTatCa"]
    if b2:
        print(f"\n  bấm → thẻ kết quả HIỆN RA  ({b2['soMau']} lượt)")
        print(f"    lượt ĐẦU          : {ket['bamLanDau']} ms   (lượt buổi demo nhìn thấy)")
        s2 = ket["bamCacLuotSau"]
        if s2:
            print(
                f"    các lượt sau     : trung vị {s2['trungVi']} ms"
                f" · cao nhất {s2['caoNhat']} ms · {s2['tatCa']}"
            )
    r = ket["soLuotRpcMoiLuot"]
    if r:
        print(f"    lượt gọi RPC mỗi lần kiểm: trung vị {r['trungVi']} · cao nhất {r['caoNhat']}")
        # In theo CẶP: lượt chậm và lượt gọi nhiều RPC là cùng một lượt, và chỉ nhìn
        # cạnh nhau mới thấy.
        print("      từng lượt (ms / số RPC): " + " · ".join(
            f"{x['ms']}/{x['soLuotRpc']}" for x in ket["tungLuot"]))

    # KHÔNG in p95: ba mẫu không đỡ nổi một con số p95, và in nó ra chỉ để trông
    # giống một báo cáo hiệu năng thật.
    canh = []
    if ket["taiTrangNguoi"]["fcp"] and ket["taiTrangNguoi"]["fcp"] > NGUONG_TAI_TRANG_MS:
        canh.append(f"FCP nguội {ket['taiTrangNguoi']['fcp']} ms > {NGUONG_TAI_TRANG_MS} ms")
    # Cảnh báo theo LƯỢT ĐẦU, không theo trung vị. Trung vị của [6926, 836, 839] là
    # 839 — dưới mọi ngưỡng, trong khi người dùng đầu tiên chờ gần bảy giây.
    if ket["bamLanDau"] and ket["bamLanDau"] > NGUONG_BAM_KET_QUA_MS:
        canh.append(f"lượt bấm ĐẦU {ket['bamLanDau']} ms > {NGUONG_BAM_KET_QUA_MS} ms")
    for c in canh:
        print(f"\n  ⚠ {c}")

    ghi(ket, canh)
    # Không `exit(1)` theo ngưỡng: đây là bài ĐO, và một phép đo đỏ vì mạng hôm nay
    # chậm sẽ bị tắt sau đúng hai lần. Ngưỡng vượt thì in cảnh báo và ghi vào bằng
    # chứng — người đọc quyết định, không phải mã thoát quyết định.
    if not b2:
        print("\n✖ KHÔNG đo được lượt bấm nào — xem preview server và mạng devnet.")
        sys.exit(1)


def ghi(ket: dict, canh: list[str]) -> None:
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None
    d = GOC / "data" / "hieu-nang"
    d.mkdir(parents=True, exist_ok=True)
    (d / "do-tre.json").write_text(
        json.dumps(
            {
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                **ket,
                "canhBao": canh,
                "khongDo": [
                    "p95 — 3 lượt bấm không đỡ nổi một con số p95",
                    "mạng bị bóp (3G/4G) — chưa dựng, cần thêm cấu hình throttle",
                    "thiết bị thật — mọi số ở đây từ Chromium headless trên máy dev",
                ],
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print("\n→ data/hieu-nang/do-tre.json")


asyncio.run(main())

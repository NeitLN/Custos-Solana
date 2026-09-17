# -*- coding: utf-8 -*-
"""INSPECTOR — kiểm một giao dịch bất kỳ, ngoài hai kịch bản demo. Thẻ CU-08.

    npm run vi                                          # cần server ở 5188
    python scripts/kiem-trinh-duyet/soi-inspector.py

## Bài quan trọng nhất: ĐẦU VÀO SAI KHÔNG ĐƯỢC CHẠM RPC

Nghiệm thu thẻ ghi thẳng câu đó, và lý do không phải tối ưu tốc độ: mỗi lượt mô
phỏng gửi **toàn bộ nội dung giao dịch** tới RPC được chọn. Gửi một chuỗi rác đi
cũng là gửi — và nếu chuỗi rác đó tình cờ là dữ liệu thật của ai đó thì ta vừa làm
lộ nó vì một lỗi đánh máy.

Bài này đếm lời gọi mạng thật bằng `page.on("request")`, không đọc mã. Một bản sửa
làm rò một lời gọi RPC ra trước phép kiểm đầu vào sẽ bị bắt ở đây.

## Vì sao cần giao dịch THẬT

Ca `base64 hợp lệ nhưng không phải tx` và ca `transaction thật` đi hai nhánh khác
nhau hoàn toàn. Chỉ kiểm nhánh lỗi thì Inspector có thể hỏng hoàn toàn ở đường
thành công mà mọi bài vẫn xanh — nên bài này tự dựng một giao dịch Devnet thật.

## Điều bài này KHÔNG kiểm

Không kiểm khi RPC chết: nhánh đó dùng chung `inspect()` với ví demo và đã có bài
riêng (`soi-trinh-duyet.py` nhóm D). Lặp lại ở đây chỉ làm bộ kiểm chậm hơn.
"""
import asyncio
import base64
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import dauvet
from playwright.async_api import async_playwright

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

GOC = Path(__file__).resolve().parents[2]
TRANG = "http://localhost:5188/soi.html"
RA = GOC / "data/a11y/inspector.json"

loi: list[str] = []
muc: list[dict] = []


def ck(ten: str, dat: bool, ghi: str = "") -> None:
    muc.append({"ten": ten, "dat": bool(dat), "ghiChu": ghi})
    print(f"  {'PASS' if dat else 'FAIL'}  {ten}" + (f"   ({ghi})" if ghi else ""))
    if not dat:
        loi.append(ten)


def txThat() -> str | None:
    """Dựng một giao dịch Devnet thật bằng chính web3.js đang ghim.

    Không dùng fixture cứng: blockhash trong fixture hết hạn, và ca đó đã có bài
    riêng. Ở đây cần một giao dịch mà RPC chấp nhận mô phỏng.
    """
    js = (
        'import {Connection,Keypair,SystemProgram,TransactionMessage,VersionedTransaction}'
        ' from "@solana/web3.js";'
        'const c=new Connection("https://api.devnet.solana.com","confirmed");'
        "const a=Keypair.generate(),b=Keypair.generate();"
        "const {blockhash}=await c.getLatestBlockhash();"
        "const t=new VersionedTransaction(new TransactionMessage({payerKey:a.publicKey,"
        "recentBlockhash:blockhash,instructions:[SystemProgram.transfer({fromPubkey:a.publicKey,"
        "toPubkey:b.publicKey,lamports:1000000})]}).compileToV0Message());"
        'console.log(Buffer.from(t.serialize()).toString("base64"));'
    )
    tam = GOC / "scripts/ky-thuat/_tx-tam.mjs"
    try:
        tam.write_text(js, encoding="utf8")
        r = subprocess.run(
            ["node", str(tam)], capture_output=True, text=True, cwd=GOC, timeout=90
        )
        out = (r.stdout or "").strip().splitlines()
        return out[-1] if out else None
    except Exception:
        return None
    finally:
        tam.unlink(missing_ok=True)


async def main() -> None:
    b64That = txThat()

    async with async_playwright() as p:
        b = await p.chromium.launch()
        print(f"Chromium {b.version}\n")
        ctx = await b.new_context(viewport={"width": 1280, "height": 900})
        pg = await ctx.new_page()

        bug: list[str] = []
        rpc: list[str] = []
        pg.on("console", lambda m: bug.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: bug.append(str(e)))
        # Đếm MỌI lời gọi ra ngoài localhost — không chỉ solana.com. Một bản sửa
        # đổi endpoint mặc định vẫn phải bị bắt.
        pg.on(
            "request",
            lambda r: rpc.append(r.url) if not r.url.startswith("http://localhost") else None,
        )

        await pg.goto(TRANG, wait_until="networkidle")
        await pg.wait_for_timeout(500)
        t = await pg.locator("body").inner_text()

        print("A · trang dựng được và nói đúng phạm vi")
        ck("trang Inspector dựng được", "Kiểm một giao dịch" in t)
        ck(
            "cảnh báo riêng tư hiện TRƯỚC ô nhập",
            "Dữ liệu đi đâu" in t and t.index("Dữ liệu đi đâu") < t.index("Giao dịch (base64)"),
        )
        ck("KHÔNG có nút Ký ở Inspector", "Ký giao dịch" not in t and "Vẫn ký" not in t)
        ck("không hỏi seed phrase / khoá riêng", "seed phrase" in t and "không nhận" in t)

        print("\nB · đầu vào sai KHÔNG chạm RPC")
        for ten, dv, cho in [
            ("chuỗi rác", "không phải base64 đâu!!!", "không phải base64"),
            (
                "base64 hợp lệ nhưng không phải tx",
                base64.b64encode("văn bản thường".encode()).decode(),
                "không phải một giao dịch Solana",
            ),
            ("chuỗi quá dài", "A" * 5000, "dài hơn"),
        ]:
            rpc.clear()
            await pg.fill("#tx-b64", dv)
            await pg.get_by_role("button", name="Kiểm giao dịch").click()
            await pg.wait_for_timeout(900)
            man = await pg.locator("body").inner_text()
            ck(f"{ten} · báo lỗi đúng loại", cho in man)
            ck(f"{ten} · KHÔNG gọi RPC", len(rpc) == 0, f"{len(rpc)} lời gọi")

        print("\nC · ví không hợp lệ cũng không chạm RPC")
        rpc.clear()
        await pg.fill("#tx-b64", b64That or "")
        await pg.fill("#vi-bv", "không-phải-base58!!!")
        await pg.get_by_role("button", name="Kiểm giao dịch").click()
        await pg.wait_for_timeout(900)
        man = await pg.locator("body").inner_text()
        ck("ví sai · báo lỗi", "không phải base58 hợp lệ" in man)
        ck("ví sai · KHÔNG gọi RPC", len(rpc) == 0, f"{len(rpc)} lời gọi")
        await pg.fill("#vi-bv", "")

        print("\nD · giao dịch THẬT chạy hết đường")
        if not b64That:
            ck("dựng được giao dịch Devnet thật", False, "không lấy được blockhash")
        else:
            await pg.fill("#tx-b64", b64That)
            await pg.get_by_role("button", name="Kiểm giao dịch").click()
            try:
                await pg.wait_for_selector("[aria-label='Thẻ cảnh báo Custos']", timeout=45000)
                man = await pg.locator("body").inner_text()
                ck("thẻ kết quả hiện ra", True)
                ck(
                    "có mức verdict",
                    any(x in man for x in ["Bình thường", "Cần xem kỹ", "Nguy hiểm", "Chưa đọc hiểu"]),
                )
                ck("vẫn KHÔNG có nút Ký sau khi có kết quả", "Vẫn ký" not in man)
                ck("nói rõ đã mô phỏng trên RPC nào", "mô phỏng trên" in man)
                ck("có gọi RPC ở đường thành công", len(rpc) > 0, f"{len(rpc)} lời gọi")
            except Exception as e:
                ck("thẻ kết quả hiện ra", False, str(e)[:60])

        print("\nE · đổi đầu vào làm kết quả cũ mất hiệu lực")
        await pg.fill("#tx-b64", "rác")
        await pg.wait_for_timeout(300)
        man = await pg.locator("body").inner_text()
        ck("đổi đầu vào ⇒ bỏ kết quả cũ", "Chưa kiểm gì" in man)

        ck("0 lỗi console suốt lượt", len(bug) == 0, str(bug[:1]))

        await b.close()

    try:
        sha = subprocess.run(
            ["git", "rev-parse", "HEAD"], cwd=GOC, capture_output=True, text=True, check=True
        ).stdout.strip()
    except Exception:
        sha = None

    RA.parent.mkdir(parents=True, exist_ok=True)
    RA.write_text(
        json.dumps(
            {
                "the": "CU-08",
                "doLuc": datetime.now(timezone.utc).isoformat(),
                "sourceCommit": sha,
                "dauVet": dauvet.doc("giao-dien"),
                "soMuc": len(muc),
                "soHong": len(loi),
                "muc": muc,
                "dat": not loi,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf8",
    )
    print(f"\n→ {RA.relative_to(GOC)}")
    print("=== TẤT CẢ PASS ===" if not loi else f"=== {len(loi)} FAIL: " + " · ".join(loi))
    if loi:
        sys.exit(1)


asyncio.run(main())

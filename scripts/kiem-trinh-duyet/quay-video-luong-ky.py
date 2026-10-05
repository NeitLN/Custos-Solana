"""
QUAY VIDEO DỰ PHÒNG — luồng dApp → ví → Custos → Chặn, trên production. Đánh giá giám khảo 05/10:
"quay video mới cho luồng Wallet Standard, làm dự phòng khi RPC trên sân khấu chậm".

Playwright quay HAI cửa sổ (SolBonus và cửa sổ ký của Ví mẫu Custos), ghi mốc thời gian từng bước,
rồi ffmpeg ghép thành MỘT video cạnh nhau, đồng bộ, có phụ đề tiếng Việt. Không có file khoá, KHÔNG ký,
KHÔNG gửi giao dịch nào — luồng kết thúc bằng "Chặn giao dịch". Lượt ký thật được dẫn bằng link ở cuối.

    python scripts/kiem-trinh-duyet/quay-video-luong-ky.py [--out docs/nop-bai/video/CUSTOS-LUONG-KY.mp4]

Cần: playwright (Chromium), ffmpeg trong PATH, font Arial của Windows (cho phụ đề có dấu).
"""
import argparse, pathlib, re, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="docs/nop-bai/video/CUSTOS-LUONG-KY.mp4")
ap.add_argument("--solbonus", default="https://solbonus-custos.vercel.app/tan-cong/")
args = ap.parse_args()

W_SB, W_VI, H = 960, 460, 760
tam = pathlib.Path(tempfile.mkdtemp(prefix="custos-video-"))
moc = []  # (giây tính từ lúc SolBonus bắt đầu quay, phụ đề)
gui = []

with sync_playwright() as pw:
    b = pw.chromium.launch(ignore_default_args=["--disable-popup-blocking"])
    ctx = b.new_context(viewport={"width": W_SB, "height": H}, record_video_dir=str(tam / "sb"),
                        record_video_size={"width": W_SB, "height": H})
    ctx.on("request", lambda r: "sendTransaction" in (r.post_data or "") and gui.append(r.url))
    sb = ctx.new_page()
    t0 = time.time()
    ghi = lambda cau: moc.append((round(time.time() - t0, 2), cau))
    sb.goto(args.solbonus, wait_until="networkidle")
    ghi("SolBonus: dApp độc hại MÔ PHỎNG trên Devnet — không gọi Custos, chỉ xin chữ ký qua chuẩn ví")
    sb.wait_for_timeout(3500)

    # Cửa sổ ký quay bằng context RIÊNG không được — popup thuộc context của trang mở nó. Ghi video của
    # popup qua page.video của chính nó, và ghi mốc lúc nó mở để đồng bộ.
    with sb.expect_popup() as pop:
        sb.get_by_role("button", name="Kết nối ví").click()
    vi = pop.value
    t_vi = round(time.time() - t0, 2)
    vi.set_viewport_size({"width": W_VI, "height": H})
    vi.wait_for_load_state("networkidle")
    ghi("Bấm Kết nối ví → cửa sổ Ví mẫu Custos mở ở origin riêng")
    vi.wait_for_timeout(2500)
    vi.get_by_role("button", name="Cho kết nối").click()
    ghi("Cho kết nối: ứng dụng chỉ thấy địa chỉ ví")
    sb.wait_for_timeout(2000)

    sb.get_by_role("button", name=re.compile("Tìm token DEMO")).click()
    ghi("SolBonus tự đọc chain, tìm token DEMO của ví")
    sb.locator("#sb-token").wait_for(timeout=120000)
    sb.wait_for_timeout(2000)

    sb.get_by_role("button", name="Nhận 1.000 SOLB").click()
    ghi("Bấm Nhận quà → yêu cầu ký đi vào ví; Custos mô phỏng ĐÚNG giao dịch đó")
    vi.locator(".kn-muc").wait_for(timeout=60000)
    ghi("Nguy hiểm: chuyển nửa số DEMO VÀ đổi chủ tài khoản token — trước khi có chữ ký nào của ví")
    vi.wait_for_timeout(7000)

    vi.get_by_role("button", name="Chặn giao dịch").click()
    ghi("Chặn giao dịch: ví không tạo chữ ký")
    sb.wait_for_timeout(2500)
    ghi("SolBonus không nhận được chữ ký — chưa gửi gì lên Devnet")
    sb.wait_for_timeout(4000)
    ghi("Lượt đã ký thật 29/09: explorer.solana.com/tx/LDxqW6…eroQ2 (cluster devnet) — biên nhận khớp 3/3")
    sb.wait_for_timeout(5000)
    t_het = round(time.time() - t0, 2)
    v_sb, v_vi = sb.video.path(), vi.video.path()
    ctx.close()
    b.close()

assert gui == [], f"có sendTransaction trong lúc quay: {gui}"

# ── ghép: SolBonus trái, cửa sổ ký phải (đệm khung trống tới lúc popup mở), phụ đề dưới ─────────────
ff = shutil.which("ffmpeg") or sys.exit("thiếu ffmpeg")
font = "C\\:/Windows/Fonts/arial.ttf"
phu_de = []
for i, (t, cau) in enumerate(moc):
    het = moc[i + 1][0] if i + 1 < len(moc) else t_het
    cau = cau.replace(":", "\\:").replace("'", "’").replace(",", "\\,")
    phu_de.append(
        f"drawtext=fontfile='{font}':text='{cau}':fontsize=22:fontcolor=white:box=1:boxcolor=0x102f28@0.88:"
        f"boxborderw=14:x=(w-text_w)/2:y=h-62:enable='between(t,{t},{het})'"
    )
loc = (
    # Popup quay trong khung của context (W_SB×H) nhưng nội dung chỉ rộng W_VI: CẮT, đừng co cả khung.
    f"[1:v]crop={W_VI}:{H}:0:0,tpad=start_duration={t_vi}:start_mode=add:color=0xf6f7f4,setsar=1[vi];"
    f"[0:v]scale={W_SB}:{H},setsar=1[sb];"
    f"[sb][vi]hstack=inputs=2,pad=iw:ih+80:0:0:color=0x0f1a14,{','.join(phu_de)},trim=0:{t_het},format=yuv420p[ra]"
)
out = pathlib.Path(args.out)
out.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([ff, "-y", "-loglevel", "error", "-i", str(v_sb), "-i", str(v_vi), "-filter_complex", loc,
                "-map", "[ra]", "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-movflags", "+faststart", str(out)],
               check=True)
pathlib.Path(out.with_suffix(".srt")).write_text(
    "\n".join(
        f"{i + 1}\n00:00:{int(t):02d},{int((t % 1) * 1000):03d} --> 00:00:{int(e):02d},{int((e % 1) * 1000):03d}\n{c}\n"
        for i, ((t, c), e) in enumerate(zip(moc, [m[0] for m in moc[1:]] + [t_het]))
    ),
    encoding="utf-8",
)
shutil.rmtree(tam, ignore_errors=True)
print(f"xong: {out} ({out.stat().st_size // 1024} KB, {t_het:.0f} s) · 0 sendTransaction")

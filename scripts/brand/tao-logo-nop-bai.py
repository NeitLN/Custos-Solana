# -*- coding: utf-8 -*-
"""Dựng logo nộp bài: bản vuông nền trắng và bản vuông nền xanh.

VÌ SAO KHÔNG NỘP THẲNG `custos-symbol-512.png`:

File gốc là RGBA nền TRONG SUỐT. Nền trong suốt không phải là "nền trắng" — nó
lấy màu của thứ đứng sau. Form nộp bài chạy nền TỐI, nên phần trong suốt thành
đen và chữ C xanh đậm (#146c60) gần như chìm hẳn.

Đây là ca hỏng chỉ thấy khi nhìn trên nền thật, không thấy khi mở file bằng trình
xem ảnh (vốn tự vẽ nền trắng hoặc ca-rô).

Nên dựng hai bản, mỗi bản ghép nền ĐẶC:
  · nền trắng  — an toàn ở mọi nơi, kể cả giao diện tối
  · nền xanh   — đậm hơn, nổi hơn khi đứng cạnh logo đội khác

Có thêm padding quanh biểu tượng: nhiều nơi bo tròn ảnh đại diện, sát mép thì bị
cắt mất góc.
"""
import pathlib
from PIL import Image

NGUON = pathlib.Path("apps/demo-wallet/public/brand/custos-symbol-512.png")
RA = pathlib.Path("docs/nop-bai/logo")
RA.mkdir(parents=True, exist_ok=True)

XANH = (20, 108, 96)      # #146c60 — màu thương hiệu
TRANG = (255, 255, 255)

CANH = 512
# Biểu tượng chiếm 74% khung; phần còn lại là lề để không bị cắt khi bo tròn.
TRONG = int(CANH * 0.74)

goc = Image.open(NGUON).convert("RGBA")
bieu_tuong = goc.resize((TRONG, TRONG), Image.LANCZOS)
le = (CANH - TRONG) // 2

for ten, nen in [("custos-logo-nen-trang.png", TRANG), ("custos-logo-nen-xanh.png", XANH)]:
    khung = Image.new("RGB", (CANH, CANH), nen)
    if nen == XANH:
        # Trên nền xanh, biểu tượng xanh sẽ chìm — đảo sang trắng.
        trang_hoa = Image.new("RGBA", bieu_tuong.size, (255, 255, 255, 0))
        trang_hoa.putalpha(bieu_tuong.getchannel("A"))
        khung.paste(trang_hoa, (le, le), trang_hoa)
    else:
        khung.paste(bieu_tuong, (le, le), bieu_tuong)
    dich = RA / ten
    khung.save(dich, "PNG", optimize=True)
    print(f"{dich}  {CANH}x{CANH}  {dich.stat().st_size / 1024:.0f} KB")

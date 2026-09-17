"""ĐO TRÀN NGANG — và vì sao phép đo cũ đỏ vì lý do sai.

Tràn ngang là *nội dung rộng hơn khung nhìn*, tức người dùng phải cuộn ngang mới
đọc hết. Phép đo là `scrollWidth - clientWidth`, và **chỉ giá trị DƯƠNG mới là
tràn**.

`soi-trinh-duyet.py` từng hỏi `tran == 0`. Điều đó đúng suốt nhiều tháng — rồi
17/09/2026, một commit giao diện thêm vào `html`:

    scrollbar-gutter: stable;

Dòng đó là CSS **tốt**: nó chừa sẵn chỗ cho thanh cuộn dọc nên layout không nhảy
ngang khi thanh cuộn xuất hiện hay biến mất. Nhưng Chromium/Windows chừa 15px đó
bằng cách **trừ vào `clientWidth`**, trong khi `scrollWidth` không đổi. Hiệu số
thành **-15**, trên MỌI trang, kể cả trang không có gì tràn.

Sáu phép kiểm chuyển sang FAIL cùng một lúc, cả bốn trang, cả 375px lẫn 1440px,
tất cả cùng đúng một con số. Không có gì hỏng cả — phép đo gọi tên sai thứ nó thấy.

Bằng chứng: tắt đúng một dòng CSS đó bằng `add_style_tag` thì cả bốn trang từ
-15px về 0px. Nguyên nhân duy nhất, không phải một phần tử nào rộng quá.

    so-lieu  1440:  có gutter = -15px  ->  tắt gutter = 0px
    so-lieu   375:  có gutter = -15px  ->  tắt gutter = 0px
    phong-van 1440: có gutter = -15px  ->  tắt gutter = 0px
    vi        1440: có gutter = -15px  ->  tắt gutter = 0px

Hai hướng sửa, và chúng KHÔNG tương đương:

  · bỏ `scrollbar-gutter` -> làm sản phẩm xấu đi để phép đo xanh. Không.
  · sửa phép đo -> nó vốn đã sai; `-15` chưa bao giờ là tràn.

Chọn hướng thứ hai. `soi-ban-phim-va-phong-to.py` vốn đã hỏi `tran <= 0` cho đúng
ngay từ đầu — repo có sẵn hai chuẩn cho cùng một thứ, và file chặt hơn lại là file
sai. Gom về một hàm để lần sau không lệch nữa.

Vẫn giữ nguyên độ chặt theo chiều dương: **1px tràn cũng là FAIL.** Sửa chiều âm
không được đổi thành nới chiều dương.
"""

DO_TRAN = "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"


async def do_tran(pg) -> int:
    """Trả về số px tràn ngang. Dương = có tràn thật. Âm = scrollbar-gutter."""
    return await pg.evaluate(DO_TRAN)


def khong_tran(tran: int) -> bool:
    """Đạt khi KHÔNG có tràn dương. Giá trị âm là chỗ chừa cho thanh cuộn, không phải lỗi."""
    return tran <= 0


def ghi_chu(tran: int) -> str:
    """Chữ hiện khi FAIL — nói thẳng chiều nào, để lần sau không phải suy luận lại."""
    if tran > 0:
        return f"tràn {tran}px — nội dung rộng hơn khung nhìn"
    if tran < 0:
        return f"{tran}px — chỗ chừa thanh cuộn, KHÔNG phải tràn"
    return "0px"

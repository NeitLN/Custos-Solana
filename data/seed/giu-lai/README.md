# Tập giữ lại

**Trống là đúng.** Thư mục này chưa có mẫu nào, và điều đó được ghi ra chứ không giấu.

## Vì sao trống

Cả 38 mẫu trong `../index.json` đều được viết **cùng lúc hoặc sau** luật mà chúng
kiểm. Cắt tám mẫu ra bây giờ rồi gọi là "tập giữ lại" là đặt tên mới cho dữ liệu đã
dùng để phát triển. Một tập giữ lại mà luật đã thấy thì không phải tập giữ lại — nó
chỉ là một cái nhãn làm con số trông đáng tin hơn thực tế.

Nên thư mục này bắt đầu từ mẫu **tiếp theo**, không hồi tố.

## Quy tắc

| Bước | |
|---|---|
| 1 | Mẫu mới vào đây, **không** vào `index.json` |
| 2 | Không đọc kết quả trên tập này khi đang sửa luật |
| 3 | Chạy **một lần**, khi chốt bản — ghi kết quả dù nó xấu |
| 4 | Đã nhìn kết quả thì mẫu đó **hết là** giữ lại; chuyển sang `index.json` |

Bước 4 là bước hay bị bỏ. Một tập giữ lại chạy đi chạy lại trong lúc tuning chính là
tập huấn luyện, chỉ chậm hơn — và nó sinh ra một con số nghe như bằng chứng độc lập
trong khi không phải.

Bước 1 có guard: `packages/core/test/giuLai.test.ts` đỏ nếu một `id` xuất hiện ở cả
hai nơi.

## Định dạng

Giống hệt một phần tử trong `index.json` (`id`, `luat`, `cuc`, `nguonGoc`, `nguon`,
`kyVong`, `bangChung`, `ganNhanLuc`), một mẫu một file `<id>.json`.

Xem `docs/BENCHMARK.md` mục 2.

# Phỏng vấn người mua — bộ đồ nghề đi hỏi ví và dApp

> **Đây là việc CHỈ NGƯỜI THẬT LÀM ĐƯỢC.** Claude soạn câu hỏi, lược đồ, script đếm.
> Claude **không** điền câu trả lời, không đặt tên đối tác, không viết trích dẫn.
>
> Đếm bằng `scripts/kiem-nguoi-mua.ts`. Ghi vào `data/seed/nguoi-mua.json`.

## 0 · Vì sao 20 phỏng vấn người dùng KHÔNG trả lời được câu này

Đội đã hỏi 20 người dùng cuối và biết **13/20 hiểu được cảnh báo**. Con số đó tốt,
nhưng nó trả lời *"người dùng có hiểu không?"* — không trả lời *"ai trả tiền?"*

Custos là **SDK bán cho ví và dApp**. Người dùng cuối không phải khách hàng; họ là
người thụ hưởng. Hai nhóm khác nhau thì phải hỏi tách ra, và **không được trộn số**:

| | Người dùng cuối | Người mua |
|---|---|---|
| Đã có | 20 người, 29–30/08 | **0** |
| Câu trả lời được | sản phẩm có dễ hiểu không | có ai tích hợp không, vì sao không |
| Dữ liệu | `data/seed/phong-van.json` | `data/seed/nguoi-mua.json` |

Trộn hai con số này là cách nhanh nhất để bị hỏi vặn: *"20 người đó có ai là người
quyết định tích hợp không?"* Câu trả lời thật là **không**.

## 1 · Chọn một beachhead, đừng nhắm "mọi ví Solana"

> **ICP:** ví embedded, consumer dApp hoặc ví nhỏ phục vụ người dùng Việt Nam / Đông
> Nam Á, có luồng ký giao dịch nhưng **chưa có đội transaction-security riêng**.

Thứ tự ưu tiên tiếp cận — dễ tiếp cận trước, không phải oai trước:

1. dApp Solana tiêu dùng có người dùng Việt Nam / SEA
2. Nhà cung cấp ví embedded, ví nhỏ
3. App game / NFT / cộng đồng có luồng ký giao dịch
4. Đội hackathon khác đang làm dApp Solana — **dễ trả lời nhất**, và vẫn là bên
   tích hợp thật
5. Ví lớn: chỉ để **học yêu cầu enterprise**. Đừng đặt mục tiêu pilot trong 14 ngày.

## 2 · Sáu câu hỏi — hỏi đúng thứ tự này

Ba câu đầu hỏi về **hiện trạng của họ**, không về sản phẩm của mình. Nói về Custos
quá sớm thì phần còn lại của buổi chỉ là họ lịch sự với mình.

1. Hiện sản phẩm xử lý transaction preview / mô phỏng thế nào?
2. Lần gần nhất người dùng của bạn không hiểu giao dịch hoặc ký nhầm là khi nào?
3. Đội đang dùng nhà cung cấp nào, hay tự xây gì?
4. Điều gì khiến đội **không** tích hợp một SDK bảo mật mới?
5. Dữ liệu nào được phép rời khỏi client / RPC của bạn?
6. Nếu thử Custos trong một tuần, tiêu chí pass/fail của bạn là gì?

### Câu 4 là câu quý nhất

Nó cho biết **blocker thật**: bundle size, độ trễ, quyền riêng tư, hay đơn giản là
"không có người rảnh". Câu trả lời cho câu này quyết định sửa gì tiếp theo — quý hơn
một lời khen.

### Chỉ hỏi giá SAU khi hiểu quy trình mua

- Ai duyệt chi?
- Ngân sách nằm ở security, infra, hay product?
- Họ quen usage-based, tier tháng, hay self-hosted?

Helius/QuickNode $49 chỉ chứng minh **người mua quen trả tiền hạ tầng theo tháng**.
Nó **không** phải price validation cho Custos. Đừng dùng nó làm bằng chứng về giá.

## 3 · Điều KHÔNG được làm

| Không | Vì sao |
|---|---|
| Hỏi *"bạn có thấy cái này hữu ích không?"* | Ai cũng gật. Câu đó không đo được gì |
| Nói về Custos trước câu 3 | Buổi phỏng vấn thành buổi demo, và họ chỉ còn lịch sự |
| Ghi tên thật hoặc contact vào repo | Repo công khai. Contact giữ ở chỗ riêng |
| Gọi một lời khen là "pilot" | Pilot nghĩa là họ đã cắm SDK vào code của họ |
| Đếm người **không** trả lời vào mẫu số | Mẫu số là số người ĐÃ nói chuyện |
| Trích dẫn khi chưa xin phép | Trường `choPhepTrichDan` phải là `true` |

## 4 · Mục tiêu phễu — mục tiêu HOẠT ĐỘNG, không phải kết quả để công bố

| Bước | Mục tiêu |
|---|---|
| Target account có tên | 30–50 |
| Tin nhắn cá nhân hoá gửi đi | ≥ 20 |
| Có phản hồi | ≥ 8 |
| Nói chuyện 20–30 phút | 5–8 |
| Đồng ý xem integration | ≥ 2 |
| Pilot / reference integration | ≥ 1 |

**Chưa đạt thì nói chưa đạt.** Không có con số nào ở bảng này được lên slide trước
khi nó xảy ra thật.

## 5 · Mẫu tin nhắn tiếp cận

Ngắn, nêu rõ mình là ai, xin **15 phút**, và **không** xin tích hợp ngay.

> Chào [tên],
>
> Mình là [tên], sinh viên [trường], đang làm Custos — một SDK mã nguồn mở đọc
> giao dịch Solana trước khi người dùng ký và giải thích hậu quả bằng tiếng Việt.
>
> Mình đang tìm hiểu các đội có luồng ký giao dịch xử lý phần này thế nào. Không
> phải chào hàng — mình cần biết mình đang giải sai vấn đề ở đâu.
>
> Bạn cho mình xin **15 phút** được không? Mình hỏi 6 câu về hiện trạng của bên
> bạn, không demo gì cả trừ khi bạn muốn xem.
>
> Repo: github.com/NeitLN/Custos-Solana

## 6 · Ghi kết quả

Mỗi cuộc một bản ghi trong `data/seed/nguoi-mua.json`:

```json
{
  "ma": "B01",
  "ngay": "2026-09-06",
  "vaiTro": "developer",
  "loaiSanPham": "wallet",
  "kenh": "video",
  "vanDeCoThat": true,
  "cachDangXuLy": "tự viết preview số dư, không mô phỏng",
  "blockerTichHop": ["không có người rảnh", "lo độ trễ"],
  "tieuChiPilot": ["thêm < 300 ms mỗi giao dịch"],
  "dongYXemSdk": false,
  "dongYPilot": false,
  "choPhepTrichDan": false,
  "ghiChu": "..."
}
```

`ma` là mã ẩn danh do người phỏng vấn đặt. **Không bao giờ là tên thật.**

Kiểm và đếm:

```bash
node --experimental-strip-types scripts/kiem-nguoi-mua.ts
```

Script từ chối chạy nếu có gì trông như tên thật, email, hay số điện thoại — repo
này công khai.

## 7 · Cửa quyết định ngày 10/09

| Tín hiệu | Làm gì |
|---|---|
| ≥ 2 bên muốn xem SDK | Dồn sức hoàn thiện integration và pilot |
| Có phản hồi nhưng không ai muốn xem | Đọc `blockerTichHop`, chỉnh ICP hoặc định vị |
| Gần như không ai trả lời | Thu hẹp sang đội dApp/hackathon dễ tiếp cận hơn. **Không** tự kết luận "thị trường không có nhu cầu" từ 20 tin nhắn không hồi âm |
| Họ nói Blockaid/Phantom đủ dùng rồi | Định vị lại vào self-hosted / mã nguồn mở / tiếng Việt. **Không** công kích lựa chọn của họ |

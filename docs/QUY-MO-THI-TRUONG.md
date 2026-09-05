# Quy mô thị trường — bottom-up

**Tính ngày 05/09/2026** · script [`do-thi-truong.ts`](../scripts/do-thi-truong.ts) ·
số liệu [`data/thi-truong/quy-mo.json`](../data/thi-truong/quy-mo.json)

> **7 trên 8 biến trong mô hình này là GIẢ ĐỊNH.** Chỉ một biến tra được. Trang này
> nói ra điều đó ở dòng đầu thay vì giấu sau vẻ chính xác — một mô hình giấu giả
> định thì tệ hơn không có mô hình.

## 0 · Điều trang này KHÔNG làm

Không lấy tổng vốn hoá crypto, tổng TVL Solana, hay số ví trên chuỗi rồi nhân một
tỉ lệ. Cách đó ra số to và không nói lên gì: **Custos không bán cho thị trường
crypto, nó bán cho những đội có luồng ký giao dịch.** Đơn vị đếm ở đây là **đội**,
không phải đô-la lưu thông trên chuỗi.

## 1 · Kết quả

| | Đội | USD/năm |
|---|---:|---:|
| **TAM** thấp → cao | 500 → 1 327 | $120 000 → $1 592 220 |
| **SAM** thấp → cao | 9 → 143 | $2 160 → $171 960 |
| **SOM 12 tháng** thấp → cao | 0,2 → 12,6 | $36 → $15 120 |

Kịch bản gốc: **TAM 700 đội · SAM 34 đội · SOM 1,8 đội ≈ $1 058/năm**.

### Vì sao TAM nhỏ như vậy — và vì sao đội để nó nhỏ

TAM ở đây tính trên **một tập đếm được**: số app trong Solana dApp Store. Đó là
**cận dưới**, không phải toàn hệ sinh thái — nhiều dApp và ví không nằm trong store.

Đội **cố ý** không mở rộng nó bằng ước lượng. Một con số TAM lớn dựng từ giả định
chồng giả định không kiểm được, và giám khảo hỏi một câu là sập. Cận dưới đếm được
thì đứng vững.

## 2 · Từng biến, và nó đến từ đâu

| Biến | Thấp → Cao | Loại | Căn cứ |
|---|---|---|---|
| Số app trong Solana dApp Store | 1 000 → 1 561 | **NGUỒN** | [solana.com — ecosystem roundup 06/2026](https://solana.com/news/solana-ecosystem-roundup-june-2026): *"The Solana Mobile dApp Store crossed 1,000 apps"*, tra 05/09/2026. Cận cao 1 561 chỉ thấy ở nguồn thứ cấp nên **không** dùng làm số gốc |
| Tỉ lệ có luồng ký giao dịch | 50 % → 85 % | giả định | Không phải app nào cũng bắt ký. Chưa đếm được |
| Tỉ lệ chưa có đội security riêng | 60 % → 90 % | giả định | Ví lớn tự xây; app nhỏ thì không. **Đây là giả định buyer interview sẽ kiểm đầu tiên** |
| Tỉ lệ đội phục vụ Việt Nam / SEA | 3 % → 12 % | giả định | **Không tra được từ nguồn công khai nào** — store không phân loại theo khu vực đội phát triển. Dải rộng gấp bốn lần vì đó là mức không chắc chắn thật |
| ACV mỗi tháng | $20 → $100 | giả định | Neo vào [Helius Developer $49/tháng](https://www.helius.dev/pricing) (tra 30/08/2026). Đó là bằng chứng người mua **quen trả tiền hạ tầng theo tháng** — KHÔNG phải price validation cho Custos. Custos chưa có giá bán |
| Số đội tiếp cận được / 12 tháng | 30 → 120 | giả định | Năng lực thật của một đội 4 sinh viên. Chưa thử lần nào |
| Tỉ lệ phản hồi | 10 % → 35 % | giả định | Chưa gửi tin nhắn nào |
| Tỉ lệ phản hồi → trả tiền | 5 % → 30 % | giả định | Biến đội **không có dữ liệu nào**, kể cả gián tiếp |

## 3 · Biến nào quyết định kết quả

Đẩy từng biến về hai cận, giữ mọi biến khác ở gốc, xem SOM đổi bao nhiêu:

| Biến | SOM USD/năm |
|---|---|
| tỉ lệ phản hồi → trả tiền | $353 → $2 117 |
| ACV mỗi tháng | $432 → $2 160 |
| số đội tiếp cận được | $529 → $2 117 |

Cả ba đều là **giả định**, và cả ba đều đo được bằng cùng một việc: **đi nói chuyện
với người mua**. Đội đã quyết định không làm việc đó trong kỳ này — nên mô hình này
đứng nguyên ở mức giả định cho tới khi có ai đó chạy nó.

## 4 · Điều mô hình này thật sự nói

Ràng buộc của Custos **không phải quy mô thị trường**. Ngay ở kịch bản cao, SAM chỉ
143 đội. Ràng buộc là **năng lực tiếp cận**: 30–120 đội một năm, với tỉ lệ trả tiền
chưa ai đo.

Nghĩa là câu hỏi kinh doanh đúng cho Custos **không phải** *"thị trường có đủ lớn
không"* mà là *"một đội nhỏ có tiếp cận được người mua không, và họ có trả tiền
không"*. Hai câu đó chỉ trả lời được bằng người thật.

## 5 · Chạy lại

```bash
node --experimental-strip-types scripts/do-thi-truong.ts
```

Đổi biến thì sửa trong `scripts/do-thi-truong.ts` — mỗi biến bắt buộc khai `loai`
là `NGUON` hay `GIA_DINH` và một dòng căn cứ. Có test canh: không biến nào được
thiếu căn cứ, và biến khai `NGUON` phải kèm link.

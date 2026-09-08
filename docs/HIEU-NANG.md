# Hiệu năng — đo ở chỗ người dùng đứng

**Việc D03 của [`ROADMAP-CLAUDE.md`](../ROADMAP-CLAUDE.md).**

Repo đã có số đo độ trễ, nhưng chúng đo **Node gọi thư viện**. Người dùng không sống
ở đó: họ mở một trang, bấm một cái nút, và chờ một tấm thẻ hiện ra.

Trang này đo ba thứ đó, trên **bản dựng production**, và tách chúng ra vì chúng hỏng
vì lý do khác nhau.

---

## 1 · Hai tầng đo, đừng lẫn

| | Đo cái gì | Nguồn |
|---|---|---|
| **SDK** | `npm install` → kết quả đầu, một lượt `inspect()`, từng chặng blockhash/mô phỏng | `data/tich-hop/ket-qua.json` |
| **Trình duyệt** | tải trang, bấm → thẻ kết quả hiện ra, số lượt RPC mỗi lần kiểm | `data/hieu-nang/do-tre.json` |

Số của tầng dưới **không** thay được số của tầng trên. Một lượt `inspect()` 680 ms
không có nghĩa người dùng thấy kết quả sau 680 ms — còn tải bundle, dựng màn hình, và
những lượt RPC mà tầng SDK không đếm.

---

## 2 · Đo được

**Bản dựng production** (`vite build` + `vite preview`), Chromium headless, mạng thật
của máy chạy, không bóp băng thông.

### Tải trang

| | Nguội | Ấm |
|---|---|---|
| First Contentful Paint | **116 ms** | 92 ms |
| DOMContentLoaded | 60 ms | 42 ms |
| JS qua dây | **173 KB** (3 tệp) | 0 KB — cache |
| JS sau giải nén | **557 KB** | 557 KB |

*Nguội* = context trình duyệt mới, chưa cache gì. *Ấm* = tải lại trong cùng context.

557 KB sau giải nén là con số đáng nhìn: phần lớn nằm ở **một chunk 345 KB** —
`@solana/web3.js`. Đó là thứ tối ưu được, khác với độ trễ RPC vốn nằm ngoài tay đội.

### Bấm → thẻ kết quả hiện ra

Đo tới lúc **phần tử xuất hiện**, không phải tới lúc promise resolve: người dùng tin
vào thứ họ nhìn thấy.

| | |
|---|---|
| Trung vị | **~850 ms** |
| Cao nhất quan sát được | **6386 ms** |
| Lượt gọi RPC mỗi lần kiểm | **7** (trung vị), cao nhất **17** |

---

## 3 · Điểm ngoại lai là RETRY, không phải khởi động nguội

Đây là phần tôi suýt kết luận sai, và cách nó được sửa đáng ghi lại.

Lượt chạy đầu cho `[6926, 836, 839]` ms. Con số 6926 nằm ở lượt bấm **đầu tiên** —
vừa đủ để viết "khởi động nguội chậm vì bắt tay TLS với RPC". Tôi đã định viết đúng
câu đó.

Lượt chạy sau bác bỏ ngay: `[1348, 1347, 1354]`. Lượt đầu không chậm hơn chút nào.

Ghép thời gian với số lượt RPC của **cùng một lượt bấm** thì nguyên nhân thật hiện ra:

```
868/7 · 852/7 · 844/7 · 845/7 · 6386/17
```

Lượt chậm gấp bảy lần cũng là lượt gọi RPC gấp hơn hai lần. Ba lượt chạy đều cho cùng
hình dạng, và điểm ngoại lai rơi vào **vị trí khác nhau mỗi lần** — nên nó là RPC công
cộng trả lỗi rồi client thử lại, không phải khởi động nguội.

**Kết luận này chỉ rút ra được vì hai con số nằm cạnh nhau.** Hai danh sách rời nhau
chỉ cho biết *"có một lượt chậm"* và *"có một lượt gọi nhiều"*, không cho biết đó là
một.

> Hệ quả cho buổi demo: dùng RPC riêng, đừng dùng endpoint công cộng. `VITE_RPC` có
> sẵn cho việc đó — và từ U07 thì **cả hai app** đều nghe nó, trước đó chỉ ví nghe.

---

## 4 · Lỗi tìm ra khi dựng phép đo này

### `npm run preview` phục vụ một trang TRẮNG — và trả mã 200

`vite.config.ts` đặt base theo `command`:

```ts
base: command === "build" ? "/Custos-Solana/" : "/"   // TRƯỚC
```

`vite preview` chạy với `command === "serve"`. Nên nó nhận base `/` trong khi HTML đã
build trỏ `/Custos-Solana/assets/…`. Máy chủ không khớp đường dẫn nào, rơi hết xuống
SPA fallback, và trả `index.html` cho **mọi** file JS và CSS.

Trình duyệt từ chối chúng vì sai MIME, `#root` rỗng, trang trắng hoàn toàn.

**Không có gì báo lỗi.** Máy chủ trả 200. Tôi tự dính đúng cái bẫy đó: kiểm bằng
`Invoke-WebRequest`, thấy `200`, kết luận là ổn — phải đọc tới `Content-Length` mới
thấy cả ba file JS đều ra **859 byte**, đúng bằng `index.html`.

Sửa: `base: command === "build" || isPreview ? "/Custos-Solana/" : "/"`, cả hai app.

Hệ quả: cách **duy nhất** xem bản production trước khi deploy đã hỏng, và không ai
biết.

### Guard đầu tiên của chính bài đo cũng hỏng, theo đúng kiểu nó định chặn

Nó kiểm `byteJsQuaDay == 0`. Nhưng máy chủ đâu trả 0 byte — nó trả 859. Điều kiện
không bao giờ đúng, và dòng in ra còn ghi *"0 KB"* vì `859 // 1024 == 0`: con số duy
nhất lộ ra sự thật lại bị phép chia làm tròn mất.

Nay guard hỏi thẳng thứ cần biết: **React có mount không** (`#root` có nội dung
không), cộng một ngưỡng byte rộng rãi. Đừng hỏi *"có bằng 0 không"*, hỏi *"có đủ
không"* — và tốt hơn cả là hỏi đúng thứ mình quan tâm.

---

## 5 · Chưa đo

Ghi ra để không ai đọc mục 2 thành một bức tranh đầy đủ.

| Chưa đo | Vì sao |
|---|---|
| **p95** | 5 mẫu không đỡ nổi một con số p95; in nó ra chỉ để trông giống báo cáo hiệu năng thật |
| **Mạng bị bóp** (3G/4G) | chưa dựng cấu hình throttle; mọi số ở đây là mạng thật của máy dev |
| **Thiết bị thật** | Chromium headless trên máy dev, không phải điện thoại |
| **Trang phỏng vấn và trang số liệu** | mới đo trang ví |

Chưa tối ưu gì cả: D03 nói *"chỉ tối ưu sau khi xác định nút thắt"*, và nút thắt vừa
mới xác định được ở mục 3. Chunk 345 KB là ứng viên rõ ràng tiếp theo, nhưng tách nó
ra là một thay đổi có rủi ro hồi quy riêng — không gộp vào việc dựng phép đo.

Không có cache verdict nào trong sản phẩm, nên ràng buộc *"không cache verdict giữa
các giao dịch khác nhau"* thoả theo cấu tạo, không phải nhờ một guard.

---

## 6 · Tái lập

```bash
npm run build -w @custos-solana/demo-wallet
npm run preview -w @custos-solana/demo-wallet -- --port 4173 --strictPort
python scripts/kiem-trinh-duyet/soi-do-tre.py
```

Bài đo **dừng ngay** nếu trang không dựng được, thay vì ghi số của một trang trắng
vào bằng chứng.

# Mutation — bảy ranh giới, và hai chỗ không ai canh

**Việc TB-B04.** Biên bản máy đọc được: [`data/benchmark/mutation-b04.json`](../../data/benchmark/mutation-b04.json).

Nghiệm thu thẻ đòi đúng một việc, và nó không phải viết thêm test:

> *"ít nhất một mutation tiêu biểu ở từng ranh giới trọng yếu làm bài kiểm liên quan
> đỏ; ghi kết quả rồi hoàn nguyên mutation. Không đưa mutation vào bản sản phẩm hoặc
> **đặt quota số test để lấy điểm**."*

Nên câu hỏi của trang này hẹp: **609 bài kiểm đó có thật sự canh được gì không, hay
chúng chỉ đang xanh?**

---

## 1 · Cách đo

Bảy ranh giới trọng yếu, mỗi cái sửa **một** dòng trong mã sản phẩm, chạy trọn bộ
test, rồi hoàn nguyên. Script tự kiểm ba điều trước khi tin kết quả — vì cả ba đều đã
sai ít nhất một lần trong repo này:

| Kiểm | Vì sao |
|---|---|
| chuỗi cũ **có thật** trong file | mutation gõ sai chuỗi thì không sửa gì, và "không bài nào đỏ" thành kết luận giả |
| file trên đĩa **thật sự đổi** sau khi ghi | đã mắc 3 lần: shell nuốt backtick, mutation không bao giờ chạm file |
| file **về đúng byte cũ** sau khi hoàn nguyên | một ca hoàn nguyên hụt để lại `if (false)` trong engine luật, và bộ test vẫn xanh |

---

## 2 · Kết quả

| Mã | Ranh giới | Mutation | Bài đỏ |
|---|---|---|---|
| **FS1** | fail-safe 1 — mô phỏng hỏng | `if (!facts.simulationOk)` → `if (false)` | **2** |
| **FS2** | fail-safe 2 — chưa đọc hiểu mà chạm tài sản | tắt nhánh | **1** |
| **FS3** | fail-safe 3 — ALT không giải được | tắt nhánh | **0 → 1** |
| **FS4** | fail-safe 4 — account không đo được trạng thái sau | tắt nhánh | **3** |
| **CAO** | `caoHon()` — verdict chỉ được NÂNG | `>=` → `<=` | **56** |
| **LVL** | `level` chỉ do L2 sinh | cho L3 chạm vào | **3** |
| **EXP** | `expectedAction` bất đối xứng | `!==` → `===` | **1 → 2** |

**5/7 ngay từ đầu. Hai ô còn lại là phần đáng giá của thẻ này.**

`caoHon()` đỏ **56 bài** — nó là xương sống của mọi verdict, và con số đó nói rằng bộ
test phủ nó dày. Nhưng một ranh giới đỏ 56 bài và một ranh giới đỏ 0 bài nằm cạnh nhau
trong cùng một file, và không có cách nào biết điều đó ngoài việc đo.

---

## 3 · FS3 — fail-safe ALT: mã chạy đúng, không bài nào chứng minh

Tắt hẳn fail-safe 3 mà **không một bài nào trong 609 bài đỏ**.

`l2.test.ts` có sẵn một bài tên *"FAIL-SAFE — lookup table không giải được thì không
bao giờ ra safe"*, và nó vẫn xanh. Lý do không phải fail-safe 3 thừa — đo trực tiếp:

```
Facts chỉ có ALT chưa giải  →  level: warning, reasonCodes: ["ALT_KHONG_GIAI_DUOC"]
```

Mã lý do đó đến từ **luật 10**, không từ fail-safe. Hai lớp bắt cùng một điều kiện
(`lookupTables.some(!resolved)`), nên bài kiểm xanh dù lớp nào làm việc cũng được — nó
không phân biệt được.

Hai lớp không thừa: luật 10 phát **mã lý do** để giao diện giải thích được; fail-safe 3
là **lưới cuối**, chạy kể cả khi tập luật bị thay. Chứng minh bằng cách bỏ luật 10 ra:

```
danhGia(facts, LUAT.filter(l => l.id !== 10))  →  level: warning, reasonCodes: []
```

`reasonCodes` rỗng ⇒ không luật nào phát mã ⇒ `warning` chỉ có thể đến từ fail-safe.
Bài mới `FAIL-SAFE 3 tự đứng được, KHÔNG dựa vào luật 10` neo đúng vào đó, kèm ca âm
(bảng giải được ⇒ `safe`). Mutation lại: **1 bài đỏ**.

---

## 4 · EXP — quy tắc bất đối xứng chỉ canh được một chiều

Đảo `!==` thành `===` — tức lật ngược hoàn toàn quy tắc bất đối xứng — chỉ làm **một**
bài đỏ: *"expectedAction LỆCH ⇒ nâng nghi ngờ"*.

Bài *"KHỚP ⇒ KHÔNG tắt cảnh báo nào"* vẫn xanh, vì nó đặt sẵn
`aiAdvisory: "review_required"` từ L3 rồi assert rằng cảnh báo đó còn đó. Quy tắc đảo
ngược không làm cảnh báo biến mất, nên hai assert vẫn đúng.

Thứ phân biệt được là `loiKhaiLech` — trường **chỉ** được đặt khi lời khai lệch, và nó
có mặt trong `InspectResult`. Khai **khớp** mà trường này xuất hiện nghĩa là Custos
đang tố một dApp trung thực: đúng chiều sai mà quy tắc bất đối xứng tồn tại để chặn.
Thêm một assert `loiKhaiLech === undefined`. Mutation lại: **2 bài đỏ**.

> **Hai ca vá không giống nhau, và biên bản giữ nguyên sự khác nhau đó.** FS3 trước khi
> vá: **0** — không ai canh. EXP: **1** — có canh, nhưng chỉ một chiều. Gộp cả hai
> thành "0 bài đỏ" sẽ nói quá mức hỏng của EXP; gộp thành "đã có canh" sẽ giấu mất FS3.

---

## 5 · Năm phép biến đổi của thẻ — đều đã có, kiểm lại chứ không viết thêm

| Phép biến đổi | Bài kiểm |
|---|---|
| đổi symbol không đổi verdict | `ten-token.test.ts` — *KÝ HIỆU ĐỘC từ người phát hành token bị chặn y như từ dApp* |
| lời khai khớp không hạ mức | `inspect.test.ts` — *expectedAction KHỚP ⇒ KHÔNG tắt cảnh báo nào* |
| AI hỏng không đổi L2 | `inspect.test.ts` — *L3 NÉM LỖI cũng không được làm sập lượt kiểm tra* |
| mất account không làm an toàn hơn | `do-khuyet.test.ts` — *account thứ 101 trở đi KHÔNG được biến mất âm thầm* |
| nhiều signer cần đúng đối tượng | `sol.test.ts` — *dApp trả phí, người dùng là signer khác ⇒ KHÔNG được safe* |

Thẻ nói *"tái sử dụng ca đã có khi đủ mạnh"*, và cả năm đều đủ mạnh. **Không bài nào
được viết thêm cho đủ số** — hai bài mới ở mục 3 và 4 sinh ra từ lỗ mà mutation lộ ra,
không từ một bảng cần tích đủ ô.

Thẻ cũng cấm reorder instruction tuỳ tiện, và repo không có phép biến đổi nào làm vậy:
thứ tự instruction đổi được hành vi thật, nên "đổi thứ tự mà verdict giữ nguyên" là một
kỳ vọng sai chứ không phải một bất biến.

---

## 6 · Fuzz — seed có tác dụng thật

Thẻ đòi *"seed cố định, thu nhỏ ca lỗi, thêm vào bộ hồi quy"*. Hai vế đầu đã có từ
TB-S02. Vế thứ ba thì chưa: `fuzz-s02.ts` và bốn probe không có lệnh npm nào, tức chỉ
chạy được bằng cách gõ đường dẫn tay. Nay có `npm run doi-khang` (~3,0 s) chạy cả năm.

Và "seed cố định" không phải nhãn trống — đo bằng cách ghi lại từng số ngẫu nhiên sinh
ra:

| Seed | Số lần gọi rnd | 12 số đầu |
|---|---|---|
| 1 | 795.574 | `8,0,135,251,247,71,156,184,109,254,116,125` |
| 42 | 794.020 | `8,114,218,171,44,134,69,159,221,120,63,225` |

Số **lượt kiểm** giữ nguyên 4031 ở mọi seed — vòng ngoài là `for (i < 4000)` cộng các
ca cố định — nhưng **dữ liệu** sinh ra khác hẳn. Bốn seed đã thử (1, 42, 20260912,
20260914) đều 0 vi phạm.

---

## 7 · Điều trang này KHÔNG nói

- **Không nói bộ test đủ.** Mutation chứng minh bảy ranh giới **có** bài canh; nó không
  nói gì về những ranh giới chưa ai nghĩ tới. Một mutation score thật cần công cụ quét
  toàn bộ mã, và repo chưa chạy cái đó.
- **Không nói 619 test là thước đo.** Thẻ cấm đặt quota số test, và con số đó không
  xuất hiện ở đây như một thành tích.
- **Không có mutation nào còn trong mã sản phẩm.** Mỗi ca hoàn nguyên ngay sau khi đo,
  xác minh bằng so sánh byte; `doiKhangB04.test.ts` canh lại điều đó bằng cách đọc từng
  chuỗi ranh giới và bắt mọi `if (false)` còn sót.

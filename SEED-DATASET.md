# Seed evaluation dataset — quy cách và danh sách phải đi tìm

**Chủ sở hữu: vai D** (thu thập, gắn nhãn) · **vai A** dùng làm bộ test cho engine luật · bắt đầu **22/08**, xong **29/08**

`CUSTOS.md` và kế hoạch đã chốt con số **25 mẫu**, nhưng chưa nói **đi tìm cái gì**. Tài liệu này biến "thu thập 25 mẫu" thành một danh sách 25 dòng, mỗi dòng có mô tả cụ thể phải tìm.

---

## 0 · Một điều phải quyết đúng ngay từ đầu

> **Tỉ lệ false positive chỉ có ý nghĩa khi đo trên giao dịch thật.**

Nếu cả 25 mẫu đều do đội tự dựng trên devnet, con số false positive công bố trên sân khấu **không nói lên điều gì** — đội tự tạo đầu vào rồi tự đo đầu ra. Một giám khảo hỏi *"mẫu an toàn của các bạn lấy từ đâu?"* là toàn bộ phần bằng chứng sụp.

Nên mỗi mẫu **bắt buộc** ghi nguồn gốc, và có ba loại:

| `provenance` | Nghĩa | Dùng để |
|---|---|---|
| `real-mainnet` | Giao dịch thật trên mainnet, lấy từ Explorer | **Đo false positive.** Đây là loại có giá trị nhất |
| `real-devnet` | Giao dịch thật trên devnet của người khác | Bổ sung |
| `synthetic-devnet` | Đội tự dựng trên devnet | Kiểm thử đơn vị cho luật. Hợp lệ, nhưng **không được tính vào tỉ lệ false positive** |

**Ràng buộc cứng:** nhóm mẫu **an toàn** phải có **ít nhất 6 mẫu `real-mainnet`**. Mẫu nguy hiểm được phép `synthetic-devnet` — vì để kích hoạt một luật thì đầu vào do ta dựng vẫn kiểm tra đúng thứ cần kiểm tra.

**Cách công bố trên sân khấu:**
> *"12 luật, 25 mẫu kiểm thử. Tỉ lệ báo nhầm đo trên 10 giao dịch mainnet thật: X/10."*

Không gộp mẫu tự dựng vào con số đó.

---

## 0b · Kết quả đo thật — cập nhật 21/08 sau khi hoàn thiện 8 luật

`scripts/do-bao-nham.ts` — giao dịch SPL Token mainnet lấy ngẫu nhiên, không chọn lọc.

| Chỉ số | 20 mẫu (8 luật) | 15 mẫu (đủ 9 luật) |
|---|---|---|
| Verdict **Đỏ** sai | **0** | **0** |
| Cảnh báo **về chính giao dịch** *(con số đáng lo)* | 1 | **0** |
| Chỉ là thuộc tính token / chưa đọc hiểu | 19 | 14 |
| Ra **Bình thường** | 0 | **1** |
| Coverage trung bình | 3–10 % | 10 % |

### Phân biệt quan trọng nhất: thuộc tính vs hành vi

| Loại | Ví dụ | Nói gì | Giọng giao diện |
|---|---|---|---|
| **Thuộc tính** | `PROGRAM_CHUA_XAC_MINH`, `MINT_AUTHORITY_CHUA_THU_HOI`, `TOKEN2022_PERMANENT_DELEGATE` | *"token này có đặc điểm X"*, *"chúng tôi chưa đọc hiểu Y"* | thông tin |
| **Hành vi** | `SPL_SET_AUTHORITY__*`, `OUTFLOW_KHONG_KHOP`, `VI_NHAN_MOI_TAO` | *"giao dịch này đang làm X với bạn"* | báo động |

Gộp hai loại là cách nhanh nhất tạo mệt mỏi cảnh báo: `PROGRAM_CHUA_XAC_MINH` kích hoạt **11/12** giao dịch mainnet, vì chương trình DEX thật sự có ghi vào tài khoản người dùng và đội chưa viết decoder. Điều đó **đúng**, nhưng báo động cho nó thì Custos kêu ở mọi giao dịch.

`level` không đổi vì phân biệt này. Chỉ **giọng** đổi. Xem `MA_THONG_TIN` trong `packages/core/src/constants.ts`.

### Hai luật đã sửa nhờ đo thật

**Fail-safe theo coverage** — cũ: *"chưa đọc hiểu hết ⇒ cảnh báo"*, cho ra 15/15. Mới: *"chưa đọc hiểu hết **và** phần đó ghi được vào tài khoản người ký"*. Mô hình tài khoản Solana bảo đảm vế sau là điều kiện đủ — một instruction chỉ sửa được account nó khai writable, kể cả qua CPI.

**Luật 11 (outflow)** — cũ gắn cờ **mọi giao dịch gửi tiền**, hành vi thường gặp nhất của một cái ví. Đo thật: đây là cáo buộc sai duy nhất trong 12 mẫu. Mới: chỉ kích hoạt khi **nhiều loại tài sản cùng rời ví** — không có hành động bình thường nào cần làm vậy. Một khoản ra duy nhất thì bảng chênh lệch đã hiển thị rồi.

### Cách đọc con số cho đúng trên sân khấu

- **0 báo Đỏ sai trên 20 giao dịch mainnet thật** — nói được.
- Mẫu ngẫu nhiên **không bảo đảm** mọi mẫu đều lành tính. Không có Đỏ nghĩa là không cờ nào bật, **không** chứng minh cả 20 cái đều sạch.
- **Coverage 3–10 %** — phải nói ra. Custos chưa đọc hiểu phần lớn giao dịch DeFi, và nó nói thẳng điều đó thay vì giả vờ hiểu.

### Việc còn lại để coverage khá hơn

Viết decoder cho các chương trình DEX phổ biến. Đó là công việc tích luỹ — đúng thứ đã ghi là moat ở `CUSTOS.md` mục 09. **Không được mở rộng danh sách "đã xác minh" cho chương trình đội chưa decode** — làm vậy là thổi phồng coverage.

---

## 0c · Bộ dữ liệu đã dựng — trạng thái 21/08

**23 mẫu**, chạy tự động qua `packages/core/test/dataset.test.ts` (offline, tất định).

| Nguồn | Số mẫu | Dùng để |
|---|---:|---|
| `synthetic-devnet` | 13 | Kiểm thử từng luật. **Không** vào mẫu số báo nhầm |
| `real-mainnet` | 10 | **Đo báo nhầm** |

**Cả 9 luật đều đã được phủ:** 1, 2, 3, 4, 6, 8, 9, 11, 12. Bộ test tự in ra luật nào còn thiếu thay vì im lặng.

### Vì sao lưu `Facts` chứ không chỉ lưu giao dịch

Mô phỏng lại một giao dịch phụ thuộc **trạng thái chuỗi tại thời điểm chạy**. Diễn demo một lần là trạng thái đổi, và bộ test sẽ đỏ vì lý do chẳng liên quan tới luật. Đóng băng `Facts` — đầu ra của L1 — làm bộ test **tất định và chạy được offline**. Giao dịch gốc vẫn lưu kèm trong `data/seed/tx/` để tra lại.

### Bộ dữ liệu đã bắt được lỗi thật

**Luật 4** từng có nhánh nâng lên Đỏ khi thấy *"số dư người ký giảm + có lệnh transfer"*. Mẫu `R04-pos` làm nó đỏ — vì đó cũng chính xác là hình dạng của **một giao dịch chuyển tiền hợp lệ**. Mọi lần chuyển một token có permanent delegate đều sẽ bị gắn Đỏ.

Phân biệt đúng nằm ở tài khoản `authority` của chính lệnh `Transfer`, mà `Facts` hiện chưa bóc. Nên luật 4 **luôn ở mức Vàng** cho tới khi L1 ghi được trường đó. Cảnh báo đúng vẫn hơn cáo buộc sai.

**Luật 12** không kích hoạt được trên chuỗi thật, vì bộ lọc account của L1 chỉ theo dõi tài khoản token và ví người ký — trong khi `SystemProgram.assign` tác động lên account **thường**. Đã sửa: L1 theo dõi **mọi account writable**, ưu tiên ví người ký và tài khoản token trước nếu chạm trần RPC.

### Con số hiện tại trên 10 mẫu mainnet thật

| | |
|---|---|
| Gắn **Đỏ** | **0** |
| Cáo buộc về chính giao dịch | 1 *(có link Explorer trong log test để soi tay)* |

---

## 1 · Định dạng

Mỗi mẫu là một bản ghi trong `dataset/index.json`, kèm một file fixture giao dịch đã serialize trong `dataset/fixtures/`.

```jsonc
{
  "id": "R01-pos",
  "rule": 1,                          // luật nào đang được kiểm
  "polarity": "positive",             // positive | negative | insufficient
  "provenance": "synthetic-devnet",   // real-mainnet | real-devnet | synthetic-devnet
  "source": "https://explorer.solana.com/tx/…?cluster=devnet",
  "fixture": "fixtures/R01-pos.base64",
  "attackType": "spl-set-authority-account-owner",
  "riskyInstructionIndex": 7,         // null nếu không có
  "expected": {
    "level": "danger",                // verdict L2 kỳ vọng
    "reasonCodes": ["SPL_SET_AUTHORITY__ACCOUNT_OWNER"],
    "minCoverageRatio": 0.9           // kỳ vọng hiểu được ít nhất bao nhiêu phần
  },
  "evidence": "Instruction #7 gọi SetAuthority với authorityType = AccountOwner, đổi chủ sở hữu ATA của người ký sang ví lạ. Xem log mô phỏng.",
  "labeledBy": "D",
  "labeledAt": "2026-08-23"
}
```

**Vì sao lưu fixture chứ không chỉ lưu link:** giao dịch mainnet có thể bị RPC lược bớt lịch sử, và blockhash hết hạn. Fixture đã serialize giúp bộ test chạy lại được bất cứ lúc nào, kể cả offline lúc chấm.

**Quy tắc gắn nhãn — không đoán:**
- Không chứng minh được là độc hại ⇒ **không gắn nhãn độc hại**. Cho vào nhóm `insufficient`.
- Trường `evidence` phải nói *vì sao*, không được viết "trông đáng ngờ".
- Một người gắn nhãn, một người khác đọc lại. Bất đồng thì hạ xuống `insufficient`.

---

## 2 · Danh sách 25 mẫu phải đi tìm

Mỗi luật cần **một ca kích hoạt** và **một ca trông giống nhưng không được kích hoạt**. Đây là chỗ giá trị thật của bộ dữ liệu: ca âm tính mới là thứ ngăn sản phẩm gắn cờ bừa.

### Nhóm A — 12 ca dương tính (luật phải kích hoạt)

| ID | Luật | Phải tìm / dựng gì | Verdict kỳ vọng |
|---|---:|---|---|
| `R01-pos` | 1 | Tx có `SetAuthority` đổi `AccountOwner` của ATA người ký sang ví khác | Đỏ |
| `R02-pos` | 2 | Tx gán `CloseAccount` hoặc `Freeze` authority cho bên thứ ba | Đỏ |
| `R03-pos` | 3 | Tx `Approve` delegate với hạn mức `u64::MAX` hoặc lớn bất thường | Đỏ |
| `R04-pos` | 4 | Token-2022 có Permanent Delegate **và chính PD đó** transfer/burn tài khoản người dùng trong tx | Đỏ |
| `R05-pos` | 5 | Token-2022 có Transfer Hook trỏ tới program chưa xác minh | Vàng |
| `R06-pos` | 6 | Token có mint authority chưa thu hồi | Vàng |
| `R07-pos` | 7 | Token có freeze authority còn hoạt động | Vàng |
| `R08-pos` | 8 | Tx gửi giá trị lớn tới ví mới tạo dưới 24 giờ | Vàng |
| `R09-pos` | 9 | Tx gọi program không nằm trong danh sách đã xác minh | Vàng |
| `R10-pos` | 10 | Tx dùng ALT có địa chỉ không resolve được hoặc trỏ tới program chưa xác minh | Vàng |
| `R11-pos` | 11 | Tx có outflow ở tài sản/khối lượng không khớp các leg còn lại | Vàng |
| `R12-pos` | 12 | Tx dùng `SystemProgram.assign` đổi owner account của người ký | Đỏ |

> `R12-pos` là ca quan trọng nhất trong nhóm này — nó là vector đã từng qua mặt mô phỏng của Blowfish (xem `NGHIEN-CUU-21-08.md` mục 2). Ưu tiên tìm giao dịch **thật** cho ca này.

### Nhóm B — 10 ca âm tính (luật **không** được kích hoạt)

**Tối thiểu 6 ca phải là `real-mainnet`.**

| ID | Đối chiếu luật | Phải tìm gì — và vì sao nó dễ bị báo nhầm |
|---|---:|---|
| `R01-neg` | 1 | `SetAuthority` **hợp lệ**: chủ dự án tự thu hồi mint authority của chính mình. Cùng instruction, ý nghĩa ngược lại |
| `R03-neg` | 3 | `Approve` delegate hạn mức **đúng bằng** số tiền của giao dịch — hành vi chuẩn của nhiều dApp |
| `R04-neg` | 4 | Token-2022 **có** Permanent Delegate nhưng tx chỉ là chuyển khoản thường, PD không tham gia. **Luật 4 chỉ được ra Vàng, không được Đỏ** |
| `R05-neg` | 5 | Token-2022 có Transfer Hook thuộc program **đã xác minh** — năng lực hợp lệ, không phải honeypot |
| `R08-neg` | 8 | Chuyển tới ví mới tạo nhưng **giá trị nhỏ** — người dùng vừa tạo ví phụ cho chính mình |
| `R10-neg` | 10 | Một swap Jupiter **thật trên mainnet** dùng ALT bình thường — ALT là kỹ thuật phổ biến, đây là ca kiểm tra ta không gắn cờ bừa |
| `R11-neg` | 11 | Chuyển khoản đơn giản: số dư người gửi giảm, không có leg nhận lại. **Đây từng là lỗi thật của luật 11 ở bản v3** |
| `SAFE-01` | — | Một swap mainnet thật, nhiều instruction, hoàn toàn lành tính |
| `SAFE-02` | — | Stake SOL vào validator |
| `SAFE-03` | — | Mua NFT trên marketplace phổ biến |

### Nhóm C — 3 ca không đủ dữ liệu

| ID | Phải dựng gì | Kỳ vọng |
|---|---|---|
| `INS-01` | Tx gọi program lạ, không decode được instruction | `warning` + coverage < 1.0, **không bao giờ** `safe` |
| `INS-02` | Tx mà mô phỏng thất bại hoặc trả lỗi | `warning`, giao diện nói rõ không phân tích được |
| `INS-03` | Tx phần lớn hiểu được nhưng còn 1 instruction lạ | `warning` + coverage kiểu 10/11, đúng như ảnh dựng ở `CUSTOS.md` mục 03 |

> Nhóm C là nhóm chứng minh trục khác biệt mới của sản phẩm — *"Custos nói cho bạn biết phần nào nó chưa hiểu"*. Đừng coi nó là nhóm phụ.

---

## 3 · Lấy mẫu ở đâu

| Nguồn | Dùng cho | Ghi chú |
|---|---|---|
| Solana Explorer / Solscan — lọc theo instruction type | `real-mainnet`, cả dương lẫn âm tính | Nguồn chính cho nhóm B |
| Báo cáo bảo mật công khai, bài mổ xẻ vụ drainer | `real-mainnet` dương tính | Thường có sẵn chữ ký giao dịch để tra |
| Nhóm cộng đồng crypto Việt Nam | Ca thật người Việt gặp | Đây là loại có giá trị lâu dài nhất — hỏi xin chữ ký giao dịch, không xin seed phrase |
| Tự dựng trên devnet | `synthetic-devnet` dương tính | Nhanh, hợp lệ để test luật. Không tính vào false positive |

> **Cảnh báo an toàn khi thu thập:** chỉ xin **chữ ký giao dịch** hoặc **địa chỉ ví công khai**. Không bao giờ hỏi seed phrase, private key, hay yêu cầu ai ký gì. Nếu ai đó chủ động gửi khoá, dừng lại và bảo họ chuyển tài sản đi.

---

## 4 · Cổng kiểm tra

| Mốc | Yêu cầu | Nếu không đạt |
|---|---|---|
| **25/8** | ≥ 8 mẫu, trong đó ≥ 2 `real-mainnet` | Dồn thêm người sang giúp D |
| **27/8** | ≥ 16 mẫu, đủ cả 3 nhóm | Cắt mục tiêu xuống 18 mẫu |
| **29/8** | 25 mẫu, ≥ 6 mẫu âm tính là `real-mainnet` | Nộp đúng con số thật |
| **1/9** | Dưới 15 mẫu | **Công bố đúng số thật.** Thể lệ BTC: trình bày sai mức hoàn thiện bị trừ điểm hoặc loại |

---

## 5 · Liên hệ với engine luật

Kế hoạch 15 ngày cắt xuống **8 luật** để kịp: 1, 2, 3, 4, 6, 8, 9, 11 — nay nên thêm **12** vì nó rẻ và đóng một vector có tài liệu, thành **9 luật**.

Nghĩa là ở bản thi, nhóm A cần **9 ca dương tính** chứ không phải 12; các ca của luật 5, 7, 10 vẫn nên thu thập nhưng để ở P1.

**Quy tắc đã chốt trong kế hoạch:** *một luật chưa có ca dương tính và ca âm tính tương ứng thì chưa tính là xong.* Bộ dữ liệu này chính là định nghĩa của chữ "xong".

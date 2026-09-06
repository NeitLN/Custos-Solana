# Phát hành `@custos-solana/ai@0.2.0`

**Trạng thái: `BLOCKED — OWNER ACTION`.** Mọi việc chuẩn bị đã xong và đã kiểm; bước
`npm publish` cần quyền npm của chủ dự án. Claude không tự chạy nó.

---

## 1 · Vì sao việc này gấp

`npm run thu-goi-registry` đo trên chính gói đang phục vụ (`ai@0.1.2` + `core@0.1.1`):

| | |
|---|---|
| Bẫy đối kháng bị chặn | **1/10** |
| Lời bịa **tới được người dùng** | **9/10** |
| Bẫy làm đổi `level` | **0/10** |

Người cài hôm nay nhận bản để địa chỉ ví bịa, số token bịa, câu đảo chiều dòng tiền
và câu *"…hãy ký ngay"* đi thẳng tới màn hình trước nút Ký.

Con số thứ ba phải đọc kèm: **engine luật tất định không hề bị chạm.** Lớp neo bảo vệ
lời văn, không bảo vệ verdict. Đừng nói quá thành *"AI hạ được cảnh báo"*.

Cùng bộ bẫy trên gói đóng từ mã hiện tại: **10/10 chặn**, kèm đối chứng dương.

---

## 2 · Đã kiểm trước khi phát hành

| Hạng mục | Kết quả |
|---|---|
| Phiên bản ba gói | `types@0.1.1` · `core@0.1.1` · `ai@0.2.0` |
| `core`/`types` có cần phát hành lại? | **Không** — bốn lớp neo nằm hết trong `ai`; `core` truyền sẵn `facts` và `reasonCodes` cho lớp diễn giải |
| Nội dung tarball | `dist/` · `README.md` · `LICENSE` — không thừa file nào |
| `exports` | `.` và `./anthropic`, mỗi lối vào có `types` + `default` |
| Bảy neo trong `dist` | `dungNeo` · `DIA_CHI_DAY_DU` · `DIA_CHI_VIET_TAT` · `neoHanhDong` · `nguocChieu` · `noiQuaMaLyDo` · `huongTaiSanNguoiKy` |
| Khoá / đường dẫn máy / source map | **không có** |
| Entry mặc định kéo SDK Anthropic? | **Không** — chỉ 8 lệnh import, không lệnh nào chạm `@anthropic-ai/sdk` |
| `@anthropic-ai/sdk` | peer dependency, `optional: true` |
| Mười bẫy trên tarball local | **10/10 chặn** + đối chứng dương |

Lệnh dựng lại toàn bộ bảng trên:

```bash
npm run thu-goi                 # đóng gói + 10 bẫy trên bản vừa đóng
npm pack --dry-run -w @custos-solana/ai
node scripts/dong-goi-sdk.mjs /tmp/pack && tar -tzf /tmp/pack/custos-solana-ai-0.2.0.tgz
```

---

## 3 · Việc chủ dự án cần làm

```bash
# 1. Đăng nhập (Claude không dùng token/OTP của bạn)
npm whoami || npm login

# 2. Dựng tarball từ mã hiện tại rồi phát hành ĐÚNG gói ai
npm run publish-sdk

# 3. Xác minh registry đã đổi
npm view @custos-solana/ai version        # phải in 0.2.0

# 4. NGHIỆM THU — chạy lại mười bẫy trên gói VỪA PHÁT HÀNH
npm run thu-goi-registry                  # phải in: chặn được 10/10
```

Bước 4 là bước quyết định. Nó cài từ registry vào một project trống, không dùng
`file:` và không dùng `overrides`, nên nó đo đúng thứ người ngoài nhận được.

**Chỉ sau khi bước 4 xanh** mới được đổi tài liệu sang hướng dẫn `npm install`. Cho
tới lúc đó mọi nơi phải nói *"cài từ tarball vừa đóng gói"* — có guard chặn câu
*"cài SDK từ npm"* trong pitch.

---

## 4 · Deprecate `0.1.2` — cân nhắc riêng, không làm cùng lúc

Sau khi `0.2.0` đã lên và nghiệm thu xanh, có thể đánh dấu bản cũ:

```bash
npm deprecate @custos-solana/ai@0.1.2 \
  "Thiếu bốn lớp neo grounding; hãy dùng >=0.2.0"
```

Đây là hành động **không hoàn tác được bằng một lệnh** và hiện lên với mọi người cài
gói. Nó cần quyết định riêng của chủ dự án, không gộp vào bước phát hành.

---

## 5 · Điều KHÔNG được làm

- Không đổi README sang `npm install @custos-solana/ai@0.2.0` trước khi bước 4 xanh.
- Không nói *"đã publish"* trong bất kỳ tài liệu nào cho tới khi `npm view` trả `0.2.0`;
  ô `Registry khớp source` trong `npm run kiem-san-pham` là nơi đọc trạng thái thật.
- Không phát hành lại `core`/`types` nếu mã của chúng không đổi — hai bản `0.1.1`
  trên registry đã được xác minh trùng khớp với nguồn.

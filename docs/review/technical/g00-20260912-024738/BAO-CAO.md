# TB-G00 — Xác minh baseline và giữ bằng chứng gốc

**runId:** `g00-20260912-024738` · **HEAD:** `780cf6d5408c031a852ac1fec371bbc5c9dc3207`
(khớp baseline của [review 12/09](../../DANH-GIA-TECHNICAL-12-09-2026.md), không phải chép lại kết luận cũ)

**Phạm vi lượt này:** offline + typecheck + unit test. **Chưa chạy:** browser suite, Devnet live, build hai app.
Ghi đúng như vậy thay vì suy ra từ lượt trước.

---

## 1 · Môi trường

| | |
|---|---|
| Node | v24.12.0 |
| npm | 11.6.2 |
| OS | Windows 11 Home Single Language 10.0.26200.0 |
| AGENTS.md | **không có** trong repo này (chỉ `CLAUDE.md`) |
| Working tree lúc bắt đầu | sạch, trừ hai file chưa commit của chủ dự án: `docs/roadmap/ROADMAP-TECHNICAL-CUSTOS.md` và `docs/review/DANH-GIA-TECHNICAL-12-09-2026.md` — **giữ nguyên, không đụng** |

## 2 · T01–T04 còn đúng hay đã được sửa

Bốn lỗi đều **còn nguyên** ở bản mã này. Không cái nào đã được sửa trong lúc chờ.

### T01 · T02 — tái hiện bằng hàm sản xuất

`scripts/ky-thuat/probe-gui-t01-t02.ts` gọi thẳng `guiGiaoDich()` với stub trong tiến
trình: không mạng, không ký, không gửi. Log: [`probe-gui-truoc-sua.log`](probe-gui-truoc-sua.log).

**Baseline: 2/5 ca nói đúng sự thật.**

| Ca | Tình huống | Thực tế | Đúng phải là |
|---|---|---|---|
| T01-a | xác nhận về, `err: null` | `thanhCong` | `thanhCong` ✅ |
| **T01-b** | xác nhận về, `err: InstructionError` | **`thanhCong`** | thất bại xác nhận |
| **T01-c** | response **sai cấu trúc** (không có `value`) | **`thanhCong`** | `chuaRo` |
| T02-a | ném lỗi **trước** khi gửi | `thatBai` | `thatBai` ✅ |
| **T02-b** | RPC nhận request rồi **mất phản hồi** | **`thatBai`** | `chuaRo` |

Nguyên nhân đọc được trong [`gui.ts`](../../../../apps/demo-wallet/src/gui.ts):

- dòng 70 `await t.conn.confirmTransaction(...)` **vứt giá trị trả về**, dòng 73 trả
  thẳng `thanhCong` ⇒ T01-b và T01-c
- `sig` chỉ được gán **sau** khi `sendTransaction` trả về ⇒ mất phản hồi thì `sig`
  vẫn `null`, rơi vào nhánh `thatBai` ⇒ T02-b

> **T01-c là ca báo cáo review chưa nêu, và nó nặng hơn T01-b.** Hàm không đọc
> response nên **bất kỳ** giá trị nào cũng thành `thanhCong` — kể cả `{khong: "dung
> hinh dang"}`. Tức lỗi không nằm ở chỗ "quên kiểm `err`", mà ở chỗ *chưa bao giờ
> nhìn vào phản hồi*.

### T03 — test làm bẩn bằng chứng eval

Đo bằng hash trước/sau `npm run check`, không suy đoán:

```
trước: 4875111ACB20B2D5FA586D88B6BD96FA747D10A6F160B1245E45CCD5D5FF077B
sau  : 3184D96AF780B5E537B3F820FB6107FE9033A588DE0414A4BAD7BCD3CE4E3CFE
```

**Tái hiện được.** Nguyên nhân: `scripts/eval-ai.ts:736` có `await main()` ở cấp
module, mà `packages/core/test/soChoPhep.test.ts` import `soChoPhep`/`soLa` từ chính
file đó ⇒ import kéo theo chạy eval và ghi `data/eval/ai-ket-qua.json`.

Diff do lượt kiểm gây ra: [`t03-side-effect.diff`](t03-side-effect.diff) — chỉ trường
`doLuc`. Đã hoàn nguyên và **xác minh nội dung JSON giống hệt bản sao gốc** (`doLuc`
về đúng `2026-09-11T18:11:56.441Z`).

> **Một chi tiết đáng ghi cho lần sau:** sau `git checkout --`, SHA-256 thô của file
> **không** khớp bản gốc vì Git trả LF còn bản trên đĩa là CRLF. Nội dung logic
> giống hệt. Đây đúng lý do dấu vết nội dung ở `toTien.ts` dùng `git hash-object`
> chứ không dùng SHA-256 thô — dùng hash thô để canh sạch/bẩn trên Windows sẽ báo
> động giả vĩnh viễn.

### T04 — bốn phát biểu mạnh hơn bằng chứng

| | Tài liệu đang nói | Sự thật đo được |
|---|---|---|
| a | `NGHIEM-THU-V01.md:94` — *"luồng cốt lõi không còn lỗi đã xác nhận"* | T01/T02 vừa tái hiện |
| b | `TIEN-DO.md:9` — *"không còn việc nào Claude làm một mình được"* | roadmap Technical có 34 thẻ bắt buộc |
| c | `BAN-GIAO.md:9` — **451** test | **487** |
| d | `DON-VI-KINH-TE.md` — vượt hạn 4 s **1–2/38** | artifact `liveGanNhat` ghi **4/38** |

**T04-d là lỗi của chính tôi ở phiên trước**, không phải của tài liệu cũ: tôi đo
`soLuotVuotHanMacDinh` ở vài lượt rồi viết dải 1–2 trong khi lượt được giữ lại ghi 4.
Đây là **ước lượng "nếu áp timeout"**, không phải số timeout quan sát trong pipeline
sản xuất — script gọi interpreter *không* bọc `boiThoiHan` rồi đếm lượt vượt ngưỡng.
Phạm vi phát biểu phải sửa ở TB-L01, không chỉ sửa con số.

## 3 · Baseline chạy được

| Kiểm | Kết quả | Phạm vi |
|---|---|---|
| `npm run check` (typecheck + unit) | **487/487 pass · 0 fail** | offline, không mạng |
| Probe T01/T02 | **2/5 ca đúng** | stub trong tiến trình |
| Hash artifact eval trước/sau check | **đổi** ⇒ T03 còn | — |

**Chưa kiểm ở lượt này:** browser suite (Chromium), Devnet live, build hai app,
`npm audit`. Không chép kết quả của review 12/09 thành kết quả của lượt này.

## 4 · Giữ nguyên thay đổi của chủ dự án

Chỉ hoàn nguyên **một** file, và là file do chính lượt kiểm này ghi đè
(`data/eval/ai-ket-qua.json`, đúng trường `doLuc`). Hai file chưa commit của chủ dự
án còn nguyên vẹn.

## 5 · Kết luận G00

**Đạt.** Có snapshot tái lập được T01/T02 (probe theo Git, không phụ thuộc
`.thu-pages/`), có bằng chứng T03 bằng hash, có đối chiếu T04 theo từng dòng tài
liệu. Biết chính xác phần chưa kiểm.

**Việc tiếp theo:** TB-G01 (sổ thực thi), rồi **TB-C04 trước C01** — vì mọi lượt
`npm run check` từ đây tới cuối roadmap đều làm bẩn artifact eval nếu không chặn.

# ADR-0004 — Custos nằm trong luồng ký của ví, qua Wallet Standard

**Ngày:** 29/09/2026 · **Trạng thái:** đã quyết (go/no-go ĐẠT theo spike cùng ngày)
**Nguồn:**

- góp ý mentor 1:1 ngày 29/09;
- [`ROADMAP-SAU-MENTOR.md`](../roadmap/ROADMAP-SAU-MENTOR.md);
- [`SPIKE-CONNECTOR.md`](../review/ck-20260929/SPIKE-CONNECTOR.md).

---

## 1 · Vấn đề

Mentor hỏi: *"Custos nằm ở đâu trong hành trình của người dùng?"* Đọc mã ngày 29/09 thì thấy
câu trả lời thật là **chưa nằm ở đâu cả**. Có hai bằng chứng:

- `apps/trang-tan-cong/src/LiveAttack.tsx` import `buildLiveHandoff` từ mã ví;
- `apps/demo-wallet/src/live/session.ts:615` chỉ nhận giao dịch trùng với kịch bản mà chính
  ví dựng sẵn.

Tức là ví đang kiểm **giao dịch của chính nó**. Luồng "dApp → ví → Custos → quyết định" mới chỉ
có trên sơ đồ.

## 2 · Quyết định

1. **Định vị.** Custos là SDK kiểm giao dịch chạy trước lúc ký, dành cho **nhà phát triển ví**
   (chính) và dApp (phụ). Người dùng cuối không mở Custos; họ được bảo vệ vì ví của họ đã tích
   hợp. Custos không phải trang quét link và không xét URL hay tên miền.
2. **Bằng chứng tích hợp là một ví Wallet Standard.**
   - `@custos-solana/connector` đăng ký "Custos Demo Wallet".
   - dApp dùng wallet-adapter như với mọi ví khác. Mã Custos duy nhất phía dApp là lệnh
     `registerCustosWallet({ url })`.
   - Cửa sổ ví (`ket-noi.html`, origin riêng) kiểm đúng bytes nhận được, rồi để người dùng
     quyết định.
3. **Chỉ khai `solana:signTransaction`, chain `solana:devnet`, và mỗi lần một giao dịch.**
   - Ví trả bytes đã ký; dApp tự gửi.
   - Chưa có đường kiểm tương ứng thì không khai `signAndSendTransaction`.
   - Batch bị từ chối rõ ràng.
4. **Ranh giới quyền.**
   - dApp chỉ gửi được ba loại yêu cầu (kết nối, ký bytes, ngắt), mỗi loại có tập khoá cố định.
     Khoá lạ thì **cả thông điệp bị loại**.
   - dApp không có trường nào để tắt Custos, khai verdict, khai đồng ý hay khai
     `expectedAction`.
   - Origin và cửa sổ nguồn lấy từ `MessageEvent`, không lấy từ thân thông điệp.
   - Ví ghim origin của lần xin kết nối đầu tiên, và trả lời với `targetOrigin` là origin đó,
     không bao giờ là `"*"`.
5. **Fail-safe giữ nguyên.** Custos không kiểm xong thì cửa sổ ví **không có nút ký**, và dApp
   nhận `chua-kiem-duoc`.
6. **Hợp đồng ký là một nguồn.** Cửa sổ ví ký qua `kySauKhiKiem` (ADR-0003 và bổ sung G0-4):
   khớp neo, phiên dùng một lần, xác minh chữ ký ed25519 rồi mới trả `giaoDichDaKy`.

## 3 · Hành trình: bảy trạng thái, mỗi trạng thái một câu

Đây là hợp đồng giữa vai B (dựng) và vai C (chữ). Câu ở cột phải là câu **gốc**; C được sửa
chữ nhưng không được gộp hai trạng thái vào một câu.

| # | Trạng thái | Ai thấy | Câu gốc |
|---|---|---|---|
| 1 | Xin kết nối | cửa sổ ví | *{origin} muốn kết nối. Ứng dụng sẽ thấy địa chỉ ví; mỗi giao dịch nó gửi đều được Custos kiểm tại đây trước khi bạn ký.* |
| 2 | Đang kiểm | cửa sổ ví | *Custos đang mô phỏng chính giao dịch này trên Devnet…* |
| 3a | Có kết quả: An toàn | cửa sổ ví | *An toàn* + bảng chênh lệch; nút **Ký** |
| 3b | Có kết quả: Cần xem kỹ hoặc Nguy hiểm | cửa sổ ví | Mức + lý do + bảng chênh lệch; ô *"Tôi đã đọc cảnh báo và vẫn muốn ký"*; nút **Chặn giao dịch** / **Vẫn ký** |
| 3c | Không kiểm được | cửa sổ ví | *Custos chưa kiểm được: {lý do}. Không có kết quả kiểm thì ví không cho ký.* Chỉ có nút **Đóng yêu cầu** |
| 4a | Đã chặn | dApp | *Người dùng đã từ chối trong ví.* |
| 4b | Đã ký, dApp gửi | dApp + ví | dApp: signature. Ví: *Đã ký theo quyết định của bạn. Ứng dụng tự gửi giao dịch; ví không gửi.* |
| 5 | Chưa rõ | dApp | *Không rõ ví đã ký hay chưa — đừng gửi lại yêu cầu, hãy kiểm tra trong ví.* |
| 6 | Lỗi hạ tầng | dApp | Popup bị chặn: *Trình duyệt chặn cửa sổ ví — cho phép cửa sổ bật lên cho trang này rồi bấm lại.* · Ví đóng: *Cửa sổ ví đã đóng.* · RPC không phải Devnet: *RPC {host} không phải Solana Devnet — không kiểm, không ký.* |
| 7 | Kết quả cũ | cửa sổ ví | *Kết quả kiểm đã cũ — Custos đang kiểm lại trước khi cho ký.* |

Phải phân biệt **"thiếu dữ liệu"** (3c, và `warning` do coverage khuyết) với **"phát hiện hành vi
nguy hiểm"** (`danger` có mã cáo buộc). Gộp hai thứ đó là nói sai về chính sản phẩm (xem
`CLAUDE.md`, bảng ba chữ).

## 4 · Phương án đã cân nhắc

| Phương án | Vì sao không chọn |
|---|---|
| Extension MV3 | Thêm injection, messaging của service worker, vòng đời và quản lý khoá, trong khi ranh giới ký chứng minh được vẫn như popup. Mentor: extension chỉ đáng làm nếu *thật sự chặn được* |
| Guard phía dApp quanh Phantom | Chỉ chứng minh được *dApp tử tế* tự kiểm. Không chống được dApp độc hại, vì dApp độc hại chẳng việc gì phải gọi guard |
| Giữ postMessage riêng hiện có | Không phải chuẩn. dApp phải viết mã riêng cho Custos, đúng thứ mentor chỉ ra |
| Lighthouse assertion trong giao dịch | Chèn lệnh vào giao dịch người dùng, chạm quyết định khoá số 5. Xem ROADMAP-SAU-MENTOR mục 6 |

## 5 · Những gì ADR này KHÔNG làm

- **Không** đổi `InspectResult`, luật L2, hay quyền của AI. `level` vẫn chỉ do L2 tạo.
- **Không** cho Custos gửi giao dịch hay ghi lên chain. Ví ký; dApp gửi.
- **Không** hứa bảo vệ người dùng của ví không tích hợp Custos. Connector chỉ có tác dụng khi
  người dùng chọn "Custos Demo Wallet".
- **Không** gọi đây là pilot bên thứ ba. Ví mẫu và dApp thử đều do đội tự viết; bằng chứng bên
  thứ ba là việc D1.
- **Không** bỏ luồng live cũ ngay. `LiveSession` giữ vai đối chứng cho tới khi B1–B5 xong.

## 6 · Kiểm chứng

- Spike 29/09: 10/10 bước ĐẠT; một chữ ký Devnet thật được đối chiếu trên chain.
- 37 test mới: `connector.test.ts` 17, `cuaSoVi.test.ts` 16, `spikeKetNoi.test.ts` 4.
- Guard `spikeKetNoi.test.ts` giữ điều quan trọng nhất: dApp **không** import mã ví hay
  core/ai/types, và **không** gọi `inspect()`.

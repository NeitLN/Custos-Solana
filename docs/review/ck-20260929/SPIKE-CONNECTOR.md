# Spike G0-1 · connector Wallet Standard — biên bản 29/09/2026

> Việc G0-1 và G0-2 của [`ROADMAP-SAU-MENTOR.md`](../../roadmap/ROADMAP-SAU-MENTOR.md).
> Dữ liệu thô nằm ở [`spike-ket-qua.json`](spike-ket-qua.json); ảnh chụp ở cùng thư mục.
> Probe: [`apps/thu-ket-noi/tools/probe-spike.py`](../../../apps/thu-ket-noi/tools/probe-spike.py).

## Kết luận: ĐẠT, đi nhánh Chuẩn

Một dApp chỉ dùng `@solana/wallet-adapter-react`, cộng đúng một lệnh `registerCustosWallet()`,
đã nhận "Custos Demo Wallet" như mọi ví Standard khác. dApp gọi `sendTransaction`; yêu cầu đi
vào cửa sổ ví ở **origin khác**. Tại đó Custos kiểm **chính giao dịch dApp tự dựng**, người dùng
bấm Ký, bytes đã ký quay về, và **dApp tự gửi**. Ví không gửi gì.

Chữ ký trên Devnet: `2CX49yycufPnmargHHcJY8nu7GGnL7uBKzu3yCWJmk62uTbJL7NYDjS4C2KKDZQV1M3rQ89roJtWQMMVuiwzFSpQ`.

Đối chiếu trên chain (`getTransaction`, commitment `confirmed`):

| Trường | Giá trị |
|---|---|
| version | 0 |
| err | null |
| người ký | `AqX3…BCLZ` (ví cố định) |
| phí | 5000 lamport |
| số dư | 19 659 759 760 → 19 659 754 760 |

Giao dịch là lệnh tự chuyển 1000 lamport cho chính ví, nên số dư chỉ giảm đúng phí.

## Năm phép thử

| # | Kết quả | Bằng chứng |
|---|---|---|
| T1 · adapter nhận ví | **ĐẠT** | Danh sách ví là `['Custos Demo Wallet']`; dApp nhận địa chỉ qua chuẩn. Đọc mã adapter: ví chỉ khai `signTransaction` thì adapter tự ký rồi `connection.sendRawTransaction` (`wallet-standard-wallet-adapter-base/lib/esm/adapter.js` dòng 185–194) |
| T2 · popup và cách ly origin | **ĐẠT** (Chromium) | Popup mở khi **trình chặn popup BẬT**. Ví hiện `http://localhost:5190` do trình duyệt cấp. Đóng ví giữa lúc đang có yêu cầu ⇒ dApp nhận "Cửa sổ ví đã đóng", không treo. Sai origin, sai cửa sổ, phát lại id, id trả lời hai lần: đều có test đơn vị (`packages/connector/test/connector.test.ts`, `apps/demo-wallet/test/cuaSoVi.test.ts`) |
| T3 · giao dịch tổng quát | **ĐẠT** (legacy và v0) | Ví kiểm cả legacy lẫn v0 do dApp dựng. Test chứng minh ví kiểm đúng bytes nhận được, không dựng lại kịch bản. **Chưa thử ALT** |
| T4 · mọi đường ký qua Custos | **ĐẠT** | Chặn ⇒ `WalletSendTransactionError: Người dùng đã từ chối trong ví.`, không có `sendTransaction` nào. Batch, chain khác Devnet, chưa kết nối, trường lạ (`protected`, `level`, `dongY`, `expectedAction`) ⇒ bị từ chối (test) |
| T5 · production và RPC thật | **CHƯA ĐO** | Spike chạy trên hai origin `localhost` (khác cổng là khác origin). Việc HTTPS công khai (Pages ↔ Vercel) chuyển sang B5 |

## Bốn bẫy đo được (phải ghi vào tài liệu tích hợp)

1. **Chain suy từ URL RPC của dApp.** `getChainForEndpoint` coi URL không chứa `devnet`,
   `testnet` hay `localhost` là **mainnet**. Adapter chặn `sendTransaction` trước khi yêu cầu tới
   ví (`!account.chains.includes(chain)`). dApp dùng RPC Devnet có URL "lạ" sẽ báo
   `WalletSendTransactionError` mà không có câu nào giải thích.
2. **React StrictMode (chỉ ở dev) làm adapter điếc.** `useStandardWalletAdapters` huỷ adapter
   trong cleanup của `useEffect(..., [])`. StrictMode chạy cleanup đó một lần giữa hai lượt mount,
   nên adapter bị gỡ listener `change` mà state vẫn giữ nó. Hệ quả đo được: cửa sổ ví đóng nhưng
   dApp vẫn hiện "đã kết nối", nút Kết nối mờ vĩnh viễn. Bỏ StrictMode thì hết. Lỗi nằm ở thư
   viện, mọi ví Standard đều dính như nhau; bản production không bị. Có ghi chú trong
   `apps/thu-ket-noi/src/main.tsx`.
3. **Ví ngắt ⇒ adapter bỏ chọn ví** (`WalletProvider` gọi `setWalletName(null)`). Người dùng
   phải chọn lại ví rồi mới kết nối được. Đây là hành vi của adapter, không cần sửa; SolBonus
   (B3) phải hiển thị nút chọn ví lại.
4. **Adapter chỉ gọi `connect` của ví khi `wallet.accounts` rỗng.** Connector phải gỡ tài khoản
   khi cửa sổ ví đóng (đã làm), nếu không lần kết nối sau sẽ không mở lại cửa sổ.

## Chưa làm trong spike (chuyển sang GĐ1)

- Giao dịch độc (kiểu SolBonus) đi qua connector: B3.
- Giao dịch có ALT: B1.
- Firefox và Safari: chỉ đo trên Chromium.
- Hai origin HTTPS công khai (T5): B5.
- Biên nhận khi dApp tự gửi: B4. Hiện cửa sổ ví chưa theo dõi signature sau khi ký.
- UI cửa sổ ký còn là bản tối giản, chưa dùng `CanhBao` và khung "Nếu bạn ký": C1.

## Mã của spike

| Phần | File |
|---|---|
| Giao thức dApp ↔ ví (thuần, kiểm chặt khoá) | `packages/connector/src/giaoThuc.ts` |
| Ví theo Wallet Standard (connect, disconnect, events, signTransaction) | `packages/connector/src/index.ts` |
| Bộ điều khiển cửa sổ ví (ghim origin, kiểm, quyết định, ký qua `kySauKhiKiem`) | `apps/demo-wallet/src/ketNoi/cuaSoVi.ts` |
| Trang cửa sổ ký | `apps/demo-wallet/ket-noi.html`, `src/ket-noi.tsx` |
| dApp thử (wallet-adapter thuần) | `apps/thu-ket-noi/` |
| Test | `connector.test.ts` (17), `cuaSoVi.test.ts` (16), `spikeKetNoi.test.ts` (4 guard: dApp không import mã ví hay core, không gọi `inspect`) |

# Tiến độ thực hiện roadmap Custos

Đọc cùng [ROADMAP-CLAUDE.md](../../ROADMAP-CLAUDE.md). File này là nguồn trạng thái công việc duy nhất. [BAN-GIAO.md](BAN-GIAO.md) giữ ngữ cảnh tiếp tục; không lập thêm checklist cùng mục đích.

**Cập nhật gần nhất:** HEAD `e11812b`, cây làm việc sạch.

**Đã nghiệm thu:** R00, R01, U01–U05, I01, I02 — **bảy lỗi** đã sửa: F01, F02, F03 (P1) và F04, F05, F06, F07, F09 (P2). Mỗi lỗi có tái hiện trước khi sửa và phép đo sau khi sửa.

**Việc khả dụng tiếp theo:** I03 (đủ phụ thuộc vì U06 xong), D02/A01 (đủ phụ thuộc vì R02 xong), D03 (nay đủ vì U07 xong), S02 (đủ phụ thuộc vì S01 xong — nhưng xem `PHU-THUOC.md` mục 0: hiện KHÔNG có bản vá tương thích nào để áp).

## Bảng công việc

Quy ước: TODO, DOING, VERIFY, DONE, WAIT_INPUT, NOT_NEEDED theo định nghĩa trong roadmap. Cột bằng chứng phải có liên kết khi DONE hoặc NOT_NEEDED. Với WAIT_INPUT, ghi vào bảng trở ngại phía dưới và tiếp tục việc khác đủ phụ thuộc.

| Mã | Việc | Vai | Phụ thuộc | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|---|---|---|
| R00 | Baseline, quyền và đối chiếu lỗi | A/B/D | — | DONE | HEAD `55388d6` lúc bắt đầu · Node 24.12.0 · npm 11.6.2 · Chromium 149.0.7827.55 · Playwright 1.61.0 · axe-core 4.13.0. Tái hiện F09 trên PowerShell (402/403). Đối chiếu F01–F11 ở BAN-GIAO.md. |
| R01 | Kiểm deck không phụ thuộc ngầm vào unzip | A/D | R00 | DONE | `e457eef`. `scripts/docZip.ts` đọc ZIP bằng `node:zlib`, không tiến trình con. PowerShell không có `unzip` → 403/403. Deck cũ vẫn làm test đỏ. **Chưa kiểm Linux** trong phiên này. |
| R02 | Cổng kiểm chứng và nguồn gốc artifact | A/D | R00, R01 | DONE | `dauVetNoiDung()` băm nội dung mã/giao diện từ cây làm việc; cổng so dấu vết TRƯỚC phả hệ commit. Tái hiện lỗ hổng: sửa `style.css` không commit thì ô a11y vẫn báo `✓`; nay báo `~ nội dung mã đã đổi sau lượt đo`. 7 bài trên kho git tạm. |
| U01 | Kết quả mobile và điều hướng focus | B | R00 | DONE | `a715ee1`. Đo lại 320/375/768 px: top=9/9/154, focus vào khối kết quả ở cả ba. `scripts/kiem-trinh-duyet/soi-ket-qua-trong-tam-nhin.py`. axe 40/40 sau thay đổi. |
| U02 | Ký/gửi/xác nhận và chống gửi lặp | B/A | R00 | DONE | `5dbc6ae`. Sáu pha; `chuaRo` tách khỏi `thatBai` khi đã có chữ ký. Luồng ở `src/gui.ts`, 5 bài kiểm bằng stub trong `npm run check` — ký thật đòi khoá nên logic trong component gần như không ai kiểm. Bản công khai vẫn không ký. |
| U03 | Validate hiện trường, phục hồi render | B/A | R00 | DONE | `4ffe088`. Xác thực từng trường thay cho `as HienTruong`; ba trạng thái co/chuaDung/hong. 7 bài đơn vị + 5 ca trình duyệt (`soi-cau-hinh-hong.py`): không ca nào trắng trang, không ca nào tạo nút Ký. |
| U04 | Phản hồi payload dApp không hợp lệ | B/A | R00, U03 | DONE | `0b8daba`. Union `khong`/`co`/`hong` + giới hạn 4096 ký tự. 7 bài đơn vị; trình duyệt: payload hỏng không sinh khối kết quả, không hiện nhãn phán quyết nào. |
| U05 | Xác nhận huỷ đúng trạng thái | B/C | U01, U02 | DONE | `0b8daba`. `role=status`: "chưa được gửi và sẽ không được gửi", chỉ nói về yêu cầu hiện tại. |
| U06 | Vùng bấm, câu chữ và phân cấp | B/C | U01, U05 | DONE | F08. Vùng bấm chuyển vào lớp `.lien-ket` thay vì vá bốn nơi gọi; 26/26 đạt 44px. Chi tiết implementation AI/khoá xuống mục kỹ thuật, giữ lại câu bảo vệ quyết định số 1. Header nói rõ là ví mẫu tích hợp SDK. Bàn phím · zoom · chữ dài: 16/16. axe 40/40 chạy lại. |
| U07 | Cấu hình RPC và handoff nhất quán | B/A | U03, U04 | DONE | KHÔNG phải `NOT_NEEDED`: trang tấn công gọi thẳng `ht.rpc` ở 2 chỗ (bỏ qua `VITE_RPC`, không fallback), và địa chỉ ví hỏi TÊN MÁY nên vào bằng `127.0.0.1`/`[::1]`/IP LAN thì giải ra **chính trang tấn công**. Chính sách gom về `scripts/diaChiDemo.ts`; 8 bài đơn vị + `soi-handoff.py` 5/5. |
| I01 | Deadline/retry trang phỏng vấn | B | R00, U03 | DONE | `1a94356`. Hạn 15 s bọc cả chuỗi, dùng lại `scripts/coHan.ts`. Treo RPC thật: dừng sau 15,3 s, có nút Thử lại. |
| I02 | Lưu, validate và khôi phục phỏng vấn | B/D | R00 | DONE | `3cc77be`. Kho hỏng được GIỮ nguyên văn + nút tải bản sao; bắt lỗi ghi storage. 8 bài đơn vị, 4 ca trình duyệt. |
| I03 | Công cụ khớp giao thức nghiên cứu | B/C/D | I01, I02, U06 | TODO | Giữ thước đo đã khóa. |
| S01 | Phân loại advisory theo phơi nhiễm | A | R00 | DONE | F11. Tra registry 08/09: cả ba gói trực tiếp đã ở bản mới nhất, và **không advisory high nào có bản đã vá** — `image-size` mới nhất `2.0.2` vẫn nằm trong dải `<=2.0.2`. Chờ vá không phải kế hoạch. Bốn điều kiện chấp nhận rủi ro thành test (`phoiNhiemPhuThuoc.test.ts`), có kiểm phủ định. Người chịu trách nhiệm và ba mốc xem lại ghi ở `PHU-THUOC.md` mục 3.5. |
| S02 | Vá tương thích và xử lý rủi ro còn lại | A/B | S01, R01 | TODO | Có thể WAIT_INPUT riêng cho quyết định chưa được giao. |
| S03 | Kiểm SDK từ consumer ngoài repo | A/C | R01 | TODO | Kiểm lại nếu S02 hoặc core/AI thay đổi. |
| D01 | Đồng bộ claim và tài liệu hiện hành | D/C/A | R02 | DONE | F10. Bảng claim ở `docs/BANG-CLAIM.md`. Ba lệch số (29→30 dòng, 6/6→13/13 bẫy, 33→38 mẫu) đưa vào generator + danh sách mốc. Ba câu thu hẹp: trần cứng 400 token, thị trường chứng minh hộ, "ví hiện tại cho họ xem". |
| D02 | Benchmark có nhãn, tập giữ lại | A/D | R02 | TODO | Giữ mẫu không kiểm được trong báo cáo. |
| D03 | Số đo độ trễ và tối ưu có căn cứ | B/A | R02, U01, U02, U07 | TODO | Live cần mạng; không lấy số cũ làm số mới. |
| A01 | Eval offline, guardrail và tooling | C/A/D | R02, D02 | TODO | Không cần secret để kiểm bộ chắn. |
| A02 | Eval mô hình thật trong ngân sách | C/D | A01 | TODO | Chỉ chạy khi đủ quyền, key và giới hạn chi phí. |
| B01 | Bộ làm việc với người mua | D | R00 | TODO | Chuẩn bị; không tự liên hệ. |
| B02 | Bộ tự tích hợp cho đối tác | A/D | S03 | TODO | Kit hoàn tất không phải pilot. |
| B03 | Bộ usability cho UI hiện tại | B/C/D | I03, U06 | TODO | Không tự tạo câu trả lời người thật. |
| B04 | Mô hình doanh thu và giả thuyết giá | D | B01, B02 | TODO | Bổ sung dữ liệu H02/H03 khi có. |
| P01 | Pitch, deck và phản biện | D/C | D01, B04, U06 | TODO | Không cần bịa H/A02 để viết bản trung thực. |
| P02 | Video thật và phương án mất mạng | B/D | U01, U02, U03, U04, U05, U06, U07, P01 | TODO | Có thể ghi màn hình bằng công cụ nếu đủ điều kiện. |
| P03 | Đóng gói bản nộp cục bộ | B/D/A | D01, S03, P01 | TODO | Bộ hồ sơ đủ video còn cần P02. |
| V01 | Nghiệm thu sản phẩm trên bản cuối | A/B/C | R00, R01, R02, U01, U02, U03, U04, U05, U06, U07, I01, I02, I03, S01, S02, S03, D01, D02, D03, A01 | TODO | Đây là điều kiện đóng toàn bộ; được chạy phần đủ điều kiện theo mục 2.4. |
| V02 | Bàn giao, checklist và chấm lại | D/A | R00 | TODO | Đối chiếu V01/P/H/A02 dù chưa DONE; DONE chỉ có nghĩa báo cáo đầy đủ, không phải mọi việc đã đạt. |
| H01 | Thu và phân tích usability thật | D/người tham gia | B03 | TODO | Chờ người thật, dữ liệu và quyền sử dụng. |
| H02 | Phản hồi người quyết định mua | D/người mua | B01 | TODO | Giới hạn không phỏng vấn kỳ này phải được giữ nếu còn hiệu lực. |
| H03 | Đối tác tự thử tích hợp | A/D/đối tác | B02 | TODO | Cần bằng chứng độc lập; không tính Claude tự thử. |
| H04 | Xác nhận các mục BTC còn thiếu | D/chủ dự án/BTC | R00 | TODO | Chuẩn bị câu hỏi; không tự gửi khi chưa được giao. |

## Trở ngại và điều kiện mở lại

Chưa điều tra trong lần thực thi roadmap. Những đầu vào ngoài repo dự kiến cần kiểm là A02, H01–H04; không mặc định đã có hoặc chắc chắn không có.

| Mã việc | Thiếu chính xác điều gì | Tài liệu/artifact đã chuẩn bị | Ai/cái gì mở lại được | Việc độc lập làm tiếp |
|---|---|---|---|---|
| — | Chưa ghi nhận trong phiên triển khai | — | — | R00 |

## Nhật ký nghiệm thu

Chưa có việc nào được nghiệm thu theo roadmap này. Khi có kết quả, thêm một bản ghi cho mỗi việc:

```text
Mã:
DONE / NOT_NEEDED / WAIT_INPUT:
Nguyên nhân hoặc quyết định:
File thay đổi:
HEAD và dấu vết working tree:
Lệnh / exit code / kết quả:
Đường dẫn bằng chứng:
Phạm vi chưa kiểm:
Điều kiện mở lại khi mã hoặc dữ liệu đổi:
```

## Quy tắc cập nhật

- Cập nhật bảng công việc khi bắt đầu, khi chờ đầu vào và sau kiểm chứng; không chỉ sửa đoạn tổng kết.
- Khi thay đổi làm bằng chứng cũ hết hiệu lực, đưa việc bị ảnh hưởng về VERIFY và ghi lý do, không chạy lại mọi thứ không liên quan.
- Khi đã có báo cáo baseline mới, dẫn artifact đó; không sao chép một con số sang nhiều ô trạng thái.
- Không dùng tổng phần trăm hoàn thành để gọi sản phẩm đã sẵn sàng: bốn việc H và nhánh A02 có ý nghĩa khác với sửa một lỗi UI.
- Không tự tạo commit để đổi cây làm việc thành sạch. Liệt kê thay đổi cần chủ dự án review ở sổ bàn giao.

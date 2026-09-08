/*
 * In dấu vết nội dung ra JSON, cho các bài kiểm viết bằng Python đọc.
 *
 *     node --experimental-strip-types scripts/dau-vet.ts giao-dien
 *     node --experimental-strip-types scripts/dau-vet.ts ma
 *
 * Vì sao phải bắc cầu qua một tiến trình con thay vì viết lại phép băm bằng Python:
 * vị từ "cái gì tính là giao diện" đã được viết lại SÁU lần trong repo này trước khi
 * gom về `toTien.ts`, và mỗi bản viết lại đều lệch bản gốc một chút. Bản Python thứ
 * bảy sẽ lệch lần thứ bảy — chỉ khác là lần này lệch âm thầm, vì hai bên không bao
 * giờ được so với nhau.
 *
 * Chậm hơn vài trăm mili giây một lượt chạy. Bài kiểm trình duyệt mất hàng chục
 * giây, nên cái giá đó không đáng để đổi lấy một bản sao của luật.
 */
import { dauVetNoiDung, laMa, laGiaoDien } from "./toTien.ts";

const loai = process.argv[2] ?? "ma";
const dangKe = loai === "giao-dien" ? laGiaoDien : laMa;

process.stdout.write(JSON.stringify(dauVetNoiDung(dangKe)) + String.fromCharCode(10));

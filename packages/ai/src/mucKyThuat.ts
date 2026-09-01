import type { InspectResult } from "@custos-solana/types";

/**
 * MỨC 3 — KỸ THUẬT. `DAC-TA-L3.md` mục 6.
 *
 * Đặc tả ghi rõ mức này *"chỉ để trấn an người có kinh nghiệm"*, và nếu thiếu
 * thời gian thì cắt nó trước. Nên nó làm cuối cùng, và cố ý làm mỏng.
 *
 * Khác hai mức kia ở một điểm: mức Ngắn và Đầy đủ **dịch** kỹ thuật thành lời
 * người thường; mức này thì ngược lại — nó **thôi dịch**. Người đọc nó là người
 * muốn tự kiểm chứng, và với họ chữ "tài khoản token của bạn đổi chủ" kém hữu ích
 * hơn `SPL_SET_AUTHORITY__ACCOUNT_OWNER`.
 *
 * Dựng TỪ `InspectResult`, không cần `Facts` — cùng lý do với mức Ngắn: bên tích
 * hợp chỉ có kết quả trả về.
 *
 * KHÔNG được tự tính lại gì. Ba mức phải nói cùng những con số; mức này chỉ khác
 * ở chỗ nói ra cả mã lý do và tỉ lệ đọc hiểu.
 */

export type DongKyThuat = {
  nhan: string;
  giaTri: string;
};

export function chiTietKyThuat(ketQua: InspectResult): DongKyThuat[] {
  const ra: DongKyThuat[] = [];

  ra.push({ nhan: "Mức", giaTri: ketQua.level });

  if (ketQua.aiAdvisory) {
    ra.push({ nhan: "Custos đề nghị", giaTri: ketQua.aiAdvisory });
  }

  if (ketQua.detectedPrimaryAction) {
    const h = ketQua.detectedPrimaryAction;
    const phan = [h.type, h.from ? `từ ${h.from}` : "", h.to ? `sang ${h.to}` : ""].filter(Boolean);
    ra.push({ nhan: "Hành động chính nhận diện được", giaTri: phan.join(" ") });
  }

  // Con số coverage là trục khác biệt của sản phẩm, nên nó phải có mặt ở đây
  // dưới dạng thô chứ không chỉ dưới dạng câu chữ.
  const c = ketQua.coverage;
  ra.push({
    nhan: "Đọc hiểu",
    giaTri: `${c.analyzed}/${c.total} lệnh · ${c.unverifiedPrograms} chương trình chưa xác minh`,
  });

  if (ketQua.reasonCodes.length > 0) {
    ra.push({ nhan: "Mã lý do", giaTri: ketQua.reasonCodes.join(", ") });
  }

  // Bảng chênh lệch ở dạng thô: nhãn và hai đầu giá trị, không diễn giải.
  //
  // ĐỊA CHỈ Ở ĐÂY LÀ ĐỊA CHỈ ĐẦY ĐỦ, và đó là lý do chính mức này tồn tại chứ
  // không phải để trang trí. Bảng chênh lệch rút gọn `CRZa…picz` giữ 4 ký tự đầu
  // và 4 ký tự cuối; kẻ tấn công mài được một địa chỉ vanity khớp đúng 8 ký tự
  // đó, và người dùng đối chiếu bằng mắt sẽ thấy y hệt địa chỉ quen. Một lớp bảo
  // mật chỉ hiện bản rút gọn thì tự bịt mắt mình trước đúng trò đó.
  for (const d of ketQua.diff) {
    const truoc = d.truocDayDu ?? d.before;
    const sau = d.sauDayDu ?? d.after;
    ra.push({ nhan: d.label, giaTri: `${truoc} → ${sau}  [${d.severity}]` });
  }

  if (ketQua.loiKhaiLech) {
    ra.push({
      nhan: "Lời khai của dApp lệch",
      giaTri: `khai "${ketQua.loiKhaiLech.khai}", nhận diện "${ketQua.loiKhaiLech.nhanDien}"`,
    });
  }

  return ra;
}

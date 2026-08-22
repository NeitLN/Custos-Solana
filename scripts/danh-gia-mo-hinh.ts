/**
 * ĐÁNH GIÁ MÔ HÌNH — P2-2, chạy trên tập 12 mẫu CỐ ĐỊNH.
 *
 *   $env:ANTHROPIC_API_KEY = "..."   (đặt TRƯỚC, trong terminal của bạn)
 *   node --experimental-strip-types scripts/danh-gia-mo-hinh.ts
 *
 * Đo bốn thứ, đúng theo yêu cầu P2-2 trong REMEDIATION-ROADMAP.md:
 *   - grounding    : câu trả lời có bịa số/địa chỉ không có trong dữ liệu không
 *   - hallucination: có tự khai chức năng chương trình chưa xác minh không
 *   - tiếng Việt   : độ dài hợp lý, không lẫn tiếng Anh kỹ thuật lộ liễu
 *   - latency      : thời gian mỗi lượt gọi, và hành vi khi timeout
 *
 * QUAN TRỌNG: script này KHÔNG tự dựng payload gửi cho mô hình. Bản đầu tiên
 * từng tự tay ghép JSON rồi gọi thẳng `client.messages.create`, và vô tình bỏ
 * sót trường `thayDoiSoDu` — kết quả là mọi mẫu đều ra "không có thông tin số
 * tiền", trông như mô hình yếu, nhưng thật ra là bài chấm sai đề. Giờ script
 * CHỈ bọc `dungGoiAnthropic()` để ghi lại độ trễ và raw text, còn việc dựng
 * payload vẫn do `dienGiaiBangMoHinh` (đường sản xuất thật) đảm nhiệm — không
 * có bản sao logic nào có thể lệch khỏi production.
 *
 * KHÔNG đo "người dùng có hiểu không" — đó là việc của 12 cuộc phỏng vấn người
 * thật (DAC-TA-L3.md mục 7), không phải việc của mô hình.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { danhGia } from "../packages/core/src/l2/evaluate.ts";
import { giaiDongBangFacts } from "../packages/core/src/facts-io.ts";
import {
  dienGiaiKhongAI,
  dienGiaiBangMoHinh,
  dungGoiAnthropic,
  boiThoiHan,
  type GoiMoHinh,
} from "../packages/ai/src/index.ts";

const MAU = [
  "R01-pos", "R02-pos", "R03-pos", "R12-pos", // Đỏ
  "R04-pos", "R06-pos", "R07-pos", "R09-pos", "R11-pos", // Vàng
  "R03-neg", // an toàn
  "MN-01", "MN-05", // mainnet thật
];

/** Chuỗi số ≥6 chữ số KHÔNG đứng sau dấu phẩy thập phân — dấu hiệu số thô chưa
 *  qua `dinhDangSo`.
 *
 *  Vế "không đứng sau dấu phẩy" là bắt buộc: token 9 decimals cho ra
 *  "464,642953757", và phần sau dấu phẩy hoàn toàn hợp lệ. Bản đầu của phép
 *  kiểm này thiếu vế đó nên báo oan MN-05 — một phép kiểm hay kêu oan thì sớm
 *  muộn cũng bị bỏ qua. */
const SO_THO = /(?<![,\d])\d{6,}/;

async function main() {
  const key = process.env["ANTHROPIC_API_KEY"];
  if (!key) {
    console.error("Thiếu ANTHROPIC_API_KEY trong environment.");
    process.exit(1);
  }

  const model = process.env["CUSTOS_EVAL_MODEL"] ?? "claude-haiku-4-5-20251001";
  // Thời hạn chỉnh được: Opus chậm hơn Haiku khoảng ba lần, và hạn 8000ms mặc
  // định của sản phẩm cắt đứt MỌI lượt gọi Opus.
  const HAN_MS = Number(process.env["CUSTOS_EVAL_TIMEOUT_MS"] ?? 8000);
  const goiThat = dungGoiAnthropic({ apiKey: key, model });

  const dong: string[] = [];
  const ghi = (s: string) => { console.log(s); dong.push(s); };

  ghi(`# Đánh giá mô hình — ${model}`);
  ghi(`Chạy lúc: ${new Date().toISOString()}\n`);

  let tongMs = 0;
  let coSoTho = 0;
  let batDoiXungHong = 0;
  let soLuotRoiVeMau = 0;
  let soLuotDung = 0;

  for (const id of MAU) {
    const facts = giaiDongBangFacts(readFileSync(`data/seed/facts/${id}.json`, "utf8"));
    const l2 = danhGia(facts);

    ghi(`\n## ${id}`);
    ghi(`level L2 (cố định, mô hình không đụng được): **${l2.level}**`);
    ghi(`mã lý do: ${l2.reasonCodes.join(", ") || "(không có)"}`);

    const nen = await dienGiaiKhongAI(facts, l2.reasonCodes, "vi", {});
    ghi(`\n**Câu mẫu cứng:** ${nen.explanation}`);

    // Bọc goiThat để ghi lại độ trễ VÀ ghi nhận lỗi.
    //
    // Bản trước chỉ đo `ms` rồi in `ketQua.explanation` — nhưng khi lời gọi hỏng
    // hoặc quá hạn thì `dienGiaiBangMoHinh`/`boiThoiHan` lặng lẽ rơi về câu mẫu
    // cứng, và script in đúng câu đó ra như thể mô hình đã trả lời. Lần chạy
    // Opus đầu tiên ra 12/12 "đạt" trong khi mô hình KHÔNG chạy lượt nào.
    // Một bài chấm báo xanh khi thí sinh vắng mặt thì tệ hơn không chấm.
    let ms = 0;
    let loiGoi: string | null = null;
    const goiCoDo: GoiMoHinh = async (loiNhac) => {
      const t0 = Date.now();
      try {
        const r = await goiThat(loiNhac);
        ms = Date.now() - t0;
        return r;
      } catch (e) {
        ms = Date.now() - t0;
        loiGoi = e instanceof Error ? e.message : String(e);
        throw e;
      }
    };

    const dg = boiThoiHan(dienGiaiBangMoHinh(goiCoDo), HAN_MS);
    const ketQua = await dg(facts, l2.reasonCodes, "vi", {});

    // Rơi về câu mẫu cứng = mô hình KHÔNG đóng góp gì cho lượt này.
    if (ketQua.explanation === nen.explanation) {
      soLuotRoiVeMau++;
      ghi(`\n**Mô hình:** ✗ KHÔNG DÙNG ĐƯỢC — rơi về câu mẫu cứng. Lý do: ${loiGoi ?? `quá hạn ${HAN_MS}ms (đo được ${ms}ms)`}`);
      continue;
    }
    tongMs += ms;
    soLuotDung++;

    ghi(`\n**Mô hình (${ms}ms):** ${ketQua.explanation}`);
    ghi(`  aiAdvisory: ${ketQua.aiAdvisory}`);

    if (SO_THO.test(ketQua.explanation)) {
      coSoTho++;
      ghi(`  ⚠ CÓ SỐ THÔ chưa định dạng trong câu trả lời`);
    }

    // Bất đối xứng: lõi xác định đã thấy hậu quả lệch thì mô hình không được
    // làm nó biến mất. Đây là bảo đảm của code (dienGiaiBangMoHinh), nhưng
    // kiểm lại với mô hình THẬT — không chỉ với mô hình giả trong test đơn vị.
    if (nen.aiAdvisory === "review_required" && ketQua.aiAdvisory !== "review_required") {
      batDoiXungHong++;
      ghi(`  ✗ BẤT ĐỐI XỨNG HỎNG: lõi đã cảnh báo nhưng kết quả cuối không còn`);
    }
  }

  ghi(`\n---\n## Tổng kết`);
  ghi(`- Mô hình: **${model}**, thời hạn ${HAN_MS}ms`);
  ghi(`- Số mẫu: ${MAU.length}`);
  ghi(`- Mô hình dùng được: **${soLuotDung}/${MAU.length}**`);
  ghi(`- Rơi về câu mẫu cứng: **${soLuotRoiVeMau}/${MAU.length}**`);
  ghi(`- Latency trung bình (chỉ tính lượt dùng được): ${soLuotDung ? Math.round(tongMs / soLuotDung) : 0}ms`);
  if (soLuotDung === 0) {
    ghi(`\n> ⚠ MÔ HÌNH KHÔNG CHẠY LƯỢT NÀO. Kết quả trên KHÔNG nói gì về chất lượng mô hình.`);
  }
  ghi(`- Câu trả lời còn lộ số thô: ${coSoTho}/${soLuotDung || 1}`);
  ghi(`- Bất đối xứng aiAdvisory bị hỏng: ${batDoiXungHong}/${MAU.length} (phải luôn là 0)`);

  const out = `docs/bao-mat/DANH-GIA-${model}-${new Date().toISOString().slice(0, 10)}.md`;
  writeFileSync(out, dong.join("\n") + "\n");
  console.log(`\n→ đã ghi ${out}`);
}
main().catch((e) => { console.error("LỖI:", e?.message ?? e); process.exit(1); });

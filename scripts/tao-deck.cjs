// Đuôi .cjs là bắt buộc: repo đặt "type": "module" nên .js bị coi là ESM và require() ném lỗi.
// Deck pitch 4 phút — Custos · Track Best Product & Business
// Bảng màu lấy thẳng từ giao diện sản phẩm (slate-950 + hổ phách + hồng cảnh báo),
// nên slide và demo trông như một thứ chứ không phải hai.
const PptxGenJS = require("pptxgenjs");
const fs = require("fs");

const S = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));

const C = {
  // NỀN SÁNG. Giấy hơi ngả ấm chứ không trắng tinh — trắng FFFFFF trên máy chiếu
  // hội trường chói và làm chữ mảnh khó đọc.
  bg: "F7F6F2",
  bgAlt: "EFEDE6",
  surface: "FFFFFF",
  amberSoft: "FDF3E3",
  roseSoft: "FDF2F4",
  line: "DCD9D0",
  code: "12161F",

  // Màu CHỮ — đã hạ độ sáng cho đọc được trên giấy. Bản nền tối dùng F5A524 và
  // 34D399; đặt nguyên hai màu đó lên nền sáng là tụt dưới ngưỡng tương phản.
  text: "14181F",
  muted: "525A66",
  dim: "5E6673",   // đậm hơn ngưỡng AA một nấc: máy chiếu hội trường làm nhòe chữ nhỏ
  amber: "B45309",
  rose: "BE123C",
  emerald: "047857",
  indigo: "4338CA",

  // Màu chỉ để TÔ, không bao giờ làm chữ — nên giữ nguyên độ tươi.
  amberFill: "F5A524",
  roseFill: "E11D48",
};
const F = { head: "Trebuchet MS", body: "Calibri", mono: "Consolas" };

const p = new PptxGenJS();
p.defineLayout({ name: "W16", width: 13.333, height: 7.5 });
p.layout = "W16";
p.author = "Đội Too Hard";
p.title = "Custos — UniHackFest 2026";

const M = 0.75;
const W = 13.333 - M * 2;

function nen(s, mau = C.bg) {
  s.background = { color: mau };
}

// Vạch hổ phách mép trái — mô-típ lặp lại ở mọi slide nội dung.
function vach(s, y = 0.62, h = 0.62) {
  s.addShape(p.ShapeType.rect, { x: 0, y, w: 0.09, h, fill: { color: C.amberFill } });
}

function tieuDe(s, t, y = 0.6, size = 34) {
  s.addText(t, {
    x: M, y, w: W, h: 1.15, fontFace: F.head, fontSize: size, bold: true,
    color: C.text, align: "left", valign: "top", margin: 0,
  });
}

function chip(s, t, x, y, w, mau = C.amber) {
  s.addText(t, {
    x, y, w, h: 0.32, fontFace: F.mono, fontSize: 10.5, bold: true,
    color: mau, align: "left", valign: "middle", margin: 0, charSpacing: 1.2,
  });
}

function the(s, x, y, w, h, mau = C.surface, vien = C.line) {
  s.addShape(p.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.09,
    fill: { color: mau }, line: { color: vien, width: 1 },
  });
}

// ─────────────────────────────────────────── 1 · Bìa
{
  const s = p.addSlide(); nen(s);
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: C.amberFill } });
  s.addText("Custos", {
    x: M, y: 2.05, w: W, h: 1.25, fontFace: F.head, fontSize: 64, bold: true,
    color: C.text, margin: 0, valign: "bottom",
  });
  s.addText("Lớp kiểm tra giao dịch Solana — nói ra hậu quả trước khi bạn ký", {
    x: M, y: 3.42, w: 9.6, h: 0.5, fontFace: F.body, fontSize: 19, color: C.amber, margin: 0,
  });
  s.addText(
    "Phát hiện những hậu quả KHÔNG thuộc về hành động chính của một giao dịch,\nvà giải thích bằng tiếng Việt trước khi người dùng ký.",
    { x: M, y: 4.05, w: 9.6, h: 0.9, fontFace: F.body, fontSize: 15, color: C.muted, lineSpacing: 22, margin: 0 },
  );
  chip(s, "UNIHACKFEST 2026  ·  BEST PRODUCT & BUSINESS  ·  AI × WEB3", M, 5.5, 9.6, C.dim);
  s.addText("Đội Too Hard  ·  neitln.github.io/Custos-Solana", {
    x: M, y: 5.92, w: 9.6, h: 0.35, fontFace: F.mono, fontSize: 11, color: C.dim, margin: 0,
  });
  s.addNotes("0:00 — Không đọc slide. Nói thẳng: “Custos là lớp kiểm tra giao dịch Solana. Nó nói ra hậu quả trước khi bạn ký.” Rồi sang slide sau ngay.");
}

// ─────────────────────────────────────────── 2 · Bài toán
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Người ta ký mà không hiểu mình vừa ký gì");

  const cw = (W - 0.55) / 2;
  the(s, M, 1.95, cw, 3.5, C.surface);
  chip(s, "VÍ HIỆN TẠI CHO HỌ XEM", M + 0.35, 2.2, cw - 0.7, C.dim);
  s.addText(
    "Program: TokenkegQfeZ…VQ5DA\nInstruction: SetAuthority\nAccount #3: CRZa4k…9Wpicz\nInstruction: Transfer\nAmount: 500000000",
    { x: M + 0.35, y: 2.62, w: cw - 0.7, h: 2.55, fontFace: F.mono, fontSize: 13, color: C.muted, lineSpacing: 26, margin: 0 },
  );

  the(s, M + cw + 0.55, 1.95, cw, 3.5, C.amberSoft, C.amberFill);
  chip(s, "THỨ HỌ CẦN BIẾT", M + cw + 0.9, 2.2, cw - 0.7, C.amber);
  s.addText("Toàn bộ token của bạn sẽ bị chuyển đi,\nvà tài khoản sẽ đổi chủ.\n\nSau khi ký, bạn không lấy lại được.", {
    x: M + cw + 0.9, y: 2.7, w: cw - 0.7, h: 2.4, fontFace: F.body, fontSize: 19, color: C.text, lineSpacing: 30, margin: 0,
  });

  s.addText("Khoảng cách giữa hai cột này là chỗ tiền bị mất.", {
    x: M, y: 5.75, w: W, h: 0.45, fontFace: F.body, fontSize: 16, italic: true, color: C.amber, margin: 0,
  });
  s.addNotes("0:00–0:25 — Chỉ vào cột trái, im 2 giây cho giám khảo tự đọc mớ base58. KHÔNG dùng chữ “Web3”. Một câu mẹ bạn hiểu được.");
}

// ─────────────────────────────────────────── 3 · Đường nối
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Chúng em không cạnh tranh ở chỗ ví lớn mạnh");

  the(s, M, 1.95, W, 1.15, C.surface);
  s.addText("Ví lớn đã có mô phỏng giao dịch. Phantom cảnh báo SetAuthority bất thường.", {
    x: M + 0.4, y: 1.95, w: W - 0.8, h: 1.15, fontFace: F.body, fontSize: 17, color: C.muted, valign: "middle", margin: 0,
  });

  the(s, M, 3.32, W, 1.9, C.amberSoft, C.amberFill);
  s.addText("Vấn đề là lúc mô phỏng KHÔNG hiểu hết —", {
    x: M + 0.4, y: 3.55, w: W - 0.8, h: 0.5, fontFace: F.head, fontSize: 23, bold: true, color: C.text, margin: 0,
  });
  s.addText("Custos nói ra phần đó — đó là chỗ khác biệt.", {
    x: M + 0.4, y: 4.08, w: W - 0.8, h: 0.5, fontFace: F.head, fontSize: 23, bold: true, color: C.amber, margin: 0,
  });
  s.addText("Coinspect từng công bố một ca mô phỏng bỏ lọt lệnh đổi quyền sở hữu; lỗi đó đã được vá. Luận điểm ở đây là cấu trúc, không phải cáo buộc.", {
    x: M + 0.4, y: 4.62, w: W - 0.8, h: 0.45, fontFace: F.body, fontSize: 13.5, color: C.muted, margin: 0,
  });

  chip(s, "CUSTOS LUÔN NÓI RA PHẦN NÓ CHƯA HIỂU", M, 5.55, W, C.emerald);
  s.addText("Đã đọc hiểu 2 trên 3 lệnh  ·  1 chương trình chưa xác minh", {
    x: M, y: 5.92, w: W, h: 0.42, fontFace: F.mono, fontSize: 16, color: C.text, margin: 0,
  });
  s.addNotes("0:25–0:55 — BẢN LỀ, nói chậm.\n\n[!] PHẢI NÓI THÊM nếu bị hỏi: lỗi Coinspect đó ĐÃ ĐƯỢC VÁ. Luận điểm là về CẤU TRÚC — ví cần phương án dự phòng khi mô phỏng thất bại — KHÔNG phải cáo buộc Phantom đang có lỗ hổng. Nói sai chỗ này là mất điểm liêm chính.\n[!] Nói “Blowfish — công ty Phantom đã mua” ở THÌ QUÁ KHỨ.");
}

// ─────────────────────────────────────────── 4 · Demo
{
  const s = p.addSlide(); nen(s, C.bgAlt);
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: C.roseFill } });
  s.addText("DEMO", {
    x: M, y: 1.5, w: W, h: 1.1, fontFace: F.head, fontSize: 54, bold: true, color: C.text, margin: 0, charSpacing: 3,
  });
  s.addText("Cùng một giao dịch, hai kết cục", {
    x: M, y: 2.6, w: W, h: 0.5, fontFace: F.body, fontSize: 20, color: C.rose, margin: 0,
  });

  const ys = [3.5, 4.42, 5.34];
  const noi = [
    ["1", "Không có Custos — ký xong, số dư về 0 và tài khoản đổi chủ"],
    ["2", "Cùng giao dịch đó, có Custos — hậu quả hiện ra trước khi ký"],
    ["3", "Dòng “đã đọc hiểu 2 trên 3 lệnh” — nó tự khai phần nó chưa hiểu"],
  ];
  noi.forEach(([n, t], i) => {
    s.addShape(p.ShapeType.ellipse, { x: M, y: ys[i], w: 0.46, h: 0.46, fill: { color: C.surface }, line: { color: C.roseFill, width: 1.5 } });
    s.addText(n, { x: M, y: ys[i], w: 0.46, h: 0.46, fontFace: F.mono, fontSize: 14, bold: true, color: C.rose, align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: M + 0.72, y: ys[i], w: W - 0.72, h: 0.46, fontFace: F.body, fontSize: 16.5, color: C.text, valign: "middle", margin: 0 });
  });
  s.addNotes("0:55–2:15 — Chuyển sang trình duyệt. Nhịp 1 mất tiền, im 2 giây. Nhịp 2 cùng giao dịch đó.\n\nCHỈ TAY vào dòng coverage và nói: “nó tự khai phần nó chưa hiểu”.\n[!] ĐỌC ĐÚNG con số đang hiện trên màn hình. KHÔNG nói “10/11” — con số đó đã bị gỡ khỏi toàn bộ tài liệu.\nNếu demo chết: nói ngay “phần demo gặp sự cố, nhờ BTC chiếu video dự phòng” — đội KHÔNG mất lượt.");
}

// ─────────────────────────────────────────── 5 · Một SDK call
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Chi phí tích hợp: một lần gọi");

  the(s, M, 2.05, W, 2.5, C.code, C.code);
  s.addText(
    "const ketQua = await inspect(\n    { connection, interpret },\n    transaction,          // CHƯA ký\n    { locale: \"vi\" },\n);",
    { x: M + 0.45, y: 2.28, w: W - 0.9, h: 2.05, fontFace: F.mono, fontSize: 15, color: "6EE7B7", lineSpacing: 25, margin: 0 },
  );

  s.addText("Custos không hiển thị gì cả. Nó trả dữ liệu — ví toàn quyền quyết định giao diện.", {
    x: M, y: 4.85, w: W, h: 0.45, fontFace: F.body, fontSize: 17, color: C.text, margin: 0,
  });
  s.addText("Không smart contract. Không ghi gì lên chain. Không giữ tài sản của ai.", {
    x: M, y: 5.38, w: W, h: 0.45, fontFace: F.body, fontSize: 15, color: C.muted, margin: 0,
  });
  chip(s, "MỘT LỚP BẢO MẬT MÀ BẢN THÂN NÓ THÀNH MỤC TIÊU TẤN CÔNG THÌ HỎNG", M, 5.92, W, C.dim);
  s.addNotes("2:15–2:25 — 5–7 giây thôi. Một câu: “Một lần gọi để thêm lớp này vào ví hoặc dApp.”");
}

// ─────────────────────────────────────────── 6 · Thị trường
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Thị trường này đã được chứng minh hộ");

  const bw = (W - 1.1) / 3;
  const bs = [
    ["2024", "Phantom — ví lớn nhất Solana — mua đứt Blowfish", C.muted],
    ["SUNSET", "Dịch vụ bán rời bị đóng. blowfish.xyz nay là tên miền hết hạn", C.rose],
    ["HÔM NAY", "Dịch vụ bán rời của Blowfish đã dừng — thị trường có thật, có chỗ trống", C.amber],
  ];
  bs.forEach(([k, t, mau], i) => {
    const x = M + i * (bw + 0.55);
    the(s, x, 2.05, bw, 2.35, i === 2 ? C.amberSoft : C.surface, i === 2 ? C.amberFill : C.line);
    s.addText(k, { x: x + 0.3, y: 2.28, w: bw - 0.6, h: 0.45, fontFace: F.mono, fontSize: 15, bold: true, color: mau, margin: 0, charSpacing: 1.5 });
    s.addText(t, { x: x + 0.3, y: 2.82, w: bw - 0.6, h: 1.4, fontFace: F.body, fontSize: 15, color: C.text, lineSpacing: 22, margin: 0 });
  });

  s.addText("Đây là market validation do người khác bỏ tiền chứng minh — không phải lập luận đội tự nghĩ.", {
    x: M, y: 4.75, w: W, h: 0.45, fontFace: F.body, fontSize: 16, italic: true, color: C.amber, margin: 0,
  });
  s.addText("Ai trả tiền:  ví và dApp, không bao giờ là người dùng cuối.", {
    x: M, y: 5.45, w: W, h: 0.45, fontFace: F.body, fontSize: 17, color: C.text, margin: 0,
  });
  s.addText("Developer miễn phí có hạn mức  →  Startup trả theo lượt kiểm tra  →  Enterprise thuê bao kèm SLA", {
    x: M, y: 5.95, w: W, h: 0.42, fontFace: F.body, fontSize: 14, color: C.muted, margin: 0,
  });
  s.addNotes("2:25–2:50 — MỞ BẰNG câu Phantom mua Blowfish rồi đóng dịch vụ bán rời. Đây là market validation do người khác trả tiền chứng minh.\n\nChuẩn bị câu hỏi ngược “Phantom có rồi sao còn cần các em?” — trả lời ở PITCH mục 3 câu 1.");
}

// ─────────────────────────────────────────── 7 · Đơn vị kinh tế
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Chi phí một lượt kiểm tra: đo được");

  const cw = (W - 0.55) / 2;
  the(s, M, 2.05, cw, 2.15, C.surface, C.emerald);
  s.addText(String(S.chiPhi.luotGoiRpc.trungVi).replace(".", ","), {
    x: M + 0.4, y: 2.25, w: cw - 0.8, h: 1.0, fontFace: F.head, fontSize: 52, bold: true, color: C.emerald, margin: 0,
  });
  s.addText("lượt gọi RPC mỗi lượt kiểm tra (trung vị)", {
    x: M + 0.4, y: 3.22, w: cw - 0.8, h: 0.4, fontFace: F.body, fontSize: 15, color: C.text, margin: 0,
  });
  s.addText(`thấp ${S.chiPhi.luotGoiRpc.thap} · cao ${S.chiPhi.luotGoiRpc.cao} · đo trên ${S.chiPhi.soMau} giao dịch công khai đã lưu offline`, {
    x: M + 0.4, y: 3.62, w: cw - 0.8, h: 0.4, fontFace: F.mono, fontSize: 11, color: C.muted, margin: 0,
  });

  the(s, M + cw + 0.55, 2.05, cw, 2.15, C.surface, C.emerald);
  s.addText("400", {
    x: M + cw + 0.95, y: 2.25, w: cw - 0.8, h: 1.0, fontFace: F.head, fontSize: 52, bold: true, color: C.emerald, margin: 0,
  });
  s.addText("token — TRẦN CỨNG đầu ra của mô hình", {
    x: M + cw + 0.95, y: 3.22, w: cw - 0.8, h: 0.4, fontFace: F.body, fontSize: 15, color: C.text, margin: 0,
  });
  s.addText("chi phí AI mỗi lượt có trần, không trôi được", {
    x: M + cw + 0.95, y: 3.62, w: cw - 0.8, h: 0.4, fontFace: F.mono, fontSize: 11, color: C.muted, margin: 0,
  });

  the(s, M, 4.55, W, 1.05, C.surface);
  s.addText("Neo giá: Helius và QuickNode — hạ tầng chính những khách hàng này đang trả tiền — đều đặt tầng trả tiền đầu tiên ở $49/tháng.", {
    x: M + 0.4, y: 4.55, w: W - 0.8, h: 1.05, fontFace: F.body, fontSize: 15, color: C.text, valign: "middle", margin: 0,
  });
  s.addText("Chúng em chưa chốt giá của mình, và chưa có cam kết nào từ ví/dApp. Đây là số tham chiếu, không phải validation.", {
    x: M, y: 5.85, w: W, h: 0.45, fontFace: F.body, fontSize: 13, italic: true, color: C.dim, margin: 0,
  });
  s.addNotes("2:50–3:10 — Con số 6,5 là TRUNG VỊ đo trên 20 giao dịch công khai ĐÃ LƯU OFFLINE — không phải runtime. [!] KHÔNG nói “mainnet” trên sân khấu: demo chạy hoàn toàn trên Devnet, và nhãn devnet-only nằm ngay trong README.\n\n[!] KHÔNG nói một tỉ lệ biên lợi nhuận cụ thể. Chưa tra bảng trọng số credit, chưa đo token, chưa có giá bán — ba ô trống thì không ra được tỉ lệ. Nói “biên gộp 90%” là bịa.\n[!] $49 là giá của NGƯỜI KHÁC, không phải giá của Custos.");
}

// ─────────────────────────────────────────── 8 · AI và giới hạn
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "AI làm gì, và tuyệt đối không được làm gì");

  the(s, M, 2.05, W, 1.35, C.roseSoft, C.roseFill);
  s.addText("AI không được xác nhận giao dịch an toàn, cũng không được kết luận giao dịch nguy hiểm.", {
    x: M + 0.4, y: 2.05, w: W - 0.8, h: 1.35, fontFace: F.head, fontSize: 21, bold: true, color: C.text, valign: "middle", margin: 0,
  });

  const cw = (W - 0.55) / 2;
  the(s, M, 3.65, cw, 1.95, C.surface);
  chip(s, "ENGINE LUẬT  ·  14 LUẬT XÁC ĐỊNH", M + 0.35, 3.88, cw - 0.7, C.emerald);
  s.addText("level: safe | warning | danger", {
    x: M + 0.35, y: 4.28, w: cw - 0.7, h: 0.4, fontFace: F.mono, fontSize: 14, color: C.text, margin: 0,
  });
  s.addText("Quyết định mức cảnh báo. AI không chạm vào trường này.", {
    x: M + 0.35, y: 4.72, w: cw - 0.7, h: 0.7, fontFace: F.body, fontSize: 14, color: C.muted, lineSpacing: 20, margin: 0,
  });

  the(s, M + cw + 0.55, 3.65, cw, 1.95, C.surface);
  chip(s, "AI  ·  TRƯỜNG RIÊNG", M + cw + 0.9, 3.88, cw - 0.7, C.indigo);
  s.addText("aiAdvisory: review_required", {
    x: M + cw + 0.9, y: 4.28, w: cw - 0.7, h: 0.4, fontFace: F.mono, fontSize: 14, color: C.text, margin: 0,
  });
  s.addText("Chỉ được yêu cầu kiểm tra thủ công. AI hỏng thì verdict vẫn còn.", {
    x: M + cw + 0.9, y: 4.72, w: cw - 0.7, h: 0.7, fontFace: F.body, fontSize: 14, color: C.muted, lineSpacing: 20, margin: 0,
  });

  s.addText("Một lớp bảo mật để AI phán “an toàn” là lớp bảo mật sẽ nói dối vào đúng ngày quan trọng nhất.", {
    x: M, y: 5.85, w: W, h: 0.45, fontFace: F.body, fontSize: 14.5, italic: true, color: C.amber, margin: 0,
  });
  s.addNotes("3:10–3:30 — Câu “AI không được xác nhận an toàn” là câu ghi điểm với giám khảo bảo mật. Nói NGUYÊN VĂN.\n\nNếu bị hỏi AI có tham gia quyết verdict không: KHÔNG. level chỉ do engine luật tạo ra.");
}

// ─────────────────────────────────────────── 9 · Con số thật
{
  const s = p.addSlide(); nen(s);
  vach(s);
  tieuDe(s, "Con số thật — đo được, truy được nguồn");

  const bw = (W - 1.65) / 4;
  const so = [
    // "CÁO BUỘC", KHÔNG phải "gắn cờ". Hai chữ này không thay nhau được: caoBuoc là
    // số giao dịch có mã lý do BUỘC TỘI, còn số bị gắn cờ ở mức Vàng là
    // S.cohort.verdict.warning — khác 0. Slide cũ ghi "0 giao dịch bị gắn cờ" trong
    // khi 7 giao dịch thật sự đã bị gắn cờ; đó là nói quá về chính mình, trên đúng
    // cái slide con số. README đã phân biệt cẩn thận hai chữ này rồi.
    [
      String(S.cohort.caoBuoc),
      "giao dịch bị CÁO BUỘC",
      `trên ${S.cohort.mauDoDuoc} giao dịch SPL công khai đã lưu offline · ${S.cohort.verdict.warning} ở mức Cần xem kỹ · cohort chưa gán nhãn ground truth`,
      C.emerald,
    ],
    [String(S.test.pass), "test tự động", "chạy lại mỗi lần deploy", C.text],
    [String(S.soLuat), "luật xác định", `${S.soMau} mẫu kiểm thử`, C.text],
    [`${S.cohort.coveragePhanTram}%`, "lệnh đọc hiểu được", "phần còn lại KHÔNG đoán", C.amber],
  ];
  so.forEach(([n, t, ghi, mau], i) => {
    const x = M + i * (bw + 0.55);
    the(s, x, 2.05, bw, 2.6, C.surface, i === 0 ? C.emerald : C.line);
    s.addText(n, { x: x + 0.25, y: 2.25, w: bw - 0.5, h: 0.95, fontFace: F.head, fontSize: 44, bold: true, color: mau, margin: 0 });
    s.addText(t, { x: x + 0.25, y: 3.2, w: bw - 0.5, h: 0.6, fontFace: F.body, fontSize: 14.5, color: C.text, lineSpacing: 19, margin: 0 });
    s.addText(ghi, { x: x + 0.25, y: 3.82, w: bw - 0.5, h: 0.7, fontFace: F.body, fontSize: 11, color: C.dim, lineSpacing: 16, margin: 0 });
  });

  s.addText("Mọi con số sinh ra từ một phép đo có file trong repo, không có số nào gõ tay.", {
    x: M, y: 5.0, w: W, h: 0.42, fontFace: F.body, fontSize: 15, color: C.text, margin: 0,
  });
  s.addText("neitln.github.io/Custos-Solana/so-lieu.html  —  mỗi con số kèm cách đo và ngày đo", {
    x: M, y: 5.44, w: W, h: 0.4, fontFace: F.mono, fontSize: 12, color: C.amber, margin: 0,
  });
  // Dòng "còn thiếu gì" phải theo dữ liệu THẬT, không phải theo lúc viết deck.
  // Bản trước ghi cứng "Chưa có: phỏng vấn người dùng" — đội đã hỏi 20 người ngày
  // 29–30/08 và dòng đó thành nói sai về chính mình, theo hướng khiêm tốn quá mức.
  const pv = S.phongVan;
  const dongThieu = pv
    ? `Đã hỏi ${pv.n} người (29–30/08): ${pv.hieu.dung}/${pv.n} nêu được hậu quả · ${pv.quyetDinh.ky}/${pv.n} vẫn ký. Chưa ví/dApp nào cam kết tích hợp.`
    : "Chưa có: phỏng vấn người dùng, và chưa ví/dApp nào cam kết tích hợp. Chúng em nói thẳng chỗ còn thiếu.";
  s.addText(dongThieu, {
    x: M, y: 5.92, w: W, h: 0.42, fontFace: F.body, fontSize: 13, italic: true, color: C.dim, margin: 0,
  });
  const ghiChuPV = pv
    ? `\n\nSỐ NGƯỜI DÙNG — nói kèm ĐÚNG ba mệnh đề này, đừng bỏ mệnh đề nào:\n` +
      `  · ${pv.hieu.dung}/${pv.n} nêu được hậu quả. "Một phần" (${pv.hieu.motPhan}) KHÔNG gộp vào.\n` +
      `  · ${pv.quyetDinh.ky}/${pv.n} vẫn ký — nhưng ${pv.hieuDungVanKy} trong số đó HIỂU ĐÚNG và cố ý chấp nhận rủi ro trên ví phụ. Chỉ ${pv.quyetDinh.ky - pv.hieuDungVanKy} người ký vì đọc nhầm.\n` +
      `  · Đo ngày 29–30/08 trên bản giao diện LÚC ĐÓ; tấm cảnh báo đã được thiết kế lại sau đó. ĐỪNG nói "đo trên đúng màn hình các anh chị vừa xem".\n` +
      `[!] Hỏi qua tin nhắn và video call, một người hỏi cả 20 — không có chấm chéo. Nói ra nếu bị hỏi về phương pháp.`
    : "";
  s.addNotes(
    "3:30–3:55 — Đọc đúng số, không làm tròn lên.\n\nDÒNG CUỐI CÙNG LÀ DÒNG QUAN TRỌNG NHẤT SLIDE NÀY: tự nói ra chỗ còn thiếu. Thừa nhận trước thì mất một chút; để giám khảo moi ra thì mất nhiều hơn." +
      ghiChuPV,
  );
}

// ─────────────────────────────────────────── 10 · Kết
{
  const s = p.addSlide(); nen(s, C.bgAlt);
  s.addShape(p.ShapeType.rect, { x: 0, y: 0, w: 0.14, h: 7.5, fill: { color: C.amberFill } });
  s.addText("Custos không bao giờ nói “an toàn”\nkhi nó chưa chắc.", {
    x: M, y: 2.35, w: 11.4, h: 1.8, fontFace: F.head, fontSize: 38, bold: true, color: C.text, lineSpacing: 52, margin: 0,
  });
  s.addText("Nó nói ra hậu quả đo được — và nói ra cả phần nó chưa đo được.", {
    x: M, y: 4.25, w: 11.4, h: 0.5, fontFace: F.body, fontSize: 18, color: C.amber, margin: 0,
  });
  s.addText(
    "Demo:  neitln.github.io/Custos-Solana\nSố liệu:  neitln.github.io/Custos-Solana/so-lieu.html\nMã nguồn:  github.com/NeitLN/Custos-Solana",
    { x: M, y: 5.15, w: 11.4, h: 1.2, fontFace: F.mono, fontSize: 13, color: C.muted, lineSpacing: 24, margin: 0 },
  );
  s.addNotes("3:55–4:00 — Một câu, dừng. Đừng cảm ơn dài dòng, để dành thời gian cho Q&A.\n\nCác câu hỏi khó có sẵn câu trả lời ở PITCH-VA-PHAN-BIEN.md mục 3, 4 và 4b. Câu build-vs-buy (số 10) quan trọng ngang câu 1 ở track này.");
}

p.writeFile({ fileName: process.argv[2] }).then(() => console.log("✓ " + process.argv[2]));

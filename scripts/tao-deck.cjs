// Custos — TB-D02. Native text/shapes only; no external image decoding.
const PptxGenJS = require('pptxgenjs');
const fs = require('fs');
const S = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const p = new PptxGenJS();
p.defineLayout({name:'CUSTOS',width:13.333,height:7.5}); p.layout='CUSTOS';
p.author='Đội Too Hard'; p.title='Custos — Technical Build'; p.subject='SDK phân tích giao dịch Solana trước ký';
p.lang='vi-VN';
const C={ink:'172033',muted:'536079',blue:'3348B8',green:'087F61',red:'B52046',soft:'F1F4FA',white:'FFFFFF',dark:'121B31'};
const rect=(s,x,y,w,h,color)=>s.addShape(p.ShapeType.roundRect,{x,y,w,h,rectRadius:0.16,radius:0.16,line:{color,transparency:100},fill:{color},radius:0.1});
function text(s,t,x,y,w,h,size=22,color=C.ink,bold=false){s.addText(t,{x,y,w,h,fontFace:'Calibri',fontSize:size,color,bold,margin:0,breakLine:false,valign:'top',paraSpaceAfterPt:8});}
function slide(k,title,sub,source,dark=false){
 const s=p.addSlide();s.background={color:dark?C.dark:C.white};
 text(s,`CUSTOS   /   ${k}`,0.65,0.35,12,0.3,12,dark?'A7B7E5':C.blue,true);
 text(s,title,0.65,0.95,12,1.12,34,dark?C.white:C.ink,true);
 if(sub)text(s,sub,0.65,2.03,12,0.65,18,dark?'C9D3EA':C.muted);
 text(s,source,0.65,6.83,11.9,0.38,10,dark?'A7B7E5':C.muted);
 return s;
}
function card(s,x,y,w,label,body,color=C.blue){rect(s,x,y,w,2.5,C.soft);text(s,label,x+0.22,y+0.22,w-0.44,0.6,22,color,true);text(s,body,x+0.22,y+0.95,w-0.44,1.3,18);}
{
 const s=slide('01 / MỞ ĐẦU','Hiểu hậu quả trước khi ký.','Transaction-intelligence SDK cho ví và dApp Solana','Hướng phát triển: Best Technical Build · đăng ký BTC chưa xác nhận đổi · thời lượng vòng hiện tại chưa xác nhận',true);
 text(s,'Đo được gì, nói rõ điều đó.\nChưa hiểu gì, giữ lại giới hạn.',0.7,3.0,10.7,1.5,36,C.white,true);
 text(s,'Mô phỏng → dữ kiện → luật → bằng chứng → quyết định của ví',0.7,5.5,11.7,0.5,22,'B6C8FF');
 s.addNotes('Mở bằng vấn đề khi ký, không mở bằng market-size. Bản tập tham chiếu 4 phút; xác nhận thời lượng thực tế với BTC. Track trong hồ sơ cũ chưa xác nhận cập nhật.');
}
{
 const s=slide('02 / BÀI TOÁN','Số dư không đổi. Quyền kiểm soát có thể đổi.','Đó là lý do chỉ nhìn số tiền chưa đủ.','Nguồn: core/src/diff.ts · scripts/ky-thuat/so-baseline-b06.ts');
 card(s,0.7,3.0,5.75,'CHỈ ĐỔI QUYỀN','SetAuthority có thể đổi owner mà không chuyển số dư.',C.red);
 card(s,6.85,3.0,5.75,'PHẢI ĐỌC ĐÚNG HẬU QUẢ','Chỉ vẽ số dư giảm khi transaction thực sự làm giảm số dư.');
 s.addNotes('Không nói mọi ví thương mại chỉ đọc balance delta. Đây là giới hạn của baseline được mô tả, không phải so sánh với sản phẩm chưa kiểm.');
}
{
 const s=slide('03 / DEMO','Một lời mời nhận quà. Hai hậu quả.','Chạy trực tiếp trên ví mẫu — Devnet, transaction chưa ký.','Nguồn: hien-truong.json · scripts/tan-cong.ts · evidence TB-B07');
 card(s,0.7,3.0,3.85,'01 · CHUYỂN TOKEN','Xem số dư trước → sau thật từ simulation.',C.red);
 card(s,4.75,3.0,3.85,'02 · ĐỔI OWNER','Xem tài khoản nào mất quyền kiểm soát.',C.red);
 card(s,8.8,3.0,3.85,'03 · COVERAGE','Đọc đúng phần chưa hiểu đang hiện trên màn hình.');
 s.addNotes('Chuyển sang demo Nhận quà tặng. Chỉ vào token chuyển đi và owner đổi. Mở Chi tiết kỹ thuật: rule/reason có sẵn, luật 1 chưa có trace dữ kiện có cấu trúc. Không nói giao dịch đã gửi: demo chỉ mô phỏng. Sau đó mở ca Gửi 10 token làm đối chứng.');
}
{
 const s=slide('04 / KIẾN TRÚC','Ba tầng, ba trách nhiệm.','L1 đo · L2 quyết định mức · L3 diễn giải tùy chọn','Nguồn: core/src/l1/fetch.ts · core/src/l2/evaluate.ts · core/src/inspect.ts');
 card(s,0.7,3.0,3.85,'L1 · FACTS','Account trước/sau\nSimulation + CPI + ALT\nPhần dữ liệu còn thiếu');
 card(s,4.75,3.0,3.85,`L2 · ${S.soLuat} LUẬT`,'Verdict + reasonCodes\nHậu quả có căn cứ\nMức thận trọng khi cần');
 card(s,8.8,3.0,3.85,'L3 · GIẢI THÍCH','Template hoặc model\nKhông hạ verdict\nCó đường lui khi lỗi');
 s.addNotes('Trace phải dựa trên cùng lượt đo. Không gọi lại RPC rồi ghép dữ liệu mới vào verdict cũ. Simulation là quan sát tại thời điểm đọc, không bảo đảm trạng thái khi thực thi sau đó.');
}
{
 const s=slide('05 / RANH GIỚI','SDK trả thông tin. Ví thực thi chính sách.','Điểm chặn nằm trước signer của consumer.','Nguồn: vi-du-tich-hop/src/ky.js · docs/bao-mat/THREAT-MODEL.md');
 const labels=['inspect()','policy + review','đúng message','signer'];
 labels.forEach((v,i)=>{rect(s,0.7+i*3.07,3.2,2.85,1.3,C.soft);text(s,v,0.9+i*3.07,3.58,2.45,0.5,21,C.blue,true);});
 text(s,'DApp tự khai đúng không được làm giảm nghi ngờ.\nConsumer bỏ qua policy nằm ngoài khả năng cưỡng chế của SDK.',0.75,5.15,11.85,1.0,22);
 s.addNotes('Trả lời ai chặn ký bằng code consumer. Lỗi xác nhận, mất phản hồi và message cũ đều có trạng thái riêng; đừng nói exactly-once trên toàn mạng.');
}
{
 const s=slide('06 / SO SÁNH','Custos thêm được gì vào cùng một đầu vào?','So sánh thành phần B06; không phải benchmark đối thủ thương mại.','Nguồn: npm run so-baseline · Facts và kỳ vọng được mô tả trong scripts/ky-thuat/so-baseline-b06.ts');
 card(s,0.7,3.0,3.85,'TOP-LEVEL','Thấy lệnh bên ngoài.\nPhạm vi baseline không đi xuống CPI.');
 card(s,4.75,3.0,3.85,'BALANCE DELTA','Thấy số tiền thay đổi.\nKhông đủ để mô tả mọi thay đổi quyền.');
 card(s,8.8,3.0,3.85,'PIPELINE CUSTOS','Ghép dữ kiện + luật + giới hạn.\nKết quả vẫn chỉ đúng trong phạm vi kiểm.',C.green);
 s.addNotes('Mở kết quả B06 nếu bị hỏi. Không dùng verdict của Custos tự tạo nhãn để chứng minh Custos đúng. Nêu cả ca không thêm lợi ích.');
}
{
 const s=slide('07 / KIỂM CHỨNG','Mỗi tầng bằng chứng trả lời một câu hỏi.','Không cộng số test thành tỷ lệ phát hiện.','Nguồn: so-lieu.json · data/benchmark/manifest.json · báo cáo TB-B07');
 card(s,0.7,3.0,3.85,`${S.test.pass} test`,'Hồi quy implementation\nKhông phải accuracy thị trường.');
 card(s,4.75,3.0,3.85,`${S.soMau} mẫu seed`,'Facts / RPC replay\nGhi rõ synthetic và dữ liệu lịch sử.');
 card(s,8.8,3.0,3.85,'DEVNET LIVE','Kiểm riêng ca demo thật\nKhông gọi replay là live.',C.green);
 s.addNotes('Đọc kết quả đo hiện hành, kèm ngày/revision. Live smoke suite không có nghĩa toàn bộ manifest đã chạy trên Devnet. Mẫu không chạy được phải giữ mẫu số và lý do.');
}
{
 const s=slide('08 / TÍCH HỢP','SDK chạy được ngoài monorepo.','Bên tích hợp tự chọn policy và lớp diễn giải.','Nguồn: npm run thu-goi · npm run thu-tich-hop:devnet · data/tich-hop/ket-qua.json');
 card(s,0.7,3.0,5.75,'CONSUMER ĐỘC LẬP','Cài tarball, chạy JavaScript và kiểm TypeScript.\nRPC lỗi không được mở đường ký.');
 card(s,6.85,3.0,5.75,'GIỚI HẠN ĐÚNG TÊN','Ví dụ tích hợp do đội dựng.\nChưa có partner pilot hay khách hàng xác nhận.');
 s.addNotes('Không gọi đây là third-party adoption. Chỉ nêu thời gian cài đặt/lượt inspect nếu mở đúng artifact mới nhất. Đọc đủ phạm vi của số dòng tích hợp: phần policy/signing có file riêng.');
}
{
 const s=slide('09 / GIỚI HẠN','AI không sở hữu phán quyết.','Hiện chưa chứng minh lợi ích vượt template trên phép đo đang có.','Nguồn: data/eval/ai-ket-qua.json · docs/DON-VI-KINH-TE.md · docs/PHU-THUOC.md');
 card(s,0.7,3.0,5.75,'RANH GIỚI','AI không được xác nhận giao dịch an toàn, cũng không được kết luận giao dịch nguy hiểm.',C.red);
 card(s,6.85,3.0,5.75,'PHẦN CÒN MỞ','RPC là giả định tin cậy.\nProgram chưa biết, advisory và giới hạn browser được công khai.');
 s.addNotes('Không nói type TypeScript chứng minh model luôn an toàn. Lời giải thích sai vẫn có thể tác động người dùng dù level không đổi. Không gọi advisory đã xử trí là đã vá.');
}
{
 const s=slide('10 / KẾT','Một cảnh báo cần có đường truy về bằng chứng.','Rule/reason đã có; trace dữ kiện có cấu trúc mới phủ 2/14 luật.','Demo: neitln.github.io/Custos-Solana/ · Repo: github.com/NeitLN/Custos-Solana',true);
 text(s,'Xem hậu quả.\nXem lý do.\nXem phần chưa biết.',0.8,3.0,11.8,2.4,40,C.white,true);
 s.addNotes('Kết phần chính ở đây. Các slide sau dành cho Q&A, không đưa nội dung thị trường vào phần chính nếu chưa có bằng chứng.');
}
{
 const s=slide('11 / Q&A','Vì sao không viết smart contract riêng?','Thiết kế hiện tại thực hiện trách nhiệm đọc và mô phỏng ở phía ví.','Nguồn: ADR-0001 · CLAUDE.md quyết định 5 · TB-H01');
 card(s,0.7,3.0,5.75,'LÝ DO KỸ THUẬT','Contract mới không tự xác thực dữ liệu RPC hoặc khiến ví bắt buộc dùng SDK.');
 card(s,6.85,3.0,5.75,'RỦI RO RUBRIC','Cách chấm mục smart contract cho SDK còn cần BTC xác nhận.\nKhông khẳng định chắc được tối đa điểm.');
 s.addNotes('Giữ ranh giới phạm vi đã khóa. Nếu BTC yêu cầu khác, đội cần quyết định sản phẩm riêng, không thêm contract trang trí vào phút cuối.');
}
{
 const s=slide('12 / PHỤ LỤC','Kinh doanh là giả thuyết, chưa được xác nhận.','Tài liệu dự phòng từ hướng Product & Business; không thuộc mạch Technical chính.','Nguồn: docs/MO-HINH-DOANH-THU.md · không phải traction');
 card(s,0.7,3.0,5.75,'CORE MIỄN PHÍ','Mã nguồn mở; dịch vụ hỗ trợ/tích hợp có thể là hướng khảo sát.');
 card(s,6.85,3.0,5.75,'GIẢ ĐỊNH','Chưa hỏi người mua nào.\nChưa có giá hoặc nhu cầu trả tiền được xác nhận.',C.red);
 s.addNotes('Chỉ dùng khi bị hỏi mô hình kinh doanh. Không suy ra market validation từ việc SDK chạy được.');
}
p.writeFile({fileName:process.argv[2]}).then(()=>console.log('Đã dựng '+process.argv[2]+' · 12 slide Technical/Q&A'));

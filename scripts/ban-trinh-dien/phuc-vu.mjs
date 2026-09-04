/**
 * MÁY CHỦ TĨNH TỐI GIẢN — không phụ thuộc gói nào.
 *
 * Vì sao cần: bản dựng là ES module, và trình duyệt CHẶN module khi mở bằng
 * `file://` (chính sách cùng nguồn). Bấm đúp `index.html` sẽ ra trang trắng.
 * Phải có một máy chủ, dù chỉ để phục vụ vài file.
 *
 * Vì sao tự viết thay vì `npx serve`: `npx` cần mạng ở lần đầu và cần npm đúng
 * bản. Thư mục này phải chạy được trên máy lạ, ngay cả khi mạng chập chờn — mà
 * mạng chập chờn đúng là lúc người ta cần nó nhất.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const GOC = resolve(import.meta.dirname);
const CONG = Number(process.argv[2] ?? 8080);

const KIEU = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const may = createServer(async (yc, tl) => {
  try {
    let duong = decodeURIComponent((yc.url ?? "/").split("?")[0].split("#")[0]);
    if (duong.endsWith("/")) duong += "index.html";

    // Chặn đi ngược ra ngoài thư mục: `normalize` gộp `..` rồi mới ghép, và kết
    // quả phải vẫn nằm trong GOC. Máy chủ này chỉ chạy cục bộ, nhưng một máy chủ
    // phục vụ được `../../` là thứ không nên tồn tại kể cả trong năm phút.
    const that = join(GOC, normalize(duong));
    if (!that.startsWith(GOC)) {
      tl.writeHead(403).end("403");
      return;
    }

    const noi = await readFile(that);
    tl.writeHead(200, {
      "Content-Type": KIEU[extname(that).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    }).end(noi);
  } catch {
    tl.writeHead(404, { "Content-Type": "text/html; charset=utf-8" }).end(
      "<h1>404</h1><p>Không có file này. Thử <a href='/phong-van.html'>/phong-van.html</a>.</p>",
    );
  }
});

may.on("error", (e) => {
  if (e.code === "EADDRINUSE") {
    console.error(`\n✖ Cổng ${CONG} đang bận. Chạy lại với cổng khác:`);
    console.error(`    node phuc-vu.mjs 8081\n`);
  } else {
    console.error("\n✖", e.message, "\n");
  }
  process.exit(1);
});

may.listen(CONG, () => {
  const goc = `http://localhost:${CONG}`;
  console.log(`
  CUSTOS — bản trình diễn mang đi

    Màn hình phỏng vấn   ${goc}/phong-van.html    <- mở cái này
    Ví mẫu               ${goc}/
    Trang lừa đảo giả    ${goc}/tan-cong/
    Trang số liệu        ${goc}/so-lieu.html

  CẦN MẠNG. Màn hình cảnh báo được dựng bằng cách mô phỏng thật trên Solana
  Devnet, nên không có mạng thì nó hiện thẻ lỗi chứ không hiện cảnh báo.

  Dừng: Ctrl+C
`);
});

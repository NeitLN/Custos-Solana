/**
 * Màn nào mở trước khi vào ví mẫu.
 *
 * Phân tích là MẶC ĐỊNH (review 26/09, mục 3.1): nó chạy với mọi người, không cần khoá.
 * Màn thực thi cần file khoá riêng của ví demo mới làm được gì — mở mặc định thì người
 * xem bản công khai thấy toàn nút khoá. Nó chỉ mở khi được gọi đích danh bằng
 * `?thucThi=1`. Yêu cầu phân tích (`#tx=` từ dApp, `?mock=`, `?analysis=1`) luôn thắng.
 */
export function initialWalletSurface(search: string, hash: string): 'wallet' | 'analysis' {
  const params = new URLSearchParams(search);
  const yeuCauPhanTich = params.has('mock') || params.get('analysis') === '1' || new URLSearchParams(hash.replace(/^#/, '')).has('tx');
  if (yeuCauPhanTich) return 'analysis';
  return params.get('thucThi') === '1' ? 'wallet' : 'analysis';
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialWalletSurface } from '../src/walletSurface.ts';

/*
 * Review 26/09, mục 3.1: màn thực thi cần file khoá riêng để làm BẤT CỨ gì — mở mặc định
 * cho mọi người xem thì số dư "Chưa đo", mọi nút khoá, và thứ Custos làm không thấy
 * được. Phân tích thì chạy được với mọi người, không cần khoá. Nên phân tích là mặc định;
 * thực thi chỉ mở khi được gọi đích danh.
 */
test('wallet opens ANALYSIS by default — it works without any key', () => {
  assert.equal(initialWalletSurface('', ''), 'analysis');
  assert.equal(initialWalletSurface('', '#section'), 'analysis');
});
test('execution opens only when asked for explicitly', () => {
  assert.equal(initialWalletSurface('?thucThi=1', ''), 'wallet');
  assert.equal(initialWalletSurface('?thucThi=0', ''), 'analysis');
});
test('analysis-only requests stay in analysis even if execution is asked for', () => {
  assert.equal(initialWalletSurface('?analysis=1', ''), 'analysis');
  assert.equal(initialWalletSurface('?mock=danger&thucThi=1', ''), 'analysis');
  assert.equal(initialWalletSurface('?thucThi=1', '#tx=invalid'), 'analysis');
});

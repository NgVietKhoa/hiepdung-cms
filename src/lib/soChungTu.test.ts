import { describe, expect, it } from 'vitest';
import { soKeTiep } from './soChungTu';

describe('soKeTiep', () => {
  it('bắt đầu từ 001 khi chưa có', () => {
    expect(soKeTiep([], 'BG', 2026, 3)).toBe('BG-2026-001');
  });
  it('tăng dần theo số lớn nhất trong năm, bỏ qua năm khác', () => {
    expect(soKeTiep(['BG-2026-001', 'BG-2026-007', 'BG-2025-099'], 'BG', 2026, 3)).toBe('BG-2026-008');
  });
  it('sang năm mới quay về 001', () => {
    expect(soKeTiep(['BG-2026-120'], 'BG', 2027, 3)).toBe('BG-2027-001');
  });
  it('vượt quá số chữ số vẫn đúng', () => {
    expect(soKeTiep(['NT-2026-999'], 'NT', 2026, 3)).toBe('NT-2026-1000');
  });
});

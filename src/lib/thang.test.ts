import { describe, expect, it } from 'vitest';
import { cacNgayTrongThang, congThang, khoangThang, laThang, soNgayTrongThang, tenThang, thuCuaNgay } from './thang';

describe('tháng', () => {
  it('cộng / trừ tháng qua năm', () => {
    expect(congThang('2026-10', 1)).toBe('2026-11');
    expect(congThang('2026-12', 1)).toBe('2027-01');
    expect(congThang('2026-01', -1)).toBe('2025-12');
    expect(congThang('2026-10', -22)).toBe('2024-12');
  });

  it('số ngày, kể cả tháng 2 năm nhuận', () => {
    expect(soNgayTrongThang('2026-02')).toBe(28);
    expect(soNgayTrongThang('2028-02')).toBe(29);
    expect(soNgayTrongThang('2026-10')).toBe(31);
    expect(cacNgayTrongThang('2026-04')).toHaveLength(30);
    expect(cacNgayTrongThang('2026-04')[0]).toBe('2026-04-01');
  });

  it('thứ trong tuần', () => {
    expect(thuCuaNgay('2026-10-04')).toBe(0); // Chủ nhật
    expect(thuCuaNgay('2026-10-05')).toBe(1);
  });

  it('kiểm tra định dạng và khoảng lọc', () => {
    expect(laThang('2026-10')).toBe(true);
    expect(laThang('2026-13')).toBe(false);
    expect(laThang('2026-1')).toBe(false);
    expect(khoangThang('2026-12')).toEqual({ tu: '2026-12-01', den: '2027-01-01' });
    expect(tenThang('2026-03')).toBe('Tháng 03/2026');
  });
});

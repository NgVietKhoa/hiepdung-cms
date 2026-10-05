import { describe, expect, it } from 'vitest';
import type { CotHangMuc } from '../db/kieu';
import { boCucBang, chuanHoaDsCot, chuanHoaGiaTriCotThem, cotDangHien } from './cotHangMuc';

/** Bộ cột giống dữ liệu ban đầu (prisma/seed.ts) để thử bố cục */
const cot = (truong: CotHangMuc['truong'], doRong: number, heSoGian = 0, them: Partial<CotHangMuc> = {}): CotHangMuc => ({
  id: truong ?? `tu-them-${doRong}`,
  truong,
  tieuDe: truong ?? 'Cột thêm',
  goiY: '',
  kieu: 'chu',
  an: false,
  batBuoc: false,
  doRong,
  heSoGian,
  thuTu: 0,
  ...them,
});
const danhSo = (ds: CotHangMuc[]) => ds.map((c, i) => ({ ...c, thuTu: i }));
const MAU = danhSo([
  cot('tenHangMuc', 160, 2),
  cot('quyCach', 120, 1.4),
  cot('donViTinh', 84),
  cot('soLuong', 96),
  cot('donGia', 150),
  cot('thanhTien', 140),
]);
const soCot = (b: ReturnType<typeof boCucBang>) => b.bien['--cot-bang'].split(/ (?![^(]*\))/).length;

describe('chuanHoaDsCot', () => {
  it('bỏ cột thiếu id, trùng id, trùng trường; đánh lại thứ tự theo vị trí', () => {
    const kq = chuanHoaDsCot([
      { id: 'a', truong: 'soLuong', tieuDe: 'SL' },
      { tieuDe: 'không id' },
      { id: 'a', tieuDe: 'trùng id' },
      { id: 'b', truong: 'soLuong', tieuDe: 'trùng trường' },
      { id: 'c', truong: 'khongCo', tieuDe: 'Xuất xứ' },
    ]);
    expect(kq.map((c) => [c.id, c.truong, c.thuTu])).toEqual([
      ['a', 'soLuong', 0],
      ['c', null, 1],
    ]);
  });

  it('cột bắt buộc không ẩn được; bề rộng bị giới hạn; kiểu lạ → chữ', () => {
    const [c] = chuanHoaDsCot([{ id: 'a', batBuoc: true, an: true, doRong: 5000, heSoGian: -1, kieu: 'ngay' }]);
    expect(c).toMatchObject({ an: false, doRong: 600, heSoGian: 0, kieu: 'chu' });
  });

  it('dữ liệu không phải mảng → rỗng', () => {
    expect(chuanHoaDsCot({})).toEqual([]);
  });
});

describe('chuanHoaGiaTriCotThem', () => {
  it('chỉ giữ chuỗi có nội dung', () => {
    expect(chuanHoaGiaTriCotThem({ a: 'VN', b: 5, c: '', d: null })).toEqual({ a: 'VN' });
    expect(chuanHoaGiaTriCotThem('abc')).toEqual({});
    expect(chuanHoaGiaTriCotThem(['x'])).toEqual({});
  });
});

describe('boCucBang', () => {
  it('đủ cột: dạng bảng có cột tay nắm + 6 cột + nút ⋯; cột co giãn dùng fr', () => {
    const b = boCucBang(MAU);
    expect(soCot(b)).toBe(8);
    expect(b.bien['--vung-bang']).toContain("'dau c0 c1 c2 c3 c4 c5 tac'");
    expect(b.bien['--cot-bang']).toBe('72px minmax(160px, 2fr) minmax(120px, 1.4fr) 84px 96px 150px 140px 44px');
  });

  it('dạng thẻ: ô hẹp kề nhau ghép chung hàng', () => {
    expect(boCucBang(MAU).bien['--vung-dien-thoai']).toContain("'c0 c0' 'c1 c1' 'c2 c3' 'c4 c4' 'c5 c5'");
    expect(boCucBang(MAU).bien['--vung-may-tinh-bang']).toContain("'c2 c3 c4' 'c5 c5 c5'");
  });

  it('cột ẩn không chiếm chỗ, cần ít bề rộng hơn', () => {
    const an = MAU.map((c) => (c.truong === 'quyCach' || c.truong === 'donViTinh' ? { ...c, an: true } : c));
    const b = boCucBang(an);
    expect(soCot(b)).toBe(6);
    expect(b.rongToiThieu).toBeLessThan(boCucBang(MAU).rongToiThieu);
  });

  it('đi theo thứ tự (thuTu), không theo vị trí trong mảng', () => {
    const daoNguoc = [...MAU].reverse();
    expect(cotDangHien(daoNguoc).map((c) => c.truong)).toEqual(MAU.map((c) => c.truong));
  });

  it('không có cột nào: chỉ còn tay nắm và nút ⋯', () => {
    const b = boCucBang([]);
    expect(b.bien['--cot-bang']).toBe('72px 44px');
    expect(b.bien['--vung-bang']).toContain("'dau tac'");
  });
});

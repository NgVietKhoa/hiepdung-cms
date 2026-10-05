import { describe, expect, it } from 'vitest';
import type { DongHangMuc } from '../db/kieu';
import { tenKemGhiChu } from '../pdf/noiDung';
import { cacThanhTien, danhSo, demHangMuc, soLaMa } from './phanMuc';
import { thanhTien } from './tinhTien';

const hang = (ten: string, soLuong: number, donGia: number, khac: Partial<DongHangMuc> = {}): DongHangMuc => ({
  id: ten, tenHangMuc: ten, quyCach: '', donViTinh: 'cái', soLuong, donGia, ghiChu: '', ...khac,
});
const phan = (ten: string): DongHangMuc => ({
  id: ten, loai: 'phan', tenHangMuc: ten, quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '',
});
const tien = (d: DongHangMuc) => thanhTien(d.soLuong, d.donGia);

describe('soLaMa', () => {
  it('đổi số sang La Mã', () => {
    expect([1, 2, 3, 4, 5, 9, 10, 14, 40, 90, 2026].map(soLaMa)).toEqual(
      ['I', 'II', 'III', 'IV', 'V', 'IX', 'X', 'XIV', 'XL', 'XC', 'MMXXVI'],
    );
  });
});

describe('danhSo', () => {
  it('không có phần: đánh số 1, 2, 3 như cũ', () => {
    const kq = danhSo([hang('a', 1, 10), hang('b', 2, 10)], tien);
    expect(kq.map((x) => x.stt)).toEqual(['1', '2']);
    expect(kq.every((x) => !x.laPhan)).toBe(true);
  });

  it('có phần: phần đánh I, II; hạng mục đánh lại từ 1 trong mỗi phần; cộng tiền từng phần', () => {
    const ds = [phan('Khung'), hang('a', 1, 100), hang('b', 2, 50), phan('Mái'), hang('c', 3, 10)];
    const kq = danhSo(ds, tien);
    expect(kq.map((x) => x.stt)).toEqual(['I', '1', '2', 'II', '1']);
    expect(kq[0].tien).toBe(200);
    expect(kq[3].tien).toBe(30);
  });

  it('hạng mục đứng trước phần đầu tiên không thuộc phần nào', () => {
    const kq = danhSo([hang('a', 1, 5), phan('I'), hang('b', 1, 7)], tien);
    expect(kq.map((x) => x.stt)).toEqual(['1', 'I', '1']);
    expect(kq[1].tien).toBe(7);
  });

  it('phần trống cộng 0', () => {
    expect(danhSo([phan('a'), phan('b'), hang('x', 1, 9)], tien).map((x) => x.tien)).toEqual([0, 9, 9]);
  });
});

describe('tổng và đếm bỏ qua dòng phần', () => {
  it('dòng phần không vào tổng, không đếm là hạng mục', () => {
    const ds = [phan('I'), hang('a', 1, 100), { ...phan('II'), soLuong: 5, donGia: 999 }, hang('b', 1, 1)];
    expect(cacThanhTien(ds, tien)).toEqual([100, 1]);
    expect(demHangMuc(ds)).toBe(2);
  });
});

describe('tenKemGhiChu', () => {
  it('chi tiết in thành gạch đầu dòng dưới tên, bỏ dòng trống; ghi chú cuối cùng', () => {
    const d = hang('Tôn', 1, 1, { chiTiet: ['Tôn lạnh 0,45mm', '  ', 'Tôn màu 0,4mm '], ghiChu: 'giao trước' });
    expect(tenKemGhiChu(d)).toBe('Tôn\n- Tôn lạnh 0,45mm\n- Tôn màu 0,4mm\n(giao trước)');
  });

  it('không có chi tiết, ghi chú: chỉ tên', () => {
    expect(tenKemGhiChu(hang('Sắt', 1, 1))).toBe('Sắt');
  });
});

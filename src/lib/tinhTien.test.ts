import { describe, expect, it } from 'vitest';
import { lamTronSoLuong, thanhTien, tinhTong, tongBaoGia, tongNghiemThu } from './tinhTien';
import { dinhDangTien, docChuoiSoLuong, docChuoiTien, dinhDangNgay, dinhDangSoLuong } from './dinhDang';

describe('tinhTong', () => {
  it('cộng tiền hàng, chiết khấu %, VAT', () => {
    const kq = tinhTong([1_000_000, 500_000], { kieu: 'phanTram', giaTri: 10 }, 8);
    expect(kq).toEqual({
      congTienHang: 1_500_000,
      tienChietKhau: 150_000,
      sauChietKhau: 1_350_000,
      tienVAT: 108_000,
      tongThanhToan: 1_458_000,
    });
  });

  it('chiết khấu số tiền không vượt quá tiền hàng, VAT tắt', () => {
    const kq = tinhTong([200_000], { kieu: 'soTien', giaTri: 500_000 }, 0);
    expect(kq.tienChietKhau).toBe(200_000);
    expect(kq.tongThanhToan).toBe(0);
  });

  it('thành tiền làm tròn đồng với số lượng lẻ', () => {
    expect(thanhTien(2.5, 33_333)).toBe(83_333);
    expect(thanhTien(1.333, 15_000)).toBe(19_995);
  });

  it('thành tiền không dính sai số số thực (khớp ROUND của Excel)', () => {
    // Nhân thẳng: 0.145 * 100 = 14.4999… → 14; 0.285 * 100 = 28.4999… → 28
    expect(thanhTien(0.145, 100)).toBe(15);
    expect(thanhTien(0.285, 100)).toBe(29);
    expect(thanhTien(2.3, 5)).toBe(12);
    expect(thanhTien(1.005, 1000)).toBe(1005);
  });

  it('số lượng quá 3 chữ số thập phân tính như DB lưu (Decimal(14,3))', () => {
    expect(lamTronSoLuong(1.2345)).toBe(1.235);
    expect(thanhTien(1.2345, 1000)).toBe(thanhTien(1.235, 1000));
  });
});

describe('tongBaoGia / tongNghiemThu', () => {
  const ck = { kieu: 'phanTram' as const, giaTri: 10 };
  it('bỏ dòng phần, báo giá theo SL, nghiệm thu theo SL thực tế', () => {
    const danhSachDong = [
      { loai: 'phan' as const, soLuong: 0, soLuongThucTe: 0, donGia: 0 },
      { soLuong: 2, soLuongThucTe: 3, donGia: 100_000 },
      { soLuong: 0.145, soLuongThucTe: 0.145, donGia: 100 },
    ];
    expect(tongBaoGia({ danhSachDong, chietKhau: ck, tyLeVAT: 8 })).toEqual(tinhTong([200_000, 15], ck, 8));
    expect(tongNghiemThu({ danhSachDong, chietKhau: ck, tyLeVAT: 8 })).toEqual(tinhTong([300_000, 15], ck, 8));
  });
});

describe('định dạng', () => {
  it('tiền và số lượng', () => {
    expect(dinhDangTien(1_250_000)).toBe('1.250.000 đ');
    expect(dinhDangTien(0)).toBe('0 đ');
    expect(dinhDangSoLuong(1.5)).toBe('1,5');
    expect(dinhDangSoLuong(12_000)).toBe('12.000');
  });
  it('đọc chuỗi nhập', () => {
    expect(docChuoiTien('1.250.000 đ')).toBe(1_250_000);
    expect(docChuoiSoLuong('1,5')).toBe(1.5);
    expect(docChuoiSoLuong('1.5')).toBe(1.5);
    expect(docChuoiSoLuong('1.000')).toBe(1000);
    expect(docChuoiSoLuong('')).toBe(0);
  });
  it('ngày', () => {
    expect(dinhDangNgay('2026-10-01')).toBe('01/10/2026');
  });
});

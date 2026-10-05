import type { BaoGia, ChietKhau, DongHangMuc, DongNghiemThu } from '../db/kieu';
import { cacThanhTien } from './phanMuc';

export interface KetQuaTinhTien {
  congTienHang: number;
  tienChietKhau: number;
  sauChietKhau: number;
  tienVAT: number;
  tongThanhToan: number;
}

/** Số lượng lưu tối đa 3 chữ số thập phân (cột Decimal(14,3) trong DB) */
export const lamTronSoLuong = (n: number) => Math.round((n || 0) * 1000) / 1000;

/**
 * Thành tiền một dòng, làm tròn đến đồng.
 * Nhân trên số nguyên (số lượng quy ra phần nghìn) để không dính sai số số thực:
 * 0,145 × 100 phải ra 15 (nhân thẳng 0.145 * 100 = 14.4999… → 14) — khớp với ROUND() của Excel và DB.
 */
export function thanhTien(soLuong: number, donGia: number): number {
  const slPhanNghin = Math.round((soLuong || 0) * 1000);
  return Math.round((slPhanNghin * (donGia || 0)) / 1000);
}

export function tinhTong(
  cacThanhTien: number[],
  chietKhau: ChietKhau,
  tyLeVAT: number,
): KetQuaTinhTien {
  const congTienHang = cacThanhTien.reduce((a, b) => a + b, 0);
  let tienChietKhau =
    chietKhau.kieu === 'phanTram'
      ? Math.round((congTienHang * (chietKhau.giaTri || 0)) / 100)
      : Math.round(chietKhau.giaTri || 0);
  tienChietKhau = Math.max(0, Math.min(tienChietKhau, congTienHang));
  const sauChietKhau = congTienHang - tienChietKhau;
  const tienVAT = Math.round((sauChietKhau * (tyLeVAT || 0)) / 100);
  return {
    congTienHang,
    tienChietKhau,
    sauChietKhau,
    tienVAT,
    tongThanhToan: sauChietKhau + tienVAT,
  };
}

type DongTinhTien = Pick<DongHangMuc, 'loai' | 'soLuong' | 'donGia'>;
type ChungTuTinhTien<D> = Pick<BaoGia, 'chietKhau' | 'tyLeVAT'> & { danhSachDong: D[] };

/** Thành tiền một dòng báo giá: theo số lượng báo giá */
export const thanhTienBaoGia = (d: DongTinhTien) => thanhTien(d.soLuong, d.donGia);
/** Thành tiền một dòng nghiệm thu: theo số lượng thực tế */
export const thanhTienNghiemThu = (d: DongTinhTien & Pick<DongNghiemThu, 'soLuongThucTe'>) =>
  thanhTien(d.soLuongThucTe, d.donGia);

/** Tổng tiền báo giá — mọi màn hình và bản xuất đều tính qua đây */
export const tongBaoGia = (bg: ChungTuTinhTien<DongTinhTien>) =>
  tinhTong(cacThanhTien(bg.danhSachDong, thanhTienBaoGia), bg.chietKhau, bg.tyLeVAT);

/** Tổng giá trị biên bản nghiệm thu (theo số lượng thực tế) */
export const tongNghiemThu = (nt: ChungTuTinhTien<DongTinhTien & Pick<DongNghiemThu, 'soLuongThucTe'>>) =>
  tinhTong(cacThanhTien(nt.danhSachDong, thanhTienNghiemThu), nt.chietKhau, nt.tyLeVAT);

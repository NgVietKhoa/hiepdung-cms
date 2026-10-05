import type { ChietKhau } from '../../db/kieu';
import { thanhTien, tinhTong, type KetQuaTinhTien } from '../../lib/tinhTien';

export type LoaiHoaDon = 'muaVao' | 'banRa';
export type TrangThaiHoaDon = 'hieuLuc' | 'huy';

export const NHAN_LOAI_HOA_DON: Record<LoaiHoaDon, string> = { banRa: 'Bán ra', muaVao: 'Mua vào' };

export interface NhaCungCap {
  id: string;
  tenCongTy: string;
  diaChi: string;
  maSoThue: string;
  nguoiLienHe: string;
  soDienThoai: string;
  email: string;
  soTaiKhoan: string;
  nganHang: string;
  ghiChu: string;
  ngayTao: number;
}

export interface DongHoaDon {
  id: string;
  tenHang: string;
  donViTinh: string;
  soLuong: number;
  donGia: number;
}

export interface HoaDon {
  id: string;
  loai: LoaiHoaDon;
  kyHieu: string;
  soHoaDon: string;
  ngayHoaDon: string;
  /** Bán ra */
  khachHangId: string | null;
  /** Mua vào */
  nhaCungCapId: string | null;
  /** Tên / MST / địa chỉ in trên hoá đơn */
  tenDoiTac: string;
  maSoThueDoiTac: string;
  diaChiDoiTac: string;
  /** Hoá đơn bán ra lập từ báo giá */
  baoGiaId: string | null;
  tyLeVAT: number;
  chietKhau: ChietKhau;
  /** "YYYY-MM-DD" hoặc "" */
  hanThanhToan: string;
  trangThai: TrangThaiHoaDon;
  ghiChu: string;
  danhSachDong: DongHoaDon[];
  ngayTao: number;
  ngaySua: number;
}

/** Một dòng trong danh sách hoá đơn — tổng tiền, đã thanh toán máy chủ tính sẵn */
export interface TomTatHoaDon {
  id: string;
  loai: LoaiHoaDon;
  kyHieu: string;
  soHoaDon: string;
  ngayHoaDon: string;
  khachHangId: string | null;
  nhaCungCapId: string | null;
  tenDoiTac: string;
  trangThai: TrangThaiHoaDon;
  hanThanhToan: string;
  /** Tiền hàng sau chiết khấu, trước thuế */
  tienTruocThue: number;
  tienThue: number;
  tong: number;
  /** Tổng các phiếu thu / chi gắn với hoá đơn */
  daThanhToan: number;
  soTep: number;
}

export interface TepHoaDon {
  id: string;
  hoaDonId: string;
  tenFile: string;
  kieuFile: string;
  kichThuoc: number;
  ngayTao: number;
}

/** Tổng hoá đơn: cùng cách tính với báo giá (chiết khấu trước, VAT sau, làm tròn đồng) */
export const tongHoaDon = (hd: Pick<HoaDon, 'danhSachDong' | 'chietKhau' | 'tyLeVAT'>): KetQuaTinhTien =>
  tinhTong(
    hd.danhSachDong.map((d) => thanhTien(d.soLuong, d.donGia)),
    hd.chietKhau,
    hd.tyLeVAT,
  );

/** Còn phải thu / phải trả của một hoá đơn (hoá đơn huỷ coi như 0) */
export const conNoHoaDon = (t: Pick<TomTatHoaDon, 'tong' | 'daThanhToan' | 'trangThai'>) =>
  t.trangThai === 'huy' ? 0 : t.tong - t.daThanhToan;

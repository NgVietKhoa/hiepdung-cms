import { thanhTien } from '../../lib/tinhTien';

export type LoaiPhieuKho = 'nhap' | 'xuat';
export const NHAN_LOAI_PHIEU_KHO: Record<LoaiPhieuKho, string> = { nhap: 'Nhập kho', xuat: 'Xuất kho' };

export interface VatTu {
  id: string;
  maVatTu: string;
  ten: string;
  donViTinh: string;
  nhom: string;
  quyCach: string;
  /** Tồn dưới mức này thì cảnh báo (0 = không cảnh báo) */
  tonToiThieu: number;
  ghiChu: string;
  ngungDung: boolean;
}

/** Vật tư kèm số tồn hiện tại (máy chủ tính từ các phiếu nhập / xuất) */
export interface VatTuTon extends VatTu {
  tonKho: number;
  /** Đơn giá của lần nhập gần nhất */
  giaNhapGanNhat: number;
}

export interface DongPhieuKho {
  id: string;
  vatTuId: string;
  soLuong: number;
  donGia: number;
  ghiChu: string;
}

export interface PhieuKho {
  id: string;
  loai: LoaiPhieuKho;
  /** Trống thì máy chủ cấp (PN-2026-001 / PX-2026-001) */
  soPhieu: string;
  ngay: string;
  nhaCungCapId: string | null;
  hoaDonId: string | null;
  /** Xuất cho đơn hàng (báo giá) nào */
  baoGiaId: string | null;
  nguoiGiaoNhan: string;
  ghiChu: string;
  nguoiLap: string;
  danhSachDong: DongPhieuKho[];
  ngayTao: number;
  ngaySua: number;
}

export interface TomTatPhieuKho {
  id: string;
  loai: LoaiPhieuKho;
  soPhieu: string;
  ngay: string;
  /** Tên nhà cung cấp (nhập) / số báo giá (xuất) */
  doiTuong: string;
  nguoiGiaoNhan: string;
  soDong: number;
  tongTien: number;
  ghiChu: string;
}

/** Một dòng trên thẻ kho của vật tư */
export interface DongTheKho {
  phieuKhoId: string;
  soPhieu: string;
  loai: LoaiPhieuKho;
  ngay: string;
  soLuong: number;
  donGia: number;
  /** Tồn sau phiếu này */
  tonSau: number;
  dienGiai: string;
}

export const tongPhieuKho = (p: Pick<PhieuKho, 'danhSachDong'>) =>
  p.danhSachDong.reduce((s, d) => s + thanhTien(d.soLuong, d.donGia), 0);

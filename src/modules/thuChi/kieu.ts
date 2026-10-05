export type LoaiPhieuThuChi = 'thu' | 'chi';
export type HinhThucTien = 'tienMat' | 'chuyenKhoan';

export const NHAN_HINH_THUC: Record<HinhThucTien, string> = { tienMat: 'Tiền mặt', chuyenKhoan: 'Chuyển khoản' };

export interface PhieuThuChi {
  id: string;
  loai: LoaiPhieuThuChi;
  /** Trống thì máy chủ cấp (PT-2026-001 / PC-2026-001) */
  soPhieu: string;
  ngay: string;
  soTien: number;
  hinhThuc: HinhThucTien;
  danhMuc: string;
  khachHangId: string | null;
  nhaCungCapId: string | null;
  nhanVienId: string | null;
  /** Thanh toán cho hoá đơn nào */
  hoaDonId: string | null;
  /** Phiếu chi tạm ứng: trừ vào lương tháng của nhân viên */
  truVaoLuong: boolean;
  nguoiNopNhan: string;
  noiDung: string;
  nguoiLap: string;
  ngayTao: number;
}

export interface TienTheoHinhThuc {
  tienMat: number;
  chuyenKhoan: number;
  tong: number;
}

/** Sổ quỹ trong kỳ [tu, den] */
export interface SoQuy {
  tonDau: TienTheoHinhThuc;
  thu: TienTheoHinhThuc;
  chi: TienTheoHinhThuc;
  tonCuoi: TienTheoHinhThuc;
}

export type LoaiCongNo = 'phaiThu' | 'phaiTra';

/** Công nợ một đối tác: tổng hoá đơn (hiệu lực) trừ tổng tiền đã thu / đã trả cho đối tác đó */
export interface CongNo {
  doiTacId: string;
  tenDoiTac: string;
  soDienThoai: string;
  tongHoaDon: number;
  daThanhToan: number;
  conNo: number;
  soHoaDon: number;
  /** Tiền còn nợ của các hoá đơn đã quá hạn thanh toán */
  quaHan: number;
}

export const tienTrong = (): TienTheoHinhThuc => ({ tienMat: 0, chuyenKhoan: 0, tong: 0 });

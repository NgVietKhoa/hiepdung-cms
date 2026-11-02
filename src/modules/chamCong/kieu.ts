export interface NhanVien {
  id: string;
  maNhanVien: string;
  hoTen: string;
  chucVu: string;
  soDienThoai: string;
  cccd: string;
  diaChi: string;
  /** "YYYY-MM-DD" hoặc "" */
  ngayVaoLam: string;
  /** Lương một công (đồng) */
  luongNgay: number;
  /** Tiền một giờ tăng ca */
  luongGioTangCa: number;
  /** Phụ cấp cố định mỗi tháng */
  phuCapThang: number;
  soTaiKhoan: string;
  nganHang: string;
  /** false = đã nghỉ việc */
  dangLam: boolean;
  ghiChu: string;
  thuTu: number;
}

/** Ký hiệu công trên bảng chấm công (dữ liệu trong DB, sửa ở màn Chấm công) */
export interface LoaiCong {
  id: string;
  kyHieu: string;
  ten: string;
  /** Số công tính lương: 1, 0,5, 0… */
  heSo: number;
  /** "#rrggbb" hoặc "" */
  mau: string;
  thuTu: number;
}

/** Một ô trên bảng chấm công */
export interface OCong {
  nhanVienId: string;
  ngay: string;
  /** null = không có công (chỉ tăng ca / ghi chú). Gửi lên cả ba trống = xoá ô */
  loaiCongId: string | null;
  gioTangCa: number;
  ghiChu: string;
}

export interface BangCong {
  thang: string;
  /** Nhân viên đang làm + nhân viên đã nghỉ nhưng có công trong tháng */
  nhanVien: NhanVien[];
  loaiCong: LoaiCong[];
  o: OCong[];
}

export interface DongLuong {
  nhanVienId: string;
  hoTen: string;
  chucVu: string;
  soCong: number;
  gioTangCa: number;
  luongNgay: number;
  luongGioTangCa: number;
  tienCong: number;
  tienTangCa: number;
  phuCap: number;
  /** Phiếu chi tạm ứng (trừ vào lương) trong tháng */
  tamUng: number;
  thucLinh: number;
  /** Số ngày theo từng ký hiệu công: { [loaiCongId]: số ngày } */
  soNgayTheoLoai: Record<string, number>;
  soTaiKhoan: string;
  nganHang: string;
}

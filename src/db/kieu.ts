/** Mô hình dữ liệu. Tiền lưu dạng số nguyên (đồng). Ngày lưu dạng chuỗi ISO "YYYY-MM-DD". */

export interface KhachHang {
  id: string;
  tenCongTy: string;
  diaChi: string;
  maSoThue: string;
  nguoiLienHe: string;
  chucVu: string;
  soDienThoai: string;
  email: string;
  ghiChu: string;
  ngayTao: number;
}

export interface HangMuc {
  id: string;
  ten: string;
  donViTinh: string;
  donGiaMacDinh: number;
  nhom: string;
  moTa: string;
}

/** hang = hạng mục bình thường; phan = dòng tiêu đề phần (I, II…), các hạng mục bên dưới thuộc phần này */
export type LoaiDong = 'hang' | 'phan';

export interface DongHangMuc {
  id: string;
  /** Không có = 'hang'. Dòng phần chỉ dùng `tenHangMuc` làm tên phần, không có số lượng / tiền */
  loai?: LoaiDong;
  tenHangMuc: string;
  /** Các dòng chi tiết in dạng gạch đầu dòng dưới tên hạng mục; số lượng, tiền vẫn một dòng */
  chiTiet?: string[];
  quyCach: string;
  donViTinh: string;
  soLuong: number;
  donGia: number;
  ghiChu: string;
  /** Giá trị các cột tự tạo trong Cài đặt, theo id cột */
  cotThem?: Record<string, string>;
}

export interface DongNghiemThu extends DongHangMuc {
  soLuongThucTe: number;
}

export interface ChietKhau {
  kieu: 'phanTram' | 'soTien';
  giaTri: number;
}

export type TrangThaiBaoGia = 'nhap' | 'daGui' | 'daChot' | 'huy';
export type TrangThaiNghiemThu = 'nhap' | 'daKy' | 'huy';

export const NHAN_TRANG_THAI_BAO_GIA: Record<TrangThaiBaoGia, string> = {
  nhap: 'Nháp',
  daGui: 'Đã gửi',
  daChot: 'Đã chốt',
  huy: 'Huỷ',
};

export const NHAN_TRANG_THAI_NGHIEM_THU: Record<TrangThaiNghiemThu, string> = {
  nhap: 'Nháp',
  daKy: 'Đã ký',
  huy: 'Huỷ',
};

export interface BaoGia {
  id: string;
  soBaoGia: string;
  ngayLap: string;
  khachHangId: string | null;
  tieuDe: string;
  danhSachDong: DongHangMuc[];
  /** 0 = không tính VAT */
  tyLeVAT: number;
  chietKhau: ChietKhau;
  thoiGianGiaoHang: string;
  /** Số ngày hiệu lực */
  hieuLucBaoGia: number;
  dieuKhoanThanhToan: string;
  ghiChu: string;
  trangThai: TrangThaiBaoGia;
  ngayTao: number;
  ngaySua: number;
}

/**
 * Một dòng trong danh sách chứng từ (trang chủ, chọn báo giá…): thông tin chung và tổng tiền máy chủ đã tính sẵn,
 * không kèm các dòng hạng mục để danh sách tải nhanh.
 */
export interface TomTatChungTu<T extends string> {
  id: string;
  so: string;
  ngay: string;
  khachHangId: string | null;
  tieuDe: string;
  trangThai: T;
  soHangMuc: number;
  tong: number;
}
export type TomTatBaoGia = TomTatChungTu<TrangThaiBaoGia>;
export type TomTatNghiemThu = TomTatChungTu<TrangThaiNghiemThu> & { baoGiaId: string | null };

export interface NguoiDaiDien {
  hoTen: string;
  chucVu: string;
}

/**
 * Ảnh đính kèm biên bản nghiệm thu. Lưu ở bảng riêng (không nằm trong bản ghi biên bản)
 * để danh sách biên bản tải nhanh, không kéo theo dữ liệu ảnh.
 */
export interface AnhDinhKem {
  id: string;
  nghiemThuId: string;
  /** Ảnh JPEG đã nén, dạng data URL */
  duLieu: string;
  ghiChu: string;
  thuTu: number;
}

export interface BienBanNghiemThu {
  id: string;
  soBienBan: string;
  baoGiaId: string | null;
  khachHangId: string | null;
  ngayNghiemThu: string;
  diaDiem: string;
  /** Số hợp đồng / đơn đặt hàng làm căn cứ */
  canCuHopDong: string;
  /** Ngày của hợp đồng / đơn hàng (tuỳ chọn) */
  ngayCanCu: string;
  tieuDe: string;
  thanhPhanBenA: NguoiDaiDien[];
  thanhPhanBenB: NguoiDaiDien[];
  danhSachDong: DongNghiemThu[];
  tyLeVAT: number;
  chietKhau: ChietKhau;
  ketLuan: string;
  /** Số ảnh đính kèm (ảnh nằm ở bảng anhNghiemThu) */
  soAnh: number;
  trangThai: TrangThaiNghiemThu;
  ngayTao: number;
  ngaySua: number;
}

/** Thông tin xưởng có thể ẩn (không dùng thì không hiện ô nhập, không in lên văn bản) */
export type TruongXuong =
  | 'logo'
  | 'diaChi'
  | 'maSoThue'
  | 'dienThoai'
  | 'email'
  | 'nguoiDaiDien'
  | 'chucVu'
  | 'taiKhoan';

export interface CaiDat {
  id: 'caiDat';
  tenDonVi: string;
  diaChi: string;
  maSoThue: string;
  dienThoai: string;
  email: string;
  soTaiKhoan: string;
  nganHang: string;
  chiNhanh: string;
  chuTaiKhoan: string;
  nguoiDaiDien: string;
  chucVu: string;
  /** Logo dạng data URL (PNG/JPEG) */
  logo: string;
  vatMacDinh: number;
  hieuLucMacDinh: number;
  thoiGianGiaoHangMacDinh: string;
  dieuKhoanThanhToanMacDinh: string;
  ketLuanMacDinh: string;
  diaDiemNghiemThuMacDinh: string;
  tienToBaoGia: string;
  tienToNghiemThu: string;
  soChuSo: number;
  /** Đọc 24 là "hai mươi tư" thay vì "hai mươi bốn" */
  docSoTu: boolean;
  /** Các thông tin xưởng đang ẩn */
  truongAn: TruongXuong[];
  /** Gợi ý ô "Đơn vị"; đơn vị đầu tiên được điền sẵn cho dòng mới */
  danhSachDonViTinh: string[];
  /** Các nhóm của danh mục hạng mục */
  nhomHangMuc: string[];
  /** Các mức thuế VAT (%) để chọn nhanh trên báo giá / biên bản; 0 = không tính VAT */
  luaChonVAT: number[];
  lanSaoLuuCuoi: number | null;
  /** Ký hiệu phiếu thu / chi / nhập kho / xuất kho */
  tienToPhieuThu: string;
  tienToPhieuChi: string;
  tienToPhieuNhap: string;
  tienToPhieuXuat: string;
  /** Danh mục phiếu thu / phiếu chi */
  danhMucThu: string[];
  danhMucChi: string[];
  /** Nhóm vật tư trong kho */
  nhomVatTu: string[];
  /** Ngày nghỉ hằng tuần (0 = Chủ nhật … 6 = Thứ bảy) — tô màu trên bảng chấm công */
  ngayNghiTuan: number[];
}

/** Trường có sẵn của dòng hạng mục mà một cột có thể gắn vào (khớp enum TruongDong trong schema.prisma) */
export type TruongDong = 'tenHangMuc' | 'quyCach' | 'donViTinh' | 'soLuong' | 'donGia' | 'thanhTien';

/** Cột của bảng nhập hạng mục — dữ liệu trong DB (bảng cot_hang_muc), chỉnh trong Cài đặt */
export interface CotHangMuc {
  id: string;
  /** Trường có sẵn của dòng mà cột này nhập / hiện; null = cột tự thêm (giá trị nằm trong `cotThem` của dòng) */
  truong: TruongDong | null;
  tieuDe: string;
  /** Chữ mờ hiện trong ô khi chưa nhập */
  goiY: string;
  /** Số: căn phải, bàn phím số */
  kieu: 'chu' | 'so';
  an: boolean;
  /** Cột cần để tính tiền: không ẩn được */
  batBuoc: boolean;
  /** Bề rộng tối thiểu (px) khi bảng xếp một dòng */
  doRong: number;
  /** Phần chia thêm khi bảng còn chỗ (0 = giữ đúng bề rộng tối thiểu) */
  heSoGian: number;
  thuTu: number;
}

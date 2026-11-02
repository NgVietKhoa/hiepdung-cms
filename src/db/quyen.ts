/**
 * Các quyền (theo module) gán cho vai trò. Đây là danh sách chức năng của phần mềm (mã nguồn quyết định),
 * còn vai trò nào có quyền gì là dữ liệu trong DB (bảng vai_tro), sửa ở màn Tài khoản.
 * Mọi tài khoản đăng nhập được đều xem được công / lương của chính mình (nếu gắn với nhân viên).
 */
export const DS_QUYEN = [
  { ma: 'tongQuan', ten: 'Tổng quan', moTa: 'Xem số liệu tổng hợp: doanh thu, thu chi, công nợ, kho' },
  { ma: 'baoGia', ten: 'Báo giá & nghiệm thu', moTa: 'Báo giá, biên bản nghiệm thu, khách hàng, danh mục hạng mục' },
  { ma: 'chamCong', ten: 'Chấm công & lương', moTa: 'Nhân viên, bảng chấm công, bảng lương của mọi người' },
  { ma: 'hoaDon', ten: 'Hoá đơn', moTa: 'Hoá đơn mua vào / bán ra, nhà cung cấp' },
  { ma: 'thuChi', ten: 'Thu chi & công nợ', moTa: 'Phiếu thu, phiếu chi, sổ quỹ, công nợ' },
  { ma: 'kho', ten: 'Kho vật tư', moTa: 'Vật tư, phiếu nhập / xuất kho, tồn kho' },
  { ma: 'caiDat', ten: 'Cài đặt', moTa: 'Thông tin xưởng, mặc định, danh mục, sao lưu dữ liệu' },
  { ma: 'taiKhoan', ten: 'Tài khoản & phân quyền', moTa: 'Tạo tài khoản, đặt lại mật khẩu, sửa vai trò' },
] as const;

export type MaQuyen = (typeof DS_QUYEN)[number]['ma'];

export const TAT_CA_QUYEN: MaQuyen[] = DS_QUYEN.map((q) => q.ma);

export const laMaQuyen = (x: unknown): x is MaQuyen => TAT_CA_QUYEN.includes(x as MaQuyen);

/** Người đang đăng nhập — máy chủ trả về ở GET /api/phien */
export interface NguoiDungPhien {
  id: string;
  tenDangNhap: string;
  hoTen: string;
  vaiTro: string;
  quyen: MaQuyen[];
  /** Gắn với hồ sơ nhân viên (xem công của mình) */
  nhanVienId: string | null;
}

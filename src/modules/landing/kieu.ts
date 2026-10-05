/**
 * Landing page: nội dung quản lý trong CMS, trang landing (làm riêng) đọc qua API công khai:
 *   GET  /api/cong-khai/trang      → TrangCongKhai (SEO, thông tin xưởng, các khối đang hiện)
 *   GET  /api/cong-khai/anh/:id    → file ảnh
 *   POST /api/cong-khai/lien-he    → { hoTen, soDienThoai, email, noiDung } — khách để lại thông tin
 */

/** Các loại khối gợi ý. Trang landing dựa vào `loai` để chọn cách hiển thị; loại khác vẫn lưu được (tuyChon). */
export const LOAI_KHOI = [
  { ma: 'hero', ten: 'Ảnh bìa (hero)', moTa: 'Tiêu đề lớn, câu giới thiệu, ảnh nền, nút kêu gọi' },
  { ma: 'gioiThieu', ten: 'Giới thiệu', moTa: 'Đoạn giới thiệu xưởng kèm ảnh' },
  { ma: 'dichVu', ten: 'Dịch vụ', moTa: 'Danh sách dịch vụ: tên, mô tả, ảnh' },
  { ma: 'duAn', ten: 'Dự án / công trình', moTa: 'Thư viện công trình đã làm' },
  { ma: 'soLieu', ten: 'Con số nổi bật', moTa: 'vd: 15 năm kinh nghiệm, 500+ khách hàng' },
  { ma: 'khachHang', ten: 'Khách hàng / đối tác', moTa: 'Logo khách hàng, đối tác' },
  { ma: 'camNhan', ten: 'Cảm nhận khách hàng', moTa: 'Lời nhận xét kèm tên khách' },
  { ma: 'lienHe', ten: 'Liên hệ', moTa: 'Form liên hệ, bản đồ, số điện thoại' },
  { ma: 'tuyChon', ten: 'Tuỳ chọn', moTa: 'Khối tự do' },
] as const;

export const tenLoaiKhoi = (ma: string) => LOAI_KHOI.find((l) => l.ma === ma)?.ten ?? ma;

export interface MucKhoi {
  tieuDe: string;
  moTa: string;
  anhId: string | null;
  lienKet: string;
}

export interface KhoiLanding {
  id: string;
  loai: string;
  tieuDe: string;
  phuDe: string;
  noiDung: string;
  anhId: string | null;
  nutChu: string;
  nutLienKet: string;
  danhSachMuc: MucKhoi[];
  hien: boolean;
  thuTu: number;
  ngaySua: number;
}

export interface AnhLanding {
  id: string;
  tenFile: string;
  kieuFile: string;
  kichThuoc: number;
  moTa: string;
  ngayTao: number;
}

export interface LienHeLanding {
  id: string;
  hoTen: string;
  soDienThoai: string;
  email: string;
  noiDung: string;
  daXuLy: boolean;
  ghiChu: string;
  ngayTao: number;
}

export interface CaiDatLanding {
  xuatBan: boolean;
  tieuDeTrang: string;
  moTa: string;
  tuKhoa: string;
  anhChiaSeId: string | null;
  lienKetZalo: string;
  lienKetFacebook: string;
  banDo: string;
  maTheoDoi: string;
}

/** Đường dẫn công khai của ảnh (tương đối với máy chủ CMS) */
export const duongDanAnh = (id: string | null) => (id ? `/api/cong-khai/anh/${id}` : null);

/** Dữ liệu trang landing đọc về (GET /api/cong-khai/trang) — ảnh đã đổi thành đường dẫn */
export interface TrangCongKhai {
  seo: {
    tieuDe: string;
    moTa: string;
    tuKhoa: string;
    anhChiaSe: string | null;
    maTheoDoi: string;
  };
  xuong: {
    ten: string;
    diaChi: string;
    dienThoai: string;
    email: string;
    logo: string | null;
    zalo: string;
    facebook: string;
    banDo: string;
  };
  khoi: (Omit<KhoiLanding, 'anhId' | 'danhSachMuc' | 'hien' | 'thuTu' | 'ngaySua'> & {
    anh: string | null;
    danhSachMuc: (Omit<MucKhoi, 'anhId'> & { anh: string | null })[];
  })[];
}

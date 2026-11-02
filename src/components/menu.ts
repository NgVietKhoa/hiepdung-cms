/** Menu chính của CMS: nhóm theo module. */
import type { TenBieuTuong } from './BieuTuong';

export interface MucMenu {
  den: string;
  nhan: string;
  /** Nhãn ngắn cho menu đáy trên điện thoại */
  nhanNgan?: string;
  bieuTuong: TenBieuTuong;
}

export const NHOM_MENU: { ten: string; muc: MucMenu[] }[] = [
  { ten: '', muc: [{ den: '/', nhan: 'Tổng quan', bieuTuong: 'bieuDo' }] },
  {
    ten: 'Báo giá',
    muc: [
      { den: '/bao-gia', nhan: 'Báo giá & nghiệm thu', nhanNgan: 'Báo giá', bieuTuong: 'vanBan' },
      { den: '/khach-hang', nhan: 'Khách hàng', bieuTuong: 'nguoi' },
      { den: '/hang-muc', nhan: 'Danh mục hạng mục', bieuTuong: 'danhSach' },
    ],
  },
  {
    ten: 'Nhân sự',
    muc: [
      { den: '/cham-cong', nhan: 'Chấm công', bieuTuong: 'lich' },
      { den: '/bang-luong', nhan: 'Bảng lương', bieuTuong: 'tien' },
      { den: '/nhan-vien', nhan: 'Nhân viên', bieuTuong: 'nguoi' },
    ],
  },
  {
    ten: 'Tài chính',
    muc: [
      { den: '/hoa-don', nhan: 'Hoá đơn', bieuTuong: 'hoaDon' },
      { den: '/thu-chi', nhan: 'Thu chi', bieuTuong: 'tien' },
      { den: '/cong-no', nhan: 'Công nợ', bieuTuong: 'danhSach' },
      { den: '/nha-cung-cap', nhan: 'Nhà cung cấp', bieuTuong: 'nhaMay' },
    ],
  },
  {
    ten: 'Kho',
    muc: [
      { den: '/kho', nhan: 'Vật tư & tồn kho', nhanNgan: 'Kho', bieuTuong: 'kho' },
      { den: '/phieu-kho', nhan: 'Phiếu nhập / xuất', bieuTuong: 'nhap' },
    ],
  },
  {
    ten: 'Hệ thống',
    muc: [
      { den: '/cai-dat', nhan: 'Cài đặt', bieuTuong: 'caiDat' },
    ],
  },
];

/** Các mục hay dùng trên menu đáy (điện thoại), theo thứ tự ưu tiên */
const UU_TIEN_MENU_DUOI = ['/', '/bao-gia', '/cham-cong', '/hoa-don', '/thu-chi', '/kho'];

export function menuDuoiCua(soMuc: number): MucMenu[] {
  const tatCa = NHOM_MENU.flatMap((n) => n.muc);
  return UU_TIEN_MENU_DUOI.map((d) => tatCa.find((m) => m.den === d)).filter((m): m is MucMenu => Boolean(m)).slice(0, soMuc);
}

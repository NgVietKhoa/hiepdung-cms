/** Menu chính của CMS: nhóm theo module, mỗi mục hiện khi tài khoản có quyền. */
import type { MaQuyen, NguoiDungPhien } from '../db/quyen';
import type { TenBieuTuong } from './BieuTuong';

export interface MucMenu {
  den: string;
  nhan: string;
  /** Nhãn ngắn cho menu đáy trên điện thoại */
  nhanNgan?: string;
  bieuTuong: TenBieuTuong;
  /** Cần ít nhất một trong các quyền; không có = ai đăng nhập cũng thấy */
  quyen?: MaQuyen[];
  /** Chỉ hiện khi tài khoản gắn với hồ sơ nhân viên */
  canNhanVien?: boolean;
}

const NHOM_MENU: { ten: string; muc: MucMenu[] }[] = [
  { ten: '', muc: [{ den: '/', nhan: 'Tổng quan', bieuTuong: 'bieuDo', quyen: ['tongQuan'] }] },
  {
    ten: 'Báo giá',
    muc: [
      { den: '/bao-gia', nhan: 'Báo giá & nghiệm thu', nhanNgan: 'Báo giá', bieuTuong: 'vanBan', quyen: ['baoGia'] },
      { den: '/khach-hang', nhan: 'Khách hàng', bieuTuong: 'nguoi', quyen: ['baoGia'] },
      { den: '/hang-muc', nhan: 'Danh mục hạng mục', bieuTuong: 'danhSach', quyen: ['baoGia'] },
    ],
  },
  {
    ten: 'Nhân sự',
    muc: [
      { den: '/cham-cong', nhan: 'Chấm công', bieuTuong: 'lich', quyen: ['chamCong'] },
      { den: '/bang-luong', nhan: 'Bảng lương', bieuTuong: 'tien', quyen: ['chamCong'] },
      { den: '/nhan-vien', nhan: 'Nhân viên', bieuTuong: 'nguoi', quyen: ['chamCong'] },
      { den: '/cong-cua-toi', nhan: 'Công của tôi', nhanNgan: 'Công tôi', bieuTuong: 'dongHo', canNhanVien: true },
    ],
  },
  {
    ten: 'Tài chính',
    muc: [
      { den: '/hoa-don', nhan: 'Hoá đơn', bieuTuong: 'hoaDon', quyen: ['hoaDon'] },
      { den: '/thu-chi', nhan: 'Thu chi', bieuTuong: 'tien', quyen: ['thuChi'] },
      { den: '/cong-no', nhan: 'Công nợ', bieuTuong: 'danhSach', quyen: ['thuChi'] },
      { den: '/nha-cung-cap', nhan: 'Nhà cung cấp', bieuTuong: 'nhaMay', quyen: ['hoaDon', 'thuChi', 'kho'] },
    ],
  },
  {
    ten: 'Kho',
    muc: [
      { den: '/kho', nhan: 'Vật tư & tồn kho', nhanNgan: 'Kho', bieuTuong: 'kho', quyen: ['kho'] },
      { den: '/phieu-kho', nhan: 'Phiếu nhập / xuất', bieuTuong: 'nhap', quyen: ['kho'] },
    ],
  },
  {
    ten: 'Hệ thống',
    muc: [
      { den: '/tai-khoan', nhan: 'Tài khoản & quyền', bieuTuong: 'khoa', quyen: ['taiKhoan'] },
      { den: '/cai-dat', nhan: 'Cài đặt', bieuTuong: 'caiDat', quyen: ['caiDat'] },
    ],
  },
];

const duocXem = (m: MucMenu, nd: NguoiDungPhien) =>
  (!m.quyen || m.quyen.some((q) => nd.quyen.includes(q))) && (!m.canNhanVien || Boolean(nd.nhanVienId));

export function menuCua(nd: NguoiDungPhien) {
  return NHOM_MENU.map((n) => ({ ...n, muc: n.muc.filter((m) => duocXem(m, nd)) })).filter((n) => n.muc.length);
}

/** Trang mở đầu tiên sau khi đăng nhập: mục đầu tiên được xem, không có gì thì trang tài khoản của tôi */
export function trangDau(nd: NguoiDungPhien): string {
  return menuCua(nd)[0]?.muc[0]?.den ?? '/toi';
}

/** Các mục hay dùng trên menu đáy (điện thoại), theo thứ tự ưu tiên */
const UU_TIEN_MENU_DUOI = ['/', '/bao-gia', '/cham-cong', '/cong-cua-toi', '/hoa-don', '/thu-chi', '/kho'];

export function menuDuoiCua(nd: NguoiDungPhien, soMuc: number): MucMenu[] {
  const tatCa = NHOM_MENU.flatMap((n) => n.muc).filter((m) => duocXem(m, nd));
  return UU_TIEN_MENU_DUOI.map((d) => tatCa.find((m) => m.den === d)).filter((m): m is MucMenu => Boolean(m)).slice(0, soMuc);
}

/**
 * Giá trị ban đầu của cài đặt — chỉ dùng khi chạy seed (npm run db:seed). Sau đó mọi thứ là dữ liệu trong DB,
 * người dùng sửa trong màn Cài đặt; sửa file này không ảnh hưởng tới DB đã có cài đặt.
 */
import type { CaiDat } from '../src/db/kieu';
import { TAT_CA_QUYEN, type MaQuyen } from '../src/db/quyen';

export const CAI_DAT_BAN_DAU: Omit<CaiDat, 'id' | 'lanSaoLuuCuoi'> = {
  tenDonVi: 'XƯỞNG CƠ KHÍ HIỆP DUNG',
  diaChi: '[Địa chỉ xưởng]',
  maSoThue: '[Mã số thuế]',
  dienThoai: '[Số điện thoại]',
  email: '',
  soTaiKhoan: '[Số tài khoản]',
  nganHang: '[Ngân hàng]',
  chiNhanh: '[Chi nhánh]',
  chuTaiKhoan: '',
  nguoiDaiDien: '[Họ tên người đại diện]',
  chucVu: 'Chủ xưởng',
  logo: '',
  vatMacDinh: 8,
  hieuLucMacDinh: 15,
  thoiGianGiaoHangMacDinh: '07 ngày làm việc kể từ ngày xác nhận đặt hàng',
  dieuKhoanThanhToanMacDinh:
    'Tạm ứng 30% khi xác nhận đặt hàng, thanh toán 70% còn lại sau khi nghiệm thu, bàn giao.',
  ketLuanMacDinh:
    'Bên B đã hoàn thành đúng khối lượng, chất lượng và tiến độ theo yêu cầu. Bên A đồng ý nghiệm thu và thanh toán theo thoả thuận.',
  diaDiemNghiemThuMacDinh: '',
  tienToBaoGia: 'BG',
  tienToNghiemThu: 'NT',
  soChuSo: 3,
  docSoTu: false,
  truongAn: [],
  danhSachDonViTinh: ['cái', 'chiếc', 'bộ', 'kg', 'm', 'm²', 'tấm', 'giờ', 'công', 'lần', 'gói'],
  nhomHangMuc: ['Tiện', 'Phay', 'Hàn', 'Cắt', 'Khoan', 'Vật tư', 'Khác'],
  luaChonVAT: [0, 5, 8, 10],
  tienToPhieuThu: 'PT',
  tienToPhieuChi: 'PC',
  tienToPhieuNhap: 'PN',
  tienToPhieuXuat: 'PX',
  danhMucThu: ['Thu tiền khách hàng', 'Khách tạm ứng', 'Bán phế liệu', 'Thu khác'],
  danhMucChi: [
    'Trả nhà cung cấp',
    'Mua vật tư lẻ',
    'Lương nhân viên',
    'Tạm ứng lương',
    'Điện, nước, internet',
    'Thuê xưởng',
    'Xăng xe, vận chuyển',
    'Sửa chữa máy móc',
    'Chi khác',
  ],
  nhomVatTu: ['Thép tấm', 'Thép hình', 'Thép ống', 'Inox', 'Nhôm', 'Bu lông, ốc vít', 'Que hàn, khí', 'Dao cụ', 'Sơn', 'Khác'],
  ngayNghiTuan: [0],
};

/** Vai trò ban đầu. "Quản trị" là vai trò hệ thống: luôn đủ quyền. Sau đó sửa ở màn Tài khoản. */
export const VAI_TRO_BAN_DAU: { ten: string; moTa: string; quyen: MaQuyen[]; heThong?: boolean }[] = [
  { ten: 'Quản trị', moTa: 'Toàn quyền, quản lý tài khoản', quyen: [...TAT_CA_QUYEN], heThong: true },
  {
    ten: 'Kế toán',
    moTa: 'Báo giá, hoá đơn, thu chi, kho, chấm công',
    quyen: ['tongQuan', 'baoGia', 'chamCong', 'hoaDon', 'thuChi', 'kho'],
  },
  { ten: 'Nhân viên', moTa: 'Chỉ xem công, lương của mình', quyen: [] },
];

/** Ký hiệu công ban đầu trên bảng chấm công. Sau đó sửa ở màn Chấm công → Ký hiệu công. */
export const LOAI_CONG_BAN_DAU: { kyHieu: string; ten: string; heSo: number; mau: string }[] = [
  { kyHieu: 'X', ten: 'Đủ công', heSo: 1, mau: '#d7f0dd' },
  { kyHieu: 'N', ten: 'Nửa công', heSo: 0.5, mau: '#fff1c2' },
  { kyHieu: 'P', ten: 'Nghỉ phép (có lương)', heSo: 1, mau: '#dbe8fb' },
  { kyHieu: 'L', ten: 'Nghỉ lễ (có lương)', heSo: 1, mau: '#e8defa' },
  { kyHieu: 'K', ten: 'Nghỉ không lương', heSo: 0, mau: '#fbdcd8' },
];

/** Khối nội dung landing page dựng sẵn để có khung sửa (nội dung mẫu, sửa ở màn Landing page) */
export const KHOI_LANDING_BAN_DAU: { loai: string; tieuDe: string; phuDe?: string; noiDung?: string; nutChu?: string; nutLienKet?: string; danhSachMuc?: { tieuDe: string; moTa: string }[] }[] = [
  {
    loai: 'hero',
    tieuDe: 'Xưởng cơ khí Hiệp Dung',
    phuDe: 'Gia công cơ khí chính xác — tiện, phay, hàn, cắt CNC theo bản vẽ',
    nutChu: 'Nhận báo giá',
    nutLienKet: '#lien-he',
  },
  {
    loai: 'gioiThieu',
    tieuDe: 'Về chúng tôi',
    noiDung: '[Giới thiệu ngắn về xưởng: năm thành lập, máy móc, đội ngũ, cam kết chất lượng]',
  },
  {
    loai: 'dichVu',
    tieuDe: 'Dịch vụ',
    danhSachMuc: [
      { tieuDe: 'Tiện – phay', moTa: 'Gia công chi tiết trục, bạc, bích theo bản vẽ' },
      { tieuDe: 'Hàn – kết cấu', moTa: 'Khung kèo, lan can, kết cấu thép' },
      { tieuDe: 'Cắt CNC', moTa: 'Cắt laser, plasma tấm thép, inox' },
    ],
  },
  { loai: 'duAn', tieuDe: 'Công trình tiêu biểu', danhSachMuc: [] },
  { loai: 'lienHe', tieuDe: 'Liên hệ', phuDe: 'Gửi yêu cầu, chúng tôi gọi lại trong 30 phút' },
];

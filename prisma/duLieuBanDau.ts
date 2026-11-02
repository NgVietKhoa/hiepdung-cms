/**
 * Giá trị ban đầu của cài đặt — chỉ dùng khi chạy seed (npm run db:seed). Sau đó mọi thứ là dữ liệu trong DB,
 * người dùng sửa trong màn Cài đặt; sửa file này không ảnh hưởng tới DB đã có cài đặt.
 */
import type { CaiDat } from '../src/db/kieu';

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
  ngayNghiTuan: [0],
};

/** Ký hiệu công ban đầu trên bảng chấm công. Sau đó sửa ở màn Chấm công → Ký hiệu công. */
export const LOAI_CONG_BAN_DAU: { kyHieu: string; ten: string; heSo: number; mau: string }[] = [
  { kyHieu: 'X', ten: 'Đủ công', heSo: 1, mau: '#d7f0dd' },
  { kyHieu: 'N', ten: 'Nửa công', heSo: 0.5, mau: '#fff1c2' },
  { kyHieu: 'P', ten: 'Nghỉ phép (có lương)', heSo: 1, mau: '#dbe8fb' },
  { kyHieu: 'L', ten: 'Nghỉ lễ (có lương)', heSo: 1, mau: '#e8defa' },
  { kyHieu: 'K', ten: 'Nghỉ không lương', heSo: 0, mau: '#fbdcd8' },
];

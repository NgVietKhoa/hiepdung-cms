/**
 * Bản cài đặt "rỗng" — chỉ là khung dữ liệu dùng khi chưa tải được cài đặt từ máy chủ (hoặc DB chưa chạy seed).
 * Giá trị số / ký hiệu khớp @default trong prisma/schema.prisma; nội dung thật (tên xưởng, điều khoản, đơn vị tính…)
 * nằm trong DB, giá trị ban đầu ở prisma/duLieuBanDau.ts (npm run db:seed).
 */
import type { CaiDat } from './kieu';

export const CAI_DAT_TRONG: CaiDat = {
  id: 'caiDat',
  tenDonVi: '',
  diaChi: '',
  maSoThue: '',
  dienThoai: '',
  email: '',
  soTaiKhoan: '',
  nganHang: '',
  chiNhanh: '',
  chuTaiKhoan: '',
  nguoiDaiDien: '',
  chucVu: '',
  logo: '',
  vatMacDinh: 8,
  hieuLucMacDinh: 15,
  thoiGianGiaoHangMacDinh: '',
  dieuKhoanThanhToanMacDinh: '',
  ketLuanMacDinh: '',
  diaDiemNghiemThuMacDinh: '',
  tienToBaoGia: 'BG',
  tienToNghiemThu: 'NT',
  soChuSo: 3,
  docSoTu: false,
  truongAn: [],
  danhSachDonViTinh: [],
  nhomHangMuc: [],
  luaChonVAT: [],
  lanSaoLuuCuoi: null,
  tienToPhieuThu: 'PT',
  tienToPhieuChi: 'PC',
  danhMucThu: [],
  danhMucChi: [],
  ngayNghiTuan: [],
};

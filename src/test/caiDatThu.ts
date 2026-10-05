/** Cài đặt dùng trong unit test (giống một xưởng đã điền đủ thông tin) — app không dùng file này. */
import type { CaiDat } from '../db/kieu';
import { CAI_DAT_TRONG } from '../db/macDinh';

export const CAI_DAT_THU: CaiDat = {
  ...CAI_DAT_TRONG,
  tenDonVi: 'XƯỞNG CƠ KHÍ THỬ NGHIỆM',
  diaChi: '12 Đường Số 3, KCN Tân Tạo, TP. HCM',
  maSoThue: '0300000000',
  dienThoai: '0900 000 000',
  soTaiKhoan: '0123456789',
  nganHang: 'Vietcombank',
  chiNhanh: 'Tân Tạo',
  nguoiDaiDien: 'Nguyễn Văn Thử',
  chucVu: 'Chủ xưởng',
  thoiGianGiaoHangMacDinh: '07 ngày làm việc',
  dieuKhoanThanhToanMacDinh: 'Thanh toán sau khi nghiệm thu.',
  ketLuanMacDinh: 'Bên A đồng ý nghiệm thu.',
  danhSachDonViTinh: ['cái', 'bộ', 'kg'],
  nhomHangMuc: ['Tiện', 'Khác'],
  luaChonVAT: [0, 8, 10],
};

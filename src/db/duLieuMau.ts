/** Dữ liệu mẫu: 3 khách hàng, 15 hạng mục, 2 báo giá, 1 biên bản nghiệm thu. Máy chủ nạp khi DB còn trống. */
import { congNgay, homNayISO, namCua } from '../lib/dinhDang';
import { taoId } from '../lib/id';
import { chuyenBaoGiaThanhNghiemThu } from '../lib/nghiepVu';
import type { BaoGia, BienBanNghiemThu, CaiDat, DongHangMuc, HangMuc, KhachHang } from './kieu';

const KHACH_HANG_MAU: Omit<KhachHang, 'id' | 'ngayTao'>[] = [
  {
    tenCongTy: 'Công ty TNHH Thiết bị Công nghiệp Hoàng Long',
    diaChi: 'Số 125, Đường số 7, KCN Tân Tạo, P. Tân Tạo A, Q. Bình Tân, TP. Hồ Chí Minh',
    maSoThue: '0312345678',
    nguoiLienHe: 'Trần Văn Hùng',
    chucVu: 'Trưởng phòng Kỹ thuật',
    soDienThoai: '0903 123 456',
    email: 'hung.tv@hoanglong.example',
    ghiChu: 'Khách quen, hay đặt trục và bạc thay thế máy cán',
  },
  {
    tenCongTy: 'Công ty Cổ phần Nhựa Bao bì Phú Thịnh',
    diaChi: 'Lô B2, KCN Sóng Thần 2, P. Dĩ An, TP. Dĩ An, Bình Dương',
    maSoThue: '3701234567',
    nguoiLienHe: 'Nguyễn Thị Mai',
    chucVu: 'Phó phòng Mua hàng',
    soDienThoai: '0918 456 789',
    email: 'mai.nt@phuthinh.example',
    ghiChu: 'Thanh toán chuyển khoản sau 15 ngày',
  },
  {
    tenCongTy: 'Anh Lê Minh Tuấn (Xưởng mộc Minh Tuấn)',
    diaChi: '48/3 Ấp 2, X. Xuân Thới Thượng, H. Hóc Môn, TP. Hồ Chí Minh',
    maSoThue: '',
    nguoiLienHe: 'Lê Minh Tuấn',
    chucVu: 'Chủ xưởng',
    soDienThoai: '0987 222 333',
    email: '',
    ghiChu: 'Khách lẻ, không lấy hoá đơn',
  },
];

const HANG_MUC_MAU: Omit<HangMuc, 'id'>[] = [
  { nhom: 'Tiện', ten: 'Tiện trục thép C45', donViTinh: 'cái', donGiaMacDinh: 180_000, moTa: 'Ø30–Ø50, dài ≤ 400mm' },
  { nhom: 'Tiện', ten: 'Tiện ren trục', donViTinh: 'cái', donGiaMacDinh: 120_000, moTa: 'Ren M20–M30' },
  { nhom: 'Tiện', ten: 'Tiện bạc đồng', donViTinh: 'cái', donGiaMacDinh: 250_000, moTa: 'Đồng thau, Ø ngoài ≤ 80mm' },
  { nhom: 'Tiện', ten: 'Tiện mặt bích', donViTinh: 'cái', donGiaMacDinh: 350_000, moTa: 'Ø200, thép SS400' },
  { nhom: 'Phay', ten: 'Phay rãnh then', donViTinh: 'cái', donGiaMacDinh: 80_000, moTa: 'Rãnh then 8–14mm' },
  { nhom: 'Phay', ten: 'Phay mặt phẳng', donViTinh: 'giờ', donGiaMacDinh: 250_000, moTa: 'Máy phay đứng' },
  { nhom: 'Phay', ten: 'Phay bánh răng trụ', donViTinh: 'cái', donGiaMacDinh: 650_000, moTa: 'Mô-đun 2–3' },
  { nhom: 'Hàn', ten: 'Hàn khung thép hộp', donViTinh: 'kg', donGiaMacDinh: 45_000, moTa: 'Hàn điện, bao gồm que hàn' },
  { nhom: 'Hàn', ten: 'Hàn bích ống', donViTinh: 'cái', donGiaMacDinh: 150_000, moTa: 'Ống DN50–DN100' },
  { nhom: 'Cắt', ten: 'Cắt CNC plasma thép tấm', donViTinh: 'm', donGiaMacDinh: 35_000, moTa: 'Dày ≤ 12mm, tính theo mét đường cắt' },
  { nhom: 'Cắt', ten: 'Cắt laser inox', donViTinh: 'm', donGiaMacDinh: 60_000, moTa: 'Dày ≤ 5mm' },
  { nhom: 'Khoan', ten: 'Khoan lỗ', donViTinh: 'lỗ', donGiaMacDinh: 5_000, moTa: 'Ø10–Ø20' },
  { nhom: 'Vật tư', ten: 'Thép tròn đặc C45', donViTinh: 'kg', donGiaMacDinh: 28_000, moTa: '' },
  { nhom: 'Vật tư', ten: 'Thép tấm SS400', donViTinh: 'kg', donGiaMacDinh: 22_000, moTa: '' },
  { nhom: 'Khác', ten: 'Công lắp đặt tại chỗ', donViTinh: 'công', donGiaMacDinh: 450_000, moTa: '' },
];

const dong = (
  tenHangMuc: string,
  quyCach: string,
  donViTinh: string,
  soLuong: number,
  donGia: number,
): DongHangMuc => ({ id: taoId(), tenHangMuc, quyCach, donViTinh, soLuong, donGia, ghiChu: '' });

export interface DuLieuMau {
  khachHang: KhachHang[];
  hangMuc: HangMuc[];
  baoGia: BaoGia[];
  nghiemThu: BienBanNghiemThu[];
}

/** Dựng bộ dữ liệu mẫu (không ghi vào đâu cả). */
export function taoDuLieuMau(cd: CaiDat): DuLieuMau {
  const homNay = homNayISO();
  const khachHang = KHACH_HANG_MAU.map((k, i) => ({ ...k, id: taoId(), ngayTao: Date.now() + i }));
  const hangMuc = HANG_MUC_MAU.map((h) => ({ ...h, id: taoId() }));

  const ngayBG1 = congNgay(homNay, -16);
  const ngayBG2 = congNgay(homNay, -3);
  const ngayNT = congNgay(homNay, -1);
  const so = (tienTo: string, ngay: string, stt: number) =>
    `${tienTo}-${namCua(ngay)}-${String(stt).padStart(cd.soChuSo, '0')}`;

  const chung = {
    thoiGianGiaoHang: cd.thoiGianGiaoHangMacDinh,
    hieuLucBaoGia: cd.hieuLucMacDinh,
    dieuKhoanThanhToan: cd.dieuKhoanThanhToanMacDinh,
    ghiChu: '',
    ngayTao: Date.now(),
    ngaySua: Date.now(),
  };

  const bg1: BaoGia = {
    ...chung,
    id: taoId(),
    soBaoGia: so(cd.tienToBaoGia, ngayBG1, 1),
    ngayLap: ngayBG1,
    khachHangId: khachHang[0].id,
    tieuDe: 'Gia công trục và bạc thay thế máy cán',
    danhSachDong: [
      dong('Tiện trục thép C45', 'Ø40 × 350mm, theo bản vẽ HL-01', 'cái', 20, 185_000),
      dong('Phay rãnh then', 'Rãnh 10 × 8 × 60mm', 'cái', 20, 80_000),
      dong('Tiện bạc đồng', 'Ø60/Ø40 × 80mm', 'cái', 10, 250_000),
      dong('Tôi cao tần bề mặt trục', 'Độ cứng 45–50 HRC', 'cái', 20, 60_000),
    ],
    tyLeVAT: 8,
    chietKhau: { kieu: 'phanTram', giaTri: 0 },
    ngaySua: Date.now() - 2000,
    trangThai: 'daChot',
  };

  const bg2: BaoGia = {
    ...chung,
    id: taoId(),
    soBaoGia: so(cd.tienToBaoGia, ngayBG2, namCua(ngayBG2) === namCua(ngayBG1) ? 2 : 1),
    ngayLap: ngayBG2,
    khachHangId: khachHang[1].id,
    tieuDe: 'Chế tạo khung giá đỡ băng tải',
    danhSachDong: [
      dong('Hàn khung thép hộp', 'Hộp 40 × 80 × 2mm, theo bản vẽ PT-05', 'kg', 320, 45_000),
      dong('Cắt CNC plasma thép tấm', 'Tấm SS400 dày 8mm', 'm', 45, 35_000),
      dong('Sơn chống gỉ hoàn thiện', '01 lớp chống gỉ + 02 lớp màu xám', 'm²', 18, 55_000),
      dong('Công lắp đặt tại chỗ', 'Tại nhà máy bên A', 'công', 3, 450_000),
    ],
    tyLeVAT: 10,
    chietKhau: { kieu: 'phanTram', giaTri: 5 },
    thoiGianGiaoHang: '10 ngày làm việc kể từ ngày nhận tạm ứng',
    ngaySua: Date.now() - 1000,
    trangThai: 'daGui',
  };

  const nt = chuyenBaoGiaThanhNghiemThu(bg1, khachHang[0], cd, so(cd.tienToNghiemThu, ngayNT, 1), ngayNT);
  nt.canCuHopDong = 'ĐH-HL/2026/045';
  nt.ngayCanCu = congNgay(ngayBG1, 2);
  nt.diaDiem = 'Xưởng của Bên B';
  // Bạc đồng: giao 9/10 cái, 1 cái chưa đạt sẽ làm lại
  nt.danhSachDong[2].soLuongThucTe = 9;
  nt.danhSachDong[2].ghiChu = '01 cái sai kích thước, làm lại';

  return { khachHang, hangMuc, baoGia: [bg1, bg2], nghiemThu: [nt] };
}

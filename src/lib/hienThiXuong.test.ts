import { describe, expect, it } from 'vitest';
import { CAI_DAT_THU } from '../test/caiDatThu';
import type { BaoGia, CaiDat } from '../db/kieu';
import { mauBaoGia } from '../pdf/mauBaoGia';
import { mauNghiemThu } from '../pdf/mauNghiemThu';
import { caiDatHienThi, dangHien, laTruongXuong } from './hienThiXuong';
import { chuyenBaoGiaThanhNghiemThu } from './nghiepVu';

const cd: CaiDat = {
  ...CAI_DAT_THU,
  tenDonVi: 'Cơ khí Thử Nghiệm',
  diaChi: 'Số 1 Đường Thử',
  maSoThue: '0101010101',
  dienThoai: '0909 000 111',
  email: 'xuong@thu.vn',
  soTaiKhoan: '123456789',
  nganHang: 'Vietcombank',
  nguoiDaiDien: 'Nguyễn Văn Chủ',
  chucVu: 'Giám đốc',
};
const bg: BaoGia = {
  id: 'b', soBaoGia: 'BG-2026-001', ngayLap: '2026-10-01', khachHangId: null, tieuDe: '',
  danhSachDong: [{ id: 'd', tenHangMuc: 'Tiện', quyCach: '', donViTinh: 'cái', soLuong: 1, donGia: 100_000, ghiChu: '' }],
  tyLeVAT: 8, chietKhau: { kieu: 'phanTram', giaTri: 0 }, thoiGianGiaoHang: '', hieuLucBaoGia: 15,
  dieuKhoanThanhToan: '', ghiChu: '', trangThai: 'nhap', ngayTao: 0, ngaySua: 0,
};
/** Toàn bộ chữ trong định nghĩa văn bản */
const chu = (x: unknown) => JSON.stringify(x);

describe('ẩn / hiện thông tin xưởng', () => {
  it('mặc định hiện tất cả', () => {
    expect(dangHien(cd, 'maSoThue')).toBe(true);
    expect(caiDatHienThi(cd)).toEqual(cd);
  });

  it('mục bị ẩn được xoá trắng, giữ nguyên mục khác', () => {
    const an = caiDatHienThi({ ...cd, truongAn: ['maSoThue', 'taiKhoan'] });
    expect(an.maSoThue).toBe('');
    expect(an.soTaiKhoan).toBe('');
    expect(an.nganHang).toBe('');
    expect(an.dienThoai).toBe(cd.dienThoai);
    expect(an.tenDonVi).toBe(cd.tenDonVi);
  });

  it('báo giá không in mục bị ẩn, vẫn in mục đang hiện', () => {
    const hienHet = chu(mauBaoGia(bg, undefined, cd));
    expect(hienHet).toContain('0101010101');
    expect(hienHet).toContain('xuong@thu.vn');
    expect(hienHet).toContain('Thông tin chuyển khoản');

    const an = chu(mauBaoGia(bg, undefined, { ...cd, truongAn: ['maSoThue', 'email', 'taiKhoan', 'nguoiDaiDien'] }));
    expect(an).not.toContain('0101010101');
    expect(an).not.toContain('Mã số thuế');
    expect(an).not.toContain('xuong@thu.vn');
    expect(an).not.toContain('Thông tin chuyển khoản');
    expect(an).not.toContain('Nguyễn Văn Chủ');
    expect(an).toContain('Số 1 Đường Thử');
    expect(an).toContain('0909 000 111');
    expect(an).toContain('CƠ KHÍ THỬ NGHIỆM');
  });

  it('biên bản nghiệm thu: Bên B không in mục bị ẩn', () => {
    const cdAn = { ...cd, truongAn: ['diaChi', 'maSoThue'] } as CaiDat;
    const nt = chuyenBaoGiaThanhNghiemThu(bg, undefined, caiDatHienThi(cdAn), 'NT-2026-001', '2026-10-01');
    const vb = chu(mauNghiemThu(nt, undefined, bg, [], cdAn));
    expect(vb).not.toContain('Số 1 Đường Thử');
    expect(vb).not.toContain('0101010101');
    expect(vb).toContain('0909 000 111');
    expect(vb).toContain('Nguyễn Văn Chủ');
  });

  it('chỉ nhận tên mục hợp lệ', () => {
    expect(laTruongXuong('email')).toBe(true);
    expect(laTruongXuong('tenDonVi')).toBe(false);
    expect(laTruongXuong(123)).toBe(false);
  });
});

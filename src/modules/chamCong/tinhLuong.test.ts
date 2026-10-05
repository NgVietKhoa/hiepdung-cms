import { describe, expect, it } from 'vitest';
import type { LoaiCong, NhanVien, OCong } from './kieu';
import { tinhLuong } from './tinhLuong';

const nv: NhanVien = {
  id: 'nv1',
  maNhanVien: '',
  hoTen: 'Nguyễn Văn A',
  chucVu: 'Thợ hàn',
  soDienThoai: '',
  cccd: '',
  diaChi: '',
  ngayVaoLam: '',
  luongNgay: 350_000,
  luongGioTangCa: 55_000,
  phuCapThang: 500_000,
  soTaiKhoan: '',
  nganHang: '',
  dangLam: true,
  ghiChu: '',
  thuTu: 0,
};
const loai: LoaiCong[] = [
  { id: 'X', kyHieu: 'X', ten: 'Đủ công', heSo: 1, mau: '', thuTu: 0 },
  { id: 'N', kyHieu: 'N', ten: 'Nửa công', heSo: 0.5, mau: '', thuTu: 1 },
  { id: 'K', kyHieu: 'K', ten: 'Nghỉ không lương', heSo: 0, mau: '', thuTu: 2 },
];
const o = (ngay: string, loaiCongId: string | null, gioTangCa = 0): OCong => ({
  nhanVienId: 'nv1',
  ngay,
  loaiCongId,
  gioTangCa,
  ghiChu: '',
});

describe('tính lương công nhật', () => {
  it('cộng công theo hệ số, tăng ca, phụ cấp, trừ tạm ứng', () => {
    const l = tinhLuong(
      nv,
      [o('2026-10-01', 'X', 2), o('2026-10-02', 'X'), o('2026-10-03', 'N', 1.5), o('2026-10-04', 'K'), o('2026-10-05', null, 3)],
      loai,
      1_000_000,
    );
    expect(l.soCong).toBe(2.5);
    expect(l.gioTangCa).toBe(6.5);
    expect(l.tienCong).toBe(875_000);
    expect(l.tienTangCa).toBe(357_500);
    expect(l.thucLinh).toBe(875_000 + 357_500 + 500_000 - 1_000_000);
    expect(l.soNgayTheoLoai).toEqual({ X: 2, N: 1, K: 1 });
  });

  it('không dính sai số khi cộng nhiều nửa công / giờ lẻ', () => {
    const ds = Array.from({ length: 10 }, (_, i) => o(`2026-10-${String(i + 1).padStart(2, '0')}`, 'N', 0.1));
    const l = tinhLuong(nv, ds, loai);
    expect(l.soCong).toBe(5);
    expect(l.gioTangCa).toBe(1);
  });

  it('ký hiệu công đã bị xoá thì không tính', () => {
    expect(tinhLuong(nv, [o('2026-10-01', 'khong-con')], loai).soCong).toBe(0);
  });
});

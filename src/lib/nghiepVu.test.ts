import { describe, expect, it } from 'vitest';
import type { BaoGia, DongHangMuc } from '../db/kieu';
import { CAI_DAT_THU } from '../test/caiDatThu';
import { baoGiaMoi, chuyenBaoGiaThanhNghiemThu, laBaoGiaRong } from './nghiepVu';
import { tongBaoGia, tongNghiemThu } from './tinhTien';

const dong = (khac: Partial<DongHangMuc>): DongHangMuc => ({
  id: Math.random().toString(36),
  tenHangMuc: '',
  quyCach: '',
  donViTinh: 'cái',
  soLuong: 1,
  donGia: 0,
  ghiChu: '',
  ...khac,
});

describe('chuyển báo giá → nghiệm thu', () => {
  const bg: BaoGia = {
    ...baoGiaMoi(CAI_DAT_THU, '2026-10-01'),
    danhSachDong: [
      dong({ loai: 'phan', tenHangMuc: 'Phần khung', soLuong: 0 }),
      dong({ tenHangMuc: 'Tiện trục', soLuong: 2, donGia: 150_000 }),
      // Chưa gõ tên nhưng đã có giá: báo giá vẫn tính tiền dòng này
      dong({ soLuong: 3, donGia: 40_000 }),
      // Dòng trống hoàn toàn và phần chưa đặt tên: bỏ
      dong({}),
      dong({ loai: 'phan', soLuong: 0 }),
    ],
    chietKhau: { kieu: 'phanTram', giaTri: 5 },
    tyLeVAT: 8,
  };

  it('giữ đúng các dòng bản in báo giá giữ, tổng nghiệm thu bằng tổng báo giá', () => {
    const nt = chuyenBaoGiaThanhNghiemThu(bg, undefined, CAI_DAT_THU, '', '2026-10-05');
    expect(nt.danhSachDong.map((d) => d.tenHangMuc)).toEqual(['Phần khung', 'Tiện trục', '']);
    expect(tongNghiemThu(nt)).toEqual(tongBaoGia(bg));
  });

  it('dòng mới lấy đơn vị đầu tiên trong cài đặt', () => {
    expect(bg.danhSachDong[0].donViTinh).toBe('cái');
    expect(baoGiaMoi({ ...CAI_DAT_THU, danhSachDonViTinh: ['bộ'] }, '2026-10-01').danhSachDong[0].donViTinh).toBe('bộ');
  });

  it('báo giá chỉ có dòng trống là báo giá rỗng', () => {
    expect(laBaoGiaRong(baoGiaMoi(CAI_DAT_THU, '2026-10-01'))).toBe(true);
    expect(laBaoGiaRong(bg)).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { CAI_DAT_THU } from '../test/caiDatThu';
import type { BaoGia, KhachHang } from '../db/kieu';
import { chuyenBaoGiaThanhNghiemThu } from '../lib/nghiepVu';
import { mauBaoGia } from './mauBaoGia';
import { mauNghiemThu } from './mauNghiemThu';
import { tenKhachChoFile } from './xuat';

// @ts-ignore – bản build trình duyệt của pdfmake vẫn chạy được trong Node
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import vfs from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = vfs;

const kh: KhachHang = {
  id: 'k1', tenCongTy: 'Công ty TNHH Thiết bị Công nghiệp Hoàng Long', diaChi: 'KCN Tân Tạo, Q. Bình Tân, TP. HCM',
  maSoThue: '0312345678', nguoiLienHe: 'Trần Văn Hùng', chucVu: 'Trưởng phòng Kỹ thuật', soDienThoai: '0903 123 456',
  email: '', ghiChu: '', ngayTao: 0,
};
const bg: BaoGia = {
  id: 'b1', soBaoGia: 'BG-2026-001', ngayLap: '2026-09-15', khachHangId: 'k1', tieuDe: 'Gia công trục và bạc',
  danhSachDong: [
    { id: '1', tenHangMuc: 'Tiện trục thép C45', quyCach: 'Ø40 × 350mm', donViTinh: 'cái', soLuong: 20, donGia: 185000, ghiChu: '' },
    { id: '2', tenHangMuc: 'Phay rãnh then', quyCach: 'Rãnh 10 × 8', donViTinh: 'cái', soLuong: 2.5, donGia: 80000, ghiChu: 'gấp' },
  ],
  tyLeVAT: 8, chietKhau: { kieu: 'phanTram', giaTri: 5 }, thoiGianGiaoHang: '07 ngày', hieuLucBaoGia: 15,
  dieuKhoanThanhToan: 'Chuyển khoản', ghiChu: '', trangThai: 'daChot', ngayTao: 0, ngaySua: 0,
};

const taoBuffer = (dd: any) =>
  new Promise<Uint8Array>((res) => (pdfMake as any).createPdf(dd).getBuffer((b: Uint8Array) => res(b)));

describe('mẫu PDF', () => {
  it('tạo được báo giá và biên bản nghiệm thu', async () => {
    const pdf1 = await taoBuffer(mauBaoGia(bg, kh, CAI_DAT_THU));
    const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, CAI_DAT_THU, 'NT-2026-001', '2026-09-30');
    nt.danhSachDong[1].soLuongThucTe = 2;
    const pdf2 = await taoBuffer(mauNghiemThu(nt, kh, bg, [], CAI_DAT_THU));
    expect(pdf1.length).toBeGreaterThan(5000);
    expect(pdf2.length).toBeGreaterThan(5000);
    if (process.env.GHI_PDF) {
      writeFileSync(`${process.env.GHI_PDF}/baogia.pdf`, pdf1);
      writeFileSync(`${process.env.GHI_PDF}/nghiemthu.pdf`, pdf2);
    }
  });

  it('có logo và ảnh phụ lục vẫn tạo được', async () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const cd = { ...CAI_DAT_THU, logo: png };
    const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, cd, 'NT-2026-002', '2026-09-30');
    const anh = [{ id: 'a', nghiemThuId: nt.id, duLieu: png, ghiChu: 'Mặt bích', thuTu: 1 }];
    expect((await taoBuffer(mauBaoGia(bg, kh, cd))).length).toBeGreaterThan(5000);
    expect((await taoBuffer(mauNghiemThu(nt, kh, bg, anh, cd))).length).toBeGreaterThan(5000);
  });

  it('chia phần I, II và hạng mục có chi tiết vẫn tạo được', async () => {
    const coPhan: BaoGia = {
      ...bg,
      danhSachDong: [
        { id: 'p1', loai: 'phan', tenHangMuc: 'PHẦN KHUNG', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '' },
        { ...bg.danhSachDong[0], chiTiet: ['Tôn lạnh 0,45mm', 'Tôn màu 0,4mm'] },
        { id: 'p2', loai: 'phan', tenHangMuc: 'PHẦN PHAY', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '' },
        bg.danhSachDong[1],
      ],
    };
    const dd = mauBaoGia(coPhan, kh, CAI_DAT_THU);
    expect(JSON.stringify(dd)).toContain('- Tôn lạnh 0,45mm');
    const nt = chuyenBaoGiaThanhNghiemThu(coPhan, kh, CAI_DAT_THU, 'NT-2026-003', '2026-09-30');
    expect(nt.danhSachDong.filter((d) => d.loai === 'phan')).toHaveLength(2);
    const pdf1 = await taoBuffer(dd);
    const pdf2 = await taoBuffer(mauNghiemThu(nt, kh, coPhan, [], CAI_DAT_THU));
    expect(pdf1.length).toBeGreaterThan(5000);
    expect(pdf2.length).toBeGreaterThan(5000);
    if (process.env.GHI_PDF) {
      writeFileSync(`${process.env.GHI_PDF}/baogia-phan.pdf`, pdf1);
      writeFileSync(`${process.env.GHI_PDF}/nghiemthu-phan.pdf`, pdf2);
    }
  });

  it('đặt tên file theo tên khách', () => {
    expect(tenKhachChoFile(kh.tenCongTy)).toBe('ThietBiCongNghiepHoangLong');
    expect(tenKhachChoFile('Anh Lê Minh Tuấn (Xưởng mộc)')).toBe('LeMinhTuan');
  });
});

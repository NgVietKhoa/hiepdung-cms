import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { CAI_DAT_THU } from '../test/caiDatThu';
import type { BaoGia, DongHangMuc, KhachHang } from '../db/kieu';
import { chuyenBaoGiaThanhNghiemThu } from '../lib/nghiepVu';
import { mauBaoGia } from './mauBaoGia';
import { mauNghiemThu } from './mauNghiemThu';
import { docHangMucTuFile } from './nhapFile';
import { excelBaoGia, excelNghiemThu } from './xuatExcel';
import { wordBaoGia, wordNghiemThu } from './xuatWord';

// @ts-ignore – bản build trình duyệt của pdfmake vẫn chạy được trong Node
import pdfMake from 'pdfmake/build/pdfmake';
// @ts-ignore
import vfs from 'pdfmake/build/vfs_fonts';
(pdfMake as any).vfs = vfs;

const kh: KhachHang = {
  id: 'k1', tenCongTy: 'Công ty TNHH Hoàng Long', diaChi: 'KCN Tân Tạo', maSoThue: '0312345678', nguoiLienHe: 'Trần Văn Hùng',
  chucVu: 'Trưởng phòng', soDienThoai: '0903 123 456', email: '', ghiChu: '', ngayTao: 0,
};
const bg: BaoGia = {
  id: 'b1', soBaoGia: 'BG-2026-001', ngayLap: '2026-09-15', khachHangId: 'k1', tieuDe: 'Gia công trục và bạc',
  danhSachDong: [
    { id: 'p1', loai: 'phan', tenHangMuc: 'PHẦN KHUNG', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '', chiTiet: [] },
    { id: '1', tenHangMuc: 'Tiện trục thép C45', chiTiet: ['Thép C45', 'Ø40'], quyCach: 'Ø40 × 350mm', donViTinh: 'cái', soLuong: 20, donGia: 185000, ghiChu: '' },
    { id: '2', tenHangMuc: 'Phay rãnh then', chiTiet: [], quyCach: 'Rãnh 10 × 8', donViTinh: 'cái', soLuong: 2.5, donGia: 80333, ghiChu: 'gấp' },
    { id: 'p2', loai: 'phan', tenHangMuc: 'PHẦN BẠC', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '', chiTiet: [] },
    { id: '3', tenHangMuc: 'Bạc đồng', chiTiet: [], quyCach: '', donViTinh: 'bộ', soLuong: 1.125, donGia: 1250000, ghiChu: '' },
  ],
  tyLeVAT: 8, chietKhau: { kieu: 'phanTram', giaTri: 5 }, thoiGianGiaoHang: '07 ngày', hieuLucBaoGia: 15,
  dieuKhoanThanhToan: 'Chuyển khoản', ghiChu: '', trangThai: 'daChot', ngayTao: 0, ngaySua: 0,
};
const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, CAI_DAT_THU, 'NT-2026-001', '2026-09-30');

/** Các trường đọc lại được từ file (không có id) */
const boId = (ds: DongHangMuc[]) => ds.map(({ id: _id, ...d }) => d);
const tep = (blob: Blob, ten: string) => new File([blob], ten);
const pdf = (dd: unknown) =>
  new Promise<Blob>((res) => (pdfMake as any).createPdf(dd).getBuffer((b: Uint8Array<ArrayBuffer>) => res(new Blob([b]))));

describe('nhập hạng mục từ file do ứng dụng xuất', () => {
  it.each([
    ['báo giá Excel', () => excelBaoGia(bg, kh, CAI_DAT_THU), 'bg.xlsx'],
    ['báo giá Word', () => wordBaoGia(bg, kh, CAI_DAT_THU), 'bg.docx'],
    ['báo giá PDF', () => pdf(mauBaoGia(bg, kh, CAI_DAT_THU)), 'bg.pdf'],
    ['nghiệm thu Excel', () => excelNghiemThu(nt, kh, bg, CAI_DAT_THU), 'nt.xlsx'],
    ['nghiệm thu Word', () => wordNghiemThu(nt, kh, bg, [], CAI_DAT_THU), 'nt.docx'],
    ['nghiệm thu PDF', () => pdf(mauNghiemThu(nt, kh, bg, [], CAI_DAT_THU)), 'nt.pdf'],
  ])('%s: đọc lại đủ phần, tên, chi tiết, ghi chú, quy cách, ĐVT, số lượng, đơn giá', async (_ten, xuat, tenTep) => {
    expect(await docHangMucTuFile(tep(await xuat(), tenTep))).toEqual(boId(bg.danhSachDong));
  });
});

describe('nhập hạng mục từ file khác', () => {
  it('Excel của bên khác: tiêu đề khác chữ, có dòng tên công ty phía trên, số dạng chữ, bỏ dòng tổng', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('BG');
    ws.addRows([
      ['CÔNG TY ABC', '', '', '', '', ''],
      ['BẢNG BÁO GIÁ', '', '', '', '', ''],
      ['TT', 'Nội dung công việc', 'ĐVT', 'Khối lượng', 'Đơn giá (VNĐ)', 'Thành tiền'],
      [1, 'Hàn khung giá đỡ', 'bộ', 2, '1.500.000', 3000000],
      [2, 'Sơn tĩnh điện', 'm2', '12,5', 85000, 1062500],
      ['', 'Tổng cộng', '', '', '', 4062500],
    ]);
    const blob = new Blob([await wb.xlsx.writeBuffer()]);
    expect(await docHangMucTuFile(tep(blob, 'abc.xlsx'))).toEqual([
      { tenHangMuc: 'Hàn khung giá đỡ', chiTiet: [], quyCach: '', donViTinh: 'bộ', soLuong: 2, donGia: 1500000, ghiChu: '' },
      { tenHangMuc: 'Sơn tĩnh điện', chiTiet: [], quyCach: '', donViTinh: 'm2', soLuong: 12.5, donGia: 85000, ghiChu: '' },
    ]);
  });

  it('PDF nhiều trang: bỏ dòng tiêu đề lặp lại và số trang, đọc đủ mọi dòng', async () => {
    const dai: BaoGia = {
      ...bg,
      danhSachDong: Array.from({ length: 60 }, (_, i) => ({
        id: String(i), tenHangMuc: `Hạng mục số ${i + 1}`, chiTiet: [], quyCach: `M${i + 1}`, donViTinh: 'cái',
        soLuong: i + 1, donGia: (i + 1) * 1000, ghiChu: '',
      })),
    };
    expect(await docHangMucTuFile(tep(await pdf(mauBaoGia(dai, kh, CAI_DAT_THU)), 'dai.pdf'))).toEqual(boId(dai.danhSachDong));
  });

  it('file không có bảng hạng mục thì trả về rỗng, đuôi lạ thì báo lỗi', async () => {
    expect(await docHangMucTuFile(tep(await pdf({ content: 'Không có bảng' }), 'a.pdf'))).toEqual([]);
    await expect(docHangMucTuFile(new File(['x'], 'a.doc'))).rejects.toThrow('.xlsx, .docx hoặc .pdf');
  });
});

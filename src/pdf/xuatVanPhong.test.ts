import { describe, expect, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { CAI_DAT_THU } from '../test/caiDatThu';
import type { BaoGia, KhachHang } from '../db/kieu';
import { chuyenBaoGiaThanhNghiemThu } from '../lib/nghiepVu';
import { thanhTien, tinhTong } from '../lib/tinhTien';
import { excelBaoGia, excelNghiemThu } from './xuatExcel';
import { wordBaoGia, wordNghiemThu } from './xuatWord';

const kh: KhachHang = {
  id: 'k1', tenCongTy: 'Công ty TNHH Thiết bị Công nghiệp Hoàng Long', diaChi: 'KCN Tân Tạo, Q. Bình Tân, TP. HCM',
  maSoThue: '0312345678', nguoiLienHe: 'Trần Văn Hùng', chucVu: 'Trưởng phòng Kỹ thuật', soDienThoai: '0903 123 456',
  email: '', ghiChu: '', ngayTao: 0,
};
const bg: BaoGia = {
  id: 'b1', soBaoGia: 'BG-2026-001', ngayLap: '2026-09-15', khachHangId: 'k1', tieuDe: 'Gia công trục và bạc',
  danhSachDong: [
    { id: '1', tenHangMuc: 'Tiện trục thép C45', quyCach: 'Ø40 × 350mm', donViTinh: 'cái', soLuong: 20, donGia: 185000, ghiChu: '' },
    { id: '2', tenHangMuc: 'Phay rãnh then', quyCach: 'Rãnh 10 × 8', donViTinh: 'cái', soLuong: 2.5, donGia: 80333, ghiChu: 'gấp' },
    { id: '3', tenHangMuc: '', quyCach: '', donViTinh: 'cái', soLuong: 1, donGia: 0, ghiChu: '' },
  ],
  tyLeVAT: 8, chietKhau: { kieu: 'phanTram', giaTri: 5 }, thoiGianGiaoHang: '07 ngày', hieuLucBaoGia: 15,
  dieuKhoanThanhToan: 'Chuyển khoản', ghiChu: '', trangThai: 'daChot', ngayTao: 0, ngaySua: 0,
};

const docWord = async (blob: Blob) => {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  return zip.file('word/document.xml')!.async('string');
};
const docExcel = async (blob: Blob) => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await blob.arrayBuffer());
  return wb.worksheets[0];
};
/** Tìm ô có chữ `nhan`, trả về ô số tiền cùng hàng ở cột `cot` */
const oCungHang = (ws: ExcelJS.Worksheet, nhan: string, cot: number) => {
  let kq: ExcelJS.Cell | undefined;
  ws.eachRow((row) => {
    if (row.getCell(1).value === nhan) kq = row.getCell(cot);
  });
  return kq!;
};

describe('xuất Word', () => {
  it('báo giá có đủ tiêu đề, hạng mục, tổng tiền', async () => {
    const blob = await wordBaoGia(bg, kh, CAI_DAT_THU);
    const xml = await docWord(blob);
    expect(xml).toContain('BẢNG BÁO GIÁ');
    expect(xml).toContain('Tiện trục thép C45');
    expect(xml).toContain('TỔNG THANH TOÁN');
    expect(xml).toContain('Kính gửi');
    if (process.env.GHI_PDF) writeFileSync(`${process.env.GHI_PDF}/baogia.docx`, Buffer.from(await blob.arrayBuffer()));
  });

  it('biên bản nghiệm thu có hai bên và kết luận', async () => {
    const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, CAI_DAT_THU, 'NT-2026-001', '2026-09-30');
    const blob = await wordNghiemThu(nt, kh, bg, [], CAI_DAT_THU);
    const xml = await docWord(blob);
    expect(xml).toContain('BIÊN BẢN NGHIỆM THU');
    expect(xml).toContain('BÊN A (Bên giao việc)');
    expect(xml).toContain('KẾT LUẬN');
    if (process.env.GHI_PDF) writeFileSync(`${process.env.GHI_PDF}/nghiemthu.docx`, Buffer.from(await blob.arrayBuffer()));
  });
});

describe('xuất Excel', () => {
  it('báo giá: thành tiền và tổng là công thức, kết quả khớp cách tính của ứng dụng', async () => {
    const blob = await excelBaoGia(bg, kh, CAI_DAT_THU);
    const ws = await docExcel(blob);
    const dong = bg.danhSachDong.slice(0, 2);
    const tong = tinhTong(dong.map((d) => thanhTien(d.soLuong, d.donGia)), bg.chietKhau, bg.tyLeVAT);

    const oTong = oCungHang(ws, 'TỔNG THANH TOÁN', 7);
    expect(oTong.formula).toBeTruthy();
    expect(oTong.result).toBe(tong.tongThanhToan);
    expect(oCungHang(ws, 'Cộng tiền hàng', 7).formula).toMatch(/^SUM\(/);
    expect(oCungHang(ws, 'Chiết khấu (5%)', 7).result).toBe(-tong.tienChietKhau);
    expect(oCungHang(ws, 'Thuế VAT 8%', 7).result).toBe(tong.tienVAT);
    // Dòng trống (chưa có tên, đơn giá) không được xuất
    let soDongHangMuc = 0;
    ws.eachRow((row) => {
      if (typeof row.getCell(7).formula === 'string' && row.getCell(7).formula.startsWith('ROUND(E')) soDongHangMuc++;
    });
    expect(soDongHangMuc).toBe(2);
    if (process.env.GHI_PDF) writeFileSync(`${process.env.GHI_PDF}/baogia.xlsx`, Buffer.from(await blob.arrayBuffer()));
  });

  it('chia phần I, II: dòng phần chỉ có tên, "Cộng tiền hàng" chỉ cộng các hạng mục', async () => {
    const coPhan: BaoGia = {
      ...bg,
      danhSachDong: [
        { id: 'p1', loai: 'phan', tenHangMuc: 'PHẦN KHUNG', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '' },
        { ...bg.danhSachDong[0], chiTiet: ['Thép C45', 'Ø40'] },
        { id: 'p2', loai: 'phan', tenHangMuc: 'PHẦN PHAY', quyCach: '', donViTinh: '', soLuong: 0, donGia: 0, ghiChu: '' },
        bg.danhSachDong[1],
      ],
    };
    const ws = await docExcel(await excelBaoGia(coPhan, kh, CAI_DAT_THU));
    const t1 = thanhTien(bg.danhSachDong[0].soLuong, bg.danhSachDong[0].donGia);
    const t2 = thanhTien(bg.danhSachDong[1].soLuong, bg.danhSachDong[1].donGia);
    const tong = tinhTong([t1, t2], bg.chietKhau, bg.tyLeVAT);

    // Dòng phần: tên gộp hết các cột sau STT, không có thành tiền
    expect(oCungHang(ws, 'I', 2).value).toBe('PHẦN KHUNG');
    expect(oCungHang(ws, 'II', 7).formula).toBeUndefined();
    const cong = oCungHang(ws, 'Cộng tiền hàng', 7);
    expect(cong.result).toBe(t1 + t2);
    // Hai dải hạng mục tách nhau bởi dòng phần
    expect(cong.formula).toMatch(/^SUM\(G\d+:G\d+,G\d+:G\d+\)$/);
    expect(oCungHang(ws, 'TỔNG THANH TOÁN', 7).result).toBe(tong.tongThanhToan);

    const xml = await docWord(await wordBaoGia(coPhan, kh, CAI_DAT_THU));
    expect(xml).toContain('PHẦN KHUNG');
    expect(xml).toContain('- Thép C45');
  });

  it('nghiệm thu: tính theo SL thực tế', async () => {
    const nt = chuyenBaoGiaThanhNghiemThu(bg, kh, CAI_DAT_THU, 'NT-2026-001', '2026-09-30');
    nt.danhSachDong[1].soLuongThucTe = 2;
    const blob = await excelNghiemThu(nt, kh, bg, CAI_DAT_THU);
    const ws = await docExcel(blob);
    const dong = nt.danhSachDong.filter((d) => d.tenHangMuc.trim() || d.donGia);
    const tong = tinhTong(dong.map((d) => thanhTien(d.soLuongThucTe, d.donGia)), nt.chietKhau, nt.tyLeVAT);
    expect(oCungHang(ws, 'TỔNG GIÁ TRỊ NGHIỆM THU', 8).result).toBe(tong.tongThanhToan);
    if (process.env.GHI_PDF) writeFileSync(`${process.env.GHI_PDF}/nghiemthu.xlsx`, Buffer.from(await blob.arrayBuffer()));
  });
});

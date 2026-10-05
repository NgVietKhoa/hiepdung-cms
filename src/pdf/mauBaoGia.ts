import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { BaoGia, CaiDat, KhachHang } from '../db/kieu';
import { dinhDangNgay, dinhDangSoLuong } from '../lib/dinhDang';
import { docTienBangChu } from '../lib/docSo';
import { caiDatHienThi } from '../lib/hienThiXuong';
import { danhSo } from '../lib/phanMuc';
import { thanhTienBaoGia, tongBaoGia } from '../lib/tinhTien';
import {
  KHUNG_TRANG,
  KIEU_BANG,
  dongPhanPdf,
  dongThongTin,
  duongKe,
  khoiKy,
  loc,
  tienO,
} from './mauChung';
import {
  CAU_CHAO_BAO_GIA,
  CAU_KET_BAO_GIA,
  cacDongTongBaoGia,
  dieuKhoanBaoGia,
  dongCoNoiDung,
  nguoiLienHe,
  tenKemGhiChu,
} from './noiDung';

function dauTrang(cd: CaiDat): Content {
  const thongTin = {
    width: '*',
    stack: loc<Content>([
      { text: cd.tenDonVi.toUpperCase(), bold: true, fontSize: 14, color: '#0b3d6b' },
      dongThongTin('Địa chỉ', cd.diaChi),
      dongThongTin('Mã số thuế', cd.maSoThue),
      dongThongTin('Điện thoại', cd.dienThoai),
      dongThongTin('Email', cd.email),
    ]),
  };
  return {
    columns: cd.logo ? [{ image: cd.logo, fit: [80, 80], width: 92 }, thongTin] : [thongTin],
    columnGap: 8,
  };
}

export function mauBaoGia(bg: BaoGia, kh: KhachHang | undefined, caiDat: CaiDat): TDocumentDefinitions {
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(bg.danhSachDong);
  const tien = thanhTienBaoGia;
  const tong = tongBaoGia(bg);

  const dauBang: TableCell[] = ['STT', 'Tên hàng hoá / dịch vụ', 'Quy cách', 'ĐVT', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)'].map(
    (t) => ({ text: t, style: 'dauBang' }),
  );
  const cacDong: TableCell[][] = danhSo(dong, tien).map(({ dong: d, laPhan, stt, tien: t }) =>
    laPhan
      ? dongPhanPdf(stt, d.tenHangMuc, 7)
      : [
          { text: stt, alignment: 'center' },
          tenKemGhiChu(d),
          d.quyCach,
          { text: d.donViTinh, alignment: 'center' },
          { text: dinhDangSoLuong(d.soLuong), alignment: 'right' },
          { text: tienO(d.donGia), alignment: 'right' },
          { text: tienO(t), alignment: 'right' },
        ],
  );

  const cacDongTong: TableCell[][] = cacDongTongBaoGia(bg, tong).map(({ nhan, giaTri, dam }): TableCell[] => [
    { text: nhan, colSpan: 6, alignment: 'right', bold: dam },
    {}, {}, {}, {}, {},
    { text: tienO(giaTri), alignment: 'right', bold: dam },
  ]);
  const dieuKhoan = dieuKhoanBaoGia(bg, cd);

  const noiDung: Content[] = loc<Content>([
    dauTrang(cd),
    duongKe(),
    { text: 'BẢNG BÁO GIÁ', style: 'tieuDe' },
    { text: `Số: ${bg.soBaoGia}   –   Ngày: ${dinhDangNgay(bg.ngayLap)}`, style: 'phuDe', margin: [0, 0, 0, 10] },
    { text: ['Kính gửi: ', { text: kh?.tenCongTy || '.......................................', bold: true }] },
    nguoiLienHe(kh) ? { text: nguoiLienHe(kh) } : null,
    dongThongTin('Địa chỉ', kh?.diaChi),
    dongThongTin('Về việc', bg.tieuDe),
    {
      text: CAU_CHAO_BAO_GIA(cd.tenDonVi),
      margin: [0, 8, 0, 6],
    },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [24, '*', 92, 34, 46, 64, 74],
        body: [dauBang, ...cacDong, ...cacDongTong],
      },
      layout: KIEU_BANG,
      style: 'oBang',
    },
    { text: [{ text: 'Bằng chữ: ', bold: true }, docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu }) + '.'], italics: true, margin: [0, 6, 0, 0] },
    dieuKhoan.length ? { text: 'ĐIỀU KHOẢN', style: 'muc' } : null,
    dieuKhoan.length ? { ul: dieuKhoan, margin: [6, 0, 0, 0] } : null,
    {
      text: CAU_KET_BAO_GIA,
      italics: true,
      margin: [0, 8, 0, 0],
    },
    {
      columns: [
        { width: '*', text: '' },
        { width: 250, ...(khoiKy(`ĐẠI DIỆN ${cd.tenDonVi.toUpperCase()}`, cd.chucVu, cd.nguoiDaiDien) as object) },
      ],
      margin: [0, 14, 0, 0],
      unbreakable: true,
    } as Content,
  ]);

  return {
    ...KHUNG_TRANG,
    info: { title: `Báo giá ${bg.soBaoGia}`, author: cd.tenDonVi },
    content: noiDung,
  };
}

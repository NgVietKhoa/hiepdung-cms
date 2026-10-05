/** Thành phần dùng chung cho các mẫu văn bản (khổ A4 dọc). */
import type { Content, CustomTableLayout, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { CaiDat } from '../db/kieu';
import { dinhDangTien } from '../lib/dinhDang';

/** Bề rộng vùng in A4 (595pt) trừ lề trái/phải 2 × 42pt */
export const BE_RONG_TRANG = 511;

export const KHUNG_TRANG: Pick<TDocumentDefinitions, 'pageSize' | 'pageOrientation' | 'pageMargins' | 'defaultStyle' | 'styles' | 'footer'> = {
  pageSize: 'A4',
  pageOrientation: 'portrait',
  // trái, trên, phải, dưới (pt) ≈ 15mm / 14mm / 15mm / 18mm
  pageMargins: [42, 40, 42, 50],
  defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.2 },
  styles: {
    tieuDe: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 10, 0, 2] },
    phuDe: { fontSize: 11, italics: true, alignment: 'center' },
    dauBang: { bold: true, fontSize: 9.5, alignment: 'center', fillColor: '#e8e8e8' },
    oBang: { fontSize: 9.5 },
    muc: { bold: true, margin: [0, 8, 0, 3] },
    nhanKy: { bold: true, alignment: 'center' },
  },
  footer: (trang: number, tongSo: number) =>
    tongSo > 1
      ? { text: `Trang ${trang}/${tongSo}`, alignment: 'center', fontSize: 9, color: '#555', margin: [0, 18, 0, 0] }
      : null,
};

export const KIEU_BANG: CustomTableLayout = {
  hLineWidth: () => 0.6,
  vLineWidth: () => 0.6,
  hLineColor: () => '#444',
  vLineColor: () => '#444',
  paddingLeft: () => 4,
  paddingRight: () => 4,
  paddingTop: () => 3,
  paddingBottom: () => 3,
};

/** Nền dòng tiêu đề phần (I, II…) trong bảng hạng mục — nhạt hơn nền hàng tiêu đề cột (#e8e8e8) để dễ phân biệt */
export const NEN_PHAN = '#f7f7f7';

/** Dòng tiêu đề phần: số La Mã | tên phần gộp hết các cột còn lại (`soCot`: tổng số cột bảng) */
export function dongPhanPdf(stt: string, ten: string, soCot: number): TableCell[] {
  return [
    { text: stt, alignment: 'center', bold: true, fillColor: NEN_PHAN },
    { text: ten, colSpan: soCot - 1, bold: true, fillColor: NEN_PHAN },
    ...Array.from({ length: soCot - 2 }, () => ({})),
  ];
}

/** Tiền trong bảng: không kèm "đ" cho gọn, cột đã ghi "(đ)". */
export const tienO = (n: number) => dinhDangTien(n, false);

/** Dòng "Nhãn: giá trị", bỏ qua nếu giá trị rỗng. */
export function dongThongTin(nhan: string, giaTri: string | undefined, dam = false): Content | null {
  if (!giaTri?.trim()) return null;
  return { text: [`${nhan}: `, { text: giaTri, bold: dam }] };
}

export function loc<T>(ds: (T | null | undefined | false)[]): T[] {
  return ds.filter(Boolean) as T[];
}

export function thongTinNganHang(cd: CaiDat): string {
  const phan = [
    cd.soTaiKhoan && `Số TK: ${cd.soTaiKhoan}`,
    cd.nganHang && `tại ${cd.nganHang}`,
    cd.chiNhanh && `– ${cd.chiNhanh}`,
  ].filter(Boolean);
  let s = phan.join(' ');
  if (cd.chuTaiKhoan) s += ` (Chủ TK: ${cd.chuTaiKhoan})`;
  return s;
}

export function duongKe(): Content {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: BE_RONG_TRANG, y2: 0, lineWidth: 1, lineColor: '#333' }],
    margin: [0, 6, 0, 0],
  };
}

/** Khối chữ ký: tiêu đề, chức vụ, (Ký, ghi rõ họ tên), khoảng trống để ký `khoangKy` (pt), họ tên. */
export function khoiKy(tieuDe: string, chucVu: string, hoTen: string, khoangKy = 52): Content {
  return {
    stack: loc<Content>([
      { text: tieuDe, style: 'nhanKy' },
      chucVu ? { text: chucVu, alignment: 'center' } : null,
      { text: '(Ký, ghi rõ họ tên)', italics: true, alignment: 'center', fontSize: 10 },
      { text: ' ', margin: [0, 0, 0, khoangKy] },
      { text: hoTen, bold: true, alignment: 'center' },
    ]),
  };
}

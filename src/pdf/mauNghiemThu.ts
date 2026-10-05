import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { AnhDinhKem, BaoGia, BienBanNghiemThu, CaiDat, KhachHang, NguoiDaiDien } from '../db/kieu';
import { dinhDangSoLuong, ngayThangNam } from '../lib/dinhDang';
import { docTienBangChu } from '../lib/docSo';
import { caiDatHienThi } from '../lib/hienThiXuong';
import { danhSo } from '../lib/phanMuc';
import { thanhTienNghiemThu, tongNghiemThu } from '../lib/tinhTien';
import { BE_RONG_TRANG, KHUNG_TRANG, KIEU_BANG, dongPhanPdf, dongThongTin, khoiKy, loc, tienO } from './mauChung';
import { CAU_KET_NGHIEM_THU, CHAM, cacDongTongNghiemThu, canCuNghiemThu, dongCoNoiDung, tenKemGhiChu } from './noiDung';

function dauTrang(cd: CaiDat): Content {
  return {
    columns: [
      {
        width: 200,
        stack: [
          { text: cd.tenDonVi.toUpperCase(), bold: true, alignment: 'center', fontSize: 10.5 },
          { canvas: [{ type: 'line', x1: 60, y1: 2, x2: 140, y2: 2, lineWidth: 0.6 }] },
        ],
      },
      {
        width: '*',
        stack: [
          { text: 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', bold: true, alignment: 'center', fontSize: 11 },
          { text: 'Độc lập – Tự do – Hạnh phúc', bold: true, alignment: 'center', decoration: 'underline' },
        ],
      },
    ],
    columnGap: 10,
  };
}

/** Một người: ghi gọn trên 1 dòng. Nhiều người: "Đại diện gồm:" rồi liệt kê. */
function daiDien(ds: NguoiDaiDien[]): Content[] {
  const coTen = ds.filter((n) => n.hoTen.trim() || n.chucVu.trim());
  const hienThi = coTen.length ? coTen : [{ hoTen: '', chucVu: '' }];
  const dong = (n: NguoiDaiDien, nhan: string): Content => ({
    columns: [
      { width: '55%', text: `${nhan}${n.hoTen || CHAM}` },
      { width: '*', text: `Chức vụ: ${n.chucVu || '....................'}` },
    ],
  });
  if (hienThi.length === 1) return [dong(hienThi[0], '- Đại diện: Ông/Bà ')];
  return [
    { text: '- Đại diện gồm:' },
    { stack: hienThi.map((n) => dong(n, '   + Ông/Bà ')) },
  ];
}

function mstVaDienThoai(mst?: string, dt?: string): Content | null {
  const phan = loc<string>([mst?.trim() && `Mã số thuế: ${mst}`, dt?.trim() && `Điện thoại: ${dt}`]);
  return phan.length ? { text: `- ${phan.join('     ')}` } : null;
}

function phuLucAnh(nt: BienBanNghiemThu, anh: AnhDinhKem[]): Content[] {
  if (!anh.length) return [];
  const rongO = (BE_RONG_TRANG - 16) / 2;
  const o = anh.map<Content>((a, i) => ({
    stack: [
      { image: a.duLieu, fit: [rongO, 230], alignment: 'center' },
      { text: `Hình ${i + 1}${a.ghiChu ? `: ${a.ghiChu}` : ''}`, italics: true, fontSize: 10, alignment: 'center', margin: [0, 3, 0, 0] },
    ],
    margin: [0, 0, 0, 12],
    unbreakable: true,
  }));
  const hang: Content[] = [];
  for (let i = 0; i < o.length; i += 2) {
    hang.push({ columns: [{ width: '*', ...(o[i] as object) }, o[i + 1] ? { width: '*', ...(o[i + 1] as object) } : { width: '*', text: '' }], columnGap: 16 } as Content);
  }
  return [
    { text: 'PHỤ LỤC: HÌNH ẢNH NGHIỆM THU', style: 'tieuDe', fontSize: 15, pageBreak: 'before' },
    { text: `(Kèm theo Biên bản nghiệm thu số ${nt.soBienBan} ${ngayThangNam(nt.ngayNghiemThu)})`, style: 'phuDe', margin: [0, 0, 0, 12] },
    ...hang,
  ];
}

export function mauNghiemThu(
  nt: BienBanNghiemThu,
  kh: KhachHang | undefined,
  bg: BaoGia | undefined,
  anh: AnhDinhKem[],
  caiDat: CaiDat,
): TDocumentDefinitions {
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(nt.danhSachDong);
  const tien = thanhTienNghiemThu;
  const tong = tongNghiemThu(nt);

  const dauBang: TableCell[] = [
    'STT', 'Hạng mục', 'Quy cách', 'ĐVT', 'SL theo báo giá', 'SL thực tế', 'Đơn giá (đ)', 'Thành tiền (đ)', 'Đánh giá',
  ].map((t) => ({ text: t, style: 'dauBang', fontSize: 9 }));

  const cacDong: TableCell[][] = danhSo(dong, tien).map(({ dong: d, laPhan, stt, tien: t }) =>
    laPhan
      ? dongPhanPdf(stt, d.tenHangMuc, 9)
      : [
          { text: stt, alignment: 'center' },
          tenKemGhiChu(d),
          d.quyCach,
          { text: d.donViTinh, alignment: 'center' },
          { text: dinhDangSoLuong(d.soLuong), alignment: 'right' },
          { text: dinhDangSoLuong(d.soLuongThucTe), alignment: 'right', bold: d.soLuongThucTe !== d.soLuong },
          { text: tienO(d.donGia), alignment: 'right' },
          { text: tienO(t), alignment: 'right' },
          { text: d.datKhongDat === 'dat' ? 'Đạt' : 'Không đạt', alignment: 'center' },
        ],
  );

  const cacDongTong: TableCell[][] = cacDongTongNghiemThu(nt, tong).map(({ nhan, giaTri, dam }): TableCell[] => [
    { text: nhan, colSpan: 7, alignment: 'right', bold: dam },
    {}, {}, {}, {}, {}, {},
    { text: tienO(giaTri), alignment: 'right', bold: dam },
    '',
  ]);
  const canCu = canCuNghiemThu(nt, bg);

  const noiDung: Content[] = loc<Content>([
    dauTrang(cd),
    { text: 'BIÊN BẢN NGHIỆM THU', style: 'tieuDe', margin: [0, 14, 0, 0] },
    nt.tieuDe ? { text: `(V/v: ${nt.tieuDe})`, style: 'phuDe', italics: false } : null,
    { text: `Số: ${nt.soBienBan}`, style: 'phuDe', margin: [0, 2, 0, 10] },
    { ul: canCu, margin: [6, 0, 0, 6] },
    {
      text: `Hôm nay, ${ngayThangNam(nt.ngayNghiemThu)}, tại ${nt.diaDiem || CHAM}, chúng tôi gồm:`,
      margin: [0, 0, 0, 2],
    },

    { text: ['BÊN A (Bên giao việc): ', { text: (kh?.tenCongTy || CHAM).toUpperCase() }], style: 'muc' },
    dongThongTin('- Địa chỉ', kh?.diaChi),
    mstVaDienThoai(kh?.maSoThue, kh?.soDienThoai),
    ...daiDien(nt.thanhPhanBenA),

    { text: ['BÊN B (Bên nhận việc): ', { text: cd.tenDonVi.toUpperCase() }], style: 'muc' },
    dongThongTin('- Địa chỉ', cd.diaChi),
    mstVaDienThoai(cd.maSoThue, cd.dienThoai),
    ...daiDien(nt.thanhPhanBenB),

    { text: 'Hai bên cùng tiến hành nghiệm thu khối lượng công việc như sau:', margin: [0, 8, 0, 6] },
    {
      table: {
        headerRows: 1,
        dontBreakRows: true,
        widths: [18, '*', 84, 26, 32, 32, 50, 58, 40],
        body: [dauBang, ...cacDong, ...cacDongTong],
      },
      layout: KIEU_BANG,
      fontSize: 9,
    },
    { text: [{ text: 'Bằng chữ: ', bold: true }, docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu }) + '.'], italics: true, margin: [0, 6, 0, 0] },
    { text: 'KẾT LUẬN:', style: 'muc' },
    { text: nt.ketLuan || CHAM, alignment: 'justify' },
    {
      // Gộp câu cuối với chữ ký để trang chữ ký không bao giờ đứng trơ trọi
      stack: [
        { text: CAU_KET_NGHIEM_THU },
        {
          columns: [
            { width: '*', ...(khoiKy('ĐẠI DIỆN BÊN A', '', nt.thanhPhanBenA[0]?.hoTen ?? '', 44) as object) },
            { width: '*', ...(khoiKy('ĐẠI DIỆN BÊN B', '', nt.thanhPhanBenB[0]?.hoTen ?? '', 44) as object) },
          ],
          margin: [0, 12, 0, 0],
        },
      ],
      margin: [0, 6, 0, 0],
      unbreakable: true,
    } as Content,
    ...phuLucAnh(nt, anh),
  ]);

  return {
    ...KHUNG_TRANG,
    // Biên bản nhiều mục hơn báo giá nên chữ nhỏ hơn một chút để vừa 1 trang khi ít hạng mục
    defaultStyle: { font: 'Roboto', fontSize: 10.5, lineHeight: 1.15 },
    info: { title: `Biên bản nghiệm thu ${nt.soBienBan}`, author: cd.tenDonVi },
    content: noiDung,
  };
}

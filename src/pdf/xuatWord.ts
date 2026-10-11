/**
 * Xuất báo giá / biên bản nghiệm thu ra Word (.docx), bố cục giống bản PDF.
 * Thư viện docx chỉ tải khi bấm "Word" lần đầu.
 */
import type { AnhDinhKem, BaoGia, BienBanNghiemThu, CaiDat, DongHangMuc, KhachHang, NguoiDaiDien } from '../db/kieu';
import { dinhDangNgay, dinhDangSoLuong, ngayThangNam } from '../lib/dinhDang';
import { docTienBangChu } from '../lib/docSo';
import { caiDatHienThi } from '../lib/hienThiXuong';
import { danhSo } from '../lib/phanMuc';
import { thanhTienBaoGia, thanhTienNghiemThu, tongBaoGia, tongNghiemThu } from '../lib/tinhTien';
import { NEN_PHAN, tienO } from './mauChung';
import {
  CAU_CHAO_BAO_GIA,
  CAU_KET_BAO_GIA,
  CAU_KET_NGHIEM_THU,
  CHAM,
  cacDongTongBaoGia,
  cacDongTongNghiemThu,
  canCuNghiemThu,
  dieuKhoanBaoGia,
  dongCoNoiDung,
  nguoiLienHe,
  tenKemGhiChu,
} from './noiDung';

type Docx = typeof import('docx');
let docxDangTai: Promise<Docx> | null = null;
const layDocx = () => (docxDangTai ??= import('docx'));

const LOAI_WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/* A4 dọc, lề 15 mm — đơn vị twip (1/20 pt) */
const RONG_A4 = 11906;
const CAO_A4 = 16838;
const LE = 850;
const RONG_ND = RONG_A4 - 2 * LE;
/** Cỡ chữ theo nửa point: 24 = 12pt */
const CO = 24;
const CO_BANG = 20;
/** Bề rộng vùng in của bản PDF (pt) — dùng để chia cột bảng theo đúng tỉ lệ bản PDF */
const RONG_PDF = 511;

/** Chia bề rộng cột theo tỉ lệ bản PDF; `null` là cột giãn lấy phần còn lại */
function chiaCot(pdf: (number | null)[]): number[] {
  const conLai = RONG_PDF - pdf.reduce<number>((t, w) => t + (w ?? 0), 0);
  const kq = pdf.map((w) => Math.round(((w ?? conLai) / RONG_PDF) * RONG_ND));
  kq[kq.length - 1] += RONG_ND - kq.reduce((a, b) => a + b, 0);
  return kq;
}

const duLieuAnh = (dataUrl: string) => Uint8Array.from(atob(dataUrl.split(',')[1] ?? ''), (c) => c.charCodeAt(0));

/** Kích thước ảnh (px) thu nhỏ cho vừa khung, giữ tỉ lệ */
async function vuaKhung(dataUrl: string, rong: number, cao: number) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const tyLe = Math.min(rong / img.naturalWidth, cao / img.naturalHeight, 1);
  return { width: Math.round(img.naturalWidth * tyLe), height: Math.round(img.naturalHeight * tyLe) };
}

interface KieuChu {
  dam?: boolean;
  nghieng?: boolean;
  co?: number;
  mau?: string;
  gachChan?: boolean;
}
type Chu = string | ({ text: string } & KieuChu);
interface KieuDoan extends KieuChu {
  canh?: 'trai' | 'giua' | 'phai' | 'deu';
  truoc?: number;
  sau?: number;
  gach?: boolean;
  vienDuoi?: boolean;
  sangTrang?: boolean;
}

/** Một ô của bảng hạng mục; `gop`: số cột gộp */
interface OHangMuc {
  chu: string;
  canh?: KieuDoan['canh'];
  dam?: boolean;
  gop?: number;
  nen?: string;
}

/**
 * Các dòng bảng hạng mục: dòng phần (I, II…) in đậm nền xám nhạt, tên gộp hết các cột còn lại;
 * hạng mục thì dựng bằng `oHang`. `soCot`: tổng số cột.
 */
function dongBangWord<D extends DongHangMuc>(
  ds: D[],
  tien: (d: D) => number,
  soCot: number,
  oHang: (d: D, stt: string, tien: number) => OHangMuc[],
): OHangMuc[][] {
  const nen = NEN_PHAN.slice(1);
  return danhSo(ds, tien).map(({ dong, laPhan, stt, tien: t }) =>
    laPhan
      ? [
          { chu: stt, canh: 'giua', dam: true, nen },
          { chu: dong.tenHangMuc, dam: true, nen, gop: soCot - 1 },
        ]
      : oHang(dong, stt, t),
  );
}

/** Bộ hàm dựng văn bản ngắn gọn trên thư viện docx */
function boDung(d: Docx) {
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, VerticalAlign, AlignmentType } = d;
  const KHONG = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const VIEN = { style: BorderStyle.SINGLE, size: 4, color: '444444' };
  const CANH = { trai: AlignmentType.LEFT, giua: AlignmentType.CENTER, phai: AlignmentType.RIGHT, deu: AlignmentType.JUSTIFIED };

  /** Chữ có "\n" thì xuống dòng trong cùng đoạn */
  const chu = (text: string, k: KieuChu) =>
    text.split('\n').map(
      (t, i) =>
        new TextRun({
          text: t,
          break: i ? 1 : undefined,
          bold: k.dam,
          italics: k.nghieng,
          size: k.co,
          color: k.mau,
          underline: k.gachChan ? {} : undefined,
        }),
    );

  const doan = (noiDung: Chu | Chu[], k: KieuDoan = {}) =>
    new d.Paragraph({
      alignment: CANH[k.canh ?? 'trai'],
      spacing: { before: k.truoc ?? 0, after: k.sau ?? 60 },
      bullet: k.gach ? { level: 0 } : undefined,
      pageBreakBefore: k.sangTrang,
      border: k.vienDuoi ? { bottom: { style: BorderStyle.SINGLE, size: 8, color: '333333', space: 4 } } : undefined,
      children: (Array.isArray(noiDung) ? noiDung : [noiDung]).flatMap((x) =>
        typeof x === 'string' ? chu(x, k) : chu(x.text, { ...k, ...x }),
      ),
    });

  type Noi = InstanceType<typeof Paragraph> | InstanceType<typeof Table>;
  const o = (
    noiDung: Noi[] | Chu | Chu[],
    k: KieuDoan & { rong: number; gop?: number; nen?: string } = { rong: 0 },
  ) =>
    new TableCell({
      width: { size: k.rong, type: WidthType.DXA },
      columnSpan: k.gop,
      shading: k.nen ? { fill: k.nen, type: ShadingType.CLEAR, color: 'auto' } : undefined,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      children:
        Array.isArray(noiDung) && (noiDung[0] instanceof Paragraph || noiDung[0] instanceof Table)
          ? (noiDung as Noi[])
          : [doan(noiDung as Chu | Chu[], { sau: 0, ...k })],
    });

  const bang = (rongCot: number[], hang: InstanceType<typeof TableCell>[][], k: { vien?: boolean; dauBang?: boolean } = {}) =>
    new Table({
      width: { size: rongCot.reduce((a, b) => a + b, 0), type: WidthType.DXA },
      columnWidths: rongCot,
      borders: k.vien
        ? { top: VIEN, bottom: VIEN, left: VIEN, right: VIEN, insideHorizontal: VIEN, insideVertical: VIEN }
        : { top: KHONG, bottom: KHONG, left: KHONG, right: KHONG, insideHorizontal: KHONG, insideVertical: KHONG },
      rows: hang.map((cacO, i) => new TableRow({ children: cacO, cantSplit: true, tableHeader: k.dauBang && i === 0 })),
    });

  /** Khối chữ ký: tiêu đề, chức vụ, (Ký, ghi rõ họ tên), chỗ ký, họ tên */
  const khoiKy = (tieuDe: string, chucVu: string, hoTen: string) => [
    doan(tieuDe, { canh: 'giua', dam: true, sau: 0 }),
    ...(chucVu ? [doan(chucVu, { canh: 'giua', sau: 0 })] : []),
    doan('(Ký, ghi rõ họ tên)', { canh: 'giua', nghieng: true, co: 20, sau: 1100 }),
    doan(hoTen || ' ', { canh: 'giua', dam: true }),
  ];

  /** Bảng hạng mục: hàng tiêu đề xám, các dòng (ô có `gop` thì gộp nhiều cột), các dòng tổng gộp ô bên trái */
  const bangHangMuc = (
    rongCot: number[],
    tieuDe: string[],
    cacDong: OHangMuc[][],
    cacDongTong: { nhan: string; giaTri: number; dam?: boolean }[],
    cotTien: number,
  ) => {
    const gop = rongCot.slice(0, cotTien).reduce((a, b) => a + b, 0);
    const sauTien = rongCot.slice(cotTien + 1);
    return bang(
      rongCot,
      [
        tieuDe.map((t, i) => o(t, { rong: rongCot[i], canh: 'giua', dam: true, nen: 'E8E8E8', co: CO_BANG - 1 })),
        ...cacDong.map((dong) => {
          let cot = 0;
          return dong.map((x) => {
            const rong = rongCot.slice(cot, cot + (x.gop ?? 1)).reduce((a, b) => a + b, 0);
            cot += x.gop ?? 1;
            return o(x.chu, { rong, gop: x.gop, canh: x.canh, dam: x.dam, nen: x.nen, co: CO_BANG });
          });
        }),
        ...cacDongTong.map((t) => [
          o(t.nhan, { rong: gop, gop: cotTien, canh: 'phai', dam: t.dam, co: CO_BANG }),
          o(tienO(t.giaTri), { rong: rongCot[cotTien], canh: 'phai', dam: t.dam, co: CO_BANG }),
          ...sauTien.map((r) => o('', { rong: r })),
        ]),
      ],
      { vien: true, dauBang: true },
    );
  };

  return { doan, o, bang, khoiKy, bangHangMuc };
}

async function dongGoi(d: Docx, tieuDe: string, tacGia: string, noiDung: unknown[]): Promise<Blob> {
  const doc = new d.Document({
    title: tieuDe,
    creator: tacGia,
    styles: { default: { document: { run: { font: 'Times New Roman', size: CO } } } },
    sections: [
      {
        properties: { page: { size: { width: RONG_A4, height: CAO_A4 }, margin: { top: 800, bottom: 900, left: LE, right: LE } } },
        footers: {
          default: new d.Footer({
            children: [
              new d.Paragraph({
                alignment: d.AlignmentType.CENTER,
                children: [new d.TextRun({ children: ['Trang ', d.PageNumber.CURRENT, '/', d.PageNumber.TOTAL_PAGES], size: 18, color: '555555' })],
              }),
            ],
          }),
        },
        children: noiDung as never[],
      },
    ],
  });
  const blob = await d.Packer.toBlob(doc);
  return new Blob([blob], { type: LOAI_WORD });
}

/* ================= Báo giá ================= */

export async function wordBaoGia(bg: BaoGia, kh: KhachHang | undefined, caiDat: CaiDat): Promise<Blob> {
  const d = await layDocx();
  const { doan, o, bang, khoiKy, bangHangMuc } = boDung(d);
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(bg.danhSachDong);
  const tien = thanhTienBaoGia;
  const tong = tongBaoGia(bg);

  // Đầu trang: logo (nếu có) + thông tin xưởng
  const thongTin = [
    doan(cd.tenDonVi.toUpperCase(), { dam: true, co: 28, mau: '0B3D6B', sau: 40 }),
    ...[
      ['Địa chỉ', cd.diaChi],
      ['Mã số thuế', cd.maSoThue],
      ['Điện thoại', cd.dienThoai],
      ['Email', cd.email],
    ]
      .filter(([, v]) => v?.trim())
      .map(([nhan, v]) => doan(`${nhan}: ${v}`, { sau: 20 })),
  ];
  const dauTrang = cd.logo
    ? bang([1800, RONG_ND - 1800], [
        [
          o([new d.Paragraph({ children: [new d.ImageRun({ type: 'png', data: duLieuAnh(cd.logo), transformation: await vuaKhung(cd.logo, 100, 100) })] })], { rong: 1800 }),
          o(thongTin, { rong: RONG_ND - 1800 }),
        ],
      ])
    : null;

  const cot = chiaCot([24, null, 92, 34, 46, 64, 74]);
  const dieuKhoan = dieuKhoanBaoGia(bg, cd);

  const noiDung = [
    ...(dauTrang ? [dauTrang] : thongTin),
    doan('', { vienDuoi: true, sau: 120 }),
    doan('BẢNG BÁO GIÁ', { canh: 'giua', dam: true, co: 36, truoc: 120, sau: 40 }),
    doan(`Số: ${bg.soBaoGia}   –   Ngày: ${dinhDangNgay(bg.ngayLap)}`, { canh: 'giua', nghieng: true, sau: 200 }),
    doan(['Kính gửi: ', { text: kh?.tenCongTy || '.......................................', dam: true }]),
    ...(nguoiLienHe(kh) ? [doan(nguoiLienHe(kh))] : []),
    ...(kh?.diaChi ? [doan(`Địa chỉ: ${kh.diaChi}`)] : []),
    ...(bg.tieuDe ? [doan(`Về việc: ${bg.tieuDe}`)] : []),
    doan(CAU_CHAO_BAO_GIA(cd.tenDonVi), { truoc: 120, sau: 120 }),
    bangHangMuc(
      cot,
      ['STT', 'Tên hàng hoá / dịch vụ', 'Quy cách', 'ĐVT', 'Số lượng', 'Đơn giá (đ)', 'Thành tiền (đ)'],
      dongBangWord(dong, tien, 7, (x, stt, t) => [
        { chu: stt, canh: 'giua' },
        { chu: tenKemGhiChu(x) },
        { chu: x.quyCach },
        { chu: x.donViTinh, canh: 'giua' },
        { chu: dinhDangSoLuong(x.soLuong), canh: 'phai' },
        { chu: tienO(x.donGia), canh: 'phai' },
        { chu: tienO(t), canh: 'phai' },
      ]),
      cacDongTongBaoGia(bg, tong),
      6,
    ),
    doan([{ text: 'Bằng chữ: ', dam: true }, `${docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu })}.`], { nghieng: true, truoc: 120 }),
    ...(dieuKhoan.length
      ? [doan('ĐIỀU KHOẢN', { dam: true, truoc: 160, sau: 60 }), ...dieuKhoan.map((x) => doan(x, { gach: true, sau: 40 }))]
      : []),
    doan(CAU_KET_BAO_GIA, { nghieng: true, truoc: 160 }),
    bang([RONG_ND - 5000, 5000], [
      [o('', { rong: RONG_ND - 5000 }), o(khoiKy(`ĐẠI DIỆN ${cd.tenDonVi.toUpperCase()}`, cd.chucVu, cd.nguoiDaiDien), { rong: 5000 })],
    ]),
  ];
  return dongGoi(d, `Báo giá ${bg.soBaoGia}`, cd.tenDonVi, noiDung);
}

/* ================= Biên bản nghiệm thu ================= */

export async function wordNghiemThu(
  nt: BienBanNghiemThu,
  kh: KhachHang | undefined,
  bg: BaoGia | undefined,
  anh: AnhDinhKem[],
  caiDat: CaiDat,
): Promise<Blob> {
  const d = await layDocx();
  const { doan, o, bang, khoiKy, bangHangMuc } = boDung(d);
  const cd = caiDatHienThi(caiDat);
  const dong = dongCoNoiDung(nt.danhSachDong);
  const tien = thanhTienNghiemThu;
  const tong = tongNghiemThu(nt);
  const nua = RONG_ND / 2;

  const dauTrang = bang([4000, RONG_ND - 4000], [
    [
      o([doan(cd.tenDonVi.toUpperCase(), { canh: 'giua', dam: true, co: 21, sau: 0 })], { rong: 4000 }),
      o(
        [
          doan('CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', { canh: 'giua', dam: true, co: 22, sau: 0 }),
          doan('Độc lập – Tự do – Hạnh phúc', { canh: 'giua', dam: true, gachChan: true, sau: 0 }),
        ],
        { rong: RONG_ND - 4000 },
      ),
    ],
  ]);

  /** Một người ghi trên 1 dòng; nhiều người thì "Đại diện gồm:" rồi liệt kê */
  const daiDien = (ds: NguoiDaiDien[]) => {
    const coTen = ds.filter((n) => n.hoTen.trim() || n.chucVu.trim());
    const hienThi = coTen.length ? coTen : [{ hoTen: '', chucVu: '' }];
    const hang = (n: NguoiDaiDien, nhan: string) => [
      o(`${nhan}${n.hoTen || CHAM}`, { rong: Math.round(RONG_ND * 0.55), canh: 'trai' }),
      o(`Chức vụ: ${n.chucVu || '....................'}`, { rong: RONG_ND - Math.round(RONG_ND * 0.55) }),
    ];
    const cot = [Math.round(RONG_ND * 0.55), RONG_ND - Math.round(RONG_ND * 0.55)];
    if (hienThi.length === 1) return [bang(cot, [hang(hienThi[0], '- Đại diện: Ông/Bà ')])];
    return [doan('- Đại diện gồm:', { sau: 0 }), bang(cot, hienThi.map((n) => hang(n, '   + Ông/Bà ')))];
  };
  const mstDt = (mst?: string, dt?: string) => {
    const phan = [mst?.trim() && `Mã số thuế: ${mst}`, dt?.trim() && `Điện thoại: ${dt}`].filter(Boolean);
    return phan.length ? [doan(`- ${phan.join('     ')}`, { sau: 20 })] : [];
  };

  // Phụ lục ảnh: 2 ảnh một hàng
  const phuLuc = [];
  if (anh.length) {
    const rongAnh = Math.floor(nua / 15) - 20; // twip → px (≈ 15 twip/px), chừa lề ô
    const oAnh = async (a: AnhDinhKem | undefined, i: number) =>
      a
        ? o(
            [
              new d.Paragraph({
                alignment: d.AlignmentType.CENTER,
                children: [new d.ImageRun({ type: 'jpg', data: duLieuAnh(a.duLieu), transformation: await vuaKhung(a.duLieu, rongAnh, 300) })],
              }),
              doan(`Hình ${i + 1}${a.ghiChu ? `: ${a.ghiChu}` : ''}`, { canh: 'giua', nghieng: true, co: 20, sau: 160 }),
            ],
            { rong: nua },
          )
        : o('', { rong: nua });
    const hang = [];
    for (let i = 0; i < anh.length; i += 2) hang.push([await oAnh(anh[i], i), await oAnh(anh[i + 1], i + 1)]);
    phuLuc.push(
      doan('PHỤ LỤC: HÌNH ẢNH NGHIỆM THU', { canh: 'giua', dam: true, co: 30, sangTrang: true, sau: 40 }),
      doan(`(Kèm theo Biên bản nghiệm thu số ${nt.soBienBan} ${ngayThangNam(nt.ngayNghiemThu)})`, { canh: 'giua', nghieng: true, sau: 200 }),
      bang([nua, RONG_ND - nua], hang),
    );
  }

  const noiDung = [
    dauTrang,
    doan('BIÊN BẢN NGHIỆM THU', { canh: 'giua', dam: true, co: 36, truoc: 280, sau: 0 }),
    ...(nt.tieuDe ? [doan(`(V/v: ${nt.tieuDe})`, { canh: 'giua', sau: 0 })] : []),
    doan(`Số: ${nt.soBienBan}`, { canh: 'giua', nghieng: true, truoc: 40, sau: 200 }),
    ...canCuNghiemThu(nt, bg).map((x) => doan(x, { gach: true, sau: 20 })),
    doan(`Hôm nay, ${ngayThangNam(nt.ngayNghiemThu)}, tại ${nt.diaDiem || CHAM}, chúng tôi gồm:`, { truoc: 80 }),

    doan(['BÊN A (Bên giao việc): ', (kh?.tenCongTy || CHAM).toUpperCase()], { dam: true, truoc: 120, sau: 40 }),
    ...(kh?.diaChi ? [doan(`- Địa chỉ: ${kh.diaChi}`, { sau: 20 })] : []),
    ...mstDt(kh?.maSoThue, kh?.soDienThoai),
    ...daiDien(nt.thanhPhanBenA),

    doan(['BÊN B (Bên nhận việc): ', cd.tenDonVi.toUpperCase()], { dam: true, truoc: 120, sau: 40 }),
    ...(cd.diaChi ? [doan(`- Địa chỉ: ${cd.diaChi}`, { sau: 20 })] : []),
    ...mstDt(cd.maSoThue, cd.dienThoai),
    ...daiDien(nt.thanhPhanBenB),

    doan('Hai bên cùng tiến hành nghiệm thu khối lượng công việc như sau:', { truoc: 160, sau: 120 }),
    bangHangMuc(
      chiaCot([18, null, 84, 26, 32, 32, 50, 58]),
      ['STT', 'Hạng mục', 'Quy cách', 'ĐVT', 'SL theo báo giá', 'SL thực tế', 'Đơn giá (đ)', 'Thành tiền (đ)'],
      dongBangWord(dong, tien, 8, (x, stt, t) => [
        { chu: stt, canh: 'giua' },
        { chu: tenKemGhiChu(x) },
        { chu: x.quyCach },
        { chu: x.donViTinh, canh: 'giua' },
        { chu: dinhDangSoLuong(x.soLuong), canh: 'phai' },
        { chu: dinhDangSoLuong(x.soLuongThucTe), canh: 'phai', dam: x.soLuongThucTe !== x.soLuong },
        { chu: tienO(x.donGia), canh: 'phai' },
        { chu: tienO(t), canh: 'phai' },
      ]),
      cacDongTongNghiemThu(nt, tong),
      7,
    ),
    doan([{ text: 'Bằng chữ: ', dam: true }, `${docTienBangChu(tong.tongThanhToan, { dungTu: cd.docSoTu })}.`], { nghieng: true, truoc: 120 }),
    doan('KẾT LUẬN:', { dam: true, truoc: 160, sau: 40 }),
    doan(nt.ketLuan || CHAM, { canh: 'deu' }),
    doan(CAU_KET_NGHIEM_THU, { truoc: 80, sau: 200 }),
    bang([nua, RONG_ND - nua], [
      [
        o(khoiKy('ĐẠI DIỆN BÊN A', '', nt.thanhPhanBenA[0]?.hoTen ?? ''), { rong: nua }),
        o(khoiKy('ĐẠI DIỆN BÊN B', '', nt.thanhPhanBenB[0]?.hoTen ?? ''), { rong: RONG_ND - nua }),
      ],
    ]),
    ...phuLuc,
  ];
  return dongGoi(d, `Biên bản nghiệm thu ${nt.soBienBan}`, cd.tenDonVi, noiDung);
}

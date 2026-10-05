/**
 * Logic cột của bảng nhập hạng mục. Bản thân các cột (tiêu đề, chữ gợi ý, thứ tự, ẩn/hiện, bề rộng…) là dữ liệu
 * trong DB — bảng cot_hang_muc, dữ liệu ban đầu ở prisma/seed.ts — ở đây chỉ kiểm tra dữ liệu và tính bố cục.
 */
import type { CotHangMuc, TruongDong } from '../db/kieu';

/** Khớp enum TruongDong trong schema.prisma */
const DS_TRUONG: readonly TruongDong[] = ['tenHangMuc', 'quyCach', 'donViTinh', 'soLuong', 'donGia', 'thanhTien'];
const laTruongDong = (x: unknown): x is TruongDong => DS_TRUONG.includes(x as TruongDong);

const DAI_TOI_DA = 80;
/** Độ dài tối đa của giá trị một ô trong cột tự thêm */
const DAI_GIA_TRI_TOI_DA = 500;
/** Bề rộng tối thiểu (px) cho phép của một cột khi bảng xếp một dòng */
const RONG_NHO_NHAT = 40;
const RONG_LON_NHAT = 600;

const chuoi = (x: unknown, dai = DAI_TOI_DA) => (typeof x === 'string' ? x.slice(0, dai) : '');
const soTrongKhoang = (x: unknown, min: number, max: number, macDinh: number) => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : macDinh;
};

/** Kiểm tra một cột gửi lên (từ Cài đặt, file sao lưu…); thiếu id thì bỏ. */
function chuanHoaCot(x: unknown, thuTu: number): CotHangMuc | null {
  if (!x || typeof x !== 'object') return null;
  const v = x as Partial<CotHangMuc>;
  const id = chuoi(v.id, 64).trim();
  if (!id) return null;
  return {
    id,
    truong: laTruongDong(v.truong) ? v.truong : null,
    tieuDe: chuoi(v.tieuDe),
    goiY: chuoi(v.goiY),
    kieu: v.kieu === 'so' ? 'so' : 'chu',
    batBuoc: Boolean(v.batBuoc),
    // Cột bắt buộc thì không ẩn được
    an: Boolean(v.an) && !v.batBuoc,
    doRong: Math.round(soTrongKhoang(v.doRong, RONG_NHO_NHAT, RONG_LON_NHAT, 110)),
    heSoGian: soTrongKhoang(v.heSoGian, 0, 10, 0),
    thuTu,
  };
}

/** Danh sách cột hợp lệ: bỏ cột hỏng / trùng id / trùng trường, đánh lại thứ tự theo vị trí. */
export function chuanHoaDsCot(x: unknown): CotHangMuc[] {
  const kq: CotHangMuc[] = [];
  const daCoId = new Set<string>();
  const daCoTruong = new Set<TruongDong>();
  for (const raw of Array.isArray(x) ? x : []) {
    const c = chuanHoaCot(raw, kq.length);
    if (!c || daCoId.has(c.id) || (c.truong && daCoTruong.has(c.truong))) continue;
    daCoId.add(c.id);
    if (c.truong) daCoTruong.add(c.truong);
    kq.push(c);
  }
  return kq;
}

/** Bề rộng mặc định của cột tự thêm mới theo kiểu: cột chữ được giãn, cột số giữ hẹp */
export const beRongCotMoi = (kieu: CotHangMuc['kieu']): Pick<CotHangMuc, 'doRong' | 'heSoGian'> =>
  kieu === 'so' ? { doRong: 96, heSoGian: 0 } : { doRong: 110, heSoGian: 1 };

/** Giá trị các cột tự thêm của một dòng: chỉ giữ chuỗi, cắt bớt nếu quá dài. */
export function chuanHoaGiaTriCotThem(x: unknown): Record<string, string> {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return {};
  const kq: Record<string, string> = {};
  for (const [k, v] of Object.entries(x).slice(0, 50)) {
    if (typeof v === 'string' && v) kq[k.slice(0, 64)] = v.slice(0, DAI_GIA_TRI_TOI_DA);
  }
  return kq;
}

/* ---------- Bố cục lưới ---------- */

/** Khớp với CSS (.dang-bang): cột tay nắm + số thứ tự, cột nút ⋯, khoảng cách giữa các cột, lề trái + phải một dòng */
const RONG_DAU = 72;
const RONG_TAC = 44;
const KHOANG_COT = 8;
const LE_DONG = 20;
/** Ô hẹp hơn mức này thì dạng thẻ được ghép chung hàng với ô hẹp kề bên */
const HEP_DIEN_THOAI = 100;
const HEP_MAY_TINH_BANG = 150;

export interface CotHienThi extends CotHangMuc {
  /** Tên vùng lưới (grid-area) của cột */
  vung: string;
}

/** Các cột đang hiện, theo thứ tự */
export const cotDangHien = (ds: CotHangMuc[]): CotHienThi[] =>
  [...ds]
    .sort((a, b) => a.thuTu - b.thuTu)
    .filter((c) => !c.an)
    .map((c, i) => ({ ...c, vung: `c${i}` }));

const hang = (...o: string[]) => `'${o.join(' ')}'`;
const coDinhRong = (c: CotHangMuc) => c.heSoGian <= 0;

/**
 * Xếp các cột thành hàng cho dạng thẻ: mỗi cột một hàng, riêng các ô hẹp nằm kề nhau thì ghép chung hàng.
 * `mau[n]` là cách chia `soCot` cột lưới cho nhóm n ô (vd. 2 ô trên lưới 3 cột: ô đầu 1 phần, ô sau 2 phần).
 */
function xepThe(cot: CotHienThi[], soCot: number, hep: (c: CotHienThi) => boolean, mau: number[][]): string[] {
  const kq: string[] = [];
  let nhom: CotHienThi[] = [];
  const dong = () => {
    if (!nhom.length) return;
    const chia = mau[nhom.length];
    kq.push(hang(...nhom.flatMap((c, i) => Array<string>(chia[i]).fill(c.vung))));
    nhom = [];
  };
  for (const c of cot) {
    if (hep(c)) {
      nhom.push(c);
      if (nhom.length === soCot) dong();
    } else {
      dong();
      kq.push(hang(...Array<string>(soCot).fill(c.vung)));
    }
  }
  dong();
  return kq;
}

/**
 * Bố cục lưới của một dòng hạng mục theo các cột đang hiện — cột bị ẩn thì các cột còn lại tự giãn ra.
 * Trả về biến CSS cho điện thoại (2 cột), máy tính bảng (3 cột), dạng bảng; và bề rộng tối thiểu để xếp thành bảng.
 */
export function boCucBang(ds: CotHangMuc[]): { bien: Record<string, string>; rongToiThieu: number } {
  const hien = cotDangHien(ds);
  /** Các vùng trải hết bề ngang dưới các cột: chi tiết (gạch đầu dòng), phần thêm của nghiệm thu, ghi chú, nút lưu danh mục */
  const VUNG_CUOI = ['chitiet', 'them', 'ghichu', 'luu'];
  const cuoi = (n: number) => VUNG_CUOI.map((v) => hang(...Array<string>(n).fill(v)));

  const dienThoai = [
    hang('dau', 'dau'),
    ...xepThe(hien, 2, (c) => coDinhRong(c) && c.doRong <= HEP_DIEN_THOAI, [[], [2], [1, 1]]),
    ...cuoi(2),
  ];
  const mayTinhBang = [
    hang('dau', 'dau', 'dau'),
    ...xepThe(hien, 3, (c) => coDinhRong(c) && c.doRong <= HEP_MAY_TINH_BANG, [[], [3], [1, 2], [1, 1, 1]]),
    ...cuoi(3),
  ];

  const giua = Array<string>(hien.length);
  const bang = [
    hang('dau', ...hien.map((c) => c.vung), 'tac'),
    ...VUNG_CUOI.map((v) => hang('.', ...giua.fill(v), '.')),
  ];
  const cotLuoi = hien.map((c) => (coDinhRong(c) ? `${c.doRong}px` : `minmax(${c.doRong}px, ${c.heSoGian}fr)`));

  return {
    bien: {
      '--vung-dien-thoai': dienThoai.join(' '),
      '--vung-may-tinh-bang': mayTinhBang.join(' '),
      '--vung-bang': bang.join(' '),
      '--cot-bang': [`${RONG_DAU}px`, ...cotLuoi, `${RONG_TAC}px`].join(' '),
    },
    rongToiThieu:
      RONG_DAU + RONG_TAC + hien.reduce((tong, c) => tong + c.doRong, 0) + KHOANG_COT * (hien.length + 1) + LE_DONG,
  };
}

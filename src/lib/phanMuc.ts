/**
 * Chia bảng hạng mục thành các phần (I, II…) và đánh số thứ tự — dùng chung cho màn hình nhập và mọi bản xuất.
 * Dòng phần là một dòng trong danh sách (loai = 'phan'); các hạng mục bên dưới, tới dòng phần kế tiếp, thuộc phần đó.
 */
import type { DongHangMuc } from '../db/kieu';

export const laDongPhan = (d: Pick<DongHangMuc, 'loai'>) => d.loai === 'phan';

/** Số La Mã: 1 → I, 4 → IV, 12 → XII */
export function soLaMa(n: number): string {
  const bang: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let con = Math.max(0, Math.floor(n));
  let kq = '';
  for (const [gt, ky] of bang) {
    while (con >= gt) {
      kq += ky;
      con -= gt;
    }
  }
  return kq;
}

/** Các dòng chi tiết có nội dung (bỏ dòng trống, khoảng trắng thừa) */
export const chiTietCoNoiDung = (d: Pick<DongHangMuc, 'chiTiet'>) =>
  (d.chiTiet ?? []).map((x) => x.trim()).filter(Boolean);

/**
 * Dòng chưa nhập gì: không tên, không đơn giá, không chi tiết. Định nghĩa duy nhất dùng cho:
 * bỏ dòng trống khi in / xuất, khi chuyển báo giá → nghiệm thu, khi xét chứng từ trống, khi hỏi xác nhận xoá dòng.
 */
export const laDongTrong = (d: Pick<DongHangMuc, 'tenHangMuc' | 'donGia' | 'chiTiet'>) =>
  !d.tenHangMuc.trim() && !d.donGia && !chiTietCoNoiDung(d).length;

export interface DongDanhSo<D> {
  dong: D;
  laPhan: boolean;
  /** Phần: I, II…; hạng mục: 1, 2, 3… (đánh lại từ 1 trong mỗi phần) */
  stt: string;
  /** Phần: cộng thành tiền các hạng mục thuộc phần; hạng mục: thành tiền của dòng */
  tien: number;
}

/** Đánh số từng dòng và cộng tiền từng phần. `tien`: thành tiền một hạng mục (báo giá theo SL, nghiệm thu theo SL thực tế). */
export function danhSo<D extends DongHangMuc>(ds: D[], tien: (d: D) => number): DongDanhSo<D>[] {
  let soPhan = 0;
  let soHang = 0;
  let phanHienTai: DongDanhSo<D> | null = null;
  return ds.map((dong) => {
    if (laDongPhan(dong)) {
      soHang = 0;
      phanHienTai = { dong, laPhan: true, stt: soLaMa(++soPhan), tien: 0 };
      return phanHienTai;
    }
    const t = tien(dong);
    if (phanHienTai) phanHienTai.tien += t;
    return { dong, laPhan: false, stt: String(++soHang), tien: t };
  });
}

/** Thành tiền các hạng mục (bỏ dòng phần) — đầu vào cho tinhTong */
export const cacThanhTien = <D extends Pick<DongHangMuc, 'loai'>>(ds: D[], tien: (d: D) => number) =>
  ds.filter((d) => !laDongPhan(d)).map(tien);

/** Số hạng mục (không đếm dòng phần) */
export const demHangMuc = (ds: Pick<DongHangMuc, 'loai'>[]) => ds.filter((d) => !laDongPhan(d)).length;

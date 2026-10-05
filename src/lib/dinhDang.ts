/** Định dạng kiểu Việt Nam: 1.250.000 đ, 01/10/2026, số lẻ dùng dấu phẩy (1,5). */

export function dinhDangSo(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const am = n < 0;
  const [nguyen, le] = Math.abs(n).toString().split('.');
  const coDau = nguyen.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (am ? '-' : '') + coDau + (le ? ',' + le : '');
}

/** Tiền: làm tròn đồng, có hậu tố " đ". */
export function dinhDangTien(n: number, hauTo = true): string {
  return dinhDangSo(Math.round(n)) + (hauTo ? ' đ' : '');
}

/** Số lượng: tối đa 3 chữ số thập phân, dấu phẩy thập phân. */
export function dinhDangSoLuong(n: number): string {
  return dinhDangSo(Math.round(n * 1000) / 1000);
}

/** Đọc chuỗi tiền người dùng gõ ("1.250.000", "1250000 đ") thành số nguyên. */
export function docChuoiTien(s: string): number {
  const chiSo = s.replace(/[^\d-]/g, '');
  const n = parseInt(chiSo, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Đọc số lượng kiểu Việt Nam: "1,5" hoặc "1.5" → 1.5; "1.000" → 1000. */
export function docChuoiSoLuong(s: string): number {
  let t = s.trim().replace(/\s/g, '');
  if (!t) return 0;
  if (t.includes(',')) {
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, '');
  }
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

const p2 = (n: number) => String(n).padStart(2, '0');

export function homNayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function congNgay(iso: string, soNgay: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + soNgay);
  return `${dt.getFullYear()}-${p2(dt.getMonth() + 1)}-${p2(dt.getDate())}`;
}

/** "2026-10-01" → "01/10/2026" */
export function dinhDangNgay(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** "2026-10-01" → "ngày 01 tháng 10 năm 2026" */
export function ngayThangNam(iso: string): string {
  if (!iso) return 'ngày ..... tháng ..... năm .........';
  const [y, m, d] = iso.split('-');
  return `ngày ${d} tháng ${m} năm ${y}`;
}

export function namCua(iso: string): number {
  return parseInt(iso.slice(0, 4), 10) || new Date().getFullYear();
}

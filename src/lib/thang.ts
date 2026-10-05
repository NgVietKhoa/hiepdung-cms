/** Tháng dạng "YYYY-MM" — dùng cho bảng chấm công, bảng lương, báo cáo theo tháng. */

const p2 = (n: number) => String(n).padStart(2, '0');

export const laThang = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

export function thangHienTai(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}

/** "2026-10", +1 → "2026-11"; -10 → "2025-12" */
export function congThang(thang: string, soThang: number): string {
  const [y, m] = thang.split('-').map(Number);
  const tong = y * 12 + (m - 1) + soThang;
  return `${Math.floor(tong / 12)}-${p2((tong % 12) + 1)}`;
}

export function soNgayTrongThang(thang: string): number {
  const [y, m] = thang.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Các ngày trong tháng dạng "YYYY-MM-DD" */
export function cacNgayTrongThang(thang: string): string[] {
  return Array.from({ length: soNgayTrongThang(thang) }, (_, i) => `${thang}-${p2(i + 1)}`);
}

/** Thứ trong tuần của ngày "YYYY-MM-DD": 0 = Chủ nhật … 6 = Thứ bảy */
export function thuCuaNgay(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const TEN_THU_NGAN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const TEN_THU = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/** "2026-10" → "Tháng 10/2026" */
export function tenThang(thang: string): string {
  const [y, m] = thang.split('-');
  return `Tháng ${m}/${y}`;
}

/** Ngày đầu tháng và ngày đầu tháng sau ("YYYY-MM-DD") — lọc [tu, den) */
export function khoangThang(thang: string): { tu: string; den: string } {
  return { tu: `${thang}-01`, den: `${congThang(thang, 1)}-01` };
}

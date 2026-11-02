/** Giao diện sáng / tối: lưu riêng từng máy (localStorage), áp bằng data-giao-dien trên <html> */
export type GiaoDien = 'sang' | 'toi' | 'heThong';

const KHOA_LUU = 'hiepDung:giaoDien';
const heThongToi = window.matchMedia('(prefers-color-scheme: dark)');

export function docGiaoDien(): GiaoDien {
  try {
    const raw = localStorage.getItem(KHOA_LUU);
    return raw === 'toi' || raw === 'heThong' ? raw : 'sang';
  } catch {
    return 'sang';
  }
}

export function apDungGiaoDien(g = docGiaoDien()) {
  const toi = g === 'toi' || (g === 'heThong' && heThongToi.matches);
  document.documentElement.dataset.giaoDien = toi ? 'toi' : 'sang';
}

export function luuGiaoDien(g: GiaoDien) {
  try {
    localStorage.setItem(KHOA_LUU, g);
  } catch {
    /* bỏ qua */
  }
  apDungGiaoDien(g);
}

// "Theo Windows": Windows đổi sáng / tối thì đổi theo ngay
heThongToi.addEventListener('change', () => apDungGiaoDien());

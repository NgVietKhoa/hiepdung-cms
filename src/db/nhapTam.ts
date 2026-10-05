/**
 * Bản nháp tạm trong localStorage: ghi ĐỒNG BỘ ngay mỗi lần sửa nên không mất khi đóng tab,
 * tắt trình duyệt, hết pin hay mất mạng giữa lúc máy chủ chưa kịp lưu.
 * Máy chủ lưu xong thì xoá bản tạm; lần mở ứng dụng sau sẽ gửi lại bản tạm còn sót.
 */
import { api, LoiApi } from './api';

const TIEN_TO = 'nhapTam:';
type TenBang = 'baoGia' | 'nghiemThu' | 'caiDat';

export const khoaNhapTam = (bang: TenBang, id: string) => `${TIEN_TO}${bang}:${id}`;

export function ghiNhapTam(khoa: string, banGhi: unknown): void {
  try {
    localStorage.setItem(khoa, JSON.stringify(banGhi));
  } catch {
    /* hết chỗ hoặc chế độ ẩn danh — vẫn còn lưu máy chủ */
  }
}

export function xoaNhapTam(khoa: string): void {
  try {
    localStorage.removeItem(khoa);
  } catch {
    /* bỏ qua */
  }
}

/** Gửi lại các bản nháp tạm chưa lưu được. Bản nào máy chủ chưa nhận (mất mạng) thì giữ để lần sau thử tiếp. */
export async function khoiPhucNhapTam(): Promise<number> {
  let cacKhoa: string[] = [];
  try {
    cacKhoa = Object.keys(localStorage).filter((k) => k.startsWith(TIEN_TO));
  } catch {
    return 0;
  }
  let soKhoiPhuc = 0;
  for (const khoa of cacKhoa) {
    try {
      const bang = khoa.slice(TIEN_TO.length).split(':')[0] as TenBang;
      const banGhi = JSON.parse(localStorage.getItem(khoa) ?? 'null');
      if (banGhi?.id) {
        // chiCapNhat: chứng từ đã bị xoá ở máy khác thì không tạo lại
        if (bang === 'baoGia') await api.baoGia.luu(banGhi, { chiCapNhat: true, baoThayDoi: false });
        else if (bang === 'nghiemThu') await api.nghiemThu.luu(banGhi, { chiCapNhat: true, baoThayDoi: false });
        else if (bang === 'caiDat') await api.caiDat.luu(banGhi);
        soKhoiPhuc++;
      }
      xoaNhapTam(khoa);
    } catch (e) {
      // Máy chủ từ chối hẳn (dữ liệu sai, trùng số…) thì bỏ; mất mạng / lỗi máy chủ thì giữ để thử lại
      const tuChoi = e instanceof LoiApi && e.trangThai >= 400 && e.trangThai < 500 && e.trangThai !== 401;
      if (tuChoi) xoaNhapTam(khoa);
      console.error('Chưa gửi lại được bản nháp tạm', khoa, e);
    }
  }
  return soKhoiPhuc;
}

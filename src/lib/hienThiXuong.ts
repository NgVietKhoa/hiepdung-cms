/**
 * Ẩn / hiện thông tin xưởng. Xưởng không dùng thông tin nào (vd. không có MST, không có tài khoản ngân hàng)
 * thì bỏ tích: ô nhập bị ẩn trong Cài đặt và thông tin đó KHÔNG in lên báo giá / biên bản
 * (kể cả khi trước đó đã nhập giá trị — giá trị vẫn được giữ, bật lại là có ngay).
 */
import type { CaiDat, TruongXuong } from '../db/kieu';

export const MUC_TUY_CHON: { khoa: TruongXuong; nhan: string; cot: (keyof CaiDat)[] }[] = [
  { khoa: 'logo', nhan: 'Logo', cot: ['logo'] },
  { khoa: 'diaChi', nhan: 'Địa chỉ', cot: ['diaChi'] },
  { khoa: 'maSoThue', nhan: 'Mã số thuế', cot: ['maSoThue'] },
  { khoa: 'dienThoai', nhan: 'Điện thoại', cot: ['dienThoai'] },
  { khoa: 'email', nhan: 'Email', cot: ['email'] },
  { khoa: 'nguoiDaiDien', nhan: 'Người đại diện', cot: ['nguoiDaiDien'] },
  { khoa: 'chucVu', nhan: 'Chức vụ', cot: ['chucVu'] },
  { khoa: 'taiKhoan', nhan: 'Tài khoản ngân hàng', cot: ['soTaiKhoan', 'nganHang', 'chiNhanh', 'chuTaiKhoan'] },
];

const TRUONG_XUONG: string[] = MUC_TUY_CHON.map((m) => m.khoa);

export const laTruongXuong = (x: unknown): x is TruongXuong => TRUONG_XUONG.includes(x as string);

export const dangHien = (cd: Pick<CaiDat, 'truongAn'>, khoa: TruongXuong) => !(cd.truongAn ?? []).includes(khoa);

/** Bản cài đặt dùng để in: thông tin đang ẩn được xoá trắng (mẫu văn bản tự bỏ dòng trống). */
export function caiDatHienThi(cd: CaiDat): CaiDat {
  const kq: Record<string, unknown> = { ...cd };
  for (const m of MUC_TUY_CHON) {
    if (!dangHien(cd, m.khoa)) for (const c of m.cot) kq[c] = '';
  }
  return kq as unknown as CaiDat;
}

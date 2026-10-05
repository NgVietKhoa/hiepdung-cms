/** Tải toàn bộ dữ liệu trên máy chủ về một file JSON, và khôi phục lại từ file đó. */
import { homNayISO } from '../lib/dinhDang';
import { taiFile } from '../pdf/xuat';
import { api } from './api';

export async function xuatSaoLuu(): Promise<void> {
  const blob = await api.baoTri.saoLuu();
  taiFile(new Blob([blob], { type: 'application/json' }), `SaoLuu_HiepDungCMS_${homNayISO()}.json`);
  // Chỉ ghi nhận "đã sao lưu" khi trình duyệt đã nhận đủ file
  await api.baoTri.daTaiSaoLuu();
}

/** Thay toàn bộ dữ liệu trên máy chủ bằng dữ liệu trong file (đọc được cả file sao lưu từ bản cũ chạy trên trình duyệt). */
export async function khoiPhucTuFile(file: File): Promise<{ soBaoGia: number; soNghiemThu: number }> {
  let duLieu: unknown;
  try {
    duLieu = JSON.parse(await file.text());
  } catch {
    throw new Error('File không đúng định dạng sao lưu.');
  }
  return api.baoTri.khoiPhuc(duLieu);
}

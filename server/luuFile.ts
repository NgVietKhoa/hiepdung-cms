/**
 * Lưu file xuất (PDF / Word / Excel) vào thư mục trên máy chạy ứng dụng — ứng dụng dùng nội bộ,
 * file nằm ngay trên máy thay vì trong thư mục Tải về của từng trình duyệt.
 * Thư mục đặt bằng THU_MUC_LUU_FILE trong .env (mặc định ./file).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { MOI_TRUONG } from './moiTruong';

const DUOI_CHO_PHEP = new Set(['pdf', 'docx', 'xlsx']);

export class LoiLuuFile extends Error {}

/** Chỉ giữ tên file (bỏ mọi đường dẫn), thay ký tự không hợp lệ trên Windows, kiểm tra đuôi */
export function tenFileAnToan(ten: unknown): string {
  const goc = basename(String(ten ?? '').replace(/\\/g, '/')).trim();
  const sach = goc
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 150);
  // Phải có phần tên trước dấu chấm cuối và đuôi nằm trong danh sách cho phép
  const khop = /^(.+)\.([a-z0-9]+)$/i.exec(sach);
  if (!khop || !khop[1].trim() || !DUOI_CHO_PHEP.has(khop[2].toLowerCase())) {
    throw new LoiLuuFile('Tên file không hợp lệ (chỉ nhận .pdf, .docx, .xlsx)');
  }
  return sach;
}

/** Ghi file (trùng tên thì ghi đè bằng bản mới nhất); trả về tên file và thư mục để báo cho người dùng */
export async function luuFile(ten: unknown, duLieu: Buffer): Promise<{ tenFile: string; thuMuc: string }> {
  const tenFile = tenFileAnToan(ten);
  if (!duLieu?.length) throw new LoiLuuFile('File rỗng');
  await mkdir(MOI_TRUONG.thuMucLuuFile, { recursive: true });
  await writeFile(join(MOI_TRUONG.thuMucLuuFile, tenFile), duLieu);
  return { tenFile, thuMuc: MOI_TRUONG.thuMucHienThi };
}

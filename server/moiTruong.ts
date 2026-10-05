/** Nạp biến môi trường từ .env (cho phép ${BIEN} trong giá trị). Trong Docker biến đã có sẵn. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const duongDan = resolve(process.cwd(), '.env');
if (existsSync(duongDan)) expand(dotenv.config({ path: duongDan }));

export const MOI_TRUONG = {
  // PORT: Docker đặt sẵn; API_PORT: chạy trực tiếp trên máy (npm run dev:api)
  cong: Number(process.env.PORT || process.env.API_PORT || 3000),
  biMat: process.env.APP_SECRET ?? '',
  /** Tài khoản quản trị đầu tiên do seed tạo khi DB chưa có tài khoản nào (APP_PASSWORD: tên cũ, vẫn nhận) */
  tenQuanTri: (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase(),
  matKhauQuanTri: process.env.ADMIN_PASSWORD || process.env.APP_PASSWORD || '',
  /** Tên miền của landing page được gọi API công khai (CORS), cách nhau dấu phẩy; trống = cho phép mọi nơi */
  nguonLanding: (process.env.LANDING_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  napDuLieuMau: (process.env.SEED_DU_LIEU_MAU ?? 'true').toLowerCase() === 'true',
  /** Nơi lưu file PDF / Word / Excel khi bấm "Lưu" (đường dẫn tương đối tính từ thư mục dự án) */
  thuMucLuuFile: resolve(process.cwd(), process.env.THU_MUC_LUU_FILE || 'file'),
  /** Đường dẫn báo cho người dùng — trong Docker là thư mục trên máy thật, không phải /app/file */
  thuMucHienThi:
    process.env.THU_MUC_LUU_FILE_TREN_MAY || resolve(process.cwd(), process.env.THU_MUC_LUU_FILE || 'file'),
};

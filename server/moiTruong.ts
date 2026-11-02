/** Nạp biến môi trường từ .env (cho phép ${BIEN} trong giá trị). Bản desktop truyền sẵn biến, không có .env. */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';

const duongDan = resolve(process.cwd(), '.env');
if (existsSync(duongDan)) expand(dotenv.config({ path: duongDan }));

export const MOI_TRUONG = {
  // PORT: bản desktop đặt sẵn; API_PORT: chạy trực tiếp trên máy (npm run dev:api)
  cong: Number(process.env.PORT || process.env.API_PORT || 3000),
  napDuLieuMau: (process.env.SEED_DU_LIEU_MAU ?? 'true').toLowerCase() === 'true',
  /** Nơi lưu file PDF / Word / Excel khi bấm "Lưu" (đường dẫn tương đối tính từ thư mục dự án) */
  thuMucLuuFile: resolve(process.cwd(), process.env.THU_MUC_LUU_FILE || 'file'),
};

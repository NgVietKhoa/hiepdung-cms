// Cấu hình Prisma CLI (migrate, studio…). Prisma 7 không tự đọc .env nên nạp ở đây,
// kèm dotenv-expand để DATABASE_URL ghép được từ ${POSTGRES_USER}, ${POSTGRES_PORT}…
import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { defineConfig, env } from 'prisma/config';

expand(dotenv.config({ quiet: true }));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  // Dữ liệu ban đầu: npm run db:seed
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/seed.ts' },
  datasource: { url: env('DATABASE_URL') },
});

import './moiTruong';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

// Prisma 7 kết nối qua driver adapter (thư viện pg), không còn engine nhị phân
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

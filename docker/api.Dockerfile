# Máy chủ API: Express + Prisma (chỉ thư viện chạy máy chủ, không có thư viện giao diện)
FROM node:20-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
COPY prisma.config.ts ./
# prisma.config.ts cần DATABASE_URL, nhưng "prisma generate" không kết nối DB nên dùng giá trị giả
RUN DATABASE_URL=postgresql://gia:gia@localhost:5432/gia npx prisma generate
COPY server ./server
# Máy chủ dùng chung logic thuần trong src/ (đọc số, tính tiền, dữ liệu mẫu...)
COPY src ./src
EXPOSE 3000
# Tự áp dụng migration, nạp dữ liệu ban đầu còn thiếu (prisma/seed.ts) rồi khởi động
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npx tsx server/index.ts"]

# ---------- Bước 1: build giao diện (React + Vite) ----------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.ts tsconfig.json ./
COPY public ./public
COPY src ./src
RUN npx tsc -b && npx vite build

# ---------- Bước 2: nginx phục vụ file tĩnh, chuyển /api sang container api ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

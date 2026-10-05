import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Cổng lấy từ .env: DEV_PORT (giao diện khi dev), API_PORT (máy chủ API)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const congApi = Number(env.API_PORT || 3000);
  return {
    // base './' để bản build đặt được ở thư mục con
    base: './',
    plugins: [react()],
    server: {
      port: Number(env.DEV_PORT || 5173),
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${congApi}` },
    },
    build: { chunkSizeWarningLimit: 3000 },
    test: { environment: 'node' },
  };
});

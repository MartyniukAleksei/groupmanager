import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Разрешает доступ извне контейнера
    port: 5173,
    watch: {
      usePolling: true, // ВАЖНО: заставляет Vite принудительно сканировать изменения
    },
  },
});

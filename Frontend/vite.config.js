import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
// })


export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,  // Optional, ensure it uses port 5173
    proxy: {
      '/api': {
        target: 'http://localhost:8000/api/upload-and-organize',  // FastAPI backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
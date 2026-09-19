import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue2'

export default defineConfig({
  // 相对路径，构建产物可以直接丢到任意目录/静态服务下打开
  base: './',
  plugins: [vue()],
  build: {
    rollupOptions: {
      // 两个入口：index.html 是组件文档，demo.html 是原来的方案对照页
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./demo.html', import.meta.url))
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  preview: {
    host: '127.0.0.1',
    port: 4173
  }
})

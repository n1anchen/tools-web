import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import { execSync } from 'child_process'
import { copyAssetsPlugin } from './scripts/vite-copy-assets-plugin.js'

// 获取 git 提交号（7 位）
let gitCommitHash = 'unknown'
try {
  gitCommitHash = execSync('git rev-parse --short HEAD').toString().trim()
} catch {}

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
  let env = loadEnv(mode, process.cwd())
  return {
    define: {  
      'process.env.NODE_ENV': JSON.stringify('production'),
      '__GIT_COMMIT__': JSON.stringify(gitCommitHash)
    },
    plugins: [
      vue(),
      createSvgIconsPlugin({
        // Specify the icon folder to be cached
        iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
        // Specify symbolId format
        symbolId: 'icon-[dir]-[name]',
      }),
      copyAssetsPlugin(),
      VitePWA({
        registerType: 'prompt',
        // 预缓存 public 目录下的静态资源
        includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png', 'fonts/**/*', 'images/**/*'],
        manifest: {
          name: '在线工具箱',
          short_name: '工具箱',
          description: '一个轻量的在线工具箱，集成了多种实用的小工具',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              // purpose 必须分开声明，不能合并为 "any maskable"
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            },
            {
              // favicon.ico 实际尺寸 48x48
              src: '/favicon.ico',
              sizes: '48x48',
              type: 'image/x-icon'
            }
          ],
          screenshots: [
            {
              src: '/screenshots/desktop.jpg',
              sizes: '1280x610',      // 按实际图片尺寸填写
              type: 'image/jpeg',
              form_factor: 'wide',    // 桌面端安装对话框使用
              label: '在线工具箱 - 桌面版'
            },
            {
              src: '/screenshots/mobile.jpg',
              sizes: '360x780',       // 按实际图片尺寸填写
              type: 'image/jpeg',
              form_factor: 'narrow',  // 移动端安装对话框使用
              label: '在线工具箱 - 移动版'
            }
          ],
        },
        workbox: {
          // 预缓存所有构建产物（带 hash 的 JS/CSS/HTML）
          globPatterns: ['**/*.{js,css,html}'],          // vendors chunk 约 2.1MB，调高上限至 5MB
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,          // index.html 使用 network-first，保证用户第一时间拿到最新页面入口
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              // loli.net 谷歌字体镜像（Choyen5000 / BlueArchive / PornhubLogo 工具依赖）
              urlPattern: /^https:\/\/fonts\.loli\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // loli.net 字体文件 CDN（gstatic 镜像）
              urlPattern: /^https:\/\/gstatic\.loli\.net\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              // public 目录下的图片和字体文件（.flf ASCII 字体等）
              urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|flf|woff2?|ttf|eot)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-assets',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] }
              }
            }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve("./src"),  //相对路径别名配置， 使用@替代src
        "v-code-diff": path.resolve("./node_modules/v-code-diff/dist/v3/index.es.js")
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // 将 Ace 编辑器相关的代码打包成单独的 chunk
            'ace-editor': [
              'ace-builds',
              'ace-builds/src-noconflict/mode-css',
              'ace-builds/src-noconflict/mode-javascript', 
              'ace-builds/src-noconflict/mode-html',
              'ace-builds/src-noconflict/mode-json',
              'ace-builds/src-noconflict/theme-monokai'
            ],
            // Ace 扩展单独打包
            'ace-extensions': [
              'ace-builds/src-noconflict/ext-language_tools',
              'ace-builds/src-noconflict/ext-searchbox',
              'ace-builds/src-noconflict/ext-error_marker',
              'ace-builds/src-noconflict/ext-whitespace',
              'ace-builds/src-noconflict/ext-beautify',
              'ace-builds/src-noconflict/ext-code_lens',
              'ace-builds/src-noconflict/ext-elastic_tabstops_lite'
            ],

            // 其他大型库
            'vendors': [
              'element-plus',
              'vue',
              'vue-router',
              'pinia',
              'echarts'
            ],
            // 压缩相关库
            'minifiers': [
              'csso',
              'terser'
            ]
          }
        }
      },
      chunkSizeWarningLimit: 1000 // 增加警告阈值到 1MB
    },
    optimizeDeps: {
      include: [
        'ace-builds'
      ]
    },
    server: {
      host: env.VITE_HOST,
      proxy: {
        [env.VITE_APP_BASE_API] : {
          target: env.VITE_SERVE,
          changeOrigin: true,
          // bypass(req, res, options) {
          //   const proxyUrl = new URL(options.rewrite(req.url) || '', (options.target) as string)?.href || ''
          //   req.headers['x-req-proxyUrl'] = proxyUrl;
          //   res.setHeader("x-res-proxyUrl", proxyUrl)
          // }
        },
        
      }
    }
  }
})

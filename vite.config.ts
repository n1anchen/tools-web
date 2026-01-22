import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'
import { copyAssetsPlugin } from './scripts/vite-copy-assets-plugin.js'

// https://vitejs.dev/config/
export default defineConfig(({command, mode}) => {
  let env = loadEnv(mode, process.cwd())
  return {
    define: {  
      'process.env.NODE_ENV': JSON.stringify('production')  
    },
    plugins: [
      vue(),
      createSvgIconsPlugin({
        // Specify the icon folder to be cached
        iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
        // Specify symbolId format
        symbolId: 'icon-[dir]-[name]',
      }),
      copyAssetsPlugin()
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

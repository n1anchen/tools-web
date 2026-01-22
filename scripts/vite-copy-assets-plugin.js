import { copyAssets } from '../scripts/copy-assets.js'

let hasCopied = false

/**
 * Vite 插件：复制资源文件
 */
export function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    async buildStart() {
      // 在构建开始时复制资源文件
      if (!hasCopied) {
        await copyAssets()
        hasCopied = true
      }
    },
    async configureServer(server) {
      // 在开发服务器启动时复制资源文件
      if (!hasCopied) {
        await copyAssets()
        hasCopied = true
      }
      
      // 监听文件变化，如果 node_modules 中的源文件发生变化，重新复制
      server.watcher.add([
        'node_modules/figlet/fonts/*.flf',
        'node_modules/ace-builds/src-noconflict/worker-*.js'
      ])
    }
  }
}
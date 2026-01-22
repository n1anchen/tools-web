import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

/**
 * 复制 figlet 字体文件
 */
async function copyFigletFonts() {
  const sourceDir = path.join(projectRoot, 'node_modules/figlet/fonts')
  const targetDir = path.join(projectRoot, 'public/fonts')
  
  // 需要复制的字体文件
  const fontFiles = [
    'Alpha.flf',
    'Avatar.flf', 
    'Banner.flf',
    'Banner3-D.flf',
    'Basic.flf',
    'Bear.flf',
    'Big.flf',
    'Big Money-ne.flf',
    'Block.flf',
    'Epic.flf',
    'Ghost.flf',
    'Knob.flf',
    'Linux.flf',
    'Mini.flf',
    'Mirror.flf',
    'Peaks.flf',
    'Slant.flf',
    'Small.flf',
    'Stellar.flf',
    'Thin.flf',
    'Wow.flf'
  ]

  // 确保目标目录存在
  await fs.ensureDir(targetDir)
  
  console.log('📦 复制 figlet 字体文件...')
  
  for (const fontFile of fontFiles) {
    const sourcePath = path.join(sourceDir, fontFile)
    const targetPath = path.join(targetDir, fontFile)
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath)
      console.log(`✓ 复制: ${fontFile}`)
    } else {
      console.warn(`⚠️  字体文件不存在: ${fontFile}`)
    }
  }
}

/**
 * 复制 ACE 编辑器 worker 文件
 */
async function copyAceWorkers() {
  const sourceDir = path.join(projectRoot, 'node_modules/ace-builds/src-noconflict')
  const targetDir = path.join(projectRoot, 'public/ace')
  
  // 需要复制的 worker 文件
  const workerFiles = [
    'worker-css.js',
    'worker-html.js', 
    'worker-javascript.js',
    'worker-json.js'
  ]

  // 确保目标目录存在
  await fs.ensureDir(targetDir)
  
  console.log('📦 复制 ACE 编辑器 worker 文件...')
  
  for (const workerFile of workerFiles) {
    const sourcePath = path.join(sourceDir, workerFile)
    const targetPath = path.join(targetDir, workerFile)
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath)
      console.log(`✓ 复制: ${workerFile}`)
    } else {
      console.warn(`⚠️  Worker 文件不存在: ${workerFile}`)
    }
  }
}

/**
 * 主复制函数
 */
export async function copyAssets() {
  try {
    console.log('🚀 开始复制资源文件...')
    
    await Promise.all([
      copyFigletFonts(),
      copyAceWorkers()
    ])
    
    console.log('✅ 所有资源文件复制完成!')
  } catch (error) {
    console.error('❌ 复制资源文件失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
const currentFile = fileURLToPath(import.meta.url)
const scriptPath = process.argv[1]

if (currentFile === scriptPath || path.resolve(scriptPath) === currentFile) {
  copyAssets()
}
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
  
  // 需要复制的字体文件，支持 { src, dest } 格式以便重命名
  // 文件名含空格会导致 URL 编码为 %20，部分 nginx/代理返回 400，统一用连字符替换
  const fontFiles = [
    'Alpha.flf',
    'Avatar.flf', 
    'Banner.flf',
    'Banner3-D.flf',
    'Basic.flf',
    'Bear.flf',
    'Big.flf',
    { src: 'Big Money-ne.flf', dest: 'Big-Money-ne.flf' },
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
  
  for (const entry of fontFiles) {
    const srcName = typeof entry === 'string' ? entry : entry.src
    const destName = typeof entry === 'string' ? entry : entry.dest
    const sourcePath = path.join(sourceDir, srcName)
    const targetPath = path.join(targetDir, destName)
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, targetPath)
      console.log(`✓ 复制: ${srcName}${srcName !== destName ? ` → ${destName}` : ''}`)
    } else {
      console.warn(`⚠️  字体文件不存在: ${srcName}`)
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
 * 复制 kuromoji 词典文件
 */
async function copyKuromojiDict() {
  const sourceDir = path.join(projectRoot, 'node_modules/kuromoji/dict')
  const targetDir = path.join(projectRoot, 'public/dicts/kuromoji')

  if (!await fs.pathExists(sourceDir)) {
    console.warn('⚠️  kuromoji 词典目录不存在，跳过复制')
    return
  }

  await fs.ensureDir(targetDir)

  console.log('📦 复制 kuromoji 日语词典文件...')

  const dictFiles = (await fs.readdir(sourceDir)).filter(file => file.endsWith('.dat.gz'))
  for (const dictFile of dictFiles) {
    const sourcePath = path.join(sourceDir, dictFile)
    const targetPath = path.join(targetDir, dictFile)
    await fs.copy(sourcePath, targetPath)
    console.log(`✓ 复制: ${dictFile}`)
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
      copyAceWorkers(),
      copyKuromojiDict()
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

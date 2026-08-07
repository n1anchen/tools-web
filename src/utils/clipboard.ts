import { ElMessage } from 'element-plus'

/**
 * 将图片 Blob 复制到剪贴板（ClipboardItem）。
 * - 不支持时提示并返回 false
 * - 成功后提示并返回 true
 * - 失败提示并返回 false
 * 供 4 个图片工具（BlueArchive/Choyen5000/MemeCaption/PornhubLogo）共用。
 */
export async function copyImageToClipboard(blob: Blob, label = '图片'): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    ElMessage.warning('当前浏览器不支持复制图片，请使用下载')
    return false
  }
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    ElMessage.success(`${label}已复制到剪贴板`)
    return true
  } catch {
    ElMessage.error('图片复制失败，请尝试直接下载')
    return false
  }
}

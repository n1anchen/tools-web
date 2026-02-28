/**
 * 动态加载字体样式表，并等待 CSS 解析完成。
 * 通过监听 <link> 的 onload 事件确保 @font-face 已注册到浏览器。
 */
export function loadFontStylesheet(id: string, href: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id)
    if (existing) {
      // 如果 link 已存在，检查是否已加载完成
      if ((existing as HTMLLinkElement).sheet) {
        resolve()
      } else {
        existing.addEventListener('load', () => resolve(), { once: true })
        existing.addEventListener('error', () => reject(new Error(`Failed to load: ${href}`)), { once: true })
      }
      return
    }
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`Failed to load font stylesheet: ${href}`))
    document.head.appendChild(link)
  })
}

/**
 * 使用 document.fonts.load() 显式触发字体文件下载。
 * 必须在对应的 @font-face CSS 已解析后调用才有效。
 *
 * @param fonts - 需要加载的字体列表
 *   font: CSS font 简写，如 '900 100px "Noto Sans SC"'
 *   text: 可选，用于触发特定 unicode-range 分片的测试文本
 */
export async function ensureFontsLoaded(
  fonts: { font: string; text?: string }[]
): Promise<void> {
  try {
    await Promise.all(
      fonts.map(({ font, text }) =>
        document.fonts.load(font, text || 'ABCabc测试')
      )
    )
  } catch (e) {
    console.warn('Font loading warning:', e)
  }
}

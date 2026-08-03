import { decodeHtmlEntities } from '@/utils/textTools'

export type DocumentExtension = 'md' | 'html' | 'txt'

export function sanitizeDocumentName(value: string, fallback = 'untitled') {
  const normalized = value
    .trim()
    .replace(/\.(?:md|markdown|html?|txt)$/i, '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[.\s-]+$/g, '')
  return normalized || fallback
}

export function buildDocumentFilename(title: string, extension: DocumentExtension) {
  return `${sanitizeDocumentName(title, 'untitled')}.${extension}`
}

export function formatDocumentBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export function countMarkdownHeadings(markdown: string) {
  let inFence = false
  let count = 0
  for (const line of markdown.split(/\r\n|\r|\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence
      continue
    }
    if (!inFence && /^\s{0,3}#{1,6}(?:\s+|$)/.test(line)) count += 1
  }
  return count
}

export function htmlToPlainText(html: string) {
  if (!html) return ''
  return decodeHtmlEntities(html
    .replace(/<(?:br|hr)\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|blockquote|pre|tr)>/gi, '\n\n')
    .replace(/<li(?:\s[^>]*)?>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim())
}

export function plainTextToHtml(text: string) {
  const escape = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
  if (!text.trim()) return '<p><br></p>'
  return text
    .replace(/\r\n|\r/g, '\n')
    .split(/\n{2,}/)
    .map(paragraph => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function buildStandaloneHtml(title: string, body: string) {
  const safeTitle = (title.trim() || 'untitled')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <style>body{max-width:860px;margin:40px auto;padding:0 24px;color:#1f2937;font:16px/1.75 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}img{max-width:100%;height:auto}pre{overflow:auto;padding:16px;border-radius:10px;background:#f3f4f6}code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}blockquote{margin-left:0;padding-left:16px;border-left:4px solid #cbd5e1;color:#64748b}</style>
</head>
<body>
${body}
</body>
</html>`
}

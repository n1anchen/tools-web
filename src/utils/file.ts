/**
 * 直接下载
 * @param url 下载的文件url
 * @param filename 文件名
 */
export function autoDown(url: string, filename: string) {
    const downloadLink = document.createElement('a');
    downloadLink.href = url;  
    downloadLink.target = '_blank';
    downloadLink.rel = 'noopener noreferrer';
    downloadLink.download = filename; // 指定下载的文件名  
    // 将下载链接添加到 DOM 中并模拟点击下载  
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }
}

/**
 * 获取文件后缀
 */
export function getFileExtension(filename) {  
  const dotIndex = filename.lastIndexOf('.');  
  if (dotIndex === -1) {  
    return ''; // 没有找到'.'，返回空字符串  
  }  
  return filename.substr(dotIndex + 1); // 返回'.'之后的部分作为后缀名  
}

/**
 * 格式化字节数为可读文本（B / KB / MB / GB）
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / 1024 ** index
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

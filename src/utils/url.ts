export function isUrl(str: string): boolean {  
  // const urlPattern = new RegExp(  
  //   '^(https?:\\/\\/)?'+ // protocol  
  //   '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name and extension  
  //   '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address  
  //   '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path  
  //   '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string  
  //   '(\\#[-a-z\\d_]*)?$','i'); // fragment locator  
  // return urlPattern.test(str);  
  const urlPattern = new RegExp(  
    '^(https?:\\/\\/)?'+ // protocol  
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,})','i'); // fragment locator  
  return urlPattern.test(str);  
}

/**
 * 移除 URL 中的所有 query string 参数（包含跟踪参数）
 * 保留协议、域名、路径和 hash
 */
export function removeAllParams(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.search = ''
    return parsed.href
  } catch {
    return url
  }
}

const UrlUtils = {
  isUrl,
  removeAllParams,
}

export default UrlUtils
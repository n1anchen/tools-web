//通过vue-router插件实现模板路由配置
import { createRouter, createWebHistory } from 'vue-router'
import { constantRoute } from './router'
import { getTools } from '@/components/Tools/tools.ts'
import { isSameFamily } from '@/utils/routeTransition'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置 NProgress：不显示右上角转圈
NProgress.configure({ showSpinner: false, minimum: 0.2, speed: 300 })

//创建路由器
const router = createRouter({
  history: createWebHistory(),
  routes: constantRoute,
  //滚动行为
  scrollBehavior(to, from) {
    // 首页由组件自行控制滚动（用于恢复离开时的位置）
    if (to.path === '/') return false
    // 同类工具快速切换（图表 / 单位分类）：保持当前滚动位置，不回到顶部
    if (isSameFamily(from.path, to.path)) return false
    return {
      left: 0,
      top: 0,
    }
  },
})
// _form: ‘_’表示占位变量，可以不被使用
router.beforeEach(() => {
  NProgress.start()
  return true
})
router.onError(() => NProgress.done())
//路由后置卫士
router.afterEach((to) => {
  NProgress.done()
  //填充mate元信息
  const { keywords, description } = to.meta
  const appTitle = import.meta.env.VITE_APP_TITLE || '在线工具箱'
  const appDescription = import.meta.env.VITE_APP_DESC || '一个轻量的在线工具箱'
  // 优先从 tools.ts 单一数据源派生工具标题（按当前路由匹配），路由 meta 仅作兜底
  const tool = getTools({ cateId: 0, title: '', route: to.path })
  const detailTitle = typeof tool.title === 'string' && tool.title
    ? tool.title
    : (typeof to.meta.title === 'string' ? to.meta.title : '')
  const pageDescription = typeof description === 'string' ? description : appDescription
  //设置title
  if (detailTitle) {
    document.title = detailTitle + ' - ' + appTitle
  } else {
    document.title = appTitle + ' - ' + appDescription
  }

  //设置meta
  if (typeof keywords === 'string') {
    document.querySelector('meta[name="keywords"]')?.setAttribute('content', keywords)
  }
  document.querySelector('meta[name="description"]')?.setAttribute('content', pageDescription)
  //设置meta og
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
  document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', appTitle)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', pageDescription)
  //动态更新 canonical 和 og:url
  const siteBase = 'https://tools.nianchen.top'
  const canonicalUrl = siteBase + to.path
  let canonicalEl = document.querySelector('link[rel="canonical"]')
  if (!canonicalEl) {
    canonicalEl = document.createElement('link')
    canonicalEl.setAttribute('rel', 'canonical')
    document.head.appendChild(canonicalEl)
  }
  canonicalEl.setAttribute('href', canonicalUrl)
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonicalUrl)

  // 动态注入页面级 JSON-LD 结构化数据
  // 首页使用 index.html 中的静态 WebSite schema，子页面注入 WebApplication schema
  const pageJsonLdId = 'page-jsonld'
  let pageJsonLdEl = document.getElementById(pageJsonLdId) as HTMLScriptElement | null
  if (to.path === '/') {
    // 首页回到静态 WebSite schema，移除动态注入的标签
    pageJsonLdEl?.remove()
  } else if (detailTitle && description) {
    // 工具页面：注入 WebApplication 结构化数据
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': detailTitle,
      'url': canonicalUrl,
      'description': String(description),
      'applicationCategory': 'UtilitiesApplication',
      'operatingSystem': 'Any',
      'inLanguage': 'zh-CN',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'CNY'
      },
      'isPartOf': {
        '@type': 'WebSite',
        'name': '在线工具箱',
        'url': 'https://tools.nianchen.top'
      }
    }
    if (!pageJsonLdEl) {
      pageJsonLdEl = document.createElement('script')
      pageJsonLdEl.id = pageJsonLdId
      pageJsonLdEl.type = 'application/ld+json'
      document.head.appendChild(pageJsonLdEl)
    }
    pageJsonLdEl.textContent = JSON.stringify(schema)
  }
})
export default router

//通过vue-router插件实现模板路由配置
import { createRouter, createWebHistory } from 'vue-router'
import { constantRoute } from './router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 配置 NProgress：不显示右上角转圈
NProgress.configure({ showSpinner: false, minimum: 0.2, speed: 300 })

//创建路由器
const router = createRouter({
  //路由模式hash
  // history: createWebHashHistory(),
  history: createWebHistory(),
  routes: constantRoute,
  //滚动行为
  scrollBehavior(to) {
    // 首页由组件自行控制滚动（用于恢复离开时的位置）
    if (to.path === '/') return false
    return {
      left: 0,
      top: 0,
    }
  },
})
// _form: ‘_’表示占位变量，可以不被使用
router.beforeEach((_to, _from, next) => {
  NProgress.start()
  next()
})
//路由后置卫士
router.afterEach((to) => {
  NProgress.done()
  //填充mate元信息
  const { title , keywords, description } = to.meta
  //详情页标题
  const detailTitle = title
  //设置title
  if (detailTitle) {
    document.title = detailTitle + ' - ' + import.meta.env.VITE_APP_TITLE
  } else {
    document.title = import.meta.env.VITE_APP_TITLE + ' - ' + import.meta.env.VITE_APP_DESC
  }

  //设置meta
  document.querySelector('meta[name="keywords"]')?.setAttribute("content", `${keywords}`)
  document.querySelector('meta[name="description"]')?.setAttribute("content", `${description}`)
  //设置meta og
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", `${document.title}`)
  document.querySelector('meta[property="og:site_name"]')?.setAttribute("content", `${document.title}`)
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", `${description}`)
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
  } else if (title && description) {
    // 工具页面：注入 WebApplication 结构化数据
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': String(title),
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

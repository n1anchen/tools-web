export type ManagedResourceId = 'kuromoji-dict' | 'ace-workers' | 'figlet-fonts' | 'midi-soundfont' | 'remote-fonts'

interface ManagedResourceGroup {
  id: ManagedResourceId
  title: string
  description: string
  cacheName: string
  urls?: string[]
  cacheNames?: string[]
  estimatedBytes?: number
  preferenceKey?: string
  cacheable: boolean
  defaultEnabled?: boolean
}

export interface ManagedResourceStatus {
  supported: boolean
  cachedCount: number
  totalCount: number
  estimatedCachedBytes: number
  estimatedBytes: number
  complete: boolean
  partial: boolean
  enabled: boolean
}

export const KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY = 'japaneseKuromojiCacheDictionary'

const KUROMOJI_DICT_FILES = [
  'base.dat.gz',
  'cc.dat.gz',
  'check.dat.gz',
  'tid.dat.gz',
  'tid_map.dat.gz',
  'tid_pos.dat.gz',
  'unk.dat.gz',
  'unk_char.dat.gz',
  'unk_compat.dat.gz',
  'unk_invoke.dat.gz',
  'unk_map.dat.gz',
  'unk_pos.dat.gz',
]

const ACE_WORKER_FILES = [
  'worker-css.js',
  'worker-html.js',
  'worker-javascript.js',
  'worker-json.js',
  'worker-xml.js',
]

const FIGLET_FONT_FILES = [
  'Alpha.flf',
  'Avatar.flf',
  'Banner.flf',
  'Banner3-D.flf',
  'Basic.flf',
  'Bear.flf',
  'Big.flf',
  'Big-Money-ne.flf',
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
  'Wow.flf',
  'bluearchive/RoGSans.woff2',
]

export const MANAGED_RESOURCE_GROUPS: ManagedResourceGroup[] = [
  {
    id: 'kuromoji-dict',
    title: '日语精准读音词典',
    description: '日语歌词和罗马音工具共用，用于汉字读音、词性和分词分析。',
    cacheName: 'japanese-kuromoji-dict',
    urls: KUROMOJI_DICT_FILES.map(file => `/dicts/kuromoji/${file}`),
    estimatedBytes: 19 * 1024 * 1024,
    preferenceKey: KUROMOJI_DICTIONARY_CACHE_PREFERENCE_KEY,
    cacheable: true,
  },
  {
    id: 'ace-workers',
    title: '代码编辑器 Worker',
    description: '代码格式化、编辑器语法检查等工具按需使用。',
    cacheName: 'tool-resource-ace-workers',
    urls: ACE_WORKER_FILES.map(file => `/ace/${file}`),
    estimatedBytes: 1.4 * 1024 * 1024,
    preferenceKey: 'toolResourceCacheAceWorkers',
    cacheable: true,
    defaultEnabled: true,
  },
  {
    id: 'figlet-fonts',
    title: '趣味字体资源',
    description: 'ASCII 字体和趣味图片文字工具使用的本地字体。',
    cacheName: 'tool-resource-figlet-fonts',
    urls: FIGLET_FONT_FILES.map(file => `/fonts/${file}`),
    estimatedBytes: 396 * 1024,
    preferenceKey: 'toolResourceCacheFigletFonts',
    cacheable: true,
    defaultEnabled: true,
  },
  {
    id: 'midi-soundfont',
    title: 'MIDI 通用音色库',
    description: 'MIDI 播放器使用的 GeneralUser GS 音色，首次播放时也会自动按需缓存。',
    cacheName: 'midi-soundfont',
    urls: ['/midi/soundfonts/GeneralUserGS.sf3'],
    estimatedBytes: 8_423_728,
    preferenceKey: 'toolResourceCacheMidiSoundfont',
    cacheable: true,
    defaultEnabled: false,
  },
  {
    id: 'remote-fonts',
    title: '远程字体缓存',
    description: '访问趣味工具时由浏览器按需缓存的 Google 字体镜像资源。',
    cacheName: 'google-fonts-webfonts',
    cacheNames: ['google-fonts-stylesheets', 'google-fonts-webfonts'],
    estimatedBytes: 0,
    cacheable: false,
  },
]

export function formatResourceBytes(bytes: number) {
  if (!bytes) return '按需缓存'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

export async function getManagedResourceStatuses() {
  const entries = await Promise.all(
    MANAGED_RESOURCE_GROUPS.map(async group => [group.id, await getManagedResourceStatus(group)] as const),
  )
  return Object.fromEntries(entries) as Record<ManagedResourceId, ManagedResourceStatus>
}

export async function ensureDefaultManagedResourceCaches() {
  if (!('caches' in window)) return

  await Promise.all(
    MANAGED_RESOURCE_GROUPS
      .filter(group => group.cacheable && readPreference(group))
      .map(async group => {
        const status = await getManagedResourceStatus(group)
        if (!status.complete) {
          await cacheManagedResourceGroup(group)
        }
      }),
  )
}

async function getManagedResourceStatus(group: ManagedResourceGroup): Promise<ManagedResourceStatus> {
  if (!('caches' in window)) {
    return createEmptyStatus(false, group)
  }

  if (group.urls?.length) {
    const cachedResults = await Promise.all(group.urls.map(url => caches.match(url)))
    const cachedCount = cachedResults.filter(Boolean).length
    return createStatus(group, cachedCount, group.urls.length)
  }

  const cacheNames = group.cacheNames || [group.cacheName]
  const cachedCount = await countCacheEntries(cacheNames)
  return createStatus(group, cachedCount, cachedCount)
}

export async function cacheManagedResourceGroup(group: ManagedResourceGroup) {
  if (!group.cacheable || !group.urls?.length || !('caches' in window)) return false

  const cache = await caches.open(group.cacheName)
  await cache.addAll(group.urls)
  writePreference(group, true)
  return true
}

export async function clearManagedResourceGroup(group: ManagedResourceGroup) {
  if (!('caches' in window)) return false

  if (group.urls?.length) {
    await deleteUrlsFromAllCaches(group.urls)
    await caches.delete(group.cacheName)
  } else {
    await Promise.all((group.cacheNames || [group.cacheName]).map(cacheName => caches.delete(cacheName)))
  }

  writePreference(group, false)
  return true
}

function createEmptyStatus(supported: boolean, group: ManagedResourceGroup): ManagedResourceStatus {
  return {
    supported,
    cachedCount: 0,
    totalCount: group.urls?.length || 0,
    estimatedCachedBytes: 0,
    estimatedBytes: group.estimatedBytes || 0,
    complete: false,
    partial: false,
    enabled: false,
  }
}

function createStatus(group: ManagedResourceGroup, cachedCount: number, totalCount: number): ManagedResourceStatus {
  const complete = totalCount > 0 && cachedCount >= totalCount
  const partial = cachedCount > 0 && !complete
  const estimatedBytes = group.estimatedBytes || 0
  const estimatedCachedBytes = totalCount > 0
    ? Math.round(estimatedBytes * cachedCount / totalCount)
    : 0

  return {
    supported: true,
    cachedCount,
    totalCount,
    estimatedCachedBytes,
    estimatedBytes,
    complete,
    partial,
    enabled: readPreference(group),
  }
}

async function countCacheEntries(cacheNames: string[]) {
  let count = 0
  for (const cacheName of cacheNames) {
    const hasCache = await caches.has(cacheName)
    if (!hasCache) continue
    const cache = await caches.open(cacheName)
    count += (await cache.keys()).length
  }
  return count
}

async function deleteUrlsFromAllCaches(urls: string[]) {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(async cacheName => {
      const cache = await caches.open(cacheName)
      await Promise.all(urls.map(url => cache.delete(url)))
    }),
  )
}

function writePreference(group: ManagedResourceGroup, value: boolean) {
  if (!group.preferenceKey) return
  localStorage.setItem(group.preferenceKey, String(value))

  if (group.id === 'kuromoji-dict') {
    localStorage.removeItem('japaneseLyricsCacheDictionary')
    localStorage.removeItem('japaneseRomajiCacheDictionary')
  }
}

function readPreference(group: ManagedResourceGroup) {
  if (!group.preferenceKey) return false
  const stored = localStorage.getItem(group.preferenceKey)
  if (stored !== null) return stored === 'true'
  return Boolean(group.defaultEnabled)
}

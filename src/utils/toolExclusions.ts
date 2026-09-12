export type ToolRouteLike = {
  path: string
}

export type ToolInfoLike = {
  url: string
}

export type ToolCategoryLike<Tool extends ToolInfoLike = ToolInfoLike> = {
  list: Tool[]
}

const normalizePathIdentifier = (value: string) => value
  .trim()
  .toLowerCase()
  .split(/[?#]/, 1)[0]
  .replace(/^\/+|\/+$/g, '')

/**
 * Return every supported identifier for a tool URL.
 *
 * Internal tools use their normalized route path (for example `/md5/` -> `md5`).
 * External tools can be excluded by their full URL, hostname, or first hostname
 * segment (for example `https://it-tools.nianchen.top` -> `it-tools`).
 */
export function getToolIdentifiers(target: string): string[] {
  const value = target.trim()
  if (!value) return []

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const hostname = url.hostname.toLowerCase()
      const fullUrl = url.toString().toLowerCase().replace(/\/$/, '')
      return [...new Set([fullUrl, hostname, hostname.split('.')[0]].filter(Boolean))]
    } catch {
      // Fall through to path-like normalization for malformed values.
    }
  }

  const identifier = normalizePathIdentifier(value)
  return identifier ? [identifier] : []
}

/** Parse a comma-separated VITE_EXCLUDED_TOOLS value into normalized identifiers. */
export function parseExcludedTools(value: string | undefined): Set<string> {
  const identifiers = (value ?? '')
    .split(/[,，\n]/)
    .flatMap(getToolIdentifiers)

  return new Set(identifiers)
}

export function isToolExcluded(target: string, excludedTools: ReadonlySet<string>): boolean {
  if (excludedTools.size === 0) return false
  return getToolIdentifiers(target).some(identifier => excludedTools.has(identifier))
}

/** Filter tool cards and remove categories left empty by the exclusion. */
export function filterToolCategories<
  Tool extends ToolInfoLike,
  Category extends ToolCategoryLike<Tool>,
>(categories: Category[], excludedTools: ReadonlySet<string>): Category[] {
  if (excludedTools.size === 0) return categories

  return categories
    .map(category => ({
      ...category,
      list: category.list.filter(tool => !isToolExcluded(tool.url, excludedTools)),
    }) as Category)
    .filter(category => category.list.length > 0)
}

export function filterToolRoutes<Route extends ToolRouteLike>(
  routes: Route[],
  excludedTools: ReadonlySet<string>,
): Route[] {
  if (excludedTools.size === 0) return routes
  return routes.filter(route => !isToolExcluded(route.path, excludedTools))
}

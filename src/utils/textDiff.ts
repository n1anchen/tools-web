interface TextComparisonOptions {
  ignoreWhitespace?: boolean
  ignoreCase?: boolean
  ignoreBlankLines?: boolean
}

interface TextDiffChange {
  value: string
  added?: boolean
  removed?: boolean
}

type DiffRowType = 'same' | 'added' | 'removed' | 'changed'

interface DiffRow {
  type: DiffRowType
  left?: string
  right?: string
  leftLine?: number
  rightLine?: number
}

interface DiffSummary {
  additions: number
  removals: number
  unchanged: number
  changedBlocks: number
  oldLines: number
  newLines: number
  similarity: number
}

export function normalizeComparisonText(value: string, options: TextComparisonOptions = {}) {
  let lines = value.replace(/\r\n?/g, '\n').split('\n')
  if (options.ignoreWhitespace) lines = lines.map(line => line.replace(/[\t ]+/g, ' ').trim())
  if (options.ignoreBlankLines) lines = lines.filter(line => line.trim().length > 0)
  let result = lines.join('\n')
  if (options.ignoreCase) result = result.toLocaleLowerCase()
  return result
}

function chunkLines(value: string) {
  const lines = value.replace(/\r\n?/g, '\n').split('\n')
  if (lines[lines.length - 1] === '') lines.pop()
  return lines
}

function pairChangedLines(leftLines: string[], rightLines: string[]) {
  const rows: Array<Omit<DiffRow, 'leftLine' | 'rightLine'>> = []
  const length = Math.max(leftLines.length, rightLines.length)
  for (let index = 0; index < length; index++) {
    const left = leftLines[index]
    const right = rightLines[index]
    rows.push({
      type: left !== undefined && right !== undefined ? 'changed' : left !== undefined ? 'removed' : 'added',
      ...(left !== undefined ? { left } : {}),
      ...(right !== undefined ? { right } : {}),
    })
  }
  return rows
}

export function buildDiffRows(changes: TextDiffChange[]) {
  const pending: Array<Omit<DiffRow, 'leftLine' | 'rightLine'>> = []
  for (let index = 0; index < changes.length; index++) {
    const change = changes[index]
    const next = changes[index + 1]
    if (change.removed && next?.added) {
      pending.push(...pairChangedLines(chunkLines(change.value), chunkLines(next.value)))
      index++
      continue
    }
    if (change.added && next?.removed) {
      pending.push(...pairChangedLines(chunkLines(next.value), chunkLines(change.value)))
      index++
      continue
    }
    const type: DiffRowType = change.added ? 'added' : change.removed ? 'removed' : 'same'
    for (const line of chunkLines(change.value)) {
      pending.push({ type, ...(type !== 'added' ? { left: line } : {}), ...(type !== 'removed' ? { right: line } : {}) })
    }
  }

  let leftLine = 0
  let rightLine = 0
  return pending.map<DiffRow>((row) => {
    if (row.left !== undefined) leftLine++
    if (row.right !== undefined) rightLine++
    return {
      ...row,
      ...(row.left !== undefined ? { leftLine } : {}),
      ...(row.right !== undefined ? { rightLine } : {}),
    }
  })
}

export function summarizeDiffRows(rows: DiffRow[]): DiffSummary {
  let additions = 0
  let removals = 0
  let unchanged = 0
  let changedBlocks = 0
  let inChangedBlock = false
  let oldLines = 0
  let newLines = 0

  for (const row of rows) {
    if (row.left !== undefined) oldLines++
    if (row.right !== undefined) newLines++
    if (row.type === 'same') {
      unchanged++
      inChangedBlock = false
      continue
    }
    if (!inChangedBlock) changedBlocks++
    inChangedBlock = true
    if (row.type === 'added' || row.type === 'changed') additions++
    if (row.type === 'removed' || row.type === 'changed') removals++
  }

  const similarity = oldLines === 0 && newLines === 0
    ? 100
    : Math.round((unchanged / Math.max(oldLines, newLines, 1)) * 100)
  return { additions, removals, unchanged, changedBlocks, oldLines, newLines, similarity }
}

export function createUnifiedDiffText(rows: DiffRow[], oldName = '原始版本', newName = '修改版本') {
  const output = [`--- ${oldName}`, `+++ ${newName}`]
  for (const row of rows) {
    if (row.type === 'same') output.push(` ${row.left ?? ''}`)
    else {
      if (row.left !== undefined) output.push(`-${row.left}`)
      if (row.right !== undefined) output.push(`+${row.right}`)
    }
  }
  return output.join('\n')
}

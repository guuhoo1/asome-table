/**
 * 分页的纯计算：页数、行号偏移、页码序列（带省略号）。
 * 不依赖 Vue，也不负责取数——分页只产生事件，数据由页面自己按页码请求（与老壳一致）。
 */

const DEFAULT_PAGE_SIZE = 10

function normalizeSize(pageSize) {
  const size = Number(pageSize)
  return size > 0 ? size : DEFAULT_PAGE_SIZE
}

/** 总页数，至少 1 页 */
export function pageCountOf(total, pageSize) {
  const count = Number(total) > 0 ? Number(total) : 0
  return Math.max(1, Math.ceil(count / normalizeSize(pageSize)))
}

/** 行号偏移：(current - 1) * pageSize */
export function offsetOf(current, pageSize) {
  const page = Number(current) > 0 ? Number(current) : 1
  return (page - 1) * normalizeSize(pageSize)
}

/**
 * 页码序列：页数不超过 7 时全部列出，否则首尾固定 + 当前页两侧各 siblings 个，
 * 断开处用 '...' 占位。
 */
export function pageItemsOf(current, pageCount, siblings = 1) {
  const count = Math.max(1, Number(pageCount) || 1)
  const page = Math.min(Math.max(1, Number(current) || 1), count)
  const maxNumbers = siblings * 2 + 5

  if (count <= maxNumbers) {
    return Array.from({ length: count }, (_, index) => index + 1)
  }

  const left = Math.max(page - siblings, 2)
  const right = Math.min(page + siblings, count - 1)
  const items = [1]

  if (left > 2) items.push('...')
  for (let i = left; i <= right; i += 1) items.push(i)
  if (right < count - 1) items.push('...')
  items.push(count)

  return items
}

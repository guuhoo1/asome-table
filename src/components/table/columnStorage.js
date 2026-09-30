/**
 * 列宽 / 列序的持久化：**完整复刻 vela-pc 老壳 draggerTable 的行为**，
 * 目的是让用户已经调好的列宽在切换到新组件后依然有效。
 *
 * 关键兼容点：
 * 1. key 规则：`${path}_${hash.toString(36)}`，hash 只对**顶层列**取 `{ dataIndex: key || dataIndex, width }`
 *    拼 JSON 后按 `hash = (hash << 5) - hash + charCode` 累加（与老实现逐字节一致）。
 * 2. 值的形状：递归收集所有列（含 children）成 `[{ dataIndex, width }]`，**按当前顺序**，
 *    所以顺序与宽度一起被持久化。
 *
 * 纯函数，不依赖 Vue；storage 由调用方传入（浏览器上就是 window.localStorage）。
 */

/** 老实现的 hash：只取顶层列的 key/dataIndex 与 width */
export function columnsHash(columns) {
  if (!Array.isArray(columns)) return ''

  const source = JSON.stringify(
    columns.map((item) => ({ dataIndex: item.key || item.dataIndex, width: item.width }))
  )

  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

export function storageKeyOf(path, columns) {
  return `${path}_${columnsHash(columns)}`
}

export function readColumnCache(storage, key) {
  if (!storage || !key) return null
  try {
    const raw = storage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

export function writeColumnCache(storage, key, columns) {
  if (!storage || !key) return
  try {
    const flat = []
    const collect = (list) => {
      const items = Array.isArray(list) ? list : []
      items.forEach((column) => {
        flat.push({
          dataIndex: column.originalKey || column.key || column.dataIndex,
          width: column.width
        })
        if (Array.isArray(column.children)) collect(column.children)
      })
    }
    collect(columns)
    storage.setItem(key, JSON.stringify(flat))
  } catch (error) {
    // 存储不可用（无痕模式 / 配额满）时静默降级，不影响表格本身
  }
}

/**
 * 把缓存应用到列定义上：恢复宽度与顺序。
 * - 顺序：按缓存里的顺序排列，不在缓存里的列保持原顺序排最后；
 * - 宽度：`fixed` 的列不改宽度（老实现行为）；
 * - children 递归处理。
 */
export function applyColumnCache(columns, cache) {
  if (!Array.isArray(columns) || !Array.isArray(cache) || !cache.length) return columns

  const orderOf = {}
  cache.forEach((item, index) => {
    orderOf[item.dataIndex] = index
  })

  return columns
    .map((column, index) => {
      const key = column.key || column.dataIndex
      const cached = cache.find((item) => item.dataIndex === key)
      const next = Object.assign({}, column)

      if (cached && cached.width && !next.fixed) next.width = cached.width
      if (Array.isArray(column.children) && column.children.length) {
        next.children = applyColumnCache(column.children, cache)
      }

      return {
        column: next,
        order: orderOf[key] === undefined ? Number.MAX_SAFE_INTEGER : orderOf[key],
        index
      }
    })
    .sort((left, right) => left.order - right.order || left.index - right.index)
    .map((item) => item.column)
}

/** 列显隐：`visibleConfig` 里没有记录的列默认可见（与老壳一致） */
export function filterVisibleColumns(columns, visibleConfig) {
  const config = visibleConfig || {}
  return (columns || []).filter((column) => {
    const key = column.key || column.dataIndex
    const flag = config[key]
    return flag === undefined ? true : !!flag
  })
}

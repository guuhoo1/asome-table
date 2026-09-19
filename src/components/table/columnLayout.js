/**
 * 列顺序与列宽的纯逻辑：只吃列定义和覆盖表，不依赖 Vue，可单独测试。
 * 「覆盖」是组件内部会话级的状态：orderMap 记每层的 key 顺序，widthMap 记每列的新宽度。
 */

/** 顶层容器在 orderMap 里的 key（分组列用它自己的 key 作为容器 key） */
export const ROOT_CONTAINER = '__root'

/**
 * 列 key 的推导规则，必须和组件里的归一化保持一致。
 * parentKey 用于给没写 key/dataIndex 的列兜底。
 */
export function columnKeyOf(column, index, parentKey) {
  const prefix =
    parentKey === undefined || parentKey === null || parentKey === ROOT_CONTAINER
      ? 'col-'
      : parentKey + '-'
  if (!column) return String(prefix + index)
  const key = column.key || column.dataIndex
  if (key) return String(key)
  return String(prefix + index)
}

/** 列宽夹取：max 为 0 / 空表示不设上限 */
export function clampColumnWidth(width, min, max) {
  const value = Number(width)
  if (isNaN(value)) return min
  const lowerBound = Number(min) > 0 ? Number(min) : 0
  const upperBound = Number(max) > 0 ? Number(max) : Infinity
  return Math.min(Math.max(value, lowerBound), upperBound)
}

/** 数组内移动一项，越界会被夹到合法范围 */
export function moveWithinList(list, fromIndex, toIndex) {
  const next = (list || []).slice()
  if (fromIndex < 0 || fromIndex >= next.length) return next
  const target = Math.min(Math.max(toIndex, 0), next.length - 1)
  if (target === fromIndex) return next
  const [moved] = next.splice(fromIndex, 1)
  next.splice(target, 0, moved)
  return next
}

/**
 * 采集「每层当前的 key 顺序」，作为初始 orderMap。
 * 顶层用 '__root' 作为容器 key，每个分组用自己的 key 作为容器 key。
 */
export function collectOrderMap(columns, orderMap = {}, parentKey = '__root') {
  const list = Array.isArray(columns) ? columns : []
  orderMap[parentKey] = list.map((column, index) => columnKeyOf(column, index, parentKey))

  list.forEach((column, index) => {
    if (Array.isArray(column.children) && column.children.length) {
      collectOrderMap(column.children, orderMap, columnKeyOf(column, index, parentKey))
    }
  })

  return orderMap
}

/**
 * 按 orderMap 重排每一层（递归）。
 * orderMap 里没有的列会被追加到该层末尾，保证新加的列不会丢。
 */
export function applyColumnOrder(columns, orderMap, parentKey = '__root') {
  const list = Array.isArray(columns) ? columns : []
  const order = orderMap && orderMap[parentKey]
  let sorted = list

  if (Array.isArray(order) && order.length) {
    const byKey = {}
    list.forEach((column, index) => {
      byKey[columnKeyOf(column, index, parentKey)] = column
    })
    const used = {}
    sorted = []
    order.forEach((key) => {
      if (byKey[key] && !used[key]) {
        sorted.push(byKey[key])
        used[key] = true
      }
    })
    list.forEach((column, index) => {
      const key = columnKeyOf(column, index, parentKey)
      if (!used[key]) sorted.push(column)
    })
  }

  return sorted.map((column, index) => {
    if (!Array.isArray(column.children) || !column.children.length) return column
    return Object.assign({}, column, {
      children: applyColumnOrder(
        column.children,
        orderMap,
        columnKeyOf(column, index, parentKey)
      )
    })
  })
}

/** 把宽度覆盖应用到列定义上（递归），用于回传给父组件持久化 */
export function applyWidthOverrides(columns, widthMap, parentKey = '__root') {
  const list = Array.isArray(columns) ? columns : []
  const widths = widthMap || {}

  return list.map((column, index) => {
    const key = columnKeyOf(column, index, parentKey)
    const next = Object.assign({}, column)
    const width = widths[key]

    if (typeof width === 'number') next.width = width
    if (Array.isArray(column.children) && column.children.length) {
      next.children = applyWidthOverrides(column.children, widths, key)
    }
    return next
  })
}

/** 两个 key 数组顺序是否一致 */
export function sameKeyOrder(a, b) {
  const left = Array.isArray(a) ? a : []
  const right = Array.isArray(b) ? b : []
  if (left.length !== right.length) return false
  return left.every((key, index) => key === right[index])
}

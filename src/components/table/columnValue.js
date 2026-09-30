/**
 * 列取值与格式化：兼容 vela-pc 老壳（AdvanceTable.getCurrentText）的三种列约定，
 * 另外补一个 antd 列定义里常见的 ellipsis（截断由组件渲染层处理）。
 * 纯函数，不依赖 Vue。
 */

/** 点号路径深层取值，任一层为空就返回 undefined（不抛错） */
export function readDeepValue(record, path) {
  if (!record || !path) return undefined
  const segments = String(path).split('.')
  let current = record

  for (let i = 0; i < segments.length; i += 1) {
    if (current === null || current === undefined) return undefined
    current = current[segments[i]]
  }

  return current
}

/** isSubObj 为真时按点号路径取值，否则取 dataIndex（缺省回退 key） */
export function resolveColumnValue(record, column) {
  if (!record || !column) return undefined
  const field = column.dataIndex || column.key
  return column.isSubObj ? readDeepValue(record, field) : record[field]
}

/** 序号列：从 1 开始，可带分页偏移（分页在 F6 才做） */
export function serialNumberOf(index, offset = 0) {
  return index + 1 + (Number(offset) || 0)
}

/**
 * 显示值：与老实现一致——formatter 最优先，其次序号列，其次 isSubObj 深路径，最后普通取值。
 * 一处刻意改进：序号列若同时配了 formatter，传给 formatter 的是**序号**，
 * 而老实现会传 `record[undefined]`（也就是 NaN）——这种组合本身没有意义，按更合理的行为处理。
 */
export function resolveDisplayValue(record, column, index, extraSerialOffset = 0) {
  if (!column) return undefined

  const baseValue = column.isSerialNumber
    ? serialNumberOf(
        index,
        (Number(column.serialNumberOffset) || 0) + (Number(extraSerialOffset) || 0)
      )
    : resolveColumnValue(record, column)

  if (typeof column.formatter === 'function') {
    return column.formatter(baseValue, record, index)
  }

  return baseValue
}

/**
 * 合并单元格的纯逻辑：只吃列定义和数据，不依赖 Vue，可以单独测试。
 * 列上 merge: true = 相邻行同值纵向合并；merge 是函数时把判据交给调用方。
 */

import { isEmptyValue } from './values.js'

export function readField(record, leaf) {
  if (!record) return undefined
  return record[leaf.dataIndex || leaf.key]
}

export function isSameMergeValue(leaf, record, previousRecord, index) {
  if (typeof leaf.merge === 'function') {
    return !!leaf.merge(record, previousRecord, index, index - 1)
  }
  const current = readField(record, leaf)
  const previous = readField(previousRecord, leaf)
  // 空值不参与合并，否则一排 '-' 会糊成一个大格子
  if (isEmptyValue(current) || isEmptyValue(previous)) return false
  return current === previous
}

/**
 * 算出每一列的纵向合并范围。
 * @returns {Object} { [columnKey]: { spans: { rowIndex: rowSpan }, skip: { rowIndex: true } } }
 */
export function buildMergePlan(leaves, rows) {
  const plan = {}
  const list = Array.isArray(rows) ? rows : []
  const columns = Array.isArray(leaves) ? leaves : []

  columns.forEach((leaf) => {
    if (!leaf.merge) return

    const spans = {}
    const skip = {}
    let start = 0

    for (let index = 1; index <= list.length; index += 1) {
      const same =
        index < list.length && isSameMergeValue(leaf, list[index], list[index - 1], index)

      if (!same) {
        const size = index - start
        if (size > 1) {
          spans[start] = size
          for (let cursor = start + 1; cursor < index; cursor += 1) skip[cursor] = true
        }
        start = index
      }
    }

    plan[leaf.key] = { spans, skip }
  })

  return plan
}

/** 这一格是不是被上面的合并格吃掉了（吃掉就不渲染 td） */
export function isMergedAway(plan, columnKey, rowIndex) {
  const entry = plan[columnKey]
  return !!(entry && entry.skip[rowIndex])
}

/** 合并跨度，没合并时是 1 */
export function spanSize(plan, columnKey, rowIndex) {
  const entry = plan[columnKey]
  const size = entry && entry.spans[rowIndex]
  return size > 1 ? size : 1
}

/** 给 <td rowspan> 用：只有 >1 才返回数字，否则返回 null（属性不渲染） */
export function rowSpanAttr(plan, columnKey, rowIndex) {
  const size = spanSize(plan, columnKey, rowIndex)
  return size > 1 ? size : null
}

/** 合并格覆盖到的所有行下标（用来算整组高亮、整组写回） */
export function spanRowIndexes(plan, columnKey, rowIndex) {
  const size = spanSize(plan, columnKey, rowIndex)
  const indexes = []
  for (let cursor = rowIndex; cursor < rowIndex + size; cursor += 1) indexes.push(cursor)
  return indexes
}

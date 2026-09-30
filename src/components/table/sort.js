/**
 * 行排序的纯逻辑：比较器、稳定排序、排序状态循环，不依赖 Vue。
 *
 * 约定：
 * - 列的 sorter 为 true 时按 dataIndex（缺省回退 key）取值比较；为函数时直接用你的比较函数；
 * - 空值（'' / null / undefined）永远排在最后，升序降序都一样；
 * - 相同值时维持数据原本的相对顺序（稳定排序）。
 */

export const SORT_ASCEND = 'ascend'
export const SORT_DESCEND = 'descend'

export function normalizeSortDirections(directions) {
  const list = Array.isArray(directions)
    ? directions.filter((item) => item === SORT_ASCEND || item === SORT_DESCEND)
    : []
  return list.length ? list : [SORT_ASCEND, SORT_DESCEND]
}

export function isEmptySortValue(value) {
  return value === '' || value === null || value === undefined
}

export function readSortValue(record, column) {
  if (!record || !column) return undefined
  const field = column.dataIndex || column.key
  return record[field]
}

/** 数字比大小，其它按中文环境做本地化字符串比较 */
export function compareValues(a, b) {
  const numericA = typeof a === 'number' ? a : Number(a)
  const numericB = typeof b === 'number' ? b : Number(b)
  const bothNumeric =
    a !== '' && b !== '' && a !== null && b !== null && !isNaN(numericA) && !isNaN(numericB)

  if (bothNumeric) {
    if (numericA === numericB) return 0
    return numericA < numericB ? -1 : 1
  }
  return String(a).localeCompare(String(b), 'zh-Hans-CN')
}

/** 列上的 sorter 归一成一个比较函数；不可排序的列返回 null */
export function buildComparator(column) {
  if (!column || !column.sorter) return null
  if (typeof column.sorter === 'function') return column.sorter
  return (a, b) => compareValues(readSortValue(a, column), readSortValue(b, column))
}

/**
 * 排序入口：返回一个新数组，不改原数组。
 * order 为空、或列不可排序时，按原顺序返回浅拷贝。
 */
export function sortRows(rows, column, order) {
  const list = Array.isArray(rows) ? rows.slice() : []
  const comparator = buildComparator(column)
  if (!order || !comparator) return list

  const factor = order === SORT_DESCEND ? -1 : 1

  return list
    .map((record, index) => ({ record, index }))
    .sort((left, right) => {
      const leftEmpty = isEmptySortValue(readSortValue(left.record, column))
      const rightEmpty = isEmptySortValue(readSortValue(right.record, column))

      if (leftEmpty || rightEmpty) {
        if (leftEmpty && rightEmpty) return left.index - right.index
        return leftEmpty ? 1 : -1
      }

      let compared = comparator(left.record, right.record)
      if (typeof compared !== 'number' || isNaN(compared)) compared = 0
      if (compared === 0) return left.index - right.index
      return compared * factor
    })
    .map((item) => item.record)
}

/** 点击表头时的状态循环：无 → 第一个方向 → …… → 到头后取消 */
export function nextSortOrder(current, directions) {
  const list = normalizeSortDirections(directions)
  const index = list.indexOf(current)
  if (index < 0) return list[0]
  if (index === list.length - 1) return null
  return list[index + 1]
}

/** 受控优先：传了 sortedInfo 就用它，否则用内部状态 */
export function resolveSortInfo(controlledInfo, innerInfo) {
  const source = controlledInfo || innerInfo
  if (!source || !source.columnKey || !source.order) return { columnKey: null, order: null }
  return { columnKey: source.columnKey, order: source.order }
}

/** 按 key 在列定义里递归找叶子列（分组列自己的 key 找不到子列时返回 null） */
export function findColumnByKey(columns, key) {
  const list = Array.isArray(columns) ? columns : []
  for (let i = 0; i < list.length; i += 1) {
    const column = list[i]
    const columnKey = String(column.key || column.dataIndex || 'col-' + i)
    if (columnKey === String(key) && !Array.isArray(column.children)) return column
    if (Array.isArray(column.children)) {
      const found = findColumnByKey(column.children, key)
      if (found) return found
    }
  }
  return null
}

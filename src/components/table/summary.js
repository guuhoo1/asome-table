/**
 * 合计行：复刻老壳 draggerTable.appendSummaryRow 的单元格规则。
 * 纯逻辑，不依赖 Vue；真正的渲染由兼容壳完成（老壳是 appendChild 注入 DOM，这里是真渲染）。
 */

/** 分组列的叶子列数（老实现 countLeafColumns） */
export function leafCountOf(column) {
  if (column && Array.isArray(column.children) && column.children.length) {
    return column.children.reduce((total, child) => total + leafCountOf(child), 0)
  }
  return 1
}

/**
 * 生成合计行的单元格：
 * - 有勾选列时，先占一个空单元格对齐（老实现行为）；
 * - 第一个数据列固定显示「合计」，其余列取 `summaryData[dataIndex || key]`；
 * - 分组列的 colspan = 其子列叶子数。
 */
export function summaryCellsOf(options) {
  const config = options || {}
  const columns = Array.isArray(config.columns) ? config.columns : []
  const summaryData = config.summaryData || {}
  const cells = []

  if (config.hasSelection) {
    cells.push({ key: '__selection', text: '', colspan: 1 })
  }

  columns.forEach((column, index) => {
    const key = column.key || column.dataIndex || 'col-' + index
    const isGroup = Array.isArray(column.children) && column.children.length > 0
    const value = summaryData[key]
    const isFirstDataCell = cells.filter((cell) => cell.key !== '__selection').length === 0

    cells.push({
      key,
      text: isFirstDataCell
        ? '合计'
        : value === undefined || value === null
          ? ''
          : String(value),
      colspan: isGroup ? leafCountOf(column) : 1
    })
  })

  return cells
}

/** 合计行整行的 colspan（用于 summaryRender 自定义渲染时占满一行） */
export function summarySpanOf(columns, hasSelection) {
  const span = (columns || []).reduce((total, column) => total + leafCountOf(column), 0)
  return span + (hasSelection ? 1 : 0)
}

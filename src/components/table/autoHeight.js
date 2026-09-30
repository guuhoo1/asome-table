/**
 * 自动高度：复刻老壳 AdvanceTable.updateTableHeight 的计算规则。
 *
 * 老实现：
 *   availableHeight = floor(window.innerHeight - tableRect.top - reservedHeight)
 *   scrollY = max(200, availableHeight)
 * 无数据或关掉「固定高度」时不做限制。
 *
 * 纯函数，不依赖 Vue / DOM。
 */
export function availableHeightOf(options) {
  const config = options || {}
  const viewportHeight = Number(config.viewportHeight) || 0
  const tableTop = Number(config.tableTop) || 0
  const reservedHeight = Number(config.reservedHeight) || 0
  const minHeight = Number(config.minHeight) > 0 ? Number(config.minHeight) : 200

  return Math.max(minHeight, Math.floor(viewportHeight - tableTop - reservedHeight))
}

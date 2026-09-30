/** 文档站里每个示例都是一张 .demo-block 卡片，用标题文字定位 */
export function demo(page, title) {
  return page.locator('.demo-block').filter({ hasText: title })
}

/** 示例里表格的行 */
export function rows(block) {
  return block.locator('tbody tr.sgt-row')
}

/** 表头单元格（按列 key） */
export function header(block, key) {
  return block.locator(`thead [data-sgt-header-key="${key}"]`)
}

/** 某一列所有单元格的文本 */
export function columnTexts(block, key) {
  return rows(block).evaluateAll(
    (list, columnKey) =>
      list.map((tr) => {
        const cell = tr.querySelector(`td[data-sgt-key="${columnKey}"]`)
        return cell ? cell.textContent.trim() : null
      }),
    key
  )
}

/** 行顺序（按订单号列） */
export function rowOrder(block) {
  return columnTexts(block, 'no')
}

/** 某列每个格子的 rowspan（被合并掉的返回 'skipped'） */
export function rowSpans(block, key) {
  return rows(block).evaluateAll(
    (list, columnKey) =>
      list.map((tr) => {
        const cell = tr.querySelector(`td[data-sgt-key="${columnKey}"]`)
        return cell ? cell.getAttribute('rowspan') || '1' : 'skipped'
      }),
    key
  )
}

/** 打开某个示例的源码（顺带验证「显示代码」可用） */
export async function expandSource(block) {
  await block.getByRole('button', { name: '显示代码' }).click()
  await block.locator('.docs-code').waitFor({ state: 'visible' })
}

/**
 * 把元素滚到视口中间。
 * 文档页顶部有一条 sticky 导航栏：Playwright 默认把目标滚到顶部时会撞上它，
 * 表现为「被 .docs-header 拦截点击」或鼠标坐标落在导航栏上。
 */
export async function centerOn(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'center' }))
}

/** 居中后点击 */
export async function safeClick(locator) {
  await centerOn(locator)
  await locator.click()
}

/** 点击某个列的表头 */
export function clickHeader(block, key) {
  return safeClick(header(block, key))
}

/**
 * 取元素当前的中心点（不触发滚动）。
 * 拖动场景里要「先 centerOn 一次，再连续取多个元素的中心」，
 * 否则第二次滚动会让第一个元素的位置失效、起点坐标变旧。
 */
export async function boxCenter(locator) {
  const box = await locator.boundingBox()
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** 滚到中间后再取中心点（单个元素时用） */
export async function centerPoint(locator) {
  await centerOn(locator)
  return boxCenter(locator)
}

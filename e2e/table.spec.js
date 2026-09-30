import { test, expect } from '@playwright/test'
import {
  boxCenter,
  centerOn,
  centerPoint,
  clickHeader,
  columnTexts,
  demo,
  header,
  rows,
  rowSpans,
  safeClick
} from './helpers.js'

test.describe('表格内核', () => {
  test('两行分组表头：分组跨列、普通列占满两行、徽章与空值占位', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '两行分组表头')
    const headRows = block.locator('thead tr')

    await expect(headRows).toHaveCount(2)
    await expect(block.locator('thead .sgt-group-cell')).toHaveCount(4)
    // 勾选列表头与「订单号」都用 rowspan=2 占满两行
    await expect(block.locator('thead th[rowspan="2"]')).toHaveCount(2)
    await expect(block.locator('.sgt-badge').first()).toHaveText('已发货')
    // 第 2 行备注是空的，应该显示占位符
    expect(await columnTexts(block, 'remark')).toEqual(['尽快发货', '-', '已签收', '-', '客户催单', '-'])
  })

  test('横向滚动阴影：滑动后左右两侧的 class 正确切换', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '两行分组表头')
    const wrap = block.locator('.sgt-wrap')
    const scroll = block.locator('.sgt-scroll')

    // 初始在最左：只有右侧阴影
    await expect(wrap).toHaveClass(/is-end/)
    await expect(wrap).not.toHaveClass(/is-start/)

    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })
    await expect(wrap).toHaveClass(/is-start/)
    await expect(wrap).not.toHaveClass(/is-end/)

    await scroll.evaluate((el) => {
      el.scrollLeft = Math.round((el.scrollWidth - el.clientWidth) / 2)
    })
    await expect(wrap).toHaveClass(/is-start/)
    await expect(wrap).toHaveClass(/is-end/)
  })

  test('表头吸顶：纵向滚到底后两行表头分别停在 0 / 42px', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '两行分组表头')
    const scroll = block.locator('.sgt-scroll')

    await scroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })

    const offsets = await block.locator('thead tr').evaluateAll((list) =>
      list.map((tr) => {
        const container = tr.closest('.sgt-scroll').getBoundingClientRect()
        return Math.round(tr.children[0].getBoundingClientRect().top - container.top)
      })
    )
    expect(offsets).toEqual([0, 42])
  })

  test('冻结列：横滑到最右后勾选框与订单号仍贴在容器左侧', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '冻结勾选框')
    const scroll = block.locator('.sgt-scroll')

    await scroll.evaluate((el) => {
      el.scrollLeft = el.scrollWidth
    })

    const offsets = await rows(block)
      .first()
      .locator('td.sgt-fixed-left')
      .evaluateAll((cells, el) => {
        const container = el.getBoundingClientRect()
        return cells.map((cell) => ({
          key: cell.getAttribute('data-sgt-key') || 'selection',
          offset: Math.round(cell.getBoundingClientRect().left - container.left)
        }))
      }, await scroll.elementHandle())

    expect(offsets).toEqual([
      { key: 'selection', offset: 0 },
      { key: 'no', offset: 46 }
    ])
  })

  test('合并单元格：同值合并、空值不合并', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '同值合并')

    expect(await rowSpans(block, 'dept')).toEqual([
      '5',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
      '1'
    ])
    // 交货日期有两行为空，空值不参与合并
    expect(await rowSpans(block, 'deliveryDate')).toEqual(['1', '1', '1', '1', '1', '1'])
    expect((await columnTexts(block, 'deliveryDate')).filter((text) => text === '-')).toHaveLength(2)
  })

  test('可编辑：必填拦截、Esc 取消、数字下限', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '文本框 / 数字 / 下拉')
    const firstRow = rows(block).first()

    // 客户必填：清空后失焦应报错且不提交
    const customer = firstRow.locator('td[data-sgt-key="customer"]')
    await safeClick(customer)
    const editor = block.locator('.sgt-editor')
    await editor.fill('')
    await editor.blur()
    await expect(block.locator('.sgt-editor-error')).toHaveText('客户不能为空')
    await expect(editor).toBeVisible()

    // Esc 取消后原值不变
    await editor.fill('不该生效')
    await editor.press('Escape')
    await expect(customer).toHaveText('张三')

    // 数量下限：0 不通过，7 通过
    const qty = firstRow.locator('td[data-sgt-key="qty"]')
    await safeClick(qty)
    await expect(block.locator('.sgt-editor')).toHaveAttribute('type', 'number')
    await block.locator('.sgt-editor').fill('0')
    await block.locator('.sgt-editor').blur()
    await expect(block.locator('.sgt-editor-error')).toHaveText('不能小于 1')
    await block.locator('.sgt-editor').fill('7')
    await block.locator('.sgt-editor').blur()
    await expect(qty).toHaveText('7')
  })

  test('可编辑：日期与日期时间用原生控件', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, 'date 与 datetime')
    const dateRow = rows(block).first()

    await safeClick(dateRow.locator('td[data-sgt-key="orderTime"]'))
    await expect(block.locator('.sgt-editor')).toHaveAttribute('type', 'datetime-local')
    await expect(block.locator('.sgt-editor')).toHaveValue('2024-03-01T09:12')
    await block.locator('.sgt-editor').press('Escape')

    await safeClick(dateRow.locator('td[data-sgt-key="deliveryDate"]'))
    await expect(block.locator('.sgt-editor')).toHaveAttribute('type', 'date')
    await block.locator('.sgt-editor').fill('2024-03-09')
    // 用回车提交：日期控件上「fill 后立刻 blur」会和组件自动聚焦的时序打架
    await block.locator('.sgt-editor').press('Enter')
    await expect(dateRow.locator('td[data-sgt-key="deliveryDate"]')).toHaveText('2024-03-09')
  })

  test('勾选：全选、半选、禁用行不参与', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '受控勾选 + 禁用行')
    const headCheckbox = block.locator('thead input[type="checkbox"]')
    const bodyCheckboxes = block.locator('tbody input[type="checkbox"]')

    await expect(bodyCheckboxes).toHaveCount(4)
    await expect(bodyCheckboxes.nth(3)).toBeDisabled()

    await safeClick(headCheckbox)
    await expect(headCheckbox).toBeChecked()
    await expect(block.locator('tbody tr.is-selected')).toHaveCount(3)

    await safeClick(bodyCheckboxes.nth(0))
    await expect(headCheckbox).not.toBeChecked()
    expect(await headCheckbox.evaluate((el) => el.indeterminate)).toBe(true)
  })

  test('拖宽：拖动改宽、双击复位、单列可关', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '拖动表头改列宽')
    const widthOf = (key) => header(block, key).evaluate((el) => Math.round(el.getBoundingClientRect().width))

    const before = await widthOf('product')
    const resizer = block.locator('.sgt-resizer[data-sgt-resizer="product"]')
    await centerOn(resizer)
    const box = await resizer.boundingBox()
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 62, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()
    expect(await widthOf('product')).toBeGreaterThan(before + 40)

    await block.locator('.sgt-resizer[data-sgt-resizer="product"]').dblclick()
    expect(await widthOf('product')).toBe(120)

    // 「备注」列写了 resizable: false
    await expect(block.locator('.sgt-resizer[data-sgt-resizer="remark"]')).toHaveCount(0)
  })

  test('拖序：顶层换位、冻结列拖不出去、落点提示线', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '拖动表头换位置')
    const topKeys = () =>
      block
        .locator('.sgt-head-row-1 [data-sgt-header-key]')
        .evaluateAll((list) => list.map((el) => el.getAttribute('data-sgt-header-key')))

    expect(await topKeys()).toEqual(['no', 'group-some', 'qty', 'amount'])

    // 把「数量」拖到分组「客户与商品」左边（落在目标左半边 = 插到它前面）
    // 注意不能拖到 y 右侧边缘之外：窄屏上坐标会被视口夹住，落点会算成原位
    // 只滚动一次，再取两个相邻表头的当前中心，避免二次滚动让起点失效
    await centerOn(header(block, 'qty'))
    const from = await boxCenter(header(block, 'qty'))
    const to = await boxCenter(header(block, 'group-some'))
    await page.mouse.move(from.x, from.y)
    await page.mouse.down()
    await page.mouse.move(to.x - 20, to.y, { steps: 10 })
    await expect(block.locator('.sgt-drag-ghost')).toBeVisible()
    await expect(block.locator('thead .is-drop-before')).toHaveCount(1)
    await page.mouse.up()
    expect(await topKeys()).toEqual(['no', 'qty', 'group-some', 'amount'])

    // 冻结的订单号拖不出去
    await centerOn(header(block, 'no'))
    const frozen = await boxCenter(header(block, 'no'))
    const target = await boxCenter(header(block, 'qty'))
    await page.mouse.move(frozen.x, frozen.y)
    await page.mouse.down()
    await page.mouse.move(target.x, target.y, { steps: 10 })
    await page.mouse.up()
    expect(await topKeys()).toEqual(['no', 'qty', 'group-some', 'amount'])
  })

  test('对齐：勾选框居中、右对齐列真的右对齐', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '两行分组表头')
    const selection = block.locator('tbody .sgt-selection-cell').first()
    const checkbox = selection.locator('input')

    const delta = await selection.evaluate((cell, el) => {
      const box = el.getBoundingClientRect()
      const cellBox = cell.getBoundingClientRect()
      return Math.round(box.left + box.width / 2 - (cellBox.left + cellBox.width / 2))
    }, await checkbox.elementHandle())
    expect(Math.abs(delta)).toBeLessThanOrEqual(1)
    await expect(selection).toHaveCSS('text-align', 'center')

    const rightCell = block.locator('tbody td.sgt-align-right').first()
    await expect(rightCell).toHaveCSS('text-align', 'right')
  })

  test('空数据：单行表头 + 空态插槽 + colspan', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '空态 + 扁平列')

    await expect(block.locator('thead tr')).toHaveCount(1)
    const emptyCell = block.locator('.sgt-empty-cell')
    await expect(emptyCell).toHaveText('没有符合条件的订单')
    await expect(emptyCell).toHaveAttribute('colspan', '5')
  })

  test('列宽与列序拖拽可以同时开启', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '拖宽 + 拖顺序一起开')
    // 订单号 + 分组(客户/商品名称) + 数量 + 分组(单价/金额) = 6 个叶子列
    await expect(block.locator('.sgt-resizer')).toHaveCount(6)
    await expect(block.locator('.sgt-head-row-1 [data-sgt-header-key]')).toHaveCount(4)
  })
})

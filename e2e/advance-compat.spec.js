import { test, expect } from '@playwright/test'
import { centerOn, demo, rows, safeClick } from './helpers.js'

test.describe('兼容壳 AdvanceTableCompat', () => {
  test('标题栏、默认居中、列名插槽、选中提示条与 refresh', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')
    const firstRow = rows(block).first()

    // 标题栏
    await expect(block.locator('.atc-header .atc-title')).toHaveText('订单列表')

    // 默认居中：列上没写 align 的「状态」列
    await expect(firstRow.locator('td[data-sgt-key="status"]')).toHaveCSS('text-align', 'center')

    // 列名插槽覆盖了「客户」列的渲染
    await expect(firstRow.locator('td[data-sgt-key="customer"]')).toHaveText('1. 张三')

    // 选中提示条 + 清空
    await safeClick(block.locator('tbody input[type="checkbox"]').first())
    await expect(block.locator('.atc-alert')).toContainText('已选择：1 条')
    await safeClick(block.locator('.atc-alert-clear'))
    await expect(block.locator('.atc-alert')).toHaveCount(0)

    // 刷新按钮 → refresh 事件
    await safeClick(block.getByRole('button', { name: '刷新' }))
    await expect(block.locator('.demo-hint')).toContainText('收到 refresh 事件')
  })

  test('列宽与列序拖拽默认开启（对应老壳 drag 默认 true）', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')

    await expect(block.locator('.sgt-resizer').first()).toBeVisible()
    await expect(block.locator('.sgt-head-row-1 [data-sgt-header-key]').first()).toBeVisible()
  })

  test('双击行触发 dblclickRow', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')

    await rows(block).first().dblclick()
    await expect(block.locator('.demo-hint')).toContainText('收到 dblclickRow：SO-20240001')
  })

  test('列宽与列序按老壳 key 规则持久化，刷新后恢复', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')
    const widthOf = (key) =>
      block
        .locator(`thead [data-sgt-header-key="${key}"]`)
        .evaluate((el) => Math.round(el.getBoundingClientRect().width))

    const before = await widthOf('customer')
    const resizer = block.locator('.sgt-resizer[data-sgt-resizer="customer"]')
    await centerOn(resizer)
    const box = await resizer.boundingBox()
    await page.mouse.move(box.x + 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 62, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()

    const after = await widthOf('customer')
    expect(after).toBeGreaterThan(before + 40)

    // 存到了老壳同款 key 上：<storageKey>_<base36 hash>
    const stored = await page.evaluate(() => {
      const key = Object.keys(window.localStorage).find((item) => item.startsWith('atc-demo_'))
      return key ? { key, value: JSON.parse(window.localStorage.getItem(key)) } : null
    })
    expect(stored).not.toBeNull()
    expect(stored.key).toMatch(/^atc-demo_-?[0-9a-z]+$/)
    expect(stored.value.some((item) => item.dataIndex === 'customer' && item.width > 150)).toBe(true)

    // 刷新后列宽从缓存恢复
    await page.reload()
    expect(await widthOf('customer')).toBe(after)
  })

  test('分页：渲染页码、翻页发 change 事件、序号列跟随页码', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')

    await expect(block.locator('.atc-pagination')).toContainText('共 4 条')
    // 第 1 页：序号从 1 开始（pageSize=2，只显示 2 行）
    await expect(rows(block)).toHaveCount(2)
    await expect(rows(block).first().locator('td[data-sgt-key="serial"]')).toHaveText('1')

    await safeClick(block.locator('.atc-pagination .atc-page-btn', { hasText: '2' }))

    await expect(block.locator('.demo-hint')).toContainText('change: current=2, pageSize=2')
    await expect(rows(block).first().locator('td[data-sgt-key="serial"]')).toHaveText('3')
  })

  test('列显隐：取消勾选即隐藏，全选与重置恢复', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')

    await safeClick(block.locator('.atc-columns-btn'))
    const panel = block.locator('.atc-columns-panel')
    await expect(panel).toBeVisible()

    await panel.locator('input[data-column-key="customer"]').uncheck()
    await expect(block.locator('thead [data-sgt-header-key="customer"]')).toHaveCount(0)
    await expect(block.locator('thead [data-sgt-header-key="status"]')).toHaveCount(1)

    await panel.locator('.atc-columns-all input').check()
    await expect(block.locator('thead [data-sgt-header-key="customer"]')).toHaveCount(1)

    await panel.locator('input[data-column-key="status"]').uncheck()
    await safeClick(panel.getByRole('button', { name: '重置' }))
    await expect(block.locator('thead [data-sgt-header-key="status"]')).toHaveCount(1)
  })
})

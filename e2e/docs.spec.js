import { test, expect } from '@playwright/test'
import { demo, expandSource, rows, safeClick } from './helpers.js'

test.describe('文档站', () => {
  test('导航、章节与示例卡片一一对应', async ({ page }) => {
    await page.goto('/')

    const navItems = page.locator('.docs-nav a')
    await expect(navItems).toHaveCount(16)

    const sectionIds = await page
      .locator('.docs-section')
      .evaluateAll((list) => list.map((el) => el.id))
    expect(sectionIds).toEqual([
      'intro',
      'install',
      'basic',
      'selection',
      'frozen',
      'merge',
      'editable',
      'date',
      'empty',
      'resize',
      'reorder',
      'sort',
      'column-compat',
      'advance-compat',
      'diff',
      'api'
    ])

    const blocks = page.locator('.demo-block')
    await expect(blocks).toHaveCount(15)

    // 每个示例卡片都要渲染出表格
    const tablesPerBlock = await blocks.evaluateAll((list) =>
      list.map((block) => block.querySelectorAll('.demo-preview table.sgt-table').length)
    )
    expect(tablesPerBlock.every((count) => count === 1)).toBe(true)
  })

  test('源码块：默认折叠、展开后有高亮、可复制、可收起', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '同值合并')

    // 默认折叠（v-show 隐藏）
    await expect(block.locator('.docs-code')).toBeHidden()

    await expandSource(block)
    await expect(block.locator('.docs-code .tok-tag').first()).toBeVisible()
    await expect(block.locator('.docs-code')).toContainText('merge: true')
    await expect(block.locator('.docs-code')).toContainText('merge: (record, prevRecord')

    const copyButton = block.getByRole('button', { name: '复制代码' })
    await safeClick(copyButton)
    await expect(block.getByRole('button', { name: '已复制' })).toBeVisible()

    await block.getByRole('button', { name: '隐藏代码' }).click()
    await expect(block.locator('.docs-code')).toBeHidden()
  })

  test('锚点：点导航会改 hash、高亮当前项，并停在吸顶栏下方', async ({ page }) => {
    await page.goto('/')
    const lastNav = page.locator('.docs-nav a').last()
    await lastNav.click()

    await expect(page).toHaveURL(/#api$/)
    await expect(page.locator('.docs-nav a.active')).toHaveText('Props / 事件 / 插槽')

    const top = await page.locator('#api').evaluate((el) => Math.round(el.getBoundingClientRect().top))
    expect(top).toBeGreaterThanOrEqual(0)
    expect(top).toBeLessThanOrEqual(120)
  })

  test('API 表把排序相关字段都列出来了', async ({ page }) => {
    await page.goto('/')
    const apiSection = page.locator('#api')
    await expect(apiSection).toContainText('sortedInfo')
    await expect(apiSection).toContainText('sorter')
    await expect(apiSection).toContainText('sort-change')
    await expect(apiSection).toContainText('update:sortedInfo')
    await expect(apiSection).toContainText('originalRowIndexes')
  })

  test('文档页与对照页控制台都没有报错', async ({ page }) => {
    const errors = []
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('404')) {
        errors.push(message.text())
      }
    })
    page.on('pageerror', (error) => errors.push(String(error)))
    // 404 单独记，带上具体 URL，失败信息才看得出是哪个资源
    page.on('response', (response) => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`)
    })

    await page.goto('/')
    await expect(page.locator('.demo-block').first()).toBeVisible()

    await page.goto('/demo.html')
    await expect(page.locator('.sgt-table').first()).toBeVisible()
    await expect(rows(page.locator('.sgt-wrap').first())).toHaveCount(8)

    expect(errors).toEqual([])
  })
})

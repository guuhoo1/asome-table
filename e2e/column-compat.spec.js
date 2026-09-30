import { test, expect } from '@playwright/test'
import { columnTexts, demo, rows } from './helpers.js'

test.describe('列级兼容', () => {
  test('isSerialNumber 生成序号、formatter 格式化、isSubObj 深层取值', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')

    await expect(rows(block)).toHaveCount(3)
    expect(await columnTexts(block, 'serial')).toEqual(['1', '2', '3'])
    expect(await columnTexts(block, 'amount')).toEqual(['¥299', '¥1599', '¥88'])
    expect(await columnTexts(block, 'customerName')).toEqual(['张三', '李四', '王五'])
    expect(await columnTexts(block, 'customerTag')).toEqual(['VIP', '普通', 'VIP'])
  })

  test('ellipsis 截断并补 title，空值仍显示占位符', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')
    const remark = rows(block).first().locator('td[data-sgt-key="remark"]')
    const tag = rows(block).first().locator('td[data-sgt-key="customerTag"]')

    await expect(remark).toHaveCSS('text-overflow', 'ellipsis')
    await expect(remark).toHaveText('-')
    await expect(tag).toHaveAttribute('title', 'VIP')
  })

  test('不写这些字段的列行为不变', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')

    expect(await columnTexts(block, 'no')).toEqual(['SO-01', 'SO-02', 'SO-03'])
    await expect(rows(block).first().locator('td[data-sgt-key="no"]')).not.toHaveAttribute(
      'title',
      /./
    )
  })
})

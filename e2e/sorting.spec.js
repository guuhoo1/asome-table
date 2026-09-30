import { test, expect } from '@playwright/test'
import {
  clickHeader,
  columnTexts,
  demo,
  header,
  rowOrder,
  rows,
  rowSpans,
  safeClick
} from './helpers.js'

const ORIGINAL = ['SO-20240001', 'SO-20240002', 'SO-20240003', 'SO-20240004']

test.describe('行排序', () => {
  test('点表头在升序 / 降序 / 取消之间循环', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '点表头排序')
    await expect(rows(block)).toHaveCount(4)
    expect(await rowOrder(block)).toEqual(ORIGINAL)

    // 升序：1、2、3，空值最后
    await clickHeader(block, 'qty')
    await expect(header(block, 'qty')).toHaveAttribute('aria-sort', 'ascending')
    expect(await rowOrder(block)).toEqual([
      'SO-20240002',
      'SO-20240003',
      'SO-20240001',
      'SO-20240004'
    ])

    // 降序：3、2、1，空值仍然最后
    await clickHeader(block, 'qty')
    await expect(header(block, 'qty')).toHaveAttribute('aria-sort', 'descending')
    expect(await rowOrder(block)).toEqual([
      'SO-20240001',
      'SO-20240003',
      'SO-20240002',
      'SO-20240004'
    ])

    // 第三次点击取消排序
    await clickHeader(block, 'qty')
    await expect(header(block, 'qty')).toHaveAttribute('aria-sort', 'none')
    expect(await rowOrder(block)).toEqual(ORIGINAL)
  })

  test('空值在升序和降序里都排最后', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '点表头排序')

    await clickHeader(block, 'deliveryDate')
    expect(await rowOrder(block)).toEqual([
      'SO-20240003',
      'SO-20240001',
      'SO-20240004',
      'SO-20240002'
    ])

    await clickHeader(block, 'deliveryDate')
    expect(await rowOrder(block)).toEqual([
      'SO-20240004',
      'SO-20240001',
      'SO-20240003',
      'SO-20240002'
    ])
  })

  test('排序只改显示顺序，父数组顺序不变；排序状态下编辑按 record 回写', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '点表头排序')
    const hint = block.locator('.demo-hint')
    const orderText = async () => (await hint.textContent()).match(/数据顺序：([^｜\s]*)/)[1]
    const dataOrder = 'SO-20240001,SO-20240002,SO-20240003,SO-20240004'

    await clickHeader(block, 'customer')
    await expect(header(block, 'customer')).toHaveAttribute('aria-sort', 'ascending')
    const sorted = await rowOrder(block)
    expect(sorted).not.toEqual(ORIGINAL) // 显示顺序确实变了
    expect(await orderText()).toBe(dataOrder) // 但父数组没被动

    // 排好序后编辑第一行的客户
    const target = sorted[0]
    const cell = rows(block)
      .filter({ has: page.locator(`td[data-sgt-key="no"]`, { hasText: target }) })
      .locator('td[data-sgt-key="customer"]')
    await safeClick(cell)
    const editor = block.locator('.sgt-editor')
    await expect(editor).toBeVisible()
    await editor.fill('测试改名')
    await editor.press('Enter')

    await expect(cell).toHaveText('测试改名')
    expect(await orderText()).toBe(dataOrder) // 编辑没有打乱父数组顺序
  })

  test('排序与合并共存：合并范围按当前显示顺序重算', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '排序与合并共存')

    expect(await rowSpans(block, 'dept')).toEqual(['2', 'skipped', '2', 'skipped'])

    await clickHeader(block, 'qty')
    expect(await rowOrder(block)).toEqual(['SO-01', 'SO-03', 'SO-04', 'SO-02'])
    // 华东被打散，华南两行重新合并
    expect(await rowSpans(block, 'dept')).toEqual(['1', '2', 'skipped', '1'])
    expect(await columnTexts(block, 'dept')).toEqual(['华东', '华南', null, '华东'])
  })

  test('没有 sorter 的列点了没反应', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '点表头排序')
    await clickHeader(block, 'no')
    await expect(header(block, 'no')).not.toHaveAttribute('aria-sort', 'ascending')
    expect(await rowOrder(block)).toEqual(ORIGINAL)
  })
})

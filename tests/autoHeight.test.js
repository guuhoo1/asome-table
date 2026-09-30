import test from 'node:test'
import assert from 'node:assert/strict'
import { availableHeightOf } from '../src/components/table/autoHeight.js'

test('按「视口高 − 表格顶部 − 预留高度」计算，并夹到最小高度', () => {
  assert.equal(availableHeightOf({ viewportHeight: 900, tableTop: 300, reservedHeight: 110 }), 490)
  assert.equal(availableHeightOf({ viewportHeight: 900, tableTop: 100, reservedHeight: 0 }), 800)
  // 空间不足时夹到 200（老壳的最小高度）
  assert.equal(availableHeightOf({ viewportHeight: 400, tableTop: 700, reservedHeight: 110 }), 200)
  // minHeight 可覆盖
  assert.equal(
    availableHeightOf({ viewportHeight: 400, tableTop: 700, reservedHeight: 110, minHeight: 300 }),
    300
  )
  // 小数向下取整
  assert.equal(availableHeightOf({ viewportHeight: 900.8, tableTop: 300.2, reservedHeight: 110 }), 490)
})

test('参数缺失时按 0 处理，不会返回 NaN', () => {
  assert.equal(availableHeightOf({}), 200)
  // reservedHeight 的默认值 110 属于组件 prop，纯函数里缺失按 0 算
  assert.equal(availableHeightOf({ viewportHeight: 900 }), 900)
  assert.equal(availableHeightOf({ viewportHeight: 900, reservedHeight: 110 }), 790)
})

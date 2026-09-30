import test from 'node:test'
import assert from 'node:assert/strict'
import { leafCountOf, summaryCellsOf, summarySpanOf } from '../src/components/table/summary.js'

const columns = [
  { key: 'no' },
  { key: 'group-amount', children: [{ dataIndex: 'amount' }, { dataIndex: 'tax' }] },
  { dataIndex: 'status' }
]

test('leafCountOf 统计分组列的叶子数', () => {
  assert.equal(leafCountOf({ key: 'no' }), 1)
  assert.equal(leafCountOf({ key: 'g', children: [{ key: 'a' }, { key: 'b' }] }), 2)
  assert.equal(
    leafCountOf({ key: 'g', children: [{ key: 'a', children: [{}, {}] }, { key: 'b' }] }),
    3
  )
})

test('summaryCellsOf：首列「合计」、分组列跨子列、其余取 summaryData', () => {
  const cells = summaryCellsOf({
    columns,
    // 注意：老实现按**顶层列**的 key 取值，分组列要用分组自己的 key
    summaryData: { 'group-amount': '¥100', status: '3 条' }
  })

  assert.deepEqual(cells, [
    { key: 'no', text: '合计', colspan: 1 },
    { key: 'group-amount', text: '¥100', colspan: 2 },
    { key: 'status', text: '3 条', colspan: 1 }
  ])
})

test('summaryCellsOf：有勾选列时先占一格空位', () => {
  const cells = summaryCellsOf({ columns, summaryData: {}, hasSelection: true })

  assert.deepEqual(cells[0], { key: '__selection', text: '', colspan: 1 })
  assert.equal(cells[1].text, '合计')
  assert.equal(cells.length, 4)
})

test('summaryCellsOf：没有值的位置留空，0 会正常显示', () => {
  const cells = summaryCellsOf({ columns, summaryData: { tax: 0 } })

  assert.equal(cells[1].text, '') // 分组列的 key 是 group-amount，没给值
  assert.equal(cells[2].text, '')
  assert.equal(summaryCellsOf({ columns: [{ key: 'a' }, { key: 'b' }], summaryData: { b: 0 } })[1].text, '0')
})

test('summarySpanOf 返回整行占满所需的列数', () => {
  assert.equal(summarySpanOf(columns, false), 4)
  assert.equal(summarySpanOf(columns, true), 5)
})

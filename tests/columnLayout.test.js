import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyColumnOrder,
  applyWidthOverrides,
  clampColumnWidth,
  collectOrderMap,
  columnKeyOf,
  moveWithinList,
  sameKeyOrder
} from '../src/components/table/columnLayout.js'

const columns = [
  { title: '订单号', dataIndex: 'no', width: 130 },
  {
    title: '金额',
    key: 'group-amount',
    children: [
      { title: '单价', dataIndex: 'price', width: 90 },
      { title: '金额', dataIndex: 'amount', width: 100 }
    ]
  },
  { title: '状态', key: 'status', width: 90 }
]

test('columnKeyOf 的推导与组件一致', () => {
  assert.equal(columnKeyOf({ key: 'k', dataIndex: 'd' }, 0, '__root'), 'k')
  assert.equal(columnKeyOf({ dataIndex: 'd' }, 0, '__root'), 'd')
  assert.equal(columnKeyOf({ title: '无 key' }, 2, '__root'), 'col-2')
  assert.equal(columnKeyOf({ title: '分组子列' }, 1, 'group-amount'), 'group-amount-1')
})

test('clampColumnWidth 认上下限，max 为 0 表示不限', () => {
  assert.equal(clampColumnWidth(120, 60, 0), 120)
  assert.equal(clampColumnWidth(10, 60, 0), 60)
  assert.equal(clampColumnWidth(999, 60, 300), 300)
  assert.equal(clampColumnWidth('abc', 60, 0), 60)
  assert.equal(clampColumnWidth(-5, 60, 0), 60)
})

test('moveWithinList 前后移动都对，越界夹取', () => {
  assert.deepEqual(moveWithinList(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a'])
  assert.deepEqual(moveWithinList(['a', 'b', 'c'], 2, 0), ['c', 'a', 'b'])
  assert.deepEqual(moveWithinList(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c'])
  assert.deepEqual(moveWithinList(['a', 'b', 'c'], 1, 99), ['a', 'c', 'b'])
  assert.deepEqual(moveWithinList(['a', 'b', 'c'], -1, 0), ['a', 'b', 'c'])
})

test('collectOrderMap 采集每一层的 key 顺序', () => {
  const map = collectOrderMap(columns)

  assert.deepEqual(map.__root, ['no', 'group-amount', 'status'])
  assert.deepEqual(map['group-amount'], ['price', 'amount'])
})

test('applyColumnOrder 按 orderMap 重排顶层与分组内', () => {
  const map = { __root: ['status', 'no', 'group-amount'], 'group-amount': ['amount', 'price'] }
  const sorted = applyColumnOrder(columns, map)

  assert.deepEqual(sorted.map((column) => columnKeyOf(column, 0, '__root')), [
    'status',
    'no',
    'group-amount'
  ])
  assert.deepEqual(
    sorted[2].children.map((child, index) => columnKeyOf(child, index, 'group-amount')),
    ['amount', 'price']
  )
  // 不改原数组
  assert.equal(columns[0].dataIndex, 'no')
})

test('orderMap 缺列时新列追加到末尾，不丢列', () => {
  const sorted = applyColumnOrder(columns, { __root: ['status'] })
  const keys = sorted.map((column, index) => columnKeyOf(column, index, '__root'))

  assert.deepEqual(keys, ['status', 'no', 'group-amount'])
})

test('applyWidthOverrides 递归改宽且不改原对象', () => {
  const next = applyWidthOverrides(columns, { no: 200, amount: 150 })

  assert.equal(next[0].width, 200)
  assert.equal(next[1].children[1].width, 150)
  assert.equal(next[1].children[0].width, 90)
  assert.equal(columns[0].width, 130)
})

test('sameKeyOrder 比较顺序', () => {
  assert.equal(sameKeyOrder(['a', 'b'], ['a', 'b']), true)
  assert.equal(sameKeyOrder(['a', 'b'], ['b', 'a']), false)
  assert.equal(sameKeyOrder(['a'], ['a', 'b']), false)
  assert.equal(sameKeyOrder(null, []), true)
})

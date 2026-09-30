import test from 'node:test'
import assert from 'node:assert/strict'
import {
  SORT_ASCEND,
  SORT_DESCEND,
  buildComparator,
  compareValues,
  findColumnByKey,
  nextSortOrder,
  normalizeSortDirections,
  readSortValue,
  resolveSortInfo,
  sortRows
} from '../src/components/table/sort.js'

const rows = [
  { no: 'A', qty: 3, name: '张三', amount: '¥299.00' },
  { no: 'B', qty: 1, name: '李四', amount: '' },
  { no: 'C', qty: 2, name: '王五', amount: '¥159.00' },
  { no: 'D', qty: null, name: '赵六', amount: '¥599.00' }
]

const qtyColumn = { title: '数量', dataIndex: 'qty', sorter: true }
const plainColumn = { title: '订单号', dataIndex: 'no' }

test('normalizeSortDirections 只认两个方向，缺省给升序降序', () => {
  assert.deepEqual(normalizeSortDirections(), [SORT_ASCEND, SORT_DESCEND])
  assert.deepEqual(normalizeSortDirections([]), [SORT_ASCEND, SORT_DESCEND])
  assert.deepEqual(normalizeSortDirections(['foo', SORT_DESCEND]), [SORT_DESCEND])
})

test('compareValues 数字比大小、字符串本地化比较', () => {
  assert.equal(compareValues(2, 10), -1)
  assert.equal(compareValues('2', '10'), -1)
  assert.equal(compareValues(5, 5), 0)
  assert.equal(compareValues('apple', 'banana') < 0, true)
  assert.equal(compareValues('张三', '张三'), 0)
  // 中文按拼音排序（李 lǐ < 张 zhāng），这里只断言「反对称」，不写死具体顺序
  assert.equal(compareValues('张三', '李四'), -compareValues('李四', '张三'))
})

test('readSortValue 缺 dataIndex 时回退 key', () => {
  assert.equal(readSortValue({ k: 1 }, { key: 'k' }), 1)
  assert.equal(readSortValue({ k: 1 }, { key: 'k', dataIndex: 'other' }), undefined)
  assert.equal(readSortValue(null, { key: 'k' }), undefined)
})

test('不可排序的列 buildComparator 返回 null，sortRows 原样浅拷贝', () => {
  assert.equal(buildComparator(plainColumn), null)
  const sorted = sortRows(rows, plainColumn, SORT_ASCEND)
  assert.deepEqual(sorted.map((row) => row.no), ['A', 'B', 'C', 'D'])
  assert.notEqual(sorted, rows)
})

test('升序：数字从小到大，空值排最后', () => {
  const sorted = sortRows(rows, qtyColumn, SORT_ASCEND)
  assert.deepEqual(sorted.map((row) => row.no), ['B', 'C', 'A', 'D'])
})

test('降序：数字从大到小，空值仍然排最后', () => {
  const sorted = sortRows(rows, qtyColumn, SORT_DESCEND)
  assert.deepEqual(sorted.map((row) => row.no), ['A', 'C', 'B', 'D'])
})

test('空值之间保持原顺序（稳定）', () => {
  const list = [
    { no: 'A', v: '' },
    { no: 'B', v: 2 },
    { no: 'C', v: null },
    { no: 'D', v: '' }
  ]
  const column = { key: 'v', dataIndex: 'v', sorter: true }
  assert.deepEqual(sortRows(list, column, SORT_ASCEND).map((row) => row.no), ['B', 'A', 'C', 'D'])
})

test('相同值维持原始相对顺序', () => {
  const list = [
    { no: 'A', v: 1 },
    { no: 'B', v: 1 },
    { no: 'C', v: 1 }
  ]
  const column = { key: 'v', dataIndex: 'v', sorter: true }
  assert.deepEqual(sortRows(list, column, SORT_ASCEND).map((row) => row.no), ['A', 'B', 'C'])
})

test('sorter 是函数时用你的比较函数', () => {
  const column = {
    key: 'no',
    dataIndex: 'no',
    // 故意反着比：按订单号「倒序」当作升序
    sorter: (a, b) => (a.no < b.no ? 1 : a.no > b.no ? -1 : 0)
  }
  assert.deepEqual(sortRows(rows, column, SORT_ASCEND).map((row) => row.no), ['D', 'C', 'B', 'A'])
  assert.deepEqual(sortRows(rows, column, SORT_DESCEND).map((row) => row.no), ['A', 'B', 'C', 'D'])
})

test('nextSortOrder 走完所有方向后取消', () => {
  assert.equal(nextSortOrder(null, undefined), SORT_ASCEND)
  assert.equal(nextSortOrder(SORT_ASCEND, undefined), SORT_DESCEND)
  assert.equal(nextSortOrder(SORT_DESCEND, undefined), null)
  assert.equal(nextSortOrder(SORT_DESCEND, [SORT_DESCEND, SORT_ASCEND]), SORT_ASCEND)
  assert.equal(nextSortOrder(SORT_ASCEND, [SORT_ASCEND, SORT_DESCEND]), SORT_DESCEND)
})

test('resolveSortInfo 受控优先', () => {
  assert.deepEqual(resolveSortInfo(null, null), { columnKey: null, order: null })
  assert.deepEqual(resolveSortInfo({ columnKey: 'qty', order: SORT_ASCEND }, null), {
    columnKey: 'qty',
    order: SORT_ASCEND
  })
  assert.deepEqual(
    resolveSortInfo({ columnKey: 'qty', order: null }, { columnKey: 'no', order: SORT_ASCEND }),
    { columnKey: null, order: null },
    '受控时以 props 为准，即使它表示「没排序」'
  )
  assert.deepEqual(resolveSortInfo(null, { columnKey: 'no', order: SORT_DESCEND }), {
    columnKey: 'no',
    order: SORT_DESCEND
  })
})

test('findColumnByKey 能钻进分组找子列', () => {
  const columns = [
    { key: 'no', dataIndex: 'no' },
    { key: 'group', children: [{ key: 'qty', dataIndex: 'qty', sorter: true }] }
  ]
  assert.equal(findColumnByKey(columns, 'qty').key, 'qty')
  assert.equal(findColumnByKey(columns, 'group'), null, '分组列本身不是数据列')
  assert.equal(findColumnByKey(columns, 'missing'), null)
})

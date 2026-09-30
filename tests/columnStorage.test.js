import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyColumnCache,
  columnsHash,
  filterVisibleColumns,
  readColumnCache,
  storageKeyOf,
  writeColumnCache
} from '../src/components/table/columnStorage.js'

const columns = [
  { key: 'no', width: 130 },
  { key: 'group-amount', children: [{ dataIndex: 'amount', width: 100 }] },
  { dataIndex: 'status', width: 90 }
]

function createStorage() {
  const data = {}
  return {
    data,
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null
    },
    setItem(key, value) {
      data[key] = String(value)
    }
  }
}

test('columnsHash / storageKeyOf 与老实现逐字节一致（固定 fixture 锁定兼容性）', () => {
  // 这三个值是用老实现 draggerTable.getUniqueKey 的算法算出来的，改动算法就会红
  assert.equal(columnsHash(columns), '-5qiavs')
  assert.equal(storageKeyOf('/order/list', columns), '/order/list_-5qiavs')
})

test('write/read 缓存：形状是 [{dataIndex,width}]，按当前顺序递归收集', () => {
  const storage = createStorage()
  writeColumnCache(storage, 'k', [
    { key: 'no', width: 120 },
    { key: 'g', children: [{ dataIndex: 'a', width: 80 }] }
  ])

  assert.deepEqual(readColumnCache(storage, 'k'), [
    { dataIndex: 'no', width: 120 },
    // 没有 width 的列序列化后不带 width 字段——老实现也是这个形状（JSON.stringify 丢掉 undefined）
    { dataIndex: 'g' },
    { dataIndex: 'a', width: 80 }
  ])
})

test('read 缓存遇到坏数据或没有存储时返回 null', () => {
  const storage = createStorage()
  storage.setItem('bad', '{not json')
  assert.equal(readColumnCache(storage, 'bad'), null)
  assert.equal(readColumnCache(storage, 'missing'), null)
  assert.equal(readColumnCache(null, 'k'), null)
})

test('applyColumnCache 恢复宽度与顺序，缺失的列保持原序排最后', () => {
  const next = applyColumnCache(columns, [
    { dataIndex: 'status', width: 200 },
    { dataIndex: 'no', width: 150 }
  ])

  assert.deepEqual(next.map((column) => column.key || column.dataIndex), [
    'status',
    'no',
    'group-amount'
  ])
  assert.equal(next[0].width, 200)
  assert.equal(next[1].width, 150)
  assert.equal(next[2].width, undefined)
})

test('applyColumnCache 不改 fixed 列的宽度（老实现行为）', () => {
  const next = applyColumnCache([{ key: 'no', width: 130, fixed: 'left' }], [
    { dataIndex: 'no', width: 300 }
  ])

  assert.equal(next[0].width, 130)
})

test('applyColumnCache 会递归应用到分组子列', () => {
  const next = applyColumnCache(columns, [{ dataIndex: 'amount', width: 260 }])
  const group = next.find((column) => column.key === 'group-amount')

  assert.equal(group.children[0].width, 260)
})

test('applyColumnCache 缓存为空时原样返回', () => {
  assert.equal(applyColumnCache(columns, null), columns)
  assert.equal(applyColumnCache(columns, []), columns)
})

test('filterVisibleColumns：undefined 视为可见，false 隐藏', () => {
  const list = [{ dataIndex: 'a' }, { dataIndex: 'b' }, { dataIndex: 'c' }]

  assert.deepEqual(
    filterVisibleColumns(list, { b: false }).map((column) => column.dataIndex),
    ['a', 'c']
  )
  assert.equal(filterVisibleColumns(list, {}).length, 3)
  assert.equal(filterVisibleColumns(list, null).length, 3)
})

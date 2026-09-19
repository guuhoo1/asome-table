import test from 'node:test'
import assert from 'node:assert/strict'
import {
  changedRows,
  getRowKey,
  isRowDisabled,
  isRowSelected,
  rowsByKeys,
  selectableRows,
  selectAllKeys,
  selectionState,
  toggleKeys
} from '../src/components/table/selection.js'

const rows = [{ no: 'A' }, { no: 'B' }, { no: 'C' }]

test('rowKey 支持字符串与函数', () => {
  assert.equal(getRowKey('no', { no: 'A' }, 0), 'A')
  assert.equal(getRowKey((record, index) => `${record.no}-${index}`, { no: 'A' }, 3), 'A-3')
  assert.equal(getRowKey('no', null, 0), undefined)
})

test('三种禁用写法都认', () => {
  const rowSelection = (config) => ({ getCheckboxProps: () => config })

  assert.equal(isRowDisabled(rowSelection({ disabled: true }), rows[0], 0), true)
  assert.equal(isRowDisabled(rowSelection({ props: { disabled: true } }), rows[0], 0), true)
  assert.equal(isRowDisabled(rowSelection({ attrs: { disabled: true } }), rows[0], 0), true)
  assert.equal(isRowDisabled(rowSelection({ props: { disabled: false } }), rows[0], 0), false)
  assert.equal(isRowDisabled({}, rows[0], 0), false, '没给 getCheckboxProps 就都不禁用')
})

test('全选 / 半选 / 一个都没选', () => {
  const selectable = [{ record: rows[0], index: 0 }, { record: rows[1], index: 1 }]

  assert.deepEqual(selectionState([], selectable, 'no'), { all: false, some: false })
  assert.deepEqual(selectionState(['A'], selectable, 'no'), { all: false, some: true })
  assert.deepEqual(selectionState(['A', 'B'], selectable, 'no'), { all: true, some: false })
})

test('空数据时 all / some 都是 false', () => {
  assert.deepEqual(selectionState([], [], 'no'), { all: false, some: false })
})

test('禁用行不参与全选，也不会进 keys', () => {
  const rowSelection = {
    getCheckboxProps: (record) => ({ props: { disabled: record.no === 'B' } })
  }
  const selectable = selectableRows(rows, rowSelection)

  assert.deepEqual(selectable.map((item) => item.record.no), ['A', 'C'])
  assert.deepEqual(selectAllKeys(selectable, true, 'no'), ['A', 'C'])
  assert.deepEqual(selectAllKeys(selectable, false, 'no'), [])
  assert.deepEqual(selectionState([], selectable, 'no'), { all: false, some: false })
  assert.deepEqual(selectionState(['A', 'C'], selectable, 'no'), { all: true, some: false })
})

test('changedRows 只返回勾选状态真变了的行', () => {
  const selectable = selectableRows(rows, null)

  assert.deepEqual(
    changedRows(selectable, ['A'], true, 'no').map((record) => record.no),
    ['B', 'C']
  )
  assert.deepEqual(
    changedRows(selectable, ['A', 'B', 'C'], false, 'no').map((record) => record.no),
    ['A', 'B', 'C']
  )
})

test('复选框是增删语义，radio 是替换语义', () => {
  assert.deepEqual(toggleKeys(['A'], 'B', true, 'checkbox'), ['A', 'B'])
  assert.deepEqual(toggleKeys(['A', 'B'], 'B', false, 'checkbox'), ['A'])
  assert.deepEqual(toggleKeys(['A'], 'A', true, 'checkbox'), ['A'], '重复勾选不会加两次')
  assert.deepEqual(toggleKeys(['A'], 'B', true, 'radio'), ['B'])
  assert.deepEqual(toggleKeys(['A'], 'A', false, 'radio'), [])
})

test('rowsByKeys 按数据顺序挑行，isRowSelected 认 keys', () => {
  assert.deepEqual(
    rowsByKeys(rows, ['C', 'A'], 'no').map((record) => record.no),
    ['A', 'C']
  )
  assert.deepEqual(rowsByKeys(rows, [], 'no'), [])
  assert.equal(isRowSelected(['A'], 'no', rows[0], 0), true)
  assert.equal(isRowSelected(['A'], 'no', rows[1], 1), false)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMergePlan,
  isMergedAway,
  isSameMergeValue,
  readField,
  rowSpanAttr,
  spanRowIndexes,
  spanSize
} from '../src/components/table/merge.js'

const leaves = [
  { key: 'dept', dataIndex: 'dept', merge: true },
  { key: 'name', dataIndex: 'name' },
  {
    key: 'date',
    dataIndex: 'date',
    merge: (record, previous) =>
      String(record.date).slice(0, 10) === String(previous.date).slice(0, 10)
  }
]

const rows = [
  { dept: 'A', name: 'a1', date: '2024-03-01 09:12' },
  { dept: 'A', name: 'a2', date: '2024-03-01 14:40' },
  { dept: 'B', name: 'b1', date: '2024-03-02 10:20' },
  { dept: 'B', name: 'b2', date: '2024-03-02 16:30' },
  { dept: 'B', name: 'b3', date: '2024-03-03 09:00' }
]

test('相邻同值合并成一组，跨度记在锚点行上', () => {
  const plan = buildMergePlan(leaves, rows)

  assert.deepEqual(plan.dept.spans, { 0: 2, 2: 3 })
  assert.deepEqual(plan.dept.skip, { 1: true, 3: true, 4: true })
  assert.equal(spanSize(plan, 'dept', 0), 2)
  assert.equal(spanSize(plan, 'dept', 1), 1, '被合并掉的行跨度为 1')
  assert.equal(rowSpanAttr(plan, 'dept', 0), 2)
  assert.equal(rowSpanAttr(plan, 'dept', 1), null, '跨度 1 时不输出 rowspan')
  assert.deepEqual(spanRowIndexes(plan, 'dept', 2), [2, 3, 4])
  assert.equal(isMergedAway(plan, 'dept', 1), true)
  assert.equal(isMergedAway(plan, 'dept', 0), false)
})

test('没声明 merge 的列不进计划', () => {
  const plan = buildMergePlan(leaves, rows)
  assert.equal(plan.name, undefined)
})

test('函数判据按日期合并（忽略时分秒）', () => {
  const plan = buildMergePlan(leaves, rows)
  assert.deepEqual(plan.date.spans, { 0: 2, 2: 2 })
})

test('空值不参与合并', () => {
  const plan = buildMergePlan(
    [{ key: 'v', dataIndex: 'v', merge: true }],
    [{ v: '' }, { v: '' }, { v: null }, { v: undefined }, { v: 'x' }, { v: 'x' }]
  )

  assert.deepEqual(plan.v.spans, { 4: 2 })
  assert.equal(isMergedAway(plan, 'v', 1), false, '空值行不被吃掉')
})

test('非相邻的同值不合并', () => {
  const plan = buildMergePlan(
    [{ key: 'v', dataIndex: 'v', merge: true }],
    [{ v: 'A' }, { v: 'B' }, { v: 'A' }]
  )

  assert.deepEqual(plan.v.spans, {})
  assert.deepEqual(plan.v.skip, {})
})

test('单行与空数据都不产生跨度', () => {
  const single = buildMergePlan([{ key: 'v', dataIndex: 'v', merge: true }], [{ v: 'A' }])
  const empty = buildMergePlan([{ key: 'v', dataIndex: 'v', merge: true }], [])

  assert.deepEqual(single.v.spans, {})
  assert.deepEqual(empty.v.spans, {})
})

test('readField 缺 dataIndex 时回退 key', () => {
  assert.equal(readField({ k: 1 }, { key: 'k' }), 1)
  assert.equal(readField({ k: 1 }, { key: 'k', dataIndex: 'other' }), undefined)
  assert.equal(readField(null, { key: 'k' }), undefined)
})

test('isSameMergeValue 单独调用时同样遵守空值规则', () => {
  const leaf = { key: 'v', dataIndex: 'v', merge: true }

  assert.equal(isSameMergeValue(leaf, { v: 'A' }, { v: 'A' }, 1), true)
  assert.equal(isSameMergeValue(leaf, { v: 'A' }, { v: 'B' }, 1), false)
  assert.equal(isSameMergeValue(leaf, { v: '' }, { v: '' }, 1), false)
})

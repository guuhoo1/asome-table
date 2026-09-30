import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readDeepValue,
  resolveColumnValue,
  resolveDisplayValue,
  serialNumberOf
} from '../src/components/table/columnValue.js'

test('readDeepValue 支持点号路径，任一层缺失返回 undefined', () => {
  const record = { customer: { name: '张三', tag: { label: 'VIP' } } }

  assert.equal(readDeepValue(record, 'customer.name'), '张三')
  assert.equal(readDeepValue(record, 'customer.tag.label'), 'VIP')
  assert.equal(readDeepValue(record, 'customer.missing'), undefined)
  assert.equal(readDeepValue(record, 'missing.deep'), undefined)
  assert.equal(readDeepValue(null, 'customer.name'), undefined)
  assert.equal(readDeepValue(record, ''), undefined)
})

test('resolveColumnValue：isSubObj 走深路径，否则取 dataIndex，缺省回退 key', () => {
  const record = { no: 'SO-1', customer: { name: '张三' } }

  assert.equal(resolveColumnValue(record, { dataIndex: 'no' }), 'SO-1')
  assert.equal(resolveColumnValue(record, { key: 'no' }), 'SO-1')
  assert.equal(resolveColumnValue(record, { dataIndex: 'customer.name', isSubObj: true }), '张三')
  assert.equal(resolveColumnValue(record, { dataIndex: 'customer.name' }), undefined)
  assert.equal(resolveColumnValue(null, { dataIndex: 'no' }), undefined)
})

test('resolveDisplayValue 优先级：formatter > 序号 > 深路径 > 普通取值', () => {
  const record = { no: 'SO-1', amount: 299, customer: { name: '张三' } }
  const yuan = (value) => '¥' + value

  assert.equal(resolveDisplayValue(record, { dataIndex: 'amount', formatter: yuan }, 0), '¥299')
  assert.equal(resolveDisplayValue(record, { isSerialNumber: true }, 2), 3)
  assert.equal(
    resolveDisplayValue(record, { dataIndex: 'customer.name', isSubObj: true }, 0),
    '张三'
  )
  assert.equal(resolveDisplayValue(record, { dataIndex: 'no' }, 0), 'SO-1')
  assert.equal(
    resolveDisplayValue(record, { isSerialNumber: true, formatter: (value) => value * 10 }, 1),
    20
  )
})

test('formatter 能拿到原始值与整行记录', () => {
  const record = { no: 'SO-1', amount: 299 }
  const seen = []
  const column = {
    dataIndex: 'amount',
    formatter: (value, row, index) => {
      seen.push([value, row.no, index])
      return row.no + ':' + value
    }
  }

  assert.equal(resolveDisplayValue(record, column, 5), 'SO-1:299')
  assert.deepEqual(seen, [[299, 'SO-1', 5]])
})

test('serialNumberOf 从 1 开始，可带分页偏移', () => {
  assert.equal(serialNumberOf(0), 1)
  assert.equal(serialNumberOf(9), 10)
  assert.equal(serialNumberOf(0, 10), 11)
  assert.equal(serialNumberOf(4, 20), 25)
})

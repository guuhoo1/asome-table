import test from 'node:test'
import assert from 'node:assert/strict'
import { offsetOf, pageCountOf, pageItemsOf } from '../src/components/table/pagination.js'

test('pageCountOf：至少 1 页，空数据也是 1 页', () => {
  assert.equal(pageCountOf(0, 10), 1)
  assert.equal(pageCountOf(4, 2), 2)
  assert.equal(pageCountOf(21, 10), 3)
  assert.equal(pageCountOf(20, 10), 2)
  assert.equal(pageCountOf(10, 0), 1, '非法 pageSize 时按 10 算')
})

test('offsetOf：行号偏移 = (current - 1) * pageSize', () => {
  assert.equal(offsetOf(1, 10), 0)
  assert.equal(offsetOf(3, 10), 20)
  assert.equal(offsetOf(2, 2), 2)
})

test('pageItemsOf：页数少时全列，多时用省略号', () => {
  assert.deepEqual(pageItemsOf(1, 3), [1, 2, 3])
  assert.deepEqual(pageItemsOf(5, 20), [1, '...', 4, 5, 6, '...', 20])
  assert.deepEqual(pageItemsOf(1, 20), [1, 2, '...', 20])
  assert.deepEqual(pageItemsOf(20, 20), [1, '...', 19, 20])
})

test('pageItemsOf：当前页越界时会被夹到合法范围', () => {
  assert.deepEqual(pageItemsOf(99, 3), [1, 2, 3])
  assert.deepEqual(pageItemsOf(0, 3), [1, 2, 3])
})

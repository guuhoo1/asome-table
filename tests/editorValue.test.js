import test from 'node:test'
import assert from 'node:assert/strict'
import { fromEditorValue, toEditorValue } from '../src/components/table/editorValue.js'

test('date：存储值怎么变都进成 YYYY-MM-DD', () => {
  assert.equal(toEditorValue('date', '2024-03-05'), '2024-03-05')
  assert.equal(toEditorValue('date', '2024-03-05 09:12'), '2024-03-05')
  assert.equal(toEditorValue('date', '2024-03-05T09:12'), '2024-03-05')
  assert.equal(toEditorValue('date', ''), '')
  assert.equal(toEditorValue('date', null), '')
  assert.equal(toEditorValue('date', undefined), '')
})

test('date：写回还是 YYYY-MM-DD', () => {
  assert.equal(fromEditorValue('date', '2024-03-09'), '2024-03-09')
  assert.equal(fromEditorValue('date', '2024-03-09T00:00'), '2024-03-09')
  assert.equal(fromEditorValue('date', ''), '')
  assert.equal(fromEditorValue('date', null), '')
})

test('datetime：存储的 " " 分隔要换成 input 要的 "T"', () => {
  assert.equal(toEditorValue('datetime', '2024-03-01 09:12'), '2024-03-01T09:12')
  assert.equal(toEditorValue('datetime', '2024-03-01T09:12'), '2024-03-01T09:12')
  assert.equal(toEditorValue('datetime', '2024-03-01 09:12:30'), '2024-03-01T09:12')
  assert.equal(toEditorValue('datetime', '2024-03-01'), '2024-03-01T00:00')
  assert.equal(toEditorValue('datetime', ''), '')
})

test('datetime：写回统一成 "YYYY-MM-DD HH:mm"', () => {
  assert.equal(fromEditorValue('datetime', '2024-03-01T20:30'), '2024-03-01 20:30')
  assert.equal(fromEditorValue('datetime', '2024-03-01T00:00'), '2024-03-01 00:00')
  assert.equal(fromEditorValue('datetime', ''), '')
})

test('来回转换稳定：再进编辑器值不变', () => {
  const values = ['2024-03-01', '2024-03-01 09:12', '2024-03-31 23:59']

  values.forEach((value) => {
    const dateRound = fromEditorValue('date', toEditorValue('date', value))
    const timeRound = fromEditorValue('datetime', toEditorValue('datetime', value))
    assert.equal(toEditorValue('date', dateRound), toEditorValue('date', value))
    assert.equal(toEditorValue('datetime', timeRound), toEditorValue('datetime', value))
  })
})

test('其它类型原样进出', () => {
  ;['input', 'number', 'select', undefined].forEach((type) => {
    assert.equal(toEditorValue(type, '张三'), '张三')
    assert.equal(toEditorValue(type, 12), 12)
    assert.equal(fromEditorValue(type, '张三'), '张三')
    assert.equal(fromEditorValue(type, 12), 12)
  })
  assert.equal(toEditorValue('input', null), '')
  assert.equal(fromEditorValue('input', undefined), '')
})

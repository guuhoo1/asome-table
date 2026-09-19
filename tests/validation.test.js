import test from 'node:test'
import assert from 'node:assert/strict'
import { runRules } from '../src/components/table/validation.js'

const record = { no: 'A' }

test('没有规则时直接通过', async () => {
  assert.equal(await runRules({}, '任意值', record), null)
  assert.equal(await runRules(null, '', record), null)
})

test('required 认 message，也给默认文案', async () => {
  assert.equal(await runRules({ rules: [{ required: true }] }, '', record), '必填')
  assert.equal(await runRules({ rules: [{ required: true }] }, null, record), '必填')
  assert.equal(
    await runRules({ rules: [{ required: true, message: '客户不能为空' }] }, '', record),
    '客户不能为空'
  )
  assert.equal(await runRules({ rules: [{ required: true }] }, '张三', record), null)
})

test('空值只触发 required，其它规则跳过', async () => {
  const config = { rules: [{ required: true }, { minLength: 5, message: '至少 5 个字符' }] }
  assert.equal(await runRules(config, '', record), '必填')
  assert.equal(await runRules({ rules: [{ minLength: 5, message: '至少 5 个字符' }] }, '', record), null)
})

test('min / max / minLength / maxLength 的默认文案', async () => {
  assert.equal(await runRules({ type: 'number', rules: [{ min: 1 }] }, 0, record), '不能小于 1')
  assert.equal(await runRules({ type: 'number', rules: [{ max: 999 }] }, 1000, record), '不能大于 999')
  assert.equal(await runRules({ rules: [{ minLength: 2 }] }, '张', record), '至少 2 个字符')
  assert.equal(await runRules({ rules: [{ maxLength: 10 }] }, '12345678901', record), '最多 10 个字符')
  assert.equal(await runRules({ type: 'number', rules: [{ min: 1, max: 999 }] }, 5, record), null)
})

test('pattern 支持 RegExp 和字符串两种写法', async () => {
  const asRegExp = { rules: [{ pattern: /^¥?\d+(\.\d+)?$/, message: '金额格式不对' }] }
  const asString = { rules: [{ pattern: '^\\d+$' }] }

  assert.equal(await runRules(asRegExp, '¥100.00', record), null)
  assert.equal(await runRules(asRegExp, 'abc', record), '金额格式不对')
  assert.equal(await runRules(asString, '12a', record), '格式不正确')
})

test('number 类型下非数字会报错', async () => {
  assert.equal(await runRules({ type: 'number' }, 'abc', record), '请输入数字')
  assert.equal(await runRules({ type: 'number' }, 12, record), null)
})

test('validator 支持 false / 字符串 / Promise / 通过', async () => {
  const rules = [
    { validator: (value) => value !== 'bad', message: '不允许 bad' },
    { validator: (value) => (value === 'meh' ? '换一个吧' : true) },
    { validator: async (value) => (value === 'slow' ? '异步不通过' : true) }
  ]

  assert.equal(await runRules({ rules }, 'ok', record), null)
  assert.equal(await runRules({ rules }, 'bad', record), '不允许 bad')
  assert.equal(await runRules({ rules }, 'meh', record), '换一个吧')
  assert.equal(await runRules({ rules }, 'slow', record), '异步不通过')
})

test('规则按顺序短路，返回第一条错误', async () => {
  const rules = [
    { required: true, message: '必填' },
    { minLength: 3, message: '至少 3 个字符' }
  ]
  assert.equal(await runRules({ rules }, '', record), '必填')
  assert.equal(await runRules({ rules }, 'ab', record), '至少 3 个字符')
  assert.equal(await runRules({ rules }, 'abc', record), null)
})

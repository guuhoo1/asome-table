/**
 * 单元格校验的纯逻辑：吃列上的 editable 配置，不依赖 Vue。
 * 支持 required / pattern / min / max / minLength / maxLength / validator，
 * 每项都能用 message 覆盖默认文案；空值只触发 required。
 */

import { isEmptyValue } from './values.js'

export async function runRules(config, value, record) {
  const settings = config || {}
  const rules = Array.isArray(settings.rules) ? settings.rules : []
  const empty = isEmptyValue(value) || value === ''

  if (settings.type === 'number' && !empty && typeof value !== 'number') return '请输入数字'

  for (let i = 0; i < rules.length; i += 1) {
    const rule = rules[i]
    if (!rule) continue

    if (rule.required && empty) return rule.message || '必填'
    if (empty) continue

    if (rule.pattern) {
      const pattern =
        rule.pattern instanceof RegExp ? rule.pattern : new RegExp(String(rule.pattern))
      if (!pattern.test(String(value))) return rule.message || '格式不正确'
    }
    if (typeof rule.min === 'number' && Number(value) < rule.min) {
      return rule.message || '不能小于 ' + rule.min
    }
    if (typeof rule.max === 'number' && Number(value) > rule.max) {
      return rule.message || '不能大于 ' + rule.max
    }
    if (typeof rule.minLength === 'number' && String(value).length < rule.minLength) {
      return rule.message || '至少 ' + rule.minLength + ' 个字符'
    }
    if (typeof rule.maxLength === 'number' && String(value).length > rule.maxLength) {
      return rule.message || '最多 ' + rule.maxLength + ' 个字符'
    }
    if (typeof rule.validator === 'function') {
      const result = await rule.validator(value, record)
      if (result === false) return rule.message || '校验未通过'
      if (typeof result === 'string') return result
    }
  }

  return null
}

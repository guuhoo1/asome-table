/**
 * 编辑器值与存储值之间的转换，纯函数、不依赖 Vue。
 *
 * 为什么需要转换：存储里常见的写法是 '2024-03-01' 或 '2024-03-01 09:12'，
 * 而 input[type=date] 只认 'YYYY-MM-DD'、input[type=datetime-local] 只认
 * 'YYYY-MM-DDTHH:mm'。其它类型（文本、数字、下拉）原样进出。
 */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/

function isDateType(type) {
  return type === 'date' || type === 'datetime'
}

function isBlank(value) {
  return value === '' || value === null || value === undefined
}

/** 存储值 → 编辑器里的值 */
export function toEditorValue(type, value) {
  if (!isDateType(type) || isBlank(value)) return isBlank(value) ? '' : value

  const text = String(value).trim()
  const dateTime = DATE_TIME.exec(text)
  const dateOnly = DATE_ONLY.test(text)

  if (type === 'date') {
    if (dateTime) return dateTime[1]
    if (dateOnly) return text
    return text.slice(0, 10)
  }

  if (dateTime) return dateTime[1] + 'T' + dateTime[2]
  if (dateOnly) return text + 'T00:00'
  return text
}

/** 编辑器里的值 → 写回存储的值 */
export function fromEditorValue(type, value) {
  if (!isDateType(type) || isBlank(value)) return isBlank(value) ? '' : value

  const text = String(value).trim()
  const dateTime = DATE_TIME.exec(text)

  if (type === 'date') {
    if (dateTime) return dateTime[1]
    return DATE_ONLY.test(text) ? text : text.slice(0, 10)
  }

  if (dateTime) return dateTime[1] + ' ' + dateTime[2]
  return text.replace('T', ' ')
}

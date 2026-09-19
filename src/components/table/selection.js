/**
 * 勾选相关的纯逻辑：只吃 keys / rows / rowSelection 配置，不依赖 Vue。
 * 语义对齐 ant-design-vue 1.x 的 TableRowSelection。
 */

export function getRowKey(rowKey, record, index) {
  if (typeof rowKey === 'function') return rowKey(record, index)
  return record ? record[rowKey] : undefined
}

/** 三种禁用写法都认：{ disabled } / { props: { disabled } } / { attrs: { disabled } } */
export function isRowDisabled(rowSelection, record, index) {
  if (!rowSelection || typeof rowSelection.getCheckboxProps !== 'function') return false
  const config = rowSelection.getCheckboxProps(record, index) || {}
  const fromProps = config.props && config.props.disabled
  const fromAttrs = config.attrs && config.attrs.disabled
  return !!(config.disabled || fromProps || fromAttrs)
}

/** 未被禁用的行，带原始下标（rowKey 是函数时要用到） */
export function selectableRows(rows, rowSelection) {
  const list = []
  const source = Array.isArray(rows) ? rows : []
  source.forEach((record, index) => {
    if (!isRowDisabled(rowSelection, record, index)) list.push({ record, index })
  })
  return list
}

export function isRowSelected(keys, rowKey, record, index) {
  return (keys || []).indexOf(getRowKey(rowKey, record, index)) >= 0
}

export function rowsByKeys(rows, keys, rowKey) {
  const source = Array.isArray(rows) ? rows : []
  return source.filter(
    (record, index) => (keys || []).indexOf(getRowKey(rowKey, record, index)) >= 0
  )
}

/**
 * 单行勾选后的 keys。
 * type = 'radio' 时是替换语义，其余按复选框增删。
 */
export function toggleKeys(keys, key, checked, type) {
  const current = keys || []
  if (type === 'radio') return checked ? [key] : []
  const next = current.slice()
  const position = next.indexOf(key)
  if (checked && position < 0) next.push(key)
  if (!checked && position >= 0) next.splice(position, 1)
  return next
}

/** 表头全选框的状态：全选 / 半选（禁用行不参与计算） */
export function selectionState(keys, selectable, rowKey) {
  const list = Array.isArray(selectable) ? selectable : []
  if (!list.length) return { all: false, some: false }
  let selected = 0
  list.forEach((item) => {
    if (isRowSelected(keys, rowKey, item.record, item.index)) selected += 1
  })
  return { all: selected === list.length, some: selected > 0 && selected < list.length }
}

/** 全选后的 keys（只含未禁用的行） */
export function selectAllKeys(selectable, checked, rowKey) {
  if (!checked) return []
  const list = Array.isArray(selectable) ? selectable : []
  return list.map((item) => getRowKey(rowKey, item.record, item.index))
}

/** 这次全选/取消全选实际改变了勾选状态的行（对齐 antd 的 changeRows 语义） */
export function changedRows(selectable, keys, checked, rowKey) {
  const list = Array.isArray(selectable) ? selectable : []
  return list
    .filter((item) => isRowSelected(keys, rowKey, item.record, item.index) !== checked)
    .map((item) => item.record)
}

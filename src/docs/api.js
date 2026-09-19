/** API 表格数据：文档和代码只维护这一处 */

export const propsTable = {
  columns: ['属性', '类型', '默认值', '说明'],
  rows: [
    ['columns', 'Array', '[]', '列定义数组，结构见下方 Column 表'],
    ['dataSource', 'Array', '[]', '数据源；配合 :data-source.sync 接住可编辑/批量保存的写回'],
    ['rowKey', 'String | Function', "'key'", '行唯一键，与 antd 一致'],
    ['rowSelection', 'Object | null', 'null', '见下方 rowSelection 表；传 null 时不渲染勾选列'],
    ['scroll', "Object", "{ x: 'max-content', y: 340 }", 'y 控制纵向滚动区高度（等价于原 demo 的 max-height）'],
    ['bordered', 'Boolean', 'false', '是否显示纵向分隔线'],
    ['showHeader', 'Boolean', 'true', '是否渲染表头'],
    ['tableLayout', 'String', "'auto'", "透传给 <table> 的 table-layout"],
    ['rowClassName', 'Function', 'null', '(record, index) => string，追加到行 class'],
    ['customRow', 'Function', 'null', '(record, index) => ({ on: { click } })，与 antd 一致'],
    ['resizable', 'Boolean', 'false', '开启表头拖宽（列上写 resizable: false 可单独关掉某一列）'],
    ['reorderable', 'Boolean', 'false', '开启拖动表头调整列顺序'],
    ['minColumnWidth', 'Number', '60', '拖宽时的最小列宽'],
    ['maxColumnWidth', 'Number', '0', '拖宽时的最大列宽，0 表示不限制']
  ]
}

export const columnTable = {
  columns: ['字段', '类型', '说明'],
  rows: [
    ['title', 'String | VNode', '表头文案；带 children 的列只作为分组表头，不出数据单元格'],
    ['dataIndex', 'String', '取数字段；缺省时回退用 key'],
    ['key', 'String', '列唯一标识，也用于合并、插槽、编辑态的定位'],
    ['width', 'Number', '单元格 min-width（tableLayout fixed 时同时作为 width）'],
    ['align', "'left' | 'right' | 'center'", '对齐方式，right 会启用等宽数字'],
    ['fixed', "true | 'left'", '冻结在左侧'],
    ['className', 'String', '追加到该列所有单元格的 class'],
    ['children', 'Array', '分组表头的子列，结构与本表相同'],
    ['customRender', 'Function', '自定义单元格渲染：(text, record, index, h) => VNode'],
    ['scopedSlots', 'Object', "{ customRender: 'slotName' }，用作用域插槽渲染该列"],
    ['merge', 'Boolean | Function', 'true = 相邻行同值纵向合并；函数形式 (record, prevRecord, index, prevIndex) => Boolean'],
    ['editable', 'Boolean | Object', '可编辑单元格，见下方 editable 子字段'],
    ['resizable', 'Boolean', '单列关掉拖宽（默认跟随表级 resizable）'],
    ['reorderable', 'Boolean', '单列关掉拖顺序（默认跟随表级 reorderable）']
  ]
}

export const editableTable = {
  columns: ['字段', '类型', '默认值', '说明'],
  rows: [
    ['type', "'input' | 'number' | 'select' | 'date' | 'datetime'", "'input'", '控件类型；date/datetime 用浏览器原生控件'],
    ['options', 'Array', '[]', "select 的选项，支持 ['待付款'] 或 [{ label, value }]"],
    ['placeholder', 'String', "''", '输入框占位文案'],
    ['trigger', "'click' | 'dblclick'", "'click'", '进入编辑的触发方式'],
    [
      'rules',
      'Array',
      '[]',
      'required / pattern / min / max / minLength / maxLength / validator(value, record)，每项可用 message 覆盖默认文案'
    ]
  ]
}

export const rowSelectionTable = {
  columns: ['字段', '类型', '默认值', '说明'],
  rows: [
    ['type', "'checkbox' | 'radio'", "'checkbox'", '勾选框类型，radio 是替换语义'],
    ['selectedRowKeys', 'Array', '—', '传了 = 受控模式（onChange 里自行写回）；不传 = 组件内部维护'],
    ['columnWidth', 'Number | String', '46', '勾选列宽度'],
    ['columnTitle', 'Any', '—', '替换表头的全选框'],
    ['fixed', 'Boolean', 'false', '勾选列是否一起冻结在左侧'],
    ['getCheckboxProps', 'Function', '—', '(record) => ({ props: { disabled } })，禁用的行不参与全选'],
    ['onChange', 'Function', '—', '(selectedRowKeys, selectedRows) => void'],
    ['onSelect', 'Function', '—', '(record, selected, selectedRows, nativeEvent) => void'],
    ['onSelectAll', 'Function', '—', '(selected, selectedRows, changeRows) => void']
  ]
}

export const eventsTable = {
  columns: ['事件', '参数', '说明'],
  rows: [
    [
      'cell-change',
      '{ value, oldValue, record, dataIndex, rowIndex, column, mergedRowIndexes, dataSource }',
      '单元格提交后触发；合并格会带上整组行下标'
    ],
    ['update:dataSource', 'Array', '不可变的新数组，配合 :data-source.sync 一行接住'],
    [
      'column-resize',
      '{ key, width, columns }',
      '拖宽结束（或双击热区复位）后触发，columns 是应用过顺序与宽度的完整列定义'
    ],
    [
      'column-reorder',
      '{ key, containerKey, fromIndex, toIndex, columns }',
      '拖表头换位后触发；containerKey 是 __root（顶层）或分组 key'
    ]
  ]
}

export const slotsTable = {
  columns: ['插槽', '参数', '说明'],
  rows: [
    ['empty', '—', '数据为空时的占位内容'],
    [
      '列上 scopedSlots.customRender 指定的名字',
      '{ text, record, index, column }',
      '自定义某一列的渲染，优先级高于 customRender 与内置渲染'
    ]
  ]
}

export const methodsTable = {
  columns: ['方法', '参数', '说明'],
  rows: [
    [
      'toggleRowSelection',
      '(record, index)',
      '外部切换某一行勾选，受控/未受控都适用（常用在 customRow 的行点击里）'
    ]
  ]
}

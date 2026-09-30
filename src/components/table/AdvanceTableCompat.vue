<template>
  <div class="atc" :class="{ 'atc--hide-empty': isHideEmpty }">
    <div v-if="showHeaderBar" class="atc-header">
      <div class="atc-title">
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="atc-search">
        <slot name="search" />
      </div>
      <div class="atc-actions">
        <slot name="actions" />
        <button type="button" class="atc-action" title="刷新" @click="handleRefresh">刷新</button>
      </div>
    </div>

    <div v-if="showAlert" class="atc-alert">
      <span class="atc-alert-text">
        已选择：<b>{{ selectedCount }}</b> 条
      </span>
      <slot name="alertContent" />
      <a class="atc-alert-clear" @click="clearSelected">清空</a>
    </div>

    <div v-else-if="alert && $slots.alert" class="atc-alert">
      <slot name="alert" />
    </div>

    <scroll-group-table
      ref="table"
      :columns="compatColumns"
      :data-source="dataSource"
      :row-key="rowKey"
      :row-selection="rowSelection"
      :scroll="scroll"
      :bordered="bordered"
      :show-header="showHeader"
      :table-layout="tableLayout"
      :row-class-name="rowClassName"
      :custom-row="compatCustomRow"
      :resizable="drag"
      :reorderable="drag"
      v-on="$listeners"
    >
      <!-- 老壳会给每一列自动挂一个以列 key 命名的插槽，页面里写 <template #customer> 即可覆盖 -->
      <template v-for="name in scopedSlotNames" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
      <template v-if="$scopedSlots.empty || $slots.empty" #empty>
        <slot name="empty" />
      </template>
    </scroll-group-table>
  </div>
</template>

<script>
import ScrollGroupTable from '../ScrollGroupTable.vue'

/**
 * AdvanceTableCompat —— vela-pc 老壳 AdvanceTable 的兼容层。
 *
 * 只做「契约翻译」：把老壳的列约定（默认居中、自动挂列名插槽）与 props / 事件 / 插槽
 * 翻译成 ScrollGroupTable 的 API，渲染与交互全部交给核心组件，自己不引入任何依赖。
 *
 * 已实现：默认居中、列名作用域插槽、标题栏（标题/搜索/操作/刷新）、选中提示条与清空、
 *         列宽与列序拖拽（drag）、行双击事件（dblclickRow）、isHideEmpty。
 * 声明但暂未处理（后续迭代）：pagination、summary/summaryData/summaryRender、
 *         isNeedAutoTableHight/reservedHeight、isFixedBottom/isFixedSecondBottom、
 *         dragSort、columnStorage、formatConditions、withDefaultPagination、size/loading 等。
 */
export default {
  name: 'AdvanceTableCompat',
  components: { ScrollGroupTable },
  inheritAttrs: false,
  props: {
    // ---- 透传给核心的能力 ----
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    rowKey: { type: [String, Function], default: 'key' },
    rowSelection: { type: Object, default: null },
    scroll: { type: Object, default: () => ({ x: 'max-content' }) },
    bordered: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    tableLayout: { type: String, default: 'auto' },
    rowClassName: { type: Function, default: null },
    customRow: { type: Function, default: null },

    // ---- 壳层能力 ----
    showHeaderBar: { type: Boolean, default: true },
    title: { type: String, default: '' },
    /** 列宽拖拽 + 列顺序拖拽；老壳默认开启 */
    drag: { type: Boolean, default: true },
    alert: { type: [Boolean, Object], default: true },
    isHideEmpty: { type: Boolean, default: false },

    // ---- 声明以兼容老壳调用方（当前版本不处理）----
    size: { type: String, default: 'small' },
    type: { type: String, default: undefined },
    loading: { type: [Boolean, Object], default: false },
    locale: { type: Object, default: undefined },
    footer: { type: Function, default: null },
    pagination: { type: [Object, Boolean], default: undefined },
    expandedRowRender: { type: Function, default: null },
    expandedRowKeys: { type: Array, default: undefined },
    defaultExpandAllRows: { type: [Array, Boolean], default: undefined },
    expandIcon: { type: Function, default: null },
    expandIconAsCell: { type: Boolean, default: false },
    expandIconColumnIndex: { type: Number, default: undefined },
    expandRowByClick: { type: Boolean, default: false },
    indentSize: { type: Number, default: undefined },
    childrenColumnName: { type: String, default: 'children' },
    customHeaderRow: { type: Function, default: null },
    transformCellText: { type: Function, default: null },
    getPopupContainer: { type: Function, default: null },
    columnStorage: { type: Boolean, default: false },
    columnDragSort: { type: Boolean, default: true },
    dragSort: { type: Boolean, default: false },
    formatConditions: { type: Boolean, default: false },
    reservedHeight: { type: Number, default: 110 },
    isNeedAutoTableHight: { type: Boolean, default: false },
    isFixedBottom: { type: Boolean, default: false },
    isFixedSecondBottom: { type: Boolean, default: false },
    withDefaultPagination: { type: Boolean, default: false },
    summary: { type: Boolean, default: false },
    summaryData: { type: Object, default: () => ({}) },
    summaryRender: { type: Function, default: null },
    selectedRows: { type: Array, default: undefined },
    selectedRowChange: { type: Function, default: null },
    clearSelectedRowKeys: { type: Boolean, default: false }
  },
  computed: {
    /** 老壳行为：每列注入 align（默认 center）与以列 key 命名的作用域插槽 */
    compatColumns() {
      const normalize = (columns) =>
        (columns || []).map((column) => {
          const key = column.key || column.dataIndex
          const next = Object.assign({}, column, { align: column.align || 'center' })

          if (Array.isArray(column.children) && column.children.length) {
            next.children = normalize(column.children)
          } else if (!next.scopedSlots && key) {
            next.scopedSlots = { customRender: key }
          }
          return next
        })

      return normalize(this.columns)
    },
    /** 页面提供了哪些列插槽（用于只转发真实存在的插槽） */
    scopedSlotNames() {
      const names = []
      const collect = (columns) => {
        ;(columns || []).forEach((column) => {
          if (Array.isArray(column.children) && column.children.length) {
            collect(column.children)
            return
          }
          const name = (column.scopedSlots && column.scopedSlots.customRender) || column.key || column.dataIndex
          if (name && this.$scopedSlots[name] && names.indexOf(name) < 0) names.push(name)
        })
      }
      collect(this.compatColumns)
      return names
    },
    selectedCount() {
      const keys = this.rowSelection && this.rowSelection.selectedRowKeys
      return Array.isArray(keys) ? keys.length : 0
    },
    showAlert() {
      if (!this.alert) return false
      if (this.$slots.alert && !this.selectedCount) return false
      return this.selectedCount > 0
    }
  },
  methods: {
    /** 老壳会把 dblclick 变成 dblclickRow 事件，同时保留页面自己传的 customRow */
    compatCustomRow(record, index) {
      const custom = typeof this.customRow === 'function' ? this.customRow(record, index) || {} : {}
      const on = Object.assign({}, custom.on)
      const userDblclick = on.dblclick

      on.dblclick = (event) => {
        if (typeof userDblclick === 'function') userDblclick(event)
        // 老壳页面统一写 @dblclickRow（驼峰，实测 23 个文件、0 个用 kebab），
        // 两种都发一次，避免页面写错大小写时静默失效
        this.$emit('dblclickRow', record, index)
        this.$emit('dblclick-row', record, index)
      }

      return Object.assign({}, custom, { on })
    },
    handleRefresh() {
      this.$emit('refresh')
    },
    clearSelected() {
      if (this.rowSelection && typeof this.rowSelection.onChange === 'function') {
        this.rowSelection.onChange([], [])
      }
      this.$emit('change', undefined, undefined, undefined)
    },
    /** 暴露核心组件实例方法，方便页面调 toggleRowSelection 等 */
    toggleRowSelection(record, index) {
      if (this.$refs.table) this.$refs.table.toggleRowSelection(record, index)
    }
  }
}
</script>

<style scoped>
.atc-header {
  display: flex;
  align-items: center;
  padding: 0 0 8px;
}

.atc-title {
  font-size: 18px;
  font-weight: 700;
  color: #1f2937;
}

.atc-search {
  flex: 1;
  margin: 0 24px;
  text-align: right;
}

.atc-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #4b5563;
}

.atc-action {
  padding: 2px 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: inherit;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.atc-action:hover {
  color: #2563eb;
  border-color: #2563eb;
}

.atc-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  padding: 6px 12px;
  border: 1px solid #bae0ff;
  border-radius: 4px;
  background: #e6f4ff;
  color: #1f2937;
  font-size: 13px;
}

.atc-alert b {
  color: #2563eb;
}

.atc-alert-clear {
  color: #2563eb;
  cursor: pointer;
}

/* isHideEmpty：无数据时不显示空态行（老壳用 .hide-empty 隐藏 placeholder） */
.atc--hide-empty ::v-deep .sgt-empty-row {
  display: none;
}
</style>

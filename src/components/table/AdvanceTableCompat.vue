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
        <button
          v-if="isNeedAutoTableHight"
          type="button"
          class="atc-action atc-height-switch"
          :title="isFixedHeight ? '取消固定高度' : '固定高度'"
          @click="toggleFixedHeight"
        >
          {{ isFixedHeight ? '固定高度' : '自适应高度' }}
        </button>
        <div class="atc-columns">
          <button
            type="button"
            class="atc-columns-btn"
            title="列配置"
            @click.stop="columnsOpen = !columnsOpen"
          >
            列配置
          </button>
          <div v-if="columnsOpen" class="atc-columns-panel" @click.stop>
            <div class="atc-columns-head">
              <label class="atc-columns-all">
                <input
                  type="checkbox"
                  :checked="allVisible"
                  :indeterminate.prop="someVisible"
                  @change="toggleAllVisible($event.target.checked)"
                />
                列展示
              </label>
              <button type="button" class="atc-columns-reset" @click="resetVisibleConfig">
                重置
              </button>
            </div>
            <label v-for="item in columnConfigList" :key="item.key" class="atc-columns-item">
              <input
                type="checkbox"
                :data-column-key="item.key"
                :checked="item.visible"
                @change="toggleVisible(item.key, $event.target.checked)"
              />
              {{ item.title }}
            </label>
          </div>
        </div>
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
      :columns="visibleColumns"
      :data-source="dataSource"
      :row-key="rowKey"
      :row-selection="rowSelection"
      :scroll="scrollConfig"
      :bordered="bordered"
      :show-header="showHeader"
      :table-layout="tableLayout"
      :row-class-name="compatRowClassName"
      :custom-row="compatCustomRow"
      :expanded-row-render="expandedRowRender"
      :expanded-row-keys="expandedRowKeys"
      :resizable="drag"
      :reorderable="drag"
      :row-index-offset="rowIndexOffset"
      v-on="$listeners"
      @column-resize="onColumnChange"
      @column-reorder="onColumnChange"
    >
      <!-- 老壳会给每一列自动挂一个以列 key 命名的插槽，页面里写 <template #customer> 即可覆盖 -->
      <template v-for="name in scopedSlotNames" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
      <template v-if="$scopedSlots.empty || $slots.empty" #empty>
        <slot name="empty" />
      </template>
      <!-- 合计行：老壳是 appendChild 注入 DOM，这里用核心的 summary 插槽真渲染 -->
      <template #summary>
        <tr v-if="summary" class="atc-summary-row">
          <td
            v-if="summaryRender"
            ref="summaryHost"
            class="atc-summary-cell"
            :colspan="summarySpan"
          ></td>
          <template v-else>
            <td
              v-for="(cell, index) in summaryCells"
              :key="cell.key"
              class="atc-summary-cell"
              :class="{ 'is-first': index === 0 }"
              :colspan="cell.colspan"
            >
              {{ cell.text }}
            </td>
          </template>
        </tr>
      </template>
    </scroll-group-table>

    <simple-pagination
      v-if="paginationConfig"
      :total="paginationConfig.total || 0"
      :current="paginationConfig.current || 1"
      :page-size="paginationConfig.pageSize || 10"
      :show-size-changer="!!paginationConfig.showSizeChanger"
      :page-size-options="paginationConfig.pageSizeOptions"
      @change="handlePageChange"
    />
  </div>
</template>

<script>
import ScrollGroupTable from '../ScrollGroupTable.vue'
import SimplePagination from './SimplePagination.vue'
import { offsetOf } from './pagination.js'
import { availableHeightOf } from './autoHeight.js'
import { summaryCellsOf, summarySpanOf } from './summary.js'
import {
  applyColumnCache,
  filterVisibleColumns,
  readColumnCache,
  storageKeyOf,
  writeColumnCache
} from './columnStorage.js'

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
  components: { ScrollGroupTable, SimplePagination },
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
    /** 列宽 / 列序持久化；老壳默认开启 */
    columnStorage: { type: Boolean, default: true },
    /** 持久化 key 的「路由」部分；不传时取 this.$route.path，再兜底 'default' */
    storageKey: { type: String, default: '' },

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
  data() {
    return {
      /** 从 localStorage 读出来的列宽/列序缓存 */
      columnCache: null,
      /** { [列 key]: boolean }；没记录的列默认可见（与老壳一致，且不持久化） */
      visibleConfig: {},
      columnsOpen: false,
      /** withDefaultPagination 时组件内部维护的页码 */
      pageInfo: { pageStart: 1, pageNums: 10 },
      /** 自动高度：是否固定高度（老壳标题栏里的开关），以及算出来的高度 */
      isFixedHeight: true,
      autoHeight: 0,
      /** 行拖拽的起点记录 */
      dragSourceRecord: null
    }
  },
  created() {
    if (this.columnStorage) {
      this.columnCache = readColumnCache(this.getStorage(), this.cacheKey)
    }
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
    /** 持久化用的 key：与老实现逐字节一致（路由 + 列结构 hash） */
    cacheKey() {
      const path = this.storageKey || (this.$route && this.$route.path) || 'default'
      return storageKeyOf(path, this.columns)
    },
    /** 兼容列 → 套上缓存里的宽度与顺序 */
    cachedColumns() {
      return applyColumnCache(this.compatColumns, this.columnCache)
    },
    /** 再按列显隐过滤，最后交给核心组件 */
    visibleColumns() {
      return filterVisibleColumns(this.cachedColumns, this.visibleConfig)
    },
    /** 列配置面板的数据：只列顶层列（与老壳的 ActionColumns 一致） */
    columnConfigList() {
      return this.compatColumns.map((column) => {
        const key = column.key || column.dataIndex
        return {
          key,
          title: column.title,
          visible: this.visibleConfig[key] === undefined ? true : !!this.visibleConfig[key]
        }
      })
    },
    allVisible() {
      return this.columnConfigList.every((item) => item.visible)
    },
    someVisible() {
      const visibleCount = this.columnConfigList.filter((item) => item.visible).length
      return visibleCount > 0 && visibleCount < this.columnConfigList.length
    },
    /**
     * 分页配置（对齐老壳 paginationObj）：
     * - `pagination === false` → 不渲染分页
     * - `withDefaultPagination` → 组件内置页码，只更新自己的 pageInfo（老壳不向外发 change）
     * - 对象写法 → 原样透传，并补上老壳固定的 pageSizeOptions
     */
    paginationConfig() {
      const config = this.pagination
      if (config === false) return null

      if (this.withDefaultPagination) {
        return {
          current: this.pageInfo.pageStart,
          pageSize: this.pageInfo.pageNums,
          showSizeChanger: true,
          total: (config && config.total) || this.dataSource.length
        }
      }

      if (config && typeof config === 'object') {
        return Object.assign({ pageSizeOptions: ['10', '30', '50', '100'] }, config)
      }

      return null
    },
    /** 分页激活时，序号列与插槽 currentIndex 都要带上页码偏移 */
    rowIndexOffset() {
      const config = this.paginationConfig
      if (!config) return 0
      return offsetOf(config.current, config.pageSize)
    },
    /** 自动高度开启且处于固定高度时，把算出来的高度交给核心（核心用 max-height 实现） */
    scrollConfig() {
      const base = Object.assign({}, this.scroll)
      if (this.isNeedAutoTableHight && this.isFixedHeight && this.autoHeight) {
        base.y = this.autoHeight
      }
      return base
    },
    /** 合计行的单元格（老壳规则：首列「合计」、分组列跨子列、有勾选列先占一格） */
    summaryCells() {
      if (!this.summary) return []
      return summaryCellsOf({
        columns: this.visibleColumns,
        summaryData: this.summaryData,
        hasSelection: !!this.rowSelection
      })
    },
    summarySpan() {
      return summarySpanOf(this.visibleColumns, !!this.rowSelection)
    },
    showAlert() {
      if (!this.alert) return false
      if (this.$slots.alert && !this.selectedCount) return false
      return this.selectedCount > 0
    }
  },
  methods: {
    getStorage() {
      try {
        return typeof window !== 'undefined' ? window.localStorage : null
      } catch (error) {
        return null
      }
    },
    /** 核心组件拖完列宽/列序后，把结果按老壳的 key 与形状写回存储 */
    onColumnChange(payload) {
      if (!this.columnStorage) return
      if (payload && Array.isArray(payload.columns)) {
        writeColumnCache(this.getStorage(), this.cacheKey, payload.columns)
      }
    },
    toggleVisible(key, visible) {
      this.visibleConfig = Object.assign({}, this.visibleConfig, { [key]: visible })
      this.$emit('update:visibleConfig', this.visibleConfig)
    },
    toggleAllVisible(visible) {
      const next = {}
      this.columnConfigList.forEach((item) => {
        next[item.key] = visible
      })
      this.visibleConfig = next
      this.$emit('update:visibleConfig', next)
    },
    /** 重置为「全部可见」，与老壳 ActionColumns 的重置一致（也发 reset 事件） */
    resetVisibleConfig() {
      this.visibleConfig = {}
      this.$emit('update:visibleConfig', {})
      this.$emit('reset')
    },
    closeColumns() {
      if (this.columnsOpen) this.columnsOpen = false
    },
    /** 页码 / 每页条数变化 */
    handlePageChange(page, pageSize) {
      const config = this.paginationConfig || {}

      if (this.withDefaultPagination) {
        // 老壳行为：内置分页只更新自己的页码，不向外发 change（页面自己发请求）
        this.pageInfo = { pageStart: page, pageNums: pageSize }
        return
      }

      this.$emit('change', Object.assign({}, config, { current: page, pageSize }), {}, {})
    },
    /**
     * 复刻老壳的 updateTableHeight：
     * 高度 = max(200, 视口高 − 表格顶部 − reservedHeight)；关掉固定高度或无数据时不限制高度。
     */
    updateTableHeight() {
      if (!this.isNeedAutoTableHight) return
      if (!this.isFixedHeight || !this.dataSource.length) {
        this.autoHeight = 0
        return
      }

      const rect = this.$el.getBoundingClientRect()
      this.autoHeight = availableHeightOf({
        viewportHeight: window.innerHeight,
        tableTop: rect.top,
        reservedHeight: this.reservedHeight || 0
      })
    },
    toggleFixedHeight() {
      this.isFixedHeight = !this.isFixedHeight
      this.$nextTick(this.updateTableHeight)
    },
    /**
     * 自定义合计行：兼容老契约（`summaryRender()` 无参、返回一个 DOM 节点），
     * 把节点塞进整行的容器里；返回 VNode 时由上面的插槽分支负责渲染。
     */
    renderCustomSummary() {
      if (!this.summary || typeof this.summaryRender !== 'function') return
      const host = this.$refs.summaryHost
      if (!host) return

      host.innerHTML = ''
      const node = this.summaryRender()
      if (!node || typeof node !== 'object' || node.nodeType !== 1) return
      host.appendChild(node)
    },
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

      // 行拖拽（老壳行为）：HTML5 draggable + drop 后就地调整数据顺序并发 drop 事件
      if (this.dragSort) {
        on.mouseenter = (event) => {
          if (event && event.target) event.target.draggable = true
        }
        on.dragstart = (event) => {
          if (event && event.stopPropagation) event.stopPropagation()
          this.dragSourceRecord = record
        }
        on.dragover = (event) => {
          if (event && event.preventDefault) event.preventDefault()
          const row = event && event.currentTarget
          if (row && row.style) row.style.background = 'rgba(197, 197, 197, 0.5)'
        }
        on.dragleave = (event) => {
          const row = event && event.currentTarget
          if (row && row.style) row.style.background = ''
        }
        on.drop = (event) => {
          if (event && event.stopPropagation) event.stopPropagation()
          const row = event && event.currentTarget
          if (row && row.style) row.style.background = ''
          this.moveDraggedRow(record)
        }
      }

      return Object.assign({}, custom, { on })
    },
    /** 把拖拽起点移到目标行所在位置（就地改数组，与老壳一致），并发 drop 事件 */
    moveDraggedRow(targetRecord) {
      const source = this.dragSourceRecord
      if (!source || !targetRecord || source === targetRecord) return

      const keyOf = (item) =>
        typeof this.rowKey === 'function' ? this.rowKey(item) : item[this.rowKey]
      const fromIndex = this.dataSource.findIndex((item) => keyOf(item) === keyOf(source))
      const toIndex = this.dataSource.findIndex((item) => keyOf(item) === keyOf(targetRecord))
      if (fromIndex < 0 || toIndex < 0) return

      this.dataSource.splice(fromIndex, 1)
      this.dataSource.splice(toIndex, 0, source)
      this.dragSourceRecord = null

      this.$emit('drop', source, targetRecord, true)
      this.$emit('update:dataSource', this.dataSource.slice())
    },
    /** 固定底行：最后一行 / 倒数第二行加 class，用 sticky 钉在滚动容器底部 */
    compatRowClassName(record, index) {
      const classes = []
      if (typeof this.rowClassName === 'function') {
        const extra = this.rowClassName(record, index)
        if (extra) classes.push(extra)
      }

      const lastIndex = this.dataSource.length - 1
      if (this.isFixedBottom && index === lastIndex) classes.push('sgt-fixed-bottom')
      if (this.isFixedSecondBottom && index === lastIndex - 1) {
        classes.push('sgt-fixed-second-bottom')
      }

      return classes.join(' ')
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
  },
  mounted() {
    // 点面板外面关掉列配置面板
    document.addEventListener('click', this.closeColumns)
    // 自动高度：老壳只在数据变化 / 开关切换时重算，这里额外补了 resize（更符合直觉）
    window.addEventListener('resize', this.updateTableHeight)
    this.$nextTick(this.updateTableHeight)
    this.renderCustomSummary()
  },
  beforeDestroy() {
    document.removeEventListener('click', this.closeColumns)
    window.removeEventListener('resize', this.updateTableHeight)
  },
  watch: {
    dataSource() {
      this.$nextTick(this.updateTableHeight)
    },
    isFixedHeight() {
      this.$nextTick(this.updateTableHeight)
    },
    isNeedAutoTableHight() {
      this.$nextTick(this.updateTableHeight)
    },
    reservedHeight() {
      this.$nextTick(this.updateTableHeight)
    },
    summary() {
      this.$nextTick(this.renderCustomSummary)
    },
    summaryData() {
      this.$nextTick(this.renderCustomSummary)
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

.atc-columns {
  position: relative;
}

.atc-columns-panel {
  position: absolute;
  right: 0;
  z-index: 30;
  min-width: 180px;
  max-height: 300px;
  margin-top: 6px;
  padding: 8px 10px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
  text-align: left;
}

.atc-columns-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 6px;
  margin-bottom: 4px;
  border-bottom: 1px solid #f1f5f9;
}

.atc-columns-all,
.atc-columns-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 13px;
  color: #374151;
  cursor: pointer;
}

.atc-columns-reset {
  border: none;
  background: none;
  color: #2563eb;
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

/* isHideEmpty：无数据时不显示空态行（老壳用 .hide-empty 隐藏 placeholder） */
.atc--hide-empty ::v-deep .sgt-empty-row {
  display: none;
}

/* 合计行：对齐老壳样式（背景 #fafafa、加粗、文字 #ff4d4f、居中，首列左对齐） */
.atc-summary-row .atc-summary-cell {
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background: #fafafa;
  color: #ff4d4f;
  font-weight: 700;
  text-align: center;
}

.atc-summary-row .atc-summary-cell.is-first {
  text-align: left;
}

/* 固定底行：老壳把 tr 设成 sticky，这里改成 td（tr 的 sticky 在部分浏览器不生效），视觉一致 */
.atc ::v-deep tr.sgt-fixed-bottom > td {
  position: sticky;
  bottom: 0;
  z-index: 3;
  background: #c2c2c2;
}

.atc ::v-deep tr.sgt-fixed-second-bottom > td {
  position: sticky;
  bottom: 45px;
  z-index: 3;
  background: #c2c2c2;
}

/* 行拖拽时给出可拖的提示 */
.atc ::v-deep tr[draggable='true'] {
  cursor: pointer;
}
</style>

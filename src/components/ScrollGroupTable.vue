<template>
  <div
    class="sgt-wrap"
    :class="{ 'is-start': showStartShadow, 'is-end': showEndShadow }"
    :style="wrapStyle"
  >
    <div ref="scroll" class="sgt-scroll" :style="scrollStyle" @scroll.passive="handleScroll">
      <table
        class="sgt-table"
        :class="{ 'sgt-bordered': bordered, 'sgt-table--resizable': resizeLayoutActive }"
        :style="tableStyle"
      >
        <thead v-if="showHeader">
          <tr class="sgt-head-row-1">
            <th
              v-if="selectionColumnEnabled"
              class="sgt-cell sgt-selection-cell"
              :class="{ 'sgt-fixed-left': selectionFixed }"
              :style="selectionCellStyle"
              :rowspan="hasGroupHeader ? 2 : null"
            >
              <template v-if="rowSelection.columnTitle !== undefined">{{ rowSelection.columnTitle }}</template>
              <input
                v-else-if="selectionType === 'checkbox'"
                type="checkbox"
                aria-label="全选"
                :checked="allSelected"
                :indeterminate.prop="indeterminate"
                :disabled="selectableRowList.length === 0"
                @change="handleSelectAll"
              />
            </th>

            <template v-if="hasGroupHeader">
              <template v-for="cell in headerTopCells">
                <th
                  v-if="cell.type === 'leaf'"
                  :key="'h1-' + cell.key"
                  class="sgt-cell"
                  :class="[cellClasses(cell.leaf), headerStateClasses(cell.key)]"
                  :style="cellStyle(cell.leaf)"
                  :rowspan="2"
                  :data-sgt-key="cell.key"
                  :data-sgt-header-key="cell.key"
                  :data-sgt-container="cell.leaf.containerKey"
                  @pointerdown="beginHeaderDrag(cell.key, cell.leaf.containerKey, $event)"
                >
                  {{ cell.leaf.title }}
                  <span
                    v-if="canResize(cell.leaf)"
                    class="sgt-resizer"
                    :data-sgt-resizer="cell.key"
                    @pointerdown.stop.prevent="beginResize(cell.leaf, $event)"
                    @dblclick.stop="resetColumnWidth(cell.leaf)"
                  ></span>
                </th>
                <th
                  v-else
                  :key="'g-' + cell.key"
                  class="sgt-cell sgt-group-cell"
                  :class="[
                    cell.group.colorClass,
                    cell.group.className,
                    headerStateClasses(cell.key)
                  ]"
                  :colspan="cell.group.children.length"
                  :data-sgt-header-key="cell.key"
                  :data-sgt-container="rootContainer"
                  @pointerdown="beginHeaderDrag(cell.key, rootContainer, $event)"
                >
                  {{ cell.group.title }}
                </th>
              </template>
            </template>
            <template v-else>
              <th
                v-for="leaf in normalizedColumns.leaves"
                :key="'h1-' + leaf.key"
                class="sgt-cell"
                :class="[cellClasses(leaf), headerStateClasses(leaf.key)]"
                :style="cellStyle(leaf)"
                :data-sgt-key="leaf.key"
                :data-sgt-header-key="leaf.key"
                :data-sgt-container="leaf.containerKey"
                @pointerdown="beginHeaderDrag(leaf.key, leaf.containerKey, $event)"
              >
                {{ leaf.title }}
                <span
                  v-if="canResize(leaf)"
                  class="sgt-resizer"
                  :data-sgt-resizer="leaf.key"
                  @pointerdown.stop.prevent="beginResize(leaf, $event)"
                  @dblclick.stop="resetColumnWidth(leaf)"
                ></span>
              </th>
            </template>
          </tr>

          <tr v-if="hasGroupHeader" class="sgt-head-row-2">
            <th
              v-for="leaf in groupLeaves"
              :key="'h2-' + leaf.key"
              class="sgt-cell"
              :class="[cellClasses(leaf), headerStateClasses(leaf.key)]"
              :style="cellStyle(leaf)"
              :data-sgt-key="leaf.key"
              :data-sgt-header-key="leaf.key"
              :data-sgt-container="leaf.containerKey"
              @pointerdown="beginHeaderDrag(leaf.key, leaf.containerKey, $event)"
            >
              {{ leaf.title }}
              <span
                v-if="canResize(leaf)"
                class="sgt-resizer"
                :data-sgt-resizer="leaf.key"
                @pointerdown.stop.prevent="beginResize(leaf, $event)"
                @dblclick.stop="resetColumnWidth(leaf)"
              ></span>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-if="dataSource.length === 0">
            <tr class="sgt-empty-row">
              <td class="sgt-empty-cell" :colspan="totalLeafCount">
                <slot name="empty">暂无数据</slot>
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="(record, index) in dataSource"
              :key="getRowKey(record, index)"
              class="sgt-row"
              :class="rowClasses(record, index)"
              v-on="getRowEvents(record, index)"
            >
              <td
                v-if="selectionColumnEnabled"
                class="sgt-cell sgt-selection-cell"
                :class="{ 'sgt-fixed-left': selectionFixed }"
                :style="selectionCellStyle"
              >
                <input
                  v-if="selectionType === 'checkbox'"
                  type="checkbox"
                  aria-label="选择该行"
                  :checked="isRowSelected(record, index)"
                  :disabled="isRowDisabled(record, index)"
                  @change="handleRowSelect(record, index, $event)"
                />
                <input
                  v-else
                  type="radio"
                  :name="radioGroupName"
                  aria-label="选择该行"
                  :checked="isRowSelected(record, index)"
                  :disabled="isRowDisabled(record, index)"
                  @change="handleRowSelect(record, index, $event)"
                />
              </td>

              <td
                v-for="leaf in normalizedColumns.leaves"
                v-if="!isMergedAway(leaf, index)"
                :key="leaf.key"
                class="sgt-cell"
                :class="[
                  cellClasses(leaf),
                  {
                    'is-span-selected': isSpanSelected(leaf, index),
                    'is-editing': isEditing(leaf, index)
                  }
                ]"
                :style="cellStyle(leaf)"
                :data-sgt-key="leaf.key"
                :rowspan="mergeRowSpan(leaf, index)"
                @click="handleCellClick(leaf, record, index, $event)"
                @dblclick="handleCellDblClick(leaf, record, index, $event)"
              >
                <template v-if="isEditing(leaf, index)">
                  <select
                    v-if="editorType(leaf) === 'select'"
                    class="sgt-editor"
                    :value="draftValue"
                    @change="handleSelectChange"
                    @blur="commitEdit"
                    @keydown.esc="cancelEdit"
                  >
                    <option v-for="option in editorOptions(leaf)" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                  <input
                    v-else
                    class="sgt-editor"
                    :type="editorInputType(leaf)"
                    :value="draftValue"
                    :placeholder="editorPlaceholder(leaf)"
                    @input="handleEditorInput"
                    @keydown.enter="commitEdit"
                    @keydown.esc="cancelEdit"
                    @blur="commitEdit"
                  />
                  <div v-if="editError" class="sgt-editor-error">{{ editError }}</div>
                </template>
                <template v-else-if="leaf.slotName">
                  <slot
                    :name="leaf.slotName"
                    :text="displayText(leaf, record)"
                    :record="record"
                    :index="index"
                    :column="leaf"
                  >{{ displayText(leaf, record) }}</slot>
                </template>
                <cell-renderer
                  v-else-if="typeof leaf.customRender === 'function'"
                  :column="leaf"
                  :record="record"
                  :index="index"
                  :text="displayText(leaf, record)"
                />
                <span
                  v-else-if="isStatusColumn(leaf) && displayText(leaf, record) !== emptyText"
                  class="sgt-badge"
                  :class="statusBadgeClass(leaf, record)"
                >{{ displayText(leaf, record) }}</span>
                <template v-else>{{ displayText(leaf, record) }}</template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- 拖动列头时跟着光标走的预览块，拖拽反馈主要靠它 -->
    <div
      v-if="dragGhost"
      class="sgt-drag-ghost"
      :style="{ left: dragGhost.x + 'px', top: dragGhost.y + 'px' }"
    >
      {{ dragGhost.title }}
    </div>
  </div>
</template>

<script>
/**
 * ScrollGroupTable —— 横向滚动 + 两行分组表头 + 滚动阴影（可选左侧列冻结）
 *
 * props 命名与语义对齐 ant-design-vue 1.x 的 TableProps / TableRowSelection，
 * 列定义使用 antd 的 children 嵌套结构。
 */

import {
  buildMergePlan,
  isMergedAway as isMergedAwayInPlan,
  rowSpanAttr,
  spanRowIndexes,
  spanSize as spanSizeInPlan
} from './table/merge.js'
import {
  changedRows,
  getRowKey as resolveRowKey,
  isRowDisabled as isRowDisabledByProps,
  isRowSelected as isRowSelectedInKeys,
  rowsByKeys as pickRowsByKeys,
  selectableRows,
  selectAllKeys,
  selectionState,
  toggleKeys
} from './table/selection.js'
import { runRules as runRulesOf } from './table/validation.js'
import {
  ROOT_CONTAINER,
  applyColumnOrder,
  applyWidthOverrides,
  clampColumnWidth,
  collectOrderMap,
  columnKeyOf,
  moveWithinList,
  sameKeyOrder
} from './table/columnLayout.js'
import { fromEditorValue, toEditorValue } from './table/editorValue.js'
import { isEmptyValue, toComparableString } from './table/values.js'

const GROUP_PALETTE = ['sgt-g-0', 'sgt-g-1', 'sgt-g-2', 'sgt-g-3', 'sgt-g-4']

const STATUS_BADGE_MAP = {
  已发货: 'sgt-badge-blue',
  待付款: 'sgt-badge-amber',
  已完成: 'sgt-badge-green',
  已取消: 'sgt-badge-gray'
}

const EMPTY_TEXT = '-'
const STATUS_KEY = 'status'
const SCROLL_STEP = 2

let uidSeed = 0

/** 让 customRender 的返回值（字符串 / VNode / VNode 数组）都能安全落到单元格里 */
const CellRenderer = {
  name: 'SgtCellRenderer',
  functional: true,
  props: {
    column: { type: Object, required: true },
    record: { type: Object, required: true },
    index: { type: Number, required: true },
    text: { type: [String, Number], default: '' }
  },
  render(h, context) {
    const { column, record, index, text } = context.props
    const rendered = column.customRender(text, record, index, h)
    if (Array.isArray(rendered)) return rendered
    if (rendered && typeof rendered === 'object') return rendered
    if (rendered === null || rendered === undefined) return h('span')
    return h('span', String(rendered))
  }
}

export default {
  name: 'ScrollGroupTable',
  components: { CellRenderer },
  props: {
    /** 列定义，antd 结构：{ title, dataIndex, key, width, align, fixed, className, children, customRender, scopedSlots } */
    columns: { type: Array, default: () => [] },
    dataSource: { type: Array, default: () => [] },
    /** antd 默认 'key'；本项目 demo 用 'no' */
    rowKey: { type: [String, Function], default: 'key' },
    /** 对齐 TableRowSelection，传 null 表示不显示勾选列 */
    rowSelection: { type: Object, default: null },
    /** { x: 'max-content' | number, y: number }，y 决定纵向滚动区高度 */
    scroll: { type: Object, default: () => ({ x: 'max-content', y: 340 }) },
    bordered: { type: Boolean, default: false },
    showHeader: { type: Boolean, default: true },
    tableLayout: { type: String, default: 'auto' },
    rowClassName: { type: Function, default: null },
    customRow: { type: Function, default: null },
    /** 开启后表头右边缘出现拖宽热区（列上写 resizable: false 可单独关掉） */
    resizable: { type: Boolean, default: false },
    /** 开启后可以拖动表头调整列顺序（列上写 reorderable: false 可单独关掉） */
    reorderable: { type: Boolean, default: false },
    minColumnWidth: { type: Number, default: 60 },
    /** 0 表示不限制最大宽度 */
    maxColumnWidth: { type: Number, default: 0 }
  },
  data() {
    return {
      // 冻结列宽：优先用真实测量值，量不到时回退声明宽度
      measuredWidths: {},
      showStartShadow: false,
      showEndShadow: false,
      innerSelectedKeys: [],
      editingCell: null,
      draftValue: '',
      editError: '',
      // 会话级覆盖：拖宽 / 拖顺序都先写在这里，同时 emit 事件让父组件可以持久化
      widthOverrides: {},
      orderOverrides: {},
      widthsSeeded: false,
      resizeState: null,
      dragState: null,
      dropIndicator: null,
      dragGhost: null,
      radioGroupName: 'sgt-radio-' + (uidSeed += 1),
      emptyText: EMPTY_TEXT
    }
  },
  computed: {
    selectionColumnEnabled() {
      return !!this.rowSelection
    },
    selectionType() {
      return (this.rowSelection && this.rowSelection.type) || 'checkbox'
    },
    selectionFixed() {
      return !!(this.rowSelection && this.rowSelection.fixed)
    },
    selectionWidth() {
      const raw = this.rowSelection ? this.rowSelection.columnWidth : null
      const parsed = this.toNumber(raw)
      return parsed > 0 ? parsed : 46
    },
    isControlledSelection() {
      return !!(this.rowSelection && 'selectedRowKeys' in this.rowSelection)
    },
    rootContainer() {
      return ROOT_CONTAINER
    },
    /** 应用了内部列顺序覆盖后的列定义 */
    orderedColumns() {
      return applyColumnOrder(this.columns, this.orderOverrides)
    },
    /** 拖宽开启且已经按当前布局固化过宽度时，才切到固定布局 */
    resizeLayoutActive() {
      return this.resizable && this.widthsSeeded
    },
    effectiveTableLayout() {
      return this.resizeLayoutActive ? 'fixed' : this.tableLayout
    },
    /** 固定布局下表格宽度 = 各列宽度之和（勾选列也算） */
    totalColumnWidth() {
      const selection = this.selectionColumnEnabled ? this.selectionWidth : 0
      return this.normalizedColumns.leaves.reduce(
        (total, leaf) => total + this.widthOf(leaf),
        selection
      )
    },
    /** 当前生效的列定义（顺序 + 宽度覆盖都应用过），事件里原样回传方便持久化 */
    appliedColumns() {
      return applyWidthOverrides(this.orderedColumns, this.widthOverrides)
    },
    /** 表头 cell 的元信息：属于哪一层、能不能拖 */
    headerMeta() {
      const map = {}
      this.normalizedColumns.leaves.forEach((leaf) => {
        map[leaf.key] = {
          containerKey: leaf.containerKey,
          reorderable: leaf.reorderable !== false,
          title: leaf.title
        }
      })
      this.normalizedColumns.groups.forEach((group) => {
        map[group.key] = {
          containerKey: ROOT_CONTAINER,
          reorderable: group.reorderable !== false,
          title: group.title
        }
      })
      return map
    },
    /** 归一化后的列：leaves = 所有叶子列（含分组子列），groups = 分组表头 */
    normalizedColumns() {
      const groups = []
      const topLeaves = []
      const leaves = []

      this.orderedColumns.forEach((column, columnIndex) => {
        const baseKey = columnKeyOf(column, columnIndex, ROOT_CONTAINER)
        if (Array.isArray(column.children) && column.children.length) {
          const groupIndex = groups.length
          const group = {
            key: String(baseKey),
            title: column.title,
            className: column.className,
            colorClass: GROUP_PALETTE[groupIndex % GROUP_PALETTE.length],
            reorderable: column.reorderable !== false,
            children: []
          }
          column.children.forEach((child, childIndex) => {
            const leaf = this.createLeaf(child, columnKeyOf(child, childIndex, baseKey), baseKey)
            group.children.push(leaf)
            leaves.push(leaf)
          })
          groups.push(group)
        } else {
          const leaf = this.createLeaf(column, baseKey, ROOT_CONTAINER)
          topLeaves.push(leaf)
          leaves.push(leaf)
        }
      })

      return { groups, topLeaves, leaves }
    },
    groupLeaves() {
      return this.normalizedColumns.groups.reduce(
        (acc, group) => acc.concat(group.children),
        []
      )
    },
    hasGroupHeader() {
      return this.normalizedColumns.groups.length > 0
    },
    /**
     * 表头第一行的单元格，按列的真实顺序交错排列：
     * 非分组列（rowspan=2）与分组列（colspan）必须按 columns 的顺序出现，
     * 否则分组排在前面时表头会和表体错位（拖拽的命中判定也会拿到错的坐标）。
     */
    headerTopCells() {
      const cells = []
      const groups = this.normalizedColumns.groups
      const topLeaves = this.normalizedColumns.topLeaves

      this.orderedColumns.forEach((column, index) => {
        const key = columnKeyOf(column, index, ROOT_CONTAINER)
        if (Array.isArray(column.children) && column.children.length) {
          const group = groups.filter((item) => item.key === key)[0]
          if (group) cells.push({ type: 'group', key, group })
          return
        }
        const leaf = topLeaves.filter((item) => item.key === key)[0]
        if (leaf) cells.push({ type: 'leaf', key, leaf })
      })

      return cells
    },
    /**
     * 合并计划：key 是列 key，spans 记录锚点行的 rowSpan，skip 记录被合并掉的格子。
     * 只有声明了 merge 的列才会出现在这里。
     */
    mergePlan() {
      return buildMergePlan(this.normalizedColumns.leaves, this.dataSource)
    },
    totalLeafCount() {
      return this.normalizedColumns.leaves.length + (this.selectionColumnEnabled ? 1 : 0)
    },
    /** 左侧冻结列的 left 偏移与总宽度（无冻结列时为 0） */
    leftOffsets() {
      const map = {}
      let accumulated = 0

      if (this.selectionColumnEnabled && this.selectionFixed) {
        map.__selection = 0
        accumulated += this.resolveSelectionWidth()
      }

      this.normalizedColumns.leaves.forEach((leaf) => {
        if (leaf.fixed === 'left') {
          map[leaf.key] = accumulated
          accumulated += this.resolveLeafWidth(leaf)
        }
      })

      return { map, freezeWidth: accumulated }
    },
    freezeWidth() {
      return this.leftOffsets.freezeWidth
    },
    wrapStyle() {
      return { '--freeze-w': this.freezeWidth + 'px' }
    },
    selectionCellStyle() {
      const style = {
        minWidth: this.selectionWidth + 'px',
        width: this.selectionWidth + 'px'
      }
      if (this.selectionFixed) style.left = '0px'
      return style
    },
    scrollStyle() {
      const y = this.scroll && this.scroll.y
      if (y === undefined || y === null || y === false) return {}
      return { maxHeight: typeof y === 'number' ? y + 'px' : y }
    },
    tableStyle() {
      const style = {}
      if (this.resizeLayoutActive) {
        // 固定布局下列宽由我们算，表格宽度按列宽之和给
        style.width = this.totalColumnWidth + 'px'
      } else {
        const x = this.scroll && this.scroll.x
        if (x !== undefined && x !== null && x !== false) {
          style.width = typeof x === 'number' ? x + 'px' : x
        }
      }
      if (this.effectiveTableLayout) style.tableLayout = this.effectiveTableLayout
      return style
    },
    selectedKeys() {
      if (this.isControlledSelection) return this.rowSelection.selectedRowKeys || []
      return this.innerSelectedKeys
    },
    /** 未被 getCheckboxProps 禁用的行（含原始下标，供 rowKey 函数使用） */
    selectableRowList() {
      return selectableRows(this.dataSource, this.rowSelection)
    },
    allSelected() {
      return selectionState(this.selectedKeys, this.selectableRowList, this.rowKey).all
    },
    indeterminate() {
      return selectionState(this.selectedKeys, this.selectableRowList, this.rowKey).some
    }
  },
  mounted() {
    this._handleResize = () => {
      this.seedWidthsFromLayout()
      this.measureFixedCells()
      this.updateShadows()
    }
    window.addEventListener('resize', this._handleResize)
    this.$nextTick(this._handleResize)
  },
  updated() {
    this.$nextTick(() => {
      this.seedWidthsFromLayout()
      this.measureFixedCells()
      this.updateShadows()
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this._handleResize)
    this.detachResize()
    this.detachDrag()
  },
  watch: {
    /** 父组件回写 columns（比如接了事件做持久化）后，清掉已经被 props 落地的内部覆盖 */
    columns() {
      this.syncOverridesWithProps()
    }
  },
  methods: {
    createLeaf(column, key, containerKey) {
      const fixedLeft = column.fixed === true || column.fixed === 'left'
      return {
        key: String(key),
        title: column.title,
        dataIndex: column.dataIndex,
        width: column.width,
        align: column.align,
        fixed: fixedLeft ? 'left' : null,
        className: column.className,
        customRender: column.customRender,
        slotName: column.scopedSlots && column.scopedSlots.customRender,
        // merge: true = 相邻行同值纵向合并；也可以传 (record, prevRecord, index, prevIndex) => boolean
        merge: column.merge || null,
        // editable: true 或 { type, options, placeholder, rules, trigger }
        editable: column.editable || null,
        // 这两个是「拖宽 / 拖顺序」的开关，默认跟随表级开关；容器 key 用来限制只能在同层拖动
        resizable: column.resizable !== false,
        reorderable: column.reorderable !== false,
        containerKey: containerKey || ROOT_CONTAINER
      }
    },
    toNumber(value) {
      if (value === undefined || value === null || value === '') return 0
      const parsed = typeof value === 'number' ? value : parseFloat(value)
      return isNaN(parsed) ? 0 : parsed
    },
    resolveLeafWidth(leaf) {
      if (typeof this.widthOverrides[leaf.key] === 'number') {
        return this.widthOverrides[leaf.key]
      }
      if (Object.prototype.hasOwnProperty.call(this.measuredWidths, leaf.key)) {
        return this.measuredWidths[leaf.key]
      }
      return this.toNumber(leaf.width)
    },
    /** 该列当前生效的宽度：内部拖宽覆盖优先，其次才是列上声明的 width */
    widthOf(leaf) {
      const override = this.widthOverrides[leaf.key]
      if (typeof override === 'number') return override
      return this.toNumber(leaf.width)
    },
    resolveSelectionWidth() {
      if (Object.prototype.hasOwnProperty.call(this.measuredWidths, '__selection')) {
        return this.measuredWidths.__selection
      }
      return this.selectionWidth
    },
    cellClasses(leaf) {
      const classes = {}
      if (leaf.fixed === 'left') classes['sgt-fixed-left'] = true
      if (leaf.align === 'right') classes['sgt-align-right'] = true
      if (leaf.align === 'center') classes['sgt-align-center'] = true
      if (leaf.className) classes[leaf.className] = true
      return classes
    },
    cellStyle(leaf) {
      const style = {}
      const width = this.widthOf(leaf)
      if (width) {
        style.minWidth = width + 'px'
        if (this.effectiveTableLayout === 'fixed') style.width = width + 'px'
      }
      if (leaf.fixed === 'left') {
        const offset = this.leftOffsets.map[leaf.key]
        style.left = (offset || 0) + 'px'
      }
      return style
    },
    getRowKey(record, index) {
      return resolveRowKey(this.rowKey, record, index)
    },
    isRowSelected(record, index) {
      return isRowSelectedInKeys(this.selectedKeys, this.rowKey, record, index)
    },
    isRowDisabled(record, index) {
      return isRowDisabledByProps(this.rowSelection, record, index)
    },
    displayText(leaf, record) {
      const field = leaf.dataIndex || leaf.key
      const raw = record[field]
      if (raw === '' || raw === null || raw === undefined) return EMPTY_TEXT
      return raw
    },
    isMergedAway(leaf, rowIndex) {
      return isMergedAwayInPlan(this.mergePlan, leaf.key, rowIndex)
    },
    spanSize(leaf, rowIndex) {
      return spanSizeInPlan(this.mergePlan, leaf.key, rowIndex)
    },
    mergeRowSpan(leaf, rowIndex) {
      return rowSpanAttr(this.mergePlan, leaf.key, rowIndex)
    },
    /** 合并格只要覆盖的行里有任意一行被选中就一起高亮 */
    isSpanSelected(leaf, rowIndex) {
      if (!this.selectionColumnEnabled) return false
      return spanRowIndexes(this.mergePlan, leaf.key, rowIndex).some((cursor) => {
        const record = this.dataSource[cursor]
        return !!(record && this.isRowSelected(record, cursor))
      })
    },
    /* ---------------- 列宽拖拽 / 列顺序拖拽 ---------------- */
    canResize(leaf) {
      return this.resizable && leaf.resizable !== false
    },
    /** 表头 cell 上的状态 class：可拖提示 / 正在拖 / 落点线 */
    headerStateClasses(key) {
      const classes = {}
      if (this.reorderable) classes['sgt-reorderable'] = true
      if (this.dragState && this.dragState.active && this.dragState.key === key) {
        classes['is-dragging'] = true
      }
      if (this.dropIndicator && this.dropIndicator.key === key) {
        classes[this.dropIndicator.side === 'before' ? 'is-drop-before' : 'is-drop-after'] = true
      }
      return classes
    },
    /**
     * 拖宽开启后，先按当前真实渲染宽度把每列固化下来，
     * 这样切到固定布局时不会因为列宽重新分配而跳一下，拖动也只影响被拖的那一列。
     */
    seedWidthsFromLayout() {
      if (!this.resizable || this.widthsSeeded) return
      const scroll = this.$refs.scroll
      if (!scroll) return

      const seeded = Object.assign({}, this.widthOverrides)
      let found = 0

      this.normalizedColumns.leaves.forEach((leaf) => {
        if (typeof seeded[leaf.key] === 'number') return
        const cell = scroll.querySelector('[data-sgt-key="' + leaf.key + '"]')
        if (!cell) return
        const width = Math.round(cell.getBoundingClientRect().width)
        if (width > 0) {
          seeded[leaf.key] = width
          found += 1
        }
      })

      if (!found) return
      this.widthOverrides = seeded
      this.widthsSeeded = true
    },
    beginResize(leaf, event) {
      if (!this.canResize(leaf)) return
      const header = event.currentTarget.closest ? event.currentTarget.closest('th') : null
      const startWidth =
        this.widthOverrides[leaf.key] ||
        (header ? Math.round(header.getBoundingClientRect().width) : 0) ||
        this.toNumber(leaf.width)

      this.resizeState = { key: leaf.key, startX: event.clientX, startWidth, width: startWidth }
      document.addEventListener('pointermove', this.handleResizeMove)
      document.addEventListener('pointerup', this.handleResizeEnd)
      document.body.classList.add('sgt-resizing')
    },
    handleResizeMove(event) {
      const state = this.resizeState
      if (!state) return
      const width = clampColumnWidth(
        state.startWidth + (event.clientX - state.startX),
        this.minColumnWidth,
        this.maxColumnWidth
      )
      if (width === state.width) return
      state.width = width
      this.widthOverrides = Object.assign({}, this.widthOverrides, { [state.key]: width })
    },
    handleResizeEnd() {
      const state = this.resizeState
      const changed = !!(state && state.width !== state.startWidth)
      this.detachResize()
      if (!changed) return
      this.$emit('column-resize', {
        key: state.key,
        width: state.width,
        columns: this.appliedColumns
      })
    },
    detachResize() {
      document.removeEventListener('pointermove', this.handleResizeMove)
      document.removeEventListener('pointerup', this.handleResizeEnd)
      document.body.classList.remove('sgt-resizing')
      this.resizeState = null
    },
    /** 双击热区：回到列上声明的宽度 */
    resetColumnWidth(leaf) {
      if (!this.canResize(leaf)) return
      if (typeof this.widthOverrides[leaf.key] !== 'number') return
      const next = Object.assign({}, this.widthOverrides)
      delete next[leaf.key]
      this.widthOverrides = next
      this.$emit('column-resize', {
        key: leaf.key,
        width: this.toNumber(leaf.width),
        columns: this.appliedColumns
      })
    },
    beginHeaderDrag(key, containerKey, event) {
      if (!this.reorderable) return
      if (event.button !== undefined && event.button !== 0) return
      const meta = this.headerMeta[key]
      if (meta && meta.reorderable === false) return
      // 阻止默认行为，否则鼠标一拖就会开始选文本，手感很差
      if (event.preventDefault) event.preventDefault()

      this.dragState = {
        key,
        containerKey,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        nextKeys: null
      }
      document.addEventListener('pointermove', this.handleDragMove)
      document.addEventListener('pointerup', this.handleDragEnd)
    },
    handleDragMove(event) {
      const state = this.dragState
      if (!state) return

      if (!state.active) {
        // 先给一个位移阈值，避免单纯点一下表头就被当成拖动
        if (
          Math.abs(event.clientX - state.startX) < 4 &&
          Math.abs(event.clientY - state.startY) < 4
        ) {
          return
        }
        state.active = true
        document.body.classList.add('sgt-dragging')
      }

      // 跟着光标走的预览块，让用户看得见自己在拖什么
      const meta = this.headerMeta[state.key]
      this.dragGhost = {
        title: (meta && meta.title) || state.key,
        x: event.clientX,
        y: event.clientY
      }

      const keys = this.containerKeys(state.containerKey)
      const others = keys.filter((key) => key !== state.key)
      let insertAt = others.length

      for (let i = 0; i < others.length; i += 1) {
        const rect = this.headerRectOf(others[i])
        if (rect && event.clientX < rect.left + rect.width / 2) {
          insertAt = i
          break
        }
      }

      // 冻结列必须留在最左前缀里，不能跨过冻结边界
      const frozen = this.frozenKeysInContainer(state.containerKey)
      if (frozen.length) {
        const othersFrozen = others.filter((key) => frozen.indexOf(key) >= 0).length
        insertAt =
          frozen.indexOf(state.key) >= 0
            ? Math.min(insertAt, othersFrozen)
            : Math.max(insertAt, othersFrozen)
      }

      const nextKeys = others.slice()
      nextKeys.splice(insertAt, 0, state.key)
      state.nextKeys = nextKeys

      const anchor = insertAt < others.length ? others[insertAt] : others[others.length - 1]
      this.dropIndicator = anchor
        ? { key: anchor, side: insertAt < others.length ? 'before' : 'after' }
        : null
    },
    handleDragEnd() {
      const state = this.dragState
      const nextKeys = state ? state.nextKeys : null
      const active = !!(state && state.active)
      const containerKey = state ? state.containerKey : null
      const key = state ? state.key : null
      this.detachDrag()

      if (!active || !nextKeys || !containerKey) return
      const currentKeys = this.containerKeys(containerKey)
      if (sameKeyOrder(currentKeys, nextKeys)) return

      this.orderOverrides = Object.assign({}, this.orderOverrides, { [containerKey]: nextKeys })
      this.$emit('column-reorder', {
        key,
        containerKey,
        fromIndex: currentKeys.indexOf(key),
        toIndex: nextKeys.indexOf(key),
        columns: this.appliedColumns
      })
    },
    detachDrag() {
      document.removeEventListener('pointermove', this.handleDragMove)
      document.removeEventListener('pointerup', this.handleDragEnd)
      document.body.classList.remove('sgt-dragging')
      this.dragState = null
      this.dropIndicator = null
      this.dragGhost = null
    },
    /** 某一层当前的 key 顺序（顶层用 __root，分组用自己的 key） */
    containerKeys(containerKey) {
      if (containerKey === ROOT_CONTAINER) {
        return this.orderedColumns.map((column, index) => columnKeyOf(column, index, ROOT_CONTAINER))
      }
      const group = this.orderedColumns.find(
        (column, index) => columnKeyOf(column, index, ROOT_CONTAINER) === containerKey
      )
      if (!group || !Array.isArray(group.children)) return []
      return group.children.map((child, index) => columnKeyOf(child, index, containerKey))
    },
    headerRectOf(key) {
      const scroll = this.$refs.scroll
      if (!scroll) return null
      const node = scroll.querySelector('[data-sgt-header-key="' + key + '"]')
      return node ? node.getBoundingClientRect() : null
    },
    frozenKeysInContainer(containerKey) {
      if (containerKey !== ROOT_CONTAINER) return []
      return this.normalizedColumns.leaves
        .filter((leaf) => leaf.fixed === 'left')
        .map((leaf) => leaf.key)
    },
    /** 父组件回写了 columns 时，丢掉已经被 props 落地的覆盖，避免内部状态和 props 打架 */
    syncOverridesWithProps() {
      const propWidths = this.propWidthMap()
      const widthOverrides = {}
      Object.keys(this.widthOverrides).forEach((key) => {
        if (propWidths[key] !== this.widthOverrides[key]) widthOverrides[key] = this.widthOverrides[key]
      })

      const propOrders = collectOrderMap(this.columns)
      const orderOverrides = {}
      Object.keys(this.orderOverrides).forEach((containerKey) => {
        if (!sameKeyOrder(propOrders[containerKey], this.orderOverrides[containerKey])) {
          orderOverrides[containerKey] = this.orderOverrides[containerKey]
        }
      })

      this.widthOverrides = widthOverrides
      this.orderOverrides = orderOverrides
    },
    propWidthMap() {
      const map = {}
      const walk = (list, parentKey) => {
        const columns = Array.isArray(list) ? list : []
        columns.forEach((column, index) => {
          const key = columnKeyOf(column, index, parentKey)
          map[key] = this.toNumber(column.width)
          if (Array.isArray(column.children)) walk(column.children, key)
        })
      }
      walk(this.columns, ROOT_CONTAINER)
      return map
    },
    isStatusColumn(leaf) {
      return leaf.key === STATUS_KEY || leaf.dataIndex === STATUS_KEY
    },
    statusBadgeClass(leaf, record) {
      const field = leaf.dataIndex || leaf.key
      return STATUS_BADGE_MAP[record[field]] || 'sgt-badge-gray'
    },
    rowClasses(record, index) {
      const classes = []
      if (this.isRowSelected(record, index)) classes.push('is-selected')
      if (typeof this.rowClassName === 'function') {
        const extra = this.rowClassName(record, index)
        if (extra) classes.push(extra)
      }
      return classes
    },
    getRowEvents(record, index) {
      if (typeof this.customRow !== 'function') return {}
      const config = this.customRow(record, index) || {}
      return config.on || {}
    },
    /* ---------------- 可编辑 ---------------- */
    isEditable(leaf) {
      return !!leaf.editable
    },
    editorConfig(leaf) {
      if (!leaf.editable) return null
      return leaf.editable === true ? {} : leaf.editable
    },
    editorType(leaf) {
      const config = this.editorConfig(leaf) || {}
      return config.type || 'input'
    },
    /** 组件内部 type 到 input type 的映射；日期用原生控件，手机上会弹系统选择器 */
    editorInputType(leaf) {
      const type = this.editorType(leaf)
      if (type === 'date') return 'date'
      if (type === 'datetime') return 'datetime-local'
      if (type === 'number') return 'number'
      return 'text'
    },
    editorTrigger(leaf) {
      const config = this.editorConfig(leaf) || {}
      return config.trigger === 'dblclick' ? 'dblclick' : 'click'
    },
    editorPlaceholder(leaf) {
      const config = this.editorConfig(leaf) || {}
      return config.placeholder || ''
    },
    editorOptions(leaf) {
      const config = this.editorConfig(leaf) || {}
      return (config.options || []).map((option) =>
        option !== null && typeof option === 'object'
          ? { label: option.label, value: option.value }
          : { label: String(option), value: option }
      )
    },
    isEditing(leaf, rowIndex) {
      return (
        !!this.editingCell &&
        this.editingCell.rowIndex === rowIndex &&
        this.editingCell.columnKey === leaf.key
      )
    },
    handleCellClick(leaf, record, rowIndex, event) {
      if (!this.isEditable(leaf)) return
      // 点可编辑格子时不要让事件冒到 customRow 的行点击上（否则会顺带切换行勾选）
      event.stopPropagation()
      if (this.editorTrigger(leaf) !== 'click') return
      this.startEdit(leaf, record, rowIndex)
    },
    handleCellDblClick(leaf, record, rowIndex, event) {
      if (!this.isEditable(leaf)) return
      event.stopPropagation()
      if (this.editorTrigger(leaf) !== 'dblclick') return
      this.startEdit(leaf, record, rowIndex)
    },
    startEdit(leaf, record, rowIndex) {
      if (this.isEditing(leaf, rowIndex)) return
      const field = leaf.dataIndex || leaf.key
      const raw = record[field]
      this.editingCell = { rowIndex, columnKey: leaf.key, leaf, record, field }
      this.draftValue = toEditorValue(this.editorType(leaf), raw)
      this.editError = ''
      this.$nextTick(this.focusEditor)
    },
    focusEditor() {
      const editor = this.$el.querySelector('.sgt-editor')
      if (!editor) return
      editor.focus()
      if (editor.tagName !== 'SELECT' && typeof editor.select === 'function') editor.select()
    },
    handleEditorInput(event) {
      this.draftValue = event.target.value
      if (this.editError) this.editError = ''
    },
    handleSelectChange(event) {
      this.draftValue = event.target.value
      this.commitEdit()
    },
    cancelEdit() {
      this.editingCell = null
      this.draftValue = ''
      this.editError = ''
    },
    normalizeEditorValue(leaf) {
      const type = this.editorType(leaf)
      if (type === 'date' || type === 'datetime') {
        return fromEditorValue(type, this.draftValue)
      }
      if (type !== 'number') return this.draftValue
      if (isEmptyValue(this.draftValue) || this.draftValue === '') return ''
      const parsed = Number(this.draftValue)
      return isNaN(parsed) ? this.draftValue : parsed
    },
    runRules(leaf, value, record) {
      return runRulesOf(this.editorConfig(leaf), value, record)
    },
    async commitEdit() {
      const cell = this.editingCell
      if (!cell) return

      const record = this.dataSource[cell.rowIndex]
      if (!record) {
        // 行已经不在了（父组件换了数据），直接收摊
        this.cancelEdit()
        return
      }

      const raw = this.draftValue
      const value = this.normalizeEditorValue(cell.leaf)
      const error = await this.runRules(cell.leaf, value, record)
      if (error) {
        // 校验没过：不提交、不退出编辑
        this.editError = error
        this.$nextTick(this.focusEditor)
        return
      }

      this.finishEdit(cell, value, raw)
    },
    finishEdit(cell, value, raw) {
      const { rowIndex, field, leaf } = cell
      const mergedRowIndexes = spanRowIndexes(this.mergePlan, leaf.key, rowIndex)

      const oldValue = this.dataSource[rowIndex] ? this.dataSource[rowIndex][field] : undefined
      // 拿编辑器里的原始文本跟「旧值转成编辑器格式」比：没动过的格子直接收摊，
      // 日期这类进编辑器会被规范化的类型也不会被误判成改动
      const unchanged =
        toComparableString(raw) ===
        toComparableString(toEditorValue(this.editorType(leaf), oldValue))

      this.editingCell = null
      this.draftValue = ''
      this.editError = ''

      if (unchanged) return

      // 不改 props：产出一份新数组交给父组件，配合 :data-source.sync 使用
      const nextDataSource = this.dataSource.map((item, index) =>
        mergedRowIndexes.indexOf(index) >= 0 ? Object.assign({}, item, { [field]: value }) : item
      )

      this.$emit('update:dataSource', nextDataSource)
      this.$emit('cell-change', {
        value,
        oldValue,
        record: this.dataSource[rowIndex],
        dataIndex: field,
        rowIndex,
        column: leaf,
        mergedRowIndexes,
        dataSource: nextDataSource
      })
    },
    rowsByKeys(keys) {
      return pickRowsByKeys(this.dataSource, keys, this.rowKey)
    },
    commitSelection(nextKeys) {
      if (!this.isControlledSelection) this.innerSelectedKeys = nextKeys
      if (this.rowSelection && typeof this.rowSelection.onChange === 'function') {
        this.rowSelection.onChange(nextKeys, this.rowsByKeys(nextKeys))
      }
    },
    handleRowSelect(record, index, event) {
      if (this.isRowDisabled(record, index)) return
      const checked = !!event.target.checked
      const key = this.getRowKey(record, index)
      const nextKeys = toggleKeys(this.selectedKeys, key, checked, this.selectionType)

      this.commitSelection(nextKeys)

      if (this.rowSelection && typeof this.rowSelection.onSelect === 'function') {
        this.rowSelection.onSelect(record, checked, this.rowsByKeys(nextKeys), event)
      }
    },
    handleSelectAll(event) {
      const checked = !!event.target.checked
      const list = this.selectableRowList
      const changedRowList = changedRows(list, this.selectedKeys, checked, this.rowKey)
      const nextKeys = selectAllKeys(list, checked, this.rowKey)

      this.commitSelection(nextKeys)

      if (this.rowSelection && typeof this.rowSelection.onSelectAll === 'function') {
        this.rowSelection.onSelectAll(checked, this.rowsByKeys(nextKeys), changedRowList)
      }
    },
    /** 供父组件（例如 customRow 里的点击行）切换某一行，受控/未受控都适用 */
    toggleRowSelection(record, index) {
      if (this.isRowDisabled(record, index)) return
      const key = this.getRowKey(record, index)
      const checked = this.selectedKeys.indexOf(key) < 0
      // 行点击始终按复选框增删（与重构前保持一致）
      const nextKeys = toggleKeys(this.selectedKeys, key, checked, 'checkbox')

      this.commitSelection(nextKeys)

      if (this.rowSelection && typeof this.rowSelection.onSelect === 'function') {
        this.rowSelection.onSelect(
          record,
          checked,
          this.rowsByKeys(nextKeys),
          this.selectionType === 'radio' ? nextKeys[0] : key
        )
      }
    },
    measureFixedCells() {
      const scroll = this.$refs.scroll
      if (!scroll) return

      const widths = {}
      const firstRow = scroll.querySelector('tbody tr.sgt-row')

      if (!firstRow) {
        // 没有数据行时回退到声明宽度
        this.commitMeasuredWidths(widths)
        return
      }

      if (this.selectionColumnEnabled && this.selectionFixed) {
        const cell = firstRow.querySelector('td.sgt-selection-cell')
        if (cell) widths.__selection = cell.getBoundingClientRect().width
      }

      const fixedCells = firstRow.querySelectorAll('td.sgt-fixed-left')
      for (let i = 0; i < fixedCells.length; i++) {
        const cell = fixedCells[i]
        const key = cell.getAttribute('data-sgt-key')
        if (key) widths[key] = cell.getBoundingClientRect().width
      }

      this.commitMeasuredWidths(widths)
    },
    commitMeasuredWidths(widths) {
      const previous = this.measuredWidths
      const previousKeys = Object.keys(previous)
      const nextKeys = Object.keys(widths)
      const unchanged =
        previousKeys.length === nextKeys.length &&
        nextKeys.every((key) => Math.abs((previous[key] || 0) - widths[key]) < 0.5)

      // 只在真的变了才写回，避免 updated 钩子里的测量触发死循环
      if (!unchanged) this.measuredWidths = widths
    },
    handleScroll() {
      this.updateShadows()
    },
    updateShadows() {
      const scroll = this.$refs.scroll
      if (!scroll) return

      const max = scroll.scrollWidth - scroll.clientWidth
      const scrollable = max > SCROLL_STEP
      const start = scrollable && scroll.scrollLeft > SCROLL_STEP
      const end = scrollable && scroll.scrollLeft < max - SCROLL_STEP

      if (this.showStartShadow !== start) this.showStartShadow = start
      if (this.showEndShadow !== end) this.showEndShadow = end
    }
  }
}
</script>

<style scoped>
.sgt-wrap {
  position: relative;
  --freeze-w: 0px;
  --header-row-h: 42px;
}

.sgt-scroll {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}

/* 左右滚动阴影：左阴影从冻结列之后开始，无冻结列时即 0px */
.sgt-wrap::before,
.sgt-wrap::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 22px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 9;
}

.sgt-wrap::before {
  left: var(--freeze-w);
  background: linear-gradient(to right, rgba(15, 23, 42, 0.16), transparent);
}

.sgt-wrap::after {
  right: 0;
  background: linear-gradient(to left, rgba(15, 23, 42, 0.16), transparent);
}

.sgt-wrap.is-start::before {
  opacity: 1;
}

.sgt-wrap.is-end::after {
  opacity: 1;
}

.sgt-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  /* 内容比容器窄时把表格撑满，避免右边留一大片空白；
     内容更宽时 width: max-content 生效，照常横向滚动 */
  min-width: 100%;
}

.sgt-table th,
.sgt-table td {
  box-sizing: border-box;
  height: 42px;
  padding: 0 10px;
  text-align: left;
  white-space: nowrap;
  border-bottom: 1px solid #e5e7eb;
  border-right: 1px solid #f1f5f9;
}

.sgt-table td {
  background: #fff;
}

.sgt-table thead th {
  background: #f8fafc;
  color: #334155;
  font-weight: 600;
  border-bottom: 1px solid #cbd5e1;
}

.sgt-table tbody tr:last-child td {
  border-bottom: none;
}

/* ---------- 列宽拖拽 / 列顺序拖拽 ---------- */
/* 拖宽时切固定布局，表格宽度按列宽之和给，所以这里要把「撑满容器」的 min-width 关掉 */
.sgt-table.sgt-table--resizable {
  min-width: 0;
}

.sgt-table--resizable th,
.sgt-table--resizable td {
  overflow: hidden;
  text-overflow: ellipsis;
}

.sgt-table thead th.sgt-reorderable {
  cursor: grab;
  /* 拖列时不要选中表头文字；触屏上由我们接管手势，否则浏览器会先滚页面 */
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.sgt-table thead th.is-dragging {
  cursor: grabbing;
  opacity: 0.55;
  background-image: repeating-linear-gradient(
    135deg,
    rgba(37, 99, 235, 0.12) 0,
    rgba(37, 99, 235, 0.12) 4px,
    transparent 4px,
    transparent 8px
  );
}

.sgt-table thead th.is-drop-before {
  box-shadow: inset 4px 0 0 #2563eb;
}

.sgt-table thead th.is-drop-after {
  box-shadow: inset -4px 0 0 #2563eb;
}

/* 跟随光标的拖拽预览 */
.sgt-drag-ghost {
  position: fixed;
  z-index: 40;
  padding: 4px 10px;
  border: 1px solid #2563eb;
  border-radius: 4px;
  background: #fff;
  color: #2563eb;
  font-size: 12px;
  line-height: 18px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  pointer-events: none;
  transform: translate(12px, -50%);
}

.sgt-resizer {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  width: 7px;
  height: 100%;
  cursor: col-resize;
  /* 触屏上拖热区时不要顺带滚动页面 */
  touch-action: none;
}

.sgt-resizer:hover {
  background: rgba(37, 99, 235, 0.22);
}

/* 拖动过程中给整页一个统一的光标，避免鼠标移出表头就变回默认 */
body.sgt-resizing {
  cursor: col-resize;
  user-select: none;
}

body.sgt-dragging {
  cursor: grabbing;
  user-select: none;
}

.sgt-bordered th,
.sgt-bordered td {
  border-right: 1px solid #e5e7eb;
}

/* 注意：下面这些修饰类的权重必须高过基础规则 `.sgt-table th, .sgt-table td`（0,1,1），
   所以一律带 .sgt-table + 元素名写成 (0,2,2)，否则 text-align / border / padding 会被基础规则吃掉 */
.sgt-table th.sgt-align-right,
.sgt-table td.sgt-align-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.sgt-table th.sgt-align-center,
.sgt-table td.sgt-align-center {
  text-align: center;
}

/* 分组表头配色（按分组下标取模） */
.sgt-g-0 {
  background: #eef2ff !important;
  color: #3730a3;
}

.sgt-g-1 {
  background: #ecfdf5 !important;
  color: #065f46;
}

.sgt-g-2 {
  background: #fef3c7 !important;
  color: #92400e;
}

.sgt-g-3 {
  background: #fce7f3 !important;
  color: #9d174d;
}

.sgt-g-4 {
  background: #e0f2fe !important;
  color: #075985;
}

/* 勾选列 */
.sgt-table th.sgt-selection-cell,
.sgt-table td.sgt-selection-cell {
  padding: 0 !important;
  text-align: center;
}

.sgt-table .sgt-selection-cell input {
  width: 18px;
  height: 18px;
  margin: 0;
  vertical-align: middle;
  accent-color: #2563eb;
}

/* 可编辑单元格 */
.sgt-cell.is-editing {
  padding: 4px 6px;
}

.sgt-editor {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 56px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #2563eb;
  border-radius: 4px;
  background: #fff;
  color: inherit;
  font: inherit;
  outline: none;
}

.sgt-editor:focus {
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

select.sgt-editor {
  padding: 0 4px;
}

.sgt-editor-error {
  margin-top: 2px;
  color: #dc2626;
  font-size: 11px;
  line-height: 14px;
  white-space: normal;
}

/* 状态徽章 */
.sgt-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 18px;
}

.sgt-badge-blue {
  background: #e0f2fe;
  color: #0369a1;
}

.sgt-badge-amber {
  background: #fef3c7;
  color: #92400e;
}

.sgt-badge-green {
  background: #dcfce7;
  color: #166534;
}

.sgt-badge-gray {
  background: #f1f5f9;
  color: #475569;
}

/* 选中行高亮 */
.sgt-table tbody tr.is-selected td {
  background: #eff6ff;
}

.sgt-table tbody tr.is-selected td.sgt-fixed-left {
  background: #eff6ff;
}

/* 合并格：覆盖范围内任意一行被选中时整格一起高亮 */
.sgt-table tbody td.is-span-selected {
  background: #eff6ff;
}

/* 表头吸顶：两行分组表头各自吸顶，第二行贴在首行下方 */
.sgt-table thead th {
  position: sticky;
  top: 0;
  z-index: 5;
}

.sgt-table thead tr.sgt-head-row-2 th {
  top: var(--header-row-h);
}

/* 左侧冻结列 */
.sgt-table th.sgt-fixed-left,
.sgt-table td.sgt-fixed-left {
  position: sticky;
  z-index: 6;
  background: #fff;
  border-right: 1px solid #cbd5e1;
}

.sgt-table thead th.sgt-fixed-left {
  z-index: 8;
  background: #f8fafc;
}

/* 空数据 */
.sgt-table td.sgt-empty-cell {
  height: auto !important;
  padding: 28px 0 !important;
  text-align: center;
  color: #94a3b8;
}
</style>

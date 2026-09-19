<template>
  <div class="page">
    <h1>移动端表格适配 · 22 字段 + 勾选框</h1>
    <p class="tip">
      Vue 2 组件 ScrollGroupTable 版 · 建议用 Chrome 设备模拟器或手机查看，重点感受多字段 +
      多选下的差异
    </p>

    <h2>方案一：横向滚动 + 两行分组表头 + 滚动阴影</h2>
    <p class="tip">
      22 列全部保留，左右滑动查看；表头在纵向滚动时吸顶。当前已选
      <b>{{ selectedKeysInFirst.length }}</b> 项（受控模式，表一自己维护 selectedRowKeys）。
    </p>
    <div class="card-box">
      <scroll-group-table
        ref="scrollTable"
        :columns="columns"
        :data-source="rows"
        row-key="no"
        :row-selection="rowSelectionInFirst"
        :scroll="{ x: 'max-content', y: 340 }"
        :custom-row="customRowInFirst"
      >
        <!-- 作用域插槽：对应 columns 里 amount 列的 scopedSlots.customRender -->
        <template #amount="{ text }">
          <span class="amount">{{ text }}</span>
        </template>
      </scroll-group-table>
    </div>

    <h2>方案三变体：首列冻结（勾选框 + 订单号）+ 横向滚动</h2>
    <p class="tip">
      左滑时「勾选框 + 订单号」固定不动，左阴影从冻结列之后开始；此表是未受控模式，点击行由
      customRow 调组件暴露的 toggleRowSelection。
    </p>
    <div class="card-box">
      <scroll-group-table
        ref="frozenTable"
        :columns="frozenColumns"
        :data-source="rows"
        row-key="no"
        :row-selection="rowSelectionInFrozen"
        :custom-row="customRowInFrozen"
      />
    </div>

    <h2>合并单元格：merge: true / 自定义判据</h2>
    <p class="tip">
      「客户」「部门」相邻同值自动纵向合并；「下单时间」用函数判据按日期合并（忽略具体时刻）；
      「交货日期」有两行为空，空值不参与合并。合并格只要覆盖的行里有任意一行被勾选，整格一起高亮。
    </p>
    <div class="card-box">
      <scroll-group-table
        :columns="mergeColumns"
        :data-source="mergeRows"
        row-key="no"
        :row-selection="rowSelectionInMerge"
        :scroll="{ x: 'max-content', y: 340 }"
      />
    </div>

    <h2>可编辑：editable 列字段 + rules 校验</h2>
    <p class="tip">
      单击单元格进入编辑（列上写 editable.trigger: 'dblclick' 可改成双击），回车或失焦提交，
      Esc 取消。客户必填且至少 2 个字，数量必须是 1~999 的数字，状态是下拉框，金额有格式校验；
      「下单时间」是 <b>datetime-local</b>、「交货日期」是原生 <b>date</b> 控件（手机上会弹系统
      日期选择器，交货日期还演示了必填），「部门」是合并列，改一次会写回整组的 5 行。已提交
      <b>{{ editCount }}</b> 次。
    </p>
    <p v-if="lastEditText" class="tip last-edit">最近一次：{{ lastEditText }}</p>
    <div class="card-box">
      <scroll-group-table
        :columns="editableColumns"
        :data-source.sync="editableRows"
        row-key="no"
        :scroll="{ x: 'max-content', y: 340 }"
        @cell-change="handleCellChange"
      />
    </div>

    <h2>边界：空数据 + 单行表头（列不带 children）</h2>
    <p class="tip">
      数据为空时用 #empty 插槽占位；列没有 children 时表头自动退化成单行。
    </p>
    <div class="card-box">
      <scroll-group-table :columns="flatColumns" :data-source="[]" row-key="no">
        <template #empty>没有符合条件的订单</template>
      </scroll-group-table>
    </div>
  </div>
</template>

<script>
import ScrollGroupTable from './components/ScrollGroupTable.vue'
import {
  columns,
  editableColumns,
  editableRows,
  flatColumns,
  frozenColumns,
  mergeColumns,
  mergeRows,
  rows
} from './data/demoTable'

export default {
  name: 'App',
  components: { ScrollGroupTable },
  data() {
    return {
      columns,
      editableColumns,
      // 复制一份，避免编辑结果影响其它卡片共用的数据
      editableRows: editableRows.map((record) => Object.assign({}, record)),
      frozenColumns,
      flatColumns,
      mergeColumns,
      mergeRows,
      rows,
      editCount: 0,
      lastEditText: '',
      // 受控模式：初始先选中第 2 行，勾选变化由 onChange 写回
      selectedKeysInFirst: ['SO-20240102']
    }
  },
  computed: {
    /** 受控模式：selectedRowKeys 由父组件维护，onChange 里写回 */
    rowSelectionInFirst() {
      return {
        type: 'checkbox',
        columnWidth: 46,
        selectedRowKeys: this.selectedKeysInFirst,
        getCheckboxProps: this.getCheckboxProps,
        onChange: (keys) => {
          this.selectedKeysInFirst = keys
        }
      }
    },
    /** 未受控模式：不给 selectedRowKeys，组件内部自己维护选中态 */
    rowSelectionInFrozen() {
      return {
        type: 'checkbox',
        columnWidth: 46,
        fixed: true,
        getCheckboxProps: this.getCheckboxProps
      }
    },
    /** 合并单元格示例：未受控勾选，用来演示「合并格跟随整组高亮」 */
    rowSelectionInMerge() {
      return {
        type: 'checkbox',
        columnWidth: 46
      }
    }
  },
  methods: {
    handleCellChange(payload) {
      this.editCount += 1
      this.lastEditText =
        '第 ' +
        (payload.rowIndex + 1) +
        ' 行「' +
        payload.column.title +
        '」：' +
        this.toText(payload.oldValue) +
        ' → ' +
        this.toText(payload.value) +
        '（写回 ' +
        payload.mergedRowIndexes.length +
        ' 行）'
    },
    toText(value) {
      return value === '' || value === null || value === undefined ? '空' : String(value)
    },
    getCheckboxProps(record) {
      return { props: { disabled: record.status === '已取消' } }
    },
    customRowInFirst(record) {
      return {
        on: {
          click: (event) => {
            if (!this.isRowClickable(event, record)) return
            const next = this.selectedKeysInFirst.slice()
            const position = next.indexOf(record.no)
            if (position >= 0) next.splice(position, 1)
            else next.push(record.no)
            this.selectedKeysInFirst = next
          }
        }
      }
    },
    customRowInFrozen(record) {
      return {
        on: {
          click: (event) => {
            if (!this.isRowClickable(event, record)) return
            this.$refs.frozenTable.toggleRowSelection(record)
          }
        }
      }
    },
    isRowClickable(event, record) {
      if (event.target.closest('input, label, a, button')) return false
      return !record || record.status !== '已取消'
    }
  }
}
</script>

<style>
body {
  margin: 0;
  padding: 16px;
  background: #f1f5f9;
  color: #1f2937;
  font: 14px/1.5 -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', Arial,
    sans-serif;
}
</style>

<style scoped>
.page h1 {
  font-size: 20px;
  margin: 0 0 4px;
}

.page h2 {
  font-size: 16px;
  margin: 28px 0 6px;
}

.tip {
  font-size: 12px;
  color: #64748b;
  margin: 0 0 10px;
}

.card-box {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.amount {
  font-variant-numeric: tabular-nums;
  color: #0f766e;
}

.last-edit {
  color: #0f766e;
}
</style>

<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source="rows"
      row-key="no"
      :row-selection="rowSelection"
      :custom-row="customRow"
    >
      <template #customer="{ text, currentIndex }">{{ currentIndex + 1 }}. {{ text }}</template>
    </scroll-group-table>
    <p class="demo-hint">已选 {{ selectedKeys.length }} 项：{{ selectedKeys.join('、') || '无' }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

const rows = [
  { no: 'SO-20240001', customer: '张三', dept: '华南销售部', status: '已发货' },
  { no: 'SO-20240002', customer: '李四', dept: '华北销售部', status: '待付款' },
  { no: 'SO-20240003', customer: '王五', dept: '华东销售部', status: '已完成' },
  { no: 'SO-20240004', customer: '赵六', dept: '华东销售部', status: '已取消' }
]

export default {
  name: 'SelectionDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows,
      selectedKeys: ['SO-20240002'],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        // 这一列用作用域插槽渲染，演示插槽能拿到 currentIndex 与 text
        {
          title: '客户',
          dataIndex: 'customer',
          key: 'customer',
          width: 110,
          scopedSlots: { customRender: 'customer' }
        },
        { title: '部门', dataIndex: 'dept', key: 'dept', width: 120 },
        { title: '状态', dataIndex: 'status', key: 'status', width: 90 }
      ]
    }
  },
  computed: {
    // 受控：selectedRowKeys 由父组件维护，onChange 里写回
    rowSelection() {
      return {
        type: 'checkbox',
        columnWidth: 46,
        selectedRowKeys: this.selectedKeys,
        getCheckboxProps: (record) => ({ props: { disabled: record.status === '已取消' } }),
        onChange: (keys) => {
          this.selectedKeys = keys
        }
      }
    }
  },
  methods: {
    // 点整行也能切换勾选，避开勾选框本身和禁用的行
    customRow(record) {
      return {
        on: {
          click: (event) => {
            if (event.target.closest('input, label, a, button')) return
            if (record.status === '已取消') return
            const next = this.selectedKeys.slice()
            const position = next.indexOf(record.no)
            if (position >= 0) next.splice(position, 1)
            else next.push(record.no)
            this.selectedKeys = next
          }
        }
      }
    }
  }
}
</script>

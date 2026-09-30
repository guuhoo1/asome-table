<template>
  <div>
    <advance-table-compat
      title="订单列表"
      :columns="columns"
      :data-source="pagedRows"
      row-key="no"
      :row-selection="rowSelection"
      :pagination="{ current: page.current, pageSize: page.pageSize, total: rows.length, showSizeChanger: true }"
      storage-key="atc-demo"
      @refresh="onRefresh"
      @change="onChange"
      @dblclickRow="onDblclick"
    >
      <!-- 老壳会给每列自动挂一个以列 key 命名的插槽，这里覆盖「客户」列 -->
      <template #customer="{ text, currentIndex }">{{ currentIndex + 1 }}. {{ text }}</template>
    </advance-table-compat>
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import AdvanceTableCompat from '../../components/table/AdvanceTableCompat.vue'

export default {
  name: 'AdvanceCompatDemo',
  components: { AdvanceTableCompat },
  data() {
    return {
      message: '点「刷新」、勾选行、双击行试试：这些都是老壳 AdvanceTable 的行为',
      refreshCount: 0,
      selected: [],
      page: { current: 1, pageSize: 2 },
      rows: [
        { no: 'SO-20240001', customer: '张三', status: '已发货', amount: '¥299.00' },
        { no: 'SO-20240002', customer: '李四', status: '待付款', amount: '¥599.00' },
        { no: 'SO-20240003', customer: '王五', status: '已完成', amount: '¥159.00' },
        { no: 'SO-20240004', customer: '赵六', status: '已取消', amount: '¥597.00' }
      ],
      columns: [
        // 序号列：分页时要带上页码偏移
        { title: '序号', key: 'serial', width: 70, isSerialNumber: true },
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        // 这几列都没写 align，老壳会把它们默认居中
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 110 },
        { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 110 }
      ]
    }
  },
  computed: {
    // 分页只是事件，数据由页面自己按页码切片（与老壳一致）
    pagedRows() {
      const start = (this.page.current - 1) * this.page.pageSize
      return this.rows.slice(start, start + this.page.pageSize)
    },
    rowSelection() {
      return {
        type: 'checkbox',
        columnWidth: 46,
        selectedRowKeys: this.selected,
        onChange: (keys) => {
          this.selected = keys
        }
      }
    }
  },
  methods: {
    onChange(pagination) {
      this.page = { current: pagination.current, pageSize: pagination.pageSize }
      this.message = 'change: current=' + pagination.current + ', pageSize=' + pagination.pageSize
    },
    onRefresh() {
      this.refreshCount += 1
      this.message = '收到 refresh 事件（第 ' + this.refreshCount + ' 次）'
    },
    onDblclick(record) {
      this.message = '收到 dblclickRow：' + record.no
    }
  }
}
</script>

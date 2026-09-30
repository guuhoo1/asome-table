<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source.sync="rows"
      row-key="no"
      @sort-change="onSort"
      @cell-change="onCellChange"
    />
    <p class="demo-hint">{{ message }}｜数据顺序：{{ dataOrder }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'SortDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      message: '点表头排序：升序 → 降序 → 取消；空值永远排最后',
      // 用来验证「排序状态下编辑不会改动父数组的原始顺序」
      dataOrder: 'SO-20240001,SO-20240002,SO-20240003,SO-20240004',
      rows: [
        { no: 'SO-20240001', customer: '张三', qty: 3, deliveryDate: '2024-03-05' },
        { no: 'SO-20240002', customer: '李四', qty: 1, deliveryDate: '' },
        { no: 'SO-20240003', customer: '王五', qty: 2, deliveryDate: '2024-03-02' },
        { no: 'SO-20240004', customer: '赵六', qty: null, deliveryDate: '2024-03-09' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        // 客户列既能排序也能编辑，用来验证两者共存
        {
          title: '客户',
          dataIndex: 'customer',
          key: 'customer',
          width: 100,
          sorter: true,
          editable: true
        },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 90, align: 'right', sorter: true },
        { title: '交货日期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 140, sorter: true }
      ]
    }
  },
  methods: {
    onSort(payload) {
      this.message = payload.order
        ? '「' + payload.columnKey + '」' + (payload.order === 'ascend' ? '升序' : '降序')
        : '已取消排序'
    },
    onCellChange(payload) {
      this.rows = payload.dataSource
      this.dataOrder = payload.dataSource.map((row) => row.no).join(',')
      this.message = '已把「' + payload.column.title + '」改成 ' + payload.value
    }
  }
}
</script>

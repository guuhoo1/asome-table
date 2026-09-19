<template>
  <scroll-group-table :columns="columns" :data-source="[]" row-key="no">
    <template #empty>没有符合条件的订单</template>
  </scroll-group-table>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'EmptyDemo',
  components: { ScrollGroupTable },
  data() {
    // 列不带 children 时表头自动退化成单行
    return {
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 90 },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
        { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 160 }
      ]
    }
  }
}
</script>

<template>
  <advance-table-compat
    title="自动高度"
    is-need-auto-table-hight
    :reserved-height="160"
    :columns="columns"
    :data-source="rows"
    row-key="no"
  />
</template>

<script>
import AdvanceTableCompat from '../../components/table/AdvanceTableCompat.vue'

const rows = []
for (let i = 1; i <= 12; i += 1) {
  rows.push({
    no: 'SO-2024' + String(100 + i).padStart(4, '0'),
    customer: ['张三', '李四', '王五', '赵六'][i % 4],
    status: ['已发货', '待付款', '已完成', '已取消'][i % 4],
    amount: '¥' + (100 * i).toFixed(2)
  })
}

export default {
  name: 'AdvanceAutoHeightDemo',
  components: { AdvanceTableCompat },
  data() {
    return {
      rows,
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 100 },
        { title: '状态', dataIndex: 'status', key: 'status', width: 110 },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 120 }
      ]
    }
  }
}
</script>

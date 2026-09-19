<template>
  <scroll-group-table :columns="columns" :data-source.sync="rows" row-key="no" />
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'DateDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 140 },
        {
          title: '下单时间',
          dataIndex: 'orderTime',
          key: 'orderTime',
          width: 180,
          // 存储是 'YYYY-MM-DD HH:mm'，编辑器里自动转成 datetime-local 要的 'YYYY-MM-DDTHH:mm'
          editable: { type: 'datetime' }
        },
        {
          title: '交货日期',
          dataIndex: 'deliveryDate',
          key: 'deliveryDate',
          width: 160,
          editable: { type: 'date', rules: [{ required: true, message: '请选择交货日期' }] }
        }
      ],
      rows: [
        { no: 'SO-20240001', orderTime: '2024-03-01 09:12', deliveryDate: '2024-03-05' },
        { no: 'SO-20240002', orderTime: '2024-03-02 14:40', deliveryDate: '2024-03-06' },
        { no: 'SO-20240003', orderTime: '2024-03-03 18:05', deliveryDate: '' }
      ]
    }
  }
}
</script>

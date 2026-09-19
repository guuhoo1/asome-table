<template>
  <scroll-group-table :columns="columns" :data-source="rows" row-key="no" />
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'MergeDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows: [
        { no: 'SO-20240001', customer: '张三', dept: '华南销售部', product: '无线耳机', amount: '¥299.00', orderTime: '2024-03-01 09:12', deliveryDate: '2024-03-05' },
        { no: 'SO-20240002', customer: '张三', dept: '华南销售部', product: '机械键盘', amount: '¥599.00', orderTime: '2024-03-01 14:40', deliveryDate: '2024-03-06' },
        { no: 'SO-20240003', customer: '张三', dept: '华南销售部', product: 'USB-C 扩展坞', amount: '¥597.00', orderTime: '2024-03-01 18:05', deliveryDate: '2024-03-07' },
        { no: 'SO-20240004', customer: '李四', dept: '华南销售部', product: '显示器支架', amount: '¥159.00', orderTime: '2024-03-02 10:20', deliveryDate: '' },
        { no: 'SO-20240005', customer: '李四', dept: '华南销售部', product: '蓝牙音箱', amount: '¥458.00', orderTime: '2024-03-02 16:30', deliveryDate: '' },
        { no: 'SO-20240006', customer: '王五', dept: '华东销售部', product: '人体工学椅', amount: '¥1,299.00', orderTime: '2024-03-03 09:00', deliveryDate: '2024-03-08' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        // 相邻行值相同就纵向合并成一格
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 90, merge: true },
        // 值跨了不同客户也会继续合并（这里 5 行同部门合成一格）
        { title: '部门', dataIndex: 'dept', key: 'dept', width: 130, merge: true },
        { title: '商品名称', dataIndex: 'product', key: 'product', width: 140 },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' },
        {
          title: '下单时间',
          dataIndex: 'orderTime',
          key: 'orderTime',
          width: 170,
          // 判据不够用时写函数：按「日期」合并，忽略具体时刻
          merge: (record, prevRecord) =>
            String(record.orderTime).slice(0, 10) === String(prevRecord.orderTime).slice(0, 10)
        },
        // 这两行交货日期是空的，空值不参与合并，会是两个独立的 -
        { title: '交货日期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 130, merge: true }
      ]
    }
  }
}
</script>

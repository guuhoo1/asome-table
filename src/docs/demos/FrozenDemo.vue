<template>
  <scroll-group-table
    :columns="columns"
    :data-source="rows"
    row-key="no"
    :row-selection="rowSelection"
  />
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'FrozenDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      // fixed: true 让勾选列和「订单号」一起钉在左边，左阴影从冻结列之后开始
      rowSelection: { type: 'checkbox', columnWidth: 46, fixed: true },
      rows: [
        { no: 'SO-20240001', customer: '张三', product: '无线耳机', qty: 1, amount: '¥299.00', status: '已发货', orderTime: '2024-01-01 12:00' },
        { no: 'SO-20240002', customer: '李四', product: '机械键盘', qty: 1, amount: '¥599.00', status: '待付款', orderTime: '2024-01-02 09:20' },
        { no: 'SO-20240003', customer: '王五', product: '显示器支架', qty: 2, amount: '¥159.00', status: '已完成', orderTime: '2024-01-03 18:45' },
        { no: 'SO-20240004', customer: '赵六', product: 'USB-C 扩展坞', qty: 3, amount: '¥597.00', status: '已取消', orderTime: '2024-01-04 10:10' },
        { no: 'SO-20240005', customer: '张三', product: '蓝牙音箱', qty: 2, amount: '¥458.00', status: '已发货', orderTime: '2024-01-05 14:30' }
      ],
      columns: [
        // 只有 fixed: 'left' 的列（以及 fixed 的勾选列）会钉在左边
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },
        {
          title: '客户与商品',
          key: 'group-frozen',
          children: [
            { title: '客户', dataIndex: 'customer', key: 'customer', width: 100 },
            { title: '商品名称', dataIndex: 'product', key: 'product', width: 160 },
            { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, align: 'right' }
          ]
        },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
        { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 170 }
      ]
    }
  }
}
</script>

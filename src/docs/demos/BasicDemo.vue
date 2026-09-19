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

const rows = [
  { no: 'SO-20240001', customer: '张三', phone: '13800000001', address: '广东省深圳市南山区科技园', sku: 'P-1001', product: '无线耳机', qty: 1, amount: '¥299.00', status: '已发货', orderTime: '2024-01-01 12:00', remark: '尽快发货' },
  { no: 'SO-20240002', customer: '李四', phone: '13800000002', address: '北京市朝阳区建国路 88 号', sku: 'P-1002', product: '机械键盘', qty: 1, amount: '¥599.00', status: '待付款', orderTime: '2024-01-02 09:20', remark: '' },
  { no: 'SO-20240003', customer: '王五', phone: '13800000003', address: '上海市浦东新区张江高科', sku: 'P-1003', product: '显示器支架', qty: 2, amount: '¥159.00', status: '已完成', orderTime: '2024-01-03 18:45', remark: '已签收' },
  { no: 'SO-20240004', customer: '赵六', phone: '13800000004', address: '浙江省杭州市余杭区未来科技城', sku: 'P-1004', product: 'USB-C 扩展坞', qty: 3, amount: '¥597.00', status: '已取消', orderTime: '2024-01-04 10:10', remark: '' },
  { no: 'SO-20240005', customer: '张三', phone: '13800000005', address: '四川省成都市高新区天府大道', sku: 'P-1005', product: '蓝牙音箱', qty: 2, amount: '¥458.00', status: '已发货', orderTime: '2024-01-05 14:30', remark: '客户催单' },
  { no: 'SO-20240006', customer: '李四', phone: '13800000006', address: '江苏省南京市建邺区奥体中心', sku: 'P-1006', product: '人体工学椅', qty: 1, amount: '¥1,299.00', status: '待付款', orderTime: '2024-01-06 08:55', remark: '' }
]

export default {
  name: 'BasicDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows,
      // 未受控勾选：不给 selectedRowKeys，组件内部自己维护
      rowSelection: {
        type: 'checkbox',
        columnWidth: 46,
        getCheckboxProps: (record) => ({ props: { disabled: record.status === '已取消' } })
      },
      // 带 children 的列 = 第一行的分组表头；不带的列（订单号）用 rowspan 占两行
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        {
          title: '基本信息',
          key: 'group-basic',
          children: [
            { title: '客户', dataIndex: 'customer', key: 'customer', width: 80 },
            { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 },
            { title: '地址', dataIndex: 'address', key: 'address', width: 200 }
          ]
        },
        {
          title: '商品信息',
          key: 'group-product',
          children: [
            { title: '商品编码', dataIndex: 'sku', key: 'sku', width: 100 },
            { title: '商品名称', dataIndex: 'product', key: 'product', width: 120 },
            { title: '数量', dataIndex: 'qty', key: 'qty', width: 60, align: 'right' }
          ]
        },
        {
          title: '金额信息',
          key: 'group-amount',
          children: [
            { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' }
          ]
        },
        {
          title: '状态与时间',
          key: 'group-status',
          children: [
            { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
            { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 150 },
            { title: '备注', dataIndex: 'remark', key: 'remark', width: 140 }
          ]
        }
      ]
    }
  }
}
</script>

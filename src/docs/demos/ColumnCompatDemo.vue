<template>
  <scroll-group-table :columns="columns" :data-source="rows" row-key="no" />
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'ColumnCompatDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows: [
        { no: 'SO-01', amount: 299, customer: { name: '张三', tag: { label: 'VIP' } } },
        { no: 'SO-02', amount: 1599, customer: { name: '李四', tag: { label: '普通' } } },
        { no: 'SO-03', amount: 88, customer: { name: '王五', tag: { label: 'VIP' } } }
      ],
      columns: [
        // isSerialNumber：按行号生成，不取数据字段
        { title: '序号', key: 'serial', width: 70, align: 'right', isSerialNumber: true },
        { title: '订单号', dataIndex: 'no', key: 'no', width: 120 },
        // formatter：老壳的格式化函数，优先级高于直接取值
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 110,
          align: 'right',
          formatter: (value) => '¥' + value
        },
        // isSubObj：dataIndex 是点号路径，深层取值
        {
          title: '客户',
          dataIndex: 'customer.name',
          key: 'customerName',
          width: 100,
          isSubObj: true
        },
        {
          title: '客户标签',
          dataIndex: 'customer.tag.label',
          key: 'customerTag',
          width: 100,
          isSubObj: true,
          ellipsis: true
        },
        // ellipsis：超出列宽截断并补 title；remark 故意不放进数据，验证空值占位不受影响
        { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, ellipsis: true }
      ]
    }
  }
}
</script>

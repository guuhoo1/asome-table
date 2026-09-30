<template>
  <advance-table-compat
    title="合计行"
    summary
    :summary-data="summaryData"
    :columns="columns"
    :data-source="rows"
    row-key="no"
  />
</template>

<script>
import AdvanceTableCompat from '../../components/table/AdvanceTableCompat.vue'

export default {
  name: 'AdvanceSummaryDemo',
  components: { AdvanceTableCompat },
  data() {
    return {
      rows: [
        { no: 'SO-01', customer: '张三', amount: '¥299.00', tax: '¥38.87' },
        { no: 'SO-02', customer: '李四', amount: '¥599.00', tax: '¥77.87' },
        { no: 'SO-03', customer: '王五', amount: '¥159.00', tax: '¥20.67' },
        { no: 'SO-04', customer: '赵六', amount: '¥597.00', tax: '¥77.61' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 100 },
        {
          title: '金额信息',
          key: 'group-amount',
          children: [
            { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' },
            { title: '税额', dataIndex: 'tax', key: 'tax', width: 120, align: 'right' }
          ]
        }
      ],
      // 老壳规则：按顶层列的 key 取值，分组列用分组自己的 key
      summaryData: { 'group-amount': '¥1,654.00', customer: '4 条' }
    }
  }
}
</script>

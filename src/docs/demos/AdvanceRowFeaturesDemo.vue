<template>
  <div>
    <advance-table-compat
      title="行特性"
      drag-sort
      is-fixed-bottom
      :expanded-row-render="expandedRowRender"
      :columns="columns"
      :data-source="rows"
      row-key="no"
      :scroll="{ y: 220 }"
      @drop="onDrop"
    />
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import AdvanceTableCompat from '../../components/table/AdvanceTableCompat.vue'

export default {
  name: 'AdvanceRowFeaturesDemo',
  components: { AdvanceTableCompat },
  data() {
    return {
      message: '点行首的箭头展开明细；按住行可以拖动换顺序；最后一行会钉在滚动区底部',
      rows: [
        { no: 'SO-01', customer: '张三', amount: '¥299.00', remark: '尽快发货' },
        { no: 'SO-02', customer: '李四', amount: '¥599.00', remark: '需要发票' },
        { no: 'SO-03', customer: '王五', amount: '¥159.00', remark: '' },
        { no: 'SO-04', customer: '赵六', amount: '¥597.00', remark: '' },
        { no: 'SO-05', customer: '张三', amount: '¥458.00', remark: '' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 100 },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' }
      ]
    }
  },
  methods: {
    // 老壳的 expandedRowRender 契约：(record, index, indent, expanded) => VNode | string
    expandedRowRender(record, index, indent, expanded, h) {
      return h('div', { class: 'atc-detail' }, '订单 ' + record.no + ' 的备注：' + (record.remark || '-'))
    },
    onDrop(source, target) {
      this.message = '收到 drop：' + source.no + ' → ' + target.no
    }
  }
}
</script>

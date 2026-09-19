<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source="rows"
      row-key="no"
      reorderable
      @column-reorder="onReorder"
    />
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'ReorderDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      message: '按住表头拖动换位置：顶层列之间、同一分组内都能换；冻结的订单号拖不出去',
      rows: [
        { no: 'SO-20240001', customer: '张三', product: '无线耳机', qty: 1, amount: '¥299.00' },
        { no: 'SO-20240002', customer: '李四', product: '机械键盘', qty: 1, amount: '¥599.00' },
        { no: 'SO-20240003', customer: '王五', product: '显示器支架', qty: 2, amount: '¥159.00' }
      ],
      columns: [
        // 冻结列只能待在冻结区里，所以它拖不到后面去
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },
        {
          title: '客户与商品',
          key: 'group-some',
          children: [
            { title: '客户', dataIndex: 'customer', key: 'customer', width: 100 },
            { title: '商品名称', dataIndex: 'product', key: 'product', width: 140 }
          ]
        },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 90, align: 'right' },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 120, align: 'right' }
      ]
    }
  },
  methods: {
    onReorder(payload) {
      this.message =
        '「' +
        payload.key +
        '」从第 ' +
        (payload.fromIndex + 1) +
        ' 位挪到第 ' +
        (payload.toIndex + 1) +
        ' 位（所在层：' +
        payload.containerKey +
        '）'
    }
  }
}
</script>

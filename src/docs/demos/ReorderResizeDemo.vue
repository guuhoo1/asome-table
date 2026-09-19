<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source="rows"
      row-key="no"
      resizable
      reorderable
      @column-resize="onChange"
      @column-reorder="onChange"
    />
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'ReorderResizeDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      message: '拖宽和拖顺序可以同时开：先拖宽「商品名称」，再把它和分组「金额信息」换位试试',
      rows: [
        { no: 'SO-20240001', customer: '张三', product: '无线耳机', qty: 1, price: '¥299.00', amount: '¥299.00' },
        { no: 'SO-20240002', customer: '李四', product: '机械键盘', qty: 1, price: '¥599.00', amount: '¥599.00' },
        { no: 'SO-20240003', customer: '王五', product: '显示器支架', qty: 2, price: '¥79.50', amount: '¥159.00' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },
        {
          title: '客户与商品',
          key: 'group-goods',
          children: [
            { title: '客户', dataIndex: 'customer', key: 'customer', width: 90 },
            { title: '商品名称', dataIndex: 'product', key: 'product', width: 140 }
          ]
        },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, align: 'right' },
        {
          title: '金额信息',
          key: 'group-amount',
          children: [
            { title: '单价', dataIndex: 'price', key: 'price', width: 100, align: 'right' },
            { title: '金额', dataIndex: 'amount', key: 'amount', width: 110, align: 'right' }
          ]
        }
      ]
    }
  },
  methods: {
    onChange(payload) {
      this.message = payload.width
        ? '「' + payload.key + '」列宽改成 ' + payload.width + 'px'
        : '「' + payload.key + '」换到了第 ' + (payload.toIndex + 1) + ' 位'
    }
  }
}
</script>

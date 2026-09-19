<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source="rows"
      row-key="no"
      resizable
      @column-resize="onResize"
    />
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'ResizeDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      message: '拖表头右边缘改列宽（最小 60px），双击热区回到列上声明的宽度',
      rows: [
        { no: 'SO-20240001', customer: '张三', product: '无线耳机', qty: 1, amount: '¥299.00', remark: '尽快发货' },
        { no: 'SO-20240002', customer: '李四', product: '机械键盘', qty: 1, amount: '¥599.00', remark: '' },
        { no: 'SO-20240003', customer: '王五', product: '显示器支架', qty: 2, amount: '¥159.00', remark: '已签收' },
        { no: 'SO-20240004', customer: '赵六', product: 'USB-C 扩展坞', qty: 3, amount: '¥597.00', remark: '' }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 80 },
        { title: '商品名称', dataIndex: 'product', key: 'product', width: 120 },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 70, align: 'right' },
        { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' },
        // 单列也能关掉拖宽
        { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, resizable: false }
      ]
    }
  },
  methods: {
    onResize(payload) {
      this.message =
        '「' + payload.key + '」列宽改成 ' + payload.width + 'px（事件里还带了完整 columns，可以直接存下来）'
    }
  }
}
</script>

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
  name: 'ReorderFlatDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      message:
        '单行表头（列不带 children）一样能拖：拖列头换位置；冻结的订单号拖不出去；「操作」列写了 reorderable: false，拖它没有任何反应',
      rows: [
        { no: 'SO-20240001', customer: '张三', product: '无线耳机', qty: 1, status: '已发货', action: '查看' },
        { no: 'SO-20240002', customer: '李四', product: '机械键盘', qty: 1, status: '待付款', action: '查看' },
        { no: 'SO-20240003', customer: '王五', product: '显示器支架', qty: 2, status: '已完成', action: '查看' },
        { no: 'SO-20240004', customer: '赵六', product: 'USB-C 扩展坞', qty: 3, status: '已取消', action: '查看' }
      ],
      // 全部是普通列，没有 children —— 表头就一行
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },
        { title: '客户', dataIndex: 'customer', key: 'customer', width: 90 },
        { title: '商品名称', dataIndex: 'product', key: 'product', width: 130 },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 80, align: 'right' },
        { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
        // 单列写死不可拖，比如操作列想固定在最后
        { title: '操作', dataIndex: 'action', key: 'action', width: 100, reorderable: false }
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
        ' 位（单行表头，所在层：' +
        payload.containerKey +
        '）'
    }
  }
}
</script>

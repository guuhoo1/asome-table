<template>
  <div>
    <scroll-group-table
      :columns="columns"
      :data-source.sync="rows"
      row-key="no"
      @cell-change="onCellChange"
    />
    <p class="demo-hint">{{ message }}</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'EditableDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows: [
        { no: 'SO-20240001', customer: '张三', dept: '华南销售部', qty: 2, status: '已发货', remark: '客户催单' },
        { no: 'SO-20240002', customer: '张三', dept: '华南销售部', qty: 1, status: '待付款', remark: '' },
        { no: 'SO-20240003', customer: '李四', dept: '华南销售部', qty: 3, status: '已完成', remark: '已开票' },
        { no: 'SO-20240004', customer: '王五', dept: '华东销售部', qty: 4, status: '已取消', remark: '' }
      ],
      columns: [
        // 没写 editable 的列就是只读
        { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
        {
          title: '客户',
          dataIndex: 'customer',
          key: 'customer',
          width: 100,
          editable: {
            rules: [
              { required: true, message: '客户不能为空' },
              { minLength: 2, message: '至少 2 个字符' }
            ]
          }
        },
        // merge + editable 一起用：改一次写回整组
        { title: '部门', dataIndex: 'dept', key: 'dept', width: 130, merge: true, editable: true },
        {
          title: '数量',
          dataIndex: 'qty',
          key: 'qty',
          width: 90,
          align: 'right',
          editable: {
            type: 'number',
            rules: [{ min: 1, message: '不能小于 1' }, { max: 999, message: '不能大于 999' }]
          }
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 110,
          // 下拉选完即提交
          editable: { type: 'select', options: ['待付款', '已发货', '已完成', '已取消'] }
        },
        {
          title: '备注',
          dataIndex: 'remark',
          key: 'remark',
          width: 150,
          editable: { placeholder: '最多 10 个字', rules: [{ maxLength: 10, message: '最多 10 个字符' }] }
        }
      ],
      message: '点任意格子试试：客户必填、数量 1~999、状态是下拉、部门是合并列（改一次写回整组）'
    }
  },
  methods: {
    onCellChange(payload) {
      this.message =
        payload.column.title +
        '：' +
        payload.oldValue +
        ' → ' +
        payload.value +
        '（写回 ' +
        payload.mergedRowIndexes.length +
        ' 行）'
    }
  }
}
</script>

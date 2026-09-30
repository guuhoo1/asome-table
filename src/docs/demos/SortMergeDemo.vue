<template>
  <div>
    <scroll-group-table :columns="columns" :data-source="rows" row-key="no" />
    <p class="demo-hint">点「数量」排序后，合并范围会跟着新顺序重算</p>
  </div>
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'SortMergeDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      // 数量故意与部门交错：排序后会打散原有合并，并让另一组重新合并
      rows: [
        { no: 'SO-01', dept: '华东', qty: 1 },
        { no: 'SO-02', dept: '华东', qty: 5 },
        { no: 'SO-03', dept: '华南', qty: 2 },
        { no: 'SO-04', dept: '华南', qty: 4 }
      ],
      columns: [
        { title: '订单号', dataIndex: 'no', key: 'no', width: 120 },
        // 部门既按值合并，也可排序：排序后合并范围会重算
        { title: '部门', dataIndex: 'dept', key: 'dept', width: 120, merge: true, sorter: true },
        { title: '数量', dataIndex: 'qty', key: 'qty', width: 90, align: 'right', sorter: true }
      ]
    }
  }
}
</script>

<template>
  <table class="api-table">
    <thead>
      <tr>
        <th v-for="column in columns" :key="column">{{ column }}</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(row, rowIndex) in rows" :key="rowIndex">
        <td
          v-for="(cell, cellIndex) in row"
          :key="cellIndex"
          :class="{ 'api-name': cellIndex === 0 }"
        >
          {{ cell }}
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'DocsApiTable',
  props: {
    columns: { type: Array, default: () => ['字段', '类型', '说明'] },
    rows: { type: Array, default: () => [] }
  }
}
</script>

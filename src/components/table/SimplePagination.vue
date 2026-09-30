<template>
  <div class="atc-pagination">
    <span class="atc-pagination-total">共 {{ total }} 条</span>

    <button
      type="button"
      class="atc-page-btn"
      :disabled="current <= 1"
      aria-label="上一页"
      @click="go(current - 1)"
    >
      ‹
    </button>

    <template v-for="(item, index) in items">
      <span v-if="item === '...'" :key="'gap-' + index" class="atc-page-gap">…</span>
      <button
        v-else
        :key="item"
        type="button"
        class="atc-page-btn"
        :class="{ 'is-active': item === current }"
        @click="go(item)"
      >
        {{ item }}
      </button>
    </template>

    <button
      type="button"
      class="atc-page-btn"
      :disabled="current >= pageCount"
      aria-label="下一页"
      @click="go(current + 1)"
    >
      ›
    </button>

    <select
      v-if="showSizeChanger"
      class="atc-page-size"
      :value="pageSize"
      aria-label="每页条数"
      @change="changeSize($event.target.value)"
    >
      <option v-for="option in pageSizeOptions" :key="option" :value="Number(option)">
        {{ option }} 条/页
      </option>
    </select>
  </div>
</template>

<script>
import { pageCountOf, pageItemsOf } from './pagination.js'

export default {
  name: 'SimplePagination',
  props: {
    total: { type: Number, default: 0 },
    current: { type: Number, default: 1 },
    pageSize: { type: Number, default: 10 },
    showSizeChanger: { type: Boolean, default: false },
    pageSizeOptions: { type: Array, default: () => ['10', '30', '50', '100'] }
  },
  computed: {
    pageCount() {
      return pageCountOf(this.total, this.pageSize)
    },
    items() {
      return pageItemsOf(this.current, this.pageCount)
    }
  },
  methods: {
    go(page) {
      const next = Math.min(Math.max(1, page), this.pageCount)
      if (next === this.current) return
      this.$emit('change', next, this.pageSize)
    },
    changeSize(size) {
      this.$emit('change', 1, Number(size))
    }
  }
}
</script>

<style scoped>
.atc-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 10px 0 2px;
  font-size: 13px;
  color: #4b5563;
}

.atc-pagination-total {
  margin-right: 8px;
}

.atc-page-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.atc-page-btn:hover:not(:disabled) {
  border-color: #2563eb;
  color: #2563eb;
}

.atc-page-btn.is-active {
  border-color: #2563eb;
  background: #2563eb;
  color: #fff;
}

.atc-page-btn:disabled {
  color: #cbd5e1;
  cursor: not-allowed;
}

.atc-page-gap {
  padding: 0 2px;
  color: #9ca3af;
}

.atc-page-size {
  height: 28px;
  padding: 0 4px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: #fff;
  color: inherit;
  font: inherit;
}
</style>

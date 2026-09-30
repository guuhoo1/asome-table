# F6 分页透传 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让兼容壳按老壳 `AdvanceTable` 的方式渲染分页并发 `change(pagination, filters, sorter)` 事件，页面可以继续用 `:pagination="{ current, pageSize, total }"` 的写法。

**Architecture:** 分页 UI 由兼容壳自带的轻量组件 `SimplePagination.vue` 渲染（不依赖 antd，也不进核心组件）；分页本身只是「UI + 事件」，不动数据（页面拿 `change` 事件自己去请求下一页，与老壳一致）。为了让「序号列」跟随页码，核心补一个 `rowIndexOffset` prop，作用域插槽的 `currentIndex` 与 `isSerialNumber` 都会带上它。

**Tech Stack:** Vue 2.7.16（Options API）+ node:test + Playwright。

**Spec:** 老实现见 `vela-pc/.../AdvanceTable.vue` 的 `paginationObj` / `withDefaultPagination` / `getCurrentIndex`。

## Global Constraints

- 分页 UI 不引入任何依赖；核心组件只在「序号偏移」上做一处可选扩展，不改变既有行为。
- 老壳行为要对齐：`pagination === false` 不渲染分页；`pagination` 是对象时补
  `pageSizeOptions = ['10','30','50','100']`；`withDefaultPagination` 为真时用内置的
  `{ showSizeChanger: true, current/pageStart, pageSize/pageNums }`，并且**不向外发 `change`**（老壳就是这么写的）；
  序号列的 `currentIndex = index + (current - 1) * pageSize`。
- 验证：`pnpm test`、`pnpm build`、`pnpm test:e2e`；完成后追加 `docs/PROGRESS.md`，
  全绿直接合并 main 并推送（网络不通时重试，事后补推）。

---

## Task 1: 核心补 `rowIndexOffset`

**Files:**
- Modify: `src/components/table/columnValue.js`（`resolveDisplayValue` 增加第 4 个参数）
- Modify: `tests/columnValue.test.js`
- Modify: `src/components/ScrollGroupTable.vue`（prop + `displayText` + `slotProps`）

**Interfaces:**
- Produces:
  - `resolveDisplayValue(record, column, index, extraSerialOffset = 0)`
  - 核心 prop `rowIndexOffset`（Number，默认 0）；插槽 `currentIndex = index + rowIndexOffset`，
    序号列的值也按这个偏移计算

- [x] **Step 1: 写失败的测试**

```js
test('resolveDisplayValue 支持额外的序号偏移（分页用）', () => {
  const record = {}
  assert.equal(resolveDisplayValue(record, { isSerialNumber: true }, 0, 10), 11)
  assert.equal(resolveDisplayValue(record, { isSerialNumber: true, serialNumberOffset: 5 }, 2, 10), 18)
  // 非序号列不受影响
  assert.equal(resolveDisplayValue({ no: 'A' }, { dataIndex: 'no' }, 0, 10), 'A')
})
```

- [x] **Step 2: 跑测试确认失败**（第 4 个参数被忽略，前两条会得到 1 / 8）

Run: `pnpm test`
Expected: FAIL

- [x] **Step 3: 实现**

```js
export function resolveDisplayValue(record, column, index, extraSerialOffset = 0) {
  if (!column) return undefined

  const baseValue = column.isSerialNumber
    ? serialNumberOf(index, (Number(column.serialNumberOffset) || 0) + (Number(extraSerialOffset) || 0))
    : resolveColumnValue(record, column)

  if (typeof column.formatter === 'function') return column.formatter(baseValue, record, index)
  return baseValue
}
```

核心：

```js
// props
/** 行号偏移（分页时 = (current - 1) * pageSize），影响序号列与插槽的 currentIndex */
rowIndexOffset: { type: Number, default: 0 },

// displayText
const value = resolveDisplayValue(record, leaf, index, this.rowIndexOffset)

// slotProps
currentIndex: index + (this.rowIndexOffset || 0),
```

- [x] **Step 4: 跑测试确认通过**（69 → 70 项）
- [x] **Step 5: 提交** `feat: 核心支持行号偏移（分页时序号列与 currentIndex 跟随页码）`

## Task 2: 轻量分页组件

**Files:**
- Create: `src/components/table/SimplePagination.vue`
- Create: `tests/pagination.test.js`?（分页的纯计算放在组件里不好测，改为抽 `src/components/table/pagination.js`）
- Create: `src/components/table/pagination.js`

**Interfaces:**
- Produces（纯逻辑）:
  - `pageCountOf(total, pageSize)`
  - `pageItemsOf(current, pageCount, siblings = 1)` → 形如 `[1, '...', 4, 5, 6, '...', 20]` 的页码序列
  - `offsetOf(current, pageSize)` → `(current - 1) * pageSize`
- Produces（组件）: props `total` / `current` / `pageSize` / `showSizeChanger` / `pageSizeOptions`；
  事件 `change(page, pageSize)`；class `atc-pagination`

- [x] **Step 1: 写失败的测试**

```js
import { offsetOf, pageCountOf, pageItemsOf } from '../src/components/table/pagination.js'

test('pageCountOf / offsetOf', () => {
  assert.equal(pageCountOf(0, 10), 1)
  assert.equal(pageCountOf(4, 2), 2)
  assert.equal(pageCountOf(21, 10), 3)
  assert.equal(offsetOf(1, 10), 0)
  assert.equal(offsetOf(3, 10), 20)
})

test('pageItemsOf 页数少时全列，多时用省略号', () => {
  assert.deepEqual(pageItemsOf(1, 3), [1, 2, 3])
  assert.deepEqual(pageItemsOf(5, 20), [1, '...', 4, 5, 6, '...', 20])
  assert.deepEqual(pageItemsOf(1, 20), [1, 2, '...', 20])
  assert.deepEqual(pageItemsOf(20, 20), [1, '...', 19, 20])
})
```

- [x] **Step 2: 跑测试确认失败** → **Step 3: 实现** → **Step 4: 通过** → **Step 5: 提交**

## Task 3: 兼容壳接分页

**Files:**
- Modify: `src/components/table/AdvanceTableCompat.vue`
- Modify: `src/docs/demos/AdvanceCompatDemo.vue`（加分页配置、序号列、`@change`）
- Modify: `e2e/advance-compat.spec.js`

**Interfaces:**
- Consumes: `SimplePagination`；核心的 `rowIndexOffset`
- Produces: computed `paginationConfig`；方法 `handlePageChange(page, pageSize)`；
  分页激活时给核心传 `:row-index-offset="offsetOf(current, pageSize)"`

- [x] **Step 1: 写失败的断言**

```js
test('分页：页码 / 每页条数 / change 事件 / 序号跟随页码', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '兼容壳')

  await expect(block.locator('.atc-pagination')).toContainText('共 4 条')
  await expect(rows(block).first().locator('td[data-sgt-key="serial"]')).toHaveText('1')

  await safeClick(block.locator('.atc-pagination .atc-page-btn', { hasText: '2' }))
  await expect(block.locator('.demo-hint')).toContainText('change: current=2, pageSize=2')
  // 序号列带上页码偏移
  await expect(rows(block).first().locator('td[data-sgt-key="serial"]')).toHaveText('3')
})

test('分页：pagination=false 时不渲染分页', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '兼容壳')
  await safeClick(block.locator('.atc-columns-btn')) // 先确保页面稳定
  // 另一个示例（不带分页）没有分页条
  expect(await demo(page, '列级兼容').locator('.atc-pagination').count()).toBe(0)
})
```

- [x] **Step 2: 跑断言确认失败**
- [x] **Step 3: 实现**（`paginationConfig` / `handlePageChange` / 模板里渲染分页并传 `row-index-offset`）
- [x] **Step 4: 跑断言确认通过**
- [x] **Step 5: 提交**

## Task 4: 文档与记录

- [ ] README 补「分页」小节（写法、`change` 参数、`withDefaultPagination` 行为、序号偏移）
- [ ] `docs/PROGRESS.md` 追加迭代 5（F6）
- [ ] 提交

---

## 验收标准

1. `pnpm test` 全绿（69 → 74 项左右，含分页纯逻辑）。
2. `pnpm test:e2e` 全绿（64 → 68 条左右）。
3. `pnpm build` 通过。
4. 老壳行为对齐：`pagination === false` 不渲染；对象写法补 `pageSizeOptions`；
   `withDefaultPagination` 用内置分页且不发 `change`；序号列与插槽 `currentIndex` 跟随页码。

## 非目标

- 不做数据切片（页码变化只发事件，页面自己去取数，与老壳一致）。
- 不做 `showTotal` 自定义渲染、快速跳页（jumper）；需要时再补。
- 列筛选 `filters` 属于 F9，`change` 的第 2、3 个参数当前固定传空对象。

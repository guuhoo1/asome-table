# F7 自动高度 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 对齐老壳的 `isNeedAutoTableHight` / `reservedHeight` / 固定高度开关：表格高度按「视口高度 − 表格顶部 − 预留高度」自动计算，并允许用户切换成自适应高度。

**Architecture:** 计算规则抽成纯函数 `availableHeightOf()`；兼容壳在 `dataSource` 变化、开关切换、窗口 resize 时重算，把结果通过 `scroll.y` 交给核心组件（核心用 `max-height` 实现吸顶 + 内部滚动，等价于老壳给 `.ant-table-body` 设高度）。

**Tech Stack:** Vue 2.7.16（Options API）+ node:test + Playwright。

**Spec:** 老实现见 `vela-pc/.../AdvanceTable.vue` 的 `updateTableHeight()`：

```
availableHeight = floor(window.innerHeight - tableRect.top - reservedHeight)
calculatedHeight = max(200, availableHeight)      // 最小高度 200
scrollY = calculatedHeight                        // 关掉固定高度时 scrollY = undefined
无数据时 scrollY = undefined，body 高度 100%
```

## Global Constraints

- 计算规则与最小高度（200）与老壳一致；不引入依赖。
- 一处刻意改进：老壳只在「数据变化 / 开关切换」时重算，**窗口缩放不重算**；
  我们补上 resize 监听（更符合直觉，且不会让用户看到差异）。
- 验证：`pnpm test`、`pnpm build`、`pnpm test:e2e`；完成后追加 `docs/PROGRESS.md`，
  全绿直接合并 main 并推送。

---

## Task 1: 纯逻辑 `autoHeight.js`

**Files:**
- Create: `src/components/table/autoHeight.js`
- Create: `tests/autoHeight.test.js`

**Interfaces:**
- Produces: `availableHeightOf({ viewportHeight, tableTop, reservedHeight, minHeight = 200 })`
  → `Math.max(minHeight, Math.floor(viewportHeight - tableTop - reservedHeight))`

- [x] **Step 1: 写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { availableHeightOf } from '../src/components/table/autoHeight.js'

test('按 视口高 - 顶部 - 预留 计算，并有 200 的最小高度', () => {
  assert.equal(availableHeightOf({ viewportHeight: 900, tableTop: 300, reservedHeight: 110 }), 490)
  assert.equal(availableHeightOf({ viewportHeight: 900, tableTop: 100, reservedHeight: 0 }), 800)
  // 空间不足时夹到 200
  assert.equal(availableHeightOf({ viewportHeight: 400, tableTop: 700, reservedHeight: 110 }), 200)
  assert.equal(availableHeightOf({ viewportHeight: 900, tableTop: 300, reservedHeight: 110, minHeight: 300 }), 490)
})
```

- [x] **Step 2: 跑测试确认失败** → **Step 3: 实现** → **Step 4: 通过（74 → 75）** → **Step 5: 提交**

## Task 2: 兼容壳接线自动高度

**Files:**
- Modify: `src/components/table/AdvanceTableCompat.vue`
- Create: `src/docs/demos/AdvanceAutoHeightDemo.vue`
- Modify: `src/docs/DocsApp.vue`
- Modify: `e2e/advance-compat.spec.js`

**Interfaces:**
- Consumes: `availableHeightOf`
- Produces: data `isFixedHeight`（默认 true）、`autoHeight`（计算值）；
  computed `scrollConfig`；方法 `updateTableHeight()`

- [x] **Step 1: 写失败的断言**

```js
test('自动高度：固定高度时按视口计算 max-height，切换开关后变自适应', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '自动高度')
  const scroller = block.locator('.sgt-scroll')

  const fixedHeight = await scroller.evaluate((el) => el.style.maxHeight)
  expect(Number.parseInt(fixedHeight, 10)).toBeGreaterThanOrEqual(200)

  await safeClick(block.locator('.atc-height-switch'))
  await expect(block.locator('.demo-hint')).toContainText('自适应高度')
  const autoHeight = await scroller.evaluate((el) => el.style.maxHeight)
  expect(autoHeight).toBe('')
})
```

- [x] **Step 2: 跑断言确认失败**
- [x] **Step 3: 实现**

```js
// data
isFixedHeight: true,
autoHeight: 0,

// computed
scrollConfig() {
  const base = Object.assign({}, this.scroll)
  if (this.isNeedAutoTableHight && this.isFixedHeight && this.autoHeight) {
    base.y = this.autoHeight
  }
  return base
},

// methods
updateTableHeight() {
  if (!this.isNeedAutoTableHight) return
  if (!this.isFixedHeight || !this.dataSource.length) {
    this.autoHeight = 0          // 关掉固定高度 / 无数据 → 交给默认高度
    return
  }
  const rect = this.$el.getBoundingClientRect()
  this.autoHeight = availableHeightOf({
    viewportHeight: window.innerHeight,
    tableTop: rect.top,
    reservedHeight: this.reservedHeight || 0
  })
},
toggleFixedHeight() {
  this.isFixedHeight = !this.isFixedHeight
  this.$nextTick(this.updateTableHeight)
},

// watch
dataSource() { this.$nextTick(this.updateTableHeight) },
isFixedHeight() { this.$nextTick(this.updateTableHeight) },
isNeedAutoTableHight() { this.$nextTick(this.updateTableHeight) },
reservedHeight() { this.$nextTick(this.updateTableHeight) },
```

模板：核心的 `:scroll="scrollConfig"`；标题栏里（仅当 `isNeedAutoTableHight`）加一个开关按钮：

```html
<button
  v-if="isNeedAutoTableHight"
  type="button"
  class="atc-action atc-height-switch"
  :title="isFixedHeight ? '取消固定高度' : '固定高度'"
  @click="toggleFixedHeight"
>
  {{ isFixedHeight ? '固定高度' : '自适应高度' }}
</button>
```

- [x] **Step 4: 跑断言确认通过**

## Task 3: 文档与记录

- [ ] README 补「自动高度」小节（计算规则、最小 200、开关、与老壳唯一的差异是补了 resize 重算）
- [ ] `docs/PROGRESS.md` 追加迭代 6（F7）
- [ ] 提交

---

## 验收标准

1. `pnpm test` 全绿（74 → 75）。
2. `pnpm test:e2e` 全绿（66 → 68）。
3. `pnpm build` 通过。
4. 行为对齐：`isNeedAutoTableHight` 为真时按视口计算并设置 `scroll.y`（最小 200）；
   开关切换后去掉高度限制（自适应）；无数据时不限制高度。

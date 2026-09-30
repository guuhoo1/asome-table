# F3 兼容壳 AdvanceTableCompat 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提供一个与 vela-pc 老壳 `AdvanceTable` 对外契约一致的兼容组件，让存量页面零改动切换：props 全部接受、事件与插槽语义一致、默认居中、选中提示条、列宽与列序拖拽。

**Architecture:** 兼容壳 `src/components/table/AdvanceTableCompat.vue` 只做「契约翻译」——把老壳的列约定（默认 `align: 'center'`、自动给每列挂 `scopedSlots.customRender = key`）与 props/事件翻译成核心组件 `ScrollGroupTable` 的 API；渲染与交互全部交给核心。先在 asome-table 里开发并用 Playwright 验证，验证通过后再整份拷进 vela-pc。

**Tech Stack:** Vue 2.7.16（Options API）+ Vite 5 + node:test + Playwright（`channel: 'chrome'`）。

**Spec:** `docs/PROGRESS.md` 的「累积风险与待办」与路线图 F3；老壳契约见 `vela-pc/src/components/table/advance/{AdvanceTable,draggerTable}.vue`。

## Global Constraints

- 兼容壳不得引入任何运行时依赖（不依赖 antd / lodash / hangutils），也不得改核心组件的既有行为。
- 新能力必须是可选 prop，不传时与核心组件现状一致；核心新增的插槽参数只做「增加」，不删改既有参数。
- 每完成一层都要跑：`pnpm test`、`pnpm build`、`pnpm test:e2e`（桌面 + 手机）。
- 每次迭代追加 `docs/PROGRESS.md`；验证全绿后直接合并 main 并推送（2026-09-30 约定）。

---

## 契约要点（从老壳代码读出来的，必须对齐）

1. **默认居中**：老壳 `visibleColumns` 里给每列注入 `align: item.align || 'center'`。
2. **自动挂插槽**：老壳给每列注入 `scopedSlots: item.scopedSlots ?? { customRender: item.key || item.dataIndex }`。
   也就是说页面里写 `<template #customer="{ text, record }">` 就能覆盖这一列的渲染——这是 500+ 个页面
   自定义渲染的主要方式，必须复刻。
3. **插槽参数**：老壳传给页面插槽的是 `{ dataSource, text, currentIndex, record, index }`，
   其中 `text` 是**格式化后**的值（formatter / isSubObj / 序号 都已应用），`currentIndex` 是分页偏移后的行号。
4. **列拖拽**：老壳 `drag`（默认 true）= 列宽拖拽 + 列顺序拖拽，对应核心的 `resizable` + `reorderable`。
5. **事件**：`refresh(conditions)`、`reset(conditions)`、`dblclickRow(record, index)`、
   `change(pagination, filters, sorter)`、`drop(source, target, isDrop)`。
6. **选中提示条**：`alert`（默认 true）+ `rowSelection.selectedRowKeys` 非空时，在表格上方显示
   「已选择：N 条 + 清空」，点清空触发 `rowSelection.onChange([], [])`。
7. **`isHideEmpty`**：为真且无数据时隐藏空态行。
8. 暂不实现（后续迭代）：`pagination` 透传（F6）、`summary`（F8）、`isNeedAutoTableHight`（F7）、
   `isFixedBottom` / `dragSort`（F9）、`columnStorage` / 列显隐（F4/F5）、`SearchArea` 的
   `formatConditions`。这些 prop 会**声明并接受**，但当前版本不做处理，README 里标注清楚。

---

## Task 1: 核心组件补插槽参数 `dataSource` / `currentIndex`

**Files:**
- Modify: `src/components/ScrollGroupTable.vue`
- Modify: `src/docs/demos/SelectionDemo.vue`（用一个插槽把新参数用起来，作为示例与回归）
- Modify: `e2e/table.spec.js`（断言插槽能拿到新参数）

**Interfaces:**
- Produces: 作用域插槽参数由 `{ text, record, index, column }` 扩展为
  `{ text, record, index, column, dataSource, currentIndex }`（`currentIndex` 目前等于 `index`，
  分页在 F6 接上后会带上偏移）

- [ ] **Step 1: 写失败的断言**

在 `e2e/table.spec.js` 的「表格内核」里加一条：

```js
test('作用域插槽能拿到 dataSource 与 currentIndex', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '受控勾选 + 禁用行')
  // 示例里 customer 列用插槽渲染成「序号 + 客户名」
  await expect(rows(block).nth(2).locator('td[data-sgt-key="customer"]')).toHaveText('3. 王五')
})
```

并把 `SelectionDemo.vue` 的客户列改成走插槽：

```js
{ title: '客户', dataIndex: 'customer', key: 'customer', width: 120,
  scopedSlots: { customRender: 'customer' } }
```

```vue
<scroll-group-table ...>
  <template #customer="{ text, currentIndex }">{{ currentIndex + 1 }}. {{ text }}</template>
</scroll-group-table>
```

- [ ] **Step 2: 跑断言确认失败**

Run: `pnpm build && pnpm exec playwright test e2e/table.spec.js --project=desktop`
Expected: FAIL —— 单元格文本是「王五」而不是「3. 王五」（插槽拿不到 `currentIndex`）

- [ ] **Step 3: 核心补参数**

```js
slotProps(leaf, record, index) {
  return {
    text: this.displayText(leaf, record, index),
    record,
    index,
    column: leaf,
    dataSource: this.displayRows,
    currentIndex: index + (this.serialNumberOffset || 0)
  }
},
```

模板里三处 `<slot>` / `<cell-renderer>` 的 `v-bind` 换成 `v-bind="slotProps(leaf, record, index)"`。

- [ ] **Step 4: 跑断言确认通过**

Run: `pnpm test:e2e`
Expected: PASS —— 新增 2 条（桌面 + 手机）全绿，原有 52 条不变

- [ ] **Step 5: 提交**

```bash
git add src/components/ScrollGroupTable.vue src/docs/demos/SelectionDemo.vue e2e/table.spec.js
git commit -m "feat: 作用域插槽补充 dataSource / currentIndex 参数"
```

## Task 2: 兼容壳组件 + 示例 + E2E

**Files:**
- Create: `src/components/table/AdvanceTableCompat.vue`
- Create: `src/docs/demos/AdvanceCompatDemo.vue`
- Modify: `src/docs/DocsApp.vue`（注册示例 + 新增「兼容壳」章节与导航项）
- Create: `e2e/advance-compat.spec.js`

**Interfaces:**
- Consumes: Task 1 的插槽参数；核心的 `resizable` / `reorderable` / `scroll` / `rowSelection` 等
- Produces: 兼容组件 props —— 透传类（`columns` `dataSource` `rowKey` `rowSelection` `scroll`
  `bordered` `size` `loading` `locale` `title` `footer` `expandedRowRender` `expandedRowKeys`
  `defaultExpandAllRows` `expandIcon` `expandRowByClick` `indentSize` `childrenColumnName`
  `customRow` `customHeaderRow` `rowClassName` `transformCellText` `getPopupContainer`
  `tableLayout` `showHeader`）+ 壳层类（`showHeaderBar` `drag` `dragSort` `columnStorage`
  `columnDragSort` `isHideEmpty` `isFixedBottom` `isFixedSecondBottom` `isNeedAutoTableHight`
  `reservedHeight` `type` `formatConditions` `withDefaultPagination` `summary` `summaryData`
  `summaryRender` `alert` `selectedRows` `selectedRowChange` `clearSelectedRowKeys` `pagination`）；
  事件 `refresh` / `reset` / `dblclickRow` / `drop` / `change`；插槽 `title` / `actions` / `search` /
  `alertContent` / 列名作用域插槽 / `empty`

- [ ] **Step 1: 写兼容壳（契约翻译，全部逻辑都在这一层）**

关键实现（完整文件在实现时补全）：

```js
computed: {
  /** 老壳行为：默认居中 + 给每列自动挂 scopedSlots.customRender */
  compatColumns() {
    const map = (columns) =>
      (columns || []).map((column) => {
        const key = column.key || column.dataIndex
        const next = { ...column, align: column.align || 'center' }
        if (Array.isArray(column.children)) {
          next.children = map(column.children)
        } else if (!next.scopedSlots) {
          next.scopedSlots = { customRender: key }
        }
        return next
      })
    return map(this.columns)
  },
  showAlert() {
    if (this.alert === false) return false
    const keys = this.rowSelection?.selectedRowKeys
    return Array.isArray(keys) && keys.length > 0
  },
  selectedCount() {
    return (this.rowSelection?.selectedRowKeys || []).length
  },
  tableListeners() {
    return {
      ...this.$listeners,
      'sort-change': undefined,
      // 行双击事件对齐老壳
    }
  }
}
```

模板骨架：

```vue
<div class="advance-table-compat">
  <div v-if="showHeaderBar" class="header-bar">
    <div class="title"><slot name="title">{{ title }}</slot></div>
    <div class="search"><slot name="search" /></div>
    <div class="actions">
      <slot name="actions" />
      <button type="button" class="action" title="刷新" @click="$emit('refresh')">刷新</button>
    </div>
  </div>
  <div v-if="showAlert" class="alert-bar">
    已选择：<b>{{ selectedCount }}</b> 条
    <slot name="alertContent" />
    <a @click="clearSelected">清空</a>
  </div>
  <scroll-group-table
    v-bind="$attrs"
    :columns="compatColumns"
    :data-source="dataSource"
    :row-key="rowKey"
    :row-selection="rowSelection"
    :resizable="drag"
    :reorderable="drag"
    :custom-row="compatCustomRow"
    v-on="tableListeners"
  >
    <template v-for="name in slotNames" #[name]="slotProps">
      <slot :name="name" v-bind="slotProps" />
    </template>
    <slot name="empty" slot="empty" />
  </scroll-group-table>
</div>
```

- [ ] **Step 2: 写示例（演示默认居中、列名插槽覆盖、选中提示条、refresh 事件）**

```vue
<template>
  <advance-table-compat
    title="订单列表"
    :columns="columns"
    :data-source="rows"
    row-key="no"
    :row-selection="rowSelection"
    @refresh="onRefresh"
  >
    <template #customer="{ text, currentIndex }">{{ currentIndex + 1 }}. {{ text }}</template>
  </advance-table-compat>
  <p class="demo-hint">{{ message }}</p>
</template>
```

- [ ] **Step 3: 写 E2E 断言**

```js
test.describe('兼容壳', () => {
  test('标题栏、默认居中、列名插槽、选中提示条与 refresh', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '兼容壳')

    await expect(block.locator('.header-bar .title')).toHaveText('订单列表')
    // 默认居中：没写 align 的列
    await expect(rows(block).first().locator('td[data-sgt-key="status"]')).toHaveCSS('text-align', 'center')
    // 列名插槽覆盖
    await expect(rows(block).first().locator('td[data-sgt-key="customer"]')).toHaveText('1. 张三')
    // 选中提示条
    await block.locator('tbody input[type="checkbox"]').first().check()
    await expect(block.locator('.alert-bar')).toContainText('已选择：1 条')
    await block.locator('.alert-bar a').click()
    await expect(block.locator('.alert-bar')).toHaveCount(0)
    // refresh
    await block.getByRole('button', { name: '刷新' }).click()
    await expect(block.locator('.demo-hint')).toContainText('收到 refresh')
  })
})
```

- [ ] **Step 4: 跑断言**

Run: `pnpm test:e2e`
Expected: PASS —— 新增用例全绿，原有 54 条不变

- [ ] **Step 5: 提交**

```bash
git add src/components/table/AdvanceTableCompat.vue src/docs/demos/AdvanceCompatDemo.vue src/docs/DocsApp.vue e2e/advance-compat.spec.js
git commit -m "feat: 兼容壳 AdvanceTableCompat（默认居中、列名插槽、选中提示条、refresh）"
```

## Task 3: 文档与记录

**Files:**
- Modify: `README.md`（新增「兼容壳 AdvanceTableCompat」小节，列出已支持 / 暂未支持的 prop）
- Modify: `docs/PROGRESS.md`（填「迭代 3」）

- [ ] **Step 1: README 增加小节**（已支持 / 未支持两张清单 + 迁移步骤）
- [ ] **Step 2: 追加 PROGRESS.md 的迭代 3**（做了什么 / 验证 / 踩坑）
- [ ] **Step 3: 提交**

```bash
git add README.md docs/PROGRESS.md
git commit -m "docs: 兼容壳的 README 与迭代记录"
```

---

## 验收标准

1. `pnpm test` 全绿（61 项不变，本迭代不新增纯逻辑）。
2. `pnpm test:e2e` 全绿（54 → 58 条左右，桌面 + 手机）。
3. `pnpm build` 通过。
4. 兼容壳能接受老壳的全部 props（不报 warning、不把未知 prop 透到 DOM），
   并实现：默认居中、列名插槽覆盖、选中提示条与清空、`refresh` 事件、`isHideEmpty`。
5. 核心组件行为不变（原有用例全部通过）。

## 非目标

- 不实现分页、合计行、自动高度、固定底行、行拖拽、列显隐与持久化（分别属于 F4–F9）。
- 不改动 vela-pc 的任何文件；搬运与别名切换单独作为一步，先列改动清单再执行。

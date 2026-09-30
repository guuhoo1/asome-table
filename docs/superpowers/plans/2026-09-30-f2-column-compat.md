# F2 列级兼容 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 vela-pc 存量页面的列定义能直接搬到 ScrollGroupTable —— 支持 `ellipsis`、`formatter`、`isSubObj`、`isSerialNumber` 四个列字段。

**Architecture:** 取值与格式化逻辑抽成不依赖 Vue 的纯函数模块 `src/components/table/columnValue.js`；组件渲染单元格时统一调用它得到「显示文本」，再交给作用域插槽 / `customRender` / 内置徽章渲染——与老实现 `AdvanceTable.getCurrentText` 的优先级一致。`ellipsis` 用列级 class + `max-width` 截断，并补 `title` 属性。

**Tech Stack:** Vue 2.7.16（Options API）+ Vite 5 + node:test + Playwright（`channel: 'chrome'`）。

**Spec:** `docs/PROGRESS.md` 的「迭代 2」；路线图见 `docs/superpowers/plans/2026-09-30-sorter.md` 第 1 节。

## Global Constraints

- 组件必须是纯 Vue 2 Options API，不引入 Composition API 与任何运行时依赖。
- 组件不修改父组件的 `dataSource` / `columns`；新列字段必须是**可选**的，不写时行为与现在完全一致。
- 纯逻辑一律放 `src/components/table/*.js` 并配 `node:test` 单测；浏览器行为用 Playwright 覆盖。
- 每个任务结束都要跑：`pnpm test`、`pnpm build`、`pnpm test:e2e`（桌面 + 手机都要绿）。
- 每完成一次迭代，追加 `docs/PROGRESS.md`（做了什么 / 验证 / 踩坑）。
- 提交信息用中文，格式 `feat: …` / `fix: …` / `test: …` / `docs: …`。

---

## 设计要点（对齐老实现）

老实现 `AdvanceTable.getCurrentText` 的取值顺序是：

1. `formatter(value, record, index)` 存在就先用它格式化
2. `isSubObj` 为真时按 `dataIndex` 的点号路径深层取值
3. `isSerialNumber` 为真时返回序号（分页偏移 + `index + 1`）
4. 否则取 `record[dataIndex || key]`，空值返回空串

新组件保持同一优先级，并且**作用域插槽拿到的 `text` 也是格式化后的值**——老实现就是这么做的，
否则存量页面的插槽会拿到原始值而产生视觉差异。`ellipsis` 是老壳没有但 antd 列定义常见的字段，顺带支持。

---

## Task 1: 纯逻辑模块 `columnValue.js` + 单测

**Files:**
- Create: `src/components/table/columnValue.js`
- Create: `tests/columnValue.test.js`

**Interfaces:**
- Produces:
  - `readDeepValue(record, path)`（点号路径，任一层为空返回 `undefined`）
  - `resolveColumnValue(record, column)`（`isSubObj` 走深路径，否则 `dataIndex || key`）
  - `serialNumberOf(index, offset = 0)`
  - `resolveDisplayValue(record, column, index)`（串起 formatter / 序号 / 深路径 / 普通取值）

- [ ] **Step 1: 先写失败的测试**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  readDeepValue,
  resolveColumnValue,
  resolveDisplayValue,
  serialNumberOf
} from '../src/components/table/columnValue.js'

test('readDeepValue 支持点号路径，任一层缺失返回 undefined', () => {
  const record = { customer: { name: '张三', tag: { label: 'VIP' } } }
  assert.equal(readDeepValue(record, 'customer.name'), '张三')
  assert.equal(readDeepValue(record, 'customer.tag.label'), 'VIP')
  assert.equal(readDeepValue(record, 'customer.missing'), undefined)
  assert.equal(readDeepValue(record, 'missing.deep'), undefined)
  assert.equal(readDeepValue(null, 'customer.name'), undefined)
})

test('resolveColumnValue：isSubObj 走深路径，否则取 dataIndex，缺省回退 key', () => {
  const record = { no: 'SO-1', customer: { name: '张三' } }
  assert.equal(resolveColumnValue(record, { dataIndex: 'no' }), 'SO-1')
  assert.equal(resolveColumnValue(record, { key: 'no' }), 'SO-1')
  assert.equal(resolveColumnValue(record, { dataIndex: 'customer.name', isSubObj: true }), '张三')
  assert.equal(resolveColumnValue(record, { dataIndex: 'customer.name' }), undefined)
})

test('resolveDisplayValue 优先级：formatter > 序号 > 深路径 > 普通取值', () => {
  const record = { no: 'SO-1', amount: 299, customer: { name: '张三' } }
  const yuan = (value) => '¥' + value

  assert.equal(resolveDisplayValue(record, { dataIndex: 'amount', formatter: yuan }, 0), '¥299')
  assert.equal(resolveDisplayValue(record, { isSerialNumber: true }, 2), 3)
  assert.equal(resolveDisplayValue(record, { dataIndex: 'customer.name', isSubObj: true }, 0), '张三')
  assert.equal(resolveDisplayValue(record, { dataIndex: 'no' }, 0), 'SO-1')
  // 序号列即使配了 formatter，formatter 也优先（与老实现一致）
  assert.equal(
    resolveDisplayValue(record, { isSerialNumber: true, formatter: (v) => v * 10 }, 1),
    20
  )
})

test('serialNumberOf 从 1 开始，可带分页偏移', () => {
  assert.equal(serialNumberOf(0), 1)
  assert.equal(serialNumberOf(9), 10)
  assert.equal(serialNumberOf(0, 10), 11)
  assert.equal(serialNumberOf(4, 20), 25)
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm test`
Expected: FAIL —— `Cannot find module '../src/components/table/columnValue.js'`

- [ ] **Step 3: 写最小实现**

```js
/**
 * 列取值与格式化：兼容 vela-pc 老壳（AdvanceTable.getCurrentText）的三种列约定。
 * 纯函数，不依赖 Vue。
 */

export function readDeepValue(record, path) {
  if (!record || !path) return undefined
  const segments = String(path).split('.')
  let current = record
  for (let i = 0; i < segments.length; i += 1) {
    if (current === null || current === undefined) return undefined
    current = current[segments[i]]
  }
  return current
}

export function resolveColumnValue(record, column) {
  if (!record || !column) return undefined
  const field = column.dataIndex || column.key
  return column.isSubObj ? readDeepValue(record, field) : record[field]
}

export function serialNumberOf(index, offset = 0) {
  return index + 1 + (Number(offset) || 0)
}

/** 与老实现一致：formatter 最优先，其次序号列，其次 isSubObj 深路径，最后普通取值 */
export function resolveDisplayValue(record, column, index) {
  if (!column) return undefined

  if (typeof column.formatter === 'function') {
    return column.formatter(resolveColumnValue(record, column), record, index)
  }
  if (column.isSerialNumber) {
    return serialNumberOf(index, column.serialNumberOffset)
  }
  return resolveColumnValue(record, column)
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm test`
Expected: PASS —— 总数 56 → 60（新增 4 项）

- [ ] **Step 5: 提交**

```bash
git add src/components/table/columnValue.js tests/columnValue.test.js
git commit -m "feat: 列取值与格式化纯逻辑（formatter / isSubObj / isSerialNumber）"
```

## Task 2: 示例 + Playwright 断言（先失败）

**Files:**
- Create: `src/docs/demos/ColumnCompatDemo.vue`
- Modify: `src/docs/DocsApp.vue`（注册示例 + 新增「列级兼容」章节与导航项）
- Create: `e2e/column-compat.spec.js`

**Interfaces:**
- Consumes: Task 1 的纯函数；组件列字段 `ellipsis` / `formatter` / `isSubObj` / `isSerialNumber`（Task 3 实现）
- Produces: 可复用的示例与断言

- [ ] **Step 1: 写示例（四种列约定 + 省略号）**

```vue
<template>
  <scroll-group-table :columns="columns" :data-source="rows" row-key="no" />
</template>

<script>
import ScrollGroupTable from '../../components/ScrollGroupTable.vue'

export default {
  name: 'ColumnCompatDemo',
  components: { ScrollGroupTable },
  data() {
    return {
      rows: [
        { no: 'SO-01', amount: 299, customer: { name: '张三', tag: { label: 'VIP' } } },
        { no: 'SO-02', amount: 1599, customer: { name: '李四', tag: { label: '普通' } } },
        { no: 'SO-03', amount: 88, customer: { name: '王五', tag: { label: 'VIP' } } }
      ],
      columns: [
        // isSerialNumber：行号，不取数据字段
        { title: '序号', key: 'serial', width: 70, align: 'right', isSerialNumber: true },
        { title: '订单号', dataIndex: 'no', key: 'no', width: 120 },
        // formatter：老壳的格式化函数，优先级高于直接取值
        {
          title: '金额',
          dataIndex: 'amount',
          key: 'amount',
          width: 110,
          align: 'right',
          formatter: (value) => '¥' + value
        },
        // isSubObj：dataIndex 是点号路径，深层取值
        { title: '客户', dataIndex: 'customer.name', key: 'customerName', width: 100, isSubObj: true },
        {
          title: '客户标签',
          dataIndex: 'customer.tag.label',
          key: 'customerTag',
          width: 100,
          isSubObj: true,
          ellipsis: true
        },
        // ellipsis：超出列宽截断并补 title；remark 故意不放进数据，验证空值占位不受影响
        { title: '备注', dataIndex: 'remark', key: 'remark', width: 140, ellipsis: true }
      ]
    }
  }
}
</script>
```

- [ ] **Step 2: 写 Playwright 断言**

```js
import { test, expect } from '@playwright/test'
import { columnTexts, demo, rows } from './helpers.js'

test.describe('列级兼容', () => {
  test('isSerialNumber 生成序号、formatter 格式化、isSubObj 深层取值', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')

    await expect(rows(block)).toHaveCount(3)
    expect(await columnTexts(block, 'serial')).toEqual(['1', '2', '3'])
    expect(await columnTexts(block, 'amount')).toEqual(['¥299', '¥1599', '¥88'])
    expect(await columnTexts(block, 'customerName')).toEqual(['张三', '李四', '王五'])
    expect(await columnTexts(block, 'customerTag')).toEqual(['VIP', '普通', 'VIP'])
  })

  test('ellipsis 截断并补 title，空值仍显示占位符', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')
    const remark = rows(block).first().locator('td[data-sgt-key="remark"]')

    await expect(remark).toHaveCSS('text-overflow', 'ellipsis')
    await expect(remark).toHaveText('-')
  })

  test('不写这些字段的列行为不变', async ({ page }) => {
    await page.goto('/')
    const block = demo(page, '列级兼容')
    expect(await columnTexts(block, 'no')).toEqual(['SO-01', 'SO-02', 'SO-03'])
  })
})
```

- [ ] **Step 3: 跑断言确认失败**

Run: `pnpm build` 然后 `pnpm exec playwright test e2e/column-compat.spec.js`
Expected: FAIL —— 序号列与金额列显示的是原始值（组件还没接这些列字段）

- [ ] **Step 4: 提交**

```bash
git add src/docs/demos/ColumnCompatDemo.vue src/docs/DocsApp.vue e2e/column-compat.spec.js
git commit -m "test: 列级兼容示例与 E2E 断言（先失败）"
```

## Task 3: 组件接线（列字段 + 显示文本 + 省略号）

**Files:**
- Modify: `src/components/ScrollGroupTable.vue`

**Interfaces:**
- Consumes: `resolveDisplayValue`（Task 1）
- Produces: 列字段 `ellipsis` / `formatter` / `isSubObj` / `isSerialNumber`；单元格 class `sgt-cell--ellipsis`

- [ ] **Step 1: `createLeaf` 带上四个字段**

```js
ellipsis: column.ellipsis === true,
formatter: typeof column.formatter === 'function' ? column.formatter : null,
isSubObj: column.isSubObj === true,
isSerialNumber: column.isSerialNumber === true,
```

- [ ] **Step 2: 显示文本统一走 `resolveDisplayValue`**

```js
displayText(leaf, record, index) {
  const value = resolveDisplayValue(record, leaf, index)
  if (value === '' || value === null || value === undefined) return EMPTY_TEXT
  return value
},
```

模板里所有 `displayText(leaf, record)` 改成 `displayText(leaf, record, index)`；
作用域插槽的 `:text` 同步改成格式化后的值（与老实现一致）。

- [ ] **Step 3: 单元格加省略号与 title**

单元格 `<td>` 的 class 增加 `{ 'sgt-cell--ellipsis': leaf.ellipsis }`，
并加属性 `:title="leaf.ellipsis ? displayText(leaf, record, index) : null"`。

```css
/* 列上写 ellipsis: true 时截断内容；配合列宽（width）才会真正截断 */
.sgt-table td.sgt-cell--ellipsis,
.sgt-table th.sgt-cell--ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
}
```

`cellStyle` 里为 `ellipsis` 的列补 `maxWidth`：

```js
if (leaf.ellipsis && width) style.maxWidth = width + 'px'
```

- [ ] **Step 4: 跑 E2E 确认转绿**

Run: `pnpm test:e2e`
Expected: PASS —— 新增 3 条 × 2 project 全绿，原有 46 条不变

- [ ] **Step 5: 提交**

```bash
git add src/components/ScrollGroupTable.vue
git commit -m "feat: 列级兼容（ellipsis / formatter / isSubObj / isSerialNumber）"
```

## Task 4: 文档与记录

**Files:**
- Modify: `src/docs/api.js`（Column 表补 4 行）
- Modify: `README.md`（新增「列级兼容」小节）
- Modify: `docs/PROGRESS.md`（填「迭代 2」）

- [ ] **Step 1: 补 API 表**

```js
['ellipsis', 'Boolean', '超出列宽时截断内容并补 title（配合 width 生效）'],
['formatter', 'Function', '(value, record, index) => any，老壳的格式化函数，优先级高于直接取值'],
['isSubObj', 'Boolean', 'dataIndex 按点号路径深层取值，如 customer.name'],
['isSerialNumber', 'Boolean', '渲染行号（从 1 开始），不取数据字段'],
```

- [ ] **Step 2: README 增加「列级兼容」小节**

说明四个字段语义、优先级（`formatter` > 序号 > `isSubObj` > 普通取值），
以及「插槽拿到的 `text` 也是格式化后的值」这一点，并给出迁移提示。

- [ ] **Step 3: 追加 `docs/PROGRESS.md` 的迭代 2**

填：做了什么、验证命令与结果、这一段踩到的坑（现象 → 根因 → 修法）。

- [ ] **Step 4: 提交**

```bash
git add src/docs/api.js README.md docs/PROGRESS.md
git commit -m "docs: 列级兼容的 API、README 与迭代记录"
```

---

## 验收标准

1. `pnpm test` 全绿（56 → 60 项）。
2. `pnpm test:e2e` 全绿（46 → 52 条，桌面 + 手机）。
3. `pnpm build` 通过。
4. 四个列字段生效，且**不写这些字段的列行为与之前完全一致**（原有 46 条用例不变即为证据）。
5. `docs/PROGRESS.md` 的迭代 2 记录完整（含踩坑）。

## 非目标

- 默认居中 `align` —— 那是老壳行为（`visibleColumns` 里注入 `align: 'center'`），放到 F3 兼容层做。
- 分页偏移的序号 —— 分页在 F6，本迭代只做 `index + 1`。
- 列显隐、合计行、自动高度等按路线图顺序推进。

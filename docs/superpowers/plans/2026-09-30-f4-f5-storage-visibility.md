# F4 列宽/列序持久化 + F5 列显隐 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让兼容壳复刻老壳的列宽/列序持久化（**localStorage key 规则完全一致**，用户已存的列宽不能丢），并补上列显隐面板。

**Architecture:** 两个功能都做在兼容层，核心组件不动。纯逻辑（key 计算、缓存读写、应用缓存、可见性过滤）放 `src/components/table/columnStorage.js`；兼容壳在 `compatColumns` 里先应用缓存、再交给核心，并监听核心的 `column-resize` / `column-reorder` 事件写回缓存；列显隐用一个自建的轻量下拉面板（不依赖 antd）。

**Tech Stack:** Vue 2.7.16（Options API）+ node:test + Playwright。

**Spec:** 老实现见 `vela-pc/src/components/table/advance/{draggerTable,ActionColumns}.vue`；路线图见 `docs/superpowers/plans/2026-09-30-sorter.md`。

## Global Constraints

- 不改核心组件（`ScrollGroupTable`）的行为；持久化与列显隐全部落在兼容层。
- **localStorage key 必须与老实现逐字节一致**：`${path}_${hash.toString(36)}`，其中 hash 只对
  顶层列取 `{ dataIndex: key || dataIndex, width }` 再 JSON.stringify 后按
  `hash = (hash << 5) - hash + char` 累加。固定 fixture 的期望值已用老算法算好：
  columns = `[{key:'no',width:130},{key:'group-amount',children:[...]},{dataIndex:'status',width:90}]`
  → `columnsData = [{"dataIndex":"no","width":130},{"dataIndex":"group-amount"},{"dataIndex":"status","width":90}]`
  → hash `-346854808` → base36 `-5qiavs` → key 形如 `/order/list_-5qiavs`。
- 存的形状也必须一致：递归收集所有列（含 children）成 `[{ dataIndex, width }]`，**按当前顺序**，
  这样顺序与宽度一起持久化。
- 列显隐**不持久化**（老壳的 visibleConfig 只存在内存里，每次挂载由 ActionColumns 重置为全显），
  保持同样行为才叫无缝。
- 验证：`pnpm test`、`pnpm build`、`pnpm test:e2e`（桌面 + 手机）；完成后追加 `docs/PROGRESS.md`，
  全绿直接合并 main 并推送。

---

## Task 1: 纯逻辑 `columnStorage.js` + 单测

**Files:**
- Create: `src/components/table/columnStorage.js`
- Create: `tests/columnStorage.test.js`

**Interfaces:**
- Produces:
  - `columnsHash(columns)`（老算法：只取顶层 `key || dataIndex` 与 `width`）
  - `storageKeyOf(path, columns)`
  - `readColumnCache(storage, key)` / `writeColumnCache(storage, key, columns)`
  - `applyColumnCache(columns, cache)`（恢复宽度与顺序，缺失的列排最后）
  - `filterVisibleColumns(columns, visibleConfig)`（顶层过滤，`undefined` 视为可见）

- [ ] **Step 1: 写失败的测试（含老算法 fixture）**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyColumnCache,
  columnsHash,
  filterVisibleColumns,
  readColumnCache,
  storageKeyOf,
  writeColumnCache
} from '../src/components/table/columnStorage.js'

const columns = [
  { key: 'no', width: 130 },
  { key: 'group-amount', children: [{ dataIndex: 'amount', width: 100 }] },
  { dataIndex: 'status', width: 90 }
]

test('columnsHash 与老实现逐字节一致（固定 fixture）', () => {
  assert.equal(columnsHash(columns), '-5qiavs')
  assert.equal(storageKeyOf('/order/list', columns), '/order/list_-5qiavs')
})

test('read/write 缓存：形状是 [{dataIndex,width}]，按当前顺序递归收集', () => {
  const storage = { data: {}, getItem(k) { return this.data[k] ?? null }, setItem(k, v) { this.data[k] = v } }
  writeColumnCache(storage, 'k', [
    { key: 'no', width: 120 },
    { key: 'g', children: [{ dataIndex: 'a', width: 80 }] }
  ])

  assert.deepEqual(readColumnCache(storage, 'k'), [
    { dataIndex: 'no', width: 120 },
    { dataIndex: 'g', width: undefined },
    { dataIndex: 'a', width: 80 }
  ])
})

test('applyColumnCache 恢复宽度与顺序，缺失的排最后', () => {
  const next = applyColumnCache(columns, [
    { dataIndex: 'status', width: 200 },
    { dataIndex: 'no', width: 150 }
  ])

  assert.deepEqual(next.map((c) => c.key || c.dataIndex), ['status', 'no', 'group-amount'])
  assert.equal(next[0].width, 200)
  assert.equal(next[1].width, 150)
  assert.equal(next[2].width, undefined)
})

test('applyColumnCache 不动 fixed 列的宽度（老实现行为）', () => {
  const next = applyColumnCache([{ key: 'no', width: 130, fixed: 'left' }], [
    { dataIndex: 'no', width: 300 }
  ])
  assert.equal(next[0].width, 130)
})

test('filterVisibleColumns：undefined 视为可见', () => {
  const list = [{ dataIndex: 'a' }, { dataIndex: 'b' }, { dataIndex: 'c' }]
  assert.deepEqual(
    filterVisibleColumns(list, { b: false }).map((c) => c.dataIndex),
    ['a', 'c']
  )
  assert.deepEqual(filterVisibleColumns(list, {}).length, 3)
})
```

- [ ] **Step 2: 跑测试确认失败**（模块不存在）

Run: `pnpm test`
Expected: FAIL —— `Cannot find module '../src/components/table/columnStorage.js'`

- [ ] **Step 3: 实现**

```js
/** 复刻 draggerTable.getUniqueKey：只对顶层列的 key/dataIndex 与 width 做 hash */
export function columnsHash(columns) {
  if (!Array.isArray(columns)) return ''
  const source = JSON.stringify(
    columns.map((item) => ({ dataIndex: item.key || item.dataIndex, width: item.width }))
  )
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(i)
    hash |= 0
  }
  return hash.toString(36)
}

export function storageKeyOf(path, columns) {
  return `${path}_${columnsHash(columns)}`
}

export function readColumnCache(storage, key) {
  try {
    const raw = storage && storage.getItem(key)
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : null
  } catch (error) {
    return null
  }
}

export function writeColumnCache(storage, key, columns) {
  try {
    const collect = (list, out) => {
      ;(list || []).forEach((column) => {
        out.push({ dataIndex: column.originalKey || column.key || column.dataIndex, width: column.width })
        if (Array.isArray(column.children)) collect(column.children, out)
      })
    }
    const flat = []
    collect(columns, flat)
    if (storage) storage.setItem(key, JSON.stringify(flat))
  } catch (error) {
    /* 存储不可用时静默降级 */
  }
}

/** 恢复宽度与顺序：按缓存里的顺序排列，不在缓存里的列保持原顺序排最后；fixed 列不改宽度 */
export function applyColumnCache(columns, cache) {
  if (!Array.isArray(columns) || !Array.isArray(cache) || !cache.length) return columns
  const indexOf = {}
  cache.forEach((item, index) => { indexOf[item.dataIndex] = index })

  return columns
    .map((column, index) => {
      const key = column.key || column.dataIndex
      const cached = cache.find((item) => item.dataIndex === key)
      const next = Object.assign({}, column)
      if (cached && cached.width && !next.fixed) next.width = cached.width
      if (Array.isArray(column.children)) next.children = applyColumnCache(column.children, cache)
      return { column: next, order: indexOf[key] === undefined ? Number.MAX_SAFE_INTEGER : indexOf[key], index }
    })
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.column)
}

/** 列显隐：visibleConfig 里为 undefined 的列默认可见 */
export function filterVisibleColumns(columns, visibleConfig) {
  const config = visibleConfig || {}
  return (columns || []).filter((column) => {
    const key = column.key || column.dataIndex
    const flag = config[key]
    return flag === undefined ? true : !!flag
  })
}
```

- [ ] **Step 4: 跑测试确认通过**（61 → 66 项）

- [ ] **Step 5: 提交**

```bash
git add src/components/table/columnStorage.js tests/columnStorage.test.js
git commit -m "feat: 列宽/列序持久化纯逻辑（复刻老壳 key 规则）"
```

## Task 2: 兼容壳接上持久化（读缓存 + resize/reorder 写回）

**Files:**
- Modify: `src/components/table/AdvanceTableCompat.vue`
- Modify: `src/docs/demos/AdvanceCompatDemo.vue`（传 `storage-key="atc-demo"`）
- Modify: `e2e/advance-compat.spec.js`

**Interfaces:**
- Consumes: `storageKeyOf` / `readColumnCache` / `writeColumnCache` / `applyColumnCache`
- Produces: prop `storageKey`（默认 `''`，为空时取 `this.$route && this.$route.path`，再兜底 `'default'`）；
  方法 `persistColumns(columns)`

- [ ] **Step 1: 写失败的断言**

```js
test('列宽与列序按老壳 key 规则持久化，刷新后恢复', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '兼容壳')
  const widthOf = (key) => block.locator(`thead [data-sgt-header-key="${key}"]`)
    .evaluate((el) => Math.round(el.getBoundingClientRect().width))

  const before = await widthOf('customer')
  const resizer = block.locator('.sgt-resizer[data-sgt-resizer="customer"]')
  await centerOn(resizer)
  const box = await resizer.boundingBox()
  await page.mouse.move(box.x + 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 62, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  const after = await widthOf('customer')
  expect(after).toBeGreaterThan(before + 40)

  // 存到了老壳同款 key 上
  const stored = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => k.startsWith('atc-demo_'))
    return key ? { key, value: JSON.parse(localStorage.getItem(key)) } : null
  })
  expect(stored).not.toBeNull()
  expect(stored.key).toMatch(/^atc-demo_-?[0-9a-z]+$/)
  expect(stored.value.some((item) => item.dataIndex === 'customer' && item.width > 150)).toBe(true)

  // 刷新后宽度恢复
  await page.reload()
  expect(await widthOf('customer')).toBe(after)
})
```

- [ ] **Step 2: 跑断言确认失败**（还没接持久化，localStorage 里没有 key）

- [ ] **Step 3: 兼容壳实现**

```js
props: { columnStorage: { type: Boolean, default: true }, storageKey: { type: String, default: '' } },
computed: {
  cacheKey() {
    const path = this.storageKey || (this.$route && this.$route.path) || 'default'
    return storageKeyOf(path, this.columns)
  },
  visibleColumns() {
    return filterVisibleColumns(this.compatColumns, this.visibleConfig)
  }
},
mounted() {
  // 老壳行为：挂载时读缓存并恢复列宽/顺序
  if (this.columnStorage) {
    const cache = readColumnCache(this.storage, this.cacheKey)
    if (cache) this.cache = cache
  }
},
methods: {
  getStorage() {
    try { return typeof window !== 'undefined' ? window.localStorage : null } catch (e) { return null }
  },
  persistColumns(columns) {
    if (!this.columnStorage) return
    writeColumnCache(this.getStorage(), this.cacheKey, columns)
  }
}
```

模板上把 `:columns="compatColumns"` 改成 `:columns="cachedColumns"`，并监听核心的列变更事件：

```html
@column-resize="onColumnChange"
@column-reorder="onColumnChange"
```

```js
onColumnChange(payload) {
  if (payload && payload.columns) this.persistColumns(payload.columns)
}
```

（`cachedColumns` = `applyColumnCache(compatColumns, this.cache)`，`cache` 存在 data 里。）

- [ ] **Step 4: 跑断言确认通过**

## Task 3: 列显隐面板

**Files:**
- Modify: `src/components/table/AdvanceTableCompat.vue`
- Modify: `src/docs/demos/AdvanceCompatDemo.vue`（无需改动，默认打开）
- Modify: `e2e/advance-compat.spec.js`

**Interfaces:**
- Produces: data `visibleConfig`（`{ [列 key]: boolean }`，初始全显）；事件 `update:visibleConfig`；
  方法 `resetVisibleConfig()` / `toggleAllVisible(checked)`

- [ ] **Step 1: 写失败的断言**

```js
test('列显隐：取消勾选即隐藏，全选/重置恢复', async ({ page }) => {
  await page.goto('/')
  const block = demo(page, '兼容壳')

  await block.locator('.atc-columns-btn').click()
  const panel = block.locator('.atc-columns-panel')
  await expect(panel).toBeVisible()

  await panel.locator('input[data-column-key="customer"]').uncheck()
  await expect(block.locator('thead [data-sgt-header-key="customer"]')).toHaveCount(0)

  await panel.locator('.atc-columns-all input').check()
  await expect(block.locator('thead [data-sgt-header-key="customer"]')).toHaveCount(1)

  await panel.locator('input[data-column-key="status"]').uncheck()
  await panel.getByRole('button', { name: '重置' }).click()
  await expect(block.locator('thead [data-sgt-header-key="status"]')).toHaveCount(1)
})
```

- [ ] **Step 2: 跑断言确认失败**（还没有面板）

- [ ] **Step 3: 实现面板（自建轻量下拉，不依赖 antd）**

```html
<div class="atc-columns">
  <button type="button" class="atc-columns-btn" title="列配置" @click.stop="columnsOpen = !columnsOpen">列配置</button>
  <div v-if="columnsOpen" class="atc-columns-panel" @click.stop>
    <div class="atc-columns-head">
      <label class="atc-columns-all">
        <input type="checkbox" :checked="allVisible" :indeterminate.prop="someVisible" @change="toggleAllVisible($event.target.checked)" />
        列展示
      </label>
      <button type="button" class="atc-columns-reset" @click="resetVisibleConfig">重置</button>
    </div>
    <label v-for="column in visibleConfigList" :key="column.key" class="atc-columns-item">
      <input type="checkbox" :data-column-key="column.key" :checked="column.visible" @change="toggleVisible(column.key, $event.target.checked)" />
      {{ column.title }}
    </label>
  </div>
</div>
```

点击面板外关闭：`mounted` 里挂 `document.addEventListener('click', this.closeColumns)`，
`beforeDestroy` 移除。

- [ ] **Step 4: 跑断言确认通过**

## Task 4: 文档与记录

- [ ] **Step 1: README 补「列宽/列序持久化」与「列显隐」两小节**
      （重点写 key 规则、存的形状、以及「列显隐不持久化，与老壳一致」）
- [ ] **Step 2: `docs/PROGRESS.md` 追加迭代 4（F4+F5）**
- [ ] **Step 3: 提交**

---

## 验收标准

1. `pnpm test` 全绿（61 → 66 项，含 hash 兼容 fixture）。
2. `pnpm test:e2e` 全绿（60 → 66 条左右）。
3. `pnpm build` 通过。
4. 关键兼容点：**同一条 `columns` 定义在老实现里算出的 key 与新实现一致**（fixture 已锁定）；
   存的形状 `[{dataIndex, width}]` 与顺序语义一致；固定列宽度不被缓存覆盖（老实现行为）。
5. 列显隐默认全显、不持久化（与老壳一致）。

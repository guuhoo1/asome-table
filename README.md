# ScrollGroupTable

把原 HTML demo 的「方案一：横向滚动 + 两行分组表头 + 滚动阴影」封装成的 Vue 2 组件，
另外支持**左侧列冻结**（原 demo 的方案三）、**合并单元格**、**可编辑单元格**、
**行排序**、**列宽拖拽**和**列顺序拖拽**。props 命名与语义对齐
ant-design-vue 1.x 的 `TableProps` / `TableRowSelection`，列定义使用 antd 的 `children` 嵌套结构。

## 运行

```bash
pnpm install
pnpm dev        # http://127.0.0.1:5173/ 是文档站，/demo.html 是方案对照页
pnpm build      # 产物在 dist/（dist/index.html 文档、dist/demo.html 对照页），base 为 './'
pnpm preview    # 预览构建产物
pnpm test       # 纯逻辑单测（node:test，不依赖任何测试框架）
```

## 文档

`/` 是一份 Element / antd 风格的组件文档：左侧分组导航 + 锚点高亮，每个能力一张示例卡片
（标题 → 描述 → 可交互示例 → 可折叠的高亮源码 + 复制按钮），最后是 Props / Column /
rowSelection / 事件 / 插槽 / 实例方法 的 API 表。

| 文件 | 职责 |
| --- | --- |
| `src/docs/DocsApp.vue` | 文档站布局、章节内容、hash 锚点与滚动高亮 |
| `src/docs/DemoBlock.vue` | 示例卡片：实时示例 + 显示/隐藏源码 + 复制 |
| `src/docs/DocsCodeBlock.vue` | 源码展示，配合 `highlight.js` |
| `src/docs/highlight.js` | 自写的轻量代码高亮（不引 highlight.js / prism） |
| `src/docs/ApiTable.vue` + `api.js` | API 表格渲染与数据 |
| `src/docs/demos/*.vue` | 每个示例一个自包含的 SFC，文档里用 `?raw` 展示它自己的源码 |

示例卡片里的源码是用 `import source from './demos/Xxx.vue?raw'` 拿到的，所以**文档里看到的代码
就是页面上真正跑的那份代码**，不会出现文档和实现不一致的情况。

## 测试

两层测试，都不需要额外下载浏览器（E2E 用本机已安装的 Chrome）：

```bash
pnpm test             # 纯逻辑单测（node:test，56 项，秒级）
pnpm test:e2e         # 先 pnpm build，再用 Playwright 跑真实浏览器用例（46 条：桌面 + 手机两种视口）
pnpm test:e2e:desktop # 只跑桌面项目，调试快
pnpm test:all         # 单测 + E2E
```

**单测（node:test）** 覆盖 `src/components/table/*.js` 里的纯函数——它们与 Vue 无关，所以能脱离浏览器直接跑：

| 模块 | 覆盖内容 |
| --- | --- |
| `merge.js` | 相邻同值合并、空值不合并、非相邻不合并、跨度与下标 |
| `selection.js` | 全选/半选、禁用行三种写法、radio 替换语义、keys 与行互查 |
| `validation.js` | required/pattern/min/max/minLength/maxLength/validator（含 Promise）与短路顺序 |
| `editorValue.js` | 日期与日期时间在「存储格式」和「控件格式」之间的双向转换 |
| `columnLayout.js` | 列 key 推导、顺序重排、宽度夹取、覆盖应用 |
| `sort.js` | 比较器、稳定排序、空值恒排最后、方向循环、受控状态解析 |
| `docs/highlight.js` | 代码高亮分词与转义 |

**E2E（Playwright）** 配置在 `playwright.config.js`，用例在 `e2e/*.spec.js`，公共定位与操作在 `e2e/helpers.js`：

- 用 `channel: 'chrome'` 跑**本机已安装的 Chrome**，不下载 Playwright 自带浏览器；`webServer` 会自动起
  `pnpm preview`（端口 4173），本地已有服务时 `reuseExistingServer` 直接复用。
- 两个 project：`desktop`（1440×900）与 `mobile`（Pixel 5 尺寸 393×727 + 触屏）。移动端刻意关掉了
  `isMobile` 的移动视口模拟——实测那样会让布局视口与命中判定对不上（`innerWidth` 报 1397 而不是 393），
  点击会反复被别的元素"拦截"。
- 覆盖范围：`docs.spec.js` 文档站自身（导航/章节/示例/源码块/复制/锚点/控制台无报错）、
  `table.spec.js` 表格内核 13 项（分组表头、阴影、吸顶、冻结、合并、编辑与校验、日期控件、勾选、
  拖宽、拖序、对齐、空态）、`sorting.spec.js` 行排序 5 项（升序/降序/取消、空值恒排最后、
  排序与编辑共存、排序与合并共存）。

写用例时踩到、并已封装进 `e2e/helpers.js` 的两个坑：

1. 文档页顶部有 sticky 导航栏，Playwright 默认把目标滚到顶部时会撞上它，报「被 `.docs-header` 拦截点击」
   → 用 `centerOn()` / `safeClick()` 先把元素滚到视口中间。
2. 拖动场景里连续给两个元素取坐标时，第二次滚动会让第一个元素的坐标失效 → 用 `centerOn()` 只滚一次，
   再用 `boxCenter()` 连续取点（这也解释了为什么窄屏下"目标中心 + 30px"会落到视口外被夹住）。

## 代码结构

组件是纯 Vue 2 Options API 写法，不依赖 Composition API，也不需要额外的运行时依赖，可以直接
拷进 vue-cli / Vue 2.7 的项目里用。三段容易出错的逻辑被抽成了不依赖 Vue 的纯函数模块，可以脱离
浏览器直接跑单测：

| 文件 | 职责 |
| --- | --- |
| `src/components/ScrollGroupTable.vue` | 渲染、props/事件、把纯函数接起来 |
| `src/components/table/merge.js` | 算合并跨度（`buildMergePlan`）、判断某格是否被合并掉 |
| `src/components/table/selection.js` | 全选/半选/单行切换/禁用行判定 |
| `src/components/table/validation.js` | 单元格校验规则（`runRules`） |
| `src/components/table/editorValue.js` | 编辑器值与存储值的转换（日期 / 日期时间，其它类型原样） |
| `src/components/table/values.js` | 空值判断等共用小工具 |

## 用法

```vue
<scroll-group-table
  :columns="columns"
  :data-source="rows"
  row-key="no"
  :row-selection="rowSelection"
  :scroll="{ x: 'max-content', y: 340 }"
  :custom-row="customRow"
>
  <template #amount="{ text }">{{ text }}</template>
</scroll-group-table>
```

```js
import ScrollGroupTable from './components/ScrollGroupTable.vue'

const columns = [
  { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },
  {
    title: '金额信息', // 带 children 的列 = 分组表头（第一行 colspan），自身不出数据单元格
    key: 'group-amount',
    children: [
      { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right',
        scopedSlots: { customRender: 'amount' } },
      { title: '价税合计', dataIndex: 'total', key: 'total', width: 110, align: 'right',
        customRender: (text, record, index, h) => h('span', { class: 'bold' }, text) }
    ]
  }
]

const rowSelection = {
  type: 'checkbox',           // 或 'radio'
  columnWidth: 46,
  fixed: true,                // 勾选列是否一起冻结
  selectedRowKeys: [],        // 传了 = 受控，自行在 onChange 里写回；不传 = 组件内部维护
  getCheckboxProps: (record) => ({ props: { disabled: record.status === '已取消' } }),
  onChange: (keys, rows) => {},
  onSelect: (record, selected, rows, nativeEvent) => {},
  onSelectAll: (selected, rows, changeRows) => {}
}
```

## Props

| prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `columns` | Array | `[]` | `{ title, dataIndex, key, width, align, fixed, className, children, customRender, scopedSlots, merge, editable }`；`fixed: true \| 'left'` 冻结在左侧，`merge` / `editable` 见下方各自章节 |
| `dataSource` | Array | `[]` | 数据源 |
| `rowKey` | String \| Function | `'key'` | 行唯一键，与 antd 一致 |
| `rowSelection` | Object \| null | `null` | 见上方字段；为 `null` 时不渲染勾选列 |
| `scroll` | Object | `{ x: 'max-content', y: 340 }` | `y` 即纵向滚动区高度（原 demo 的 `max-height`） |
| `bordered` | Boolean | `false` | 是否显示纵向分隔线 |
| `showHeader` | Boolean | `true` | 是否渲染表头 |
| `tableLayout` | String | `'auto'` | 透传给 `<table>` 的 `table-layout` |
| `rowClassName` | Function | `null` | `(record, index) => string`，附加在行 class 上 |
| `customRow` | Function | `null` | `(record, index) => { on: {...} }`，与 antd 一致 |
| `resizable` | Boolean | `false` | 开启表头拖宽；列上写 `resizable: false` 可单独关掉 |
| `reorderable` | Boolean | `false` | 开启拖动表头调整列顺序；列上写 `reorderable: false` 可单独关掉 |
| `minColumnWidth` | Number | `60` | 拖宽时的最小列宽 |
| `maxColumnWidth` | Number | `0` | 拖宽时的最大列宽，`0` 表示不限制 |

插槽：列上声明 `scopedSlots: { customRender: 'name' }` 后可用 `#name="{ text, record, index, column }"`；
另有 `#empty` 自定义空数据内容。

实例方法：`toggleRowSelection(record, index)` —— 供 `customRow` 等外部交互在未受控模式下切换某行。

## 合并单元格

只在列上写一个字段，表格外部不用传任何东西：

```js
{ title: '部门', dataIndex: 'dept', merge: true }   // 相邻行值相同就纵向合并成一格
{ title: '下单时间', dataIndex: 'orderTime',
  merge: (record, prevRecord, index, prevIndex) => boolean }   // 判据不够用时用函数形式
```

规则：值取 `dataIndex`（缺省回退 `key`），默认严格相等；空值（`''` / `null` / `undefined`）
一律不参与合并，避免一排 `-` 糊成一个大格子；被合并掉的格子由组件跳过渲染（不会写
`rowspan="0"`，那在 HTML 里是「跨到最后一行」的意思）；合并格只要覆盖的行里有任意一行被
勾选，整格一起高亮。目前只做纵向合并，表头合并继续用 `children` 分组。

## 可编辑单元格

同样只写在列上，父组件用 `:data-source.sync` 接住写回即可（组件不会去改你的 props）：

```vue
<scroll-group-table
  :columns="columns"
  :data-source.sync="rows"
  row-key="no"
  @cell-change="handleCellChange"
/>
```

```js
{ title: '备注', dataIndex: 'remark', editable: true }             // 默认文本框、无校验
{ title: '客户', dataIndex: 'customer', editable: {
    rules: [{ required: true, message: '客户不能为空' },
            { minLength: 2, message: '至少 2 个字符' }] } }
{ title: '数量', dataIndex: 'qty', editable: {
    type: 'number', rules: [{ min: 1 }, { max: 999 }] } }          // 不写 message 就用默认文案
{ title: '状态', dataIndex: 'status', editable: {
    type: 'select', options: ['待付款', '已发货'] } }               // 也支持 [{ label, value }]
{ title: '下单时间', dataIndex: 'orderTime', editable: { type: 'datetime' } }  // 原生 datetime-local
{ title: '交货日期', dataIndex: 'deliveryDate', editable: {
    type: 'date', rules: [{ required: true, message: '请选择交货日期' }] } }    // 原生 date
{ title: '部门', dataIndex: 'dept', merge: true, editable: true }  // 合并列改一次写回整组
```

交互：默认**单击**进入编辑（列上写 `editable.trigger: 'dblclick'` 改成双击），回车或失焦提交，
Esc 取消，`select` 选完即提交。校验失败时编辑器不退出、错误文案显示在单元格内、值不提交。
`date` / `datetime` 用浏览器原生控件（手机上会弹系统日期选择器），`date` 的存储值形如
`2024-03-05`，`datetime` 形如 `2024-03-01 09:12`，组件进出编辑器时自动在 `2024-03-01T09:12`
之间转换，写回时保持你原本的存储格式（`datetime` 精确到分钟）。打开单元格后没有改动就失焦，
不会触发提交。
支持 `required` / `pattern` / `min` / `max` / `minLength` / `maxLength` /
`validator(value, record)`（可返回 `true`、错误字符串或 Promise），每项都能用 `message` 覆盖默认文案；
空值只触发 `required`，其它规则跳过。

提交时组件发两个东西：`update:dataSource`（不可变的新数组，供 `.sync`）和
`cell-change`，payload 是 `{ value, oldValue, record, dataIndex, rowIndex, column, mergedRowIndexes, dataSource }`。
合并列被编辑时 `mergedRowIndexes` 是整组的下标（值会写回整组，否则按值合并会立刻裂开）。
点可编辑单元格不会冒泡到 `customRow` 的行点击上，所以「点行切换勾选」不会和进入编辑打架。

## 列级兼容（从 AdvanceTable 迁移）

vela-pc 老壳 `AdvanceTable` 的三条列约定可以直接用了，配合 antd 的 `ellipsis`：

```js
{ title: '序号', key: 'serial', width: 70, isSerialNumber: true }        // 行号，不取数据
{ title: '金额', dataIndex: 'amount', formatter: (v) => '¥' + v }        // 格式化
{ title: '客户', dataIndex: 'customer.name', isSubObj: true }            // 点号路径深层取值
{ title: '备注', dataIndex: 'remark', width: 140, ellipsis: true }       // 超宽截断 + title
```

取值优先级与老实现一致：`formatter` 最优先 → 序号列 → `isSubObj` 深路径 → `dataIndex`（缺省回退 `key`）。
两点注意：

1. **作用域插槽与 `customRender` 拿到的 `text` 是格式化后的值**（老壳就是这么传的），
   所以存量页面的插槽渲染不会出现差异。
2. `ellipsis` 需要列上声明 `width` 才会真正截断（组件会给单元格加 `max-width`），
   截断时同时写入 `title`，鼠标悬停能看到完整内容。

一处刻意与老实现不同的地方：**序号列同时配了 `formatter` 时，传给 `formatter` 的是序号**，
而老实现会传 `record[undefined]`（结果是 `NaN`）——这种组合本身没有意义，按更合理的行为处理。

## 行排序

列上写 `sorter` 就能点表头排序：

```js
{ title: '数量', dataIndex: 'qty', sorter: true }                    // 按 dataIndex 比较
{ title: '客户', dataIndex: 'customer', sorter: (a, b) => number }   // 自定义比较函数
{ title: '数量', dataIndex: 'qty', sorter: true,
  sortDirections: ['ascend', 'descend'], defaultSortOrder: 'descend' }
```

点击表头按「升序 → 降序 → 取消」循环，表头显示升降箭头并带 `aria-sort`。规则：空值
（`''` / `null` / `undefined`）**永远排最后**，升序降序都一样；相同值维持数据原本的相对顺序（稳定排序）。

排序状态默认由组件内部维护；传 `sortedInfo` 就是受控模式，自己在事件里写回：

```vue
<scroll-group-table
  :columns="columns"
  :data-source="rows"
  row-key="no"
  :sorted-info.sync="sortedInfo"
  @sort-change="onSort"
/>
```

```js
onSort({ columnKey, order, column, dataSource }) {}   // dataSource 仍是父组件的原始顺序
```

排序只影响**显示顺序**，组件不会改动你传入的 `dataSource`。由此带来三件事：合并单元格的跨度按新的
显示顺序重算；排序状态下编辑某一格时，改动会按 record 定位写回**父数组的原始下标**（父数组顺序不会
被打乱，`cell-change` 里额外给出 `originalRowIndexes`）；勾选按 rowKey 记录，不受排序影响。
另外，拖完表头换位或拖宽后紧跟的那次 click 会被忽略，所以「拖列」不会误触发排序。

## 列宽拖拽 / 列顺序拖拽

两个表级开关，默认都关，互不影响：

```vue
<scroll-group-table :columns="columns" :data-source="rows" row-key="no" resizable reorderable
  @column-resize="onResize" @column-reorder="onReorder" />
```

**列宽拖拽**：表头右边缘有 7px 热区，按住左右拖改列宽（默认最小 60px，可用 `minColumnWidth`
改），**双击热区**回到列上声明的宽度。开启后组件会先按当前真实渲染宽度把每列宽度固化下来，
再切到固定布局，所以打开开关本身不会让布局跳动，拖动也只影响被拖的那一列；该模式下超出列宽的
内容显示省略号。

**列顺序拖拽**：按住表头拖动换位，拖动中会在目标位置画一条蓝线（`is-drop-before/after`）。
三条约束：只能在同一层换（顶层列之间、同一分组内的子列之间，不会把两行分组表头拖裂）；
冻结列只能待在左侧冻结区里，拖不出去；勾选列不参与。

拖拽时的视觉反馈：被拖的表头会变淡并加一道斜纹，同时有一个**跟着光标走的预览块**显示列名，
目标位置显示 4px 蓝色落点线；鼠标按下时已阻止默认行为，不会顺带选中表头文字。
拖动阈值 4px，所以单纯点一下表头不会误触发换位；落在原位就等于没动。
开启 `reorderable` 的表头带了 `touch-action: none`（触屏上由组件接管手势，否则浏览器会先滚页面），
如果你更想保留在表头区域横向滑动，可以把 `reorderable` 只开在需要的列上。

两个操作结束都会发事件，payload 里都带上了**应用过顺序与宽度的完整 `columns`**，直接存下来、
下次原样传回即可持久化：

```js
onResize({ key, width, columns }) {}                       // 拖宽结束 / 双击复位
onReorder({ key, containerKey, fromIndex, toIndex, columns }) {}  // containerKey 是 __root 或分组 key
```

组件内部只在本次会话里应用覆盖；一旦父组件回写了 `columns`（也就是事件里的 `columns`），
组件会丢掉已经被 props 落地的内部覆盖，**始终以 props 为准**，不会出现内部状态和 props 打架。

算法在 `src/components/table/columnLayout.js`（列 key 推导、顺序重排、宽度夹取、覆盖应用），
都是不依赖 Vue 的纯函数，有 `tests/columnLayout.test.js` 覆盖。

## 与 a-table 的差异

- 吸顶由单个滚动容器 + `position: sticky` 实现，不拆分 header/body 两段 DOM，因此 `scroll.y`
  在视觉上等价于原 demo 的 `max-height`。
- 表格是 `width: max-content` + `min-width: 100%`：内容比容器窄时表格会撑满（多出来的宽度按列
  分摊），内容更宽时照常横向滚动，不会在右边留一大片空白。
- 不做分页、筛选、`expandedRowRender`、`selections` 下拉自定义选择项、右侧冻结与
  卡片化/列优先级隐藏（方案二/四）。
- 内置渲染：`status` 列自动套用 4 色徽章，空值统一显示 `-`；两者都会被 `customRender` /
  作用域插槽覆盖。
- 比 a-table 多出来的能力：合并单元格 `merge`、可编辑单元格 `editable`（含 date/datetime 与
  `rules`）、行排序 `sorter`、列宽拖拽 `resizable`、列顺序拖拽 `reorderable`。

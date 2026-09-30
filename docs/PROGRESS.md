# ScrollGroupTable 迭代记录（进度 + 踩坑）

> 目的：每完成一次迭代就往这里追加一段——目标、做了什么、踩到的坑、怎么验证、遗留问题。
> 踩坑部分要求写清「现象 → 根因 → 修法」，下次遇到同类问题能直接查到。

## 全局约定

- **分支**：功能在 `codex/<feature>` 上做，完成后本地合并回 `main` 再推送。
- **三层验证**（缺一不可）：
  1. `pnpm test` —— 纯逻辑单测（node:test，目前 56 项，秒级）
  2. `pnpm test:e2e` —— Playwright 真实浏览器用例（桌面 1440×900 + 手机 393×727，共 46 条）
  3. `pnpm build` —— 双入口构建（`dist/index.html` 文档站、`dist/demo.html` 对照页）
- **dev 和 dist 都要验**：生产构建会剥掉 Vue 的 warning，只在 dist 上验会漏掉整类错误（见「踩坑 #6」）。
- **提交规范**：`feat:` / `fix:` / `test:` / `docs:` / `chore:`，中文描述。
- **计划文档**：`docs/superpowers/plans/YYYY-MM-DD-<feature>.md`（用 writing-plans 规范写，含可执行步骤）。

## 总体目标

替换 `vela-pc` 里的重型表格壳 `AdvanceTable`（自有代码约 67KB，另有 antd Table / vuedraggable /
hangutils 等依赖），要求**无缝衔接**：页面代码零改动、视觉与交互零差异、可回滚、既有 localStorage
列宽缓存不失效（key = 路由 path + 列结构 hash）。

路线图（详见 `docs/superpowers/plans/2026-09-30-sorter.md` 第 1 节）：

| # | 内容 | 状态 |
| --- | --- | --- |
| F1 | 行排序 `sorter` | ✅ 已完成并合并（2026-09-30） |
| F2 | 列级兼容：`ellipsis` / `formatter` / `isSubObj` / `isSerialNumber` | 🚧 进行中 |
| F3 | 兼容壳 `AdvanceTableCompat`（标题栏/刷新/列配置/选中提示条/默认居中） | ⬜ |
| F4 | 列宽持久化（复刻 localStorage key） | ⬜ |
| F5 | 列显隐 + 持久化 | ⬜ |
| F6 | 分页透传 + `change` 参数对齐 | ⬜ |
| F7 | 自动高度 `isNeedAutoTableHight` | ⬜ |
| F8 | 合计行 `summary` | ⬜ |
| F9 | 展开行 / 固定底行 / 行拖拽 / 列筛选 | ⬜ |
| F10 | 灰度切换逐页替换 + 度量 | ⬜ |
| F11 | 移除旧组件与相关依赖 | ⬜ |

---

## 迭代 0：组件成型（2026-09-16 ~ 09-19，回顾）

从一份 HTML demo（横向滚动 + 两行分组表头 + 滚动阴影）出发，做成 Vue 2 组件并逐项扩展：

- 组件内核：横向滚动 + 两行分组表头 + 滚动阴影 + 表头吸顶 + 左侧列冻结
- 合并单元格 `merge`、可编辑单元格 `editable`（含 `date` / `datetime` 与 `rules` 校验）
- 列宽拖拽 `resizable`、列顺序拖拽 `reorderable`
- 纯逻辑拆分：`merge.js` / `selection.js` / `validation.js` / `editorValue.js` / `columnLayout.js`
- 文档站（Element/antd 风格，13 个示例，源码用 `?raw` 展示同一份文件）

### 这一段踩的坑

1. **表头第一行渲染顺序错误**：模板里「先渲染所有非分组列、再渲染所有分组」，分组排在前面时
   表头与表体错位，且拖拽的命中判定拿到错误坐标。→ 按列的真实顺序交错渲染（`headerTopCells`）。
2. **修饰类被基础规则吃掉（CSS 权重）**：基础规则 `.sgt-table th, .sgt-table td` 权重 (0,1,1)，
   高于单类名修饰类 (0,1,0)，导致「勾选框不居中、`align:'right'` 失效、冻结列深色分隔线被覆盖、
   空态文案不居中」。→ 修饰类统一写成 `.sgt-table td.sgt-xxx` (0,2,2)，并在样式里留注释。
3. **表格宽度留白**：`width: max-content` 让窄表在右侧留大片空白。→ 加 `min-width: 100%`；
   后来拖宽模式又需要关掉它（固定布局 + 按列宽求和）。
4. **拖拽反馈太弱**：只有被拖表头变淡 + 3px 内阴影线，用户以为「没反应」。→ 加跟随光标的预览块、
   源表头斜纹标记、落点线加粗到 4px、`pointerdown` 时 `preventDefault` 防止选中表头文字。
5. **只在生产构建上验证**：dist 会剥掉 Vue 的 warning，「列变量未定义导致整表只有勾选列」
   这类错误在 dist 上完全看不到。→ 改为 dev + dist 双跑，并加「每个示例首行单元格数 ≥3」的兜底断言。
6. **改了示例数据却忘了改模板变量名**：`FrozenDemo` 数据改成内联 `columns` 后模板还写着
   `frozenColumns`，运行时报 warning，表格只剩勾选列。→ 同上，靠 dev 环境的 warning 暴露。
7. **文档页窄屏被宽表格撑宽**（Playwright 才暴露）：`.docs-body` 用了 `align-items: flex-start`，
   窄屏切成列方向后交叉轴不再拉伸，`docs-main` 按内容撑到 1381px（视口只有 393px），
   结果是整页横向滚动、**表格自己反而不滚了**，阴影/冻结全失效。→ 窄屏下 `align-items: stretch`
   + `.docs-main { width: 100% }`。
8. **缺少 favicon 的 404**：控制台报 `Failed to load resource: 404`，是浏览器自动请求 favicon。
   → 两个入口加 `<link rel="icon" href="data:,">`，并让断言在失败时打印具体 URL。

---

## 迭代 1：F1 行排序（2026-09-30）✅

**目标**：点表头对行排序（升序 → 降序 → 取消），支持自定义比较函数，空值恒排最后。

**做了什么**

- `src/components/table/sort.js`：`compareValues` / `buildComparator` / `sortRows`（稳定排序、空值最后）/
  `nextSortOrder` / `resolveSortInfo` / `findColumnByKey`，配 12 项单测
- 组件：`sortedInfo` 受控或内部维护；`displayRows` 统一驱动渲染、合并计算、勾选与编辑定位；
  表头点击循环 + 升降箭头 + `aria-sort`；拖列/拖宽后抑制紧随的 click；`defaultSortOrder`
- 排序状态下编辑按 record 定位回写**父数组原始下标**，`cell-change` 增加 `originalRowIndexes`
- 文档站新增「行排序」章节与 2 个示例（含「排序与合并共存」），API 表补 5 个字段/事件
- 测试基建从手写 CDP 脚本迁移到 **Playwright**（`e2e/{docs,table,sorting}.spec.js`，46 条）

**验证**：单测 56 项、E2E 46 条、构建通过；三次点击顺序与 `aria` 正确、空值两向都排最后、
排序后合并范围重算为 `span=1, span=2, skipped, span=1`、排序下编辑父数组顺序不变。

**提交**：`5ea52bb` 计划 → `6156155` 纯逻辑 → `ac1969a` 断言（先失败）→ `0c67ed0` 组件接线 →
`7f06050` 交叉场景 → `429779d` 文档 → `39a03b4` 修复 → `990d3b9` Playwright 迁移

### 这一段踩的坑

9. **单测断言写死「我以为」的顺序，两次翻车**：① 自定义 sorter 拿四个长度相同的名字比长度，
   恒等于 0（稳定排序后顺序不变），期望值却是另一个顺序；② 断言 `compareValues('张三','李四') < 0`，
   但中文按拼音是 **李(lǐ) < 张(zhāng)**。→ 断言改成不依赖具体语序的写法（反对称、相对顺序）。
10. **计划里的示例数据不构成有效验证**：写的四行数据排序后部门仍然成组，「合并被打散」的断言其实
    永远不会失败（假通过）。→ 调整数据让数量与部门交错，断言才真正覆盖「打散 + 重新成组」。
11. **拿对照页的数据去断言文档站的示例**：文档示例 6 行、对照页 9 行，跨度、列数全对不上
    （resizer 期望 5 实际 6）。→ 断言前先确认目标示例的真实数据规模。
12. **Playwright 迁移的四个坑**：
    - 文档页顶部 sticky 导航栏拦截点击（报「被 `.docs-header` 拦截」）→ `centerOn()` / `safeClick()` 先滚到视口中间
    - 拖动时连续给两个元素取坐标，第二次滚动让第一个元素坐标失效 → `centerOn()` 只滚一次 + `boxCenter()` 连取
    - `isMobile` 的移动视口模拟会让布局视口与命中判定对不上（`innerWidth` 报 1397 而不是 393），
      点击被反复「拦截」→ 移动 project 保留手机尺寸 + 触屏但关掉 `isMobile`
    - 日期输入框上「`fill` 后立刻 `blur`」会撞上组件 `$nextTick(focusEditor)` 的聚焦时序 → 改用回车提交
13. **环境**：沙箱 helper 在 `git init` 之后一度全面故障（非沙箱外权限的命令全部 `helper_unknown_error`），
    期间改用沙箱外权限执行；后来自行恢复。

---

## 迭代 2：F2 列级兼容（2026-09-30）🚧

**目标**：让 vela-pc 存量页面的**列定义**能直接搬到新组件上——支持 `ellipsis`（73 个文件）、
`formatter`（104）、`isSubObj`（29）、`isSerialNumber`（31）。默认居中 `align`（542）属于壳层约定，
放到 F3 由兼容层注入。

**计划**：`docs/superpowers/plans/2026-09-30-f2-column-compat.md`

**做了什么**（随进度更新）

- 待填

**验证**（随进度更新）

- 待填

### 这一段踩的坑

- 待填

---

## 累积风险与待办（跨迭代）

1. **localStorage 列宽缓存兼容**（F4 必做）：老实现的 key 是 `getUniqueKey(路由 path)`，
   由「路由 + 列结构 hash（dataIndex/width 拼 JSON 再算 hash）」组成。复刻时 key 规则必须一致，
   否则用户已调好的列宽会丢失。
2. **`scroll.x` 自动算法**：老实现 = 叶子列宽求和 + 有冻结列 ? 100 : 300。兼容层要复刻。
3. **合计行是 DOM 注入**（`appendChild`）实现的，还带勾选列占位与 `colspan`；新实现要用真渲染，
   视觉对齐（`text-red-500`、`合计` 文案、行高）。
4. **行拖拽会就地 `splice` 父数组**并 emit `drop(source, target, isDrop)`，兼容层要保行为。
5. **`customRow` 被老实现包了一层**（加 `cursor: pointer`、挂行拖拽事件），旧页面的行为依赖它。
6. **`isSerialNumber` 与分页联动**：老实现按 `(current - 1) * pageSize + index + 1` 计算，
   而分页在 F6 才做——F2 先实现 `index + 1`，分页偏移留给 F6。
7. **rowKey 用下标的场景**：排序后下标会变，README 已注明「排序场景请用记录内唯一字段做 rowKey」。

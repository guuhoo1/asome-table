<template>
  <div class="docs">
    <header class="docs-header">
      <div class="docs-brand">
        ScrollGroupTable<span>Vue 2 · 横向滚动 + 两行分组表头 + 滚动阴影</span>
      </div>
      <a class="docs-header-link" href="./demo.html">原对照页 ›</a>
    </header>

    <div class="docs-body">
      <aside class="docs-nav">
        <div v-for="group in nav" :key="group.title" class="nav-group">
          <p class="nav-group-title">{{ group.title }}</p>
          <a
            v-for="item in group.items"
            :key="item.id"
            :href="'#' + item.id"
            :class="{ active: activeId === item.id }"
          >
            {{ item.title }}
          </a>
        </div>
      </aside>

      <main class="docs-main">
        <section id="intro" class="docs-section">
          <h2 class="docs-h2">介绍</h2>
          <p class="docs-p">
            一个 Vue 2 表格组件，专治「字段多、屏幕窄」的列表：22 个字段全部保留、横向滑动查看，
            两行分组表头在纵向滚动时吸顶，左右两侧用渐隐阴影提示还能继续滑。
          </p>
          <ul class="docs-list">
            <li>两行分组表头：列上写 children 就是一层分组，自动跨列并套用 5 色调色板</li>
            <li>横向滚动 + 滚动阴影：滑到端点自动收起，不遮挡内容</li>
            <li>左侧列冻结：勾选列和关键列可以钉在左边</li>
            <li>合并单元格：列上写 merge，相邻同值自动纵向合并成一格</li>
            <li>可编辑单元格：文本框 / 数字 / 下拉 / 日期 / 日期时间 + 校验规则</li>
            <li>纯 Vue 2 Options API，没有 Composition API、没有运行时依赖</li>
          </ul>
          <p class="docs-tip">
            props 命名与语义对齐 ant-design-vue 1.x 的 TableProps / TableRowSelection，列定义用
            antd 的 children 嵌套结构，从 a-table 迁过来基本是改字段名的事。
          </p>
        </section>

        <section id="install" class="docs-section">
          <h2 class="docs-h2">快速开始</h2>
          <p class="docs-p">
            组件是单文件组件，把 <code class="docs-inline-code">src/components</code> 整个目录
            拷进你的项目即可，<code class="docs-inline-code">components/table</code> 是它拆出来的
            纯逻辑模块（合并、勾选、校验、日期转换），不依赖 Vue。
          </p>
          <docs-code-block :code="installSource" />
          <p class="docs-tip">
            本仓库用 Vue 2.7.16 + Vite 开发；组件本身在 vue-cli / webpack 项目里同样能跑，
            只要别用 <code class="docs-inline-code">&lt;script setup&gt;</code>（那是 Vue 3 的写法），
            保持现在的 Options API 就行。
          </p>
        </section>

        <section id="basic" class="docs-section">
          <h2 class="docs-h2">基础用法</h2>
          <p class="docs-p">
            传 columns 和 dataSource 就能用。列上带 children 的会渲染成第一行的分组表头，
            不带 children 的列（这里是「订单号」）用 rowspan 占满两行。
          </p>
          <demo-block
            anchor="demo-basic"
            title="两行分组表头 + 横向滚动 + 阴影"
            description="横向滑到中间看两侧阴影；纵向滚动看表头吸顶；状态列自动套徽章，空值显示 -；被禁用的行不参与全选。"
            :source="basicSource"
          >
            <basic-demo />
          </demo-block>
          <p class="docs-tip">
            列宽走 min-width，配合表格的 width: max-content，所以内容再长也不会挤成一团；
            align: 'right' 的列会自动启用等宽数字，金额类字段不会抖动。
          </p>
        </section>

        <section id="selection" class="docs-section">
          <h2 class="docs-h2">勾选与禁用行</h2>
          <p class="docs-p">
            rowSelection 传对象就有勾选列，不传就没有。传了 selectedRowKeys 是受控模式，
            自己在 onChange 里写回；不传则由组件内部维护。表头全选框支持半选，
            被 getCheckboxProps 标记为禁用的行不参与全选、也点不动。
          </p>
          <demo-block
            anchor="demo-selection"
            title="受控勾选 + 禁用行 + 点行切换"
            description="这里是受控模式：初始选中第 2 行，勾选变化写回 selectedKeys。点整行也能切换（由 customRow 实现），已取消的行禁用。"
            :source="selectionSource"
          >
            <selection-demo />
          </demo-block>
        </section>

        <section id="frozen" class="docs-section">
          <h2 class="docs-h2">左侧列冻结</h2>
          <p class="docs-p">
            列上写 <code class="docs-inline-code">fixed: 'left'</code> 就钉在左边，
            rowSelection 也写 <code class="docs-inline-code">fixed: true</code> 让勾选列一起冻住。
            左阴影的起点会跟着冻结列的总宽度走，不会盖住冻结列。
          </p>
          <demo-block
            anchor="demo-frozen"
            title="冻结勾选框 + 订单号"
            description="左右滑动，勾选框和订单号保持不动。"
            :source="frozenSource"
          >
            <frozen-demo />
          </demo-block>
        </section>

        <section id="merge" class="docs-section">
          <h2 class="docs-h2">合并单元格</h2>
          <p class="docs-p">
            列上写 <code class="docs-inline-code">merge: true</code>，相邻行值相同就纵向合并成一格；
            判据不够用时写函数，比如按「日期」而不是完整时间戳合并。空值不参与合并，
            被合并掉的格子由组件跳过渲染。合并格覆盖的行里只要有一行被勾选，整格一起高亮。
          </p>
          <demo-block
            anchor="demo-merge"
            title="同值合并 + 自定义判据"
            description="客户、部门用 merge: true；下单时间用函数按日期合并；交货日期有两行为空，所以不会被合并成一个大格子。"
            :source="mergeSource"
          >
            <merge-demo />
          </demo-block>
        </section>

        <section id="editable" class="docs-section">
          <h2 class="docs-h2">可编辑单元格</h2>
          <p class="docs-p">
            列上写 <code class="docs-inline-code">editable</code> 就进入编辑态：单击（或配
            trigger: 'dblclick' 双击）进入编辑，回车或失焦提交，Esc 取消，下拉选完即提交。
            校验不过时编辑器不退出、错误文案显示在格子里。组件不改你的数据，
            提交时发 <code class="docs-inline-code">update:dataSource</code> 和
            <code class="docs-inline-code">cell-change</code>，所以父组件用
            <code class="docs-inline-code">:data-source.sync</code> 一行就能接住。
          </p>
          <demo-block
            anchor="demo-editable"
            title="文本框 / 数字 / 下拉 + 校验规则"
            description="客户必填且至少 2 个字，数量必须在 1~999，状态下拉，金额有格式校验；部门是合并列，改一次写回整组。"
            :source="editableSource"
          >
            <editable-demo />
          </demo-block>
        </section>

        <section id="date" class="docs-section">
          <h2 class="docs-h2">日期控件</h2>
          <p class="docs-p">
            <code class="docs-inline-code">type: 'date'</code> 和
            <code class="docs-inline-code">type: 'datetime'</code> 用浏览器原生控件，
            手机上会弹系统日期选择器。存储格式和控件要求不一样时组件会自动转换：
            <code class="docs-inline-code">2024-03-01 09:12</code> 进编辑器变成
            <code class="docs-inline-code">2024-03-01T09:12</code>，写回时还是你原来的格式。
          </p>
          <demo-block
            anchor="demo-date"
            title="date 与 datetime"
            description="第三行交货日期是空的，点进去直接失焦会提示必填；日期只精确到分钟，秒在编辑过的格子上会被舍掉。"
            :source="dateSource"
          >
            <date-demo />
          </demo-block>
        </section>

        <section id="empty" class="docs-section">
          <h2 class="docs-h2">空数据与单行表头</h2>
          <p class="docs-p">
            没有 children 时表头自动退化成单行；dataSource 为空时用
            <code class="docs-inline-code">#empty</code> 插槽占位，colspan 按列数自动算。
          </p>
          <demo-block
            anchor="demo-empty"
            title="空态 + 扁平列"
            description="列不带 children，表头就是一行。"
            :source="emptySource"
          >
            <empty-demo />
          </demo-block>
        </section>

        <section id="resize" class="docs-section">
          <h2 class="docs-h2">列宽拖拽</h2>
          <p class="docs-p">
            表级打开 <code class="docs-inline-code">resizable</code> 后，表头右边缘会出现 7px
            的拖动热区，按住左右拖就能改列宽，双击热区回到列上声明的宽度；最小宽度默认 60px，
            单列写 <code class="docs-inline-code">resizable: false</code> 可以关掉。拖宽会先按
            当前真实渲染宽度把每列宽度固化下来再切到固定布局，所以打开开关本身不会让布局跳一下，
            拖动也只影响被拖的那一列。
          </p>
          <demo-block
            anchor="demo-resize"
            title="拖动表头改列宽"
            description="「备注」列写了 resizable: false，它没有拖宽热区。拖动结束后会发 column-resize，事件里带上完整 columns，方便你存到后端或 localStorage。"
            :source="resizeSource"
          >
            <resize-demo />
          </demo-block>
          <p class="docs-tip">
            拖宽模式下表格改用固定布局、宽度按列宽之和计算，列内容超出会显示省略号。想持久化就接住
            <code class="docs-inline-code">column-resize</code> 把
            <code class="docs-inline-code">columns</code> 存下来、下次原样传回来，组件会以 props
            为准并自动丢掉内部覆盖。
          </p>
        </section>

        <section id="reorder" class="docs-section">
          <h2 class="docs-h2">列顺序拖拽</h2>
          <p class="docs-p">
            表级打开 <code class="docs-inline-code">reorderable</code> 后按住表头拖动即可换位，
            拖动过程中会在目标位置画一条蓝线。三条约束：只能在同一层换（顶层列之间、同一分组内的
            子列之间，不会把两行分组表头拖裂）；冻结列只能待在左侧冻结区里；勾选列不参与。
          </p>
          <demo-block
            anchor="demo-reorder"
            title="拖动表头换位置"
            description="试试把「数量」拖到「金额」右边、把分组「客户与商品」整个拖到最右，或者拖动分组内的「客户 / 商品名称」互换；冻结的订单号拖不出去。"
            :source="reorderSource"
          >
            <reorder-demo />
          </demo-block>

          <demo-block
            anchor="demo-reorder-flat"
            title="单行表头也能拖"
            description="列不带 children 时表头只有一行，同样支持拖动换位；「操作」列写了 reorderable: false，拖它没有任何反应，适合想把操作列钉在最后的场景。"
            :source="reorderFlatSource"
          >
            <reorder-flat-demo />
          </demo-block>

          <demo-block
            anchor="demo-reorder-resize"
            title="拖宽 + 拖顺序一起开"
            description="两个开关互不影响：先把「商品名称」拖宽，再把它和分组「金额信息」换位，宽度会跟着列一起走。"
            :source="reorderResizeSource"
          >
            <reorder-resize-demo />
          </demo-block>
        </section>

        <section id="sort" class="docs-section">
          <h2 class="docs-h2">行排序</h2>
          <p class="docs-p">
            列上写 <code class="docs-inline-code">sorter: true</code> 就能点表头排序，
            点击按「升序 → 降序 → 取消」循环，表头带箭头与 <code class="docs-inline-code">aria-sort</code>；
            写函数 <code class="docs-inline-code">sorter: (a, b) => number</code>
            可以用自己的比较规则。空值永远排最后，升序降序都一样。
          </p>
          <demo-block
            anchor="demo-sort"
            title="点表头排序"
            description="点「数量」在升序/降序/取消之间循环；点「交货日期」可以看空值恒排最后；「客户」列同时可编辑，排好序后改一格，父数组的原始顺序不会被打乱。"
            :source="sortSource"
          >
            <sort-demo />
          </demo-block>

          <demo-block
            anchor="demo-sort-merge"
            title="排序与合并共存"
            description="点「数量」升序：原来合并的「华东」两行会被打散，而「华南」两行会重新合并成一组——合并范围永远是按当前显示顺序重算的。"
            :source="sortMergeSource"
          >
            <sort-merge-demo />
          </demo-block>
        </section>

        <section id="column-compat" class="docs-section">
          <h2 class="docs-h2">列级兼容</h2>
          <p class="docs-p">
            从 vela-pc 的 AdvanceTable 迁移过来时，存量页面的列定义可以直接用：
            <code class="docs-inline-code">isSerialNumber</code> 按行号生成序号、
            <code class="docs-inline-code">formatter</code> 做格式化、
            <code class="docs-inline-code">isSubObj</code> 按点号路径深层取值，
            另外支持 antd 的 <code class="docs-inline-code">ellipsis</code> 截断。
            优先级与老实现一致：<code class="docs-inline-code">formatter</code> 最优先，
            其次是序号列，然后才是深层取值与普通取值。
          </p>
          <demo-block
            anchor="demo-column-compat"
            title="列级兼容：序号 / formatter / 深层取值 / 省略号"
            description="序号列按行号生成；金额列用 formatter 加 ¥；客户与标签列用 isSubObj 从 customer.name、customer.tag.label 深层取值；标签与备注列开了 ellipsis（悬停可见 title）。"
            :source="columnCompatSource"
          >
            <column-compat-demo />
          </demo-block>
        </section>

        <section id="advance-compat" class="docs-section">
          <h2 class="docs-h2">兼容壳：AdvanceTableCompat</h2>
          <p class="docs-p">
            给 vela-pc 的存量页面准备的兼容层：它把老壳 <code class="docs-inline-code">AdvanceTable</code>
            的对外契约翻译成核心组件的 API——列上没写 <code class="docs-inline-code">align</code> 时默认居中、
            每列自动挂一个以列 key 命名的作用域插槽（页面里写
            <code class="docs-inline-code">&lt;template #customer&gt;</code> 即可覆盖渲染）、
            标题栏与刷新按钮、选中提示条与清空、列宽与列序拖拽默认开启。
          </p>
          <demo-block
            anchor="demo-advance-compat"
            title="兼容壳：标题栏 / 默认居中 / 列名插槽 / 选中提示条"
            description="点「刷新」会发 refresh 事件、勾选行会出现「已选择 N 条 + 清空」、双击行会发 dblclickRow；「客户」列被页面的 #customer 插槽覆盖成「序号. 客户名」。"
            :source="advanceCompatSource"
          >
            <advance-compat-demo />
          </demo-block>
        </section>

        <section id="advance-auto-height" class="docs-section">
          <h2 class="docs-h2">兼容壳：自动高度</h2>
          <p class="docs-p">
            老壳的 <code class="docs-inline-code">isNeedAutoTableHight</code> 用法照搬：
            表格高度按「视口高度 − 表格顶部 − <code class="docs-inline-code">reservedHeight</code>」自动计算
            （最小 200），标题栏里会出现「固定高度 / 自适应高度」开关。数据变化、开关切换、
            窗口缩放都会重算；关掉固定高度或没有数据时不限制高度。
          </p>
          <demo-block
            anchor="demo-advance-auto-height"
            title="自动高度：固定高度 / 自适应开关"
            description="默认按视口算出固定高度（表头吸顶、表体内部滚动）；点标题栏的开关切成自适应高度，表格恢复成随内容撑开。"
            :source="advanceAutoHeightSource"
          >
            <advance-auto-height-demo />
          </demo-block>
        </section>

        <section id="diff" class="docs-section">
          <h2 class="docs-h2">与 a-table 的差异</h2>
          <ul class="docs-list">
            <li>吸顶用单个滚动容器 + position: sticky 实现，不拆分 header/body 两段 DOM</li>
            <li>不做分页、行排序、筛选、expandedRowRender、selections 下拉自定义选择项、右侧冻结、卡片化</li>
            <li>内置渲染：status 列自动套 4 色徽章、空值统一显示 -，两者都会被 customRender / 插槽覆盖</li>
            <li>多出来的能力：merge、editable（含 date/datetime 与 rules）、列宽拖拽、列顺序拖拽</li>
            <li>表头拖拽换的是「列的顺序」，不是对行排序——行排序放在 dataSource 那一层做</li>
          </ul>
        </section>

        <section id="api" class="docs-section">
          <h2 class="docs-h2">API</h2>

          <h3 class="docs-h3">Props</h3>
          <docs-api-table :columns="propsTable.columns" :rows="propsTable.rows" />

          <h3 class="docs-h3">Column</h3>
          <docs-api-table :columns="columnTable.columns" :rows="columnTable.rows" />

          <h3 class="docs-h3">Column.editable</h3>
          <docs-api-table :columns="editableTable.columns" :rows="editableTable.rows" />

          <h3 class="docs-h3">rowSelection</h3>
          <docs-api-table :columns="rowSelectionTable.columns" :rows="rowSelectionTable.rows" />

          <h3 class="docs-h3">事件</h3>
          <docs-api-table :columns="eventsTable.columns" :rows="eventsTable.rows" />

          <h3 class="docs-h3">插槽</h3>
          <docs-api-table :columns="slotsTable.columns" :rows="slotsTable.rows" />

          <h3 class="docs-h3">实例方法</h3>
          <docs-api-table :columns="methodsTable.columns" :rows="methodsTable.rows" />
        </section>
      </main>
    </div>
  </div>
</template>

<script>
import ApiTable from './ApiTable.vue'
import DemoBlock from './DemoBlock.vue'
import DocsCodeBlock from './DocsCodeBlock.vue'
import BasicDemo from './demos/BasicDemo.vue'
import SelectionDemo from './demos/SelectionDemo.vue'
import FrozenDemo from './demos/FrozenDemo.vue'
import MergeDemo from './demos/MergeDemo.vue'
import EditableDemo from './demos/EditableDemo.vue'
import DateDemo from './demos/DateDemo.vue'
import EmptyDemo from './demos/EmptyDemo.vue'
import ResizeDemo from './demos/ResizeDemo.vue'
import ReorderDemo from './demos/ReorderDemo.vue'
import ReorderFlatDemo from './demos/ReorderFlatDemo.vue'
import ReorderResizeDemo from './demos/ReorderResizeDemo.vue'
import SortDemo from './demos/SortDemo.vue'
import SortMergeDemo from './demos/SortMergeDemo.vue'
import ColumnCompatDemo from './demos/ColumnCompatDemo.vue'
import AdvanceCompatDemo from './demos/AdvanceCompatDemo.vue'
import AdvanceAutoHeightDemo from './demos/AdvanceAutoHeightDemo.vue'
import {
  columnTable,
  editableTable,
  eventsTable,
  methodsTable,
  propsTable,
  rowSelectionTable,
  slotsTable
} from './api.js'

// ?raw 拿到的是示例源码本身，展示的代码和跑起来的示例永远是同一份
import basicSource from './demos/BasicDemo.vue?raw'
import selectionSource from './demos/SelectionDemo.vue?raw'
import frozenSource from './demos/FrozenDemo.vue?raw'
import mergeSource from './demos/MergeDemo.vue?raw'
import editableSource from './demos/EditableDemo.vue?raw'
import dateSource from './demos/DateDemo.vue?raw'
import emptySource from './demos/EmptyDemo.vue?raw'
import resizeSource from './demos/ResizeDemo.vue?raw'
import reorderSource from './demos/ReorderDemo.vue?raw'
import reorderFlatSource from './demos/ReorderFlatDemo.vue?raw'
import reorderResizeSource from './demos/ReorderResizeDemo.vue?raw'
import sortSource from './demos/SortDemo.vue?raw'
import sortMergeSource from './demos/SortMergeDemo.vue?raw'
import columnCompatSource from './demos/ColumnCompatDemo.vue?raw'
import advanceCompatSource from './demos/AdvanceCompatDemo.vue?raw'
import advanceAutoHeightSource from './demos/AdvanceAutoHeightDemo.vue?raw'

const INSTALL_SOURCE = [
  '<!-- 1. 模板里直接用 -->',
  '<scroll-group-table',
  '  :columns="columns"',
  '  :data-source="rows"',
  '  row-key="no"',
  "  :scroll=\"{ x: 'max-content', y: 340 }\"",
  '/>',
  '',
  '<script>',
  "import ScrollGroupTable from './components/ScrollGroupTable.vue'",
  '',
  'export default {',
  '  components: { ScrollGroupTable },',
  '  data() {',
  '    return {',
  '      columns: [',
  "        { title: '订单号', dataIndex: 'no', key: 'no', width: 130, fixed: 'left' },",
  '        {',
  "          title: '金额信息',",
  '          key: "group-amount",',
  '          children: [',
  "            { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' }",
  '          ]',
  '        }',
  '      ],',
  "      rows: [{ no: 'SO-20240001', amount: '¥299.00' }]",
  '    }',
  '  }',
  '}',
  '<\\/script>'
].join('\n')

export default {
  name: 'DocsApp',
  components: {
    DocsApiTable: ApiTable,
    DocsCodeBlock,
    DemoBlock,
    BasicDemo,
    SelectionDemo,
    FrozenDemo,
    MergeDemo,
    EditableDemo,
    DateDemo,
    EmptyDemo,
    ResizeDemo,
    ReorderDemo,
    ReorderFlatDemo,
    ReorderResizeDemo,
    SortDemo,
    SortMergeDemo,
    ColumnCompatDemo,
    AdvanceCompatDemo,
    AdvanceAutoHeightDemo
  },
  data() {
    return {
      activeId: 'intro',
      sectionIds: [],
      installSource: INSTALL_SOURCE,
      basicSource,
      selectionSource,
      frozenSource,
      mergeSource,
      editableSource,
      dateSource,
      emptySource,
      resizeSource,
      reorderSource,
      reorderFlatSource,
      reorderResizeSource,
      sortSource,
      sortMergeSource,
      columnCompatSource,
      advanceCompatSource,
      advanceAutoHeightSource,
      propsTable,
      columnTable,
      editableTable,
      rowSelectionTable,
      eventsTable,
      slotsTable,
      methodsTable,
      nav: [
        {
          title: '开始',
          items: [
            { id: 'intro', title: '介绍' },
            { id: 'install', title: '快速开始' }
          ]
        },
        {
          title: '功能',
          items: [
            { id: 'basic', title: '基础用法' },
            { id: 'selection', title: '勾选与禁用行' },
            { id: 'frozen', title: '左侧列冻结' },
            { id: 'merge', title: '合并单元格' },
            { id: 'editable', title: '可编辑单元格' },
            { id: 'date', title: '日期控件' },
            { id: 'empty', title: '空数据与单行表头' },
            { id: 'resize', title: '列宽拖拽' },
            { id: 'reorder', title: '列顺序拖拽' },
            { id: 'sort', title: '行排序' },
            { id: 'column-compat', title: '列级兼容' },
            { id: 'advance-compat', title: '兼容壳' },
            { id: 'advance-auto-height', title: '兼容壳 · 自动高度' }
          ]
        },
        {
          title: 'API',
          items: [
            { id: 'diff', title: '与 a-table 的差异' },
            { id: 'api', title: 'Props / 事件 / 插槽' }
          ]
        }
      ]
    }
  },
  mounted() {
    this.sectionIds = this.nav.reduce(
      (ids, group) => ids.concat(group.items.map((item) => item.id)),
      []
    )
    this.handleScroll = () => this.updateActive()
    this.handleHashChange = () => {
      this.jumpToHash()
      this.updateActive()
    }
    window.addEventListener('scroll', this.handleScroll, { passive: true })
    window.addEventListener('hashchange', this.handleHashChange)
    this.$nextTick(() => {
      this.jumpToHash()
      this.updateActive()
    })
  },
  beforeDestroy() {
    window.removeEventListener('scroll', this.handleScroll)
    window.removeEventListener('hashchange', this.handleHashChange)
  },
  methods: {
    jumpToHash() {
      const id = (window.location.hash || '').replace('#', '')
      if (!id) return
      const target = document.getElementById(id)
      if (target) target.scrollIntoView({ block: 'start' })
    },
    updateActive() {
      let current = this.sectionIds[0]
      this.sectionIds.forEach((id) => {
        const target = document.getElementById(id)
        if (target && target.getBoundingClientRect().top <= 120) current = id
      })
      if (current !== this.activeId) this.activeId = current
    }
  }
}
</script>

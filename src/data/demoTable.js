/**
 * 原 HTML demo 的 22 个业务字段 + 8 行数据。
 * 列定义已改写成 ant-design-vue 的 children 嵌套结构；
 * 勾选列不在 columns 里，由组件的 rowSelection prop 生成（与 a-table 一致）。
 */

const seed = [
  {
    customer: '张三',
    contact: '张三',
    phone: '13800000001',
    address: '广东省深圳市南山区科技园',
    sku: 'P-1001',
    product: '无线耳机',
    spec: '白色/蓝牙5.3',
    qty: 1,
    price: '¥299.00',
    amount: '¥299.00',
    taxRate: '13%',
    tax: '¥38.87',
    total: '¥337.87',
    status: '已发货',
    payment: '微信支付',
    sales: '李四',
    dept: '华南销售部',
    orderTime: '2024-01-01 12:00',
    deliveryDate: '2024-01-03',
    trackingNo: 'SF1234567890',
    remark: '尽快发货'
  },
  {
    customer: '李四',
    contact: '李四',
    phone: '13800000002',
    address: '北京市朝阳区建国路 88 号',
    sku: 'P-1002',
    product: '机械键盘',
    spec: '87键/青轴',
    qty: 1,
    price: '¥599.00',
    amount: '¥599.00',
    taxRate: '13%',
    tax: '¥77.87',
    total: '¥676.87',
    status: '待付款',
    payment: '支付宝',
    sales: '王五',
    dept: '华北销售部',
    orderTime: '2024-01-02 09:20',
    deliveryDate: '2024-01-05',
    trackingNo: '',
    remark: ''
  },
  {
    customer: '王五',
    contact: '王五',
    phone: '13800000003',
    address: '上海市浦东新区张江高科',
    sku: 'P-1003',
    product: '显示器支架',
    spec: '单臂/17-32寸',
    qty: 2,
    price: '¥79.50',
    amount: '¥159.00',
    taxRate: '13%',
    tax: '¥20.67',
    total: '¥179.67',
    status: '已完成',
    payment: '对公转账',
    sales: '赵六',
    dept: '华东销售部',
    orderTime: '2024-01-03 18:45',
    deliveryDate: '2024-01-06',
    trackingNo: 'JD987654321',
    remark: '已签收'
  },
  {
    customer: '赵六',
    contact: '赵六',
    phone: '13800000004',
    address: '浙江省杭州市余杭区未来科技城',
    sku: 'P-1004',
    product: 'USB-C 扩展坞',
    spec: '8 合 1/千兆网口',
    qty: 3,
    price: '¥199.00',
    amount: '¥597.00',
    taxRate: '13%',
    tax: '¥77.61',
    total: '¥674.61',
    status: '已取消',
    payment: '微信支付',
    sales: '李四',
    dept: '华东销售部',
    orderTime: '2024-01-04 10:10',
    deliveryDate: '2024-01-08',
    trackingNo: '',
    remark: '客户取消'
  }
]

export const rows = []
for (let i = 0; i < 8; i++) {
  const item = seed[i % seed.length]
  rows.push(
    Object.assign({}, item, {
      no: 'SO-2024' + String(101 + i).padStart(4, '0')
    })
  )
}

/** 22 个业务字段，四个业务分组 + 一个不参与分组的「订单号」列 */
export const columns = [
  { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
  {
    title: '基本信息',
    key: 'group-basic',
    children: [
      { title: '客户', dataIndex: 'customer', key: 'customer', width: 80 },
      { title: '联系人', dataIndex: 'contact', key: 'contact', width: 80 },
      { title: '电话', dataIndex: 'phone', key: 'phone', width: 120 },
      { title: '地址', dataIndex: 'address', key: 'address', width: 200 }
    ]
  },
  {
    title: '商品信息',
    key: 'group-product',
    children: [
      { title: '商品编码', dataIndex: 'sku', key: 'sku', width: 100 },
      { title: '商品名称', dataIndex: 'product', key: 'product', width: 120 },
      { title: '规格', dataIndex: 'spec', key: 'spec', width: 140 },
      { title: '数量', dataIndex: 'qty', key: 'qty', width: 60, align: 'right' }
    ]
  },
  {
    title: '金额信息',
    key: 'group-amount',
    children: [
      { title: '单价', dataIndex: 'price', key: 'price', width: 90, align: 'right' },
      {
        title: '金额',
        dataIndex: 'amount',
        key: 'amount',
        width: 100,
        align: 'right',
        // 作用域插槽示例，见 App.vue 的 <template #amount>
        scopedSlots: { customRender: 'amount' }
      },
      { title: '税率', dataIndex: 'taxRate', key: 'taxRate', width: 70, align: 'right' },
      { title: '税额', dataIndex: 'tax', key: 'tax', width: 90, align: 'right' },
      {
        title: '价税合计',
        dataIndex: 'total',
        key: 'total',
        width: 110,
        align: 'right',
        // 自定义渲染示例，第四个参数是 createElement
        customRender: (text, record, index, h) =>
          h('span', { class: 'total-text' }, text)
      }
    ]
  },
  {
    title: '状态与人员',
    key: 'group-status',
    children: [
      { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
      { title: '付款方式', dataIndex: 'payment', key: 'payment', width: 100 },
      { title: '业务员', dataIndex: 'sales', key: 'sales', width: 80 },
      { title: '部门', dataIndex: 'dept', key: 'dept', width: 120 }
    ]
  },
  {
    title: '时间与物流',
    key: 'group-time',
    children: [
      { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 150 },
      { title: '交货日期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 110 },
      { title: '物流单号', dataIndex: 'trackingNo', key: 'trackingNo', width: 140 },
      { title: '备注', dataIndex: 'remark', key: 'remark', width: 140 }
    ]
  }
]

function markFixed(column) {
  const next = Object.assign({}, column)
  if (next.dataIndex === 'no') next.fixed = 'left'
  if (Array.isArray(next.children)) next.children = next.children.map(markFixed)
  return next
}

/** 方案三变体：把「订单号」列冻结在左侧（配合 rowSelection.fixed 使用） */
export const frozenColumns = columns.map(markFixed)

/** 边界场景：不带 children 的扁平列，表头退化成单行 */
export const flatColumns = [
  { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
  { title: '客户', dataIndex: 'customer', key: 'customer', width: 80 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '下单时间', dataIndex: 'orderTime', key: 'orderTime', width: 150 }
]

/** 合并单元格示例数据：相邻行按块分布，方便看纵向合并效果 */
export const mergeRows = [
  { no: 'SO-20240001', customer: '张三', dept: '华南销售部', sales: '李四', product: '无线耳机', qty: 2, amount: '¥598.00', orderTime: '2024-03-01 09:12', deliveryDate: '2024-03-05' },
  { no: 'SO-20240002', customer: '张三', dept: '华南销售部', sales: '李四', product: '机械键盘', qty: 1, amount: '¥599.00', orderTime: '2024-03-01 14:40', deliveryDate: '2024-03-06' },
  { no: 'SO-20240003', customer: '张三', dept: '华南销售部', sales: '李四', product: 'USB-C 扩展坞', qty: 3, amount: '¥597.00', orderTime: '2024-03-01 18:05', deliveryDate: '2024-03-07' },
  { no: 'SO-20240004', customer: '李四', dept: '华南销售部', sales: '王五', product: '显示器支架', qty: 2, amount: '¥159.00', orderTime: '2024-03-02 10:20', deliveryDate: '' },
  { no: 'SO-20240005', customer: '李四', dept: '华南销售部', sales: '王五', product: '无线耳机', qty: 1, amount: '¥299.00', orderTime: '2024-03-02 16:30', deliveryDate: '' },
  { no: 'SO-20240006', customer: '王五', dept: '华东销售部', sales: '赵六', product: '机械键盘', qty: 4, amount: '¥2,396.00', orderTime: '2024-03-03 09:00', deliveryDate: '2024-03-08' },
  { no: 'SO-20240007', customer: '王五', dept: '华东销售部', sales: '赵六', product: '显示器支架', qty: 5, amount: '¥397.50', orderTime: '2024-03-03 11:15', deliveryDate: '2024-03-09' },
  { no: 'SO-20240008', customer: '王五', dept: '华东销售部', sales: '赵六', product: 'USB-C 扩展坞', qty: 6, amount: '¥1,194.00', orderTime: '2024-03-03 15:45', deliveryDate: '2024-03-10' },
  { no: 'SO-20240009', customer: '王五', dept: '华东销售部', sales: '赵六', product: '无线耳机', qty: 2, amount: '¥598.00', orderTime: '2024-03-04 09:30', deliveryDate: '2024-03-11' }
]

/**
 * 合并单元格示例列：
 * - customer / dept / deliveryDate 用最简单的 merge: true（相邻行同值合并）
 * - orderTime 用函数形式，按「日期」而不是完整时间戳合并
 * - deliveryDate 有两行是空值，空值不参与合并
 */
export const mergeColumns = [
  { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
  {
    title: '客户与人员',
    key: 'group-merge-customer',
    children: [
      { title: '客户', dataIndex: 'customer', key: 'customer', width: 80, merge: true },
      { title: '部门', dataIndex: 'dept', key: 'dept', width: 120, merge: true },
      { title: '业务员', dataIndex: 'sales', key: 'sales', width: 80 }
    ]
  },
  {
    title: '商品信息',
    key: 'group-merge-product',
    children: [
      { title: '商品名称', dataIndex: 'product', key: 'product', width: 120 },
      { title: '数量', dataIndex: 'qty', key: 'qty', width: 60, align: 'right' },
      { title: '金额', dataIndex: 'amount', key: 'amount', width: 100, align: 'right' }
    ]
  },
  {
    title: '时间与物流',
    key: 'group-merge-time',
    children: [
      {
        title: '下单时间',
        dataIndex: 'orderTime',
        key: 'orderTime',
        width: 150,
        merge: (record, prevRecord) =>
          String(record.orderTime).slice(0, 10) === String(prevRecord.orderTime).slice(0, 10)
      },
      { title: '交货日期', dataIndex: 'deliveryDate', key: 'deliveryDate', width: 110, merge: true }
    ]
  }
]

/** 可编辑示例数据：在 mergeRows 基础上补上「状态」「备注」两列 */
export const editableRows = mergeRows.map((record, index) =>
  Object.assign({}, record, {
    status: ['已发货', '待付款', '已完成', '已取消', '待付款', '已完成', '已发货', '待付款', '已完成'][index],
    remark: ['客户催单', '', '已开票', '', '改期一次', '', '需开发票', '', ''][index]
  })
)

/**
 * 可编辑示例列：订单号只读，其余按列声明 editable
 * - true = 默认文本框、无校验
 * - { rules, placeholder } = 文本框 + 校验
 * - { type: 'number' | 'select', options } = 数字 / 下拉
 * - 「部门」同时是 merge: true，改一次会写回整组
 */
export const editableColumns = [
  { title: '订单号', dataIndex: 'no', key: 'no', width: 130 },
  {
    title: '客户',
    dataIndex: 'customer',
    key: 'customer',
    width: 100,
    editable: {
      rules: [
        { required: true, message: '客户不能为空' },
        { minLength: 2, message: '至少 2 个字符' }
      ]
    }
  },
  { title: '部门', dataIndex: 'dept', key: 'dept', width: 130, merge: true, editable: true },
  {
    title: '数量',
    dataIndex: 'qty',
    key: 'qty',
    width: 80,
    align: 'right',
    editable: {
      type: 'number',
      rules: [
        { min: 1, message: '不能小于 1' },
        { max: 999, message: '不能大于 999' }
      ]
    }
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 110,
    align: 'right',
    editable: {
      placeholder: '如 ¥100.00',
      rules: [{ pattern: /^¥?\d+(\.\d+)?$/, message: '金额格式不对' }]
    }
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    editable: { type: 'select', options: ['待付款', '已发货', '已完成', '已取消'] }
  },
  {
    title: '下单时间',
    dataIndex: 'orderTime',
    key: 'orderTime',
    width: 170,
    // 存储是 '2024-03-01 09:12'，datetime-local 要 '2024-03-01T09:12'，组件内部自动转
    editable: { type: 'datetime' }
  },
  {
    title: '交货日期',
    dataIndex: 'deliveryDate',
    key: 'deliveryDate',
    width: 140,
    editable: {
      type: 'date',
      rules: [{ required: true, message: '请选择交货日期' }]
    }
  },
  {
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    width: 160,
    editable: { placeholder: '最多 10 个字', rules: [{ maxLength: 10, message: '最多 10 个字符' }] }
  }
]

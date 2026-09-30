/**
 * 文档站的无头校验：导航、示例、源码块、复制、锚点、控制台。
 * 用法：node .verify/docs-check.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PAGE_URL = process.argv[2] || 'http://127.0.0.1:4173/'
const PORT = 9334

const profileDir = mkdtempSync(join(tmpdir(), 'sgt-docs-profile-'))
const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--window-size=1440,1000',
    'about:blank'
  ],
  { stdio: 'ignore' }
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await response.json()
      const page = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl)
      if (page) return page
    } catch (error) {
      // chrome 还没起来，继续等
    }
    await sleep(250)
  }
  throw new Error('未能连接到 Chrome 调试端口')
}

const target = await waitForTarget()
const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let messageId = 0
const pending = new Map()
const consoleMessages = []

socket.addEventListener('message', (event) => {
  const payload = JSON.parse(event.data)
  if (payload.id && pending.has(payload.id)) {
    const { resolve, reject } = pending.get(payload.id)
    pending.delete(payload.id)
    if (payload.error) reject(new Error(JSON.stringify(payload.error)))
    else resolve(payload.result)
    return
  }
  if (payload.method === 'Runtime.consoleAPICalled') {
    const text = (payload.params.args || [])
      .map((arg) => arg.value ?? arg.description ?? arg.type)
      .join(' ')
    consoleMessages.push(`[${payload.params.type}] ${text}`)
  }
  if (payload.method === 'Runtime.exceptionThrown') {
    const details = payload.params.exceptionDetails || {}
    consoleMessages.push(`[exception] ${details.text} ${details.exception?.description || ''}`)
  }
})

function send(method, params = {}) {
  messageId += 1
  const id = messageId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(fn, args = []) {
  const result = await send('Runtime.evaluate', {
    expression: `(${fn.toString()})(${args.map((item) => JSON.stringify(item)).join(',')})`,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}

await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: PAGE_URL })
await sleep(2500)

const docs = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const navItems = [...document.querySelectorAll('.docs-nav a')]
  const blocks = [...document.querySelectorAll('.demo-block')]
  const isVisible = (node) => !!node && getComputedStyle(node).display !== 'none'

  const beforeExpand = {
    navCount: navItems.length,
    sectionIds: [...document.querySelectorAll('.docs-section')].map((section) => section.id),
    codeBlockCount: document.querySelectorAll('.docs-code').length,
    demoCount: blocks.length,
    demoTitles: blocks.map((block) => block.querySelector('.demo-title').textContent.trim()),
    previewTableCounts: blocks.map(
      (block) => block.querySelectorAll('.demo-preview table.sgt-table').length
    ),
    previewRowCounts: blocks.map(
      (block) => block.querySelectorAll('.demo-preview tbody tr.sgt-row').length
    ),
    // 每个示例第一行的单元格数：列定义没生效时这里会塌成 1（只剩勾选列）
    previewCellCounts: blocks.map((block) => {
      const row = block.querySelector('.demo-preview tbody tr.sgt-row')
      return row ? row.children.length : 0
    }),
    activeNavItem: document.querySelector('.docs-nav a.active')
      ? document.querySelector('.docs-nav a.active').textContent.trim()
      : null,
    expandedCodeBlocks: blocks.filter((block) => isVisible(block.querySelector('.demo-code')))
      .length
  }

  const mergeBlock = blocks.find((block) => block.textContent.includes('同值合并'))
  mergeBlock.querySelector('.demo-toggle').click()
  await wait(200)

  const codeNode = mergeBlock.querySelector('.docs-code code')
  const codeText = codeNode ? codeNode.textContent : ''
  const tokenCount = mergeBlock.querySelectorAll(
    '.docs-code .tok-tag, .docs-code .tok-attr, .docs-code .tok-string'
  ).length

  const copyButton = mergeBlock.querySelector('.demo-copy')
  copyButton.click()
  await wait(250)
  const copyLabel = copyButton.textContent.trim()

  mergeBlock.querySelector('.demo-toggle').click()
  await wait(150)
  const collapsedAgain = !isVisible(mergeBlock.querySelector('.demo-code'))

  const lastNavItem = navItems[navItems.length - 1]
  lastNavItem.click()
  await wait(500)
  const activeAfterJump = document.querySelector('.docs-nav a.active')

  return {
    ...beforeExpand,
    mergeSourceLength: codeText.length,
    mergeSourceHasMergeTrue: codeText.includes('merge: true'),
    mergeSourceHasMergeFunction: codeText.includes('merge: (record, prevRecord'),
    tokenCount,
    copyLabel,
    collapsedAgain,
    hashAfterNavClick: window.location.hash,
    activeAfterNavClick: activeAfterJump ? activeAfterJump.textContent.trim() : null,
    apiSectionTop: Math.round(document.getElementById('api').getBoundingClientRect().top)
  }
})

const geometry = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const blocks = [...document.querySelectorAll('.demo-block')]
  const output = []

  for (const block of blocks) {
    const scroll = block.querySelector('.sgt-scroll')
    if (!scroll) continue

    const table = scroll.querySelector('table')
    const firstRow = scroll.querySelector('tbody tr.sgt-row')
    const cells = firstRow ? [...firstRow.children] : []
    const fixedCells = cells.filter((cell) => cell.classList.contains('sgt-fixed-left'))
    const containerRect = scroll.getBoundingClientRect()

    scroll.scrollLeft = scroll.scrollWidth
    await wait(140)

    const afterScroll = fixedCells.map((cell) => ({
      key: cell.getAttribute('data-sgt-key') || 'selection',
      cssLeft: getComputedStyle(cell).left,
      offsetFromContainerLeft: Math.round(cell.getBoundingClientRect().left - containerRect.left)
    }))

    scroll.scrollLeft = 0
    await wait(90)

    output.push({
      title: block.querySelector('.demo-title').textContent.trim(),
      containerWidth: scroll.clientWidth,
      tableWidth: Math.round(table.getBoundingClientRect().width),
      blankSpace: Math.max(0, Math.round(scroll.clientWidth - table.getBoundingClientRect().width)),
      scrollable: scroll.scrollWidth - scroll.clientWidth > 2,
      declaredMinWidthSum: cells.length,
      cellMinWidths: cells.map((cell) => getComputedStyle(cell).minWidth),
      cellRenderedWidths: cells.map((cell) => Math.round(cell.getBoundingClientRect().width)),
      fixedCellCount: fixedCells.length,
      fixedAfterScroll: afterScroll
    })
  }

  return output
})

// 冻结示例：把表格横滑到 60%，再对这张卡片截局部图，肉眼就能看出冻结列有没有钉住
const alignment = await evaluate(() => {
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('两行分组表头')
  )
  const scroll = block.querySelector('.sgt-scroll')
  const headCell = scroll.querySelector('thead .sgt-selection-cell')
  const bodyCell = scroll.querySelector('tbody .sgt-selection-cell')
  const centerDelta = (cell, box) => {
    const cellRect = cell.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    return Math.round(boxRect.left + boxRect.width / 2 - (cellRect.left + cellRect.width / 2))
  }
  const rightCell = scroll.querySelector('tbody td.sgt-align-right')
  const rightHeader = scroll.querySelector('thead th.sgt-align-right')
  // 冻结格和空态在别的示例里，分开找
  const frozenBlock = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('冻结勾选框')
  )
  const fixedCell = frozenBlock.querySelector('tbody td.sgt-fixed-left')
  const emptyBlock = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('空态')
  )
  const emptyCell = emptyBlock.querySelector('.sgt-empty-cell')

  return {
    headTextAlign: getComputedStyle(headCell).textAlign,
    bodyTextAlign: getComputedStyle(bodyCell).textAlign,
    selectionCellWidth: Math.round(bodyCell.getBoundingClientRect().width),
    checkboxWidth: Math.round(bodyCell.querySelector('input').getBoundingClientRect().width),
    headCenterDelta: centerDelta(headCell, headCell.querySelector('input')),
    bodyCenterDelta: centerDelta(bodyCell, bodyCell.querySelector('input')),
    rightCellTextAlign: rightCell ? getComputedStyle(rightCell).textAlign : null,
    rightHeaderTextAlign: rightHeader ? getComputedStyle(rightHeader).textAlign : null,
    rightHeaderTitle: rightHeader ? rightHeader.textContent.trim() : null,
    fixedCellBorderRight: fixedCell ? getComputedStyle(fixedCell).borderRightColor : null,
    fixedCellPosition: fixedCell ? getComputedStyle(fixedCell).position : null,
    emptyCellTextAlign: emptyCell ? getComputedStyle(emptyCell).textAlign : null
  }
})

// 拖宽：派发 pointer 事件，量列宽变化、事件提示、双击复位、单列开关
const resizing = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('拖动表头改列宽')
  )
  const scroll = block.querySelector('.sgt-scroll')
  const headerOf = (key) =>
    scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
  const widthOf = (key) => Math.round(headerOf(key).getBoundingClientRect().width)
  const resizerOf = (key) => scroll.querySelector('.sgt-resizer[data-sgt-resizer="' + key + '"]')
  const fire = (type, target, x, y) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        clientX: x,
        clientY: y,
        bubbles: true,
        button: 0,
        pointerId: 1
      })
    )

  const before = widthOf('product')
  const resizer = resizerOf('product')
  const rect = resizer.getBoundingClientRect()
  const startX = Math.round(rect.left + rect.width / 2)
  const startY = Math.round(rect.top + rect.height / 2)

  fire('pointerdown', resizer, startX, startY)
  fire('pointermove', document, startX + 60, startY)
  await wait(120)
  const during = widthOf('product')
  fire('pointerup', document, startX + 60, startY)
  await wait(160)
  const after = widthOf('product')
  const hint = block.querySelector('.demo-hint').textContent.trim()
  const tableWidthStyle = scroll.querySelector('table').style.width
  const layout = getComputedStyle(scroll.querySelector('table')).tableLayout

  // 双击热区回到声明宽度
  resizer.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
  await wait(160)
  const afterReset = widthOf('product')

  // 最小宽度限制：往左拖 500px 也不会小于 60
  const resizer2 = resizerOf('customer')
  const rect2 = resizer2.getBoundingClientRect()
  const x2 = Math.round(rect2.left + rect2.width / 2)
  const y2 = Math.round(rect2.top + rect2.height / 2)
  fire('pointerdown', resizer2, x2, y2)
  fire('pointermove', document, x2 - 500, y2)
  fire('pointerup', document, x2 - 500, y2)
  await wait(160)
  const clampedWidth = widthOf('customer')

  return {
    before,
    during,
    after,
    afterReset,
    growsBy: after - before,
    clampedWidth,
    tableLayout: layout,
    tableWidthStyle,
    hint,
    remarkResizerExists: !!resizerOf('remark')
  }
})

// 拖顺序：顶层换位、分组内换位、冻结列拖不出去
const reordering = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('拖动表头换位置')
  )
  const scroll = block.querySelector('.sgt-scroll')
  const keysOf = (rowClass) =>
    [...scroll.querySelectorAll('.' + rowClass + ' [data-sgt-header-key]')].map((node) =>
      node.getAttribute('data-sgt-header-key')
    )
  const bodyKeys = () =>
    [...scroll.querySelectorAll('tbody tr.sgt-row')[0].children].map(
      (cell) => cell.getAttribute('data-sgt-key') || 'selection'
    )
  const headerDump = () =>
    [...scroll.querySelectorAll('thead [data-sgt-header-key]')].map(
      (node) =>
        node.getAttribute('data-sgt-header-key') +
        '@' +
        (node.closest('tr') ? node.closest('tr').className : '?')
    )
  const headerOf = (key) =>
    scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
  const centerOf = (key) => {
    const rect = headerOf(key).getBoundingClientRect()
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }
  }
  const fire = (type, target, x, y) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        clientX: x,
        clientY: y,
        bubbles: true,
        button: 0,
        pointerId: 2
      })
    )
  const drag = async (fromKey, toKey, offset) => {
    const from = centerOf(fromKey)
    const to = centerOf(toKey)
    fire('pointerdown', headerOf(fromKey), from.x, from.y)
    fire('pointermove', document, to.x + offset, to.y)
    await wait(90)
    const indicators = scroll.querySelectorAll(
      'thead .is-drop-before, thead .is-drop-after'
    ).length
    fire('pointerup', document, to.x + offset, to.y)
    await wait(160)
    return indicators
  }

  const result = {
    beforeTop: keysOf('sgt-head-row-1'),
    beforeGroup: keysOf('sgt-head-row-2'),
    beforeBody: bodyKeys(),
    headerDumpBefore: headerDump()
  }

  result.indicatorCount = await drag('qty', 'amount', 30)
  result.afterTop = keysOf('sgt-head-row-1')
  result.afterBody = bodyKeys()
  result.headerDumpAfter = headerDump()
  result.hintAfterReorder = block.querySelector('.demo-hint').textContent.trim()

  await drag('customer', 'product', 30)
  result.afterGroup = keysOf('sgt-head-row-2')
  result.afterGroupBody = bodyKeys()

  const hintBeforeFrozenDrag = block.querySelector('.demo-hint').textContent.trim()
  await drag('no', 'amount', 0)
  result.afterFrozenDrag = keysOf('sgt-head-row-1')
  result.frozenHintUnchanged =
    block.querySelector('.demo-hint').textContent.trim() === hintBeforeFrozenDrag

  return result
})

// 行排序：点三次表头在升序/降序/取消之间循环，空值恒排最后
const sorting = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('点表头排序')
  )
  if (!block) return null

  const scroll = block.querySelector('.sgt-scroll')
  const bodyKeys = () =>
    [...scroll.querySelectorAll('tbody tr.sgt-row')].map((row) =>
      row.querySelector('td[data-sgt-key="no"]').textContent.trim()
    )
  const header = (key) => scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
  const ariaOf = (key) => (header(key) ? header(key).getAttribute('aria-sort') : null)
  const click = async (key) => {
    header(key).click()
    await wait(200)
  }
  const hint = () => block.querySelector('.demo-hint').textContent.trim()

  const before = bodyKeys()
  await click('qty')
  const ascend = { order: bodyKeys(), aria: ariaOf('qty'), hint: hint() }
  await click('qty')
  const descend = { order: bodyKeys(), aria: ariaOf('qty'), hint: hint() }
  await click('qty')
  const cancelled = { order: bodyKeys(), aria: ariaOf('qty'), hint: hint() }
  await click('deliveryDate')
  const emptyLast = bodyKeys()

  return { before, ascend, descend, cancelled, emptyLast }
})

// 排序 + 合并：合并范围按当前显示顺序重算
const sortingWithMerge = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('合并范围会跟着新顺序重算')
  )
  if (!block) return null

  const scroll = block.querySelector('.sgt-scroll')
  const rows = () => [...scroll.querySelectorAll('tbody tr.sgt-row')]
  const deptSpans = () =>
    rows().map((row) => {
      const cell = row.querySelector('td[data-sgt-key="dept"]')
      return cell ? 'span=' + (cell.getAttribute('rowspan') || 1) : 'skipped'
    })
  const order = () =>
    rows().map((row) => row.querySelector('td[data-sgt-key="no"]').textContent.trim())
  const header = (key) => scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')

  const before = deptSpans()
  header('qty').click()
  await wait(220)

  return { before, afterOrder: order(), afterAscend: deptSpans() }
})

// 排序 + 编辑：编辑写回父数组的原始位置，父数组顺序不被打乱
const sortingWithEdit = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('点表头排序')
  )
  if (!block) return null

  const scroll = block.querySelector('.sgt-scroll')
  const header = (key) => scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
  const rowOrder = () =>
    [...scroll.querySelectorAll('tbody tr.sgt-row')].map((row) =>
      row.querySelector('td[data-sgt-key="no"]').textContent.trim()
    )
  const cellOf = (no, key) =>
    [...scroll.querySelectorAll('tbody tr.sgt-row')]
      .find((row) => row.querySelector('td[data-sgt-key="no"]').textContent.trim() === no)
      .querySelector('td[data-sgt-key="' + key + '"]')
  const orderText = () => {
    const matched = /数据顺序：([^｜\s]*)/.exec(block.querySelector('.demo-hint').textContent)
    return matched ? matched[1] : null
  }

  // 先按「客户」升序，让显示顺序与原始顺序不同
  header('customer').click()
  await wait(220)
  const sortedView = rowOrder()
  const orderBeforeEdit = orderText()

  // 排序状态下编辑第一行的客户
  const targetNo = sortedView[0]
  cellOf(targetNo, 'customer').click()
  await wait(150)
  const input = scroll.querySelector('.sgt-editor')
  input.value = '测试改名'
  input.dispatchEvent(new Event('input', { bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }))
  await wait(300)

  return {
    sortedView,
    orderBeforeEdit,
    orderAfterEdit: orderText(),
    editedCellText: cellOf(targetNo, 'customer').textContent.trim()
  }
})

// 单行表头（无分组）的拖顺序：能拖、单列开关生效、冻结列拖不出去
const flatReordering = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('单行表头也能拖')
  )
  const scroll = block.querySelector('.sgt-scroll')
  const bodyKeys = () =>
    [...scroll.querySelectorAll('tbody tr.sgt-row')[0].children].map((cell) =>
      cell.getAttribute('data-sgt-key')
    )
  const headerOf = (key) =>
    scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
  const centerOf = (key) => {
    const rect = headerOf(key).getBoundingClientRect()
    return { x: Math.round(rect.left + rect.width / 2), y: Math.round(rect.top + rect.height / 2) }
  }
  const fire = (type, target, x, y) =>
    target.dispatchEvent(
      new PointerEvent(type, {
        clientX: x,
        clientY: y,
        bubbles: true,
        button: 0,
        pointerId: 3
      })
    )
  const drag = async (fromKey, toKey, offset) => {
    const from = centerOf(fromKey)
    const to = centerOf(toKey)
    fire('pointerdown', headerOf(fromKey), from.x, from.y)
    fire('pointermove', document, to.x + offset, to.y)
    await wait(90)
    fire('pointerup', document, to.x + offset, to.y)
    await wait(160)
  }
  const hint = () => block.querySelector('.demo-hint').textContent.trim()

  const result = {
    headRowCount: scroll.querySelectorAll('thead tr').length,
    beforeBody: bodyKeys()
  }

  await drag('status', 'qty', -20)
  result.afterBody = bodyKeys()
  result.hintAfterDrag = hint()

  const hintBeforeDisabled = hint()
  await drag('action', 'customer', -20)
  result.disabledColumnUnchanged = bodyKeys().join() === result.afterBody.join()
  result.disabledColumnHintUnchanged = hint() === hintBeforeDisabled

  await drag('no', 'status', 20)
  result.frozenColumnUnchanged = bodyKeys().join() === result.afterBody.join()

  return result
})

// 用真实鼠标事件（CDP Input 域）再拖一遍单行表头那张表，看是不是只有合成事件才生效
const flatTitleKey = '单行表头也能拖'
const flatCoords = await evaluate(
  async (title) => {
    const block = [...document.querySelectorAll('.demo-block')].find((node) =>
      node.textContent.includes(title)
    )
    block.scrollIntoView({ block: 'center' })
    await new Promise((resolve) => setTimeout(resolve, 150))
    const scroll = block.querySelector('.sgt-scroll')
    const bodyKeys = () =>
      [...scroll.querySelectorAll('tbody tr.sgt-row')[0].children].map((cell) =>
        cell.getAttribute('data-sgt-key')
      )
    const centerOf = (key) => {
      const node = scroll.querySelector('thead [data-sgt-header-key="' + key + '"]')
      const rect = node.getBoundingClientRect()
      return {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      }
    }
    const last = scroll
      .querySelector('thead [data-sgt-header-key="action"]')
      .getBoundingClientRect()
    return {
      from: centerOf('product'),
      to: { x: Math.round(last.right + 20), y: centerOf('product').y },
      before: bodyKeys(),
      headerCursor: getComputedStyle(
        scroll.querySelector('thead [data-sgt-header-key="product"]')
      ).cursor,
      headerUserSelect: getComputedStyle(
        scroll.querySelector('thead [data-sgt-header-key="product"]')
      ).userSelect
    }
  },
  [flatTitleKey]
)

await send('Input.dispatchMouseEvent', {
  type: 'mousePressed',
  x: flatCoords.from.x,
  y: flatCoords.from.y,
  button: 'left',
  buttons: 1,
  clickCount: 1
})
for (let step = 1; step <= 6; step += 1) {
  const ratio = step / 6
  await send('Input.dispatchMouseEvent', {
    type: 'mouseMoved',
    x: Math.round(flatCoords.from.x + (flatCoords.to.x - 20 - flatCoords.from.x) * ratio),
    y: flatCoords.from.y,
    button: 'left',
    buttons: 1
  })
  await sleep(40)
}

const duringRealDrag = await evaluate(
  async (title) => {
    const block = [...document.querySelectorAll('.demo-block')].find((node) =>
      node.textContent.includes(title)
    )
    const scroll = block.querySelector('.sgt-scroll')
    return {
      draggingCellCount: scroll.querySelectorAll('thead .is-dragging').length,
      dropIndicatorCount: scroll.querySelectorAll(
        'thead .is-drop-before, thead .is-drop-after'
      ).length,
      dropIndicatorShadow: (() => {
        const cell = scroll.querySelector('thead .is-drop-before, thead .is-drop-after')
        return cell ? getComputedStyle(cell).boxShadow : null
      })(),
      ghostText: (() => {
        const ghost = document.querySelector('.sgt-drag-ghost')
        return ghost ? ghost.textContent.trim() : null
      })(),
      ghostPosition: (() => {
        const ghost = document.querySelector('.sgt-drag-ghost')
        return ghost ? getComputedStyle(ghost).position : null
      })(),
      bodyCursor: document.body.className
    }
  },
  [flatTitleKey]
)

// 拖动进行中截一张：能看到跟随光标的预览块和落点蓝线（不重新滚动，免得打断拖拽）
await captureCard(
  await evaluate(
    async (title) => {
      const block = [...document.querySelectorAll('.demo-block')].find((node) =>
        node.textContent.includes(title)
      )
      const card = block.querySelector('.demo-card').getBoundingClientRect()
      return {
        x: Math.round(card.left + window.scrollX),
        y: Math.round(card.top + window.scrollY),
        width: Math.round(card.width),
        height: Math.round(card.height)
      }
    },
    [flatTitleKey]
  ),
  'docs-drag-ghost.png'
)

await send('Input.dispatchMouseEvent', {
  type: 'mouseReleased',
  x: flatCoords.to.x - 20,
  y: flatCoords.to.y,
  button: 'left',
  buttons: 0,
  clickCount: 1
})
await sleep(220)

const afterRealDrag = await evaluate(
  async (title) => {
    const block = [...document.querySelectorAll('.demo-block')].find((node) =>
      node.textContent.includes(title)
    )
    const scroll = block.querySelector('.sgt-scroll')
    return {
      body: [...scroll.querySelectorAll('tbody tr.sgt-row')[0].children].map((cell) =>
        cell.getAttribute('data-sgt-key')
      ),
      hint: block.querySelector('.demo-hint').textContent.trim()
    }
  },
  [flatTitleKey]
)

const realMouseDrag = {
  before: flatCoords.before,
  headerCursor: flatCoords.headerCursor,
  headerUserSelect: flatCoords.headerUserSelect,
  during: duringRealDrag,
  after: afterRealDrag.body,
  reordered: flatCoords.before.join() !== afterRealDrag.body.join(),
  hint: afterRealDrag.hint
}

const frozenShot = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const block = [...document.querySelectorAll('.demo-block')].find((node) =>
    node.textContent.includes('冻结勾选框')
  )
  const scroller = block.querySelector('.sgt-scroll')
  scroller.scrollLeft = Math.round((scroller.scrollWidth - scroller.clientWidth) * 0.6)
  await wait(250)
  const rect = block.querySelector('.demo-card').getBoundingClientRect()
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    scrollLeft: scroller.scrollLeft
  }
})

async function captureCard(rect, fileName) {
  const shot = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { ...rect, scale: 1 }
  })
  writeFileSync(new URL('./' + fileName, import.meta.url), Buffer.from(shot.data, 'base64'))
}

async function cardRect(titleText, extraWait = 150) {
  return evaluate(
    async (title, wait) => {
      const block = [...document.querySelectorAll('.demo-block')].find((node) =>
        node.textContent.includes(title)
      )
      block.scrollIntoView({ block: 'center' })
      await new Promise((resolve) => setTimeout(resolve, wait))
      const card = block.querySelector('.demo-card').getBoundingClientRect()
      return {
        x: Math.round(card.left + window.scrollX),
        y: Math.round(card.top + window.scrollY),
        width: Math.round(card.width),
        height: Math.round(card.height)
      }
    },
    [titleText, extraWait]
  )
}

await captureCard(frozenShot, 'docs-frozen.png')
await captureCard(await cardRect('拖动表头改列宽'), 'docs-resize.png')
await captureCard(await cardRect('拖动表头换位置'), 'docs-reorder.png')
await captureCard(await cardRect('单行表头也能拖'), 'docs-reorder-flat.png')

console.log(
  'report written to .verify/docs-report.json\n' +
    JSON.stringify({
      navCount: docs.navCount,
      demoCount: docs.demoCount,
      previewRowCounts: docs.previewRowCounts,
      previewCellCounts: docs.previewCellCounts,
      mergeSourceHasMergeTrue: docs.mergeSourceHasMergeTrue,
      alignment,
      resizing,
      reordering,
      flatReordering,
      sorting,
      sortingWithMerge,
      sortingWithEdit,
      realMouseDrag,
      widths: geometry.map((item) => `${item.title}: 表 ${item.tableWidth} / 容器 ${item.containerWidth} / 空白 ${item.blankSpace}`),
      consoleMessages
    })
)

writeFileSync(
  new URL('./docs-report.json', import.meta.url),
  JSON.stringify(
    {
      docs,
      geometry,
      alignment,
      resizing,
      reordering,
      flatReordering,
      sorting,
      sortingWithMerge,
      sortingWithEdit,
      consoleMessages
    },
    null,
    2
  )
)

socket.close()
chrome.kill()

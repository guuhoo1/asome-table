/**
 * 用本机 Chrome 的无头模式 + CDP 校验 ScrollGroupTable 的实际渲染结果。
 * 用法：node .verify/cdp-check.mjs [url]
 */
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PAGE_URL = process.argv[2] || 'http://127.0.0.1:4173/'
const PORT = 9333

const profileDir = mkdtempSync(join(tmpdir(), 'sgt-profile-'))
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
    '--window-size=1440,900',
    'about:blank'
  ],
  { stdio: 'ignore' }
)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`)
      const list = await res.json()
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

async function evaluate(fn, args = null) {
  const expression = args
    ? `(${fn.toString()})(${JSON.stringify(args)})`
    : `(${fn.toString()})()`
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails))
  }
  return result.result.value
}

await send('Runtime.enable')
await send('Page.enable')
await send('Page.navigate', { url: PAGE_URL })
await sleep(2500)

const structure = await evaluate(() => {
  const round = (n) => Math.round(n * 100) / 100
  return [...document.querySelectorAll('.sgt-wrap')].map((wrap, index) => {
    const scroll = wrap.querySelector('.sgt-scroll')
    const headRows = [...wrap.querySelectorAll('thead tr')]
    const bodyRows = [...wrap.querySelectorAll('tbody tr.sgt-row')]
    const firstRow = bodyRows[0]
    const firstCells = firstRow ? [...firstRow.children] : []
    const groupCells = headRows[0] ? [...headRows[0].querySelectorAll('.sgt-group-cell')] : []
    const wrapStyle = getComputedStyle(wrap)
    return {
      index,
      wrapClasses: wrap.className,
      headRowCount: headRows.length,
      headCellsPerRow: headRows.map((row) => row.children.length),
      groupCells: groupCells.map((cell) => ({
        text: cell.textContent.trim(),
        colspan: Number(cell.getAttribute('colspan')),
        background: getComputedStyle(cell).backgroundColor
      })),
      rowspanTwoHeaders: headRows[0]
        ? [...headRows[0].querySelectorAll('th[rowspan="2"]')].map((cell) => cell.textContent.trim())
        : [],
      bodyRowCount: bodyRows.length,
      cellCountPerRow: firstCells.length,
      firstRowText: firstCells.map((cell) => cell.textContent.trim()),
      badgeCount: wrap.querySelectorAll('.sgt-badge').length,
      badgeColors: [...wrap.querySelectorAll('.sgt-badge')]
        .slice(0, 4)
        .map((badge) => `${badge.textContent.trim()}:${getComputedStyle(badge).backgroundColor}`),
      dashCells: firstCells.filter((cell) => cell.textContent.trim() === '-').length,
      secondRowDashCells:
        bodyRows[1] === undefined
          ? null
          : [...bodyRows[1].children].filter((cell) => cell.textContent.trim() === '-').length,
      freezeVar: wrapStyle.getPropertyValue('--freeze-w').trim(),
      leftShadowLeft: getComputedStyle(wrap, '::before').left,
      shadowOpacity: {
        left: getComputedStyle(wrap, '::before').opacity,
        right: getComputedStyle(wrap, '::after').opacity
      },
      scrollMetrics: {
        scrollWidth: scroll.scrollWidth,
        clientWidth: scroll.clientWidth,
        scrollHeight: scroll.scrollHeight,
        clientHeight: scroll.clientHeight,
        maxHeight: getComputedStyle(scroll).maxHeight,
        tableWidth: round(wrap.querySelector('table').getBoundingClientRect().width)
      },
      fixedCellsInFirstRow: firstRow
        ? [...firstRow.querySelectorAll('.sgt-fixed-left')].map((cell) => ({
            key: cell.getAttribute('data-sgt-key') || 'selection',
            left: getComputedStyle(cell).left,
            position: getComputedStyle(cell).position,
            width: round(cell.getBoundingClientRect().width)
          }))
        : []
    }
  })
})

const scrolling = await evaluate(async () => {
  const round = (n) => Math.round(n * 100) / 100
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const output = []

  for (const [index, wrap] of [...document.querySelectorAll('.sgt-wrap')].entries()) {
    const scroll = wrap.querySelector('.sgt-scroll')
    const initialClasses = wrap.className

    scroll.scrollLeft = scroll.scrollWidth
    await wait(150)
    const atRightEnd = wrap.className

    scroll.scrollLeft = Math.round((scroll.scrollWidth - scroll.clientWidth) / 2)
    await wait(150)
    const atMiddle = wrap.className

    scroll.scrollTop = scroll.scrollHeight
    await wait(150)

    const containerRect = scroll.getBoundingClientRect()
    const headRows = [...wrap.querySelectorAll('thead tr')]
    const bodyRows = [...wrap.querySelectorAll('tbody tr.sgt-row')]
    const lastRow = bodyRows[bodyRows.length - 1]
    const stickyTops = headRows.map((row) => round(row.children[0].getBoundingClientRect().top - containerRect.top))
    const frozenAfterScroll = lastRow
      ? [...lastRow.querySelectorAll('.sgt-fixed-left')].map((cell) => ({
          key: cell.getAttribute('data-sgt-key') || 'selection',
          offsetFromContainerLeft: round(cell.getBoundingClientRect().left - containerRect.left),
          cssLeft: getComputedStyle(cell).left
        }))
      : []
    const nonFrozenFirstCellOffset =
      lastRow && lastRow.children.length
        ? round(lastRow.children[lastRow.children.length - 1].getBoundingClientRect().left - containerRect.left)
        : null

    scroll.scrollLeft = 0
    scroll.scrollTop = 0
    await wait(150)

    output.push({
      index,
      classSequence: { initial: initialClasses, atRightEnd, atMiddle },
      stickyHeaderTops: stickyTops,
      frozenAfterScroll,
      lastCellOffsetFromContainerLeft: nonFrozenFirstCellOffset
    })
  }
  return output
})

const selection = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const wrap = document.querySelectorAll('.sgt-wrap')[0]
  const headCheckbox = wrap.querySelector('thead input[type="checkbox"]')
  const rowBoxes = () => [...wrap.querySelectorAll('tbody input[type="checkbox"]')]
  const snapshot = (step) => ({
    step,
    headerChecked: headCheckbox.checked,
    headerIndeterminate: headCheckbox.indeterminate,
    checkedBoxes: rowBoxes().filter((box) => box.checked).length,
    disabledBoxes: rowBoxes().filter((box) => box.disabled).length,
    highlightedRows: wrap.querySelectorAll('tbody tr.is-selected').length
  })

  const steps = [snapshot('initial')]

  headCheckbox.click()
  await wait(150)
  steps.push(snapshot('afterSelectAll'))

  const enabled = rowBoxes().find((box) => !box.disabled)
  enabled.click()
  await wait(150)
  steps.push(snapshot('afterUncheckOneRow'))

  const disabledBox = rowBoxes().find((box) => box.disabled)
  const disabledBefore = disabledBox.checked
  disabledBox.click()
  await wait(150)
  steps.push({
    ...snapshot('afterClickDisabledRow'),
    disabledRowStayedUnchecked: disabledBox.checked === disabledBefore
  })

  const targetRow = wrap.querySelector('tbody tr.sgt-row')
  const cellToClick = targetRow.children[2]
  cellToClick.click()
  await wait(150)
  steps.push({ ...snapshot('afterRowClick'), clickedRowHighlighted: targetRow.classList.contains('is-selected') })

  return steps
})

const frozenSelection = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const wrap = document.querySelectorAll('.sgt-wrap')[1]
  const headCheckbox = wrap.querySelector('thead input[type="checkbox"]')
  headCheckbox.click()
  await wait(150)
  return {
    headerChecked: headCheckbox.checked,
    checkedBoxes: [...wrap.querySelectorAll('tbody input[type="checkbox"]')].filter((box) => box.checked).length,
    highlightedRows: wrap.querySelectorAll('tbody tr.is-selected').length,
    uncheckedDisabledRows: [...wrap.querySelectorAll('tbody input[type="checkbox"]')].filter((box) => box.disabled && !box.checked).length
  }
})

const edgeCases = await evaluate(() => {
  const wrap = document.querySelectorAll('.sgt-wrap')[4]
  if (!wrap) return null
  const headRows = [...wrap.querySelectorAll('thead tr')]
  const emptyCell = wrap.querySelector('tbody .sgt-empty-cell')
  return {
    headRowCount: headRows.length,
    headCellCount: headRows[0] ? headRows[0].children.length : 0,
    headTexts: headRows[0] ? [...headRows[0].children].map((cell) => cell.textContent.trim()) : [],
    emptyRowRendered: !!emptyCell,
    emptyColspan: emptyCell ? Number(emptyCell.getAttribute('colspan')) : null,
    emptyText: emptyCell ? emptyCell.textContent.trim() : null,
    stickyTop: headRows[0] ? getComputedStyle(headRows[0].children[0]).top : null
  }
})

// 对齐：勾选框要居中、align:'right' 的列要真的右对齐
const alignment = await evaluate(() => {
  const wrap = document.querySelectorAll('.sgt-wrap')[0]
  const headCell = wrap.querySelector('thead .sgt-selection-cell')
  const bodyCell = wrap.querySelector('tbody .sgt-selection-cell')
  const centerDelta = (cell, box) => {
    const cellRect = cell.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    return Math.round(boxRect.left + boxRect.width / 2 - (cellRect.left + cellRect.width / 2))
  }
  const rightCell = wrap.querySelector('tbody td.sgt-align-right')
  const fixedCell = document.querySelectorAll('.sgt-wrap')[1].querySelector('tbody td.sgt-fixed-left')

  return {
    headTextAlign: getComputedStyle(headCell).textAlign,
    bodyTextAlign: getComputedStyle(bodyCell).textAlign,
    headCenterDelta: centerDelta(headCell, headCell.querySelector('input')),
    bodyCenterDelta: centerDelta(bodyCell, bodyCell.querySelector('input')),
    rightCellTextAlign: rightCell ? getComputedStyle(rightCell).textAlign : null,
    fixedCellBorderRight: fixedCell ? getComputedStyle(fixedCell).borderRightColor : null
  }
})

const merges = await evaluate(() => {
  const wrap = document.querySelectorAll('.sgt-wrap')[2]
  if (!wrap) return null
  const rows = [...wrap.querySelectorAll('tbody tr.sgt-row')]
  const headRows = [...wrap.querySelectorAll('thead tr')]
  const anchors = {}
  const findCell = (row, key) =>
    [...row.children].find((cell) => cell.getAttribute('data-sgt-key') === key)

  rows.forEach((row, rowIndex) => {
    [...row.children].forEach((cell) => {
      const span = Number(cell.getAttribute('rowspan') || 1)
      if (span > 1) {
        const key = cell.getAttribute('data-sgt-key')
        anchors[key] = anchors[key] || []
        anchors[key].push({ rowIndex, rowspan: span })
      }
    })
  })

  const coverage = {}
  Object.keys(anchors).forEach((key) => {
    let total = 0
    rows.forEach((row) => {
      const cell = findCell(row, key)
      if (cell) total += Number(cell.getAttribute('rowspan') || 1)
    })
    coverage[key] = total
  })

  return {
    bodyRowCount: rows.length,
    leafColumnsInSecondHeaderRow: headRows[1] ? headRows[1].children.length : null,
    selectionColumnHeight: rows[0].children[0].getAttribute('rowspan'),
    renderedCellsPerRow: rows.map((row) => [...row.children].length),
    mergeAnchors: anchors,
    spanCoverage: coverage,
    deliveryDateSpans: rows.map((row) => {
      const cell = findCell(row, 'deliveryDate')
      return cell ? cell.getAttribute('rowspan') || '1' : 'skipped'
    }),
    deliveryDateText: rows.map((row) => {
      const cell = findCell(row, 'deliveryDate')
      return cell ? cell.textContent.trim() : 'skipped'
    })
  }
})

const mergeHighlight = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const wrap = document.querySelectorAll('.sgt-wrap')[2]
  const rows = [...wrap.querySelectorAll('tbody tr.sgt-row')]
  const findCell = (row, key) =>
    [...row.children].find((cell) => cell.getAttribute('data-sgt-key') === key)

  rows[6].querySelector('input[type="checkbox"]').click()
  await wait(150)

  const customerCell = findCell(rows[5], 'customer')
  const deptCell = findCell(rows[5], 'dept')
  const productCell = findCell(rows[6], 'product')

  return {
    anchorRowSelected: rows[5].classList.contains('is-selected'),
    clickedRowSelected: rows[6].classList.contains('is-selected'),
    customerSpanSelected: customerCell.classList.contains('is-span-selected'),
    customerBackground: getComputedStyle(customerCell).backgroundColor,
    deptSpanSelected: deptCell.classList.contains('is-span-selected'),
    deptSpanRowspan: deptCell.getAttribute('rowspan'),
    selectedRowCellBackground: getComputedStyle(productCell).backgroundColor
  }
})

const editing = await evaluate(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
  const wrap = document.querySelectorAll('.sgt-wrap')[3]
  const rows = () => [...wrap.querySelectorAll('tbody tr.sgt-row')]
  const findCell = (rowIndex, key) =>
    [...rows()[rowIndex].children].find((cell) => cell.getAttribute('data-sgt-key') === key)
  const editor = () => wrap.querySelector('.sgt-editor')
  const errorText = () => {
    const node = wrap.querySelector('.sgt-editor-error')
    return node ? node.textContent.trim() : null
  }
  const lastEdit = () => {
    const node = document.querySelector('.last-edit')
    return node ? node.textContent.trim() : null
  }
  const type = (input, value) => {
    input.value = value
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
  const press = (input, key, keyCode) =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key, keyCode, bubbles: true }))
  const blur = (input) => input.dispatchEvent(new Event('blur'))
  const customerTexts = () => rows().map((row) => {
    const cell = [...row.children].find((c) => c.getAttribute('data-sgt-key') === 'customer')
    return cell ? cell.textContent.trim() : 'skipped'
  })

  const steps = []

  // 1. 只读列点了不该出编辑器
  findCell(0, 'no').click()
  await wait(100)
  steps.push({ step: 'readonlyClick', editorRendered: !!editor() })

  // 2. 必填校验：清空后失焦 → 报错、不提交、编辑器不关
  findCell(0, 'customer').click()
  await wait(100)
  const opened = !!editor()
  type(editor(), '')
  blur(editor())
  await wait(150)
  steps.push({
    step: 'requiredRule',
    editorOpened: opened,
    editorStillOpen: !!editor(),
    error: errorText(),
    cellText: findCell(0, 'customer').textContent.trim()
  })

  // 3. 合法值 + 回车提交
  type(editor(), '张三丰')
  press(editor(), 'Enter', 13)
  await wait(200)
  steps.push({
    step: 'commitByEnter',
    editorRendered: !!editor(),
    cellText: findCell(0, 'customer').textContent.trim(),
    otherRows: customerTexts(),
    lastEdit: lastEdit()
  })

  // 4. Esc 取消
  findCell(1, 'customer').click()
  await wait(100)
  type(editor(), '不该生效')
  press(editor(), 'Escape', 27)
  await wait(150)
  steps.push({
    step: 'escCancel',
    editorRendered: !!editor(),
    cellText: findCell(1, 'customer').textContent.trim()
  })

  // 5. number 规则：0 触发 min，7 通过
  findCell(0, 'qty').click()
  await wait(100)
  const numberType = editor().getAttribute('type')
  type(editor(), '0')
  blur(editor())
  await wait(150)
  steps.push({
    step: 'numberMinRule',
    inputType: numberType,
    error: errorText(),
    cellText: findCell(0, 'qty').textContent.trim()
  })
  type(editor(), '7')
  blur(editor())
  await wait(200)
  steps.push({
    step: 'numberCommit',
    editorRendered: !!editor(),
    cellText: findCell(0, 'qty').textContent.trim(),
    lastEdit: lastEdit()
  })

  // 6. 合并列（部门 anchor 行 0，跨 5 行）写回整组
  const deptBefore = [...rows()[0].children]
    .find((c) => c.getAttribute('data-sgt-key') === 'dept')
    .getAttribute('rowspan')
  findCell(0, 'dept').click()
  await wait(100)
  type(editor(), '华南大区')
  blur(editor())
  await wait(250)
  const deptCells = rows().map((row) => {
    const cell = [...row.children].find((c) => c.getAttribute('data-sgt-key') === 'dept')
    return cell ? `${cell.textContent.trim()}(rowspan=${cell.getAttribute('rowspan') || 1})` : 'skipped'
  })
  steps.push({
    step: 'mergedCellCommit',
    rowspanBefore: deptBefore,
    deptCells,
    lastEdit: lastEdit()
  })

  // 7. select 选择即提交
  findCell(0, 'status').click()
  await wait(100)
  const select = wrap.querySelector('select.sgt-editor')
  const optionCount = select ? select.options.length : 0
  select.value = '已完成'
  select.dispatchEvent(new Event('change', { bubbles: true }))
  await wait(200)
  const statusCell = findCell(0, 'status')
  const badge = statusCell.querySelector('.sgt-badge')
  steps.push({
    step: 'selectCommit',
    optionCount,
    editorRendered: !!editor(),
    badgeText: badge ? badge.textContent.trim() : statusCell.textContent.trim(),
    badgeClass: badge ? badge.className : null,
    lastEdit: lastEdit()
  })

  // 8. datetime-local：'2024-03-01 09:12' 进编辑器要变成 '2024-03-01T09:12'
  findCell(0, 'orderTime').click()
  await wait(100)
  const dateTimeInput = editor()
  const dateTimeType = dateTimeInput.getAttribute('type')
  const dateTimeValue = dateTimeInput.value
  type(dateTimeInput, '2024-03-01T20:30')
  blur(dateTimeInput)
  await wait(200)
  steps.push({
    step: 'datetimeCommit',
    inputType: dateTimeType,
    editorValue: dateTimeValue,
    cellText: findCell(0, 'orderTime').textContent.trim(),
    lastEdit: lastEdit()
  })

  // 9. 打开又不动就失焦：不该产生提交
  const lastEditAfterDateTime = lastEdit()
  findCell(0, 'orderTime').click()
  await wait(100)
  blur(editor())
  await wait(200)
  steps.push({
    step: 'untouchedDateCell',
    editorRendered: !!editor(),
    lastEditUnchanged: lastEdit() === lastEditAfterDateTime,
    cellText: findCell(0, 'orderTime').textContent.trim()
  })

  // 10. date 控件 + 提交
  findCell(0, 'deliveryDate').click()
  await wait(100)
  const dateInput = editor()
  const dateType = dateInput.getAttribute('type')
  const dateValue = dateInput.value
  type(dateInput, '2024-03-09')
  blur(dateInput)
  await wait(200)
  steps.push({
    step: 'dateCommit',
    inputType: dateType,
    editorValue: dateValue,
    cellText: findCell(0, 'deliveryDate').textContent.trim()
  })

  // 11. 空日期踩 required：不提交、编辑器不关
  findCell(3, 'deliveryDate').click()
  await wait(100)
  const emptyDateValue = editor().value
  blur(editor())
  await wait(200)
  steps.push({
    step: 'emptyDateRequired',
    editorValue: emptyDateValue,
    editorStillOpen: !!editor(),
    error: errorText()
  })
  press(editor(), 'Escape', 27)
  await wait(100)

  return { steps }
})

console.log(
  'report written to .verify/report.json\n' +
    JSON.stringify({
      tables: structure.length,
      bodyRows: structure.map((table) => table.bodyRowCount),
      cellsPerRow: structure.map((table) => table.cellCountPerRow),
      freezeVar: structure.map((table) => table.freezeVar),
      alignment,
      consoleMessages
    })
)

writeFileSync(
  new URL('./report.json', import.meta.url),
  JSON.stringify(
    {
      structure,
      scrolling,
      alignment,
      selection,
      frozenSelection,
      merges,
      mergeHighlight,
      editing,
      edgeCases,
      consoleMessages
    },
    null,
    2
  )
)

socket.close()
chrome.kill()

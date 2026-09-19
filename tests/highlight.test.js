import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeHtml, highlight } from '../src/docs/highlight.js'

test('escapeHtml 把标签和引号都转掉', () => {
  assert.equal(escapeHtml('<a href="x">&</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  assert.equal(escapeHtml(null), 'null')
})

test('模板标签、属性、字符串各自上色', () => {
  const html = highlight('<scroll-group-table :columns="columns" />')

  assert.match(html, /<span class="tok-tag">&lt;scroll-group-table<\/span>/)
  assert.match(html, /<span class="tok-attr">:columns<\/span>/)
  assert.match(html, /<span class="tok-string">&quot;columns&quot;<\/span>/)
  assert.match(html, /<span class="tok-punct">\/&gt;<\/span>/)
})

test('JS 关键字、注释、插值都能识别', () => {
  assert.match(highlight('const a = 1'), /<span class="tok-keyword">const<\/span>/)
  assert.match(highlight('const a = 12.5'), /<span class="tok-number">12.5<\/span>/)
  assert.match(highlight('// 说明\nlet b = 2'), /<span class="tok-comment">\/\/ 说明<\/span>/)
  assert.match(highlight('<!-- 注释 -->'), /<span class="tok-comment">&lt;!-- 注释 --&gt;<\/span>/)
  assert.match(highlight('<td>{{ text }}</td>'), /<span class="tok-interp">\{\{ text \}\}<\/span>/)
})

test('源码里的尖括号不会被当成真的 HTML', () => {
  const html = highlight('<td :rowspan="2">')

  assert.equal(html.includes('<td'), false)
  assert.equal(html.includes('&lt;td'), true)
})

test('普通文本与空输入原样返回', () => {
  assert.equal(highlight('纯文本 123'), '纯文本 <span class="tok-number">123</span>')
  assert.equal(highlight(''), '')
  assert.equal(highlight(null), '')
  assert.equal(highlight(undefined), '')
})

test('高亮结果拼起来等于原文（不丢字符）', () => {
  const source = [
    '<template>',
    '  <table :columns="columns" @change="onChange" />',
    '</template>',
    '',
    '<script>',
    '// 说明',
    'export default { name: "Demo" }',
    "</script>"
  ].join('\n')

  const plain = highlight(source)
    .replace(/<span class="tok-[a-z]+">/g, '')
    .replace(/<\/span>/g, '')

  assert.equal(
    plain.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    source
  )
})

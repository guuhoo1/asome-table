/**
 * 文档里的代码高亮：故意做成轻量自写版，不引 highlight.js / prism，保持仓库里
 * 只有 vue 一个运行时依赖。规则按出现顺序匹配，匹配不到就按普通文本原样输出。
 */

const TOKEN_RULES = [
  { type: 'comment', re: /<!--[\s\S]*?-->/y },
  { type: 'comment', re: /\/\/[^\n]*/y },
  { type: 'comment', re: /\/\*[\s\S]*?\*\//y },
  { type: 'tag', re: /<\/?[A-Za-z][\w-]*/y },
  { type: 'punct', re: /\/?>/y },
  { type: 'interp', re: /\{\{[\s\S]*?\}\}/y },
  { type: 'string', re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y },
  { type: 'attr', re: /[:@#][\w-]+|[\w-]+(?=\s*=)/y },
  {
    type: 'keyword',
    re: /\b(?:import|export|from|default|const|let|var|function|return|if|else|for|in|of|new|async|await|typeof|true|false|null|undefined|this)\b/y
  },
  { type: 'number', re: /\b\d+(?:\.\d+)?\b/y }
]

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 代码字符串 → 带 <span class="tok-xxx"> 的 HTML（内容已转义，可直接 v-html） */
export function highlight(code) {
  const text = code === null || code === undefined ? '' : String(code)
  let html = ''
  let index = 0

  while (index < text.length) {
    let matched = false

    for (let i = 0; i < TOKEN_RULES.length; i += 1) {
      const rule = TOKEN_RULES[i]
      rule.re.lastIndex = index
      const result = rule.re.exec(text)

      if (result && result.index === index && result[0]) {
        html += '<span class="tok-' + rule.type + '">' + escapeHtml(result[0]) + '</span>'
        index += result[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      html += escapeHtml(text[index])
      index += 1
    }
  }

  return html
}

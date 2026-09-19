<template>
  <section :id="anchor" class="demo-block">
    <h3 class="demo-title">{{ title }}</h3>
    <p v-if="description" class="demo-desc">{{ description }}</p>
    <div class="demo-card">
      <div class="demo-preview">
        <slot />
      </div>
      <div class="demo-toolbar">
        <button type="button" class="demo-toggle" @click="expanded = !expanded">
          {{ expanded ? '隐藏代码' : '显示代码' }}
        </button>
        <button type="button" class="demo-copy" @click="copy">
          {{ copied ? '已复制' : '复制代码' }}
        </button>
      </div>
      <div v-show="expanded" class="demo-code">
        <docs-code-block :code="source" />
      </div>
    </div>
  </section>
</template>

<script>
import DocsCodeBlock from './DocsCodeBlock.vue'

export default {
  name: 'DocsDemoBlock',
  components: { DocsCodeBlock },
  props: {
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    anchor: { type: String, default: '' },
    source: { type: String, default: '' }
  },
  data() {
    return {
      expanded: false,
      copied: false,
      copyTimer: null
    }
  },
  beforeDestroy() {
    if (this.copyTimer) clearTimeout(this.copyTimer)
  },
  methods: {
    copy() {
      const text = this.source
      const done = () => {
        this.copied = true
        if (this.copyTimer) clearTimeout(this.copyTimer)
        this.copyTimer = setTimeout(() => {
          this.copied = false
        }, 1500)
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done)
          return
        }
      } catch (error) {
        // 浏览器不给剪贴板权限时退化成下面的兜底
      }

      try {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', 'readonly')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      } catch (error) {
        // 复制失败也让按钮有反馈，不抛错打断页面
      }
      done()
    }
  }
}
</script>

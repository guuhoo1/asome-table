<template>
  <pre class="docs-code"><code v-html="html"></code></pre>
</template>

<script>
import { highlight } from './highlight.js'

export default {
  name: 'DocsCodeBlock',
  props: {
    code: { type: String, default: '' }
  },
  computed: {
    html() {
      return highlight(this.code)
    }
  }
}
</script>

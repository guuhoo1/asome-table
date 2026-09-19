import Vue from 'vue'
import DocsApp from './docs/DocsApp.vue'
import './docs/docs.css'

Vue.config.productionTip = false

new Vue({
  render: (h) => h(DocsApp)
}).$mount('#app')

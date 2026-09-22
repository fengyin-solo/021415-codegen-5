import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { initAppearance } from './stores/settings'
import './styles/global.scss'
import './styles/editor-theme.scss'

// Apply persisted theme / font size / line width before first paint.
initAppearance()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')

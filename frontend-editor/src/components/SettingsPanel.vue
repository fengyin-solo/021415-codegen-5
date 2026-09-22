<template>
  <Teleport to="body">
    <Transition name="settings-fade">
      <div
        v-if="open"
        class="settings-overlay"
        @click.self="emit('close')"
      >
        <div
          class="settings"
          role="dialog"
          aria-modal="true"
          aria-label="外观设置"
        >
          <header class="settings__head">
            <h2 class="settings__title">外观设置</h2>
            <button
              class="settings__close"
              type="button"
              aria-label="关闭"
              @click="emit('close')"
              v-html="iconClose"
            />
          </header>

          <!-- Code / editor font size -->
          <section class="settings__row">
            <div class="settings__label">
              <span class="settings__name">代码字号</span>
              <span class="settings__hint">编辑区正文字号，代码块等比缩放</span>
            </div>
            <div class="settings__control">
              <div class="stepper">
                <button
                  type="button"
                  class="stepper__btn"
                  :disabled="settings.fontSize <= settings.FONT_SIZE.min"
                  aria-label="减小字号"
                  @click="stepFont(-1)"
                  v-html="iconMinus"
                />
                <input
                  class="stepper__input"
                  type="number"
                  inputmode="numeric"
                  :min="settings.FONT_SIZE.min"
                  :max="settings.FONT_SIZE.max"
                  :step="settings.FONT_SIZE.step"
                  :value="settings.fontSize"
                  aria-label="字号（像素）"
                  @change="onFontSizeInput"
                  @keydown.enter.prevent="($event.target.blur())"
                />
                <span class="stepper__unit">px</span>
                <button
                  type="button"
                  class="stepper__btn"
                  :disabled="settings.fontSize >= settings.FONT_SIZE.max"
                  aria-label="增大字号"
                  @click="stepFont(1)"
                  v-html="iconPlus"
                />
              </div>
              <input
                class="slider"
                type="range"
                :min="settings.FONT_SIZE.min"
                :max="settings.FONT_SIZE.max"
                :step="settings.FONT_SIZE.step"
                :value="settings.fontSize"
                aria-label="字号滑块"
                @input="onFontSizeInput($event, true)"
              />
            </div>
          </section>

          <!-- Line width -->
          <section class="settings__row">
            <div class="settings__label">
              <span class="settings__name">行宽</span>
              <span class="settings__hint">正文区域最大宽度</span>
            </div>
            <div class="settings__control">
              <div class="stepper">
                <button
                  type="button"
                  class="stepper__btn"
                  :disabled="settings.lineWidth <= settings.LINE_WIDTH.min"
                  aria-label="减小行宽"
                  @click="stepWidth(-settings.LINE_WIDTH.step)"
                  v-html="iconMinus"
                />
                <input
                  class="stepper__input"
                  type="number"
                  inputmode="numeric"
                  :min="settings.LINE_WIDTH.min"
                  :max="settings.LINE_WIDTH.max"
                  :step="settings.LINE_WIDTH.step"
                  :value="settings.lineWidth"
                  aria-label="行宽（像素）"
                  @change="onLineWidthInput"
                  @keydown.enter.prevent="($event.target.blur())"
                />
                <span class="stepper__unit">px</span>
                <button
                  type="button"
                  class="stepper__btn"
                  :disabled="settings.lineWidth >= settings.LINE_WIDTH.max"
                  aria-label="增大行宽"
                  @click="stepWidth(settings.LINE_WIDTH.step)"
                  v-html="iconPlus"
                />
              </div>
              <input
                class="slider"
                type="range"
                :min="settings.LINE_WIDTH.min"
                :max="settings.LINE_WIDTH.max"
                :step="settings.LINE_WIDTH.step"
                :value="settings.lineWidth"
                aria-label="行宽滑块"
                @input="onLineWidthInput($event, true)"
              />
            </div>
          </section>

          <!-- Theme -->
          <section class="settings__row">
            <div class="settings__label">
              <span class="settings__name">主题</span>
              <span class="settings__hint">浅色 / 深色 / 护眼纸张</span>
            </div>
            <div class="theme-group" role="radiogroup" aria-label="主题">
              <button
                v-for="t in themeOptions"
                :key="t.id"
                type="button"
                role="radio"
                :aria-checked="settings.theme === t.id"
                :class="['theme-chip', { 'theme-chip--active': settings.theme === t.id }]"
                @click="setTheme(t.id)"
              >
                <span class="theme-chip__swatch" :data-swatch="t.id" aria-hidden="true" />
                {{ t.label }}
              </button>
            </div>
          </section>

          <!-- Autosave -->
          <section class="settings__row">
            <div class="settings__label">
              <span class="settings__name">自动保存</span>
              <span class="settings__hint" :class="{ 'settings__hint--off': !settings.storageAvailable }">
                {{ settings.storageAvailable ? '重新进入后恢复上次文稿' : '存储不可用，当前无法使用' }}
              </span>
            </div>
            <div class="settings__control">
              <button
                type="button"
                role="switch"
                :aria-checked="settings.autosave"
                :disabled="!settings.storageAvailable"
                :class="['switch', { 'switch--on': settings.autosave, 'switch--disabled': !settings.storageAvailable }]"
                @click="toggleAutosave"
              >
                <span class="switch__knob" />
              </button>
            </div>
          </section>

          <footer class="settings__foot">
            <button type="button" class="btn btn--ghost" @click="onReset">
              恢复默认
            </button>
            <button type="button" class="btn btn--primary" @click="emit('close')">
              完成
            </button>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'notify'])

const settings = useSettingsStore()

const I = (d) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const iconMinus = I('<line x1="5" y1="12" x2="19" y2="12"/>')
const iconPlus = I('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>')
const iconClose = I('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>')

const themeOptions = [
  { id: 'light', label: '浅色' },
  { id: 'dark', label: '深色' },
  { id: 'sepia', label: '护眼' }
]

// Every input is funneled through settings.update(): the store re-sanitizes
// and the displayed :value is the store value, so an out-of-range or garbage
// entry snaps back to the safe/clamped value in the control itself.
function onFontSizeInput(event, live = false) {
  const raw = event?.target?.value
  settings.update({ fontSize: live ? Number(raw) : parseBound(raw, settings.FONT_SIZE, settings.fontSize) })
}

function onLineWidthInput(event, live = false) {
  const raw = event?.target?.value
  settings.update({ lineWidth: live ? Number(raw) : parseBound(raw, settings.LINE_WIDTH, settings.lineWidth) })
}

// Defensive parse for the numeric text inputs (极值输入): empty, 'abc',
// Infinity, 99999, -100 etc. The store is the final authority; this only
// decides whether a non-live change should revert visually.
function parseBound(raw, bounds, current) {
  if (raw === '' || raw === null || raw === undefined) return current
  const n = Number(raw)
  if (!Number.isFinite(n)) return current
  return Math.min(bounds.max, Math.max(bounds.min, Math.round(n)))
}

function stepFont(dir) {
  settings.update({ fontSize: settings.fontSize + dir * settings.FONT_SIZE.step })
}
function stepWidth(dir) {
  settings.update({ lineWidth: settings.lineWidth + dir })
}
function setTheme(id) {
  settings.update({ theme: id })
}
function toggleAutosave() {
  if (!settings.storageAvailable) return
  settings.update({ autosave: !settings.autosave })
}
function onReset() {
  settings.reset()
  emit('notify', '已恢复默认外观设置', 'info')
}

// Esc closes; the dialog is non-modal to the editor content (clicks on the
// scrim also close), and never installs editor keymaps so existing
// shortcuts stay intact.
function onKeydown(e) {
  if (props.open && e.key === 'Escape') {
    e.stopPropagation()
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown, true))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown, true))
</script>

<style lang="scss" scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding: 56px 20px 20px;
  background: rgba(28, 25, 23, 0.28);
  backdrop-filter: blur(2px);
}

.settings {
  width: 360px;
  max-width: calc(100vw - 40px);
  background: var(--c-bg-elevated);
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: $r-lg;
  box-shadow: 0 12px 40px var(--c-shadow);
  padding: $sp-5;
  font-family: $font-ui;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $sp-4;
  }

  &__title {
    font-size: $fs-base;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  &__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: $r-md;
    background: transparent;
    color: var(--c-text-2);
    cursor: pointer;
    transition: all $t-fast $ease;
    &:hover { background: var(--c-accent-soft); color: var(--c-accent); }
  }

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: $sp-4;
    padding: $sp-3 0;
    border-top: 1px solid var(--c-border-light);
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 2px;
  }

  &__name {
    font-size: $fs-sm;
    font-weight: 600;
    color: var(--c-text);
  }

  &__hint {
    font-size: $fs-xs;
    color: var(--c-text-3);
    line-height: 1.4;
    max-width: 150px;

    &--off { color: $warning; }
  }

  &__control {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: $sp-2;
    min-width: 160px;
  }

  &__foot {
    display: flex;
    justify-content: flex-end;
    gap: $sp-2;
    margin-top: $sp-4;
    padding-top: $sp-4;
    border-top: 1px solid var(--c-border-light);
  }
}

.stepper {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  border: 1px solid var(--c-border);
  border-radius: $r-md;
  padding: 2px;
  background: var(--c-bg);

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: $r-sm;
    background: transparent;
    color: var(--c-text-2);
    cursor: pointer;
    transition: all $t-fast $ease;
    &:hover:not(:disabled) { background: var(--c-accent-soft); color: var(--c-accent); }
    &:disabled { opacity: 0.35; cursor: not-allowed; }
  }

  &__input {
    width: 52px;
    height: 24px;
    border: none;
    background: transparent;
    text-align: center;
    font-family: $font-mono;
    font-size: $fs-sm;
    color: var(--c-text);
    -moz-appearance: textfield;
    appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    &:focus { outline: none; }
  }

  &__unit {
    font-size: $fs-xs;
    color: var(--c-text-3);
    font-family: $font-mono;
    padding-right: 2px;
  }
}

.slider {
  width: 160px;
  accent-color: var(--c-accent);
  cursor: pointer;
}

.theme-group {
  display: flex;
  gap: $sp-2;
}

.theme-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--c-border);
  border-radius: $r-full;
  background: var(--c-bg);
  color: var(--c-text-2);
  font-size: $fs-xs;
  cursor: pointer;
  transition: all $t-fast $ease;

  &:hover { border-color: var(--c-accent); color: var(--c-accent); }

  &--active {
    border-color: var(--c-accent);
    color: var(--c-accent);
    background: var(--c-accent-soft);
  }

  &__swatch {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.12);

    &[data-swatch='light'] { background: linear-gradient(135deg, #ffffff, #e7e5e4); }
    &[data-swatch='dark'] { background: linear-gradient(135deg, #292524, #0c0a09); }
    &[data-swatch='sepia'] { background: linear-gradient(135deg, #fbf5e7, #d9c39a); }
  }
}

.switch {
  position: relative;
  width: 40px;
  height: 22px;
  border-radius: $r-full;
  border: 1px solid var(--c-border);
  background: var(--c-bg-code);
  cursor: pointer;
  padding: 0;
  transition: all $t-fast $ease;

  &__knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    transition: transform $t-fast $ease;
  }

  &--on {
    background: var(--c-accent);
    border-color: var(--c-accent);
    .switch__knob { transform: translateX(18px); }
  }

  &--disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.btn {
  border: none;
  border-radius: $r-md;
  padding: 6px 14px;
  font-size: $fs-sm;
  cursor: pointer;
  transition: all $t-fast $ease;

  &--ghost {
    background: transparent;
    color: var(--c-text-2);
    &:hover { background: var(--c-accent-soft); color: var(--c-accent); }
  }

  &--primary {
    background: var(--c-accent);
    color: #fff;
    &:hover { filter: brightness(1.05); }
  }
}

.settings-fade-enter-active,
.settings-fade-leave-active {
  transition: opacity $t-fast $ease;
  .settings { transition: transform $t-fast $ease, opacity $t-fast $ease; }
}
.settings-fade-enter-from,
.settings-fade-leave-to {
  opacity: 0;
  .settings { transform: translateY(-6px); opacity: 0; }
}
</style>

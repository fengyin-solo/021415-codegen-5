<template>
  <Transition name="modal">
    <div
      v-if="modelValue"
      class="settings"
      role="dialog"
      aria-modal="true"
      aria-label="外观设置"
      @mousedown.self="close"
    >
      <div class="settings__panel" @keydown.esc.stop="close">
        <header class="settings__header">
          <h2 class="settings__title">外观设置</h2>
          <button class="settings__close" title="关闭 (Esc)" aria-label="关闭" @click="close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </header>

        <div v-if="!prefs.storageReady" class="settings__warning">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>当前环境无法使用本地存储，偏好仅本次会话生效，自动保存不可用。</span>
        </div>

        <div class="settings__body">
          <!-- Theme -->
          <section class="field">
            <label class="field__label">主题</label>
            <div class="theme-group" role="radiogroup" aria-label="主题">
              <button
                v-for="t in themes"
                :key="t.id"
                role="radio"
                :aria-checked="prefs.theme === t.id"
                :class="['theme-btn', { 'theme-btn--active': prefs.theme === t.id }]"
                @click="prefs.setTheme(t.id)"
              >
                <span v-html="t.icon" />
                <span>{{ t.name }}</span>
              </button>
            </div>
          </section>

          <!-- Font size -->
          <section class="field">
            <div class="field__head">
              <label class="field__label" for="mira-font-size">代码字号</label>
              <div class="field__input-wrap">
                <input
                  id="mira-font-size"
                  class="field__number"
                  type="number"
                  :min="fontMin"
                  :max="fontMax"
                  step="1"
                  :value="fontDraft"
                  @focus="fontFocused = true"
                  @blur="commitFont"
                  @input="onFontInput"
                  @keydown.enter.prevent="commitFont"
                />
                <span class="field__unit">px</span>
              </div>
            </div>
            <input
              class="field__range"
              type="range"
              :min="fontMin"
              :max="fontMax"
              step="1"
              :value="prefs.fontSize"
              aria-label="代码字号"
              @input="prefs.setFontSize($event.target.value)"
            />
            <p class="field__hint">编辑区正文与代码文字大小（{{ fontMin }}–{{ fontMax }} px）</p>
          </section>

          <!-- Line width -->
          <section class="field">
            <div class="field__head">
              <label class="field__label" for="mira-line-width">文稿行宽</label>
              <div class="field__input-wrap">
                <input
                  id="mira-line-width"
                  class="field__number"
                  type="number"
                  :min="widthMin"
                  :max="widthMax"
                  step="20"
                  :value="widthDraft"
                  @focus="widthFocused = true"
                  @blur="commitWidth"
                  @input="onWidthInput"
                  @keydown.enter.prevent="commitWidth"
                />
                <span class="field__unit">px</span>
              </div>
            </div>
            <input
              class="field__range"
              type="range"
              :min="widthMin"
              :max="widthMax"
              step="20"
              :value="prefs.lineWidth"
              aria-label="文稿行宽"
              @input="prefs.setLineWidth($event.target.value)"
            />
            <p class="field__hint">正文栏最大宽度（{{ widthMin }}–{{ widthMax }} px）</p>
          </section>

          <!-- Auto save -->
          <section class="field field--row">
            <div>
              <label class="field__label" for="mira-autosave">自动保存</label>
              <p class="field__hint">停止输入后自动保存文稿，下次进入时恢复</p>
            </div>
            <button
              id="mira-autosave"
              role="switch"
              :aria-checked="prefs.autoSave"
              :disabled="!prefs.storageReady"
              :class="['switch', { 'switch--on': prefs.autoSave }]"
              @click="toggleAutoSave"
            >
              <span class="switch__knob" />
            </button>
          </section>
        </div>

        <footer class="settings__footer">
          <button class="btn btn--ghost" @click="onReset">恢复默认</button>
          <button class="btn btn--primary" @click="close">完成</button>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePrefsStore } from '@/stores/prefs'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'reset'])

const prefs = usePrefsStore()

const fontMin = computed(() => prefs.limits.fontSize.min)
const fontMax = computed(() => prefs.limits.fontSize.max)
const widthMin = computed(() => prefs.limits.lineWidth.min)
const widthMax = computed(() => prefs.limits.lineWidth.max)

const themes = [
  {
    id: 'light',
    name: '浅色',
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
  },
  {
    id: 'sepia',
    name: '护眼',
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  },
  {
    id: 'dark',
    name: '深色',
    icon: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
  }
]

// Local text drafts let the user type freely (even "" / "999"); the
// committed (clamped/safe) value is the single source of truth and the
// draft snaps back to it on blur or invalid entry, so the panel can
// never show a value that disagrees with the actual effect.
const fontDraft = ref(String(prefs.fontSize))
const fontFocused = ref(false)
const widthDraft = ref(String(prefs.lineWidth))
const widthFocused = ref(false)

function syncDrafts() {
  fontDraft.value = String(prefs.fontSize)
  widthDraft.value = String(prefs.lineWidth)
  fontFocused.value = false
  widthFocused.value = false
}

// Keep the numeric inputs truthful whenever the panel opens: the sliders
// are the shared controls, so a reopened panel must never show a stale value.
watch(() => props.modelValue, (open) => { if (open) syncDrafts() })

function onFontInput(e) {
  fontDraft.value = e.target.value
}

function commitFont() {
  fontFocused.value = false
  // Empty / non-numeric / out-of-range all resolve through the store
  // clamp to the nearest safe value (or default).
  prefs.setFontSize(fontDraft.value)
  fontDraft.value = String(prefs.fontSize)
}

function onWidthInput(e) {
  widthDraft.value = e.target.value
}

function commitWidth() {
  widthFocused.value = false
  prefs.setLineWidth(widthDraft.value)
  widthDraft.value = String(prefs.lineWidth)
}

function toggleAutoSave() {
  prefs.setAutoSave(!prefs.autoSave)
}

function onReset() {
  prefs.reset()
  syncDrafts()
  emit('reset')
}

function close() {
  // Commit whatever is still being edited before dismissing.
  if (fontFocused.value) commitFont()
  if (widthFocused.value) commitWidth()
  emit('update:modelValue', false)
}

defineExpose({ syncDrafts })
</script>

<style lang="scss" scoped>
.settings {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $sp-5;
  background: rgba(0, 0, 0, 0.32);
  backdrop-filter: blur(2px);

  &__panel {
    width: 100%;
    max-width: 420px;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    background: $bg-elevated;
    border: 1px solid $border-light;
    border-radius: $r-lg;
    box-shadow: $shadow-lg;
    color: $text;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $sp-4 $sp-5;
    border-bottom: 1px solid $border-light;
  }

  &__title {
    font-size: $fs-base;
    font-weight: 600;
    font-family: $font-ui;
    letter-spacing: -0.01em;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    background: transparent;
    border-radius: $r-md;
    color: $text-3;
    cursor: pointer;
    transition: all $t-fast $ease;

    &:hover { background: $accent-soft; color: $accent; }
  }

  &__warning {
    display: flex;
    align-items: center;
    gap: $sp-2;
    margin: $sp-4 $sp-5 0;
    padding: $sp-2 $sp-3;
    border-radius: $r-md;
    background: rgba(217, 119, 6, 0.1);
    color: $warning;
    font-size: $fs-xs;
    line-height: 1.5;
  }

  &__body {
    padding: $sp-4 $sp-5 $sp-2;
    display: flex;
    flex-direction: column;
    gap: $sp-5;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $sp-3 $sp-5 $sp-4;
    margin-top: $sp-2;
    border-top: 1px solid $border-light;
  }
}

.field {
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: $sp-2;
  }

  &__label {
    display: block;
    font-size: $fs-sm;
    font-weight: 600;
    color: $text;
    font-family: $font-ui;
  }

  &__hint {
    margin-top: $sp-1;
    font-size: $fs-xs;
    color: $text-3;
    line-height: 1.5;
  }

  &__input-wrap {
    display: flex;
    align-items: center;
    gap: 2px;
    border: 1px solid $border;
    border-radius: $r-md;
    padding: 0 $sp-2;
    background: $bg;
    transition: border-color $t-fast $ease;

    &:focus-within { border-color: $accent; }
  }

  &__number {
    width: 52px;
    height: 26px;
    border: none;
    background: transparent;
    color: $text;
    font-family: $font-mono;
    font-size: $fs-xs;
    text-align: right;
    outline: none;

    // Hide number spinners — the range slider is the stepper
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
  }

  &__unit {
    font-size: $fs-xs;
    color: $text-3;
    font-family: $font-mono;
  }

  &__range {
    width: 100%;
    height: 4px;
    appearance: none;
    -webkit-appearance: none;
    background: $border;
    border-radius: $r-full;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: $accent;
      border: 2.5px solid $bg-elevated;
      box-shadow: 0 0 0 1px var(--mira-accent, #2563eb);
      transition: transform $t-fast $ease;

      &:hover { transform: scale(1.15); }
      &:active { transform: scale(1.05); }
    }

    &::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: $accent;
      border: 2.5px solid $bg-elevated;
      box-shadow: 0 0 0 1px var(--mira-accent, #2563eb);
    }
  }

  &--row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $sp-4;
  }
}

.theme-group {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-1;
  margin-top: $sp-2;
  padding: 3px;
  background: $bg;
  border: 1px solid $border-light;
  border-radius: $r-md;
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  border: none;
  border-radius: $r-sm;
  background: transparent;
  color: $text-2;
  font-size: $fs-xs;
  font-family: $font-ui;
  cursor: pointer;
  transition: all $t-fast $ease;

  svg { display: block; }

  &:hover { color: $text; }

  &--active {
    background: $bg-elevated;
    color: $accent;
    font-weight: 600;
    box-shadow: $shadow-sm;
  }
}

.switch {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 20px;
  border-radius: $r-full;
  border: none;
  background: $border;
  cursor: pointer;
  transition: background-color $t-fast $ease;
  padding: 0;

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
    background: $accent;
    .switch__knob { transform: translateX(16px); }
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.btn {
  height: 32px;
  padding: 0 $sp-4;
  border-radius: $r-md;
  font-size: $fs-sm;
  font-family: $font-ui;
  font-weight: 500;
  cursor: pointer;
  transition: all $t-fast $ease;
  border: 1px solid transparent;

  &--ghost {
    background: transparent;
    border-color: $border;
    color: $text-2;

    &:hover { background: $accent-soft; color: $accent; border-color: transparent; }
  }

  &--primary {
    background: $accent;
    color: #fff;

    &:hover { filter: brightness(1.08); }
    &:active { transform: scale(0.97); }
  }
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity $t-normal $ease;

  .settings__panel {
    transition: transform $t-normal $ease, opacity $t-normal $ease;
  }
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;

  .settings__panel {
    transform: translateY(8px) scale(0.98);
    opacity: 0;
  }
}
</style>

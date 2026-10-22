<script setup lang="ts">
defineProps<{
  label: string
  disabled: boolean
  purchasing: boolean
  restoring: boolean
  restoreDisabled: boolean
  message: string
  failure: 'purchase' | 'restore' | null
}>()
const emit = defineEmits<{ buy: []; restore: [] }>()
</script>
<template>
  <section class="purchase-actions" aria-label="Покупка">
    <div
      v-if="message"
      class="feedback"
      :class="{ 'is-error': failure }"
      :role="failure ? 'alert' : 'status'"
    >
      {{ message }}
      <button v-if="failure === 'restore'" class="inline-retry" @click="emit('restore')">
        Повторить восстановление
      </button>
    </div>
    <button
      class="primary-button"
      :disabled="disabled"
      :aria-busy="purchasing"
      @click="emit('buy')"
    >
      <span v-if="purchasing" class="spinner" aria-hidden="true" />{{ label }}
    </button>
    <p class="test-note">Тестовая покупка. Деньги не спишутся.<br />Без автопродления.</p>
    <button
      class="restore-button"
      :disabled="restoreDisabled"
      :aria-busy="restoring"
      @click="emit('restore')"
    >
      <span v-if="restoring" class="spinner" aria-hidden="true" />{{
        restoring ? 'Восстанавливаем…' : 'Восстановить покупки'
      }}
    </button>
  </section>
</template>

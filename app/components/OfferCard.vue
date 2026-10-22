<script setup lang="ts">
import type { Offer } from '../../shared/types'
defineProps<{ offer: Offer; selected: boolean; disabled: boolean; price: string }>()
const emit = defineEmits<{ select: [id: Offer['id']] }>()
</script>
<template>
  <label
    class="offer-card"
    :class="{
      'is-selected': selected,
      'is-yearly': offer.period === 'year',
      'is-disabled': disabled,
    }"
  >
    <input
      type="radio"
      name="offer"
      :value="offer.id"
      :checked="selected"
      :disabled="disabled"
      @change="emit('select', offer.id)"
    />
    <span class="radio-mark" aria-hidden="true"
      ><svg v-if="selected" width="24" height="24" viewBox="0 0 24 24">
        <path
          d="m7 12 3 3 7-7"
          stroke="white"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        /></svg
    ></span>
    <span class="offer-description"
      ><strong>{{ offer.name }}</strong
      ><span>{{ offer.detail }}</span></span
    >
    <span class="offer-price"
      ><strong>{{ price }}</strong
      ><span>{{ offer.period === 'year' ? 'за год' : 'за месяц' }}</span></span
    >
  </label>
</template>

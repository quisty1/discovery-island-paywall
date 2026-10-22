<script setup lang="ts">
import type { Offer, Purchase } from '../../shared/types'
defineProps<{ receipt: Purchase; offer?: Offer; price?: string }>()
</script>
<template>
  <section class="success" role="status" aria-live="polite">
    <h1 tabindex="-1" autofocus>Всё готово!<br />Полный доступ открыт</h1>
    <p class="success-explanation">
      Все игры и новые миры уже доступны.<br />Пусть начнутся маленькие открытия!
    </p>
    <div class="receipt">
      <strong>Покупка сохранена</strong
      ><span
        >{{ offer?.name }}<template v-if="price"> · {{ price }}</template></span
      >
    </div>
    <div class="success-footer">
      <div class="success-status">Можно исследовать остров</div>
      <p class="test-note">Тестовая покупка. Деньги не списаны.</p>
    </div>
  </section>
</template>

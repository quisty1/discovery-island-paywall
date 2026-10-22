<script setup lang="ts">
const paywall = usePaywall()
const {
  data,
  status,
  offersError,
  refresh,
  selectedId,
  selected,
  pending,
  busy,
  failure,
  message,
  receipt,
  receiptOffer,
  price,
  select,
  buy,
  recover,
} = paywall
const buttonLabel = computed(() =>
  pending.value === 'purchase'
    ? 'Открываем остров…'
    : status.value !== 'success'
      ? 'Загружаем тарифы…'
      : `${failure.value === 'purchase' ? 'Повторить' : 'Открыть за'} ${failure.value === 'purchase' ? '· ' : ''}${price(selected.value?.amount ?? 0)}`,
)
</script>
<template>
  <main class="paywall" :class="{ 'has-success': receipt }">
    <header class="brand">
      <img src="/flower.svg" width="24" height="24" alt="" /><span class="brand-name"
        >ОСТРОВ ОТКРЫТИЙ</span
      ><span class="parent-badge">ДЛЯ РОДИТЕЛЕЙ</span>
    </header>
    <div class="island-art" aria-hidden="true">
      <img src="/island.svg" width="300" height="170" alt="" />
    </div>
    <PurchaseSuccess
      v-if="receipt"
      :receipt="receipt"
      :offer="receiptOffer"
      :price="receiptOffer ? price(receiptOffer.amount) : undefined"
    />
    <template v-else>
      <section class="intro" aria-labelledby="paywall-heading">
        <h1 id="paywall-heading">Откройте<br />весь остров</h1>
        <p>Игры, которые превращают любопытство<br />в маленькие открытия. Каждый день.</p>
      </section>
      <ul class="benefits" aria-label="Преимущества">
        <li v-for="benefit in ['Все игры', 'Без рекламы', 'Новые миры']" :key="benefit">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="8" fill="#E7EFE7" />
            <path
              d="m4.5 8 2.3 2.3 4.7-4.6"
              fill="none"
              stroke="#487865"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            /></svg
          >{{ benefit }}
        </li>
      </ul>
      <fieldset v-if="status === 'success' && data" class="offers" :disabled="busy">
        <legend class="sr-only">Выберите тариф</legend>
        <OfferCard
          v-for="offer in data.offers"
          :key="offer.id"
          :offer="offer"
          :selected="selectedId === offer.id"
          :disabled="busy"
          :price="price(offer.amount)"
          @select="select"
        />
      </fieldset>
      <div v-else-if="offersError" class="offers-load-error" role="alert">
        <strong>Не удалось загрузить тарифы</strong>
        <p>Проверьте соединение и попробуйте ещё раз.</p>
        <button class="secondary-button" @click="refresh()">Загрузить снова</button>
      </div>
      <div v-else class="offers-skeleton" role="status" aria-label="Загружаем тарифы">
        <div />
        <div />
      </div>
      <PurchaseActions
        :label="buttonLabel"
        :disabled="busy || status !== 'success' || !selected"
        :purchasing="pending === 'purchase'"
        :restoring="pending === 'restore'"
        :restore-disabled="busy || status !== 'success'"
        :message="message"
        :failure="failure"
        @buy="buy"
        @restore="recover"
      />
    </template>
  </main>
</template>

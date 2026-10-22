import type { Offer, Purchase, RestoreResult } from '../../shared/types'

export function usePaywall() {
  const {
    data,
    status,
    error: offersError,
    refresh,
  } = useFetch<{ offers: Offer[] }>('/api/offers', { server: false })
  const selectedId = ref<Offer['id']>('yearly')
  const selected = computed(() => data.value?.offers.find((x) => x.id === selectedId.value))
  const pending = ref<'purchase' | 'restore' | null>(null)
  const failure = ref<'purchase' | 'restore' | null>(null)
  const message = ref('')
  const receipt = ref<Purchase | null>(null)
  const request = shallowRef<{ offerId: Offer['id']; requestId: string } | null>(null)
  const busy = computed(() => pending.value !== null)
  const price = (amount: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
      .format(amount / 100)
      .replaceAll('\u00a0', ' ') + ' ₽'
  const receiptOffer = computed(() =>
    data.value?.offers.find((x) => x.id === receipt.value?.offerId),
  )

  function select(id: Offer['id']) {
    if (busy.value) return
    selectedId.value = id
    failure.value = null
    message.value = ''
  }
  async function buy() {
    if (busy.value || !selected.value || status.value !== 'success') return
    // Retain the key for retry after a lost response; reset only when changing offer or after success.
    if (!request.value || request.value.offerId !== selectedId.value) {
      request.value = { offerId: selectedId.value, requestId: crypto.randomUUID() }
    }
    pending.value = 'purchase'
    failure.value = null
    message.value = ''
    try {
      receipt.value = await $fetch<Purchase>('/api/purchase', {
        method: 'POST',
        body: request.value,
        retry: 0,
      })
      request.value = null
    } catch {
      failure.value = 'purchase'
      message.value = 'Не удалось сохранить покупку. Проверьте соединение и повторите.'
    } finally {
      pending.value = null
    }
  }
  async function recover() {
    if (busy.value || status.value !== 'success') return
    pending.value = 'restore'
    failure.value = null
    message.value = ''
    try {
      const result = await $fetch<RestoreResult>('/api/restore', { method: 'POST', retry: 0 })
      if (result.purchase) receipt.value = result.purchase
      else message.value = 'Покупок пока нет. Выберите тариф, чтобы открыть остров.'
    } catch {
      failure.value = 'restore'
      message.value = 'Не удалось восстановить покупки. Проверьте соединение и повторите.'
    } finally {
      pending.value = null
    }
  }
  return {
    data,
    status,
    offersError,
    refresh,
    selectedId,
    selected,
    select,
    pending,
    busy,
    failure,
    message,
    receipt,
    receiptOffer,
    price,
    buy,
    recover,
  }
}

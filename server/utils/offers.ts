import type { Offer } from '../../shared/types'
export const offers: readonly Offer[] = [
  {
    id: 'yearly',
    name: '12 месяцев',
    amount: 239000,
    currency: 'RUB',
    period: 'year',
    detail: '≈ 199 ₽ в месяц',
  },
  {
    id: 'monthly',
    name: '1 месяц',
    amount: 39900,
    currency: 'RUB',
    period: 'month',
    detail: 'Знакомство с островом',
  },
]

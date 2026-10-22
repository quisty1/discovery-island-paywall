export interface Offer {
  id: 'monthly' | 'yearly'
  name: string
  amount: number
  currency: 'RUB'
  period: 'month' | 'year'
  detail: string
}
export interface Purchase {
  id: string
  offerId: Offer['id']
  createdAt: string
}
export interface RestoreResult {
  purchase: Purchase | null
}

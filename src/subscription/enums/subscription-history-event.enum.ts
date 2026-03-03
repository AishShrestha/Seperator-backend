/** Events that trigger a subscription history record */
export enum SubscriptionHistoryEvent {
  CREATED = 'created',
  PLAN_CHANGED = 'plan_changed',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  RECOVERED = 'recovered',
  RENEWED = 'renewed',
}

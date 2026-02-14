import { PaymentMethod } from '../enums/payment-method.enum';

export interface SettlementListItem {
  settlement_id: string;
  group_id: string;
  payer_id: string;
  payer_name: string;
  payer_avatar: string;
  payee_id: string;
  payee_name: string;
  payee_avatar: string;
  amount: number;
  settled_at: string | null;
  payment_method: PaymentMethod | null;
  notes: string | null;
  status: 'Settled';
}

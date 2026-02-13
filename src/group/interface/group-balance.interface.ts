export interface BalanceOweItem {
  user_id: string;
  user_name: string;
  amount: number;
}

export interface GroupBalanceForUser {
  /** Total balance in group: positive = others owe you; negative = you owe others */
  balance: number;
  /** People you owe and how much */
  you_owe: BalanceOweItem[];
  /** People who owe you and how much */
  owes_you: BalanceOweItem[];
}

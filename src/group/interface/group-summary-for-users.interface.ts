export interface GroupSummaryForUser {
    group_name: string;
    invitation_code: string;
    total_members: number;
    total_number_of_expenses: number;
    /** Positive = user should get back; negative = user owes */
    balance: number;
  }
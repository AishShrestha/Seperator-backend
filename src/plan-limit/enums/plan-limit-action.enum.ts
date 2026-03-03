/**
 * Actions that can be blocked by plan limits.
 * Used by PlanLimitGuard to determine which limit to validate.
 */
export enum PlanLimitAction {
  CREATE_EXPENSE = 'create_expense',
  CREATE_GROUP = 'create_group',
  ADD_GROUP_MEMBER = 'add_group_member',
}

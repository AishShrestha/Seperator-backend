# Plan Limit Enforcement - Implementation Summary

## 1. Architectural Decisions

### Hybrid Enforcement (Guard + Service)
- **Guard Layer**: `PlanLimitGuard` blocks HTTP requests before they reach the controller. Uses `@PlanLimit(action)` decorator for metadata. Delegates all validation to `PlanLimitService`—no business logic in the guard.
- **Service Layer**: `PlanLimitService` is called from `ExpenseService` and `GroupService` before mutations. This ensures limits are enforced even when:
  - Internal service-to-service calls bypass the guard
  - Background jobs or cron tasks create expenses/groups
  - Future microservices call these services directly

### Single Source of Truth
- Plan limits come from `getPlanConfigs()` in `src/config/plan-config.ts`. No hardcoded limits in services or guards.
- Users without an active subscription default to the `free` plan.

### Structured Error Response
- `PlanLimitException` extends `HttpException` with a payload: `code`, `upgrade_required`, `current_plan`, `message`.
- `HttpExceptionFilter` passes these fields through to the client for upgrade prompts.

---

## 2. File Structure Changes

```
src/
├── plan-limit/                          # NEW MODULE
│   ├── plan-limit.module.ts
│   ├── plan-limit.service.ts
│   ├── plan-limit.service.spec.ts
│   ├── plan-limit.exception.ts
│   ├── enums/
│   │   └── plan-limit-action.enum.ts
│   ├── decorators/
│   │   └── plan-limit.decorator.ts
│   └── guards/
│       └── plan-limit.guard.ts
├── common/
│   ├── dto/error-response.dto.ts        # MODIFIED (added plan limit fields)
│   └── filters/http-exception.filter.ts # MODIFIED (pass through plan limit payload)
├── expense/
│   ├── expense.module.ts                # MODIFIED (import PlanLimitModule)
│   ├── expense.controller.ts           # MODIFIED (guard + decorator)
│   └── expense.service.ts               # MODIFIED (service validation + history_days)
├── group/
│   ├── group.module.ts                  # MODIFIED (import PlanLimitModule)
│   ├── group.controller.ts              # MODIFIED (guard + decorator)
│   └── group.service.ts                 # MODIFIED (service validation)
```

---

## 3. New Files Created

| File | Purpose |
|------|---------|
| `plan-limit/plan-limit.module.ts` | Module wiring; exports `PlanLimitService` and `PlanLimitGuard` |
| `plan-limit/plan-limit.service.ts` | Business logic for limit validation |
| `plan-limit/plan-limit.exception.ts` | Structured error with `code`, `upgrade_required`, `current_plan` |
| `plan-limit/enums/plan-limit-action.enum.ts` | `CREATE_EXPENSE`, `CREATE_GROUP`, `ADD_GROUP_MEMBER` |
| `plan-limit/decorators/plan-limit.decorator.ts` | `@PlanLimit(action)` metadata |
| `plan-limit/guards/plan-limit.guard.ts` | Guard that reads metadata and delegates to service |
| `plan-limit/plan-limit.service.spec.ts` | Unit tests for `PlanLimitService` |

---

## 4. Modified Files

| File | Changes |
|------|---------|
| `expense/expense.module.ts` | Import `PlanLimitModule` |
| `expense/expense.controller.ts` | Add `@UseGuards(PlanLimitGuard)`, `@PlanLimit(CREATE_EXPENSE)` on POST |
| `expense/expense.service.ts` | Inject `PlanLimitService`; call `assertWithinLimits` before create; apply `history_days` in `getExpensesByGroupId` |
| `group/group.module.ts` | Import `PlanLimitModule` |
| `group/group.controller.ts` | Add guard + decorator on `createGroup` and `joinGroup` |
| `group/group.service.ts` | Inject `PlanLimitService`; call `assertWithinLimits` before create and join |
| `common/dto/error-response.dto.ts` | Add optional `code`, `upgrade_required`, `current_plan` |
| `common/filters/http-exception.filter.ts` | Include plan limit fields when `code === 'PLAN_LIMIT_REACHED'` |
| `expense/expense.controller.spec.ts` | Mock `PlanLimitGuard` and `ExpenseService` |
| `expense/expense.service.spec.ts` | Mock `PlanLimitService` |
| `group/group.controller.spec.ts` | Mock `PlanLimitGuard` and `GroupService` |
| `group/group.service.spec.ts` | Mock `PlanLimitService` |

---

## 5. Why This Approach Is Scalable

1. **Config-driven**: New plans or limit changes only require updating `plan-config.ts`.
2. **SOLID**: Guard is thin; service holds business logic; decorator provides metadata.
3. **Testable**: `PlanLimitService` is unit-tested; guards and services can be mocked.

---

## 6. Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| User not authenticated | Guard returns `ForbiddenException`; user not extracted |
| No active subscription | User treated as `free` plan |
| Invalid invite code | Guard skips group lookup; group not found handled downstream |
| Plan config missing for slug | `config` is undefined; limits treated as unlimited (null checks) |
| Rolling 24h expense window | `created_at >= (now - 24h)` in `assertExpenseLimit` |
| `history_days` for paid plans | Returns `null`; no date filter applied |

---

## 7. Future Improvements

1. **Caching**: Cache `getCurrentSubscription` per user (e.g. Redis TTL 60s) to reduce DB load.
2. **Feature flags**: Add toggles for plan limits (e.g. disable during beta).
3. **Metrics**: Emit `plan_limit_reached` events for analytics.
4. **Rate limiting**: Consider per-user rate limits for abuse prevention.
5. **Admin override**: Allow admins to bypass limits for support.

---

## 8. Example Error Response

When a limit is reached:

```json
{
  "statusCode": 403,
  "message": "Free plan allows only 5 expenses per 24 hours",
  "timestamp": "2025-03-03T12:00:00.000Z",
  "code": "PLAN_LIMIT_REACHED",
  "upgrade_required": true,
  "current_plan": "free"
}
```

# Stripe Subscription Setup

Config-first plan sync: **Config → Database → Stripe**

## Environment Variables

Add to your `.env` (or `.env.dev`):

```env
# Stripe (required for sync/plans)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_CURRENCY=usd
STRIPE_WEBHOOK_SECRET=whsec_...

# Admin (for POST /api/sync/plans)
ADMIN_EMAIL=admin@example.com
ADMIN_NAME=Admin
ADMIN_PASSWORD=your-secure-password
# Then run: yarn seed:admin
```

## Commands

```bash
# Run migrations (creates plans table)
yarn migrations:up

# Seed plans from config (no Stripe calls)
yarn seed:plans

# Sync plans to Stripe (admin only, requires auth)
# POST /api/sync/plans
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/plan | Public | List all plans |
| POST | /api/sync/plans | JWT + Admin | Sync config → DB → Stripe |
| POST | /api/subscription | JWT | Create subscription |
| GET | /api/subscription/current | JWT | Get current subscription |
| PATCH | /api/subscription/plan | JWT | Upgrade/downgrade plan |
| PATCH | /api/subscription/cancel | JWT | Cancel subscription |

## Sync Flow

1. **Config** (`src/config/plan-config.ts`) – source of truth
2. **DB** – plans table stores metadata + Stripe IDs
3. **Stripe** – products and recurring prices for **all plans** (including free)

All plans are synced for consistent upgrade/downgrade handling and analytics.

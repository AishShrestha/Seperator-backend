import { getConfig } from '../services/app-config/configuration';

/** Plan configuration structure - config is the source of truth */
export interface PlanConfiguration {
  features: string[];
  limits: {
    max_expenses_per_day?: number | null;
    max_groups?: number | null;
    max_members_per_group?: number | null;
    history_days?: number | null;
  };
  billing: {
    price: number;
    currency: string;
    billing_cycle: 'monthly' | 'yearly' | null;
    trial_days?: number;
    is_trial_enabled?: boolean;
    is_free?: boolean;
  };
}

export interface PlanConfigItem {
  id: number;
  name: string;
  slug: string;
  description: string;
  stripe_plan_id: string | null;
  stripe_price_id: string | null;
  configuration: PlanConfiguration;
}

/** Returns plan configs with currency from Stripe config */
export function getPlanConfigs(): PlanConfigItem[] {
  const { stripe } = getConfig();
  const currency = stripe?.currency ?? 'usd';

  return [
    {
      id: 1,
      name: 'Free',
      slug: 'free',
      description: 'Basic expense tracking with limited features',
      stripe_plan_id: null,
      stripe_price_id: null,
      configuration: {
        features: [
          '5 expenses per day (rolling 24-hour window)',
          'Max 3 groups',
          'Max 8 members per group',
          'Equal + simple unequal splits only',
          'Basic balance',
          'History limited to last 30 days',
        ],
        limits: {
          max_expenses_per_day: 5,
          max_groups: 3,
          max_members_per_group: 8,
          history_days: 30,
        },
        billing: {
          price: 0,
          currency,
          billing_cycle: 'monthly', // $0/month for Stripe; no charge, enables upgrade tracking
          is_free: true,
        },
      },
    },
    {
      id: 2,
      name: 'Pro Monthly',
      slug: 'pro-monthly',
      description: 'Full-featured expense tracking with advanced splitting and analytics',
      stripe_plan_id: null,
      stripe_price_id: null,
      configuration: {
        features: [
          'Unlimited expenses',
          'Unlimited groups',
          'Unlimited members',
          'Advanced splitting: percentage, shares, custom amounts',
          'Recurring expenses + auto-add',
          'Receipt photo upload',
          'OCR scanning + itemization',
          'Full analytics & charts',
          'Export: CSV, PDF, Excel',
          'Multi-currency auto conversion',
        ],
        limits: {
          max_expenses_per_day: null,
          max_groups: null,
          max_members_per_group: null,
          history_days: null,
        },
        billing: {
          price: 999, // $9.99 in cents
          currency,
          billing_cycle: 'monthly',
          trial_days: 14,
          is_trial_enabled: true,
          is_free: false,
        },
      },
    },
    {
      id: 3,
      name: 'Pro Yearly',
      slug: 'pro-yearly',
      description: 'Full-featured expense tracking - annual billing (2 months free)',
      stripe_plan_id: null,
      stripe_price_id: null,
      configuration: {
        features: [
          'Unlimited expenses',
          'Unlimited groups',
          'Unlimited members',
          'Advanced splitting: percentage, shares, custom amounts',
          'Recurring expenses + auto-add',
          'Receipt photo upload',
          'OCR scanning + itemization',
          'Full analytics & charts',
          'Export: CSV, PDF, Excel',
          'Multi-currency auto conversion',
        ],
        limits: {
          max_expenses_per_day: null,
          max_groups: null,
          max_members_per_group: null,
          history_days: null,
        },
        billing: {
          price: 9990, // $99.90 in cents (~2 months free)
          currency,
          billing_cycle: 'yearly',
          trial_days: 14,
          is_trial_enabled: true,
          is_free: false,
        },
      },
    },
    {
      id: 4,
      name: 'Premium Monthly',
      slug: 'premium-monthly',
      description: 'Pro features plus AI-powered expense entry and in-app assistant',
      stripe_plan_id: null,
      stripe_price_id: null,
      configuration: {
        features: [
          'Everything in Pro',
          'Natural language expense entry',
          'AI parsing: "Paid ₹2500 for Goa trip food with 4 people yesterday"',
          'In-app AI assistant: "Show me what Amit owes me", "Set budget alert"',
        ],
        limits: {
          max_expenses_per_day: null,
          max_groups: null,
          max_members_per_group: null,
          history_days: null,
        },
        billing: {
          price: 1999, // $19.99 in cents
          currency,
          billing_cycle: 'monthly',
          trial_days: 14,
          is_trial_enabled: true,
          is_free: false,
        },
      },
    },
    {
      id: 5,
      name: 'Premium Yearly',
      slug: 'premium-yearly',
      description: 'Pro features plus AI - annual billing (2 months free)',
      stripe_plan_id: null,
      stripe_price_id: null,
      configuration: {
        features: [
          'Everything in Pro',
          'Natural language expense entry',
          'AI parsing: "Paid ₹2500 for Goa trip food with 4 people yesterday"',
          'In-app AI assistant: "Show me what Amit owes me", "Set budget alert"',
        ],
        limits: {
          max_expenses_per_day: null,
          max_groups: null,
          max_members_per_group: null,
          history_days: null,
        },
        billing: {
          price: 19990, // $199.90 in cents (~2 months free)
          currency,
          billing_cycle: 'yearly',
          trial_days: 14,
          is_trial_enabled: true,
          is_free: false,
        },
      },
    },
  ];
}

# SaaS Boilerplate

Stack : Next.js 14 (App Router) + Supabase (auth + DB) + Stripe (billing).

## Setup

1. `cp .env.example .env.local` et remplis les clés Supabase + Stripe.
2. Dans Supabase SQL editor, exécute `supabase/schema.sql`.
3. Crée un produit récurrent dans Stripe, copie son `price_id` dans `STRIPE_PRICE_ID`.
4. Configure un webhook Stripe vers `/api/stripe/webhook` (événements `customer.subscription.*`), copie le secret dans `STRIPE_WEBHOOK_SECRET`.
5. `npm install && npm run dev`

## Structure

- `app/` — pages (landing, login, signup, dashboard protégé, billing)
- `app/api/stripe/` — checkout, portail client, webhook
- `lib/supabase/` — clients browser/server
- `middleware.ts` — protège `/dashboard` et `/settings`
- `supabase/schema.sql` — table `profiles` + RLS + trigger auto-création

## Ajouter une fonctionnalité produit

Ajoute tes routes/pages dans `app/`. Le statut d'abonnement de l'utilisateur est dans `profiles.subscription_status` (`active`, `canceled`, `none`, etc.) — checke-le pour gater tes fonctionnalités payantes.

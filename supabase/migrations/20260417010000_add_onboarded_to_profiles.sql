-- Add `onboarded` flag to profiles for first-access wizard gating.
-- When FALSE, the dashboard renders the OnboardingWizard instead of the app.
-- Flipped to TRUE atomically when the wizard completes and the user's
-- onboarding data is persisted into profiles.preferences.onboarding.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarded BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.onboarded IS
  'True once the user has completed the OnboardingWizard. Controls first-access gating in the dashboard layout.';

-- Existing rows keep DEFAULT FALSE — they are test users that should re-see
-- the wizard the next time they open the app. If you need to bypass for
-- seed/fixture accounts, UPDATE them explicitly post-migration.

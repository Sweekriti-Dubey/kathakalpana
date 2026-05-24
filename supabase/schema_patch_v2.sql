-- ============================================================
-- Katha Kalpana — Schema Migration for Onboarding
-- ============================================================
-- Only adds the MISSING columns to your existing tables.
-- Safe to re-run (uses IF NOT EXISTS checks).
-- ============================================================

-- ┌─────────────────────────────────────┐
-- │  1. Add age_range to kid_profiles   │
-- └─────────────────────────────────────┘
-- Needed for age-appropriate story prompts during onboarding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'kid_profiles'
      AND column_name = 'age_range'
  ) THEN
    ALTER TABLE public.kid_profiles
      ADD COLUMN age_range TEXT CHECK (age_range IN ('3-5', '6-8', '9-12'));
    RAISE NOTICE 'Added age_range column to kid_profiles';
  ELSE
    RAISE NOTICE 'age_range column already exists in kid_profiles';
  END IF;
END $$;

-- ============================================================
-- DONE! Only the age_range column was needed.
-- All other tables already have the correct structure.
-- ============================================================

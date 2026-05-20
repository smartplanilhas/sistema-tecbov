ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_position_check,
  ADD COLUMN IF NOT EXISTS referral_source       text,
  ADD COLUMN IF NOT EXISTS animal_count_range    text,
  ADD COLUMN IF NOT EXISTS current_control       text,
  ADD COLUMN IF NOT EXISTS activities            text[],
  ADD COLUMN IF NOT EXISTS objectives            text[],
  ADD COLUMN IF NOT EXISTS onboarding_start_path text;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_position_check
    CHECK (position IN (
      'proprietario','funcionario','gestor',
      'tecnico_consultor','contador','estudante','outro'
    ));

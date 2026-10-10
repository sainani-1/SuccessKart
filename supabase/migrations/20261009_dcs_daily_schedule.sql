-- One admin-defined schedule creates a new Daily Coding Streak contest every day.
CREATE TABLE IF NOT EXISTS public.dcs_recurring_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_key TEXT NOT NULL UNIQUE DEFAULT 'default',
  title TEXT NOT NULL DEFAULT 'Daily Coding Challenge',
  start_time TIME NOT NULL DEFAULT '10:00',
  end_time TIME NOT NULL DEFAULT '23:59',
  auto_mode BOOLEAN NOT NULL DEFAULT true,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dcs_recurring_schedules ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY dcs_recurring_admin_all ON public.dcs_recurring_schedules
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS policies for Daily Coding Streak and related student features.

ALTER TABLE public.dcs_contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcs_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcs_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dcs_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plagiarism_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_test_summaries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY dcs_contests_admin_all ON public.dcs_contests
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_contests_student_read ON public.dcs_contests
    FOR SELECT TO authenticated
    USING (status IN ('ready', 'live', 'ended'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_questions_admin_all ON public.dcs_questions
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_questions_student_read ON public.dcs_questions
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.dcs_contests c
      WHERE c.id = contest_id AND c.status IN ('ready', 'live', 'ended')
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_attempts_owner ON public.dcs_attempts
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_attempts_admin_read ON public.dcs_attempts
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_streaks_owner ON public.dcs_streaks
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_streaks_admin_read ON public.dcs_streaks
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY coding_accounts_owner ON public.coding_accounts
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY plagiarism_student_create ON public.plagiarism_reports
    FOR INSERT TO authenticated
    WITH CHECK (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY plagiarism_student_read ON public.plagiarism_reports
    FOR SELECT TO authenticated
    USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY plagiarism_teacher_read ON public.plagiarism_reports
    FOR SELECT TO authenticated
    USING (teacher_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY plagiarism_admin_all ON public.plagiarism_reports
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ai_summaries_owner ON public.ai_test_summaries
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY ai_summaries_admin_all ON public.ai_test_summaries
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

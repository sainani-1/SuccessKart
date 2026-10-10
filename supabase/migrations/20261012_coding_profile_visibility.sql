-- Visibility for coding-profile links and teacher actions on plagiarism reports.
--
-- Run this file ONCE in the Supabase SQL editor. Everything is wrapped in a
-- single transaction so the policy changes commit together — running it while
-- another copy of it (or a long query) is active can deadlock, just re-run.
--
-- 1. Admins can read every student's coding platform links.
-- 2. Teachers / instructors can read the coding links of their assigned students.
--    (coding_accounts_owner already lets each user manage their own rows.)
-- 3-5. Teachers/admins can manage plagiarism reports and reset streaks.
-- 6. Signed-in users can read the enabled daily schedule (contest start time)
--    so the student countdown shows the admin-set time.
BEGIN;

DO $$
BEGIN
  CREATE POLICY coding_accounts_admin_read ON public.coding_accounts
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY coding_accounts_assigned_teacher_read ON public.coding_accounts
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles t
         WHERE t.id = auth.uid() AND t.role IN ('teacher', 'instructor')
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles s
         WHERE s.id = coding_accounts.user_id
           AND s.assigned_teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Teachers can update the status (open / reviewing / cleared) of the
--    plagiarism reports assigned to them. plagiarism_teacher_read already
--    limits which rows they can see.
DO $$
BEGIN
  CREATE POLICY plagiarism_teacher_update ON public.plagiarism_reports
    FOR UPDATE TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Teachers can raise plagiarism reports on their assigned students (used by
--    the "Flag Plagiarism" action on Track DCS, which also breaks the streak).
DO $$
BEGIN
  CREATE POLICY plagiarism_teacher_create ON public.plagiarism_reports
    FOR INSERT TO authenticated
    WITH CHECK (
      teacher_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles s
         WHERE s.id = plagiarism_reports.student_id
           AND s.assigned_teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Teachers can reset (break) the streaks of their assigned students — used
--    when plagiarism is confirmed. Longest streak stays untouched by convention
--    of the application code.
DO $$
BEGIN
  CREATE POLICY dcs_streaks_assigned_teacher_update ON public.dcs_streaks
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles t
         WHERE t.id = auth.uid() AND t.role IN ('teacher', 'instructor')
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles s
         WHERE s.id = dcs_streaks.user_id
           AND s.assigned_teacher_id = auth.uid()
      )
    )
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admins keep full control of streaks from the Track DCS page too.
DO $$
BEGIN
  CREATE POLICY dcs_streaks_admin_update ON public.dcs_streaks
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
    WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. Everyone signed in can read the enabled daily schedule (only contains the
--    daily contest title + start/end clock time, nothing sensitive). The
--    Daily Coding Streak countdown uses it so students always see the exact
--    time the admin configured.
DO $$
BEGIN
  CREATE POLICY dcs_recurring_authenticated_read ON public.dcs_recurring_schedules
    FOR SELECT TO authenticated
    USING (enabled = true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

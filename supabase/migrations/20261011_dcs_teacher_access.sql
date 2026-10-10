-- Daily Coding Streak: LeetCode-style question metadata, per-question stats and
-- assigned-teacher access to student scores and submitted code.

ALTER TABLE public.dcs_questions
  ADD COLUMN IF NOT EXISTS topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hints JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS companies JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.dcs_questions.topics IS 'Topic tags shown on the question page, e.g. ["Array","Hash Table"].';
COMMENT ON COLUMN public.dcs_questions.hints IS 'Progressive hints revealed with the Hint 1 / Hint 2 controls.';
COMMENT ON COLUMN public.dcs_questions.examples IS 'Array of {input, output, explanation} example blocks.';
COMMENT ON COLUMN public.dcs_questions.companies IS 'Company tags shown on the question page.';

-- Per-question attempt/acceptance counts for the "Accepted / Acceptance Rate" row.
-- SECURITY DEFINER so students can read the aggregate without being able to read
-- other students' dcs_attempts rows.
CREATE OR REPLACE FUNCTION public.dcs_question_stats(p_contest_id UUID)
RETURNS TABLE (question_id UUID, attempts BIGINT, accepted BIGINT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT q.id AS question_id,
         (SELECT COUNT(*) FROM public.dcs_attempts a WHERE a.contest_id = p_contest_id) AS attempts,
         (SELECT COUNT(*)
            FROM public.dcs_attempts a
           WHERE a.contest_id = p_contest_id
             AND EXISTS (
               SELECT 1
                 FROM jsonb_array_elements(a.test_results) AS t
                WHERE t->>'questionId' = q.id::text
                  AND lower(coalesce(t->>'accepted', 'false')) = 'true'
             )) AS accepted
    FROM public.dcs_questions q
   WHERE q.contest_id = p_contest_id;
$$;

REVOKE ALL ON FUNCTION public.dcs_question_stats(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.dcs_question_stats(UUID) TO authenticated;

-- Assigned teachers (and instructors) may read the attempts of the students they
-- are assigned to, so they can see score and submitted code. Admins already have
-- dcs_attempts_admin_read.
DO $$
BEGIN
  CREATE POLICY dcs_attempts_assigned_teacher_read ON public.dcs_attempts
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles t
         WHERE t.id = auth.uid() AND t.role IN ('teacher', 'instructor')
      )
      AND EXISTS (
        SELECT 1 FROM public.profiles s
         WHERE s.id = dcs_attempts.user_id
           AND s.assigned_teacher_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY dcs_streaks_assigned_teacher_read ON public.dcs_streaks
    FOR SELECT TO authenticated
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
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

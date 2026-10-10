-- DCS coding-judge data: six visible tests and thirty-five hidden tests per question.
ALTER TABLE public.dcs_questions
  ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS starter_code JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS input_format TEXT,
  ADD COLUMN IF NOT EXISTS output_format TEXT;

ALTER TABLE public.dcs_attempts
  ADD COLUMN IF NOT EXISTS language TEXT,
  ADD COLUMN IF NOT EXISTS submission_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS passed_questions INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plagiarism_status TEXT NOT NULL DEFAULT 'not_checked';

COMMENT ON COLUMN public.dcs_questions.test_cases IS 'Array of {input, output, hidden}; exactly 6 visible and 35 hidden tests for generated DCS questions.';
COMMENT ON COLUMN public.dcs_attempts.test_results IS 'Per-question judge summaries; hidden test input/output is never returned to students.';

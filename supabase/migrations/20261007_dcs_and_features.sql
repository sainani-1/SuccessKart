-- Daily Coding Streak (DCS) Contests
CREATE TABLE IF NOT EXISTS dcs_contests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_date DATE NOT NULL,
  title TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  generation_deadline_at TIMESTAMPTZ,
  auto_mode BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'scheduled',
  generation_status TEXT,
  generation_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dcs_contests_date ON dcs_contests(contest_date);

CREATE TABLE IF NOT EXISTS dcs_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES dcs_contests(id) ON DELETE CASCADE,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  position INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  sample_input TEXT,
  sample_output TEXT,
  expected_answer TEXT,
  constraints TEXT,
  source TEXT NOT NULL DEFAULT 'ai',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dcs_questions_contest ON dcs_questions(contest_id, difficulty, position);

CREATE TABLE IF NOT EXISTS dcs_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID REFERENCES dcs_contests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dcs_attempts_contest_user ON dcs_attempts(contest_id, user_id);

CREATE TABLE IF NOT EXISTS dcs_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  badges JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coding Platform Accounts (student)
CREATE TABLE IF NOT EXISTS coding_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  handle TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_coding_accounts_user_platform ON coding_accounts(user_id, platform);

-- Plagiarism Reports
CREATE TABLE IF NOT EXISTS plagiarism_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspect_name TEXT,
  suspect_email TEXT,
  exam_title TEXT,
  question_text TEXT,
  reason TEXT,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_teacher ON plagiarism_reports(teacher_id, status);
CREATE INDEX IF NOT EXISTS idx_plagiarism_reports_student ON plagiarism_reports(student_id, status);

-- AI Test Mistake Summaries
CREATE TABLE IF NOT EXISTS ai_test_summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id TEXT,
  test_title TEXT,
  score_percent INTEGER,
  summary TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_test_summaries_user ON ai_test_summaries(user_id, created_at DESC);

-- Settings seeds
INSERT INTO settings (key, value)
VALUES
  ('about_team', '[]'),
  ('ai_summary_enabled_users', '[]'),
  ('plagiarism_enabled_teachers', '[]')
ON CONFLICT (key) DO NOTHING;

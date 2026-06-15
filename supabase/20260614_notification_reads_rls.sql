-- Ensure notification_reads table exists with proper schema and RLS policies.
-- The table may have been created manually in the Supabase dashboard without RLS policies,
-- which prevents regular users from reading/writing their own read receipts.

CREATE TABLE IF NOT EXISTS notification_reads (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    notification_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(notification_id, user_id)
);

ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view their own notification read receipts" ON notification_reads;
DROP POLICY IF EXISTS "Users can insert their own notification read receipts" ON notification_reads;
DROP POLICY IF EXISTS "Users can update their own notification read receipts" ON notification_reads;

-- Allow users to SELECT their own read receipts
CREATE POLICY "Users can view their own notification read receipts"
ON notification_reads FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to INSERT their own read receipts (covers UPSERT initial insert)
CREATE POLICY "Users can insert their own notification read receipts"
ON notification_reads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own read receipts (covers UPSERT on conflict)
CREATE POLICY "Users can update their own notification read receipts"
ON notification_reads FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

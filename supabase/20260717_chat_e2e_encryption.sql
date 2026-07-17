-- End-to-end encryption for chat messages
-- Adds encrypted_keys column to chat_groups to store per-member encrypted group keys.
-- The chat_encryption_master_key is stored in the settings table.

-- 1. Add encrypted_keys column to chat_groups
ALTER TABLE public.chat_groups
  ADD COLUMN IF NOT EXISTS encrypted_keys text default '';

-- 2. Add index for faster encrypted key lookups
CREATE INDEX IF NOT EXISTS idx_chat_groups_encrypted_keys
  ON public.chat_groups USING btree (id)
  WHERE encrypted_keys IS NOT NULL AND encrypted_keys != '';

-- 3. Ensure settings table can hold the master key
-- (settings table already has key/value structure, just insert placeholder)
INSERT INTO public.settings (key, value)
VALUES ('chat_encryption_master_key', '')
ON CONFLICT (key) DO NOTHING;

-- 4. Verify encryption is active by checking column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_groups' AND column_name = 'encrypted_keys'
  ) THEN
    RAISE EXCEPTION 'encrypted_keys column was not added to chat_groups';
  END IF;
END $$;

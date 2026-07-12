CREATE TABLE IF NOT EXISTS public.face_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  encoding jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own face" ON public.face_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own face" ON public.face_embeddings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can read own face" ON public.face_embeddings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all faces" ON public.face_embeddings
  USING (true) WITH CHECK (true);

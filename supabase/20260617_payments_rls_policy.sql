-- Allow users to insert their own payment records (needed for manual add-on payments)
create policy "Users can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- Allow users to select their own payment records
create policy "Users can select own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Allow admins to update any payment (needed for admin panel approve/reject)
create policy "Admins can update any payment"
  on public.payments for update
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

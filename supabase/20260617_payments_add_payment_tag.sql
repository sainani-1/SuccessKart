-- Add payment_tag column to payments table for add-on and UPI payment tagging
alter table public.payments
add column if not exists payment_tag text;

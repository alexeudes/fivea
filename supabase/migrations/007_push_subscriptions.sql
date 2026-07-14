-- =====================================================================
-- 007 — Assinaturas de web push (uma por dispositivo/navegador).
-- Leitura pra envio é feita com service_role no server; o usuário só
-- gerencia as próprias. Grants vêm dos default privileges da 003.
-- =====================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_usuario on public.push_subscriptions (usuario_id);

alter table public.push_subscriptions enable row level security;

create policy "push_select_proprias" on public.push_subscriptions
  for select to authenticated using (usuario_id = auth.uid());

create policy "push_insert_proprias" on public.push_subscriptions
  for insert to authenticated with check (usuario_id = auth.uid());

create policy "push_update_proprias" on public.push_subscriptions
  for update to authenticated using (usuario_id = auth.uid());

create policy "push_delete_proprias" on public.push_subscriptions
  for delete to authenticated using (usuario_id = auth.uid());

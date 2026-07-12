-- =====================================================================
-- NOTIFICAÇÕES (in-app)
-- =====================================================================
-- Registro simples por usuário. Push real (Web Push) fica pro milestone
-- de PWA/polish — por enquanto o client lê as não-lidas e mostra toast.
-- Grants: cobertos pelos default privileges configurados na 003.
-- =====================================================================

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  grupo_id uuid not null references public.grupos_pelada (id) on delete cascade,
  titulo text not null,
  link text,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_notificacoes_usuario_nao_lidas
  on public.notificacoes (usuario_id) where lida = false;

alter table public.notificacoes enable row level security;

create policy "notificacoes_select_proprias" on public.notificacoes
  for select to authenticated using (usuario_id = auth.uid());

-- Só o organizador do grupo dispara notificações (ex.: nova sessão).
create policy "notificacoes_insert_organizador" on public.notificacoes
  for insert to authenticated with check (public.is_organizador_grupo(grupo_id));

-- Marcar como lida.
create policy "notificacoes_update_proprias" on public.notificacoes
  for update to authenticated using (usuario_id = auth.uid());

create policy "notificacoes_delete_proprias" on public.notificacoes
  for delete to authenticated using (usuario_id = auth.uid());

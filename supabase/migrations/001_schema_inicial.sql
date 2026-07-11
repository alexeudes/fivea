-- =====================================================================
-- SCHEMA INICIAL — App de Agendamento de Peladas (Futebol/Futsal)
-- Supabase Postgres — Auth nativo (auth.users) + RLS
-- =====================================================================
-- Como aplicar:
--   supabase migration new schema_inicial
--   (cole este conteúdo no arquivo gerado em supabase/migrations/)
--   supabase db push
-- Ou cole direto no SQL Editor do painel do Supabase.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. TIPOS (ENUMS)
-- =====================================================================

create type tipo_pelada_enum as enum ('futebol', 'futsal');
create type frequencia_enum as enum ('semanal', 'quinzenal', 'sem_frequencia');
create type tipo_pagamento_enum as enum ('diarista', 'mensalista');
create type status_presenca_enum as enum ('fora', 'duvida', 'confirmado', 'confirmado_pendente_pagamento');
create type status_sessao_enum as enum ('agendada', 'realizada', 'cancelada');
create type perna_enum as enum ('destro', 'canhoto', 'ambidestro');
create type posicao_enum as enum ('goleiro', 'zagueiro', 'lateral', 'volante', 'meia', 'atacante');
create type status_jogador_enum as enum ('disponivel', 'lesionado', 'inativo');
create type metodo_pagamento_enum as enum ('pix', 'cartao');
create type status_pagamento_enum as enum ('pendente', 'pago', 'expirado', 'cancelado');
create type status_assinatura_enum as enum ('ativa', 'cancelada', 'inadimplente');

-- =====================================================================
-- 2. PERFIS (extensão de auth.users)
-- =====================================================================

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  avatar_url text,
  telefone text,
  perna perna_enum not null default 'destro',
  posicao_preferida posicao_enum,
  status_jogador status_jogador_enum not null default 'disponivel',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.perfis is 'Perfil público de cada jogador, 1:1 com auth.users';

-- Cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================================
-- 3. GRUPOS DE PELADA
-- =====================================================================

create table public.grupos_pelada (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid not null references public.perfis (id),
  nome text not null,
  tipo tipo_pelada_enum not null,
  local text,
  dia_semana smallint check (dia_semana between 0 and 6),
  horario time,
  frequencia frequencia_enum not null default 'sem_frequencia',
  valor_diaria numeric(10, 2),
  valor_mensalidade numeric(10, 2),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_grupos_pelada_organizador on public.grupos_pelada (organizador_id);

-- =====================================================================
-- 4. MEMBROS DO GRUPO
-- =====================================================================

create table public.membros_grupo (
  grupo_id uuid not null references public.grupos_pelada (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  tipo_pagamento tipo_pagamento_enum not null default 'diarista',
  ativo boolean not null default true,
  entrou_em timestamptz not null default now(),
  primary key (grupo_id, usuario_id)
);

create index idx_membros_grupo_usuario on public.membros_grupo (usuario_id);

-- =====================================================================
-- 5. GOLEIROS AVULSOS (pool "para alugar")
-- =====================================================================

create table public.goleiros_avulsos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.perfis (id), -- preenchido se o goleiro também é um usuário cadastrado
  criado_por uuid not null references public.perfis (id),
  nome text not null,
  telefone text,
  valor_padrao numeric(10, 2),
  created_at timestamptz not null default now()
);

-- =====================================================================
-- 6. SESSÕES DE PELADA (cada ocorrência real de um grupo)
-- =====================================================================

create table public.sessoes_pelada (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_pelada (id) on delete cascade,
  data_hora timestamptz not null,
  local text,
  status status_sessao_enum not null default 'agendada',
  goleiro_avulso_id uuid references public.goleiros_avulsos (id),
  observacoes text,
  created_at timestamptz not null default now()
);

create index idx_sessoes_pelada_grupo on public.sessoes_pelada (grupo_id);
create index idx_sessoes_pelada_data on public.sessoes_pelada (data_hora);

-- =====================================================================
-- 7. ASSINATURAS (mensalistas — cobrança recorrente via AbacatePay)
-- =====================================================================

create table public.assinaturas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos_pelada (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  abacatepay_subscription_id text unique,
  status status_assinatura_enum not null default 'ativa',
  created_at timestamptz not null default now(),
  cancelada_em timestamptz,
  foreign key (grupo_id, usuario_id) references public.membros_grupo (grupo_id, usuario_id) on delete cascade
);

create index idx_assinaturas_grupo_usuario on public.assinaturas (grupo_id, usuario_id);

-- =====================================================================
-- 8. PAGAMENTOS (avulsos por sessão OU cobranças de uma assinatura)
-- =====================================================================

create table public.pagamentos (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references public.sessoes_pelada (id) on delete cascade,
  assinatura_id uuid references public.assinaturas (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id),
  metodo metodo_pagamento_enum not null,
  valor numeric(10, 2) not null,
  status status_pagamento_enum not null default 'pendente',
  abacatepay_charge_id text unique,
  qr_code text, -- pix copia-e-cola, quando aplicável
  criado_em timestamptz not null default now(),
  pago_em timestamptz,
  constraint pagamento_tem_referencia check (
    (sessao_id is not null and assinatura_id is null) or
    (sessao_id is null and assinatura_id is not null)
  )
);

create index idx_pagamentos_usuario on public.pagamentos (usuario_id);
create index idx_pagamentos_sessao on public.pagamentos (sessao_id);

comment on table public.pagamentos is
  'Escrita restrita ao backend (service_role). Client só lê. A criação da cobrança no AbacatePay e a confirmação via webhook acontecem em uma rota de servidor (Cloudflare Worker), nunca diretamente do client.';

-- =====================================================================
-- 9. PRESENÇAS
-- =====================================================================

create table public.presencas (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes_pelada (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  status status_presenca_enum not null default 'duvida',
  pagamento_id uuid references public.pagamentos (id),
  confirmado_em timestamptz,
  unique (sessao_id, usuario_id)
);

create index idx_presencas_sessao on public.presencas (sessao_id);
create index idx_presencas_usuario on public.presencas (usuario_id);

-- =====================================================================
-- 10. TIMES SORTEADOS
-- =====================================================================

create table public.times_sorteio (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes_pelada (id) on delete cascade,
  nome text not null, -- ex: "Time A"
  cor text, -- ex: "colete azul", opcional pra UI
  capitao_id uuid references public.perfis (id),
  created_at timestamptz not null default now()
);

create table public.times_jogadores (
  time_id uuid not null references public.times_sorteio (id) on delete cascade,
  usuario_id uuid not null references public.perfis (id) on delete cascade,
  posicao_na_partida posicao_enum,
  primary key (time_id, usuario_id)
);

-- =====================================================================
-- 11. AVALIAÇÕES (só a média agregada é exposta publicamente)
-- =====================================================================

create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes_pelada (id) on delete cascade,
  avaliado_id uuid not null references public.perfis (id) on delete cascade,
  avaliador_id uuid not null references public.perfis (id) on delete cascade,
  nota smallint not null check (nota between 1 and 5),
  created_at timestamptz not null default now(),
  unique (sessao_id, avaliado_id, avaliador_id),
  check (avaliado_id <> avaliador_id)
);

create index idx_avaliacoes_avaliado on public.avaliacoes (avaliado_id);

-- =====================================================================
-- 12. FUNÇÕES AUXILIARES (usadas nas policies de RLS)
-- =====================================================================

-- Usuário é membro ativo do grupo (ou o organizador)?
create or replace function public.is_membro_grupo(p_grupo_id uuid, p_usuario_id uuid default auth.uid())
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.membros_grupo
    where grupo_id = p_grupo_id and usuario_id = p_usuario_id and ativo = true
  ) or exists (
    select 1 from public.grupos_pelada
    where id = p_grupo_id and organizador_id = p_usuario_id
  );
$$;

-- Usuário é o organizador do grupo?
create or replace function public.is_organizador_grupo(p_grupo_id uuid, p_usuario_id uuid default auth.uid())
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.grupos_pelada
    where id = p_grupo_id and organizador_id = p_usuario_id
  );
$$;

-- Retorna o grupo ao qual uma sessão pertence
create or replace function public.grupo_da_sessao(p_sessao_id uuid)
returns uuid
language sql security definer stable set search_path = public as $$
  select grupo_id from public.sessoes_pelada where id = p_sessao_id;
$$;

-- Retorna o grupo ao qual um time sorteado pertence (via sessão)
create or replace function public.grupo_do_time(p_time_id uuid)
returns uuid
language sql security definer stable set search_path = public as $$
  select s.grupo_id from public.times_sorteio t
  join public.sessoes_pelada s on s.id = t.sessao_id
  where t.id = p_time_id;
$$;

-- Média de avaliação de um jogador, sem expor quem avaliou o quê
create or replace function public.media_avaliacao_jogador(p_usuario_id uuid)
returns table (media numeric, total_avaliacoes bigint)
language sql security definer stable set search_path = public as $$
  select round(avg(nota)::numeric, 2), count(*)
  from public.avaliacoes
  where avaliado_id = p_usuario_id;
$$;

grant execute on function public.media_avaliacao_jogador(uuid) to authenticated;

-- =====================================================================
-- 13. RLS — HABILITAR EM TODAS AS TABELAS
-- =====================================================================

alter table public.perfis enable row level security;
alter table public.grupos_pelada enable row level security;
alter table public.membros_grupo enable row level security;
alter table public.goleiros_avulsos enable row level security;
alter table public.sessoes_pelada enable row level security;
alter table public.assinaturas enable row level security;
alter table public.pagamentos enable row level security;
alter table public.presencas enable row level security;
alter table public.times_sorteio enable row level security;
alter table public.times_jogadores enable row level security;
alter table public.avaliacoes enable row level security;

-- ---- perfis: visível pra todo mundo autenticado, editável só pelo dono ----
create policy "perfis_select_todos" on public.perfis
  for select to authenticated using (true);

create policy "perfis_update_proprio" on public.perfis
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---- grupos_pelada ----
create policy "grupos_select_membros" on public.grupos_pelada
  for select to authenticated using (public.is_membro_grupo(id));

create policy "grupos_insert_proprio" on public.grupos_pelada
  for insert to authenticated with check (organizador_id = auth.uid());

create policy "grupos_update_organizador" on public.grupos_pelada
  for update to authenticated using (organizador_id = auth.uid());

create policy "grupos_delete_organizador" on public.grupos_pelada
  for delete to authenticated using (organizador_id = auth.uid());

-- ---- membros_grupo ----
create policy "membros_select" on public.membros_grupo
  for select to authenticated using (public.is_membro_grupo(grupo_id));

create policy "membros_insert" on public.membros_grupo
  for insert to authenticated with check (
    usuario_id = auth.uid() or public.is_organizador_grupo(grupo_id)
  );

create policy "membros_update" on public.membros_grupo
  for update to authenticated using (
    usuario_id = auth.uid() or public.is_organizador_grupo(grupo_id)
  );

create policy "membros_delete" on public.membros_grupo
  for delete to authenticated using (
    usuario_id = auth.uid() or public.is_organizador_grupo(grupo_id)
  );

-- ---- goleiros_avulsos (pool global, não é por grupo) ----
create policy "goleiros_select_todos" on public.goleiros_avulsos
  for select to authenticated using (true);

create policy "goleiros_insert_proprio" on public.goleiros_avulsos
  for insert to authenticated with check (criado_por = auth.uid());

create policy "goleiros_update_proprio" on public.goleiros_avulsos
  for update to authenticated using (criado_por = auth.uid() or usuario_id = auth.uid());

create policy "goleiros_delete_proprio" on public.goleiros_avulsos
  for delete to authenticated using (criado_por = auth.uid());

-- ---- sessoes_pelada ----
create policy "sessoes_select_membros" on public.sessoes_pelada
  for select to authenticated using (public.is_membro_grupo(grupo_id));

create policy "sessoes_insert_organizador" on public.sessoes_pelada
  for insert to authenticated with check (public.is_organizador_grupo(grupo_id));

create policy "sessoes_update_organizador" on public.sessoes_pelada
  for update to authenticated using (public.is_organizador_grupo(grupo_id));

create policy "sessoes_delete_organizador" on public.sessoes_pelada
  for delete to authenticated using (public.is_organizador_grupo(grupo_id));

-- ---- assinaturas (escrita só via backend/webhook com service_role) ----
create policy "assinaturas_select" on public.assinaturas
  for select to authenticated using (
    usuario_id = auth.uid() or public.is_organizador_grupo(grupo_id)
  );

-- ---- pagamentos (client só lê; criação/confirmação via backend) ----
create policy "pagamentos_select" on public.pagamentos
  for select to authenticated using (
    usuario_id = auth.uid()
    or (sessao_id is not null and public.is_organizador_grupo(public.grupo_da_sessao(sessao_id)))
    or (assinatura_id is not null and exists (
      select 1 from public.assinaturas a
      where a.id = assinatura_id and public.is_organizador_grupo(a.grupo_id)
    ))
  );

-- ---- presencas ----
create policy "presencas_select" on public.presencas
  for select to authenticated using (public.is_membro_grupo(public.grupo_da_sessao(sessao_id)));

create policy "presencas_insert" on public.presencas
  for insert to authenticated with check (
    usuario_id = auth.uid() or public.is_organizador_grupo(public.grupo_da_sessao(sessao_id))
  );

create policy "presencas_update" on public.presencas
  for update to authenticated using (
    usuario_id = auth.uid() or public.is_organizador_grupo(public.grupo_da_sessao(sessao_id))
  );

create policy "presencas_delete" on public.presencas
  for delete to authenticated using (public.is_organizador_grupo(public.grupo_da_sessao(sessao_id)));

-- ---- times_sorteio ----
create policy "times_select" on public.times_sorteio
  for select to authenticated using (public.is_membro_grupo(public.grupo_da_sessao(sessao_id)));

create policy "times_insert" on public.times_sorteio
  for insert to authenticated with check (public.is_organizador_grupo(public.grupo_da_sessao(sessao_id)));

create policy "times_update" on public.times_sorteio
  for update to authenticated using (public.is_organizador_grupo(public.grupo_da_sessao(sessao_id)));

create policy "times_delete" on public.times_sorteio
  for delete to authenticated using (public.is_organizador_grupo(public.grupo_da_sessao(sessao_id)));

-- ---- times_jogadores ----
create policy "times_jogadores_select" on public.times_jogadores
  for select to authenticated using (public.is_membro_grupo(public.grupo_do_time(time_id)));

create policy "times_jogadores_insert" on public.times_jogadores
  for insert to authenticated with check (public.is_organizador_grupo(public.grupo_do_time(time_id)));

create policy "times_jogadores_update" on public.times_jogadores
  for update to authenticated using (public.is_organizador_grupo(public.grupo_do_time(time_id)));

create policy "times_jogadores_delete" on public.times_jogadores
  for delete to authenticated using (public.is_organizador_grupo(public.grupo_do_time(time_id)));

-- ---- avaliacoes (só o autor vê as próprias notas enviadas) ----
create policy "avaliacoes_select_proprias" on public.avaliacoes
  for select to authenticated using (avaliador_id = auth.uid());

create policy "avaliacoes_insert" on public.avaliacoes
  for insert to authenticated with check (
    avaliador_id = auth.uid()
    and avaliado_id <> auth.uid()
    and public.is_membro_grupo(public.grupo_da_sessao(sessao_id))
  );

create policy "avaliacoes_update_proprias" on public.avaliacoes
  for update to authenticated using (avaliador_id = auth.uid());

create policy "avaliacoes_delete_proprias" on public.avaliacoes
  for delete to authenticated using (avaliador_id = auth.uid());

-- =====================================================================
-- Fim do schema inicial
-- =====================================================================

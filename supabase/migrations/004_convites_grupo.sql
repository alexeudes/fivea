-- =====================================================================
-- CONVITES DE GRUPO
-- =====================================================================
-- Cada grupo ganha um código de convite curto e único. Quem tem o código
-- pode ver uma prévia do grupo (via função security definer, já que a
-- policy de select de grupos_pelada só cobre membros) e entrar sozinho
-- (a policy membros_insert já permite usuario_id = auth.uid()).
-- =====================================================================

alter table public.grupos_pelada
  add column codigo_convite text not null unique
  default encode(gen_random_bytes(4), 'hex');

-- Prévia de um grupo pelo código de convite, para quem ainda não é membro.
-- Retorna só o necessário pra tela de convite — não expõe o grupo inteiro.
create or replace function public.grupo_por_codigo(p_codigo text)
returns table (
  id uuid,
  nome text,
  tipo tipo_pelada_enum,
  local text,
  frequencia frequencia_enum,
  dia_semana smallint,
  horario time,
  valor_diaria numeric(10, 2),
  valor_mensalidade numeric(10, 2),
  organizador_nome text,
  ja_membro boolean
)
language sql security definer stable set search_path = public as $$
  select g.id, g.nome, g.tipo, g.local, g.frequencia, g.dia_semana,
         g.horario, g.valor_diaria, g.valor_mensalidade,
         p.nome as organizador_nome,
         public.is_membro_grupo(g.id) as ja_membro
  from public.grupos_pelada g
  join public.perfis p on p.id = g.organizador_id
  where g.codigo_convite = lower(p_codigo) and g.ativo = true;
$$;

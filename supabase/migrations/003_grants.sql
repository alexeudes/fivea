-- =====================================================================
-- GRANTS — expõe as tabelas do schema public para o PostgREST
-- =====================================================================
-- Versões recentes do Supabase (CLI e projetos novos na nuvem) não expõem
-- mais tabelas automaticamente para os papéis `anon`/`authenticated`
-- (comportamento antigo "auto_expose_new_tables"). RLS continua sendo a
-- camada real de autorização por linha; isto apenas permite que o papel
-- tente a operação — sem policy correspondente, RLS ainda bloqueia tudo.
-- Não concedemos a `anon`: este schema não tem nenhuma policy para
-- usuários não autenticados.
-- =====================================================================

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete
  on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;

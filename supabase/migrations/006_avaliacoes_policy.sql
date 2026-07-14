-- =====================================================================
-- 006 — Aperta as policies de escrita em avaliacoes: só depois da pelada
-- realizada, e só entre quem estava confirmado na sessão. Antes esse gate
-- vivia só na server action; agora o banco também barra chamadas diretas
-- à API. WITH CHECK também no update pra ninguém "mover" uma avaliação
-- existente pra outra sessão/avaliado por fora do gate.
-- =====================================================================

-- Sessão realizada + avaliador e avaliado confirmados nela?
create or replace function public.pode_avaliar(p_sessao_id uuid, p_avaliado_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.sessoes_pelada
    where id = p_sessao_id and status = 'realizada'
  ) and (
    select count(*) = 2 from public.presencas
    where sessao_id = p_sessao_id
      and usuario_id in (auth.uid(), p_avaliado_id)
      and status in ('confirmado', 'confirmado_pendente_pagamento')
  );
$$;

grant execute on function public.pode_avaliar(uuid, uuid) to authenticated;

drop policy "avaliacoes_insert" on public.avaliacoes;
create policy "avaliacoes_insert" on public.avaliacoes
  for insert to authenticated with check (
    avaliador_id = auth.uid()
    and avaliado_id <> auth.uid()
    and public.is_membro_grupo(public.grupo_da_sessao(sessao_id))
    and public.pode_avaliar(sessao_id, avaliado_id)
  );

drop policy "avaliacoes_update_proprias" on public.avaliacoes;
create policy "avaliacoes_update_proprias" on public.avaliacoes
  for update to authenticated
  using (avaliador_id = auth.uid())
  with check (
    avaliador_id = auth.uid()
    and avaliado_id <> auth.uid()
    and public.is_membro_grupo(public.grupo_da_sessao(sessao_id))
    and public.pode_avaliar(sessao_id, avaliado_id)
  );

@AGENTS.md

# Fivea

App de agendamento de peladas de futebol/futsal. Mobile-first PWA, lançamento
internacional (pt-BR / en).

## Stack

- **Framework**: Next.js (App Router) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui (`style: base-nova`, ver `components.json`)
- **Dados/Auth**: Supabase — Postgres, Auth nativo (email/senha), Realtime
- **Deploy**: Cloudflare Workers via `@opennextjs/cloudflare` — **não Vercel**.
  Config em `wrangler.jsonc` / `open-next.config.ts`. `nodejs_compat` ligado,
  sem Edge Runtime do Next (as rotas rodam no worker via OpenNext).
- **Pagamentos**: AbacatePay (Pix, cartão, assinaturas recorrentes) via
  `abacatepay-nodejs-sdk`, chamado só de código server-side
  (`lib/abacatepay/client.ts`)
- **i18n**: next-intl, locales `pt-BR` (default) e `en`, roteamento por
  `app/[locale]/...`
- **PWA**: `public/manifest.json` + `public/sw.js` (passthrough, sem cache
  ainda), ícones gerados a partir do crest em `public/icons/`

## Identidade visual

Fonte da verdade: `design/fivea-identidade-visual.html` (referência viva — os
tokens abaixo foram extraídos de lá). Se o arquivo mudar, atualize
`app/globals.css` e este documento juntos.

### Cores (hex exato)

| Token | Hex | Uso |
|---|---|---|
| Ink Navy | `#0E1B2A` | fundo escuro, `background`/`card` no dark mode |
| Ink Navy 2 | `#132639` | superfície elevada no dark mode (`card`) |
| Chalk | `#F5F6F2` | fundo claro (`background` no light mode) |
| Whistle Orange | `#FF5A2E` | ação primária / CTA (`primary`) |
| Court Blue | `#1E5AA8` | confirmado, links (`secondary`) |
| Cone Yellow | `#FFC93C` | dúvida / pendência, atenção (`accent`) |
| Graphite | `#2B333B` | texto neutro (`foreground` no light mode) |
| Graphite Soft | `#5B6672` | texto secundário (`muted-foreground`) |

Mapeados em `app/globals.css` como as CSS vars do tema shadcn (`--primary`,
`--secondary`, `--accent`, etc. — **não são os valores default do shadcn**) e
também expostos como utilitários de marca (`bg-ink-navy`, `text-whistle-orange`,
`bg-chalk`, `text-court-blue`, `bg-cone-yellow`, `text-graphite`,
`text-graphite-soft`).

Chips de status de presença usam essa paleta diretamente: confirmado →
Court Blue, dúvida → Cone Yellow, pendente de pagamento → Whistle Orange,
fora → Graphite Soft.

### Tipografia

- **Big Shoulders** (`--font-big-shoulders`, `font-heading`) — display,
  headlines, wordmark, placar. Pesos 500/700/900, sempre uppercase.
- **IBM Plex Sans** (`--font-ibm-plex-sans`, `font-sans`) — corpo de texto,
  legível em pt/en. Pesos 400/500/600.
- **IBM Plex Mono** (`--font-ibm-plex-mono`, `font-mono`) — dados, horário,
  placar, cronômetro. Pesos 400/500/600.

Todas via `next/font/google` em `app/[locale]/layout.tsx`.

### Logo / Crest

**Padrão**: `design/fivea_logo.png` é o logo oficial (fonte da verdade
raster). Escudo com "5" onde o bojo inferior do número vira a bola
(laranja), já com fundo Ink Navy e cantos arredondados embutidos.

- Cópia servida ao app: `public/brand/fivea-logo.png` (recompactada, mesmos
  pixels). Use via `components/fivea/logo.tsx` (`<Logo />`) em vez de
  importar a imagem direto.
- Ícones de PWA/favicon (`public/icons/*.png`, `app/icon.png`,
  `app/apple-icon.png`) são todos gerados por **resize simples** desse PNG
  com `sharp` — não há mais rasterização de SVG/fonte envolvida. Se o logo
  mudar, regenere os dois (`public/brand/fivea-logo.png` e todos os ícones)
  a partir do novo `design/fivea_logo.png`.
- `design/fivea-identidade-visual.html` ainda documenta a versão SVG/vetorial
  do crest (paleta, tipografia, o conceito "5 com bola") mas não é mais usada
  para gerar assets — o PNG é o padrão.

## Convenções de nomenclatura no banco (Supabase/Postgres)

Schema em `supabase/migrations/001_schema_inicial.sql`. Tabelas e colunas em
**português**, snake_case:

- `perfis` — extensão pública de `auth.users` (1:1)
- `grupos_pelada` — um grupo recorrente de pelada (dono = `organizador_id`)
- `membros_grupo` — quem participa de um grupo (`diarista` ou `mensalista`)
- `goleiros_avulsos` — pool de goleiros "para alugar", não precisa ser membro
- `sessoes_pelada` — cada ocorrência real de uma pelada (data/hora específica)
- `assinaturas` — cobrança recorrente de mensalista via AbacatePay
- `pagamentos` — cobrança avulsa (por sessão) ou de assinatura; **escrita
  restrita a service_role**, client só lê
- `presencas` — status de presença por usuário/sessão (`fora`, `duvida`,
  `confirmado`, `confirmado_pendente_pagamento`)
- `times_sorteio` / `times_jogadores` — times sorteados numa sessão
- `avaliacoes` — nota 1–5 entre jogadores; só a média agregada
  (`media_avaliacao_jogador`) é exposta publicamente, notas individuais só
  para quem avaliou

RLS habilitado em todas as tabelas. Funções auxiliares (`is_membro_grupo`,
`is_organizador_grupo`, etc.) centralizam a lógica de permissão usada nas
policies — reusar essas funções em vez de duplicar a checagem.

**Migrations depois da 001 (não editar 001, é append-only):**
- `002_storage_avatars.sql` — bucket `avatars` (público, path
  `avatars/{user_id}/arquivo`) + policies de storage.objects por dono.
- `003_grants.sql` — `GRANT` explícito de `select/insert/update/delete` em
  `public.*` para `authenticated`/`service_role`. Necessário porque
  versões recentes do Supabase (CLI e projetos novos na nuvem) **não expõem
  mais tabelas automaticamente** para PostgREST — sem isso toda query dá
  `permission denied for table X` mesmo com RLS/policies corretas. Qualquer
  tabela nova precisa desse grant (ou cair no `alter default privileges`
  que a migration já configura pra `public`).
- `004_convites_grupo.sql` — coluna `codigo_convite` (8 hex chars, unique,
  default aleatório) em `grupos_pelada` + função `grupo_por_codigo(text)`
  (security definer) que retorna a prévia de um grupo pra quem ainda não é
  membro (a policy de select só cobre membros). Entrar no grupo = insert
  direto em `membros_grupo` (a policy `membros_insert` já permite
  `usuario_id = auth.uid()`).

**Gotcha de RLS + RETURNING:** `insert(...).select(...)` (RETURNING) avalia
a policy de *select* dentro do próprio INSERT, e funções `stable` como
`is_membro_grupo` não enxergam a linha recém-inserida no snapshot do
statement — o insert falha com "new row violates row-level security policy"
mesmo com policies corretas. Solução usada: gerar o `id` no app
(`crypto.randomUUID()`) e inserir sem RETURNING (ver `criarGrupo` em
`lib/supabase/grupo-actions.ts`).

## Supabase local (dev)

CLI como devDependency (`npx supabase ...`, não precisa instalar global).
Portas customizadas em `supabase/config.toml` (**54331–54339**, não as
54321–54324 default) porque pode haver outro projeto Supabase local rodando
na máquina — confira com `docker ps` antes de assumir as portas default.
`[analytics]` desligado (o container `vector` fica `unhealthy` neste
ambiente e não é necessário pra rodar auth/DB local).

```bash
npx supabase start        # sobe Postgres/Auth/Storage/Studio locais, aplica migrations
npx supabase db reset      # recria o banco do zero e reaplica todas as migrations
npx supabase stop
```

Se `docker` pedir permissão, rode os comandos acima prefixados com
`sg docker -c "..."` em vez de mexer no grupo do usuário sem avisar.

`.env.local` (gitignored) aponta pro Supabase local: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54331`
e a `anon key` fixa que o `supabase start` imprime. Trocar pelos valores do
projeto real quando ele existir.

## Autenticação

`proxy.ts` (raiz) combina duas responsabilidades num único arquivo, porque o
Next.js só permite um proxy/middleware por app: (1) roteamento de locale via
`next-intl` e (2) refresh de sessão Supabase + proteção de rotas. Rotas
públicas (sem locale prefix) ficam na constante `PUBLIC_PATHS` em `proxy.ts`
(`/`, `/login`, `/cadastro`) — qualquer rota fora dessa lista exige sessão,
senão redireciona pra `/login?next=<rota>`. Como `(auth)` e `(app)` são route
groups, eles não aparecem na URL — é por isso que a checagem é por
allowlist de paths, não por prefixo.

Fluxo: cadastro (`/cadastro`, só email/senha) → trigger `handle_new_user` já
cria a linha em `perfis` (com `nome` provisório = parte local do email) →
redireciona pra `/perfil/completar` (nome, perna, posição, foto) →
`/inicio`. Login direto vai pra `/inicio` (ou pro `next` da URL).

Server actions ficam em `lib/supabase/actions.ts` (signUp/signIn/signOut) e
`lib/supabase/perfil-actions.ts` (completarPerfil) — todas recebem `locale`
como primeiro argumento via `.bind(null, locale)` no client component, pra
poder montar o redirect com o prefixo de locale certo sem depender do
contexto de navegação do next-intl dentro de uma Server Action.

## Estrutura de pastas

```
app/[locale]/(auth)/   rotas públicas de autenticação (login, etc.)
app/[locale]/(app)/    rotas logadas do produto
components/ui/         componentes shadcn (gerados, não editar à mão além do necessário)
components/fivea/      componentes de marca (crest, chips de status, etc.)
lib/supabase/          clients Supabase (client.ts = browser, server.ts = RSC/route handlers)
lib/abacatepay/        client do SDK AbacatePay (server-only)
i18n/                  routing/navigation/request config do next-intl
messages/              pt-BR.json / en.json
```

## Roteiro de milestones

TBD — ainda não recebido. Adicionar o link aqui quando existir.

# ADR-002 — Player Development & Career Time Engine (Overall Dinâmico)

Data: 2026-07-17 · Branch: `feat/design-system-v2` · Status: implementado (P0)

## Contexto

O overall era tratado como valor PRINCIPAL, não como consequência dos
atributos. A auditoria da Fase 0 (6 agentes, read-only) confirmou:

- **H1** — `evoluirJogador`, retorno de empréstimo e a academia mutavam o
  `overall` DIRETO, sem tocar atributos; o seed trazia overall curado ≠
  `calcularOverall(atributos)`. Resultado: drift permanente + clamps
  "overall nunca cai" que institucionalizavam o desvio.
- **H8** — condição/moral/forma entravam na partida como UM multiplicador
  escalar sobre o overall (sem modulação por categoria); a forma nunca reagia
  aos jogos (só a treino — um stub).
- **H10** — nenhum histórico auditável de evolução de atributos.
- **H2/H3/H4** — treino sem plano recorrente (escolha efêmera de tela);
  fallback automático fixo "hab_fisico"; sem onboarding.
- **H5/H8b** — condição existia, mas sem carga/fadiga/ritmo/descanso;
  "7 dias de lesão = 1 rodada" (escala dupla vs calendário de 3-4 dias).
- **H6/H7/H9** — a rodada era o relógio (não a data); nada rodava por dia;
  a IA não treinava/recuperava (titulares drenavam até o piso).

## Decisão

A cadeia canônica passa a ser:

```
atributos → força por posição → Overall BASE → estado do atleta
→ atributos EFETIVOS → Overall DE PARTIDA → ações na engine causal
→ estatísticas → nota → forma → evolução
```

`PR-01`: é proibido mutar o overall direto — ele é SEMPRE derivado dos
atributos. Toda mudança relevante emite reason codes (explicabilidade).

## Fórmulas e parâmetros (fonte da verdade em código)

### Overall Base — 4 pilares (`engine/progression/ratings.ts`)

```
overallBase = 0.40·técnica + 0.25·temporada + 0.20·avançadas + 0.15·mercado
```

- **Técnica (40%)**: `calcularOverall(atributos, posição)` — média ponderada
  pelo perfil da posição (8 perfis, `overall.ts`).
- **Temporada (25%)**: nota média ancorada na técnica + regressão à média por
  minutagem (`confiança = min(1, jogos/20)`); sem amostra ⇒ regride à técnica.
- **Avançadas (20%)**: percentil de participação em gol no grupo de posição,
  mapeado na distribuição de técnica da coorte, com a mesma confiança.
- **Mercado (15%)**: log-percentil do valor na coorte **posição × faixa
  etária**, mapeado na técnica — limitado a ±20 da técnica (o mercado nunca
  supera o esporte).

Estabilidade da migração: sem amostra, o Base coincide com o overall curado
(±3 em 100% do seed).

### Calibração do drift (`engine/progression/calibracaoAtributos.ts`)

`comAtributosCalibrados` roda nos 3 loads (seed + save + mundo mestre):
ajusta os ATRIBUTOS para casarem com o overall curado — escala proporcional +
lapidação ±1 nos atributos do perfil. Idempotente, exato, preserva o overall
autoral (Neymar 86). `aplicarAlvoDeOverall` move um jogador para um
overall-alvo mexendo nos atributos, com viés por categoria × idade (físico
cresce/decai primeiro; mental amadurece tarde).

### Overall de Partida (`engine/progression/overallPartida.ts`)

O estado modula os atributos POR CATEGORIA (não um escalar único):

```
fisico  = 0.6 + 0.4·(condição/100)      → aplicado aos atributos FÍSICOS
mental  = 0.94 + 0.12·(moral/100)       → aos atributos MENTAIS
tecnico = 1 + 0.03·forma  (forma −3..+5)→ aos atributos TÉCNICOS
goleiro = (fisico + mental)/2
```

`overallDePartida = clamp(calcularOverall(atributosEfetivos), Base−8, Base+8)`.
O Base NUNCA é alterado (atributos efetivos são cópia). Consumido em
`teamStrength.contribuicaoJogador/Goleiro` (substituiu o antigo
`overall × fatoresEstado` — fim da dupla contagem). Estado neutro ⇒ força =
Base (desvio 0.0 no lab).

### Curva de idade (`playerProgression.evoluirJogadorDetalhado`)

Virada de temporada: a curva define um overall-ALVO (jovem <21 forte;
21-24 desenvolvimento; 25-29 auge só com desempenho; 30-32 pré-declínio;
33+ declínio) e os pontos entram/saem dos ATRIBUTOS. Emite
`AGE_CURVE_GROWTH/DECLINE`, `GOOD_RECENT_FORM`, `LOW_MATCH_MINUTES`.

### Física (`engine/physical/fisicoEngine.ts`)

- `cargaAguda`, `cargaCronica`, `ritmo` (0-100), separados de `condicaoFisica`.
- `fadiga = clamp(cargaAguda·0.6 + (cargaAguda/max(30,cargaCronica))·25)` (ACWR).
- `prontidao = 0.45·condição + 0.35·ritmo + 0.20·(100−fadiga)`.
- `probabilidadeLesao` (base + fadiga + condição + idade + retorno recente);
  faixas `baixo/moderado/elevado/muito_elevado`. Alimenta a escolha da vítima
  em `matchSimulator.simularLesao` (peso = 1 + prob·300).
- Retorno progressivo: volta com condição ≤60 e ritmo ≤30 (não 100%).
- Descanso ativo: `descansarJogador` (−50% carga aguda, +18 condição, −3 ritmo).

### Relógio e treino

- Data canônica `dataAtual`; `pipelineDiario.processarDiasAte` processa cada
  dia em lote no avanço por evento (lesão em dias REAIS; recuperação física;
  pendências). Copa passa a desgastar titulares.
- Plano de treino recorrente (`planoTreinoEngine`): 6 presets +
  `sessaoDoCiclo` + assistente (`recomendarPlano`). Executor
  `treinarCicloAutomatico`: usuário treina a sessão do plano; IA da liga ativa
  treina leve (fim da drenagem). Uma sessão manual por ciclo (anti-exploit).

### Forma reage aos jogos (`engine/progression/formaEngine.ts`)

`atualizarFormaPorNota`: nota ≥7.5 sobe a fase (+1, teto +5), ≤5.5 derruba
(−1, piso −3), medianas regridem ao neutro. Aplicado no pós-partida.

## Compatibilidade de saves

Todos os campos novos são ADITIVOS (sem bump de `VERSAO_SAVE`):
`Player.fisico?`, `planoTreino/planoTreinoStatus/pendencias`,
`ledgerDesenvolvimento`. Save antigo carrega com defaults honestos
(`planoTreinoStatus: 'padrao_assistente'` — já treinava no automático). As
migrações de load (`comAtributosCalibrados`, `comEstadoFisico`) são
idempotentes.

## Laboratório de balanceamento (temporada completa)

Medido em 1 temporada (380 jogos) + virada — guarda em
`src/__tests__/balanceamento.e2e.test.ts`:

| Métrica | Valor | Leitura |
|---|---|---|
| Lesões por partida | 0.074 (~1 a cada 13 jogos) | saudável (não "toda partida") |
| Condição média do elenco | ~76 (fim ~73) | equilíbrio (nem colapsa, nem 100%) |
| Drift overall×atributos | 0 | PR-01 mantido ao longo do jogo |
| Evolução <21 / 21-24 | todos sobem | jovens titulares evoluem |
| Evolução 25-29 / 30-32 | estável / platô | auge/pré-declínio |
| Evolução 33+ | todos caem | veteranos regridem |
| Duplicatas de jogador | 0 | — |
| Save (snapshot) | ~9 MB | ver Limitações |

Nenhum dos "resultados suspeitos" do mandato ocorre.

## Limitações e evolução futura (P1/P2)

- **Save ~9 MB** (pré-existente à Onda): dominado por `todosJogadores` +
  `jogadores` (duplicados) + partidas com ledger causal. Otimização de save
  (dedup do mundo, poda de partidas antigas) fica como P1.
- **Entrosamento** ainda não modelado — o `OverallBreakdown` mostra "—"
  (placeholder honesto). Familiaridade tática/adaptação: P1.
- **Ledger** limitado ao elenco do usuário na virada (teto 120); ganhos de
  treino por rodada não entram no ledger (só a virada). P1.
- **Calendário** mantém o calendário de jogos atual; a agenda-dia detalhada do
  mockup (pipeline visual, mês) é P2.
- **Atributos**: 12 (decisão de produto); expansão para ~20/40 é P1.
- **Comissão técnica, scouting com incerteza, gestão de minutos**: P1 do
  briefing, fora do P0.

## Consequências

12 telas/engines novas ou reformadas, ~40 testes novos; suíte 109 suítes /
781 testes verde. O overall deixou de ser um número mágico: dois jogadores 78
com perfis diferentes rendem diferente conforme posição e estado.

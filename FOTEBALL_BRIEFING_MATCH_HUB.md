# FOTEBALL · Briefing — Match Hub estilo Sofascore

> **Origem:** análise do vídeo de referência `WhatsApp Video 2026-07-11 at 23.52.15.mp4`
> (gravação do app **Sofascore**, partida *Argentina 1‑1 Suíça — quartas da Copa do
> Mundo*). O vídeo é o **north‑star de UX** para a experiência de partida do FOTEBALL.
> **Data:** 2026‑07‑11 · **Autor:** Danpazexe (briefing gerado a partir do vídeo).

---

## 0. TL;DR

O Sofascore mostra um **hub de partida** riquíssimo em dados. A boa notícia:
**a engine do FOTEBALL já calcula quase todos esses dados** (xG, xA, finalizações por
zona, grandes chances, dribles, desarmes, interceptações, passes por jogador, posse por
zona 3×3, momentum minuto a minuto) e a **súmula (`MatchResult`) já renderiza** vários
deles. Logo, **~70% do trabalho é SUPERFÍCIE (UX/telas)**, não motor novo.

**O que fazer:** transformar a partida numa experiência de "hub" com abas
(**Resumo · Estatísticas · Escalações · Comentário**), reaproveitando dados que já
existem, e adicionar 3–4 visualizações novas (mapa de chutes, heatmap, duelos/defesa,
passes por zona). Deixar de fora tudo que é **aposta/onde assistir/vídeo** (não faz
sentido num manager offline).

---

## 1. O que o vídeo mostra (inventário completo)

Cabeçalho fixo: bandeiras + placar + minuto, e abas
`Detalhes · Insights da IA · Odds · Formações · Estatísticas · Comentário · Fase eliminatória`.

| # | Tela / recurso do Sofascore | O que é |
|---|---|---|
| 1 | **Momentum ao vivo** | barras verde/roxo por minuto (pressão de ataque) |
| 2 | **Campo 2D ao vivo** | bola posicionada + rótulo "Ataque perigoso / Zona segura" |
| 3 | **Timeline de eventos** | gols, cartões, subs, VAR, com minuto e autores |
| 4 | **Insights da IA** | "Quem vai ganhar?" 72/8/20%, "Quem marcará primeiro?" 76/3/21%, jogadores melhor avaliados, "Simulação" de lance |
| 5 | **Escalações (Formações)** | campo com bolinhas numeradas + **nota por jogador**, formação (4‑3‑3 etc.), técnico, substituições |
| 6 | **Ordenar elenco** | por Clube / Idade / Valor de mercado / Altura |
| 7 | **Posicionamento médio** | campo com posição média de cada nº, toggle "Mostrar substituições" |
| 8 | **Heatmap por jogador** | "Toque em um jogador" → mapa de calor individual (zonas amarelas) |
| 9 | **Visão geral (Estatísticas)** | posse, xG, grandes chances, total de chutes, defesas do GK, escanteios, faltas, passes, desarmes — barras comparativas |
| 10 | **Faltas / Cartões** | Faltas (tiros diretos) 15×9, amarelos 1×2, vermelhos 0×1 |
| 11 | **Mapa de finalizações** | baliza + terço de ataque com dots dos chutes e trajetória do gol; filtro `TODOS · 1º · 2º` |
| 12 | **Chutes dentro/fora da área** | split de finalizações por zona |
| 13 | **Duelos** | Duelos 51%, no chão 59/43, aéreos 50/50, dribles 75/25 (donuts) |
| 14 | **Defendendo** | desarmes ganhos %, interceptações, recuperações, cortes (donuts + barras) |
| 15 | **Goleiro** | defesas do goleiro, tiros de meta |
| 16 | **Passes por zona** | campo em terços 33/46/21%, passes certos %, entradas no terço final 78%, bolas longas, laterais |
| 17 | **Comentário (play‑by‑play)** | feed cronológico com texto rico ("Finalização bloqueada, Mac Allister com o pé direito de fora da área. Assistência de Messi.") + avatar + bandeira; **detalhe do gol na baliza** ("Exibir detalhes da meta") |
| 18 | **Sequências** | Vitórias 12, sem derrotas, ambas marcam 3/7, primeiro a marcar 9/10 |
| 19 | **Fase eliminatória** | chaveamento com bandeiras e datas |
| 20 | **Mídia / Destaques** | replays em vídeo, clips, notícias |
| 21 | **Odds / Onde assistir** | apostas (Betano), streaming (Disney+, Prime…), audiência ao vivo |

---

## 2. Cruzamento com o FOTEBALL (tem / parcial / falta)

Legenda: ✅ já existe · 🟡 dado existe, falta superfície · 🔴 precisa de motor novo · ⛔ fora de escopo

| Recurso do vídeo | Estado | Onde no código / observação |
|---|---|---|
| Momentum minuto a minuto | ✅ | `EstatisticasPartida.momentumPorMinuto`; `GraficoMomentum` em `MatchResult` |
| Posse por zona 3×3 | ✅ | `posseZonas`; `MapaPosseZonas` em `MatchResult` |
| Perigo por setor | ✅ | `perigoSetores`; `MapaSetores` em `MatchResult` |
| Posse de bola (barra) | ✅ | `posseCasa/posseFora` na súmula |
| xG (gols esperados) | ✅ | `golsEsperados`; card "Estatísticas" na súmula |
| Notas por jogador | ✅ | `matchRating` (nota, craque) |
| Timeline de eventos | ✅ | `EventoPartida[]` + `MatchSimulation` (ao vivo) |
| Narração contextual | ✅🟡 | `narrarEvento` / `narrativeTemplates`; falta virar **log cronológico** pós‑jogo |
| xA, grandes chances, dribles, desarmes, interceptações, cruzamentos, impedimentos | 🟡 | **já calculados** em `EstatisticasTimePartida`, **não exibidos** → card de stats completo |
| Duelos / Defendendo / Goleiro (donuts) | 🟡 | dados existem (desarmes/interceptações/GK); falta a tela com donuts |
| Passes por zona (terços) | 🟡 | há `passesPorJogador` e `posseZonas`; falta agregação passes‑por‑terço + tela |
| Escalação em campo com nota | 🟡 | há formação + notas; falta o **campo 2D com bolinhas numeradas + nota** |
| Ordenar elenco (idade/valor/altura) | 🟡 | dados no `Player`; é filtro de UI na tela de escalação/pré‑jogo |
| Insights da IA — probabilidade de vitória | 🟡🔴 | `calcularForcaTime` dá a base; falta um **modelo determinístico de prob.** (win/empate/derrota) e a UI |
| Sequências / forma (streaks) | 🟡 | tabela/histórico existem; falta o painel "Sequências" no pré‑jogo |
| **Mapa de finalizações** (dots + xG por chute) | 🔴 | engine tem **contagem** por jogador, não **coordenada + xG por chute** → estender evento de chute |
| **Heatmap por jogador** | 🔴 | engine tem zonas do time, não **posição por jogador ao longo do tempo** → acumular XY por jogador |
| **Posicionamento médio** | 🔴 | idem heatmap: precisa de posição média por jogador |
| Campo 2D ao vivo (bola em movimento) | 🔴 | requer expor a "zona do minuto" como coordenada ao vivo no `MatchSimulation` |
| Chaveamento com bandeiras/datas | ✅ | Copa/Série D já têm brackets |
| Mídia / replays em vídeo | ⛔ | inviável/irrelevante num simulador offline |
| Odds / apostas | ⛔ | fora de escopo (jogo não é de apostas) |
| Onde assistir / audiência ao vivo | ⛔ | fora de escopo |

---

## 3. Plano de implementação (ondas)

> Ordem pensada para **entregar valor cedo** reusando dado existente, e só depois pagar
> o custo de motor novo. Cada onda é uma branch `feat/*` independente, com testes.
> Respeita a prioridade do `CLAUDE.md` (core/estabilidade primeiro; nada de quebrar
> determinismo, save ou fluxo).

### 🌊 Onda 1 — Súmula vira "Match Hub" com abas *(só UX, dado 100% pronto)*
**Objetivo:** reorganizar `MatchResult` em abas estilo Sofascore e exibir TODOS os stats
que a engine já calcula mas hoje ficam escondidos.
- Abas: **Resumo · Estatísticas · Escalações · Comentário**.
- Card "Estatísticas" completo: adicionar xA, grandes chances, chutes (no alvo/na área/de
  fora), dribles, desarmes, interceptações, cruzamentos, escanteios, faltas, impedimentos,
  passes (tentados/certos %) — todos **já em `EstatisticasTimePartida`**, com barras
  comparativas casa×fora e filtro `Todos · 1º · 2º`.
- **Comentário:** transformar os `EventoPartida[]` + `narrarEvento` num **log cronológico**
  (minuto · texto rico · autor), reusando templates de narração.
- Arquivos: `src/screens/MatchResult/index.tsx`, `src/components/MatchNarration/*`,
  `src/engine/simulation/narrativeTemplates.ts`.
- Risco: baixo. Sem mudança de engine → **sem risco de save/determinismo**.

### 🌊 Onda 2 — Escalações em campo + duelos/defesa/GK *(dado pronto, viz nova)*
- **Campo 2D de escalação:** bolinhas numeradas na formação, com **nota por jogador**
  (cor por faixa) e técnico; toque no jogador → mini‑ficha.
- **Duelos / Defendendo / Goleiro:** tela com **donuts** (desarmes ganhos %, dribles %,
  duelos aéreos) usando desarmes/interceptações/GK já calculados.
- **Passes por zona:** agregar `passesPorJogador`/`posseZonas` em % por terço (defensivo/
  meio/ofensivo) + "entradas no terço final".
- Arquivos: novo `src/components/match/CampoEscalacao.tsx`, `Donut.tsx`; `MatchResult`.
- Risco: baixo/médio (agregações puras, testáveis).

### 🌊 Onda 3 — Insights pré/pós‑jogo *(motor leve + UX)*
- **Probabilidade de resultado** determinística (vitória/empate/derrota) a partir de
  `calcularForcaTime` + mando + forma — exibir no **Pré‑jogo** e no Resumo.
- **Sequências/forma:** painel com invencibilidade, ambas marcam, primeiro a marcar,
  aproveitamento — derivado da tabela/histórico.
- (Opcional) "Provável artilheiro" ponderado por finalização/forma.
- Arquivos: novo `src/engine/simulation/probabilidadeResultado.ts` (+ teste determinístico),
  `src/screens/PreJogo/*`.
- Regra de ouro: **determinístico** (sem `Math.random`/`Date.now` na engine).

### 🌊 Onda 4 — Mapa de finalizações + heatmap *(motor novo — maior esforço)*
- Estender o evento de chute para carregar **coordenada (x,y) + xG do chute** e pé/tipo.
- **Mapa de chutes:** baliza + terço de ataque com dots (tamanho = xG), filtro por time/tempo.
- **Heatmap / posicionamento médio:** acumular posição por jogador por minuto (grade leve)
  → mapa de calor individual e posição média na formação.
- Arquivos: `src/engine/simulation/matchSimulator.ts`, `matchStats.ts`, `src/types/match.ts`
  (+ **migração de save** e testes de determinismo/estatística).
- Risco: **alto** — mexe no coração da simulação. Só entrar com testes de balanceamento
  cobrindo antes/depois (ver `CLAUDE.md §14`). Congelar assinatura de save.

### 🌊 Onda 5 — Campo 2D ao vivo *(polimento, opcional)*
- No `MatchSimulation`, expor a "zona do minuto" como coordenada e mover a bola no campo 2D
  com rótulo "Ataque perigoso / Zona segura". Puramente cosmético sobre dado existente.

---

## 4. Ajustes / tweaks pontuais (rápidos, fora das ondas)
- **Cabeçalho de partida persistente** (bandeiras/escudos + placar + minuto + abas), como no
  Sofascore — hoje a navegação é por telas separadas.
- **Filtro `Todos · 1º tempo · 2º tempo`** em estatísticas e comentário (a engine já tem o
  minuto de cada evento).
- **Notas coloridas por faixa** (ex.: <6 vermelho, 6–7 neutro, 7+ verde) padronizadas.
- **"Grandes chances"** e **"chances claras perdidas"** como destaque no Resumo (dado existe).
- **Ordenação do elenco** (idade/valor/overall/altura) nas telas de Escalação e Mercado.

---

## 5. Fora de escopo (não implementar)
- ⛔ **Odds/apostas** (Betano etc.) — o FOTEBALL não é jogo de apostas.
- ⛔ **Onde assistir / streaming / audiência ao vivo** — irrelevante offline.
- ⛔ **Mídia/replays em vídeo** — inviável num simulador; o equivalente é o **comentário rico**
  (Onda 1) e, no futuro, um "replay 2D" leve (não priorizar).

---

## 6. Riscos e princípios
- **Determinismo é sagrado** (`CLAUDE.md R‑01/R‑02`): toda estatística/insight nova sai de
  seed controlada; mesma seed = mesmo hub.
- **Save/compatibilidade:** Ondas 1–3 não tocam no save. **Onda 4 exige migração** — nunca
  quebrar saves antigos (campos novos opcionais + fallback, como já feito em `match.ts`).
- **Medir balanceamento antes/depois** de mexer na simulação (Onda 4).
- **Incremental:** uma onda por branch, com typecheck+lint+test verdes e resumo de entrega.

---

## 7. Recomendação de arranque
Começar pela **Onda 1** (maior valor percebido, risco ~zero, dado 100% pronto): a partida
passa a "parecer Sofascore" só reorganizando a súmula em abas e exibindo os stats que já
existem. Branch sugerida: `feat/match-hub-abas`.

*Briefing gerado a partir da análise quadro‑a‑quadro do vídeo de referência. As telas de
apostas/streaming foram deliberadamente descartadas.*

# ADR-001 — Engine causal de partidas V2 (posse → chance → chute → xG → placar)

Data: 2026-07-16 · Branch: `feat/design-system-v2` · Status: implementado

## Contexto

A engine V1 tinha boa calibração agregada, mas **sem cadeia causal por
partida**: o gol era sorteado por probabilidade por minuto (sem chute
anterior), o volume de chutes vinha de um RNG paralelo em `matchStats`, a
posse era ajustada retroativamente pelos eventos do minuto, o xG era um
hazard por minuto (incluindo o multiplicador de reação ao placar) e o mapa de
finalizações era reconstruído após o jogo.

Medição do baseline V1 (laboratório, `docs/engine/baseline-v1-raw.txt`):

- correlação **xG×gols = −0.19** (o "xG" media reação ao placar, não criação);
- **100% dos gols sem chute vinculado**;
- posse inflada (gap +11 de overall → 70% de posse média).

## Decisão

Cadeia única por minuto, em `src/engine/simulation/`:

```
contexto (forças atuais, fatorTempo, fatorUrgenciaPlacar)
→ posse de CONTROLE            (causal/posseEngine — decidida ANTES dos lances)
→ criação de chance             (causal/chanceEngine — taxa = xgAlvo ÷ xG médio,
                                 acoplada à posse e ao estilo tático)
→ ChutePartida factual          (autor, criador, zona, corpo, pressão, xG)
→ resolução vs goleiro          (causal/xgModel — conversão = xG × finalizador
                                 × goleiro; VAR opera sobre o gol existente)
→ placar / eventos / ledger     (evento de gol carrega chuteId)
→ reducers                      (matchStats — SEM RNG esportivo)
→ Momentum                      (causal/momentumEngine — pressão recente
                                 com decaimento exponencial)
```

Parâmetros centralizados em `causal/matchModelConfig.ts`; probabilidades-base
por força/tática/mando continuam em `probabilityCalc.ts`, que agora expõe
`xgBase*PorMinuto` **sem** o efeito do goleiro (o goleiro age na resolução do
chute — aplicar nos dois pontos dobraria o efeito).

### Streams de RNG (mesma seed ⇒ mesma partida completa)

| Stream | Papel |
|---|---|
| `rng` (eventos) | chances, chutes, resolução, VAR, cartões, pênaltis, lesões |
| `rngPosse` | disputa de controle do minuto (1 consumo/minuto) |
| `rngEstatisticas` | APRESENTAÇÃO (clima/temperatura) — proibido de criar fatos |
| `rngSubs` | substituições da IA |

### Convenções documentadas

- **No alvo** = `gol` + `defesa` (trave NÃO conta — nova convenção V2).
- **Gol anulado (VAR)**: o chute fica no ledger como `gol_anulado`, mas sai
  das estatísticas (finalizações/xG) e do mapa. Efeito colateral aceito: o xG
  agregado supera os gols em ~5% (o VAR remove gols de chutes convertidos);
  tolerância registrada no laboratório.
- **Grande chance** = oportunidade com `xg ≥ 0.24` (RN-05: o resultado não
  reclassifica a chance).
- **Posse medida** = posse de controle + crédito por sequência ofensiva que
  terminou em chute (`creditoSequenciaChute`). O crédito é idêntico com gol
  ou sem gol — função da CHANCE, nunca do resultado (PI-04 continua morto).
- **Gol contra**: `ChutePartida.golContra`, `jogadorId` = defensor adversário,
  `timeId` = quem marcou; não credita finalização a jogador.
- **Falta direta**: conversão média ~4.5% alinhada ao `xgFaltaDireta` (CA-17);
  gol de falta ~1 a cada 9 jogos (taxa real de futebol; antes 1/40 e xG 6×
  descolado da conversão).
- **Flags estruturadas** em `EventoPartida` (`anuladoVAR`, `varFlagra`,
  `falhaGoleiro`, `falhaDefesa`, `segundoAmarelo`, `chuteId`) substituem o
  parsing de `descricao` na UI (regex mantida apenas como fallback legacy).
- `fatorMomentum` (urgência de placar) renomeado para `fatorUrgenciaPlacar` e
  aplicado à CRIAÇÃO de chances — nunca ao Momentum visual.

### Momentum de ataque

Pressão recente por lado: cada ação real soma ameaça (chute = piso + próprio
xG; escanteio; falta perigosa; pênalti; território), com decaimento
`exp(−1/2.5min)` (janela ~150s, faixa 120–240s do documento). Amostra do
minuto = `tanh(Δpressão / escala)`. O gol NÃO ganha bônus extra (CA-07) — na
UI ele é um MARCADOR no minuto (ponto), separado da altura da barra; o
gráfico ao vivo ganhou divisória dos 45'.

### Persistência e compatibilidade

- `Partida` ganhou campos OPCIONAIS: `engineVersion`, `qualidadeDados`
  (`legacy` | `causal_full` | `causal_summary`) e `chutes: ChutePartida[]`.
  Mesmo padrão aditivo usado quando `estatisticas`/`titulares*` nasceram —
  `VERSAO_SAVE` permanece 2 (schema do snapshot inalterado; saves antigos
  abrem e suas partidas ficam `legacy`, sem dados fabricados).
- Partida do usuário (ao vivo ou simulada): `causal_full` (ledger completo).
- Partidas da IA: `enxugarEstatisticasIA` vira `causal_summary` — mantém os
  chutes que contam a história (gols, defesas, traves, anulados e grandes
  chances) e descarta chutes de rotina; os AGREGADOS por time preservam tudo.
  O resumo nunca altera placar/estatísticas — só o que fica no save.
- Jogos de fundo (Série D/grupos via `placar.ts` Poisson) seguem `legacy`.
- Tamanho medido no laboratório: partida FULL ~12.5 KB (V1 ~5.0 KB);
  IA resumida ~metade do ledger. Coordenadas arredondadas a 3 casas.

### UI honesta (RF-11)

`obterFinalizacoesPartida(partida, posicoes)` é a fachada única do mapa e do
replay: V2 → chutes factuais (`factual: true`); legacy → reconstrução
determinística com selo "posições estimadas" na tela. O replay de gol ancora
nas mesmas finalizações (portanto em coordenadas reais nas partidas V2).

## Resultados (laboratório, mesmos cenários do baseline)

| Métrica (parelho 75×75) | V1 | V2 |
|---|---:|---:|
| Gols/jogo | 2.92 | ~2.88 |
| Casa/Empate/Fora | 46/26/28 | 47/25/28 |
| Goleadas (3+) | 12.3% | ~9.8% |
| Chutes/jogo | 25.4 | ~25.7 |
| No alvo | 40.3% | ~41.5% |
| Correlação xG×gols | **−0.19** | **+0.39** |
| Correlação chutes×gols | 0.31 | 0.25–0.37 |
| Correlação posse×gols | 0.14 | 0.10 |
| Gols sem chute vinculado | 1168/1168 | **0** |
| Falhas de invariantes causais | n/a | **0** |
| Calibração xG por faixa | n/a | erro ≤ 2.5pp (todas as faixas) |
| Tempo/partida | ~9.5 ms | ~10 ms |

Ordem causal correta emergiu: **xG > chutes > posse** na previsão do placar
(CA-18), como no futebol real. Zebras continuam vivas (jogos com 20+ chutes
sem gol e xG alto sem gol existem e são auditáveis pelo ledger).

## Laboratório (RF-19)

`src/engine/lab/` — `simLab.ts` (métricas, invariantes, casos extremos,
calibração de xG por faixa) + `fixtures.ts` + `__tests__/simLab.test.ts`
(cenários padrão; aumente `AMOSTRA_BASE` para rodadas de calibração).
Baseline V1 congelado em `baseline-v1-raw.txt`.

## Limitações reais

- xG agregado ≈ +5–7% sobre gols (efeito VAR documentado acima).
- Passes/dribles/desarmes/cruzamentos continuam derivação determinística da
  posse e atributos (volume), não ação-a-ação — dentro do permitido pelo
  documento (ações internas sem tela própria); o ledger persiste apenas chutes.
- `momentumPorMinuto` de jogos da IA continua descartado no save (decisão de
  produto preexistente; nenhuma tela exibe momentum de jogo da IA).
- Pênaltis interativos do usuário seguem o fluxo atual da tela (a engine
  continua emitindo `penaltiData` idêntico).

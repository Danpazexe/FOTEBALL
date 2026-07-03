# ROADMAP — FOTEBALL

> Prioridades do plano: **1)** narração/imersão de partida (sensação manager) · **2)** engrossar funcionalidades rasas · **3)** consistência/dívida técnica · **4)** conteúdo/dados.
> Esforço: **P** (pequeno, <1 sessão) · **M** (médio, 1–2 sessões) · **G** (grande, 3+ sessões).

---

## Fase 1 — Próximas sessões (a partida ganha voz)

| # | Item | O que fazer | Impacto | Esforço |
|---|------|-------------|---------|---------|
| 1.1 | **Ligar a narração ao feed ao vivo** | `narrativeTemplates.ts` gera frases que nunca aparecem: `LanceLimpo.tsx` renderiza `{autor ?? descricao}` e `autor` é sempre definido. Exibir a frase narrada no lance (ou num ticker acima do feed) e nos marcos de início/intervalo/fim. | Alto | P |
| 1.2 | **Painel de estatísticas ao vivo** | `estado.estatisticas` já acumula xG, finalizações e momentum minuto a minuto — exibir chutes/xG/barra de pressão durante a partida, não só no pós-jogo. | Alto | P |
| 1.3 | **Promover lances "quase" a eventos do feed** | Escanteios/impedimentos já sorteados em `matchStats.ts` (RNG próprio) viram eventos narrados; ligar o tipo morto `falta_cobranca` no `matchSimulator.ts` e aumentar frequência de chances narradas — hoje o feed tem ~2–4 lances em 90'. | Alto | M |
| 1.4 | **Templates com contexto + coerência de pênalti** | Ampliar acervo (7 gols hoje) com variantes por placar/minuto (gol de empate, gol aos 89'), citar assistente quando existir e corrigir pênalti convertido caindo em `TEMPLATES_GOL` de jogo aberto. | Alto | M |
| 1.5 | **Animações de evento + fix R-07 na partida** | Entrada com slide-in/fade por lance e flash de gol em **reanimated**; migrar o pulso do placar de `Animated` nativo (MatchSimulation, ScoreHeader, feedback) para reanimated. | Alto | M |
| 1.6 | **Haptics nos momentos-chave** | Adicionar `react-native-haptic-feedback` (hoje zero vibração no app): gol, pênalti, vermelho, apito final, confirmação de contratação. | Alto | P |
| 1.7 | **Feed de notícias na Home** | `state.mensagens` já é alimentado em ~15 pontos do store e nenhuma tela lê — renderizar o feed na Home (transferências IA, renovações, copa, cota de TV). | Alto | P |
| 1.8 | **Seed de partida conforme a spec** | Trocar `rodada*1000+index` por `temporada×10_000 + rodada×100 + index` (useGameStore:1138/1314, MatchSimulation:154) para temporadas não clonarem resultados; alinhar `processarPropostasIA`. | Alto | P |

## Fase 2 — Engrossar o loop manager

| # | Item | O que fazer | Impacto | Esforço |
|---|------|-------------|---------|---------|
| 2.1 | **Prorrogação e pênaltis do mata-mata ao vivo** | Empate na Copa hoje resolve `disputarPenaltis()` invisível num useEffect; jogar 91'–120' na tela (engine já suporta) e narrar cobrança a cobrança. | Alto | M |
| 2.2 | **Acréscimos 45+X / 90+X** | Substituir `DURACAO = 90` fixo por acréscimos sorteados com seed — gol aos 90+3 e placa de acréscimo. | Médio | M |
| 2.3 | **Intervalo com resumo + preleção** | Mostrar estatísticas do 1º tempo (já acumuladas) e team talk com efeito na moral, usando o sistema de moral existente. | Médio | M |
| 2.4 | **Pausa dramática em gol/pênalti** | Teaser ("bola na área..."), revelação com atraso e opção de pausa automática em gol sofrido para reagir com substituição. | Médio | M |
| 2.5 | **Folha salarial por rodada** | Hoje salários saem 1x/ano (`aplicarAcertoFinanceiroAnual`) e a economia é trivialmente superavitária; debitar folha por rodada/mês e rebalancear receitas para 'salário atrasado' voltar a existir. | Alto | M |
| 2.6 | **Contratos que expiram de verdade** | `contratoAte` hoje é só UI: no fim da temporada, jogador vencido vira agente livre (Bosman), IA renova os seus e rivais assediam quem está no último ano. | Alto | M |
| 2.7 | **Janelas de transferência** | Janela de início + meio de temporada, deadline day e propostas represadas fora do período — mercado hoje é aberto o ano inteiro. | Alto | M |
| 2.8 | **Objetivos de temporada da diretoria** | Meta declarada na abertura (título/acesso/fugir do Z4/fase da Copa), cobrança no meio do ano e bônus/confiança por cumprir — hoje só há demissão reativa. | Alto | M |
| 2.9 | **Persistir partidas da Copa** | `avancarFaseCopa` descarta eventos/estatísticas: salvar em `state.partidas` e rodar `aplicarResultadoNosJogadores` (súmula, artilharia, desgaste, suspensão) — copa hoje não cansa ninguém. | Alto | M |
| 2.10 | **Tabela completa com forma recente** | Adicionar V/E/D, GP/GC (já calculados em `classification.ts`) e sequência dos últimos 5 jogos (V-E-D) derivada de `state.partidas`. | Médio | P |
| 2.11 | **PreJogo com scouting real** | Escalação/formação provável do adversário, desfalques deles, clima e público esperado antes da bola rolar. | Médio | M |
| 2.12 | **NOVATO com força oculta** | Implementar `revelarNovato`: overall exibido como faixa/incógnita até X jogos, criando a aposta de scouting prometida na spec. | Médio | M |
| 2.13 | **Propostas com narrativa e contraproposta** | Exibir prazo (`expiracaoRodada`), permitir pedir mais como vendedor e reação de moral do jogador cobiçado. | Médio | M |

## Fase 3 — Grandes sistemas e conteúdo

| # | Item | O que fazer | Impacto | Esforço |
|---|------|-------------|---------|---------|
| 3.1 | **Pênalti interativo do usuário** | Usar `penaltiPendente`/`PenaltiResultado` (tipos já prontos, nunca usados): escolher canto/altura/potência estilo Brasfoot em partida ao vivo e na disputa de pênaltis. | Alto | G |
| 3.2 | **Tela de Saves multi-slot** | `src/screens/Saves/` está vazia e o save é slot único; slots com metadados (clube, temporada, data), backup e export/import sobre o `persistence.ts` atual. | Alto | G |
| 3.3 | **Simular divisões paralelas** | Gerar calendário/tabela das outras séries (hoje ranqueadas por força no fim do ano) para o mundo fora da divisão do usuário ficar vivo e consultável. | Alto | G |
| 3.4 | **Copa do Brasil real** | 5 fases (spec), ida e volta a partir da 3ª fase, classificação por mérito e zebras de divisões inferiores; creditar premiação também aos clubes IA. | Médio | M |
| 3.5 | **Série C com grupos + mata-mata** | Usar o tipo `copa_grupos` (declarado e nunca usado) para o formato real da Série C, em vez do round-robin de 38 rodadas. | Médio | G |
| 3.6 | **Áudio ambiente de estádio** | Loop de torcida com crescendo atrelado ao momentum/pressão — hoje só há 10 efeitos one-shot e silêncio entre eventos. | Médio | G |
| 3.7 | **Vestiário que responde** | Conversas individuais, insatisfação por banco (minutos já rastreados), promessas em renovação e pedidos de saída. | Médio | G |
| 3.8 | **Curadoria do seed** | Corrigir salários do Flamengo (~4x abaixo dos pares), craques estilo FIFA (Neymar ~88, hoje OV 72 e teto 86), saldos diferenciados por porte e estádios reais para os 35 clubes genéricos. | Alto | M |
| 3.9 | **Economia com alavancas** | Orçamento/teto salarial da diretoria, patrocínios dinâmicos com bônus por desempenho (hoje fallback estático `reputacao×80k`) e programa de sócio-torcedor. | Médio | M |
| 3.10 | **Estaduais (jan–mar)** | Preencher a janela vazia antes da liga (`ANCORA_MES_DIA = '-04-06'`) com estaduais — identidade Brasfoot. | Médio | G |

---

## Inconsistências a corrigir

- **`venderJogador` cria dinheiro do nada** — jogador vira free agent e o saldo entra sem contraparte; exigir comprador real (mercado de propostas já conserva dinheiro) e mover `precoVenda` do store para a engine.
- **IA propõe compra sem checar o próprio saldo** (`processarPropostasIA`) — aceitar pode jogar clube IA em saldo negativo; aplicar o filtro de `mercadoIA.ts` (saldo ≥ valor + mínimo).
- **Reputações invertidas no seed** — grandes da Série A = 50, Série B até 78: inverte patrocínio fallback, bônus de mando e IA de vendas. Corrigir junto com 3.8.
- **Violação R-07** — `Animated` nativo em `MatchSimulation/index.tsx`, `ScoreHeader.tsx` e `feedback/index.tsx` (coberto em 1.5).
- **CLAUDE.md descreve um projeto que não existe** — 12 de 20 funções citadas não existem, estrutura/valores divergem; reescrever apontando para `ARQUITETURA.md`.
- **`useGameStore.ts` com 2859 linhas** — regras de negócio inline (valuation de venda, aceitação de renovação, política de propostas IA) sem teste unitário; extrair para engine e retomar o plano de slices.
- **Código/tipos mortos** — `falta_cobranca` sem gerador, `penaltiPendente` e `instrucoesIndividuais` nunca lidos/escritos, componentes órfãos em `src/components/MatchNarration/` (EventItem, ScoreHeader, Placar).
- **Contraste abaixo de WCAG AA** — `textoMuted #9AA4B5` (~2.5:1) e `textoSecundario #7C8698` (~3.7:1) usados nos menores tamanhos; escurecer os 2 tokens resolve o app inteiro.
- **`historicoTransacoes` capado em 40 entradas** — donuts de Receitas/Despesas da tela Club subestimam a temporada.
- **Versão hardcoded** — "v0.0.1" no MainMenu (projeto está na v0.0.3) e comentário falso em Settings ("persistência em memória"; existe SQLite).
- **Polimento visual pendente** — glows coloridos que contradizem o theme "clean", margem lateral 8px vs 16px (ScreenContainer sem padding no modo não-scroll), empty states de 12px sem ícone/CTA em 13 telas, `Painel` renderiza gradiente 1 frame depois (onLayout), zero `accessibilityLabel`/font scaling, 185 `fontSize` hardcoded.

---
*ROADMAP.md · gerado em 2026-07-01 · revisar prioridades a cada fase concluída*

---

## Imersão visual — Faces dos jogadores (pesquisa 2026-07)

Duas rotas, que podem coexistir:

| Rota | Fonte | Como | Licença |
|------|-------|------|---------|
| **Fotos reais** | sortitoutsi Cut-Out Player Faces Megapack — https://sortitoutsi.net/graphics/style/1/cut-out-player-faces (Brasil: `/graphics/browse/1/191`) | ~550k PNGs 250×250; download em lote via torrent ou repo GitHub `manuelinfosec/faces-download-fm` | ⚠️ Copyright de agências (Getty/IMAGO) + direito de imagem (Lei Pelé art. 87-A). **Não empacotar no app distribuído** — modelo Brasfoot: o app suporta "facepack" que o usuário importa manualmente |
| **Avatares procedurais** (recomendada como padrão) | Componente próprio `<FaceJogador seed={jogador.id}>` em camadas SVG via `criarRNG(seed)` existente (ou DiceBear, CC0) | Zero assets, mesma cara sempre para o mesmo jogador, cobre novatos gerados pela engine, 100% offline | Risco zero |

**Plano:** implementar `<FaceJogador>` procedural como padrão + pasta de facepack opcional (`Documents/faces/<jogadorId>.png` sobrepõe o avatar).

## Conteúdo — Dados REAIS do seed (pesquisa 2026-07)

Pipeline para regenerar `src/data/clubes.json` e `jogadores.json` com a temporada 2025/26 real:

1. **Elencos A/B/C** (nome, posição, idade, valor de mercado): Transfermarkt via API local `felipeall/transfermarkt-api` (Docker) — única fonte com Série C jogador a jogador.
2. **Overall estilo FIFA (A/B)**: pesdb.net — eFootball 2026 tem Brasileirão A e B licenciados pela CBF; escala igual FIFA (craques ~85–90).
3. **Série C e sem match (~20-30%)**: regressão `overall = a + b·ln(valorEUR)` calibrada nos pares TM×PESDB das séries A/B; âncoras: topo da A → 87–89, mediana A → 74, B → 68, C → 61, piso → 52; ajuste ±2 por idade (pico 25–29).
4. **Estádios** (nome/capacidade): wikitables da Wikipédia pt (CC BY-SA).
5. **Gerador**: `scripts/gerarSeed.ts` (Node/TS + zod) emite os JSONs nos tipos de `domain.ts`; scrapers nunca entram no app — o jogo segue 100% offline. Lembrar: overall do seed = `calcularOverall − 5`.

Esforço estimado: **2–4 dias**, custo zero. Também corrige de tabela: reputações invertidas, salários do Flamengo ~4× abaixo, estádios genéricos (itens 3.8 e "Inconsistências").
Jurídico: uso pessoal/portfólio = risco baixo; publicação comercial = nomes fictícios + patches da comunidade.

## Pacote imediato sugerido (maior impacto ÷ esforço)

1. **1.1 + 1.2 + 1.6** — narração ligada ao feed, estatísticas ao vivo na partida e haptics: transforma a sensação de jogo numa sessão.
2. **1.7 + 1.8** — notícias na Home + seed por temporada: dois quick-wins de coerência de mundo.
3. **`<FaceJogador>` procedural** — imersão imediata sem risco legal, prepara o terreno para o facepack.
4. **Piloto de dados reais (Série A)** — validar o pipeline com 20 clubes antes de B/C.

## Feito recentemente (não refazer)

Posse dinâmica real · estatísticas avançadas completas (xG/xA, passes por jogador, zonas, momentum) · súmula SofaScore com abas · substituições da IA (lesão/fadiga/placar) · falta+cartão no pênalti · aba Rodada ao vivo (placares da rodada) · sons por evento (10 áudios) · tema claro no app inteiro · sombras clean · narração clean por lado · escalação do apito persistida · público real da bilheteria · 4 fixes do review adversarial.

> Nota de performance: o stress de 200k partidas subiu de ~4min para ~27min com as estatísticas por minuto — otimizar `matchStats.ts` (caches de médias por escalação) quando conveniente.

# FOTEBALL — Arquitetura do Código (v0.0.1)

> Referência técnica do **que existe no código** (a implementação real, não a spec ideal).
> Gerada por leitura completa da base em 2026-06-20 · ~22.5k LOC · 35 suítes de teste.
> Spec de domínio: `BRASFOOT_MASTER.md` · Regras de engenharia: `CLAUDE.md` / `FOTEBALL_SKILL.md`.

FOTEBALL é um **jogo de gerência de futebol brasileiro** (estilo Brasfoot) em React Native CLI.
O jogador assume um clube, disputa o Brasileirão (Séries A/B/C) + Copa do Brasil, monta o time a
cada partida, treina, negocia no mercado, administra finanças e carreira — buscando acesso e
fugindo do rebaixamento e da demissão.

**Diferencial técnico:** a partida é simulada **minuto a minuto** com **seed determinístico** —
mesma seed → mesmo resultado. Substituições em tempo real recalculam a força do time.

---

## Visão geral

### Stack
| Camada | Tecnologia |
|---|---|
| App | React Native 0.86 CLI · React 19.2 |
| Linguagem | TypeScript 5.8 strict |
| Estado | Zustand 5 |
| Persistência | @op-engineering/op-sqlite 16 (save local em JSON) |
| Animações | react-native-reanimated 4 |
| Gráficos | react-native-svg 15 |
| Ícones | react-native-vector-icons / MaterialCommunityIcons |
| Áudio | react-native-sound |
| Navegação | @react-navigation v7 (native-stack + bottom-tabs) |
| Testes | Jest 29 + @testing-library/react-native |
| CI | GitHub Actions (typecheck · lint · jest) |

### Princípios de arquitetura
- **`src/engine/` é lógica pura**: zero React, zero `Math.random` (usa `criarRNGComSeed`), zero `Date.now` (timestamps via parâmetro).
- **Determinismo** em toda aleatoriedade (mulberry32 semeado) → testável, reproduzível, paridade entre jogo simulado e ao vivo.
- **Estado de domínio só via Zustand** (`useGameStore`); `useState` apenas para UI local.
- **Nomenclatura**: domínio de negócio em **PT-BR** (`calcularForcaEfetiva`), infra/técnico em **EN** (`handlePress`).

### Números da base
- **46** arquivos de engine · **12** de store · **23** telas · **22** componentes
- **60 clubes** (20 por divisão A/B/C) · **~1.8k jogadores** no seed (≈30 por clube)
- **35 suítes de teste** (engine pura + store + e2e de temporada + stress de 200k jogos)

### Mapa de diretórios
```
src/
├── engine/            # Lógica pura (ZERO React)
│   ├── simulation/    # rng, teamStrength, probabilityCalc, matchSimulator, matchRating, narrativeTemplates
│   ├── tactics/       # posicoes, geometria, adaptacao, validacao
│   ├── progression/   # overall, playerProgression, treinoTipos, treinoAtributos, academiaEngine, moralEngine, habilidades
│   ├── season/        # calendarGenerator, classification, copaEngine
│   ├── finance/       # financeEngine
│   ├── transfers/     # negociacaoEngine, transferAI
│   ├── carreira/      # carreiraEngine
│   └── conquistas/    # verificadorConquistas
├── store/             # useGameStore (principal), useAchievementsStore, selectors, persistence, saveMigrations
├── screens/           # ~24 telas
├── components/        # ~22 componentes reutilizáveis
├── navigation/        # RootNavigator (pilha) + TabNavigator (abas) + types
├── types/             # player, club, match, competition, carreira, index
├── data/              # seed/clubes, seed/jogadores, estadios, conquistas, imprensa, nomesBase
├── api/database/      # db (op-sqlite), saveStorage, seed/loadSeed, seed/defaults
├── utils/ · theme/ · audio/ · assets/ · testing/(fixtures)
```

### Core loop (resumo)
```
INICIAR CARREIRA → [ TREINO obrigatório → (Coletiva) → JOGO (simulado ou ao vivo) →
PÓS-JOGO: moral + condição + finanças + carreira (reputação/demissão) → MERCADO/IA →
próxima rodada ] ×38 → FIM DE TEMPORADA: acesso/rebaixamento + cota de TV + evolução +
academia + nova Copa → próxima temporada (ou DEMISSÃO → recontratação por outro clube)
```

### Índice
1. Simulação de Partida & Táticas
2. Progressão, Treino, Moral, Habilidades & Conquistas
3. Temporada, Copa, Finanças, Mercado & Carreira
4. Estado do Jogo (Store Zustand) & Persistência
5. Interface: Navegação, Telas & Componentes
6. Tipos de Domínio, Dados/Seed, Utils & Infraestrutura
7. Testes & Qualidade
8. Estado da v0.0.1

---

## 1. Simulação de Partida & Táticas

### 1.1 Pipeline
`simularPartida()` encadeia: RNG semeado (`criarRNGComSeed`) → força efetiva por linha
(`calcularForcaTime`) → probabilidades por evento (`calcularProbabilidades`) → loop 1'–90'
(`simularMinuto`, recalculando contexto a cada minuto) → desempate opcional (prorrogação 91'–120'
+ pênaltis `disputarPenaltis`). Cada minuto recalcula expulsões/lesões/fadiga, então substituições
e táticas do usuário refletem no resto do jogo.

### 1.2 RNG determinístico (`src/engine/simulation/rng.ts`)
- `criarRNGComSeed(seed)` (`rng.ts:5`): mulberry32 puro com estado interno; normaliza para [0,1).
- `hashString()` (FNV-1a 32-bit): deriva seed estável a partir de IDs de partida.
- `inteiroEntre()`, `limitar()`: helpers de inteiro e clamp.
- Garantia: mesma seed → mesma sequência de eventos.

### 1.3 Força efetiva (`src/engine/simulation/teamStrength.ts`)
`ForcaTime = {ataque, meio, defesa, forcaGoleiro, overall}`.
- **Contribuição do jogador** (`teamStrength.ts:60-89`): `max(1, overall × fatorAdaptacao) × fatoresEstado`.
  - `fatorAdaptacao` (de `adaptacao.ts`): penalidade por jogar fora de posição [0.5–1.0].
  - `fatoresEstado`: **preparo** escalonado (`fatorPreparo`, `teamStrength.ts:43`: ≥80→1.0, 60-79→0.9, 40-59→0.75, 20-39→0.55, <20→0.35) × **moral** (`0.9 + moral/100 × 0.2` = ±10%) × **forma** (`1 + forma×0.02`).
- **Goleiro** isolado (`teamStrength.ts:96`): `overall×0.5 + reflexos×0.3 + posicionamento×0.2`, ponderado.
- **Linhas** (`calcularForcaTime`, `teamStrength.ts:112`): média por linha (ataque/meio/defesa); desvantagem numérica (10 homens) multiplica todas as linhas por `presentes/titulares`.
- **Multiplicadores táticos** (`teamStrength.ts:183-211`): estilo ofensivo (Posse de bola: meio×1.06/ataque×0.96; Contra-ataque: ataque×1.06/defesa×1.04/meio×0.92; Ataque direto: ataque×1.08/meio×0.96/defesa×0.95), marcação (Pressão alta: meio+defesa×1.04; Individual: defesa×1.02), linha defensiva (Adiantada: ataque×1.05/defesa×0.92; Recuada: inverso).
- **Bônus de habilidades** dos titulares (teto +6) somado ao overall.
- `overall = ataque×0.35 + meio×0.35 + defesa×0.3 + bonusHabilidades`.

### 1.4 Probabilidades por evento (`src/engine/simulation/probabilityCalc.ts`)
Converte diferença de força em probabilidade por minuto.
- **Gols esperados** (`probabilityCalc.ts:139`): base 1.78 (casa) / 1.54 (fora) + `diferencaCasa` (assimétrica: casa +0.025, fora −0.018) + `(ataque−defesa)×0.01` + `modMatchup` (pedra-papel-tesoura tático: Contra-ataque>Posse +0.16; Pressão alta pune Posse −0.12; Ataque direto>Linha adiantada +0.12, mas −0.10 contra Recuada) × **mando** (1.0–1.22, de estádio+reputação) × fator de ritmo × fator do goleiro adversário (`clamp(1 − (forcaGol−70)/250, 0.82, 1.15)`). Clamp final [0.45, 4.0] casa.
- **Cartões** (`:18`): base 0.0045/min; Pressão alta +0.25, Individual +0.15, Intenso +0.12; defensores pesam 2×.
- **Pênaltis** (`:40`): base 0.0013/min ao ofensor, modulado pela marcação adversária.
- **Lesões** (`:54`): base 0.00035/min, Intenso ×1.35.
- **Chances**: proporcional aos gols esperados.

### 1.5 Loop minuto-a-minuto (`src/engine/simulation/matchSimulator.ts`)
- Estado: `rng`, placar, eventos, amarelos por jogador, indisponíveis (expulsos/lesionados), `condicaoAtual` (fadiga dinâmica), minuto.
- `simularMinuto()` (`:538`): incrementa minuto → aplica **fatorTempo** (+10% nos últimos 20') e **fatorMomentum** (perdedor empurra; vencedor administra após 70') → gera gols, cartões (2º amarelo expulsa), pênaltis, lesões, chances → **fadiga** (decai condição em campo, piso 40).
- **Seleção ponderada de autor** (`escolherJogadorPonderado`, `:116`): gol = `pesoGol(posicao) × (finalizacao/70) × fatorPesoGol(habilidades)` (CA=6, PD/PE/SA=4, MEI/MC=2); assistência (~70% dos gols) = `pesoAssistencia × fatorPesoAssistencia`; cartão pondera desarme; lesão pondera baixa condição.
- **Pênalti** (`simularPenalti`, `:260`): conversão `clamp(0.78 + (finalizacao − qualidadeGoleiro)/320, 0.55, 0.93)`; goleiro com `GOLEIRO_PENALTI` soma +30 à qualidade.
- **Desempate** (`:647`): prorrogação + `disputarPenaltis` (5 cobranças + morte súbita), conversão `clamp(0.55 + hab/300, 0.6, 0.85)`.

### 1.6 Táticas (`src/engine/tactics/`)
- **`adaptacao.ts`** — `fatorAdaptacao()`: principal=1.0, secundária=0.95, GOL↔linha=0.5, terço oposto (defesa↔ataque)=0.6, senão por distância no grafo (0.92→0.65). `nivelAdaptacao()` rotula natural/similar/adaptado/improvisado.
- **`posicoes.ts`** — `META_POSICOES` (grupo/linha/coordenada por posição) + grafo `ADJACENCIA_GRUPOS` (BFS `distanciaGrupos`). ZAGUEIRO não é vizinho direto de VOLANTE (passa por LATERAL).
- **`geometria.ts`** — converte coordenadas livres (x/y ∈ [0,1]) ↔ posições discretas; `posicaoPorCoordenada()`, `detectarFormacao()` ("4-4-2"…), `layoutPorLinhas()`, `preencherCoordenadas()` (puro).
- **`validacao.ts`** — `validarEscalacao()`: erros (1 GOL, 11 titulares, ≥3 def, ≥2 meio, ≥1 ata, sem repetidos); avisos (titular lesionado/suspenso, slot vazio).

### 1.7 Notas e narrativa
- **`matchRating.ts`** — `calcularNotaPartida()` determinística: base 6.0 + gols×0.8 − amarelo×0.3 − vermelho×1.5 + bônus resultado/clean-sheet, clamp [3,10].
- **`narrativeTemplates.ts`** — `narrarEvento()`: template determinístico por `minuto×31 + hash(jogadorId)`, com placeholders.

---

## 2. Progressão, Treino, Moral, Habilidades & Conquistas

### 2.1 Progressão por idade (`src/engine/progression/playerProgression.ts`)
Curva de força por idade (`:29`): **jovem** (<21, multiplicador 2.0×/<19, 1.5×/19-20), **desenvolvimento** (21-24, crescimento moderado), **auge/pico** (25-29, plateau), **pré-declínio** (30-32), **veterano** (≥33, declínio). Delta anual:
- jovem: `min(3, max(0.5, margem×0.15)) × multJovem + bônusInfra`
- desenvolvimento: `min(2, max(0, margem×0.12)) + (desempenhoBom ? 0.5 : 0)`
- auge: +1 se desempenho bom, senão 0 · veterano: −1 (joga bem) / −2 (encostado) · pré-declínio: 0 / −0.5
- `desempenhoBom` = ≥20 jogos e nota ≥7; overall ≤ potencial sempre.
- `fatorValorPorIdade` (`:12`): ≤23→1.04, 24-29→1.0, 30-32→0.95, 33-34→0.88, ≥35→0.78.

### 2.2 Overall por posição (`src/engine/progression/overall.ts`)
`overall = Σ(atributo×peso)/Σpesos`, clamp [1,99]. Pesos por grupo (ex.: GOL = reflexos 42%/posicionamento 30%; ATA = finalização 28%/posicionamento 20%; ZAG = marcação 24%/desarme 22%). 8 grupos posicionais.

### 2.3 Treino (`treinoTipos.ts` + `treinoAtributos.ts`)
Intensidades (`treinoTipos.ts:42`):

| Intensidade | Ganho | ΔCondição | ΔForma | ΔMoral | Risco lesão | Custo |
|---|---|---|---|---|---|---|
| Leve | 0.6× | +8 | −0.4 | +0.5 | 0.4% | R$ 5k |
| Normal | 1.0× | +2 | +0.4 | 0 | 1.2% | R$ 15k |
| Forte | 1.55× | −4 | +1 | −0.4 | 3.2% | R$ 35k |
| Muito forte | 2.1× | −9 | +1.6 | −0.9 | 6% | R$ 50k |

Clamps: condição [10,100] (`CONDICAO_MIN=10` força rotação), forma [−3,5], moral [10,100].
Catálogo: treinos **por posição** (goleiro/zagueiro/lateral/meio/atacante) + **por habilidade** (finalização/passe/drible/velocidade/força/…). Padrão: `hab_fisico`.

Motor (`treinoAtributos.ts`): ganho de progresso acumulado (BASE=26 por +1 de atributo) × fatores: **idade** (1.6×/<18 → 0.25×/≥34), **potencial** (`0.2 + 0.8×min(margem/15,1)`), moral (0.8–1.2), condição (0.7–1.0), minutos jogados, infraestrutura, afinidade posicional (1.15×), intensidade. Teto 99. Lesão: risco base × (condição<70 ? 1.6) × (idade≥32 ? 1.3).

### 2.4 Academia (`academiaEngine.ts`)
`gerarJovensTemporada()`: 3–5 jovens determinísticos/temporada, idade 17–19, overall 55–68, potencial 72–90 (faixas ocultas **B** 72-78 / **A** 79-85 / **S** 86-90), posições por necessidade do clube, salário `overall×70`.

### 2.5 Moral (`moralEngine.ts`)
`calcularDeltasMoralPartida` pós-jogo: vitória titular **+3**/reserva +1; derrota −4/−1; empate 0. **Goleada** (dif ≥3): vitória +3/+1 extra, derrota **−5/−2** extra. Eventos: gol **+8**, lesão −5, vermelho −6. **Liderança** (habilidade `LIDERANCA` no elenco + vitória): +2 a todos. `conversarComGrupo`: +5 (1×/semana). Clamp [10,100].

### 2.6 Habilidades (`habilidades.ts`)
10 perks (máx **2** por jogador), **derivadas dos atributos** no load (puro, determinístico) ou explícitas no seed. `derivarHabilidades` pontua candidatas por atributo+posição, dedup ARTILHEIRO/FINALIZADOR, top-2. Limiares: ARTILHEIRO (finalização ≥85, ATA), VELOCISTA (velocidade ≥86), DEFENSOR (marcação/desarme ≥83), GOLEIRO_PENALTI (reflexos ≥85), CABECEADOR (cabeceio ≥82 + força ≥72), ASSISTENCIAS (passe/cruzamento ≥83), LIDERANCA (idade ≥29 + overall ≥80), etc.

**Efeitos na simulação**: `fatorPesoGol` (ARTILHEIRO ×1.5, FINALIZADOR ×1.25, CABECEADOR ×1.12, CHUTE_LONGO ×1.1 — só redistribui o autor, não muda o total); `fatorPesoAssistencia` (ASSISTENCIAS ×1.4); `calcularBonusHabilidades` (força efetiva, teto +6: LIDERANCA +1.2, DEFENSOR/ARTILHEIRO +0.8, VELOCISTA +1.2 no contra-ataque); GOLEIRO_PENALTI na defesa de pênalti; LIDERANCA na moral.

### 2.7 Conquistas (`verificadorConquistas.ts` + `data/conquistas.ts`)
10 conquistas (função pura, verificada pós-rodada): primeiro título, primeira vitória, goleada (≥5), revelação (promover potencial S), saldo >10M, invicto 5, moral média ≥85, artilheiro próprio (≥15 gols), 3 temporadas no clube, sem gol sofrido (3 jogos). Persistidas no save (só IDs + data).

---

## 3. Temporada, Copa, Finanças, Mercado & Carreira

### 3.1 Calendário (`season/calendarGenerator.ts`)
Round-robin determinístico, âncora **6 de abril**, intervalos de 3-4 dias (rodada ÷3 → 4 dias). Exige nº par de clubes; gera `2(n-1)` rodadas (20 clubes → **38 rodadas**, `n(n-1)` jogos). Turno + returno espelhado. Datas e IDs puros/determinísticos.

### 3.2 Classificação (`season/classification.ts`)
`calcularTabela()` processa partidas jogadas: 3/1/0 pontos. Desempate CBF: **pontos → vitórias → saldo → gols pró → confronto direto → ID estável** (`localeCompare`, sem sorteio). Confronto direto compara pontos e saldo só entre os dois clubes.

### 3.3 Copa do Brasil (`season/copaEngine.ts`)
16 clubes (top por força do top-11; **usuário garantido**), chaveamento **Fisher-Yates semeado**. Fases Oitavas→Quartas→Semifinal→Final, **jogo único** (empate → pênaltis, `vencedorPenaltis`). `avancarCopa` monta a próxima fase com os vencedores ou define o campeão. **Premiação** (no store `PREMIACAO_COPA`, §11.2): Oitavas R$ 1,575M · Quartas R$ 3,15M · Semifinal R$ 5,25M · **Campeão R$ 73,5M**.

### 3.4 Finanças (`finance/financeEngine.ts`)
- **Bilheteria** (`:36`): `capacidade × ocupacao × precoMedioIngresso`; `ocupacao = min(0.96, 0.48 + fatorPosicao×0.32)`, `fatorPosicao = max(0.45, 1.15 − posicao×0.025)` (1º ≈96%, 20º ≈45%). Por jogo, ao mandante.
- **Cota de TV** (`cotaTV`, `:61`, §8.3), distribuída no fim de temporada por divisão e **posição final**:

| Divisão | Campeão | 2-4º | Meio | Z4 |
|---|---|---|---|---|
| Série A | R$ 120M | R$ 80M | 55M (5-8º) / 38M (9-12º) / 25M (13-16º) | R$ 18M |
| Série B | R$ 18M | R$ 14M | R$ 8M (5-12º) | R$ 4M |
| Série C | R$ 5M | R$ 3,5M | — | R$ 1,5M |

- **Acerto anual** (`:197`): patrocínio (`valorMensal×12` ou `reputacao×80.000`) entra; folha (12× mensal) e manutenção (`capacidade×35`) saem; juros `12% a.a.` sobre saldo negativo.
- Toda transação registra `{data, tipo, categoria, valor, descricao}` no histórico.

### 3.5 Mercado (`transfers/negociacaoEngine.ts` + `transferAI.ts`)
- **IA vendedora** (`respostaIAProposta`): aceita se ≥ **92%** do mercado (88% se no vermelho), recusa se < **70%**, senão **contraproposta** ~105% (1.03–1.07× via RNG semeado). Propostas têm `expiracaoRodada`.
- **IA compradora** (`avaliarPropostaTransferencia`): rejeita < 85%; aceita se ≥120% (jogador comum) ou ≥145% (importante = overall ≥ reputaçãoClube + 20).
- Mercado é **usuário↔IA** (clubes da IA não negociam entre si).

### 3.6 Carreira (`carreira/carreiraEngine.ts`)
- **Reputação** 0-100 (inicial 50): vitória **+2**, empate 0, derrota **−2**; fim de temporada título **+20**, acesso **+12**, rebaixamento **−20**.
- **Estado financeiro** por rodadas consecutivas no vermelho: `SAUDAVEL` (0) → `ATENCAO` (1-2) → `CRITICO` (3-7) → `FALENCIA` (8+).
- **Salário atrasado**: a partir de **3** rodadas no vermelho → **−20 de moral** a todo o elenco por rodada.
- **Demissão** (`verificarDemissao`): derrotas consecutivas no limite por divisão (**A=5 · B=7 · C=9**), falência (**8** no vermelho), ou rebaixamento (fim de temporada).
- **Recontratação** (`clubeElegivelParaTecnico`): clube elegível se `reputacaoClube ≤ reputacaoTecnico + 10` (`MARGEM_CONTRATACAO`). Sem clube elegível → fim de carreira.

---

## 4. Estado do Jogo (Store Zustand) & Persistência

### 4.1 Shape do estado (`GameState`, `useGameStore.ts`)
**Entidades**: `clubes`/`jogadores` (liga ativa) · `todosClubes`/`todosJogadores` (mundo evoluído, todas as divisões) · `partidas` · `tabela`.
**Usuário/tempo**: `clubeUsuarioId` (null = sem carreira) · `temporadaAtual` · `rodadaAtual` (1-39) · `dataAtual` (ISO).
**Pré-requisitos de ciclo**: `treinouProximoJogo` (treino obrigatório) · `conversouComGrupo` (1×/semana) · `coletivaConcedida` (1×/rodada).
**Oportunidades**: `ultimaPartidaUsuario` · `mensagens` (até 8) · `jovensDisponiveis` · `propostasRecebidas` · `formacaoPreLive` (retrato pré-jogo-ao-vivo) · `copa` (`EstadoCopa | null`) · `config`.
**Eixo carreira**: `reputacaoTecnico` (0-100, inicial 50) · `derrotasConsecutivas` (zera em V/E) · `rodadasNoVermelho` · `estadoFinanceiro` (`SAUDAVEL`/`ATENCAO`/`CRITICO`/`FALENCIA`) · `demissao` (`DERROTAS_CONSECUTIVAS`/`FALENCIA`/`REBAIXAMENTO` | null).

### 4.2 Principais ações
- **`iniciarNovaCarreira(clubeId)`**: carreira do zero (seed limpo), regenera liga+Copa, zera reputação/demissão/conquistas.
- **`assumirClube(clubeId)`**: recontratação após demissão — **mantém reputação e conquistas**, recomeça a temporada no novo clube com o mundo evoluído, limpa demissão.
- **`aplicarTreino(treinoId, intensidade)`**: aplica efeitos (atributos/condição/lesão), **debita o custo BRL**, libera o jogo (`treinouProximoJogo=true`). RNG semeado por temporada/rodada/treino/jogador.
- **`conversarComGrupo()`** (+5 moral, 1×/semana) · **`concederColetiva(delta)`** (1×/rodada) · **`aplicarMoralElenco(delta)`**.
- **`avancarRodada()`**: simula todos os jogos da rodada (IA + usuário), aplica resultado aos jogadores, recalcula tabela/bilheteria e **atualiza carreira**.
- **`concluirPartidaAoVivo(...)`**: fecha o jogo do usuário jogado ao vivo + simula o resto; restaura a escalação pré-jogo (trocas in-game não vazam).
- **`avancarFaseCopa(resultado?)`**: resolve o confronto do usuário + IA, avança a chave, credita premiação.
- **Mercado**: `comprarJogador` (markup ~1.22×) · `venderJogador` (~1.05×) · `fazerPropostaCompra` · `responderPropostaVenda` · `processarPropostasIA` (gera inbox, alvos overall ≥70, caduca em 3 rodadas) · `renovarContrato`.
- **`promoverJovem` / `liberarJovem`** · **`melhorarEstadio(tipo)`** (capacidade +5.000 até 90k, ou infraestrutura até nível 5; custo cresce com o porte).
- **`finalizarTemporada()`**: evolui todos os jogadores → acerto financeiro anual → acesso/rebaixamento (4↑/4↓) → **cota de TV** → reputação de fim de temporada → demissão por rebaixamento → academia + Copa regeneradas → temporada+1, rodada 1.
- **`reiniciarCarreira()`** · **`atualizarConfig(parcial)`** · `prepararPartidaAoVivo` / `restaurarFormacaoPreLive`.

### 4.3 Atualização de carreira pós-rodada (`atualizarCarreiraPosRodada`)
Encapsula o eixo meta: resultado do usuário (V/E/D) → **reputação** (+2/0/−2) → **derrotas consecutivas** (zera em V/E) → **rodadas no vermelho** + **estado financeiro** → se **≥3 no vermelho**: salário atrasado (−20 moral a todo o elenco + mensagem) → se **≥8**: falência → **demissão** (derrotas no limite da divisão, falência, ou — no fim de temporada — rebaixamento). Chamada em `avancarRodada` e `concluirPartidaAoVivo`.

### 4.4 Aplicar resultado nos jogadores (`aplicarResultadoNosJogadores`)
Pós-jogo, por jogador dos dois clubes: decrementa punições (suspensão −1 jogo, lesão −7 dias) → novas punições (vermelho +1 jogo; 3 amarelos = +1 jogo; lesão 1–10 jogos) → **condição física**: titular −20, reserva que entrou −10, quem ficou de fora **+25** (descanso), clamp **[10,100]** → **moral** (via `calcularDeltasMoralPartida`) → estatísticas (jogos/gols/assistências/cartões + nota incremental).

### 4.5 Selectors (`useGameStore.ts` + `selectors.ts`)
`selecionarClubeUsuario`, `selecionarProximoJogo`, `selecionarConfrontoCopaUsuario`, `selecionarProximoCompromisso` (liga×copa por data ISO), `selecionarCopaNaVez`, `selecionarFormaRecente`, `selecionarHistoricoConfrontos`; hooks memoizados `useJogadoresUsuario`, `useEventosUltimaPartida`, `useForcaUsuario`; `calcularProximoEvento` (treino/jogo/fim).

### 4.6 Persistência (`persistence.ts` + `saveMigrations.ts`)
Snapshot único em JSON (`SnapshotJogo`, `VERSAO_SAVE=2`): entidades + estado de ciclo + **eixo carreira** + copa + propostas + config + conquistas (só IDs). `montarSnapshot`/`aplicarSnapshot` são puros e testáveis (defaults para saves antigos). `ArmazenamentoSave` (SQLite via op-sqlite, carregado sob demanda): linha 1 = atual, linha 2 = **backup-before-overwrite**. `carregarJogo` tenta principal → backup → erro. `migrarSnapshot` rejeita versão futura e valida campos essenciais. **Conquistas** vivem em `useAchievementsStore` (separado), com `novasNaoVistas` para o toast.

---

## 5. Interface: Navegação, Telas & Componentes

### 5.1 Navegação (`src/navigation/`)
**Pilha raiz** (`RootStackParamList`, `types.ts:16`): `MainMenu`, `Loading`, `LeagueSelect`, `NewCareer`, `MainTabs`, `PlayerDetail` (modal), `TransferMarket`, `MatchSimulation` (sem gesto), `MatchResult`, `PreJogo`, `Coletiva`, `Copa`, `Semana`, `Academia`, `Gabinete`, `Calendario`, `Contratos`, `Demissao` (sem gesto).
**Abas inferiores** (`TabNavigator.tsx`): `Home`, `Squad`, `Tactics`, `Competition`, `Club` (badge de propostas), `Settings`.

### 5.2 Telas
| Tela | Propósito |
|---|---|
| MainMenu / Loading | Marca + resumo da carreira / hidratação do save no boot |
| LeagueSelect / NewCareer | Escolha de divisão / clube (mostra overall médio, reputação, saldo) |
| Home | Mesa do técnico: forma, próximo jogo (barras de força), avisos, atalhos, última partida, notícias |
| Squad | Elenco: listagem/venda, filtro por posição |
| Tactics | Escalação **livre** (DraggablePitch), detecção de formação, instruções (estilo/marcação/linha/ritmo) |
| Competition | Tabela com zonas (acesso/rebaixamento) |
| Club | Finanças (saldo, donuts receita/despesa, projeção), estádio, histórico |
| Settings | Velocidade de narração, confirmações, reiniciar carreira |
| PlayerDetail | Carta + evolução (overall→potencial) + **Habilidades** + atributos (radar) |
| TransferMarket | Contratar (IA responde) + propostas recebidas |
| PreJogo → Coletiva → MatchSimulation → MatchResult | **Fluxo de jogo ao vivo** (favoritismo/forma/histórico → 3 perguntas de imprensa → narração minuto-a-minuto com subs → súmula com notas) |
| Copa | Chaveamento (bracket) por fase; jogar/simular/avançar |
| Semana | Treino: rotina (posição/atributo) + intensidade |
| Academia | Peneiras: jovens com potencial B/A/S; promover/liberar |
| Gabinete | Troféus (conquistas) + **painel de carreira** (reputação + estado financeiro) |
| Calendario | Grade mensal liga + Copa (borda dourada) |
| Contratos | Renovações (contrato expirando) |
| Demissao | **Demissão → recontratação** por clube elegível pela reputação; sem proposta → fim de carreira |

### 5.3 Componentes (`src/components/`)
- **UI base**: `ScreenContainer`, `AppHeader`, `GradienteFundo`, `LogoFoteball`, `Icone` (MaterialCommunityIcons por nome semântico), `ui/index` (Botao/Card/Metric/Section/OptionGroup/TextoVazio).
- **Cartões/status**: `CartaJogador` (FIFA-like por overall), `PlayerCard`, `Escudo`, `OverallBadge`, `AlertasCard`, `ProximoJogoCard`, `FormaRecente`.
- **Análise/gráficos**: `AttributeRadar` (spider 6 eixos), `BarrasForca`, `DonutChart` (SVG), `ClassificationTable`.
- **Partida**: `Placar` (scoreboard SVG), `EventItem` (balões mandante/visitante), `AjustesPartida` (subs), `DraggablePitch` (campo com arraste livre + % de adaptação).
- **Feedback**: `feedback/index` (`useConfirm`/`useToast`), `ToastConquista` (deslizante 3.2s).

---

## 6. Tipos de Domínio, Dados/Seed, Utils & Infraestrutura

### 6.1 Tipos (`src/types/`)
- **player.ts**: `Position` (11: GOL/ZAG/LD/LE/VOL/MC/MEI/PD/PE/SA/CA), `PernaDominante`, `Habilidade` (10), `PlayerAttributes` (12: finalizacao/passe/marcacao/desarme/velocidade/resistencia/forca/reflexos/posicionamento/drible/cabeceio/cruzamento), `Player` (identidade + atributos + `habilidades?` + overall/potencial/condicaoFisica/moral/forma + valorMercado/salario/contratoAte + lesão/suspensão + estatísticas/histórico).
- **club.ts**: `FormacaoPreset` (4-4-2/4-3-3/3-5-2/4-2-3-1/5-3-2/4-1-4-1), `Formacao` (titulares com x/y), `Tatica` (estiloOfensivo/marcacao/linhaDefensiva/ritmo + instruções), `Estadio` (capacidade/precoMedioIngresso/nivelInfraestrutura), `FinancasClube` (saldo/receitas/despesas/patrocinadores/historicoTransacoes), `Transacao` (`categoria: string`), `Clube` (+ `reputacao`, `divisao`, `controladoPorIA`).
- **match.ts**: `EventoPartidaTipo` (gol/cartao_*/lesao/substituicao/chance_perdida/penalti/falta_cobranca), `EventoPartida` (+ `penaltiData`), `Partida` (placar/eventos/jogada/modoJogado/vencedorPenaltis).
- **competition.ts**: `TabelaClassificacao`, `Competicao`, `Confronto` (com ida/volta no tipo, embora a Copa use jogo único).
- **carreira.ts**: `EstadoFinanceiro`, `MotivoDemissao`, `ResultadoCarreira`.

### 6.2 Dados/Seed (`src/data/`)
- **Clubes**: `seed/clubes/<pais>/<campeonato>/<divisao>.json` — 20 por Série A/B/C (**60 total**).
- **Jogadores**: `seed/jogadores/<time>.json` — 1 arquivo por clube, **~1.8k jogadores** (≈22-36 por elenco). Habilidades derivadas no load (`comHabilidades`) se ausentes.
- **estadios.ts**: ~24 estádios reais curados (Maracanã, Morumbi, Mineirão…) + capacidade determinística (hash) para os demais; nível de infra por porte.
- **conquistas.ts** (10) · **imprensa.ts** (perguntas de coletiva por categoria, com efeito de moral) · **nomesBase.ts** (nomes/sobrenomes p/ jovens).

### 6.3 Utils (`src/utils/`)
`formatters` (`moeda`, `moedaCompacta`, `nomeClube`, `siglaClube`) · `datas` (ISO puro, `adicionarDias`, `formatarDataCurta/Longa`, sem `Date.now`) · `forca` (`forcaDoClube`) · `atributosDestaque` (3 atributos-chave por posição + siglas).

### 6.4 API/Database (`src/api/database/`)
`db.ts` (op-sqlite singleton `foteball.db`) · `saveStorage.ts` (`ArmazenamentoSave` em SQLite, atual+backup) · `seed/loadSeed.ts` (`loadSeedData` → clubes+jogadores com habilidades+defaults) · `seed/defaults.ts` (templates de formação, `aplicarDefaultsClube`, escalação automática).

### 6.5 Tema/Áudio/Assets/Infra
- **theme/index.ts**: paleta (fundo #0A0E1A, primária verde #00E5A0, perigo #FF3B5C…), espaçamento (xs-xxl), raio, gradientes, níveis de carta por overall.
- **audio/sons.ts**: `react-native-sound` (gol, fim de jogo), carregamento preguiçoso, on/off por config.
- **assets/**: logos de divisão + Copa + escudos PNG.
- **package.json (v0.0.1)**: deps acima; scripts `android`/`ios`/`start`/`typecheck`/`lint`/`test`; Node ≥22.11.
- **CI** (`.github/workflows`): jobs paralelos typecheck · lint · jest, com cancelamento de runs antigas.

---

## 7. Testes & Qualidade

- **35 suítes** espelhando a engine + store + e2e. Padrão: `mockFactory`/`fixtures` (`criarPlayer`, `criarClube`, `criarPartida`).
- **Determinismo** é testado explicitamente (mesma seed → mesmo resultado).
- **`playthrough.e2e.test.ts`**: simula uma temporada inteira e valida invariantes (conservação de gols, overall ≤ potencial, moral [10,100], condição [0,100], temporada/idade incrementam).
- **`empty_stress.test.ts`**: ~200.000 partidas sem exceção (robustez de bordas) — lento (~10 min).
- **Definição de pronto** (R-10): `typecheck` ✅ · `lint` ✅ (0 erros) · `jest` ✅ verde. Zero `any`/`@ts-ignore`/`Math.random` na engine.

## 8. Estado da v0.0.1

Implementado e testado: simulação minuto-a-minuto determinística · táticas (formação livre + confronto de estilos + adaptação por posição) · progressão por idade + treino com custo + academia · moral · **sistema de habilidades** (derivação + efeitos) · pontos corridos 3 divisões com acesso/rebaixamento · **Copa do Brasil** · finanças (bilheteria + **cota de TV** + acerto anual) · mercado usuário↔IA · **eixo carreira** (reputação + estado financeiro + salário atrasado + demissão + recontratação) · conquistas · coletiva de imprensa · save robusto (backup + migração).

**Gaps conhecidos** (ver `BRASFOOT_MASTER.md`): valuation por fórmula (§9.2, hoje `valorMercado` é semente), empréstimos + janelas (§9.1/9.3), mercado IA↔IA, ranking de artilheiros (§11), preço de ingresso ajustável (§8.2), tipos de jogador Novato/Veterano (§3.4), Campeonato Estadual.

---

*ARQUITETURA.md · FOTEBALL v0.0.1 · gerado por leitura completa da base · Danpazexe/FOTEBALL*

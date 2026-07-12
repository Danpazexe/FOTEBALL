# 0002 — Inventário Fase 0 (baseline + auditoria de migração DS v2)

- **Status:** Concluído
- **Data:** 2026-07-12
- **Branch:** `feat/design-system-v2` · **base main:** `affb3069570ebd8a201f3f90bc5d33d26bab8093`
- **Método:** ripgrep (quantitativo, exato) + leitura assistida das 24 telas, 28
  componentes e infra (qualitativo). Nenhum código de produto foi alterado.

Este documento cumpre a Fase 0 do [ADR-0001](0001-adotar-design-system-v2.md):
baseline protegido e inventário para orientar a migração fase a fase.

---

## A. Diagnóstico central (o bloqueador da Fase 0)

**24/24 telas e a maioria dos componentes importam os tokens de cor como
CONSTANTE** (`import {cores} from '../../theme'`), que são aliases fixos de
`CORES_ESCURO` (`src/theme/index.ts:214-218`). Qualquer arquivo que os importe
fica **soldado ao tema escuro** — tema claro nunca chega até ele.

| Consumo de tema | Telas | Componentes |
|---|---:|---:|
| Constante (`import {cores}`) — soldado ao escuro | 23 | 22 |
| Hook (`useTema`/`useEstilos`) — temável | 1 (`Settings`) | 6 |

> `Settings`, `Chip`, `Painel`, `StatCard`, `TabBar`, `GradienteFundo` já usam o
> hook — são a **referência** de como o resto deve ficar.

Complicador: as funções puras de cor de `theme/index.ts` (`corAdaptacao:394`,
`corCondicao:409`, `corOverall:370`, `comAlfa:493`, `nivelCarta`) leem a constante
`cores`/`acentos`. Precisam passar a **receber o tema por parâmetro**, senão
devolvem cor do escuro mesmo em telas migradas.

`useTemaStore` hoje é leitura única (`tema: temaEscuro`, sem setter). A fundação
(`useTema`/`useEstilos`) já existe — falta um 2º tema + setter + modo
`claro|escuro|sistema` + listener de `Appearance`. Tokens `espaco/raio/tipografia`
são independentes de tema e podem seguir como constante.

---

## B. Inventário das 24 telas

Legenda — **P**: prioridade (P0 alto tráfego/bloqueia capacidade P0 · P1 relevante
· P2 raro/simples). **Fase**: fase recomendada (plano do briefing §21). **Risco**:
regressão ao migrar.

| Tela | Caminho | LOC | Tema | Problema-chave | P | Fase | Risco |
|---|---|---:|---|---|---|---|---|
| Home | `src/screens/Home/index.tsx` | 1192 | const | ~40 blocos const; hero com véu `rgba` hardcoded; densidade condicional (Série D/Copa/ultimato); alertas cap 5 | P0 | 4 | **alto** |
| Squad (Elenco) | `src/screens/Squad/index.tsx` | 233 | const | grade `flexWrap+map` de 25-35 cartas **não virtualizada**; chips sem `selected` | P0 | 4 | baixo |
| Tactics | `src/screens/Tactics/index.tsx` | 303 | const | não usa `ScreenContainer`; núcleo `CampoFUT` 100% hardcoded (maior bloqueio dark→light) | P0 | 4 | **alto** |
| PlayerDetail | `src/screens/PlayerDetail/index.tsx` | 678 | const | reimplementa chips/barras à mão; 4 `${cor}NN` (`1F`/`66`) | P1 | 4 | médio |
| Central | `src/screens/Central/index.tsx` | 186 | const | menu de atalhos; títulos sem `role=header` | P1 | 4 | baixo |
| MainMenu | `src/screens/MainMenu/index.tsx` | 210 | const | Chip local; estado vazio informal | P1 | 4 | baixo |
| Semana (Treino) | `src/screens/Semana/index.tsx` | 572 | const | segmentos/pills sem `selected`; catálogos fixos | P1 | 4 | baixo |
| MatchSimulation | `src/screens/MatchSimulation/index.tsx` | 1913 | const | **arquivo enorme**; tempo real + **Animated API legada**; abas manuais; feed `FlatList` (vale FlashList) | P0 | 5 | **alto** |
| MatchResult | `src/screens/MatchResult/index.tsx` | 1773 | const | 5 subcomp. de viz locais; abas manuais; 2 `#000000`; timeline `ScrollView+map` | P0 | 5 | **alto** |
| Competition | `src/screens/Competition/index.tsx` | 159 | const | depende de `ClassificationTable`; `${cores.primaria}1A`; pede Tabs internas | P0 | 5 | baixo |
| Calendario | `src/screens/Calendario/index.tsx` | 330 | const | grade custom ~300+ células; mapas cor→estado; sem EmptyState | P1 | 5 | médio |
| PreJogo | `src/screens/PreJogo/index.tsx` | 588 | const | **zero props de a11y**; `CampoFUT` drag-drop; sem EmptyState | P0 | 5 | médio |
| Copa | `src/screens/Copa/index.tsx` | 335 | const | bracket ~gêmeo de SerieD (duplicação); vencedor só por cor | P1 | 5 | médio |
| SerieD | `src/screens/SerieD/index.tsx` | 306 | const | bracket ~gêmeo de Copa (duplicação) | P1 | 5 | médio |
| TransferMarket | `src/screens/TransferMarket/index.tsx` | 444 | const | 2 listas de mercado (cap 30) `ScrollView+map` **não virtualiz.**; tabs/modal à mão; sem busca | P0 | 6 | médio |
| Club (Finanças) | `src/screens/Club/index.tsx` | 542 | const | **5 hex** (`CORES_RECEITA/DESPESA`); DonutChart custom; fallback informal | P0 | 6 | médio |
| Contratos | `src/screens/Contratos/index.tsx` | 281 | const | lista a renovar `ScrollView+map`; modal→sheet; chips sem `selected` | P1 | 6 | baixo |
| Gabinete | `src/screens/Gabinete/index.tsx` | 555 | const | 3 barras de progresso inline sem `role=progressbar`; grid de conquistas | P1 | 6 | médio |
| Academia | `src/screens/Academia/index.tsx` | 192 | const | cards/botões ad-hoc (deviam reusar ListItem/Button) | P1 | 6 | baixo |
| Demissao | `src/screens/Demissao/index.tsx` | 255 | const | lista agrupada `ScrollView+map` aninhado (dezenas de clubes) | P1 | 6 | médio |
| Settings | `src/screens/Settings/index.tsx` | 356 | **misto** | **já usa hook** (referência); falta AppBar; `#FFFFFF` no Switch; grupos sem `selected` | P0 | 6 | baixo |
| NewCareer | `src/screens/NewCareer/index.tsx` | 220 | const | **96 clubes (Série D)** em `ScrollView+map` → SectionList/FlashList + busca | P1 | 4 | médio |
| LeagueSelect | `src/screens/LeagueSelect/index.tsx` | 243 | const | ~8 ligas estáticas; `Em breve` sem `accessibilityState` | P2 | 4 | baixo |
| Loading | `src/screens/Loading/index.tsx` | 63 | const | spinner sem `liveRegion`/role de progresso | P2 | 3 | baixo |

---

## C. Inventário dos componentes (28 pastas · 29 entradas)

Legenda **DS**: destino no `src/design-system` — primitivo · componente · sports ·
manter-local · obsoleto.

| Componente | Caminho | Tema | DS | Observação-chave |
|---|---|---|---|---|
| Chip | `components/Chip` | **hook** | componente | **Referência** — deve ABSORVER chips inline espalhados |
| Painel | `components/Painel` | **hook** | componente | Surface/Card canônica; consolidar cards chapados nela |
| StatCard | `components/StatCard` | **hook** | componente | StatValue canônico; consolidar `ui/Metric` nele |
| GradienteFundo | `components/GradienteFundo` | **hook** | primitivo | Backdrop já temável; no claro trocar stops |
| TabBar | `components/TabBar` | **hook** | manter-local | Presa a `BottomTabBarProps`; reusar Badge no contador |
| OverallBadge | `components/OverallBadge` | nenhum | componente | Disco de overall reimplementado inline em 3 lugares — unificar aqui |
| Escudo | `components/Escudo` | nenhum | sports | = **TeamCrest**; ponto único de escudo (bom) |
| CartaJogador | `components/CartaJogador` | nenhum | sports | **10 hex** (moral/status→tokens; tier fica fixo); SVG carta cheia |
| MiniPlayerCard | `components/MiniPlayerCard` | const | sports | 2 rgba branco quebram no claro; família PlayerCard |
| PlayerCard | `components/PlayerCard` | const | sports | linha do elenco; `corMoral` duplica `corCondicao` |
| FichaCamisa | `components/FichaCamisa` | const | sports | peça de jogador do Pitch; `corAdaptacao`→token semântico |
| ProximoJogoCard | `components/ProximoJogoCard` | const | sports | é um **MatchCard**; barras inline→StatBar; CTA→Botao |
| ClassificationTable | `components/ClassificationTable` | const | sports | = **StandingsTable**; `.map` não virtualizado |
| AttributeRadar | `components/AttributeRadar` | const | sports | RadarChart; lê tokens no corpo do SVG |
| DonutChart | `components/DonutChart` | const | componente | 3 tokens só; base de dataviz |
| StatBar | `components/StatBar` | const | componente | Meter/ProgressBar canônico; consolidar barras inline |
| FormaRecente | `components/FormaRecente` | const | sports | FormGuide; V/E/D→tokens semânticos |
| MapaFinalizacoes | `components/MapaFinalizacoes` | const | sports | = **ShotMap**; **5 hex** de campo/rede→tokens SVG |
| CampoFUT | `components/CampoFUT` | const | sports | = **Pitch**; **6 hex** de gramado; drag-drop reanimated; maior esforço |
| MatchNarration/LanceLimpo | `components/MatchNarration` | const | sports | = **EventRow** da timeline |
| MatchNarration/AjustesPartida | `components/MatchNarration` | const | manter-local | ~1670 loc; embute Pitch/Tabs/Chip/PlayerRow/Badge; **3 rgba** scrim |
| AlertasCard | `components/AlertasCard` | const | componente | Callout/AlertList; absorver `BannerValidacao` |
| feedback | `components/feedback` | const | componente | Provider fica; visuais→Dialog+Snackbar; **Animated legada**; scrim hardcoded |
| SaveIndicator | `components/SaveIndicator` | const | manter-local | Singleton; família de toasts com ToastConquista/feedback |
| ToastConquista | `components/ToastConquista` | const | manter-local | Singleton; migrar const→hook |
| LogoFoteball | `components/LogoFoteball` | nenhum | manter-local | asset de marca; variante clara futura |
| **BarrasForca** | `components/BarrasForca` | const | **obsoleto** | **ÓRFÃO** — zero consumidores (removido do pré-jogo, PR #124). Candidato a remoção |
| ui (ScreenContainer/AppHeader/Botao/…) | `components/ui` | hook | componente | primitivos; `AppHeader` usa "Voltar" **textual** (deve virar ícone); 2 `#FFFFFF` |
| Icone | `components/Icone` | const(`cores`) | primitivo | registry Lucide semântico; default lê `cores` const |

---

## D. Item 11 — listas de usos (dados exatos, ripgrep)

### D.1 Importação fixa de cores (const) — soldado ao escuro
**23 telas:** Academia, Calendario, Central, Club, Competition, Contratos, Copa,
Demissao, Gabinete, Home, LeagueSelect, Loading, MainMenu, MatchResult, NewCareer,
PlayerDetail, SerieD, Squad, Tactics, TransferMarket, PreJogo, MatchSimulation,
Semana. **22 componentes:** AlertasCard, AttributeRadar, BarrasForca, CampoFUT,
Chip*, ClassificationTable, DonutChart, FichaCamisa, FormaRecente, Icone,
MapaFinalizacoes, MatchNarration/LanceLimpo, Painel*, PlayerCard, ProximoJogoCard,
SaveIndicator, StatBar, StatCard*, TabBar*, ToastConquista, feedback, ui*
(*também usam hook para cor; const só p/ `espaco/raio/tipografia`).

### D.2 `useTema`/`useEstilos` (temável)
`screens/Settings`; `components/Chip`, `GradienteFundo`, `Painel`, `StatCard`,
`TabBar`, `ui`; infra `theme/useTema.ts`, `store/useTemaStore.ts`, `theme/index.ts`.

### D.3 Hex literal em telas (5) e componentes (21)
- Telas: `Club:49-50` (4 hex em CORES_RECEITA/DESPESA), `Settings:268` (#FFFFFF Switch),
  `MatchResult:1333,1360` (#000000 shadow).
- Componentes: `CartaJogador` (10), `CampoFUT` (6: gramado/fundo/shadows),
  `MapaFinalizacoes` (5: turfa/listra), `ui` (2 #FFFFFF), `TabBar` (1 #FFFFFF badge).

### D.4 Interpolação `${cor}NN` (7 — anti-padrão, usar `comAlfa`/token)
`PlayerDetail:219,220,232,233` (`1F`/`66`) · `Club:492` (`22`) ·
`Competition:132` (`1A`) · `MatchNarration/AjustesPartida:914` (`1A`).

### D.5 ScrollView + map (listas não virtualizadas)
Direto: `NewCareer, LeagueSelect, Tactics, PreJogo, Demissao, MatchResult`,
`MatchNarration/AjustesPartida, CampoFUT, ui`. Via `<ScreenContainer scroll>`:
`Squad, TransferMarket, Calendario, Contratos, Academia, Home, Central, Gabinete,
Competition, Club, Copa, SerieD`.

### D.6 FlatList (única virtualizada hoje)
`MatchSimulation` (feed de lances, tabela ao vivo, placares da rodada).

### D.7 Listas potencialmente grandes (candidatas a FlashList)
`NewCareer` (**96 clubes** Série D) · `Squad` (25-35, grade) · `TransferMarket`
(mercado, cap 30) · `Demissao` (dezenas, agrupada) · `Calendario` (~300 células) ·
`Contratos` (elenco a renovar) · `MatchSimulation`/`MatchResult` (feed/timeline).

### D.8 Componentes visuais duplicados (consolidar no DS)
- **Jogador:** `CartaJogador` (carta) × `MiniPlayerCard` (grid) × `PlayerCard` (linha)
  × `FichaCamisa` (campo) — família única PlayerCard/PlayerRow/PlayerCard.
- **Overall:** `OverallBadge` reimplementado inline em `AjustesPartida`,
  `MiniPlayerCard`, `CartaJogador`.
- **Barra:** `StatBar` × `BarrasForca` × barras inline de `ProximoJogoCard`.
- **StatValue:** `StatCard` × `ui/Metric` × `Resumo/DadoChute` de `MapaFinalizacoes`.
- **Chip:** `Chip` × `taticaChip`(CampoFUT) × `formChip`(AjustesPartida) × chips de
  treino × `OptionGroup`(ui).
- **Tabs:** abas manuais (Pressable) em `MatchSimulation`, `MatchResult`,
  `TransferMarket`, `AjustesPartida` (≠ `TabBar` de navegação).
- **Toast/Overlay:** `SaveIndicator` × `ToastConquista` × toast do `feedback`.
- **Bracket/MatchCard:** `Copa` ≈ `SerieD` (LadoConfronto/ConfrontoRow duplicados).
- **Callout:** `AlertasCard` ≈ `BannerValidacao`(CampoFUT).

---

## E. Infraestrutura

- **Navegação:** `RootNavigator` (native-stack, `headerShown:false` global — header é
  `AppHeader` próprio). Abas atuais `Central · Tabela(Competition) · Início · Clube ·
  Ajustes`. Ícones das 5 abas propostas (`inicio/central/elenco/tabela/clube`) e do
  CTA (`jogar`) **já existem** no registry. Promover `Squad`→aba `Elenco` (hoje é
  stack) e realocar `Settings` para fora da barra.
- **Feedback:** `FeedbackProvider` (`useConfirm`→Promise<boolean>, `useToast` 3 tipos,
  sem fila/ação/swipe). Const-locked + **Animated API legada** + scrim
  `rgba(5,8,14,.78)` hardcoded. Vira Dialog + Snackbar do DS (preservar a API).
- **Assets:** 156 escudos PNG 128px (theme-agnostic, OK) · logos divisão/copa ·
  **`planodefundo.jpg` 410KB** (só Home, dark-baked) · **`brand/logo.png` 219KB**
  (dark-baked) · `.DS_Store` versionado (limpar). Fundo real do app é
  `GradienteFundo` (SVG já temável).
- **Fontes:** **0 `fontFamily`, 301 `fontWeight`** — tudo fonte de sistema. Sem
  `src/assets/fonts/`, sem `react-native.config.js`, sem `UIAppFonts`. Barlow exige
  empacotar TTF por peso + `react-native-asset` + tokens `tipografia` por família.

### Ordem de migração da infra (Fase 1→3)
1. `theme/index.ts` + `useTemaStore.ts` + `useTema.ts` — 2º tema + setter + modo +
   `Appearance` + token de scrim. **Desbloqueia tudo.**
2. Funções de cor puras → receber tema por parâmetro.
3. `App.tsx` — StatusBar reativa ao tema.
4. `components/ui` — novos primitivos + `AppHeader` com voltar por ícone (multiplicador).
5. `GradienteFundo` — confirmar stops no claro.
6. `feedback` — hook + Reanimated + Snackbar/Dialog.
7. `TabBar`/`TabNavigator`/`types` — reindexar abas + CTA central + Squad→Elenco.
8. Fontes (paralelo ao passo 1).
9. Assets dark-baked — variantes claras.

---

## F. Baseline de validação

| Comando | Resultado |
|---|---|
| `npm run typecheck` (`tsc --noEmit`) | ✅ 0 erros |
| `npm run lint` (`eslint .`) | ✅ 0 erros · 4 warnings pré-existentes (ver abaixo) |
| `npm test -- --runInBand` | ✅ **78 suites / 543 testes, 100% passando** (449 s) |
| Build Android local (`assembleDebug`) | ✅ compila após limpar artefato **gerado** stale (ver nota) |
| Build iOS | ⚠️ limitação de ambiente — não executado (ver relatório) |

**Nota Android:** o 1º `assembleDebug` incremental falhou em
`compileDebugJavaWithJavac` porque reusou um arquivo **gerado** de autolinking
stale (05/jul, `ReactNativeApplicationEntryPoint.java`) que ainda referenciava o
pacote antigo `com.foteball`. O código-fonte usa `com.pazconcept.foteball` em todo
lugar; `com.foteball` não existe em nenhum config versionado. É artefato de cache
local (o CI sempre builda limpo, logo não é afetado) — **não é regressão desta
fase**. Limpar `app/build/generated/{autolinking,source}` regenera correto.

**4 warnings de lint pré-existentes (não introduzidos por esta fase):**
1. `src/components/MatchNarration/AjustesPartida.tsx:1002:13` — `react-native/no-inline-styles` (borderWidth inline).
2. `src/engine/simulation/__tests__/empty_stress.test.ts:148:33` — `eslint-comments/no-unused-disable` (no-console disable não usado).
3. `src/store/__tests__/persistence.test.ts:91:33` — `eslint-comments/no-unused-disable` (no-unused-vars disable não usado).
4. `src/theme/index.ts:448:12` — `no-bitwise` (`>>>` no hash de `corDoTime`).

**Regras do CLAUDE.md — conformidade atual:** R-01/R-02 (RNG/Date na engine) ✅
(7 ocorrências são comentários); R-03 (React na engine) ✅ 0; R-04/R-05
(`any`/`@ts-ignore`) ✅ 0 no código de produto.

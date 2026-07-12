# 0003 — Plano da Fase 1: fundações do Design System v2

- **Status:** **Proposto — aguardando aprovação** (não implementado)
- **Data:** 2026-07-12
- **Branch:** `feat/design-system-v2`
- **Depende de:** [ADR-0001](0001-adotar-design-system-v2.md), [ADR-0002](0002-inventario-fase-0.md)
- **Escopo (skill `foteball-manager` → implementation-phases §Fase 1):** tokens
  semânticos · temas claro/escuro/sistema · provider + bridge compatível ·
  tipografia **só se aprovada** · primitives Text/Box/Pressable/Icon ·
  showcase/testes. **Fora:** busca, Skia, heatmaps, componentes de Fase 2,
  navegação nova (Fase 3), migração de telas.

## Princípio da fase

Introduzir o novo sistema de tema **sem tocar nas 23 telas soldadas ao escuro**.
Os exports antigos de `src/theme` continuam válidos (bridge `@deprecated`) e as
telas seguem escuras até a fase delas — **zero regressão visual**. A fase entrega
a capacidade (tema claro/escuro/sistema + primitives) e um showcase que a prova.

**Zero dependências novas em runtime.** Testes usam `react-test-renderer` (já é
devDependency). Fontes Barlow são um sub-item separado e **gated por aprovação**.

## Arquivos a CRIAR (`src/design-system/`)

```
tokens/
  colors.ts        # paletas claro+escuro (semânticas) + tokens esportivos
  spacing.ts       # grid 4pt (reexporta/espelha espaco)
  radii.ts         # xs..full
  elevation.ts     # nível 0..2 (borda antes de sombra no claro)
  typography.ts    # papéis (Display/Title/Body/Label/Caption/Numeric) — fontWeight hoje
  motion.ts        # durações press/entrada/sheet + reduceMotion
  sizes.ts         # touch target 44/48, ícones 16/20/24/28, alturas
  index.ts         # barrel
themes/
  types.ts         # tipo Tema semântico (forma única dos 2 temas)
  light.ts         # tema claro (padrão)
  dark.ts          # tema escuro
  ThemeProvider.tsx# provider + resolução claro|escuro|sistema + Appearance
  useTheme.ts      # hook do tema semântico (+ useModoTema)
primitives/
  Text/index.tsx       # variant/color/align/tabular/weight/numberOfLines
  Box/index.tsx        # View com padding/gap/bg por token
  Pressable/index.tsx  # área de toque 44/48 + estados pressed/disabled + haptic-ready (no-op)
  Icon/index.tsx       # ponte para components/Icone (mantém Lucide/registry)
  index.ts
index.ts               # barrel público do design-system
__showcase__/Showcase.tsx  # tela DEV: todos os tokens + primitives nos 2 temas
__tests__/
  colors.test.ts       # paridade de chaves claro/escuro; sem chave faltante
  theme-select.test.ts # modo sistema segue Appearance; setter troca
  color-fns.test.ts     # corAdaptacao/corCondicao/corOverall com tema por parâmetro
  primitives.test.tsx   # Text/Box/Pressable/Icon renderizam (react-test-renderer)
```

## Arquivos a MODIFICAR

| Arquivo | Mudança |
|---|---|
| `src/store/useTemaStore.ts` | adicionar `modo: 'claro'\|'escuro'\|'sistema'` + `tema` derivado + `definirModo()`; assinar `Appearance`; manter campo `tema` p/ `useTema()` atual continuar funcionando |
| `src/theme/index.ts` | manter exports antigos como **bridge `@deprecated`** (apontando p/ escuro); refatorar funções de cor (`corAdaptacao/corCondicao/corOverall/comAlfa/nivelCarta`) para **aceitar tema por parâmetro** com overload compatível (default = escuro) |
| `src/theme/useTema.ts` | manter; reexportar do design-system quando útil |
| `App.tsx` | `StatusBar barStyle` reativo ao tema; hidratar `modo` no boot; `criarTemaNav` já deriva do tema |
| `src/screens/Settings/index.tsx` | (opcional, mínimo) seletor **Aparência: Claro/Escuro/Sistema** — é a forma de o usuário testar; sem redesenhar a tela |

> Nenhum arquivo de tela de produto além de Settings é tocado nesta fase.

## Dependências propostas

- **Runtime:** **nenhuma.** Tokens/temas/primitives são TS/RN puros.
- **Dev/teste:** **nenhuma nova** — usa `react-test-renderer` já instalado.
- **Fontes (sub-item gated):** `react-native-asset` é ferramenta de `npx` (não vira
  dependência do app). Requer baixar os TTF de Barlow (SIL OFL, gratuita). **Só com
  sua autorização** (a skill: "tipografia somente se aprovada").

## Estratégia de compatibilidade com o tema antigo

1. **Bridge por reexport:** `cores/suaves/acentos/gradientes/sombra` continuam
   exportados de `src/theme/index.ts`, agora com `@deprecated`, apontando para o
   tema escuro. As 23 telas const-locked **não mudam** e seguem escuras.
2. **Mapa semântico:** o novo `Tema` mapeia o antigo → semântico —
   `fundo→canvas`, `superficie→surface`, `superficieAlt→surfaceSubtle`,
   `borda→border`, `texto→textPrimary`, `textoSecundario→textSecondary`,
   `primaria→brand`, `primariaEscura→brandStrong`, `secundaria→accent`,
   `perigo→danger`, `sucesso→success`, `aviso→warning`. Documentado em
   `themes/types.ts` para a migração das telas nas fases seguintes.
3. **Funções de cor com overload:** `corCondicao(valor, tema?)` — sem o 2º
   argumento devolve a cor do escuro (comportamento atual); com tema, devolve a do
   tema ativo. Nenhum chamador existente quebra.
4. **Remoção só no fim:** os exports `@deprecated` saem apenas quando `rg` acusar
   zero consumidores (Fase 6).

## Estratégia das fontes (Android/iOS) — se aprovada

1. `src/assets/fonts/` com um TTF por peso (RN não sintetiza peso no Android):
   `Barlow-Regular/Medium/SemiBold/Bold`, `BarlowCondensed-Bold/ExtraBold`.
2. `react-native.config.js` na raiz: `module.exports = { assets: ['./src/assets/fonts'] }`.
3. `npx react-native-asset` — copia p/ `android/app/src/main/assets/fonts/` e
   registra `UIAppFonts` no `ios/FOTEBALL/Info.plist` + Copy Bundle Resources.
4. **iOS:** conferir `UIAppFonts`, `cd ios && pod install`, rebuild. `fontFamily` =
   **PostScript name** (validar com `fc-scan`/Font Book — pode diferir do arquivo).
5. **Android:** `fontFamily` = nome-base do arquivo; sem `fonts.xml`.
6. `tokens/typography.ts`: cada papel com `fontFamily` explícito por peso.
7. **Validação dedicada:** build Android **e** iOS + render de 1 tela confirmando
   que a família aparece (não caiu no fallback). Se iOS não puder ser validado no
   ambiente, a fonte não é dada como concluída.

## Critérios de aceite

- `typecheck` ✅ · `lint` ✅ (sem novos warnings) · `test` ✅ (novos testes verdes).
- Showcase renderiza **todos os tokens e os 4 primitives nos dois temas**, com
  troca claro↔escuro↔sistema ao vivo.
- `modo` **persiste** entre reinícios; `sistema` acompanha o SO.
- **Zero regressão:** as 23 telas seguem idênticas (escuras via bridge); nada de
  domínio/engine/save alterado.
- Sem `any`/`@ts-ignore` novos; sem hex fora dos arquivos de token.
- `StatusBar` adapta ao tema.
- (Se fontes) mesma renderização em Android e iOS.

## Testes planejados

- **Unitários (Jest puro):** paridade de chaves claro/escuro; resolução de modo
  (`sistema`→Appearance); funções de cor com tema por parâmetro; formatação
  tabular do papel Numeric.
- **Componente (`react-test-renderer`):** Text aplica variant/color/tabular; Box
  aplica tokens; Pressable respeita 44/48 e estado disabled; Icon resolve nome.

## Riscos e plano de rollback

| Risco | Mitigação |
|---|---|
| Mudar assinatura das funções de cor quebra chamadas | overload com default = escuro; nenhum chamador atual muda |
| Listener de `Appearance` recriado / vazamento | assinatura única no provider, com cleanup |
| Bridge deixar telas "meio migradas" | telas const-locked **não** são tocadas; migram só na fase própria |
| Fontes: falha de build nativo (iOS pod / Android) | fontes **gated** e validadas à parte em Android+iOS antes de dar como prontas |
| Divergência clara/escuro do véu/scrim | tokenizar scrim já na Fase 1 (`overlay`) |

**Rollback:** a fase é **aditiva** — todo o novo vive em `src/design-system/` e num
campo do store. Reverter = apagar `src/design-system/` + reverter
`useTemaStore/App/theme` (diffs pequenos). Como os exports antigos permanecem, as
telas ficam intactas. Tudo em `feat/design-system-v2`, **sem commit** até sua
aprovação.

# 0001 — Reconstruir a apresentação como Design System v2 ("Sala de Análise")

- **Status:** Aceito
- **Data:** 2026-07-12
- **Branch:** `feat/design-system-v2`
- **Fonte:** `FOTEBALL_BRIEFING_IDENTIDADE_VISUAL.md` (auditoria de 12/07/2026)

## Contexto

O FOTEBALL tem um motor de jogo maduro e determinístico, mas a camada de
apresentação acumulou dívidas que limitam a evolução:

1. **Tema único e escuro.** Toda a UI vive na metáfora "noite de estádio".
   Cria personalidade, mas prejudica a leitura de tabelas, listas e telas
   densas de números.
2. **Migração de tema incompleta.** O projeto já introduziu `useTema()`/
   `useEstilos()`, mas **24 de 24 telas ainda importam os tokens como
   constante** (`import {cores} from '../../theme'`) — capturando a paleta no
   carregamento do módulo. Isso impede, na prática, oferecer tema claro/escuro.
3. **Tokens incompletos.** Faltam tokens semânticos completos, estados de
   interação, motion, tamanhos e cores esportivas separadas das cores de UI.
4. **Sem família tipográfica própria.** A tipografia depende de `fontWeight`
   do sistema — resultado diverge entre Android e iOS.
5. **Listas não virtualizadas.** Elenco/mercado/calendário/timeline usam
   `ScrollView` + `.map()`; apenas 1 tela usa `FlatList`.
6. **Estados de produto não padronizados** (loading/skeleton/vazio/erro) e
   **acessibilidade parcial**.

Referência de princípio (organização de dados, densidade escaneável): Sofascore
— **sem** copiar marca, fonte, ícones ou telas.

## Decisão

Executar uma **reconstrução incremental** da camada de apresentação sob o
conceito "Sala de Análise": superfícies claras por padrão, números fortes,
decisões visíveis e listas rápidas.

Princípios inegociáveis desta reconstrução:

- **Não reescrever o jogo.** Motor determinístico, Zustand, SQLite, React
  Navigation, Reanimated, Gesture Handler, SVG e Lucide são **preservados**.
- **Nada de Expo.** Continua React Native CLI.
- **Tema claro é o padrão**, com claro/escuro/sistema reais e persistidos.
- Criar `src/design-system/` (tokens → primitives → components → sports), com
  regra de dependência estrita e **proibição de hex direto em telas**.
- **Barlow / Barlow Condensed** empacotadas localmente (TTF estáticos).
- Migração **fase a fase**, cada fase com critério de aceite; `src/theme` vira
  ponte temporária (`@deprecated`) até `rg` confirmar zero consumidores.
- Qualidade preservada: TypeScript strict, sem `any`/`@ts-ignore` novos,
  determinismo do motor intacto, save compatível (ou migração versionada),
  `typecheck`/`lint`/`test` verdes a cada fase.

Novas dependências (FlashList, Bottom Sheet, Bootsplash, Haptics, Testing
Library, Detox) entram **apenas quando a fase exigir** e mediante autorização
explícita — cada uma será registrada em seu próprio ADR.

## Consequências

**Positivas:** leitura muito melhor em telas densas; base para tema
claro/escuro; identidade tipográfica consistente entre plataformas; listas
performáticas; acessibilidade e estados padronizados.

**Custos/risco:** esforço grande e transversal (24 telas + ~28 componentes);
risco de regressão visual durante a ponte de compatibilidade; assets binários
de fonte a empacotar; necessidade de builds Android/iOS para validar fontes e
dependências nativas.

**Mitigação:** fases pequenas e reversíveis; `src/theme` mantém exports antigos
como ponte; nenhuma funcionalidade removida; validação (typecheck/lint/test) ao
fim de cada fase; PR único ao final do épico (sem merges intermediários na
`main`).

## Alternativas consideradas

- **Adotar React Native Paper / NativeWind / Unistyles.** Rejeitado agora:
  duplicaria a linguagem de estilo durante a migração e diluiria a identidade
  própria. O projeto já tem primitivos e precisa de cara distinta.
- **Só clarear o tema atual (sem design system).** Rejeitado: não resolve a
  captura de paleta em tempo de módulo, os tokens incompletos nem as listas.
- **Reescrever a UI do zero.** Rejeitado: descartaria trabalho funcional e
  arriscaria o motor. A intervenção correta é migração incremental.

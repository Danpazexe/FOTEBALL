# ROADMAP_CORE_10_10.md
> Plano de implementação para transformar a core do FOTEBALL em 10/10.

---

## Visão geral

O FOTEBALL já possui uma core funcional. Este roadmap existe para orientar a evolução com segurança, sem quebrar a `main` e sem adicionar features superficiais antes de blindar o coração do jogo.

Prioridade absoluta:

```txt
1. Regras protegidas
2. Testes
3. Balanceamento
4. Temporada longa
5. Mercado coerente
6. Refatoração segura
7. UX premium
```

---

## Fase 0 — Preparação Git

### Objetivo

Garantir que o trabalho aconteça fora da `main`.

### Branch

```txt
feat/foteball-core-10-10
```

Ou dividir por fase:

```txt
feat/formation-validation
feat/match-balance-lab
feat/season-flow-tests
feat/market-ai-improvements
feat/store-refactor
feat/manager-ux
```

### Comandos

```bash
git checkout main
git pull origin main
git checkout -b feat/formation-validation
```

### Critério de pronto

```txt
✅ branch criada
✅ nenhuma alteração direta na main
✅ projeto abre normalmente
```

---

## Fase 1 — Validação central de escalação

### Objetivo

Impedir que formações inválidas entrem na core.

### Arquivo principal

```txt
src/engine/tactics/formationValidation.ts
```

### Regras obrigatórias

```txt
- exatamente 11 titulares
- exatamente 1 goleiro
- nenhum jogador repetido
- nenhum titular lesionado
- nenhum titular suspenso
- todos os jogadores pertencem ao clube
- mínimo de 3 defensores de linha
- mínimo de 2 meio-campistas
- mínimo de 1 atacante
```

### Warnings

```txt
- jogador improvisado
- jogador com condição física baixa
- jogador com moral baixa
- banco insuficiente
```

### Interface sugerida

```ts
export interface FormationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validarFormacao(args: {
  formacao: Formacao;
  jogadores: Player[];
  clubeId: string;
}): FormationValidationResult;
```

### Integração

Integrar na ação de atualização de formação do store.

Se inválida:

```txt
- não salvar a formação
- adicionar mensagem no jogo
- permitir feedback para UI
```

### Commits sugeridos

```bash
git commit -m "feat(tactics): add formation validation"
git commit -m "refactor(store): block invalid formations"
```

### Critério de pronto

```txt
✅ formação inválida bloqueada
✅ warnings gerados
✅ store integrada
✅ typecheck/lint/test passam
```

---

## Fase 2 — Testes de escalação

### Objetivo

Garantir que a validação nunca regrida.

### Arquivo sugerido

```txt
src/engine/tactics/__tests__/formationValidation.test.ts
```

### Casos mínimos

```txt
- formação válida
- sem goleiro
- dois goleiros
- menos de 11 titulares
- mais de 11 titulares
- jogador repetido
- jogador lesionado
- jogador suspenso
- jogador de outro clube
- sem defensores suficientes
- sem meio suficiente
- sem atacante
- improviso gera warning
```

### Commit sugerido

```bash
git commit -m "test(tactics): cover formation validation rules"
```

### Critério de pronto

```txt
✅ testes cobrem regras críticas
✅ npm run test passa
```

---

## Fase 3 — Laboratório de balanceamento de partidas

### Objetivo

Medir a engine em massa antes de ajustar probabilidade.

### Arquivo sugerido

```txt
src/engine/simulation/__tests__/matchBalance.test.ts
```

Ou script:

```txt
scripts/balanceMatches.ts
```

### Cenários

```txt
- 1.000 jogos entre times parelhos
- 1.000 jogos time forte x fraco
- 1.000 jogos variando mando
- 1 temporada completa simulada
```

### Métricas

```txt
- média de gols
- empates
- vitória mandante
- vitória visitante
- goleadas
- pênaltis
- cartões
- lesões
- impacto da tática
```

### Metas

```txt
Gols por jogo: 2.4 a 3.1
Empates: 22% a 30%
Vitória mandante: 42% a 50%
Goleadas: raras
Pênaltis: ocasionais
Lesões: raras
```

### Commit sugerido

```bash
git commit -m "test(simulation): add match balance laboratory"
```

### Critério de pronto

```txt
✅ métricas disponíveis
✅ resultados reproduzíveis
✅ mesma seed gera mesmo resultado
```

---

## Fase 4 — Ajuste de probabilidade

### Objetivo

Ajustar a engine com base em dados reais do laboratório.

### Arquivo provável

```txt
src/engine/simulation/probabilityCalc.ts
```

### Regras

```txt
- medir antes
- ajustar pouco
- medir depois
- documentar mudança
- não transformar tática em botão mágico
```

### Commit sugerido

```bash
git commit -m "fix(simulation): tune match probability balance"
```

### Critério de pronto

```txt
✅ gols dentro da faixa alvo
✅ empates dentro da faixa alvo
✅ time forte vence mais sem eliminar zebras
```

---

## Fase 5 — Teste de temporada completa

### Objetivo

Garantir que o jogo sustenta uma temporada inteira.

### Arquivo sugerido

```txt
src/store/__tests__/seasonFlow.store.test.ts
```

### Fluxo

```txt
- iniciar carreira
- avançar 38 rodadas
- validar tabela
- validar partidas jogadas
- finalizar temporada
- criar temporada seguinte
- validar evolução/envelhecimento
- validar acesso/rebaixamento
```

### Commit sugerido

```bash
git commit -m "test(season): cover full season flow"
```

### Critério de pronto

```txt
✅ temporada completa sem crash
✅ tabela consistente
✅ nova temporada criada
✅ nenhum estado trava na rodada final
```

---

## Fase 6 — Save/load de carreira longa

### Objetivo

Garantir que o jogador não perde carreira.

### Testes

```txt
- salvar antes da rodada
- carregar antes da rodada
- salvar depois da rodada
- carregar depois da rodada
- salvar fim de temporada
- carregar temporada seguinte
- fallback de backup quando possível
```

### Commit sugerido

```bash
git commit -m "test(save): cover long career persistence"
```

### Critério de pronto

```txt
✅ save funciona no meio da temporada
✅ save funciona no fim da temporada
✅ snapshot não perde dados críticos
```

---

## Fase 7 — Mercado IA mais lógico

### Objetivo

Fazer a IA negociar com mais coerência.

### Arquivos prováveis

```txt
src/engine/transfers/mercadoIA.ts
src/engine/transfers/negociacaoEngine.ts
src/store/useGameStore.ts
```

### Melhorias

```txt
- considerar necessidade por posição
- considerar saldo financeiro
- considerar idade
- considerar overall/potencial
- considerar clube endividado
- considerar importância do jogador
- evitar compra inútil
```

### Commit sugerido

```bash
git commit -m "feat(transfers): improve AI market decisions"
```

### Critério de pronto

```txt
✅ IA compra com lógica
✅ IA respeita saldo
✅ clube endividado vende mais
✅ mercado gera mensagens coerentes
```

---

## Fase 8 — Refatoração segura do store

### Objetivo

Reduzir o tamanho e acoplamento do `useGameStore.ts` sem quebrar comportamento.

### Regra

Só refatorar depois de testes cobrirem o fluxo.

### Estratégia

```txt
1. extrair helpers puros
2. extrair validações
3. separar lógica de mercado
4. separar lógica de temporada
5. separar lógica de carreira
```

### Não fazer

```txt
- refatoração gigante
- renomeação em massa sem necessidade
- mudança de comportamento sem teste
```

### Commit sugerido

```bash
git commit -m "refactor(store): extract season helpers"
```

### Critério de pronto

```txt
✅ store menor
✅ testes continuam verdes
✅ comportamento preservado
```

---

## Fase 9 — UX de manager

### Objetivo

Transformar informação da core em decisão clara para o jogador.

### Telas prioritárias

```txt
Gabinete/Home
Elenco/Escalação
Pré-jogo
Partida
Mercado
```

### Melhorias

```txt
- alertas de escalação inválida
- força do adversário
- jogador cansado
- jogador improvisado
- lesionados/suspensos
- moral média
- risco de demissão
- impacto financeiro
- sugestões táticas
```

### Commit sugerido

```bash
git commit -m "feat(ux): improve manager decision screens"
```

### Critério de pronto

```txt
✅ jogador entende problemas antes da partida
✅ UI mostra riscos claros
✅ partida parece mais viva
```

---

## Ordem recomendada de PRs

```txt
PR 1: feat/formation-validation
PR 2: feat/match-balance-lab
PR 3: feat/season-flow-tests
PR 4: feat/save-load-long-career
PR 5: feat/market-ai-improvements
PR 6: refactor/store-slices
PR 7: feat/manager-ux
```

---

## Definição final de 10/10

```txt
✅ 5 temporadas sem crash
✅ save/load confiável
✅ escalação inválida bloqueada
✅ partidas balanceadas
✅ mercado coerente
✅ finanças relevantes
✅ demissão justa
✅ UI clara
✅ testes cobrindo core
✅ CI verde
```

---

*ROADMAP_CORE_10_10.md · Plano de evolução técnica do FOTEBALL*

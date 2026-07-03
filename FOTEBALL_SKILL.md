# FOTEBALL_SKILL.md
> Contrato de engenharia para Claude Code trabalhar no FOTEBALL.

---

## 1. Papel

Você é um engenheiro sênior trabalhando no repositório FOTEBALL.

Você não deve agir como assistente genérico. Seu trabalho é ler o código existente, preservar a arquitetura funcional, implementar mudanças seguras, criar testes e entregar código pronto para revisão.

Cada alteração deve respeitar:

- domínio do jogo;
- estrutura real do repositório;
- TypeScript strict;
- CI existente;
- fluxo Git com branch `feat/...`;
- testes obrigatórios para lógica de negócio.

---

## 2. Documentos obrigatórios

Antes de implementar, leia:

```txt
CLAUDE.md
BRASFOOT_MASTER.md
FOTEBALL_ATUALIZACAO_10_10.md
ROADMAP_CORE_10_10.md
TESTES_BALANCEAMENTO.md
GIT_WORKFLOW_FOTEBALL.md
```

Se algum documento não existir no repositório, siga o conteúdo presente nesta pasta e não invente regras conflitantes.

---

## 3. Fluxo Git obrigatório

Nunca trabalhe direto na `main`.

Antes de alterar arquivos:

```bash
git branch --show-current
```

Se estiver na `main`:

```bash
git checkout main
git pull origin main
git checkout -b feat/nome-da-tarefa
```

Exemplos de branches:

```txt
feat/formation-validation
feat/match-balance-lab
feat/season-flow-tests
feat/market-ai-improvements
feat/store-refactor
feat/manager-ux
```

Nunca faça merge na `main` sem PR.

---

## 4. Comandos obrigatórios

Antes de concluir qualquer tarefa:

```bash
npm run typecheck
npm run lint
npm run test
```

Se algum falhar, corrija antes de reportar conclusão.

Não entregue com:

- erro de TypeScript;
- teste quebrado;
- lint quebrado;
- `any` desnecessário;
- `@ts-ignore`;
- alteração sem teste quando mexer em regra de negócio.

---

## 5. Regra de leitura do projeto

Antes de editar, localize a implementação real.

Não assuma que os arquivos têm exatamente os nomes de documentação. O repositório real pode ter organização em módulos como:

```txt
src/engine/simulation
src/engine/season
src/engine/transfers
src/engine/progression
src/engine/finance
src/engine/carreira
src/engine/tactics
src/store/useGameStore.ts
src/types
src/screens
src/components
src/theme
src/navigation
```

Use a estrutura real do repositório como fonte da verdade.

---

## 6. Regras de engine

Arquivos dentro de `src/engine/` devem ser lógica pura sempre que possível.

Evite:

- React;
- UI;
- navegação;
- side effects;
- acesso direto a SQLite;
- dependência de tela;
- `Math.random()`;
- datas atuais sem parâmetro;
- mutação perigosa.

Prefira:

- funções puras;
- entrada e saída tipadas;
- RNG por seed;
- testes unitários;
- pequenas funções coesas.

---

## 7. Regra de store

`useGameStore.ts` coordena estado e ações do jogo.

Não coloque toda regra nova diretamente no store se ela puder viver na engine.

Preferência:

```txt
Regra de negócio → src/engine/...
Coordenação de estado → src/store/useGameStore.ts
Visualização → src/screens ou src/components
```

Exemplo:

- validação de escalação deve viver em `src/engine/tactics/formationValidation.ts`;
- `useGameStore` apenas chama a validação e decide se salva ou rejeita.

---

## 8. Nomenclatura

Use português para domínio do jogo:

```txt
calcularForcaTime
simularPartida
atualizarTabela
validarFormacao
processarMercadoIA
aplicarTreino
```

Use inglês para termos técnicos ou APIs nativas quando já existirem no projeto:

```txt
useCallback
renderItem
StackNavigator
TabNavigator
```

Não renomeie arquivos/funções existentes sem necessidade. Renomeação ampla exige motivo forte e testes.

---

## 9. Ordem correta de implementação

A ordem de prioridade para deixar o jogo 10/10 é:

```txt
1. Validação central de escalação
2. Testes da validação
3. Laboratório de balanceamento da partida
4. Testes de temporada completa
5. Save/load em fluxo longo
6. Mercado IA mais inteligente
7. Refatoração segura do store
8. UX de gabinete, pré-jogo e partida
```

Não pule para features visuais antes de blindar core.

---

## 10. Validação de escalação

Implementar ou revisar:

```txt
src/engine/tactics/formationValidation.ts
```

Deve validar:

```txt
- 11 titulares
- 1 goleiro
- sem jogador repetido
- sem lesionado
- sem suspenso
- todos pertencem ao clube
- mínimo de defensores
- mínimo de meio-campistas
- mínimo de atacantes
- warnings de improviso/condição baixa
```

Criar testes:

```txt
src/engine/tactics/__tests__/formationValidation.test.ts
```

Integrar na ação de atualização de formação do store.

---

## 11. Balanceamento de partidas

Criar script/teste para simular partidas em massa.

Métricas mínimas:

```txt
- média de gols
- empates
- vitórias mandante
- goleadas
- pênaltis
- cartões
- lesões
- vantagem de time forte
- impacto da tática
```

Não ajustar `probabilityCalc.ts` sem medir antes e depois.

---

## 12. Testes de temporada

Criar teste de fluxo completo:

```txt
- iniciar carreira
- avançar 38 rodadas
- validar tabela
- finalizar temporada
- gerar próxima temporada
- testar evolução
- testar acesso/rebaixamento
- testar save/load
```

O objetivo é provar que o jogo suporta carreira longa.

---

## 13. Mercado IA

Melhorar sem exagerar.

Prioridade:

```txt
1. saldo financeiro
2. necessidade por posição
3. overall/potencial
4. idade
5. situação financeira do vendedor
6. importância do jogador
7. contrato
```

A IA não deve comprar jogador aleatório apenas porque há dinheiro.

---

## 14. Refatoração

Não refatore tudo de uma vez.

A sequência segura é:

```txt
1. criar testes
2. extrair funções puras
3. reduzir store aos poucos
4. manter comportamento
5. rodar typecheck/lint/test
```

Nunca faça refatoração gigante junto com feature grande.

---

## 15. UX

UX só deve vir depois da core crítica.

Telas prioritárias:

```txt
Gabinete/Home
Elenco/Escalação
Pré-jogo
Partida
Mercado
```

A UI deve explicar:

- por que uma escalação é inválida;
- por que o time perdeu força;
- quem está cansado;
- quem está improvisado;
- como está a moral;
- impacto financeiro;
- risco de demissão.

---

## 16. Protocolo de entrega

Ao finalizar, responda neste formato:

```md
## ✅ [nome da tarefa]

Branch usada:
- feat/...

Arquivos criados:
- ...

Arquivos modificados:
- ...

Testes criados/alterados:
- ...

Comandos executados:
- npm run typecheck: ✅/❌
- npm run lint: ✅/❌
- npm run test: ✅/❌

Resumo técnico:
- ...

Riscos conhecidos:
- ...

Próximo passo recomendado:
- ...
```

Não diga que terminou se algum check falhou.

---

## 17. Proibido

Não fazer:

```txt
- commit direto na main
- merge direto na main
- trocar React Native CLI por Expo
- trocar Zustand por outra store
- trocar SQLite por AsyncStorage/MMKV
- reescrever o projeto inteiro
- introduzir feature sem teste quando mexer em core
- esconder erro com @ts-ignore
- criar arquivo duplicando regra já existente
- quebrar save sem migração
```

---

## 18. Definição de pronto

Uma tarefa está pronta quando:

```txt
✅ código implementado
✅ testes relevantes criados
✅ typecheck passa
✅ lint passa
✅ test passa
✅ branch feat enviada
✅ PR pode ser aberto
✅ resumo técnico entregue
```

---

*FOTEBALL_SKILL.md · Contrato de engenharia · Claude Code*

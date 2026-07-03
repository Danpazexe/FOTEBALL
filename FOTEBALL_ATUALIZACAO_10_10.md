# FOTEBALL — Atualização 10/10

> Documento de escopo técnico para evoluir o FOTEBALL de uma core funcional para um game 10/10, com regras blindadas, balanceamento, testes, organização de código, fluxo Git seguro e instruções claras para execução no Claude.

---

## 1. Projeto

**Nome:** FOTEBALL  
**Repositório:** `https://github.com/Danpazexe/FOTEBALL`  
**Stack:** React Native CLI + TypeScript  
**Estilo:** Brasfoot / Soccer Manager  
**Objetivo:** game mobile de gerenciamento de futebol com carreira de técnico, elenco, mercado, finanças, treino, partidas, Copa, evolução de jogadores e temporadas.

---

## 2. Diagnóstico Atual

O FOTEBALL já possui uma base forte e funcional.

Estado estimado atual:

```txt
Core atual: 8/10
Funcionalidade jogável: 7.5/10
Meta desta atualização: 10/10
```

O projeto já possui:

```txt
- React Native CLI
- TypeScript
- Zustand
- SQLite / op-sqlite
- React Navigation
- Reanimated
- SVG
- CI com typecheck, lint e testes
- Store principal em src/store/useGameStore.ts
- Engine de partida em src/engine/simulation
- Engine de carreira em src/engine/carreira
- Engine de temporada em src/engine/season
- Engine de transferências em src/engine/transfers
- Engine de progressão em src/engine/progression
```

A core atual já suporta:

```txt
- iniciar carreira
- selecionar clube
- gerar liga
- gerar calendário
- simular partidas
- partida ao vivo
- atualizar tabela
- moral dos jogadores
- condição física
- treino
- academia/base
- Copa do Brasil
- mercado de transferências
- mercado IA↔IA
- contratos
- empréstimos
- finanças
- estádio
- preço de ingresso
- reputação do técnico
- demissão
- save/load
- final de temporada
- evolução/envelhecimento dos jogadores
- acesso/rebaixamento
```

Conclusão:

```txt
O projeto está em alpha avançado / MVP jogável.
O próximo passo não é criar features aleatórias, mas blindar, testar, balancear e organizar a core.
```

---

## 3. Regra Principal da Atualização

Não reescrever o app inteiro.

A evolução deve ser incremental, segura e validada por testes.

Ordem de prioridade:

```txt
1. Estabilidade
2. Regras corretas
3. Testes
4. Balanceamento
5. Organização de código
6. UX
7. Novas features
```

Nunca alterar comportamento sensível sem teste cobrindo.

---

## 4. Fluxo Git Obrigatório

O Claude não deve trabalhar direto na `main`.

Antes de implementar qualquer coisa, seguir este fluxo:

```bash
git checkout main
git pull origin main
git checkout -b feat/foteball-core-10-10
```

Toda implementação deve acontecer na branch:

```txt
feat/foteball-core-10-10
```

Ou, preferencialmente, em branches menores por fase:

```txt
feat/formation-validation
feat/match-balance-lab
feat/season-flow-tests
feat/market-ai-improvements
feat/store-refactor
feat/manager-ux
```

### Regras Git

```txt
- Nunca fazer commit direto na main
- Nunca fazer push direto para main
- Sempre trabalhar em branch feat/...
- Fazer commits pequenos e claros
- Usar Conventional Commits
- Abrir Pull Request para main ao finalizar
- Fazer merge apenas depois dos testes passarem
```

### Exemplos de commits

```bash
git commit -m "feat(tactics): add formation validation"
git commit -m "test(tactics): cover invalid formations"
git commit -m "feat(simulation): add match balance lab"
git commit -m "refactor(store): integrate formation validation"
git commit -m "fix(simulation): adjust match probability balance"
```

---

## 5. Comandos Obrigatórios Antes de Commit

Antes de qualquer commit, rodar:

```bash
npm run typecheck
npm run lint
npm run test
```

Se algum comando falhar:

```txt
- Corrigir antes de commitar
- Não ignorar erro
- Não comentar teste para passar
- Não remover regra sem justificativa
- Não fazer push com CI quebrado
```

---

# FASE 1 — Blindagem da Escalação

## Objetivo

Criar validação central de escalação na core do jogo.

Hoje a escalação não pode depender apenas da UI. A regra precisa viver na engine/core.

## Criar arquivo

```txt
src/engine/tactics/formationValidation.ts
```

## Regras obrigatórias

A formação deve validar:

```txt
- exatamente 11 titulares
- exatamente 1 goleiro titular
- nenhum jogador repetido
- nenhum jogador lesionado como titular
- nenhum jogador suspenso como titular
- todos os jogadores pertencem ao clube
- mínimo de 3 jogadores defensivos
- mínimo de 2 meio-campistas
- mínimo de 1 atacante
- identificar jogadores improvisados
- retornar erros claros para a UI
```

## Interface sugerida

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

## Integrar na store

Arquivo:

```txt
src/store/useGameStore.ts
```

Ação:

```txt
atualizarFormacaoUsuario
```

Comportamento esperado:

```txt
- Se a formação for válida: salvar normalmente
- Se a formação for inválida: bloquear alteração
- Adicionar mensagem clara no jogo
- Não deixar formação inválida ir para partida
```

## Critérios de aceite

```txt
✅ formação inválida nunca entra em campo
✅ jogador lesionado não pode ser titular
✅ jogador suspenso não pode ser titular
✅ jogador repetido é bloqueado
✅ sem goleiro é bloqueado
✅ com dois goleiros é bloqueado
✅ menos de 11 titulares é bloqueado
✅ mais de 11 titulares é bloqueado
✅ jogador de outro clube é bloqueado
✅ erros e avisos são claros
```

---

# FASE 2 — Testes da Escalação

## Criar testes

Arquivo sugerido:

```txt
src/engine/tactics/__tests__/formationValidation.test.ts
```

## Casos obrigatórios

```txt
- formação válida
- sem goleiro
- dois goleiros
- jogador repetido
- jogador lesionado
- jogador suspenso
- jogador de outro clube
- titulares insuficientes
- titulares acima de 11
- formação sem atacantes
- formação sem meio-campistas
- formação com defesa insuficiente
- jogador improvisado gera warning, não necessariamente erro
```

## Critérios de aceite

```txt
✅ todos os testes passando
✅ npm run typecheck passando
✅ npm run lint passando
✅ npm run test passando
```

---

# FASE 3 — Laboratório de Balanceamento da Partida

## Objetivo

Medir a engine de partida em massa para calibrar o jogo.

A engine já existe, mas precisa ser validada estatisticamente.

## Arquivos sugeridos

Opção de teste:

```txt
src/engine/simulation/__tests__/matchBalance.test.ts
```

Opção de script:

```txt
scripts/balanceMatches.ts
```

## Simulações obrigatórias

```txt
- 1.000 partidas entre times parelhos
- 1.000 partidas time forte x time fraco
- 1.000 partidas com mando de campo
- 1 temporada completa
- 10 temporadas completas, se possível
```

## Métricas a coletar

```txt
- média de gols por jogo
- porcentagem de vitórias do mandante
- porcentagem de empates
- porcentagem de goleadas
- frequência de pênaltis
- frequência de cartões
- frequência de lesões
- impacto da diferença de overall
- impacto da tática
```

## Metas aproximadas

```txt
Gols por jogo: 2.4 a 3.1
Empates: 22% a 30%
Vitória mandante: 42% a 50%
Goleadas: possíveis, mas raras
Time forte: vantagem clara, mas sem vitória automática
Tática: influencia, mas não vira botão mágico
```

## Arquivo provável de ajuste

```txt
src/engine/simulation/probabilityCalc.ts
```

## Regra

Não ajustar no escuro.

Fluxo correto:

```txt
1. Medir
2. Analisar
3. Ajustar pouco
4. Medir de novo
5. Documentar o resultado
```

## Critérios de aceite

```txt
✅ existe teste/script de balanceamento
✅ métricas aparecem no console ou relatório
✅ placares absurdos reduzem
✅ zebras continuam possíveis
✅ tática influencia sem quebrar o jogo
```

---

# FASE 4 — Teste de Temporada Completa

## Objetivo

Garantir que o jogo aguenta uma temporada inteira sem quebrar.

## Arquivos sugeridos

```txt
src/engine/season/__tests__/seasonFlow.test.ts
```

ou:

```txt
src/store/__tests__/seasonFlow.store.test.ts
```

## Testar

```txt
- iniciar carreira
- simular 38 rodadas
- tabela fechar corretamente
- todas as partidas serem jogadas
- rodadaAtual avançar corretamente
- finalizar temporada
- gerar nova temporada
- jogadores envelhecerem
- jogadores evoluírem/regredirem
- acesso/rebaixamento funcionar
- Copa não quebrar o fluxo
- save/load no meio da temporada
- save/load no final da temporada
```

## Critérios de aceite

```txt
✅ é possível simular uma temporada completa sem crash
✅ tabela mantém 20 clubes
✅ calendário mantém consistência
✅ nenhuma partida fica duplicada
✅ nenhuma rodada fica travada
✅ temporada seguinte é criada corretamente
✅ save/load continua funcionando
```

---

# FASE 5 — Mercado Mais Inteligente

## Objetivo

Melhorar a IA do mercado sem transformar o sistema em algo complexo demais.

## Arquivos prováveis

```txt
src/engine/transfers/negociacaoEngine.ts
src/engine/transfers/mercadoIA.ts
src/store/useGameStore.ts
```

## Melhorias desejadas

```txt
- IA considerar necessidade por posição
- clube comprador não contratar jogador inútil
- clube sem dinheiro não comprar
- clube endividado aceitar propostas menores
- clube grande segurar craques
- jogador jovem valer mais
- veterano perder valor
- contrato próximo do fim facilitar negociação
- jogador sem espaço ficar insatisfeito
- propostas recebidas ficarem mais realistas
```

## Prioridade de lógica

```txt
1. Necessidade por posição
2. Saldo financeiro
3. Idade / overall / potencial
4. Situação do clube
5. Contrato
6. Moral / insatisfação
```

## Critérios de aceite

```txt
✅ IA compra com lógica mais clara
✅ IA não compra jogador aleatório sem necessidade
✅ clubes pobres não gastam como ricos
✅ clubes endividados vendem mais
✅ mercado gera notícias melhores
✅ jogador muda de clube corretamente
✅ dinheiro sai do comprador e entra no vendedor
```

---

# FASE 6 — Refatoração Segura do useGameStore

## Problema

O arquivo abaixo concentra responsabilidades demais:

```txt
src/store/useGameStore.ts
```

Ele hoje carrega muita lógica de carreira, temporada, partida, mercado, finanças, treino, Copa, academia e demissão.

## Regra

Não refatorar tudo de uma vez.

Primeiro criar testes. Depois extrair gradualmente.

## Estrutura desejada no médio prazo

```txt
src/store/slices/careerSlice.ts
src/store/slices/seasonSlice.ts
src/store/slices/matchSlice.ts
src/store/slices/transferSlice.ts
src/store/slices/financeSlice.ts
src/store/slices/trainingSlice.ts
src/store/slices/academySlice.ts
src/store/slices/cupSlice.ts
```

## Ordem segura de extração

```txt
1. helpers puros
2. validações
3. lógica de carreira
4. lógica de temporada
5. lógica de mercado
6. lógica de treino
7. lógica de Copa
```

## Critérios de aceite

```txt
✅ código fica mais modular
✅ useGameStore diminui gradualmente
✅ testes continuam passando
✅ não há regressão funcional
✅ nenhuma regra some durante a refatoração
```

---

# FASE 7 — UX de Manager 10/10

## Objetivo

Depois da core estar protegida, melhorar a experiência do jogador.

Foco em três áreas:

```txt
1. Gabinete / Home
2. Elenco / Escalação
3. Pré-jogo / Partida
```

---

## 7.1 Gabinete / Home

Deve mostrar:

```txt
- próximo jogo
- posição na tabela
- moral do elenco
- saldo financeiro
- reputação do técnico
- alertas importantes
- propostas pendentes
- lesionados/suspensos
- objetivo da temporada
- notícias recentes
```

---

## 7.2 Elenco / Escalação

Deve mostrar claramente:

```txt
- overall
- posição
- moral
- condição física
- forma
- idade
- valor
- contrato
- lesionado
- suspenso
- improvisado
- status de titular/reserva
```

Também deve mostrar erro visual quando a formação for inválida.

---

## 7.3 Pré-jogo

Deve mostrar:

```txt
- força do seu time
- força do adversário
- melhor jogador adversário
- ponto fraco adversário
- sugestão tática
- risco de lesão/fadiga
- jogadores suspensos
- jogadores lesionados
- aviso de formação inválida
- moral antes do jogo
```

Exemplo de mensagem útil:

```txt
O adversário tem defesa lenta. Contra-ataque pode ser eficiente.
Seu lateral esquerdo está com 42% de condição: risco alto de queda física.
```

---

## 7.4 Partida

Melhorar:

```txt
- timeline de eventos
- momentum
- estatísticas
- substituições
- alerta de jogador cansado
- mudança tática durante o jogo
- narração contextual
- placar premium
- resumo pós-jogo mais claro
```

## Critérios de aceite

```txt
✅ jogador entende o que está acontecendo
✅ decisões ficam mais claras
✅ pré-jogo ajuda a pensar
✅ partida parece viva
✅ UI não esconde informação importante
```

---

# FASE 8 — Objetivos da Diretoria

## Objetivo

Adicionar expectativas por clube para dar mais profundidade à carreira.

## Exemplos

```txt
Clube grande: brigar por título / Libertadores
Clube médio: buscar Sul-Americana / meio da tabela
Clube pequeno Série A: escapar do rebaixamento
Clube forte Série B: buscar acesso
Clube Série C: reconstrução
```

## Impacto

Afeta:

```txt
- reputação do técnico
- risco de demissão
- orçamento
- moral
- cobrança da torcida
- mensagens no gabinete
```

## Critérios de aceite

```txt
✅ cada clube tem objetivo coerente
✅ objetivo aparece no gabinete
✅ objetivo afeta avaliação do técnico
✅ terminar acima/abaixo da meta muda reputação
```

---

# O Que Não Fazer Agora

Evitar nesta etapa:

```txt
- multiplayer
- online
- sistema de cartas antes da carreira estar redonda
- animação 3D de partida
- licenças reais complexas
- competições internacionais demais
- reescrever o app inteiro
- trocar stack
- mudar design system sem necessidade
- criar features grandes sem teste
```

O foco é transformar o manager em um jogo sólido.

---

# Checklist Final Para Considerar 10/10

O FOTEBALL só deve ser considerado 10/10 quando cumprir:

```txt
✅ Dá para jogar 5 temporadas sem quebrar save
✅ Tabela sempre fecha corretamente
✅ Mercado não gera absurdo
✅ Escalação inválida nunca entra em campo
✅ Time forte tem vantagem, mas zebra acontece
✅ Tática muda resultado sem virar botão mágico
✅ Jogador evolui/envelhece de forma convincente
✅ Finanças importam
✅ Demissão faz sentido
✅ UI deixa claro o que está acontecendo
✅ Testes cobrem a core
✅ CI bloqueia código quebrado
✅ Claude não commita direto na main
✅ Toda feature entra via branch feat/...
✅ Toda alteração relevante passa por PR
```

---

# Instrução Direta Para Claude

Cole este bloco no Claude quando for mandar implementar.

```txt
Você vai trabalhar no repositório FOTEBALL.

Antes de implementar qualquer coisa:

1. Não trabalhe direto na branch main.
2. Rode:

   git branch --show-current

3. Se estiver na main, execute:

   git checkout main
   git pull origin main
   git checkout -b feat/formation-validation

4. Comece apenas pela FASE 1: validação central de escalação.
5. Não avance para balanceamento, mercado ou UX antes de concluir a validação de escalação com testes.
6. Crie o arquivo:

   src/engine/tactics/formationValidation.ts

7. Crie os testes:

   src/engine/tactics/__tests__/formationValidation.test.ts

8. Integre na ação atualizarFormacaoUsuario em:

   src/store/useGameStore.ts

9. A store deve bloquear formações inválidas.
10. Após implementar, rode:

   npm run typecheck
   npm run lint
   npm run test

11. Se tudo passar, faça commit:

   git add .
   git commit -m "feat(tactics): add formation validation"

12. Envie a branch:

   git push origin feat/formation-validation

13. Não faça merge na main.
14. Não faça push direto para main.

Ao finalizar, entregue:

- Branch usada
- Arquivos alterados
- O que foi implementado
- Testes criados
- Resultado de typecheck/lint/test
- Próximo passo recomendado
```

---

# Ordem Recomendada de Branches

Executar uma branch por etapa:

```txt
1. feat/formation-validation
2. feat/match-balance-lab
3. feat/season-flow-tests
4. feat/market-ai-improvements
5. feat/store-refactor
6. feat/manager-ux
7. feat/board-objectives
```

Cada branch deve virar Pull Request separada para `main`.

---

# Proteção Recomendada da Branch Main

No GitHub:

```txt
Settings → Branches → Add branch protection rule → main
```

Marcar:

```txt
✅ Require a pull request before merging
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
✅ Restrict who can push to matching branches
✅ Do not allow force pushes
✅ Do not allow deletions
```

Isso impede commits diretos na `main` e força o fluxo profissional.

---

# Resumo Executivo

O FOTEBALL já tem uma core forte.

A atualização 10/10 deve seguir esta ordem:

```txt
1. Blindar escalação
2. Criar testes da escalação
3. Medir e balancear partidas
4. Testar temporada completa
5. Melhorar mercado IA
6. Refatorar store com segurança
7. Melhorar UX das telas principais
8. Adicionar objetivos da diretoria
```

Prioridade absoluta:

```txt
Escalação válida + testes + balanceamento de partida.
```

Não adicionar novas features grandes antes de proteger a core.


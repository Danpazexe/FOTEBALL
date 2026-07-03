# CLAUDE.md

> Lido automaticamente pelo Claude Code ao abrir o projeto.
> Projeto: **FOTEBALL** · Repositório: <https://github.com/Danpazexe/FOTEBALL>

---

## 1. QUEM VOCÊ É

Você é um **Engenheiro Sênior de Produto** trabalhando exclusivamente no projeto **FOTEBALL**.

Você não deve agir como assistente genérico. Você deve agir como responsável técnico por código que pode chegar à `main` via Pull Request.

Sua missão é evoluir o FOTEBALL como um jogo mobile de gerenciamento de futebol brasileiro, estilo **Brasfoot / Soccer Manager**, mantendo a core confiável, testável, determinística e pronta para produção.

Antes de iniciar qualquer tarefa, procure e leia, se existirem no repositório:

```txt
BRASFOOT_MASTER.md
FOTEBALL_SKILL.md
FOTEBALL_ATUALIZACAO_10_10.md
README.md
```

Se algum desses arquivos não existir, continue usando este `CLAUDE.md` como fonte principal de regras.

---

## 2. REGRA DE OURO

Não reescreva o projeto inteiro.

Trabalhe de forma incremental, segura e rastreável.

A prioridade do projeto é:

```txt
1. estabilidade
2. regras de jogo corretas
3. testes
4. balanceamento
5. organização interna
6. UX
7. novas features
```

Antes de grandes refatorações, crie testes.

Nunca troque stack, arquitetura ou dependências sem necessidade clara e sem autorização explícita.

---

## 3. FLUXO GIT OBRIGATÓRIO

### 3.1 Nunca trabalhe direto na `main`

Antes de qualquer alteração, rode:

```bash
git status
git branch --show-current
```

Se estiver na `main`, crie uma branch de feature:

```bash
git checkout main
git pull origin main
git checkout -b feat/nome-da-tarefa
```

Exemplos de branches corretas:

```txt
feat/formation-validation
feat/match-balance-lab
feat/season-flow-tests
feat/market-ai-improvements
feat/store-refactor
feat/manager-ux
```

### 3.2 Proibido

```txt
- fazer commit direto na main
- fazer push direto para main
- fazer merge na main sem Pull Request
- usar --force em main
- misturar várias features grandes em uma branch sem necessidade
```

### 3.3 Commits

Use commits pequenos no padrão Conventional Commits:

```bash
git commit -m "feat(tactics): add formation validation"
git commit -m "test(tactics): cover invalid formations"
git commit -m "feat(simulation): add match balance lab"
git commit -m "refactor(store): integrate formation validation"
git commit -m "fix(simulation): adjust match probability balance"
```

Tipos aceitos:

```txt
feat      nova funcionalidade
fix       correção de bug
refactor  reorganização sem mudar comportamento externo
test      testes
docs      documentação
chore     tarefa técnica/configuração
style     ajuste visual ou formatação sem alterar lógica
```

### 3.4 Antes de commitar

Sempre rode:

```bash
npm run typecheck
npm run lint
npm run test
```

Se algum comando falhar, corrija antes do commit.

---

## 4. O PROJETO

FOTEBALL é um jogo mobile de gerenciamento de futebol brasileiro.

O jogador assume um clube, monta elenco, escala o time, ajusta tática, disputa temporadas, negocia jogadores, gerencia finanças, lida com moral, treino, academia, Copa, acesso, rebaixamento e demissão.

O diferencial técnico do jogo é a core de simulação determinística:

```txt
mesma seed + mesmo estado de entrada = mesmo resultado
```

Isso é essencial para testes, replay, balanceamento e depuração.

---

## 5. STACK DO PROJETO — NÃO ALTERAR SEM AUTORIZAÇÃO

| Camada | Tecnologia | Regra |
|---|---|---|
| App | React Native CLI | Não converter para Expo |
| Linguagem | TypeScript strict | Não relaxar tipos |
| Estado | Zustand | Estado de domínio fica na store |
| Persistência | @op-engineering/op-sqlite | Não trocar por AsyncStorage/MMKV |
| Navegação | React Navigation | Preservar padrão atual |
| Animações | react-native-reanimated | Não usar Animated API para novas animações |
| Ícones | react-native-vector-icons / MaterialCommunityIcons | Não adicionar nova lib de ícones |
| Testes | Jest | Testar engine e fluxos críticos |
| CI | GitHub Actions | Não alterar workflow sem pedido explícito |

Não adicione dependências novas para resolver problema simples.

---

## 6. REGRAS QUE NUNCA DEVEM SER VIOLADAS

```txt
R-01  Math.random() é proibido em src/engine/.
      Use o RNG determinístico existente da engine.

R-02  Date.now() é proibido em src/engine/.
      Engine pura deve receber datas/timestamps por parâmetro.

R-03  import React é proibido em src/engine/.
      Engine é lógica pura, sem UI.

R-04  any é proibido.
      Corrija os tipos em vez de escapar deles.

R-05  @ts-ignore e @ts-nocheck são proibidos.
      Resolva o erro de tipo corretamente.

R-06  useState não deve guardar dados de domínio persistente.
      Use useGameStore/Zustand.

R-07  AsyncStorage e MMKV são proibidos para save do jogo.
      Use a camada SQLite atual.

R-08  Não remover teste para fazer CI passar.
      Corrija a causa.

R-09  Não alterar regra de negócio sem teste cobrindo o comportamento.

R-10  Toda tarefa concluída deve passar typecheck, lint e test.
```

---

## 7. ESTRUTURA REAL ESPERADA DO PROJETO

Preserve a estrutura atual do repositório.

A estrutura pode variar, mas a organização conceitual esperada é:

```txt
src/
├── api/
│   └── database/              # SQLite, seed, save storage
│
├── components/                # Componentes reutilizáveis de UI
│
├── data/                      # Dados do jogo, conquistas, seeds, etc.
│
├── engine/                    # Lógica pura de jogo — sem React
│   ├── carreira/              # reputação, demissão, crise financeira
│   ├── finance/               # bilheteria, cota TV, transações
│   ├── progression/           # evolução, treino, moral, academia, habilidades
│   ├── season/                # calendário, tabela, copa, temporada
│   ├── simulation/            # partida, força do time, probabilidades, RNG
│   ├── tactics/               # adaptação, regras táticas, validação de formação
│   └── transfers/             # negociação, mercado IA, empréstimos
│
├── navigation/                # React Navigation
│
├── screens/                   # Telas do aplicativo
│
├── store/                     # Zustand, persistência e ações do jogo
│   ├── useGameStore.ts
│   ├── useAchievementsStore.ts
│   └── persistence.ts
│
├── theme/                     # cores, espaçamentos, tipografia, tokens visuais
│
├── types/                     # Tipos de domínio e navegação
│
└── utils/                     # Helpers sem regra pesada de domínio

__tests__/                    # Testes existentes e novos testes críticos
```

Não invente uma estrutura paralela se já existe uma pasta adequada.

Se precisar criar um arquivo novo, coloque no módulo correto.

---

## 8. NOMENCLATURA

### 8.1 Regra geral

Preserve o padrão já existente no projeto.

O domínio do jogo pode usar português ou nomes já existentes em inglês, como `Player`, `Clube`, `Formacao`, `Tatica`, `Partida`, etc.

Não faça renomeação global apenas por estética.

### 8.2 Regras práticas

Use português para regras de negócio quando o projeto já estiver usando português:

```txt
calcularForcaTime
simularPartida
atualizarReputacao
verificarDemissao
gerarCalendarioLiga
aplicarBilheteria
```

Use inglês para termos técnicos comuns de React/TypeScript:

```txt
handlePress
renderItem
useCallback
props
state
screenOptions
```

Evite misturar no mesmo identificador:

```txt
Errado: calculateForca
Certo:  calcularForca

Errado: processarFinances
Certo:  processarFinancas

Errado: getJogadorById
Certo:  buscarJogadorPorId
```

---

## 9. TIPOS — FONTE DA VERDADE

Antes de criar qualquer tipo novo, procure nos arquivos existentes em:

```txt
src/types/
src/engine/**
src/store/**
```

Nunca redefina tipo que já existe.

Se precisar expandir um tipo existente, faça isso no arquivo canônico onde ele já vive.

Tipos centrais do domínio incluem, entre outros:

```txt
Clube
Player
Position
Formacao
Tatica
Partida
EventoPartida
EstatisticasPartida
TabelaClassificacao
EstadoFinanceiro
MotivoDemissao
ResultadoCarreira
```

---

## 10. CORE DO JOGO — REGRAS DE DOMÍNIO

### 10.1 Partida

A simulação de partida deve continuar determinística.

Toda aleatoriedade da engine deve sair de seed controlada.

A engine deve considerar, quando aplicável:

```txt
- força do time
- ataque, meio e defesa
- goleiro separado
- moral
- forma
- condição física
- adaptação por posição
- tática
- mando de campo
- cartões
- lesões
- pênaltis
- eventos de gol
- assistências
- substituições
- estatísticas da partida
```

Arquivos prováveis:

```txt
src/engine/simulation/matchSimulator.ts
src/engine/simulation/teamStrength.ts
src/engine/simulation/probabilityCalc.ts
src/engine/simulation/matchStats.ts
src/engine/simulation/rng.ts
```

### 10.2 Temporada

O fluxo de temporada deve preservar:

```txt
- calendário consistente
- 38 rodadas para liga de 20 clubes
- tabela atualizada corretamente
- partidas sem duplicidade
- fim de temporada seguro
- evolução/envelhecimento dos jogadores
- acesso/rebaixamento
- Copa em paralelo quando aplicável
```

Arquivos prováveis:

```txt
src/engine/season/calendarGenerator.ts
src/engine/season/classification.ts
src/engine/season/copaEngine.ts
src/store/useGameStore.ts
```

### 10.3 Mercado

O mercado deve ser coerente e não aleatório demais.

A IA deve considerar progressivamente:

```txt
- valor de mercado
- overall
- idade
- posição
- necessidade do clube
- saldo financeiro
- clube endividado
- contrato
- moral/insatisfação
- potencial
```

Arquivos prováveis:

```txt
src/engine/transfers/negociacaoEngine.ts
src/engine/transfers/mercadoIA.ts
src/engine/transfers/emprestimoEngine.ts
src/store/useGameStore.ts
```

### 10.4 Carreira

A carreira deve manter coerência em:

```txt
- reputação do técnico
- derrotas consecutivas
- demissão
- falência
- salários atrasados
- moral do elenco
- objetivo da temporada
```

Arquivos prováveis:

```txt
src/engine/carreira/carreiraEngine.ts
src/store/useGameStore.ts
```

### 10.5 Save

Save/load deve ser tratado como sistema crítico.

Nunca quebrar compatibilidade sem migração.

Arquivos prováveis:

```txt
src/store/persistence.ts
src/store/saveMigrations.ts
src/api/database/saveStorage.ts
```

---

## 11. PRIORIDADE ATUAL — FOTEBALL 10/10

A prioridade atual do projeto é deixar a core 10/10.

Não comece por visual, multiplayer, modo online ou feature grande.

Execute nesta ordem:

```txt
1. Validação central de escalação
2. Testes da validação de escalação
3. Laboratório de balanceamento de partidas
4. Testes de fluxo de temporada completa
5. Melhorias graduais na IA de mercado
6. Refatoração segura do useGameStore
7. UX premium nas telas principais
```

---

## 12. TAREFA 1 — VALIDAÇÃO CENTRAL DE ESCALAÇÃO

Criar:

```txt
src/engine/tactics/formationValidation.ts
```

Objetivo:

A escalação não pode depender apenas da UI. A core deve bloquear formações inválidas.

Implementar função semelhante a:

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

A validação deve cobrir:

```txt
- exatamente 11 titulares
- exatamente 1 goleiro titular
- nenhum jogador repetido
- jogador deve pertencer ao clube
- jogador lesionado não pode ser titular
- jogador suspenso não pode ser titular
- mínimo de 3 defensores
- mínimo de 2 meio-campistas
- mínimo de 1 atacante
- detectar jogador improvisado como warning
```

Depois integrar em:

```txt
src/store/useGameStore.ts
```

Na ação:

```txt
atualizarFormacaoUsuario
```

Se a formação for inválida:

```txt
- não salvar a formação
- adicionar mensagem clara no jogo
- permitir feedback para a UI, se a assinatura da action for ajustada com segurança
```

Critério de aceite:

```txt
- formação inválida nunca entra em campo
- sem goleiro bloqueia
- dois goleiros bloqueia
- jogador repetido bloqueia
- lesionado bloqueia
- suspenso bloqueia
- menos de 11 bloqueia
- mais de 11 bloqueia
- typecheck/lint/test passam
```

---

## 13. TESTES OBRIGATÓRIOS PARA A TAREFA 1

Criar:

```txt
src/engine/tactics/__tests__/formationValidation.test.ts
```

Cobrir:

```txt
- formação válida
- formação sem goleiro
- formação com dois goleiros
- jogador repetido
- jogador lesionado
- jogador suspenso
- jogador de outro clube
- titulares insuficientes
- titulares acima de 11
- defesa insuficiente
- meio insuficiente
- ataque insuficiente
- improviso retorna warning, não necessariamente erro
```

---

## 14. BALANCEAMENTO DE PARTIDA

Depois da validação de escalação, criar laboratório de balanceamento.

Sugestões:

```txt
src/engine/simulation/__tests__/matchBalance.test.ts
scripts/balanceMatches.ts
```

Simular:

```txt
- 1.000 partidas entre times parelhos
- 1.000 partidas time forte x time fraco
- 1.000 partidas com mando de campo
- 1 temporada completa
```

Coletar:

```txt
- média de gols
- porcentagem de empates
- porcentagem de vitórias do mandante
- goleadas
- cartões
- lesões
- pênaltis
- impacto da diferença de overall
- impacto da tática
```

Metas aproximadas:

```txt
Gols por jogo: 2.4 a 3.1
Empates: 22% a 30%
Vitória mandante: 42% a 50%
Goleadas: possíveis, mas raras
Time forte: vantagem clara, mas sem vitória automática
Tática: influencia, mas não vira botão mágico
```

Nunca ajustar `probabilityCalc.ts` no escuro.

Medir antes e depois.

---

## 15. TESTES DE TEMPORADA COMPLETA

Criar testes para validar que uma carreira aguenta uma temporada.

Sugestões:

```txt
src/store/__tests__/seasonFlow.store.test.ts
src/engine/season/__tests__/seasonFlow.test.ts
```

Testar:

```txt
- iniciar carreira
- simular 38 rodadas
- atualizar tabela
- finalizar temporada
- gerar nova temporada
- envelhecer/evoluir jogadores
- acesso/rebaixamento
- save/load no meio da temporada
- save/load no fim da temporada
```

Critério de aceite:

```txt
- temporada completa sem crash
- 20 clubes na tabela
- 380 partidas em liga de 20 clubes
- rodada não trava
- nova temporada nasce coerente
- save não quebra
```

---

## 16. MERCADO IA — EVOLUÇÃO GRADUAL

Depois de testes básicos, melhorar mercado sem exagerar.

Prioridade:

```txt
1. necessidade por posição
2. saldo financeiro
3. idade/overall/potencial
4. situação financeira do clube
5. contrato
6. moral/insatisfação
```

A IA não deve:

```txt
- comprar jogador aleatório sem necessidade
- gastar sem dinheiro
- comprar jogador que não melhora o elenco
- vender craque barato sem motivo
```

A IA deve:

```txt
- comprar onde tem carência
- vender mais se estiver endividada
- pagar mais por jovem promissor
- desvalorizar veterano
- considerar contrato próximo do fim, se o dado existir
```

---

## 17. REFATORAÇÃO DO USEGAMESTORE

O `useGameStore.ts` concentra muita responsabilidade.

Não dividir tudo de uma vez.

Ordem segura:

```txt
1. extrair helpers puros
2. extrair validações
3. extrair lógica de carreira
4. extrair lógica de temporada
5. extrair lógica de mercado
6. só depois pensar em slices
```

Possível destino futuro:

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

Só faça se houver teste protegendo comportamento.

---

## 18. UX PRIORITÁRIA

Depois da core/testes, melhorar UX das telas mais importantes:

```txt
1. Gabinete/Home
2. Elenco/Escalação
3. Pré-jogo
4. Partida
5. Mercado
```

### Gabinete/Home

Mostrar:

```txt
- próximo jogo
- posição na tabela
- moral do elenco
- saldo financeiro
- reputação do técnico
- propostas pendentes
- lesionados/suspensos
- alertas importantes
```

### Elenco/Escalação

Mostrar:

```txt
- overall
- posição
- condição física
- moral
- forma
- idade
- valor
- contrato, se existir
- lesionado
- suspenso
- improvisado
```

### Pré-jogo

Mostrar:

```txt
- força do seu time
- força do adversário
- melhor jogador adversário
- ponto fraco adversário
- sugestão tática
- risco de fadiga
- suspensos/lesionados
- validação de formação
```

### Partida

Melhorar:

```txt
- timeline de eventos
- momentum
- estatísticas
- substituições
- alerta de jogador cansado
- mudança tática durante o jogo
- narração contextual
```

---

## 19. O QUE NÃO FAZER AGORA

Não implementar nesta fase:

```txt
- multiplayer
- modo online
- animação 3D de partida
- troca de stack
- Expo
- sistema de cartas antes da carreira estar sólida
- licenças reais complexas
- competições internacionais grandes
- refatoração total sem testes
```

---

## 20. PADRÃO DE TESTE

Para funções puras da engine, prefira testes unitários.

Padrão:

```ts
describe('nomeDaFuncao', () => {
  it('deve produzir resultado esperado quando a entrada é válida', () => {
    // arrange
    // act
    // assert
  });

  it('deve produzir resultado idêntico para a mesma seed', () => {
    // determinismo obrigatório
  });
});
```

Use factories/mocks locais se já existirem.

Se não existirem, crie helpers simples e tipados apenas para os testes.

Não introduza `any` em mocks.

---

## 21. COMANDOS OBRIGATÓRIOS

Após alterações:

```bash
npm run typecheck
npm run lint
npm run test
```

Se falhar:

```txt
- corrija antes de reportar conclusão
- não ignore erro
- não remova teste
- não comente regra
- não use @ts-ignore
```

---

## 22. PROTOCOLO DE ENTREGA

Ao terminar qualquer tarefa, reporte exatamente neste formato:

```md
## ✅ [nome da tarefa]

Branch usada:
- feat/nome-da-tarefa

Arquivos criados:
- caminho/do/arquivo.ts

Arquivos modificados:
- caminho/do/arquivo.ts — resumo objetivo da alteração

Testes criados/alterados:
- caminho/do/teste.test.ts

Validação:
- typecheck: ✅ zero erros
- lint: ✅ zero erros/warnings relevantes
- test: ✅ N/N passando

Observações:
- riscos conhecidos
- próximos passos recomendados
```

Se não conseguiu rodar algum comando, informe claramente.

Nunca diga que está concluído se não validou.

---

## 23. DEFINIÇÃO DE PRONTO

Uma tarefa só está pronta quando:

```txt
- está em branch feat/*
- não mexeu direto na main
- typecheck passa
- lint passa
- test passa
- nova regra de negócio tem teste
- não existe any novo
- não existe @ts-ignore novo
- não existe Math.random em src/engine/
- não quebrou save/load
- não quebrou fluxo principal do jogo
- resumo de entrega foi feito
```

---

## 24. PRIMEIRA TAREFA RECOMENDADA

Comece por:

```txt
feat/formation-validation
```

Implementar:

```txt
src/engine/tactics/formationValidation.ts
src/engine/tactics/__tests__/formationValidation.test.ts
```

Integrar com:

```txt
src/store/useGameStore.ts
```

Objetivo:

```txt
Escalação inválida nunca deve ser salva nem entrar em campo.
```

---

## 25. RESUMO FINAL

O FOTEBALL já tem uma core avançada.

Agora a missão é transformar essa core em base 10/10:

```txt
1. blindar regras
2. medir balanceamento
3. cobrir com testes
4. refatorar com segurança
5. melhorar UX
6. só depois adicionar features maiores
```

Prioridade absoluta:

```txt
Validação de escalação + testes + balanceamento de partidas.
```

---

*CLAUDE.md · Auto-lido pelo Claude Code · FOTEBALL · Danpazexe*

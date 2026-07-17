# FOTEBALL — Execução Autônoma da Engine Causal de Partidas, xG Real e Momentum

> **Documento operacional para Claude Code**  
> Projeto: `Danpazexe/FOTEBALL`  
> Natureza: correção estrutural da engine de partidas  
> Prioridade: crítica  
> Resultado esperado: placar, posse, finalizações, xG, estatísticas e Momentum derivados da mesma cadeia causal  
> Status desta autorização: **execução local integral autorizada dentro do escopo definido neste documento**

---

# [PAPEL]

Atue como **engenheiro de software sênior responsável pela arquitetura, simulação probabilística, domínio esportivo, testes determinísticos, persistência e integração React Native** do FOTEBALL.

Assuma responsabilidade técnica de produção sobre a alteração. Não trate esta tarefa como ajuste visual, troca de constantes ou remendo estatístico. A missão é corrigir a causa estrutural do motor atual, preservando o produto, o save, a velocidade do jogo e a determinística.

Especialidades exigidas durante a execução:

- TypeScript strict;
- arquitetura orientada a eventos;
- motores de simulação determinísticos;
- modelagem probabilística;
- testes estatísticos e de invariantes;
- React Native CLI;
- Zustand;
- persistência com `@op-engineering/op-sqlite`;
- migração compatível de saves;
- visualização esportiva no padrão de clareza do Sofascore;
- diagnóstico de regressão e calibração em amostras grandes.

Não aja como assistente que apenas sugere alterações. Aja como responsável técnico autorizado a:

- inspecionar profundamente o repositório;
- criar e alterar módulos;
- refatorar a engine;
- criar tipos e contratos;
- implementar migrações compatíveis;
- criar testes e laboratórios;
- executar validações locais;
- recalibrar coeficientes com evidência;
- atualizar documentação técnica;
- corrigir erros diretamente relacionados encontrados durante a execução.

---

# [AUTORIZAÇÃO DE EXECUÇÃO]

Este documento constitui autorização explícita para executar localmente toda a correção descrita, sem solicitar confirmação a cada etapa.

## Autonomia concedida

Você está autorizado a:

1. ler todos os arquivos necessários;
2. executar `git status`, buscas e auditorias;
3. modificar, criar, mover e dividir arquivos dentro do escopo;
4. atualizar tipos, engine, reducers, testes, persistência e UI afetada;
5. criar scripts ou suítes permanentes de laboratório;
6. executar typecheck, lint, testes e builds locais proporcionais ao risco;
7. tomar decisões de implementação quando existirem várias soluções equivalentes;
8. recalibrar parâmetros com base em medições reproduzíveis;
9. remover código obsoleto somente quando sua substituição estiver validada;
10. atualizar documentação e ADRs da solução.

## Ações que continuam não autorizadas

Mesmo com autonomia técnica, não execute sem autorização separada:

- commit;
- push;
- abertura de PR;
- merge;
- tag;
- release;
- build remoto;
- publicação de artefato;
- instalação ou atualização de dependência;
- alteração destrutiva sem migração;
- descarte de mudanças preexistentes do usuário.

## Regra de continuidade

Apresente no início um plano curto, os arquivos previstos, os riscos e os critérios de aceite, conforme o contrato permanente do repositório. **Depois prossiga automaticamente**, sem aguardar nova confirmação, pois esta solicitação já autoriza a execução integral do escopo.

Interrompa e peça decisão somente se ocorrer uma das condições de bloqueio previstas em `[PROTOCOLO DE SEGURANÇA]`.

---

# [FONTES DA VERDADE]

Antes de alterar qualquer arquivo, carregue e siga:

1. `CLAUDE.md`;
2. `.claude/skills/foteball-manager/SKILL.md`;
3. `.claude/skills/foteball-manager/references/engineering-contract.md`;
4. `.claude/skills/foteball-manager/references/product-direction.md` para estatísticas e apresentação;
5. código atual;
6. testes atuais;
7. `package.json` e lockfile;
8. tipos, schema e migrações existentes;
9. documentação atual relevante.

Ordem de precedência:

```text
código e testes atuais
→ package.json/lockfile
→ tipos/schema/migrações
→ CLAUDE.md e skill atual
→ este documento específico de execução
→ documentação histórica
```

Este documento é uma autorização específica de tarefa. Ele amplia a autonomia de execução local, mas não revoga as regras permanentes de segurança, stack, Git remoto ou preservação de saves.

---

# [CONTEXTO]

O FOTEBALL é um manager mobile de futebol brasileiro com:

- dinâmica rápida inspirada em Brasfoot;
- apresentação clara inspirada em Sofascore;
- engine pura e determinística;
- partidas simuladas minuto a minuto;
- decisões táticas durante a partida;
- posse, finalizações, xG, xA, passes, zonas, Momentum e súmula;
- React Native CLI, TypeScript, Zustand, op-sqlite e Jest.

A engine atual possui boa calibração agregada de placares, mas baixa coerência causal por partida.

No modelo atual:

```text
força e tática
→ probabilidade direta de gol por minuto
→ sorteio de gol
```

Em paralelo:

```text
força e tática
→ RNG separado de posse
→ posse estimada
```

E também em paralelo:

```text
probabilidade de gol
→ RNG separado de estatísticas
→ finalizações, passes e outros volumes
```

Consequência: gol, posse, finalização, xG e Momentum compartilham alguns parâmetros gerais, porém não são obrigatoriamente manifestações da mesma jogada.

É possível ocorrer uma partida como:

```text
Time forte: 80% de posse, 25 finalizações, 10 no alvo, 0 gol
Time fraco: 20% de posse, 3 finalizações, 2 no alvo, 1 gol
```

Uma zebra desse tipo pode existir no futebol. O defeito não é o resultado improvável isolado. O defeito é o motor não conseguir demonstrar uma cadeia real e consistente para o gol, porque:

- o gol pode ser sorteado sem um chute previamente gerado;
- as finalizações podem vir de outro sorteio;
- a posse pode ser ajustada depois do evento;
- o xG pode ser acumulado por minuto, não por finalização real;
- o mapa de chutes pode reconstruir coordenadas plausíveis após a partida;
- o Momentum pode contar o mesmo evento mais de uma vez.

A direção de produto exige:

> Nenhum dado esportivo visual deve ser apresentado como real quando não foi efetivamente produzido pela engine.

---

# [OBJETIVO]

Substituir o modelo paralelo atual por uma **engine causal orientada a eventos**, na qual:

```text
controle territorial/posse
→ progressão
→ criação da oportunidade
→ finalização com xG próprio
→ resolução contra defesa e goleiro
→ gol, defesa, bloqueio, trave ou chute para fora
→ estatísticas derivadas
→ Momentum derivado
```

Ao final da execução:

1. nenhum gol poderá existir sem uma finalização vinculada;
2. toda finalização exibida deverá ter sido produzida durante a simulação;
3. o xG da partida será a soma do xG dos chutes reais;
4. a posse será consequência das posses e ações simuladas, não maquiagem posterior;
5. o Momentum será consequência da pressão ofensiva recente, não gerador direto de gols;
6. o mapa de chutes usará coordenadas persistidas no evento original;
7. estatísticas não serão sorteadas separadamente do futebol simulado;
8. a mesma entrada e seed continuarão produzindo a mesma saída completa;
9. saves antigos continuarão abrindo sem perda de dados;
10. o desempenho continuará adequado para um manager mobile rápido.

---

# [ESTADO ATUAL A SER CONFIRMADO]

Não confie apenas neste resumo. Confirme no código atual antes de editar.

## Arquivos centrais já identificados

- `src/engine/simulation/matchSimulator.ts`;
- `src/engine/simulation/probabilityCalc.ts`;
- `src/engine/simulation/matchStats.ts`;
- `src/engine/simulation/teamStrength.ts`;
- `src/engine/simulation/finalizacoes.ts`;
- `src/engine/simulation/matchRating.ts`;
- `src/types/match.ts`;
- `src/screens/MatchSimulation/index.tsx`;
- `src/screens/MatchResult/index.tsx`;
- `src/components/MapaFinalizacoes` ou caminho equivalente;
- testes de simulação, balanceamento, determinismo e persistência;
- persistência/save e migrações consumidas por `Partida`.

## Comportamentos atuais a preservar

- simulação ao vivo minuto a minuto;
- decisões do usuário durante o jogo influenciam o restante;
- substituições, fadiga, expulsões e lesões alteram a força atual;
- mesma seed permanece determinística;
- partida ao vivo e simulação headless permanecem equivalentes;
- outros jogos da rodada continuam evoluindo corretamente;
- classificação ao vivo continua consistente;
- autosave e flush em background continuam funcionando;
- partidas antigas continuam acessíveis;
- fluxo da Copa, liga e pênaltis continua operacional;
- narração e áudio não perdem eventos existentes;
- nenhuma funcionalidade estável deve ser removida para simplificar a implementação.

---

# [PROBLEMAS IDENTIFICADOS]

## PI-01 — Gol sorteado diretamente por minuto

A engine decide o gol por uma probabilidade de gol por minuto, sem exigir uma `ShotAction` anterior.

## PI-02 — Posse, eventos e estatísticas usam processos paralelos

Existem streams de RNG independentes que criam fatos esportivos independentes. A separação de RNG não é proibida; a independência causal dos fatos é o problema.

## PI-03 — Finalizações estatísticas não são necessariamente os chutes do placar

O volume de chutes é produzido em módulo separado. Correlação existe porque os módulos usam força semelhante, mas não há vínculo de identidade entre chute e gol.

## PI-04 — Posse é calculada depois dos eventos do minuto

Gol ou chance podem aumentar retroativamente a posse estimada do minuto, invertendo causa e consequência.

## PI-05 — Dupla contagem no Momentum

O evento pode influenciar a posse estimada e depois receber novo bônus direto no cálculo do Momentum.

## PI-06 — Nome `fatorMomentum` representa urgência de placar

O fator atual mede reação de quem está perdendo ou administração de quem está vencendo. Isso não é pressão ofensiva recente.

## PI-07 — xG acumulado por taxa de gol do minuto

O xG atual funciona como hazard de gol por tempo, não necessariamente como soma da qualidade das finalizações ocorridas.

## PI-08 — Mapa de chutes reconstruído

Coordenadas, situação, parte do corpo e outros campos podem ser derivados depois por RNG local, formando um mapa plausível, não factual.

## PI-09 — Testes validam macrodistribuição, mas não narrativa interna

A suíte pode validar gols por jogo, mando, empates e goleadas sem verificar se cada gol surgiu de um chute real e se as estatísticas correspondem àquela partida.

## PI-10 — UI pode apresentar dado estimado como fato

A tela não diferencia claramente dados reais V2 de dados antigos sem granularidade.

---

# [PRINCÍPIOS INEGOCIÁVEIS]

## P-01 — Eventos primeiro

O placar é consequência dos eventos. Estatísticas e gráficos também.

## P-02 — Uma única história esportiva

Pode haver múltiplos canais de RNG para determinismo e isolamento, mas todos os fatos devem pertencer à mesma cadeia causal.

## P-03 — Sem estatística inventada na UI

Tela e componente não completam informação ausente com sorteio, heurística ou reconstrução silenciosa.

## P-04 — Determinismo completo

Mesma entrada, configuração, versão de engine e seed devem produzir:

- mesmas posses;
- mesmas ações;
- mesmos chutes;
- mesmos resultados;
- mesmas estatísticas;
- mesmo Momentum;
- mesmo placar.

## P-05 — Zebra continua possível

O time de menor posse pode vencer. O time mais fraco pode vencer. A engine não deve se tornar determinística pelo overall.

## P-06 — Qualidade importa mais que volume bruto

Poucos chutes de alta qualidade podem superar muitos chutes ruins. Posse não equivale automaticamente a gol.

## P-07 — Profundo por baixo, simples por cima

A engine pode ser sofisticada, mas a partida deve continuar rápida e compreensível.

## P-08 — Compatibilidade antes de limpeza

Não remover o caminho antigo antes de validar a nova engine e a migração.

---

# [ESCOPO]

## Incluído

1. auditoria completa da cadeia atual;
2. baseline estatístico reproduzível antes da mudança;
3. tipos V2 de posse, ação, finalização e ledger;
4. motor causal de posse e progressão;
5. geração real de oportunidades e chutes;
6. xG por chute;
7. resolução de finalização contra goleiro/defesa;
8. gol derivado de `ShotAction`;
9. pênalti e falta como finalizações reais;
10. gol contra e VAR com vínculo causal;
11. estatísticas derivadas de eventos;
12. posse derivada da simulação;
13. Momentum derivado de ameaça/pressão recente;
14. mapa de finalizações com dados persistidos;
15. compatibilidade com saves antigos;
16. testes unitários, integração, determinismo, invariantes e calibração;
17. laboratório de simulação com relatório antes/depois;
18. integração na partida ao vivo e headless;
19. atualização da súmula pós-jogo;
20. documentação arquitetural da nova engine.

## Pode ser alterado

- tipos de domínio da partida;
- módulos da engine de simulação;
- reducers de estatística;
- adaptadores de compatibilidade;
- store/persistência estritamente necessários;
- telas e componentes que consomem Momentum, xG e mapa de finalizações;
- testes e scripts de laboratório;
- documentação e ADRs.

## Deve ser preservado

- stack atual;
- fluxo principal do jogo;
- React Native CLI;
- Zustand;
- op-sqlite;
- determinismo;
- velocidade de simulação;
- partidas ao vivo;
- táticas, escalações, fadiga e substituições;
- save existente;
- navegação;
- áudio e narrativa, salvo adaptação necessária ao novo evento;
- branch e regras Git atuais.

---

# [FORA DE ESCOPO]

Não implementar nesta tarefa, salvo estrita necessidade técnica:

- multiplayer;
- backend;
- machine learning treinado externamente;
- coleta de dados reais de terceiros;
- troca de banco;
- troca de stack;
- migração para Expo;
- animação 3D;
- replay visual;
- heatmap completo;
- mapa de passes completo na UI;
- scouting;
- reformulação visual geral do app;
- novo sistema de monetização;
- dependências novas;
- reescrita do store inteiro;
- atualização automática de pacotes;
- Football Manager completo.

É permitido gerar ações de passe, condução, duelo e recuperação internamente quando necessárias para causalidade, sem transformar todas elas em telas novas.

---

# [ARQUITETURA DESEJADA]

## Fluxo principal

```text
MatchContext
→ MatchControlModel
→ PossessionEngine
→ Progression/Action Engine
→ ChanceCreationEngine
→ ShotEngine
→ ShotResolution
→ MatchLedger
→ MatchReducers
   ├── placar
   ├── posse
   ├── estatísticas
   ├── xG/xA
   ├── Momentum
   ├── mapa de chutes
   ├── timeline/narração
   └── notas futuras
→ persistência
→ UI
```

## Separação de responsabilidades

### Controle e força

Responsável por:

- força atual;
- matchup tático;
- mando;
- fadiga;
- expulsões;
- condição;
- estado do placar;
- superioridade numérica.

Não decide gol diretamente.

### Possession Engine

Responsável por:

- qual time inicia/recupera a posse;
- origem da posse;
- duração;
- zona inicial;
- transição entre zonas;
- perda, falta, bola parada ou continuidade.

### Chance Creation Engine

Responsável por:

- decidir se uma sequência produz finalização;
- determinar situação da jogada;
- escolher criador/assistente;
- determinar zona, pressão e qualidade da oportunidade.

### Shot Engine

Responsável por criar a finalização factual:

- autor;
- equipe;
- posição;
- distância;
- ângulo;
- parte do corpo;
- situação;
- pressão;
- assistência;
- `baseXG`;
- probabilidade final de conversão;
- resultado.

### Match Ledger

Fonte única da verdade dos acontecimentos da partida.

### Reducers

Recebem eventos e derivam números. Não usam RNG para inventar estatística.

### UI

Somente apresenta os objetos persistidos ou os resultados dos reducers.

---

# [MODELO DE DOMÍNIO V2]

Os nomes finais podem ser ajustados ao padrão real do projeto, mas as responsabilidades abaixo são obrigatórias.

## Versão da engine

```ts
export type MatchEngineVersion = 1 | 2;
```

Toda partida nova deve registrar a versão do motor que a criou.

## Qualidade dos dados

```ts
export type MatchDataQuality =
  | 'legacy'
  | 'causal_full'
  | 'causal_summary';
```

A UI deve saber se pode exibir mapa e detalhes reais.

## Posse

```ts
export interface MatchPossession {
  id: string;
  matchId: string;
  sequence: number;
  teamId: string;
  opponentId: string;

  startMinute: number;
  startSecond: number;
  endMinute: number;
  endSecond: number;
  durationSeconds: number;

  origin:
    | 'kick_off'
    | 'goal_kick'
    | 'recovery'
    | 'interception'
    | 'throw_in'
    | 'free_kick'
    | 'corner'
    | 'rebound'
    | 'restart';

  startZone: PitchZone;
  endZone: PitchZone;

  outcome:
    | 'shot'
    | 'turnover'
    | 'foul_won'
    | 'offside'
    | 'out_of_play'
    | 'goal'
    | 'period_end';

  actionIds: string[];
}
```

## Zonas

Evite precisão falsa excessiva. Use coordenadas normalizadas e zonas estáveis.

```ts
export type PitchThird = 'defensive' | 'middle' | 'attacking';
export type PitchLane = 'left' | 'center' | 'right';

export interface PitchPosition {
  x: number; // 0..1
  y: number; // 0..1
  third: PitchThird;
  lane: PitchLane;
}
```

## Ações

```ts
export type MatchActionType =
  | 'pass'
  | 'carry'
  | 'reception'
  | 'recovery'
  | 'interception'
  | 'duel'
  | 'dribble'
  | 'cross'
  | 'foul'
  | 'offside'
  | 'shot'
  | 'save'
  | 'clearance'
  | 'block'
  | 'card'
  | 'substitution'
  | 'injury'
  | 'var';

export interface MatchActionBase {
  id: string;
  sequence: number;
  possessionId?: string;
  teamId: string;
  playerId?: string;
  targetPlayerId?: string;
  minute: number;
  second: number;
  start?: PitchPosition;
  end?: PitchPosition;
}
```

Use unions discriminadas em vez de objeto genérico cheio de opcionais, quando isso melhorar a segurança.

## Finalização

```ts
export type ShotSituation =
  | 'open_play'
  | 'counter_attack'
  | 'corner'
  | 'free_kick'
  | 'penalty'
  | 'rebound';

export type ShotBodyPart =
  | 'right_foot'
  | 'left_foot'
  | 'head'
  | 'other';

export type ShotOutcome =
  | 'goal'
  | 'saved'
  | 'blocked'
  | 'off_target'
  | 'woodwork'
  | 'goal_disallowed';

export interface ShotAction extends MatchActionBase {
  type: 'shot';
  playerId: string;
  goalkeeperId?: string;
  assistPlayerId?: string;
  preAssistPlayerId?: string;

  situation: ShotSituation;
  bodyPart: ShotBodyPart;

  distanceMeters: number;
  angleRadians: number;
  pressureLevel: number; // 0..1
  defensiveDensity: number; // 0..1

  baseXG: number;
  conversionProbability: number;
  xGOT?: number;

  goalMouthX?: number;
  goalMouthY?: number;

  outcome: ShotOutcome;
  bigChance: boolean;
  goalkeeperError: boolean;
  ownGoal: boolean;
}
```

## Ledger

```ts
export interface MatchLedgerV2 {
  schemaVersion: 2;
  engineVersion: 2;
  seed: number;
  detailLevel: 'full' | 'summary';

  possessions: MatchPossession[];
  actions: MatchAction[];
  shots: ShotAction[];
  majorEvents: EventoPartida[];
  momentumSamples: MomentumSample[];
}
```

Os tipos finais devem evitar duplicação desnecessária. Se `ShotAction` já estiver em `actions`, `shots` pode ser um índice/visão derivada em memória, não necessariamente duplicação persistida.

---

# [ESTRATÉGIA DE RNG]

## Regra

Streams independentes são permitidos, mas não podem produzir universos esportivos independentes.

## Estrutura recomendada

```text
seed da partida
├── control/possession
├── progression/actions
├── chance/shot
├── incidents
├── AI substitutions
└── presentation only — proibido de criar fatos
```

## Proibições

- não usar `Math.random()`;
- não usar `Date.now()`;
- não usar RNG dentro da UI;
- não usar RNG estatístico para criar chutes que não aconteceram;
- não criar coordenada de chute depois do jogo;
- não alterar o placar a partir de um reducer;
- não usar texto da narração para descobrir o que ocorreu.

## Estabilidade

Prefira substreams ou seeds derivadas por canal e sequência:

```ts
hashString(`${matchSeed}|possession|${possessionSequence}`)
hashString(`${matchSeed}|shot|${shotSequence}`)
```

Isso reduz o risco de uma nova ação deslocar todos os resultados posteriores. Use somente se compatível com o RNG existente e com o custo da migração.

O objetivo não é preservar o resultado exato da engine V1. O objetivo é garantir determinismo dentro da V2.

---

# [MODELO CAUSAL DA PARTIDA]

## Etapa 1 — Contexto atual

A cada unidade de simulação, calcular:

- força ofensiva atual;
- força de meio atual;
- força defensiva atual;
- força do goleiro;
- fadiga;
- moral e forma já incorporadas pela força atual;
- jogadores realmente em campo;
- desvantagem numérica;
- tática atual;
- matchup tático;
- mando;
- estado do placar;
- urgência pelo relógio.

Renomear o atual `fatorMomentum` para algo semanticamente correto, como:

```ts
fatorUrgenciaPlacar
```

Esse fator pode influenciar risco, quantidade de jogadores avançando, duração de posses e vulnerabilidade defensiva. Ele não deve ser o Momentum visual.

## Etapa 2 — Início e duração da posse

A disputa deve considerar:

- meio-campo;
- passe;
- pressão;
- estilo ofensivo;
- ritmo;
- recuperação;
- placar;
- superioridade numérica;
- bola parada;
- ação anterior.

A posse deve ter duração factual em segundos ou unidades equivalentes. A soma do tempo de posse dos lados deve produzir o percentual final.

Não adicionar posse retroativamente porque houve gol.

## Etapa 3 — Progressão territorial

Modelar progressão suficiente para suportar causalidade sem transformar o jogo em simulador 3D.

Estados mínimos:

```text
saída defensiva
→ meio-campo
→ terço ofensivo
→ entrada na área
→ finalização ou perda
```

Ações possíveis:

- passe;
- condução;
- recepção;
- drible;
- duelo;
- cruzamento;
- recuperação;
- interceptação;
- perda;
- falta;
- impedimento;
- chute.

A probabilidade de progressão deve considerar atributos e tática dos dois times.

## Etapa 4 — Criação da chance

Uma chance nasce somente de uma posse ou bola parada identificável.

Fatores recomendados:

- zona atual;
- qualidade do criador;
- passe/criatividade/cruzamento;
- movimentação e ataque;
- drible;
- estilo ofensivo;
- contra-ataque;
- pressão defensiva;
- densidade da defesa;
- linha defensiva;
- fadiga;
- superioridade numérica.

## Etapa 5 — xG da finalização

O `baseXG` deve ser calculado a partir da chance, não de uma taxa abstrata por minuto.

Fatores mínimos:

- distância;
- ângulo;
- zona;
- parte do corpo;
- situação;
- pressão;
- densidade defensiva;
- tipo de assistência;
- rebote;
- pênalti;
- falta direta.

Não é necessário um modelo de machine learning. Use uma fórmula explícita, centralizada, testável e calibrável.

Exemplo conceitual:

```text
logit(baseXG)
= intercepto
+ distância
+ ângulo
+ situação
+ parte do corpo
+ pressão
+ densidade
+ tipo de passe
```

A implementação pode usar multiplicadores ou logística, desde que:

- tenha parâmetros centralizados;
- seja monotônica nos fatores óbvios;
- seja calibrada com laboratório;
- seja explicável;
- não espalhe números mágicos por vários arquivos.

## Etapa 6 — Probabilidade final de conversão

Separar qualidade objetiva da chance e execução:

```text
baseXG da oportunidade
→ ajuste do finalizador
→ ajuste da pressão
→ ajuste do goleiro
→ probabilidade final
```

Considerar, conforme os atributos existentes:

- finalização;
- técnica;
- posicionamento;
- forma/condição já refletidas;
- pé dominante ou parte do corpo, se disponível;
- reflexos do goleiro;
- posicionamento do goleiro;
- erro do goleiro como evento raro, não texto inferido.

Limitar a probabilidade a uma faixa válida e testável.

## Etapa 7 — Resultado do chute

Somente depois de criar o chute:

```text
goal
saved
blocked
off_target
woodwork
goal_disallowed
```

O resultado deve alimentar:

- placar;
- timeline;
- narração;
- mapa de chutes;
- xG/xGOT;
- nota do jogador;
- Momentum;
- estatísticas.

## Etapa 8 — Gol contra

Gol contra precisa estar vinculado a uma ação real:

- cruzamento;
- passe para área;
- chute desviado;
- interceptação malsucedida;
- corte defensivo.

Não criar gol contra como “sabor” posterior de um gol já sorteado.

## Etapa 9 — VAR

VAR deve operar sobre evento existente:

- revisar um gol;
- revisar impedimento;
- revisar pênalti;
- confirmar ou anular.

Não interpretar `descricao.includes(...)` para lógica de domínio. Use campos estruturados.

## Etapa 10 — Pênaltis e faltas

- pênalti é uma `ShotAction` com `situation: 'penalty'`;
- gol de falta é uma `ShotAction` com `situation: 'free_kick'`;
- cobrança não convertida também permanece no mapa;
- a falta que originou o pênalti deve estar vinculada;
- cartões devem ser eventos estruturados.

---

# [ESTATÍSTICAS DERIVADAS]

## Regra central

`matchStats.ts` ou seu substituto não deve sortear futebol adicional.

Ele deve reduzir o ledger.

## Origem das estatísticas

### Placar

```text
quantidade de ShotAction com outcome = goal e gol válido
```

### Finalizações

```text
quantidade de ShotAction válidas
```

### Finalizações no alvo

Defina uma convenção única e teste-a. Recomendação:

```text
goal + saved
```

Documente se `woodwork` conta ou não, mantendo consistência em toda UI e testes.

### xG

```text
soma de baseXG dos chutes válidos
```

Pênaltis entram com valor calibrado. Gols anulados não entram no xG oficial ou entram em métrica separada, conforme convenção documentada.

### xA

Derivar do xG dos chutes assistidos, excluindo situações sem assistência aplicável.

### Posse

Derivar da duração das posses ou das unidades reais de controle registradas.

### Passes

Derivar de ações de passe geradas na simulação.

### Escanteios, impedimentos, faltas, desarmes e interceptações

Derivar de ações/eventos estruturados.

### Grandes chances

Definir por limiar ou classificação explícita centralizada, por exemplo:

```text
baseXG >= limiar calibrado
```

Não marcar automaticamente todo gol como grande chance.

## Estatísticas de partidas resumidas

Para jogos da IA que não precisam persistir cada passe:

- execute a mesma cadeia causal;
- acumule reducers durante a simulação;
- descarte ações de baixa granularidade ao persistir, se necessário;
- preserve chutes, eventos principais, estatísticas e Momentum;
- o `detailLevel` não pode alterar o placar ou as estatísticas, apenas o que é armazenado.

---

# [MOMENTUM DE ATAQUE]

## Definição

Momentum é uma visualização da **pressão ofensiva recente**, não posse total, probabilidade de vitória ou bônus de placar.

## Não usar como única base

- posse total;
- diferença de placar;
- gol como bônus fixo dominante;
- sorteio independente;
- taxa abstrata de gol por minuto.

## Ações que podem gerar ameaça

- recuperação no campo ofensivo;
- passe progressivo;
- condução progressiva;
- entrada no terço ofensivo;
- entrada na área;
- passe-chave;
- cruzamento perigoso;
- escanteio;
- falta perigosa;
- finalização;
- xG criado;
- rebote;
- sequência de pressão.

## Valor de ameaça

Criar função pura, centralizada e testada:

```ts
export function calcularAmeacaAcao(
  action: MatchAction,
  context: ThreatContext,
): number;
```

Ameaça deve aumentar quando a ação:

- aproxima a bola do gol;
- entra em zona de maior valor;
- elimina linhas defensivas;
- produz finalização;
- produz xG relevante.

## Janela temporal

Calcular pressão recente com decaimento temporal.

Formulação sugerida:

```text
pressure(team, t)
= soma de threat(action) × decay(age)
```

Exemplo de decaimento:

```ts
Math.exp(-ageSeconds / decaySeconds)
```

O parâmetro deve ser calibrado. Faixa inicial sugerida: 120 a 240 segundos.

## Série visual

Gerar amostra por minuto ou intervalo menor compatível com a UI:

```ts
export interface MomentumSample {
  minute: number;
  second: number;
  homePressure: number;
  awayPressure: number;
  normalized: number; // -1..1
  contributors?: MomentumContributor[];
}
```

## Normalização

Não escolher escala apenas “no olho”. Use distribuição de muitas partidas para determinar escala robusta, preferencialmente percentil alto de pressão.

Pode usar:

```ts
normalized = Math.tanh((homePressure - awayPressure) / scale);
```

## Gols no gráfico

- gol deve aparecer como marcador/ícone no minuto;
- o chute e a construção já contribuem para a barra;
- não adicionar bônus fixo que reescreva o domínio;
- gol isolado em contra-ataque deve aparecer como pico curto e marcador;
- pressão contínua deve formar sequência de barras crescentes.

## Tooltip

Quando a UI suportar toque na barra, apresentar apenas contribuições reais:

```text
67'

Pressão ofensiva do Flamengo
• 2 entradas no terço ofensivo
• 1 recuperação alta
• 1 passe para a área
• 1 finalização
• 0,24 xG criado
```

Se o ledger resumido não tiver contribuição detalhada, não inventar tooltip.

---

# [REQUISITOS FUNCIONAIS]

## RF-01 — Gol vinculado a chute

Todo gol válido deve possuir vínculo estável com uma `ShotAction`.

## RF-02 — Chute vinculado a posse ou bola parada

Toda finalização deve possuir `possessionId` ou origem estruturada de bola parada.

## RF-03 — xG por chute

Cada chute deve registrar `baseXG`; o xG total deve ser sua soma.

## RF-04 — Resolução contra goleiro

A probabilidade de conversão deve considerar qualidade da chance, finalizador e goleiro.

## RF-05 — Posse causal

A posse final deve ser derivada das posses simuladas.

## RF-06 — Estatísticas por reducer

Finalizações, xG, xA, passes, faltas, impedimentos, escanteios e demais números devem ser derivados dos eventos.

## RF-07 — Momentum por ameaça

O Momentum deve ser derivado das ações ofensivas recentes.

## RF-08 — Marcadores de evento

Gols e eventos relevantes devem ser marcadores do gráfico, separados da altura das barras.

## RF-09 — Mapa factual

Mapa de chutes de partidas V2 deve usar coordenadas persistidas no chute original.

## RF-10 — Saves antigos

Partidas antigas devem continuar abrindo sem tentativa silenciosa de fabricar dados V2.

## RF-11 — Qualidade visível

A UI deve distinguir partida V2 completa de partida legacy quando o detalhe não estiver disponível.

## RF-12 — Simulação ao vivo

A engine V2 deve funcionar minuto a minuto e respeitar mudanças táticas, substituições, expulsões, lesões e fadiga.

## RF-13 — Headless equivalente

Simulação direta e ao vivo devem produzir a mesma saída com a mesma entrada e seed.

## RF-14 — Outros jogos da rodada

Jogos paralelos devem continuar usando a mesma engine e produzir placares consistentes.

## RF-15 — Contra-ataque real

Contra-ataque deve poder produzir poucas chances de maior qualidade sem precisar de posse alta.

## RF-16 — Posse produtiva

Estilo de posse deve aumentar controle e progressão, mas não garantir gol sem oportunidade de qualidade.

## RF-17 — VAR estruturado

Decisões de VAR não podem depender da leitura de texto.

## RF-18 — Narração derivada

Texto deve ser consequência do evento estruturado.

## RF-19 — Laboratório reproduzível

Deve existir comando ou suíte documentada para medir a engine em larga escala.

## RF-20 — Relatório comparativo

A execução deve registrar baseline V1 e resultado V2 com métricas comparáveis.

---

# [REQUISITOS NÃO FUNCIONAIS]

## RNF-01 — Determinismo

Mesma seed e mesma entrada na engine V2 devem produzir saída idêntica.

## RNF-02 — Desempenho

A simulação deve continuar adequada para mobile e para uma rodada completa.

Medir:

- tempo médio por partida;
- tempo para simular rodada;
- memória aproximada;
- tamanho persistido por partida.

Defina baseline antes da mudança. A V2 não deve introduzir regressão descontrolada. Quando houver aumento necessário, documente e otimize antes de concluir.

## RNF-03 — Compatibilidade

- Android primeiro;
- iOS preservado;
- React Native CLI atual;
- TypeScript strict;
- New Architecture atual;
- sem dependência nova.

## RNF-04 — Manutenibilidade

- módulos pequenos;
- parâmetros centralizados;
- funções puras;
- unions discriminadas;
- sem `any`;
- sem `@ts-ignore`;
- sem cast duplo;
- sem lógica de domínio em telas.

## RNF-05 — Observabilidade

O laboratório deve permitir inspecionar:

- seed;
- forças;
- táticas;
- posses;
- chutes;
- xG;
- placar;
- Momentum;
- invariantes quebrados.

Não deixar logs ruidosos em produção.

## RNF-06 — Persistência

A mudança de schema deve possuir versão e migração compatível.

## RNF-07 — Explicabilidade

Parâmetros e fórmulas precisam ser documentados. Evite constantes sem nome.

## RNF-08 — Segurança de regressão

Não enfraquecer testes existentes para obter verde.

## RNF-09 — Consistência visual

A UI não deve exibir precisão falsa ou dados legacy como fatos V2.

## RNF-10 — Escalabilidade de dados

Não persistir milhares de ações detalhadas para todos os jogos sem medir o impacto. Usar `detailLevel` ou coletor configurável sem alterar o resultado esportivo.

---

# [REGRAS DE NEGÓCIO]

## RN-01 — Posse não é vitória

Mais posse aumenta oportunidades de controle e progressão, não garante maior conversão.

## RN-02 — Chute não é gol

Volume de finalizações e qualidade são dimensões separadas.

## RN-03 — xG é qualidade da chance

xG não deve ser ajustado para coincidir com o gol ocorrido. O gol é sorteado a partir da probabilidade previamente calculada.

## RN-04 — Finalizador e goleiro influenciam a conversão

A chance objetiva e a execução individual devem ser separadas e registradas.

## RN-05 — Gol não transforma chance ruim em grande chance

Classificação de grande chance depende da oportunidade, não do resultado.

## RN-06 — Contra-ataque

Contra-ataque pode ter:

- menos posse;
- menos ações;
- progressão mais vertical;
- chances médias mais valiosas;
- maior risco de perda.

## RN-07 — Posse de bola

Posse pode ter:

- mais tempo com bola;
- mais passes;
- mais controle territorial;
- maior dificuldade contra bloco baixo;
- risco de transição defensiva.

## RN-08 — Ataque direto

Ataque direto deve gerar:

- menos passes;
- progressão mais rápida;
- mais disputas;
- maior variância;
- vantagem potencial contra linha alta.

## RN-09 — Mando

Mando deve influenciar modestamente criação, confiança ou controle, sem garantir vitória.

## RN-10 — Urgência pelo placar

Quem perde pode assumir mais risco, aumentando criação e vulnerabilidade. Isso não é Momentum visual.

## RN-11 — Superioridade numérica

Expulsão deve reduzir controle, progressão, defesa e disponibilidade de autores.

## RN-12 — Fadiga

Fadiga deve afetar progressão, execução, pressão e defesa ao longo do jogo.

## RN-13 — Goleiro

Goleiro forte deve reduzir conversão de chutes no alvo e produzir defesas, não simplesmente apagar xG.

## RN-14 — Pênalti

Pênalti possui chance-base própria, depois ajustada com parcimônia por cobrador e goleiro.

## RN-15 — Gol contra

Gol contra precisa nascer de ação ofensiva/defensiva existente.

## RN-16 — VAR

VAR pode alterar validade do resultado, não fabricar retrospectivamente uma jogada inteira.

## RN-17 — Saves antigos

Não criar coordenadas, xG individual ou sequência de passes fictícia para partidas legacy.

---

# [RESTRIÇÕES]

- não trabalhar diretamente na `main`;
- obedecer a branch autorizada pelo `CLAUDE.md` atual;
- não criar branch nova sem autorização;
- não fazer commit/push/PR/merge/tag/release;
- não instalar dependência;
- não migrar para Expo;
- não acessar React, store, SQLite ou rede dentro da engine;
- não usar `Math.random()` ou `Date.now()`;
- não usar `any`, `@ts-ignore`, `@ts-nocheck` ou `as unknown as`;
- não usar texto de narração como estado de domínio;
- não usar UI para corrigir inconsistência da engine;
- não preservar fórmula antiga somente por medo de recalibrar;
- não alterar saves sem migração;
- não remover testes existentes;
- não atualizar snapshots às cegas;
- não ocultar falha de lint/typecheck;
- não declarar dados reconstruídos como reais;
- não exigir correlação de chutes com gols próxima de 1;
- não transformar posse em determinante direto de resultado;
- não eliminar zebras do futebol.

---

# [ESTRATÉGIA DE COMPATIBILIDADE]

## Partidas novas

Usar engine V2 e registrar qualidade `causal_full` ou `causal_summary`.

## Partidas antigas

- manter `eventos`, placar e estatísticas existentes;
- classificar como `legacy` quando não houver versão;
- não tentar converter reconstrução em fato;
- esconder mapa detalhado ou informar indisponibilidade;
- não apagar dados existentes;
- manter timeline e súmula que ainda sejam suportadas.

## Adaptador

Criar adaptador explícito somente para leitura compatível:

```ts
adaptLegacyMatchForDisplay(partida)
```

Ele não deve inventar `ShotAction`.

## Migração de save

- localizar versão atual do save/schema;
- incrementar a versão quando necessário;
- migrar campos opcionais com defaults seguros;
- não reprocessar partidas antigas como se fossem V2;
- testar boot e autosave de save antigo;
- testar save criado na V2 e recarregado.

---

# [PLANO DE EXECUÇÃO]

## Fase 0 — Preparação e proteção

1. executar `git status --short --branch`;
2. confirmar branch permitida;
3. preservar mudanças preexistentes;
4. ler arquivos permanentes e referências da skill;
5. mapear consumidores de `EventoPartida`, `Partida.estatisticas`, `momentumPorMinuto` e mapa de finalizações;
6. localizar schema e migrações;
7. localizar testes de balanceamento e determinismo;
8. apresentar plano curto e prosseguir automaticamente.

### Entrega da fase

- lista real de arquivos;
- mapa de dependências;
- riscos;
- baseline de testes atual.

## Fase 1 — Baseline reproduzível da V1

Criar ou adaptar laboratório para executar amostra relevante da engine atual.

Medir no mínimo:

- gols por jogo;
- distribuição de placares;
- vitórias casa/empates/vitórias fora;
- posse média;
- finalizações;
- finalizações no alvo;
- xG;
- conversão;
- goleadas;
- zebras por gap de força;
- cartões;
- pênaltis;
- lesões;
- correlação entre diferença de posse e gols;
- correlação entre diferença de chutes e gols;
- correlação entre diferença de xG e gols;
- casos de gol sem identidade causal;
- tempo de execução.

Use amostra mínima suficiente para diagnóstico local rápido e uma amostra maior para relatório final, respeitando o ambiente.

Persistir resultado em documento ou fixture de relatório, sem transformar números momentâneos em teste rígido sem justificativa.

## Fase 2 — Contratos e tipos V2

1. criar versão de engine e qualidade de dados;
2. criar tipos de posse, ação, chute, resultado e ledger;
3. definir convenções de coordenadas;
4. definir convenções de xG e chute no alvo;
5. criar invariantes de tipo;
6. adicionar campos opcionais compatíveis em `Partida`;
7. criar testes de serialização/compatibilidade.

Não alterar ainda a UI principal antes de estabilizar os contratos.

## Fase 3 — Possession Engine

1. criar posses determinísticas;
2. definir origem e duração;
3. modelar controle territorial;
4. integrar tática, força, fadiga, placar e número de jogadores;
5. produzir perda, recuperação, bola parada e progressão;
6. testar posse por estilos e diferenças de força;
7. garantir que posse não dependa de evento futuro.

## Fase 4 — Progressão e criação de oportunidade

1. gerar ações mínimas causais;
2. modelar zonas e corredores;
3. calcular avanço, perda e entrada no terço ofensivo;
4. modelar contra-ataque, posse e ataque direto;
5. selecionar criador e finalizador somente entre jogadores em campo;
6. criar chance somente a partir de sequência válida;
7. testar monotonicidade dos fatores.

## Fase 5 — Shot Engine e xG

1. calcular posição, distância e ângulo;
2. determinar situação e parte do corpo;
3. calcular pressão e densidade;
4. calcular `baseXG`;
5. ajustar execução por finalizador/goleiro;
6. resolver resultado;
7. criar gol somente a partir do chute;
8. vincular assistência, pré-assistência e posse;
9. integrar pênalti, falta, rebote, trave e gol contra;
10. estruturar VAR.

## Fase 6 — Reducers e estatísticas

1. derivar placar do ledger;
2. derivar chutes e chutes no alvo;
3. derivar xG/xA;
4. derivar posse;
5. derivar passes e demais ações;
6. remover RNG esportivo de `matchStats`;
7. manter apenas funções puras de redução/finalização;
8. testar invariantes.

## Fase 7 — Momentum V2

1. criar ameaça por ação;
2. criar janela com decaimento;
3. normalizar com amostra real da nova engine;
4. produzir série por minuto;
5. separar marcadores de gol da barra;
6. registrar contribuições quando `detailLevel = full`;
7. testar picos de pressão e contra-ataques.

## Fase 8 — Integração ao vivo e headless

1. integrar V2 a `simularMinuto` ou substituto;
2. preservar pausa, intervalo, velocidade e acréscimos;
3. preservar ajustes táticos e substituições;
4. preservar jogos paralelos;
5. garantir equivalência ao vivo/headless;
6. adaptar áudio e narração a eventos estruturados;
7. remover dependência de `descricao.includes`.

## Fase 9 — Persistência e compatibilidade

1. versionar save;
2. persistir ledger conforme nível de detalhe;
3. migrar saves antigos;
4. testar tamanho e tempo de save;
5. testar background flush;
6. testar reinício e carregamento;
7. garantir que partidas legacy não recebam detalhes fictícios.

## Fase 10 — UI afetada

1. mapa de chutes lê `ShotAction` real;
2. remover reconstrução para partidas V2;
3. ocultar/explicar indisponibilidade em legacy;
4. Momentum com casa acima e visitante abaixo;
5. linha central e divisão do intervalo;
6. marcadores de gol e eventos relevantes;
7. manter tema e Design System atual;
8. não iniciar redesign geral fora do escopo.

## Fase 11 — Recalibração

Somente depois da cadeia causal completa:

1. executar laboratório amplo;
2. ajustar parâmetros centralizados;
3. medir cada alteração;
4. evitar ajuste no escuro;
5. preservar diversidade tática;
6. confirmar que xG está calibrado;
7. confirmar que gap de força tem efeito sem eliminar zebras;
8. confirmar desempenho.

## Fase 12 — Limpeza controlada

1. remover sorteio direto de gol por minuto;
2. remover geração paralela de chutes;
3. remover bônus retroativo de posse;
4. remover dupla contagem de Momentum;
5. remover reconstrução pós-jogo de partidas V2;
6. manter adaptador legacy necessário;
7. remover código morto somente após testes verdes.

## Fase 13 — Documentação e relatório

1. criar ADR da engine causal V2;
2. documentar fórmulas e parâmetros;
3. documentar qualidade de dados legacy/V2;
4. documentar laboratório;
5. registrar baseline e resultado final;
6. listar limitações reais.

---

# [CRITÉRIOS DE ACEITE]

## CA-01 — Zero gol sem chute

Em todas as partidas V2 testadas:

```ts
golsValidos === shots.filter(shot => shot.outcome === 'goal').length;
```

## CA-02 — Todo chute possui origem

Todo chute possui posse ou bola parada estruturada.

## CA-03 — Placar derivado

Placar final é exatamente reproduzível a partir do ledger.

## CA-04 — xG derivado

xG final é a soma dos chutes válidos, respeitando convenção documentada.

## CA-05 — Finalizações derivadas

As estatísticas de finalização correspondem exatamente aos objetos de chute.

## CA-06 — Posse derivada

Posse final corresponde às posses/duração simuladas e soma 100% após arredondamento controlado.

## CA-07 — Momentum sem dupla contagem

Gol não recebe bônus duplicado via posse e evento.

## CA-08 — Momentum explicável

Amostras de Momentum podem ser justificadas pelas ações recentes do ledger.

## CA-09 — Contra-ataque coerente

Time com menos posse pode marcar, mas o gol deve vir de sequência válida e chute registrado.

## CA-10 — Mapa factual

Partidas V2 exibem somente posições gravadas durante a simulação.

## CA-11 — Legacy honesto

Partidas antigas não exibem detalhes reconstruídos como dados reais.

## CA-12 — Determinismo

A mesma entrada e seed produzem ledger e saída idênticos.

## CA-13 — Equivalência ao vivo/headless

Os dois caminhos produzem mesmo placar, eventos, chutes, estatísticas e Momentum.

## CA-14 — Jogadores em campo

Substituído, expulso ou lesionado não participa de ações futuras.

## CA-15 — Compatibilidade de save

Save antigo abre; save V2 salva, fecha e reabre sem perda.

## CA-16 — Balanceamento agregado

A nova engine permanece dentro das faixas aprovadas ou apresenta justificativa baseada em dados para ajustar a faixa.

## CA-17 — Calibração de xG

Em grande amostra, a taxa de conversão por faixa aproxima a probabilidade prevista dentro de tolerância definida no laboratório.

## CA-18 — Qualidade preditiva coerente

Na amostra:

```text
correlação xG diferencial × gols diferencial
>
correlação posse diferencial × gols diferencial
```

Não exigir correlação próxima de 1.

## CA-19 — Sem regressão de stack

Nenhuma dependência nova ou mudança de stack.

## CA-20 — Validações verdes

Typecheck, lint e testes aplicáveis passam sem regressão nova.

---

# [TESTES OBRIGATÓRIOS]

## 1. Testes unitários

### Possession Engine

- times iguais;
- diferença de meio-campo;
- estilo posse;
- contra-ataque;
- ataque direto;
- pressão alta;
- time perdendo no fim;
- expulsão;
- fadiga;
- determinismo.

### Progressão

- ação válida entre zonas;
- perda de posse;
- entrada no terço ofensivo;
- contra-ataque vertical;
- bloco recuado;
- linha alta;
- jogador fora de campo nunca selecionado.

### xG

- menor distância não reduz xG, mantendo outros fatores;
- melhor ângulo não reduz xG;
- maior pressão não aumenta xG;
- cabeceio distante não supera chute limpo próximo sem motivo;
- pênalti em faixa calibrada;
- falta direta em faixa baixa;
- valores sempre entre limites válidos.

### Shot Resolution

- chance alta converte mais que chance baixa em amostra;
- bom finalizador melhora conversão com limite;
- bom goleiro reduz conversão no alvo;
- mesma seed produz mesmo resultado;
- resultado sempre pertence à union válida.

### Momentum

- ações neutras geram valor baixo;
- sequência de progressões gera crescimento;
- pressão antiga decai;
- contra-ataque gera pico curto;
- gol sem construção adicional não recebe bônus artificial duplicado;
- valores normalizados permanecem em `-1..1`.

### Reducers

- placar;
- chutes;
- alvo;
- xG;
- xA;
- posse;
- passes;
- faltas;
- cartões;
- impedimentos;
- escanteios.

## 2. Testes de integração

- partida completa 90+acréscimos;
- partida ao vivo;
- simulação headless;
- intervalo;
- substituição manual;
- substituição IA;
- expulsão;
- lesão;
- VAR;
- pênalti;
- falta;
- Copa e desempate;
- outros jogos da rodada;
- tabela ao vivo;
- conclusão e persistência.

## 3. Testes de determinismo

Executar a mesma partida múltiplas vezes e comparar profundamente:

```ts
expect(resultA).toEqual(resultB);
```

Comparar:

- placar;
- ledger;
- posses;
- chutes;
- estatísticas;
- Momentum;
- eventos principais.

## 4. Testes de invariantes

```ts
expect(validGoals).toBe(shotsWithValidGoalOutcome);
expect(totalShots).toBe(matchStats.finalizacoes);
expect(onTargetShots).toBe(matchStats.finalizacoesNoAlvo);
expect(sumShotXG).toBeCloseTo(matchStats.golsEsperados, precision);
expect(possessionHome + possessionAway).toBe(100);
expect(allShotsHaveOrigin).toBe(true);
expect(inactivePlayersInFutureActions).toHaveLength(0);
expect(uiData).not.toContainSyntheticV2Data();
```

Adicionar invariantes para:

- assistência diferente do autor;
- `goalkeeperId` válido quando aplicável;
- coordenadas `0..1`;
- sequência ordenada;
- ids únicos;
- tempo monotônico;
- resultado e placar coerentes após VAR;
- gol contra contabilizado para o lado correto.

## 5. Testes de persistência

- save legacy sem campos V2;
- migração;
- save V2 completo;
- save V2 resumido;
- reidratação;
- autosave;
- flush em background;
- tamanho do payload;
- partida histórica após transferências.

## 6. Testes de UI

- mapa V2 usa shot real;
- partida legacy não mostra mapa factual inexistente;
- Momentum renderiza casa/fora corretamente;
- linha de 45 minutos;
- marcadores de gol;
- tema claro/escuro;
- acessibilidade básica;
- estado vazio/legacy.

## 7. Testes de calibração

### Amostra

Executar quantidade suficiente para estabilidade. Preferência:

- amostra rápida durante desenvolvimento;
- amostra final ampla, idealmente dezenas de milhares de partidas;
- no mínimo centenas de milhares de chutes para calibração por faixa, quando o ambiente permitir.

### Faixas de xG

Agrupar:

```text
0.00–0.05
0.05–0.10
0.10–0.20
0.20–0.35
0.35–0.50
0.50–0.70
0.70–1.00
```

Para cada faixa, registrar:

- quantidade de chutes;
- xG médio;
- gols;
- taxa de conversão;
- erro absoluto;
- margem de confiança aproximada ou tamanho suficiente.

### Métricas

- erro de calibração por faixa;
- erro médio absoluto de calibração;
- Brier Score, se implementável sem dependência;
- correlação xG × gols;
- correlação chutes × gols;
- correlação posse × gols;
- conversão por situação;
- efeito do goleiro;
- efeito do finalizador.

Não usar correlação próxima de 1 como objetivo.

---

# [FAIXAS DE BALANCEAMENTO]

Use as metas atuais do repositório como baseline e confirme nos testes existentes. Não copie números cegamente se o código atual divergir.

Faixas iniciais de referência:

| Métrica | Faixa de referência |
|---|---:|
| Gols por jogo | 2,4–3,1 |
| Vitória mandante | 40–50% |
| Empates | 22–32% |
| Vitória visitante | 25–35% |
| Goleadas por 3+ | preferencialmente até 12% |
| Finalizações totais | aproximadamente 20–32 |
| Finalizações no alvo | aproximadamente 28–45% dos chutes |
| Pênaltis | preservar faixa validada atual |
| Vermelhos | preservar faixa validada atual |
| Lesões | preservar faixa validada atual |

Para gap de força semelhante à realidade atual da base:

- time forte deve ter vantagem clara;
- vitória não pode ser automática;
- zebra deve permanecer rara, mas possível;
- mando deve alterar probabilidades moderadamente.

Antes de fixar thresholds, execute baseline real do código atual e documente.

---

# [LABORATÓRIO DE SIMULAÇÃO]

Criar uma ferramenta permanente e reproduzível usando apenas a stack existente.

## Entradas configuráveis

- quantidade de partidas;
- intervalo de seeds;
- força/overall dos lados;
- táticas;
- mando;
- nível de detalhe;
- cenário de expulsão/fadiga quando aplicável.

## Saída mínima

```json
{
  "engineVersion": 2,
  "sampleSize": 10000,
  "goalsPerMatch": 2.74,
  "homeWinRate": 0.45,
  "drawRate": 0.27,
  "awayWinRate": 0.28,
  "shotsPerMatch": 24.8,
  "shotsOnTargetRate": 0.36,
  "xgPerMatch": 2.69,
  "possessionCorrelationWithGoals": 0.18,
  "shotsCorrelationWithGoals": 0.51,
  "xgCorrelationWithGoals": 0.64,
  "invariantFailures": 0
}
```

Os valores acima são apenas formato ilustrativo, não meta automática.

## Casos de auditoria

O laboratório deve permitir listar partidas extremas:

- 75%+ de posse e derrota;
- 20+ chutes e zero gol;
- time muito fraco vencendo time forte;
- gol em único chute;
- xG alto sem gol;
- xG baixo com muitos gols;
- Momentum muito unilateral;
- goleiro com muitas defesas.

Cada caso deve ser auditável pelo ledger, não necessariamente proibido.

---

# [PARÂMETROS E CALIBRAÇÃO]

Centralizar parâmetros em módulo explícito, por exemplo:

```text
matchModelConfig.ts
```

ou estrutura equivalente compatível com a árvore real.

Categorias:

- controle de posse;
- duração;
- progressão;
- criação de chance;
- xG;
- finalização;
- goleiro;
- tática;
- mando;
- fadiga;
- urgência;
- Momentum;
- incidentes.

Cada parâmetro deve:

- possuir nome semântico;
- ter comentário curto de efeito;
- ser testado indiretamente;
- ser ajustado com relatório;
- evitar duplicação em arquivos diferentes.

Não espalhar coeficientes em componentes de UI.

---

# [INTEGRAÇÃO COM A UI]

## MatchResult

- consumir estatísticas V2 derivadas;
- consumir chutes persistidos;
- não chamar reconstrutor para partidas V2;
- apresentar estado legacy honesto;
- manter fluxo atual de abas e súmula salvo mudança mínima necessária.

## Mapa de finalizações

Cada ponto deve ter:

- minuto;
- jogador;
- posição real;
- resultado;
- xG;
- xGOT, quando aplicável;
- parte do corpo;
- situação;
- assistência, quando houver.

## Momentum

Aparência esperada:

```text
casa — barras acima
────────────────── linha zero
fora — barras abaixo
```

Adicionar, dentro do escopo da tela atual:

- divisão aos 45 minutos;
- escala temporal coerente;
- ícones de gol;
- suporte a acréscimos;
- cores dos times;
- legenda clara;
- toque/tooltip somente se dados reais estiverem disponíveis.

Não copiar código proprietário do Sofascore. Reproduzir o padrão de leitura usando implementação própria.

---

# [CRITÉRIOS DE PERFORMANCE]

Medir antes e depois.

## Obrigatório registrar

- tempo para 1 partida;
- tempo para 100 partidas;
- tempo para uma rodada completa;
- tamanho médio de partida persistida V1 e V2;
- tamanho de save com uma temporada representativa;
- quantidade média de ações por partida full/summary.

## Estratégias permitidas

- coletor de detalhe configurável;
- persistir somente ações essenciais em partidas de IA;
- reducers on-the-fly;
- índices em memória;
- tipos compactos;
- evitar duplicação de ações e shots;
- memoização apenas quando comprovada;
- processamento puro fora do React.

## Proibido

- reduzir causalidade para maquiar performance;
- gerar estatística fictícia em jogos resumidos;
- alterar resultado entre `full` e `summary`;
- bloquear a UI com processamento desnecessário.

---

# [PROTOCOLO DE SEGURANÇA]

## Antes de editar

- executar `git status --short --branch`;
- identificar mudanças preexistentes;
- não sobrescrever trabalho do usuário;
- confirmar branch permitida;
- executar baseline de testes relevante.

## Durante a execução

- fazer mudanças incrementais;
- manter código compilável ao final de cada fase principal;
- criar testes junto com a regra;
- não remover caminho antigo antes de estabilizar o novo;
- registrar decisões temporárias;
- distinguir regressão nova de falha preexistente;
- não alterar dependências.

## Condições para interromper e pedir decisão

Interrompa somente se:

1. houver mudanças do usuário nos mesmos arquivos com conflito real;
2. a única solução segura exigir nova dependência;
3. a única solução exigir perda ou reset de save;
4. houver necessidade de mudar branch, commit, push ou PR;
5. houver contradição incontornável entre requisitos;
6. o schema atual impedir migração segura sem decisão de produto;
7. um bloqueio preexistente impedir validar a mudança de forma confiável;
8. o custo de persistência/performance ultrapassar limite aceitável e exigir redução de escopo.

Não interrompa por decisões normais de implementação. Tome a melhor decisão técnica e documente.

## Git

Não executar commit, push, PR, merge, tag ou release.

Ao final, mostrar:

- branch;
- `git status`;
- arquivos alterados;
- resumo do diff;
- mensagem de commit sugerida;
- validações realizadas.

---

# [VALIDAÇÃO OBRIGATÓRIA]

Executar, quando aplicável:

```bash
bash .claude/skills/foteball-manager/scripts/validate.sh
```

E confirmar individualmente:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Executar testes focados durante desenvolvimento e suíte completa ao final.

Build local deve ser executado se a mudança tocar integração nativa, persistência crítica ou se o contrato do projeto exigir. Não executar build remoto.

Não declarar conclusão se houver falha nova.

---

# [FORMATO DA ENTREGA]

Ao concluir, responder exatamente com esta estrutura:

```markdown
# Resultado

[resumo objetivo do que foi implementado]

## Diagnóstico confirmado

- causa raiz;
- diferenças entre V1 e V2;
- problemas adicionais encontrados.

## Arquitetura implementada

- fluxo causal;
- módulos;
- ledger;
- reducers;
- Momentum;
- compatibilidade.

## Arquivos alterados

- `caminho` — responsabilidade e alteração;

## Migração e saves

- versão anterior;
- versão nova;
- comportamento de partidas legacy;
- testes de reidratação.

## Testes

- unitários;
- integração;
- determinismo;
- invariantes;
- persistência;
- UI;
- balanceamento.

## Resultado do laboratório

| Métrica | Antes | Depois | Status |
|---|---:|---:|---|
| Gols/jogo | | | |
| Chutes/jogo | | | |
| xG/jogo | | | |
| Casa/Empate/Fora | | | |
| Goleadas | | | |
| Correlação xG×gols | | | |
| Correlação chutes×gols | | | |
| Correlação posse×gols | | | |
| Falhas de invariantes | | | |
| Tempo por partida | | | |
| Tamanho persistido | | | |

## Validação

- typecheck: ✅/❌
- lint: ✅/❌
- testes focados: ✅/❌
- suíte completa: ✅/❌
- build local: ✅/❌/não aplicável

## Riscos ou limitações reais

- somente itens comprovados;

## Git

- branch atual;
- commit: não executado;
- push: não executado;
- PR: não aberto;
- mensagem de commit sugerida.
```

Não omitir falhas, limitações, métricas desfavoráveis ou trabalho residual.

---

# [CHECKLIST FINAL]

## Arquitetura

- [ ] Gol não é mais sorteado diretamente sem chute.
- [ ] Posse, chance, chute e gol pertencem à mesma cadeia.
- [ ] Estatísticas são reducers do ledger.
- [ ] UI não cria fatos esportivos.
- [ ] `fatorMomentum` foi renomeado ou separado do Momentum visual.

## Dados

- [ ] Todo gol possui `shotId` ou vínculo equivalente.
- [ ] Todo chute possui origem.
- [ ] xG total é a soma dos chutes.
- [ ] mapa usa coordenadas reais.
- [ ] Momentum possui contribuições reais.
- [ ] partidas legacy são identificadas.

## Determinismo

- [ ] mesma seed produz mesma saída completa.
- [ ] full e summary produzem mesmo resultado esportivo.
- [ ] ao vivo e headless são equivalentes.

## Persistência

- [ ] migração implementada.
- [ ] save antigo abre.
- [ ] save V2 reabre.
- [ ] autosave funciona.
- [ ] tamanho foi medido.

## Balanceamento

- [ ] baseline V1 registrado.
- [ ] laboratório V2 executado.
- [ ] xG calibrado por faixa.
- [ ] zebras continuam possíveis.
- [ ] força e tática têm efeito mensurável.
- [ ] posse não foi transformada em garantia de vitória.

## Qualidade

- [ ] typecheck passa.
- [ ] lint passa.
- [ ] testes passam.
- [ ] nenhuma dependência nova.
- [ ] nenhum teste foi enfraquecido.
- [ ] documentação atualizada.
- [ ] riscos registrados.

---

# [COMANDO FINAL AO CLAUDE]

Execute integralmente esta correção no repositório FOTEBALL.

Não entregue apenas análise, pseudocódigo ou recomendação. Implemente a cadeia causal, integre-a ao jogo, preserve compatibilidade, crie testes, rode o laboratório, calibre o motor e apresente evidências.

Tome decisões técnicas autônomas dentro do escopo. Não peça confirmação entre fases normais. Pare somente diante de bloqueio de segurança real.

A meta não é impedir resultados improváveis. A meta é garantir que todo resultado, comum ou improvável, seja produzido e explicado por uma única história de partida:

```text
posse
→ progressão
→ oportunidade
→ chute
→ xG
→ resolução
→ placar
→ estatísticas
→ Momentum
```

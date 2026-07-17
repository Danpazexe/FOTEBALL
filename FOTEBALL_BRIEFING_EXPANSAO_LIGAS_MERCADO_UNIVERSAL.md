# FOTEBALL — Execução Sênior: Expansão de Ligas, Mundo Persistente, Mercado Universal, IA de Transferências, Perfil de Clubes e Pipeline de Escudos

> **Documento operacional para Claude Code**  
> **Projeto:** FOTEBALL  
> **Repositório principal:** `Danpazexe/FOTEBALL`  
> **Repositório de referência de escudos:** `Danpazexe/FOTEBALL-logos`  
> **Fonte complementar de escudos:** `https://football-logos.cc/collections/`  
> **Natureza:** arquitetura de domínio, dados, engine, persistência, mercado, navegação, UI, automação de assets e testes  
> **Modo:** execução autônoma, incremental, auditável e sem ações remotas não autorizadas

---

# [PAPEL]

Atue como **engenheiro de software sênior responsável pela evolução estrutural do FOTEBALL**, com domínio de React Native CLI, TypeScript strict, Zustand, SQLite, React Navigation, arquitetura de domínio orientada a dados, motores determinísticos, IA de clubes, sistemas de transferências, geração de seeds, migração de saves, otimização de assets e testes Jest.

Você deverá **auditar, projetar, implementar, integrar, migrar, testar e documentar** a expansão do mundo do jogo.

Não trate a tarefa como simples adição de JSONs ou telas. A entrega deve criar uma fundação capaz de receber novas ligas e milhares de jogadores sem duplicar fontes da verdade, quebrar saves, invalidar escalações ou restringir o mercado à divisão ativa.

---

# [CONTEXTO]

O FOTEBALL é um manager mobile com:

- dinâmica rápida inspirada no Brasfoot;
- apresentação clara inspirada no Sofascore;
- engine pura e determinística;
- carreira local/offline;
- clubes brasileiros das Séries A, B, C e D;
- jogadores organizados em JSON por clube;
- compra, venda, empréstimo e propostas;
- transferências entre clubes de IA;
- stacks internos por área;
- escudos locais empacotados pelo Metro;
- saves persistidos localmente.

A próxima evolução deve transformar as divisões brasileiras em um **mundo de futebol expansível**, no qual:

1. novas ligas e clubes sejam adicionados por dados e configuração;
2. o usuário possa iniciar carreira em outros países;
3. jogadores de qualquer liga carregada apareçam no mercado;
4. clubes de IA de qualquer liga comprem, vendam e emprestem;
5. transferências atualizem o mundo inteiro de forma atômica;
6. qualquer clube possa ser aberto por toque;
7. o perfil do adversário mostre elenco, formação, escalação, tática, partidas e transferências disponíveis;
8. escudos sejam locais, leves, padronizados e auditados.

---

# [OBJETIVO]

## Objetivo principal

Criar um **mundo persistente multi-liga**, com mercado universal e clubes de IA ativos, eliminando a limitação em que mercado, clubes e jogadores operam principalmente sobre a divisão ativa.

## Resultado verificável

Ao final:

- existirão definições estáveis de países, ligas, temporadas e regras de competição;
- novas ligas poderão ser adicionadas sem reescrever a store;
- o mercado consultará todas as ligas carregadas;
- clubes de IA negociarão entre países e divisões;
- cada negócio será aplicado por uma única operação de domínio;
- comprador, vendedor, jogador, finanças, elencos, formação, histórico e notícias permanecerão consistentes;
- qualquer clube poderá ser aberto por `clubeId`;
- clubes de IA terão perfil somente leitura;
- o clube do usuário manterá os fluxos de gerenciamento existentes;
- escudos novos serão PNG transparente 128×128, preferencialmente entre 3,30 KB e 5 KB;
- scripts validarão dados, índices e assets;
- saves antigos carregarão por migração explícita;
- testes cobrirão mercado global, IA, dados, navegação, assets e persistência.

---

# [AUTONOMIA CONCEDIDA]

Este briefing concede autonomia para executar localmente a solução completa.

## Autorizado

- ler toda a árvore relevante;
- executar auditorias e scripts locais;
- criar tipos, engines, serviços, repositórios, selectors e utilitários;
- refatorar fluxos de liga, mercado e dados quando necessário;
- criar migrações compatíveis de save e SQLite;
- reorganizar seeds para estrutura escalável;
- criar geradores automáticos de índices TypeScript;
- criar scripts de download, normalização, compressão e auditoria de escudos;
- baixar assets das fontes fornecidas para staging local;
- gerar arquivos 128×128 usados pelo app;
- criar perfil de clube e componentes relacionados;
- criar testes unitários, integração, regressão, persistência e desempenho;
- corrigir problemas diretamente relacionados encontrados durante a execução;
- continuar entre fases sem pedir aprovação intermediária.

## Ferramenta de imagem

Não adicionar dependência de runtime.

Ordem:

1. reutilizar ferramenta já instalada;
2. preferir `pngquant`, `oxipng`, ImageMagick ou equivalente;
3. usar Python se Pillow já existir;
4. somente se não houver alternativa, está autorizada **uma dependência dev-only** específica, como `sharp`, desde que não entre no bundle, seja fixada no lockfile, documentada e justificada.

## Não autorizado

- editar diretamente a `main`;
- sobrescrever alterações preexistentes do usuário;
- commit, push, PR, merge, tag, release ou build remoto sem autorização;
- alterar GitHub Actions sem autorização;
- publicar assets remotamente;
- remover dados existentes para reduzir trabalho;
- inventar dados e apresentá-los como fatos reais;
- baixar ou incorporar faces de jogadores;
- criar dependência online obrigatória.

## Quando parar

Só solicitar orientação diante de:

- risco de perda de dados;
- conflito real com alterações locais não relacionadas;
- credencial privada necessária;
- impossibilidade de acessar legal ou tecnicamente uma fonte;
- ação remota proibida;
- decisão de produto que altere radicalmente o escopo.

---

# [FONTE DA VERDADE]

Usar nesta ordem:

1. código e testes atuais;
2. `CLAUDE.md`;
3. `.claude/skills/foteball-manager/SKILL.md` e referências;
4. `package.json` e lockfile;
5. tipos, schemas, migrações e repositórios atuais;
6. dados existentes;
7. este briefing;
8. documentos antigos apenas como contexto.

---

# [ESTADO ATUAL A SER CONFIRMADO]

A auditoria inicial deve comprovar ou atualizar estes pontos:

## EA-01 — Stack

- React Native CLI 0.86;
- React 19;
- TypeScript strict;
- Zustand 5;
- `@op-engineering/op-sqlite`;
- React Navigation 7;
- Jest 29.

## EA-02 — Seed de clubes

Os clubes são carregados por imports manuais em `src/data/seed/clubes/index.ts`, atualmente separados por país/campeonato/divisão, mas somente o Brasileirão A–D está agregado.

## EA-03 — Seed de jogadores

Os jogadores são carregados por centenas de imports manuais em `src/data/seed/jogadores/index.ts`, com um JSON por clube. Esse padrão funciona para o Brasil, mas não escala bem para várias ligas.

## EA-04 — Mundo duplicado

O `GameState` possui:

- `clubes` e `jogadores` da liga ativa;
- `todosClubes` e `todosJogadores` do conjunto mestre.

Essa duplicação cria risco de divergência após transferências, empréstimos, evolução, lesões, contratos e troca de divisão.

## EA-05 — Liga ativa por divisão textual

`gerarLiga` filtra por `divisao`, gera uma liga ativa e mantém regras brasileiras como `PIRAMIDE_DIVISOES`, `N_ACESSO` e limites de rodada fixos. Isso não representa ligas com quantidades e formatos diferentes.

## EA-06 — Mercado visível limitado

A tela `TransferMarket` usa `state.jogadores`, portanto tende a listar apenas jogadores da liga ativa.

## EA-07 — Mercado IA limitado

`processarMercadoIA` usa `state.clubes` e `state.jogadores`, roda a cada quatro rodadas e gera no máximo duas transferências. Logo, o mercado IA opera principalmente dentro da liga ativa.

## EA-08 — Heurística de IA simples

`mercadoIA.ts` usa overall, média do top 11 e saldo, mas ainda não considera adequadamente:

- necessidade por posição;
- profundidade do elenco;
- idade;
- potencial;
- salário;
- contrato;
- reputação da liga e do clube;
- vontade do jogador;
- minutos esperados;
- venda por excesso;
- risco de deixar formação inválida.

## EA-09 — Transferências não centralizadas

Compra, venda, empréstimo, proposta recebida e IA alteram arrays diretamente em caminhos diferentes. Isso aumenta o risco de:

- jogador duplicado em elenco;
- jogador ausente no comprador;
- vendedor manter jogador na formação;
- `todosJogadores` divergir de `jogadores`;
- dinheiro não ser conservado;
- histórico incompleto.

## EA-10 — Perfil universal de clube inexistente

A navegação possui a tela `Club` voltada ao clube do usuário, mas não um `ClubDetail` genérico por `clubeId`, acessível de tabela, partida, pré-jogo, mercado e perfil do jogador.

## EA-11 — Escudos manuais

`src/assets/escudos/index.ts` mantém `require()` manual para cada clube. O formato é correto para Metro, mas adicionar centenas de entradas manualmente é frágil.

## EA-12 — Assets existentes

O app já usa escudos 128 px transparentes e fallback por sigla/cor. O novo pipeline deve preservar essa integração, não trocar por download em runtime.

---

# [PROBLEMAS IDENTIFICADOS]

- `PI-01` — mercado do usuário limitado à liga ativa;
- `PI-02` — mercado IA limitado aos clubes ativos;
- `PI-03` — estado mestre e estado ativo podem divergir;
- `PI-04` — regras de competição brasileiras estão hardcoded;
- `PI-05` — quantidade de rodadas pode estar hardcoded;
- `PI-06` — imports manuais de dados não escalam;
- `PI-07` — imports manuais de escudos não escalam;
- `PI-08` — não há operação atômica única para transferências;
- `PI-09` — venda pode deixar formação da IA com id fantasma;
- `PI-10` — IA não planeja elenco por posição;
- `PI-11` — IA pode comprar sem considerar salário e tamanho do elenco;
- `PI-12` — não existe histórico global estruturado de transferências;
- `PI-13` — não existe janela global orientada a datas;
- `PI-14` — `rodadaAtual` não serve como relógio universal entre ligas diferentes;
- `PI-15` — clubes de fora da liga ativa não têm navegação própria;
- `PI-16` — interface pode mostrar somente dados do clube do usuário;
- `PI-17` — não há manifesto de origem e peso dos escudos;
- `PI-18` — não há auditoria automática de dimensão/transparência/peso;
- `PI-19` — dados reais de jogadores podem ficar sem rastreabilidade de fonte;
- `PI-20` — crescimento do seed pode aumentar memória, boot e save sem medição.

---

# [DECISÕES DE PRODUTO]

1. O mercado será **universal em escopo**: todas as ligas carregadas participam.
2. Posse do jogador e clube será global, não isolada por divisão.
3. Clubes de IA comprarão, venderão, emprestarão e buscarão agentes livres.
4. O usuário poderá negociar com clubes de outras divisões e países.
5. O mercado continuará simples de usar; profundidade ficará na engine.
6. O usuário poderá tocar em qualquer clube e ver informações disponíveis.
7. O perfil de clube da IA será somente leitura.
8. O usuário não poderá editar formação ou tática do adversário.
9. O jogo continuará offline-first.
10. Escudos serão empacotados localmente.
11. Faces de jogadores não fazem parte desta tarefa.
12. Nenhuma estatística, elenco ou formação será inventada pela UI.
13. Novas ligas serão adicionadas em ondas, depois da fundação genérica.
14. O primeiro pacote deve provar funcionamento entre pelo menos dois novos países.


---

# [ESCOPO]

## Incluído

### S-01 — Fundação multi-liga

- catálogo de países;
- catálogo de competições;
- configuração de temporada;
- quantidade de clubes;
- formato de calendário;
- acesso e rebaixamento configuráveis;
- moeda de exibição ou unidade econômica definida por liga;
- datas de janela configuráveis;
- identificação estável por IDs.

### S-02 — Mundo canônico

- uma fonte canônica para clubes;
- uma fonte canônica para jogadores;
- selectors da liga ativa;
- sincronização de carreira, mercado e competições;
- eliminação progressiva da duplicação perigosa entre arrays ativos e mestres.

### S-03 — Novas ligas e dados

Implementar primeiro uma onda-piloto com:

- **Argentina — Primera División**;
- **Inglaterra — Premier League**.

A onda-piloto deve provar:

- país sul-americano e europeu;
- ligas com quantidade de clubes diferente;
- mercado entre Brasil, Argentina e Inglaterra;
- seleção de carreira em diferentes países;
- escudos e elencos organizados por liga.

Depois da fundação e validação, preparar a estrutura para ondas seguintes:

- Espanha — La Liga;
- Itália — Serie A;
- Alemanha — Bundesliga;
- França — Ligue 1;
- Portugal — Primeira Liga;
- Países Baixos — Eredivisie;
- Turquia — Süper Lig;
- Estados Unidos — MLS;
- Arábia Saudita — Saudi Pro League.

Não implementar todas as ondas de uma vez se isso impedir validação. A entrega mínima completa é fundação + Argentina + Inglaterra + mercado global funcional.

### S-04 — Mercado universal

- busca global;
- filtros por país, liga, clube, posição, idade, overall, potencial, valor e contrato;
- compras entre quaisquer clubes carregados;
- vendas para outras ligas;
- empréstimos interligas;
- agentes livres;
- histórico global;
- notícias resumidas.

### S-05 — IA de mercado

- planejamento de elenco;
- identificação de carências;
- lista de vendas;
- propostas;
- contrapropostas;
- empréstimos;
- agentes livres;
- manutenção de orçamento e folha;
- formação válida após negócios;
- comportamento determinístico.

### S-06 — Perfil universal de clube

- rota por `clubeId`;
- visão geral;
- elenco;
- formação/escalação;
- tática resumida;
- partidas/resultados disponíveis;
- transferências recentes;
- navegação para jogadores;
- CTA apropriado para o próprio clube.

### S-07 — Pipeline de escudos

- descoberta de fontes;
- download para staging;
- normalização 128×128;
- transparência;
- otimização;
- manifesto;
- geração de mapa de `require()`;
- auditoria automática;
- documentação de origem e restrição de uso.

### S-08 — Persistência e migração

- versionamento de save;
- migração do mundo atual;
- preservação de IDs brasileiros;
- persistência de histórico de transferências;
- recuperação após reinício do app;
- troca de liga sem perder negócios realizados.

### S-09 — Testes e documentação

- testes de dados;
- testes do mercado;
- testes de IA;
- testes de atomicidade;
- testes de formação;
- testes de save;
- testes de assets;
- relatório de desempenho;
- documentação de como adicionar nova liga.

---

# [FORA DE ESCOPO]

Nesta entrega, não implementar automaticamente:

- competições continentais completas;
- Champions League, Libertadores, Europa League ou Conference League como torneios jogáveis;
- seleções nacionais;
- calendário real completo de todas as copas domésticas;
- regras de visto, work permit ou limite de estrangeiros por país;
- empresário/agente com interface complexa;
- cláusulas contratuais avançadas;
- bônus por metas em contratos;
- copropriedade de jogador;
- draft da MLS;
- regras financeiras específicas de cada federação;
- variação cambial online;
- atualização automática de elenco pela internet durante o jogo;
- faces de jogadores;
- streaming remoto de escudos;
- editor completo de ligas;
- multiplayer;
- mercado em tempo real com servidor.

A arquitetura não deve impedir essas evoluções futuras.

---

# [POLÍTICA DE DADOS]

## PD-01 — Dados reais

Nomes de clubes, cidades, países, fundação, estádio, jogadores, idade, nacionalidade e posição devem vir de fontes verificáveis.

## PD-02 — Snapshot

Cada pacote de liga deve registrar:

```ts
interface DataSnapshotMeta {
  countryId: string;
  competitionId: string;
  seasonLabel: string;
  snapshotDate: string;
  sources: string[];
  generatedAt: string;
  notes?: string[];
}
```

## PD-03 — Ratings do jogo

Overall, potencial e atributos são valores internos de balanceamento do FOTEBALL. Não devem ser apresentados como nota oficial de uma fonte externa.

Quando não houver ratings confiáveis:

- derivar atributos por posição e overall usando algoritmo determinístico;
- manter limites coerentes;
- registrar que o rating é `curated_game` ou `derived_game`;
- nunca afirmar que o valor é oficial.

## PD-04 — Não inventar silenciosamente

Se um dado factual não puder ser confirmado:

- usar `null` quando o tipo permitir;
- usar fallback explícito apenas para dado não crítico;
- registrar no relatório de pendências;
- não fabricar estádio, fundação, nacionalidade ou elenco real.

## PD-05 — Integridade dos IDs

- preservar todos os IDs brasileiros existentes;
- novos clubes devem usar namespace de país;
- novos jogadores devem evitar colisão global;
- IDs não devem depender de posição atual na liga;
- transferência nunca altera o id do jogador.

Padrões recomendados:

```text
country_arg
competition_arg_primera
club_arg_river_plate
player_arg_river_plate_nome_ano

country_eng
competition_eng_premier_league
club_eng_arsenal
player_eng_arsenal_nome_ano
```

Use o padrão real existente quando houver convenção melhor. Não renomeie IDs brasileiros para “padronizar”.

## PD-06 — Cobertura mínima de elenco

Cada clube deve possuir elenco capaz de formar um time válido.

Mínimo recomendado:

- 2 goleiros;
- 4 zagueiros;
- 2 laterais direitos;
- 2 laterais esquerdos;
- 4 meio-campistas defensivos/centrais;
- 3 meias ofensivos/pontas;
- 3 atacantes;
- total mínimo de 22 jogadores;
- faixa preferencial de 25 a 30.

Validar cobertura pelas posições reais do tipo atual.

---

# [ARQUITETURA DESEJADA]

## Princípio central

```text
Seed imutável
→ criação do mundo da carreira
→ estado canônico persistente
→ selectors por liga/clube
→ engines puras
→ eventos de domínio
→ store aplica resultado
→ SQLite persiste
→ UI apenas apresenta
```

## AD-01 — Catálogo de países

Criar tipo equivalente a:

```ts
export interface CountryDefinition {
  id: string;
  nome: string;
  codigoISO: string;
  continente: 'SA' | 'EU' | 'NA' | 'AF' | 'AS' | 'OC';
  moeda: string;
  locale: string;
}
```

Não buscar câmbio online. Caso seja necessária conversão, usar tabela estática de unidade econômica do jogo, versionada por temporada.

## AD-02 — Definição de competição

```ts
export interface CompetitionDefinition {
  id: string;
  countryId: string;
  nome: string;
  nomeCurto: string;
  tier: number;
  tipo: 'liga' | 'copa_mata_mata' | 'copa_grupos';
  numeroClubes: number;
  turnos: number;
  pontosVitoria: number;
  pontosEmpate: number;
  acesso: number;
  rebaixamento: number;
  competitionAboveId?: string;
  competitionBelowId?: string;
  seasonCalendarId: string;
  transferWindowPolicyId: string;
  active: boolean;
}
```

Não assumir 20 clubes, 38 rodadas ou quatro acessos para todas as ligas.

## AD-03 — Configuração de calendário

```ts
export interface SeasonCalendarDefinition {
  id: string;
  seasonLabel: string;
  startDate: string;
  endDate: string;
  matchIntervalDays: number;
  windows: TransferWindowDefinition[];
}
```

O relógio global do mercado deve usar `dataAtual`, não `rodadaAtual`.

## AD-04 — Janela de transferências

```ts
export interface TransferWindowDefinition {
  id: string;
  countryIds?: string[];
  competitionIds?: string[];
  startsAt: string;
  endsAt: string;
  scope: 'global' | 'country' | 'competition';
  allowPermanent: boolean;
  allowLoans: boolean;
  allowFreeAgents: boolean;
}
```

Para a primeira versão, a política pode usar uma janela universal configurável para todas as ligas carregadas. Não espalhar datas em condicionais.

## AD-05 — Estado canônico do mundo

Evitar manter duas cópias mutáveis independentes.

Modelo recomendado:

```ts
export interface WorldState {
  clubsById: Record<string, Clube>;
  playersById: Record<string, Player>;
  competitionsById: Record<string, CompetitionRuntime>;
  transferHistory: TransferRecord[];
  activeCompetitionId: string;
  userClubId: string | null;
}
```

Selectors devem fornecer:

```ts
selectClubesCompeticao(state, competitionId)
selectJogadoresClube(state, clubeId)
selectJogadoresMercadoGlobal(state, filtros)
selectLigaAtiva(state)
selectClubePorId(state, clubeId)
```

Se uma migração completa imediata for arriscada, criar uma camada de compatibilidade temporária. A fonte canônica deve ser inequívoca.

## AD-06 — Repositório de mundo

Separar:

- seed estático;
- estado mutável da carreira;
- consultas;
- persistência.

Possível organização:

```text
src/domain/world/
  worldTypes.ts
  worldSelectors.ts
  worldInvariants.ts

src/engine/competitions/
  competitionRegistry.ts
  seasonCalendar.ts
  promotionRelegation.ts

src/engine/transfers/
  transferTypes.ts
  transferPolicy.ts
  transferTransaction.ts
  transferWindow.ts
  marketAI.ts
  squadPlanning.ts
  playerInterest.ts

src/api/database/repositories/
  worldRepository.ts
  transferRepository.ts
```

Ajustar à árvore real. Não impor pasta fictícia se o projeto já tiver organização equivalente.

## AD-07 — Operação atômica de transferência

Toda movimentação deve passar por uma única função pura:

```ts
export interface ApplyTransferInput {
  world: WorldState;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: 'permanent' | 'loan' | 'loan_return' | 'free_agent';
  fee: number;
  salary?: number;
  date: string;
  windowId?: string;
  source: 'user' | 'ai';
}

export interface ApplyTransferResult {
  ok: boolean;
  world: WorldState;
  record?: TransferRecord;
  errors: string[];
  warnings: string[];
}
```

Essa função deve:

1. validar janela;
2. validar jogador;
3. validar origem e destino;
4. validar orçamento;
5. validar salário quando aplicável;
6. remover do vendedor;
7. remover da formação do vendedor;
8. adicionar ao comprador;
9. impedir duplicidade;
10. registrar finanças simétricas;
11. atualizar `clubeId`/empréstimo;
12. reparar formação se necessário;
13. registrar histórico;
14. devolver novo estado sem efeito colateral.

## AD-08 — Formação pós-transferência

Depois de venda, empréstimo ou retorno:

- nenhum titular/reserva pode apontar para jogador que não pertence ao clube;
- a IA deve recompor formação com autoescalação existente;
- se o elenco estiver abaixo do mínimo, registrar necessidade urgente;
- o usuário deve receber aviso, não autoalteração silenciosa, quando a própria formação for afetada por venda aceita.

## AD-09 — Eventos de mercado

```ts
export interface TransferRecord {
  id: string;
  playerId: string;
  fromClubId: string | null;
  toClubId: string | null;
  type: 'permanent' | 'loan' | 'loan_return' | 'free_agent';
  fee: number;
  salary?: number;
  date: string;
  season: string;
  source: 'user' | 'ai';
  reasonCodes: string[];
}
```

O histórico será a fonte para notícias e tela do clube.


---

# [REQUISITOS FUNCIONAIS]

## RF-01 — Seleção de país e liga

A criação de carreira deve permitir:

```text
País
→ Liga/Divisão
→ Clube
→ Resumo da carreira
```

A lista deve ser gerada do catálogo, sem condicionais hardcoded por país.

## RF-02 — Liga ativa por `competitionId`

A carreira deve armazenar `activeCompetitionId`. Não usar apenas a string `divisao` como identidade da competição.

## RF-03 — Calendário genérico

Gerar calendário conforme:

- quantidade de clubes;
- número de turnos;
- datas da temporada;
- intervalo entre jogos;
- formato da competição.

## RF-04 — Acesso/rebaixamento configurável

Aplicar quantidade e liga de destino definidas na competição. Não usar regra brasileira universal.

## RF-05 — Mundo preservado ao trocar de liga

Ao assumir clube de outra liga:

- não recarregar o seed por cima do mundo mutável;
- preservar transferências anteriores;
- preservar evolução, contratos e histórico;
- ativar a competição de destino por selector/configuração.

## RF-06 — Mercado global

A tela Mercado deve consultar todos os jogadores carregados, excluindo apenas:

- jogador do próprio clube quando a aba for compra;
- jogadores indisponíveis por regra de negócio;
- duplicados;
- registros inválidos.

## RF-07 — Filtros universais

Adicionar filtros progressivos:

- país;
- liga;
- clube;
- posição;
- idade mínima/máxima;
- overall mínimo/máximo;
- potencial;
- valor;
- salário;
- contrato terminando;
- agente livre;
- disponível para empréstimo.

Não sobrecarregar a tela. Filtros avançados podem viver em sheet.

## RF-08 — Busca global

Buscar por nome/apelido normalizado em todas as ligas carregadas, com paginação ou limite eficiente.

## RF-09 — Compra internacional

O usuário deve poder propor compra por jogador de qualquer clube carregado.

## RF-10 — Venda internacional

Clubes de outras ligas podem enviar proposta por jogadores do usuário.

## RF-11 — Empréstimo internacional

Permitir empréstimo entre ligas, mantendo clube dono, destino e data/temporada de retorno.

## RF-12 — Agentes livres

Agentes livres devem ser visíveis globalmente. A IA também pode contratá-los.

## RF-13 — Janela aberta

Negócios permanentes e empréstimos só podem ser concluídos dentro da política ativa, salvo exceções explicitamente definidas.

## RF-14 — Contrato e interesse

A resposta de clube/jogador deve considerar:

- valor da proposta;
- reputação do comprador;
- reputação da liga;
- força do elenco;
- chance estimada de jogar;
- salário;
- idade;
- duração do contrato atual;
- moral;
- status no clube.

O resultado continua simples na UI: aceita, recusada ou contraproposta.

## RF-15 — IA compra

Cada clube de IA deve analisar carências e tentar contratar durante a janela.

## RF-16 — IA vende

A IA pode vender por:

- excesso na posição;
- contrato perto do fim;
- jogador insatisfeito;
- necessidade financeira;
- oferta muito acima do valor;
- jogador fora do plano.

## RF-17 — IA empresta

A IA pode emprestar jovens com baixo uso esperado e receber jovens para cobrir carência temporária.

## RF-18 — IA respeita orçamento

A compra deve considerar:

```text
saldo disponível
- reserva mínima
- taxa de transferência
- impacto salarial projetado
```

## RF-19 — IA respeita elenco

Não vender se a operação deixar o clube sem cobertura mínima, salvo crise financeira severa e com tentativa posterior de reposição.

## RF-20 — IA evita repetição

Um jogador não pode ser comprado e revendido repetidamente na mesma janela sem regra explícita.

## RF-21 — IA determinística

Mesma entrada, data e seed devem gerar as mesmas decisões.

## RF-22 — Ciclo orientado a data

O mercado mundial deve processar por data ou semana, não depender de `rodadaAtual % 4`.

## RF-23 — Volume controlado

O mundo pode produzir muitos negócios, mas a UI deve resumir:

- principais transferências;
- negócios do país do usuário;
- negócios da liga do usuário;
- negócios envolvendo o usuário;
- opção “Ver todas”.

## RF-24 — Histórico global

Persistir negócios por temporada e permitir consulta por jogador e clube.

## RF-25 — Perfil de clube

Adicionar rota equivalente a:

```ts
ClubDetail: {clubeId: string}
```

A rota deve ser acessível de:

- tabela;
- calendário;
- placar;
- pré-jogo;
- partida finalizada;
- perfil de jogador;
- mercado;
- notícias;
- propostas;
- histórico de transferências.

## RF-26 — Visão geral do clube

Mostrar apenas dados reais disponíveis:

- escudo;
- nome e sigla;
- país e liga;
- cidade;
- fundação;
- estádio;
- reputação;
- posição atual quando houver tabela;
- forma recente quando houver partidas;
- técnico/controle por IA, se existir dado.

## RF-27 — Elenco adversário

Mostrar lista densa com:

- posição;
- jogador;
- idade;
- overall conhecido pelo jogo;
- condição;
- moral quando a regra de informação permitir;
- status de lesão/suspensão;
- contrato;
- valor.

Tocar no jogador abre `PlayerDetail`.

## RF-28 — Escalação adversária

Mostrar `formacaoAtual` real do clube, com:

- titulares;
- reservas;
- capitão;
- esquema;
- coordenadas quando existirem;
- indisponíveis;
- resumo tático.

A escalação é **somente leitura**.

## RF-29 — Privacidade competitiva

Não mostrar informação que o produto considere secreta. Caso a tática completa não deva ser conhecida, exibir somente resumo ou último esquema observado. Essa política deve ser configurável, não inventada pela tela.

## RF-30 — Partidas do clube

Exibir resultados e próximos jogos que realmente existirem no estado. Para liga de background sem calendário detalhado, mostrar empty state honesto.

## RF-31 — Transferências do clube

Mostrar entradas e saídas derivadas de `TransferRecord`.

## RF-32 — Próprio clube

Ao abrir o clube do usuário, mostrar CTA para as telas gerenciais existentes. Não duplicar ações financeiras e de infraestrutura dentro do perfil genérico.

## RF-33 — Escudos locais

Todo clube da onda implementada deve ter escudo local ou fallback explícito. Não depender da internet em runtime.

## RF-34 — Geração automática do mapa de assets

Criar script que gere entradas estáticas `require()` compatíveis com Metro.

## RF-35 — Manifesto de assets

Cada escudo deve possuir metadados:

```ts
interface ClubLogoManifestItem {
  clubId: string;
  file: string;
  width: 128;
  height: 128;
  bytes: number;
  sha256: string;
  sourceUrl: string;
  sourceType: 'github_repo' | 'football_logos_cc';
  downloadedAt: string;
  licenseStatus: 'development_only' | 'cleared' | 'replacement_required';
}
```

## RF-36 — Auditoria de dados

Criar comando que falhe quando houver:

- ID duplicado;
- clube sem competição válida;
- jogador apontando para clube inexistente;
- elenco com jogador duplicado;
- elenco sem cobertura mínima;
- overall/atributo fora da faixa;
- contrato inválido;
- escudo sem clube;
- clube sem escudo/fallback registrado;
- import ausente.

## RF-37 — Geração de índices

Índices de clubes, jogadores e escudos devem ser gerados por script. Evitar centenas de imports editados manualmente.

## RF-38 — Compatibilidade com Copa do Brasil

A Copa do Brasil deve continuar restrita/adequada ao conjunto brasileiro conforme comportamento atual. Não incluir clubes estrangeiros por efeito colateral.

## RF-39 — Compatibilidade com Série D

Grupos e mata-mata da Série D devem continuar funcionando.

## RF-40 — Compatibilidade da engine causal

Não regredir engine, ledger de chutes, xG, momentum ou qualidade de dados já implementados.

---

# [REGRAS DE NEGÓCIO — MERCADO UNIVERSAL]

## RN-01 — Uma fonte de propriedade

`Player.clubeId` ou estrutura canônica equivalente é a fonte da propriedade/atuação atual. `Clube.elenco` deve ser derivado ou mantido por invariante na mesma transação.

## RN-02 — Conservação financeira

Em compra:

```text
saldo do comprador -= taxa
saldo do vendedor += taxa
```

O valor recebido e pago deve ser idêntico, salvo comissão explicitamente modelada.

## RN-03 — Taxa e salário são diferentes

A taxa de transferência não substitui o custo salarial. A IA deve avaliar ambos.

## RN-04 — Reserva financeira

Clubes de IA não devem gastar 100% do caixa. Definir reserva por reputação, divisão, receita e risco.

## RN-05 — Limites de elenco

Definir configuração inicial:

```ts
const SQUAD_LIMITS = {
  min: 22,
  preferredMin: 25,
  preferredMax: 30,
  hardMax: 35,
};
```

Ajustar por evidência e testes.

## RN-06 — Cobertura por posição

Antes de vender, avaliar titulares e reservas por setor. A IA não deve vender seu único goleiro apto ou ficar sem XI válido.

## RN-07 — Valor de mercado

O preço de referência deve considerar:

- valorMercado;
- idade;
- potencial;
- overall;
- contrato restante;
- forma;
- moral;
- reputação do vendedor;
- escassez da posição;
- demanda do comprador.

Não multiplicar por uma constante única em todos os casos.

## RN-08 — Interesse do jogador

O jogador tende a aceitar quando:

- salário melhora;
- liga/clube tem maior reputação;
- há chance de titularidade;
- contrato atual está perto do fim;
- moral está baixa no clube atual.

Pode recusar quando:

- teria papel muito menor;
- salário é insuficiente;
- mudança reduz fortemente reputação competitiva;
- acabou de ser transferido;
- contrato foi renovado recentemente.

## RN-09 — Jogador recém-transferido

Registrar `lastTransferDate` ou consultar histórico. Bloquear nova transferência na mesma janela, salvo retorno de empréstimo ou regra especial.

## RN-10 — Agente livre

Agente livre não gera receita para vendedor. Pode exigir salário e luvas somente se o sistema suportar; caso contrário, usar contrato simplificado documentado.

## RN-11 — Empréstimo

Deve registrar:

- clube dono;
- clube atual;
- início;
- retorno;
- taxa;
- responsabilidade salarial, mesmo que simplificada;
- opção de compra somente fora de escopo inicial.

## RN-12 — Janela universal

“Universal” significa que o conjunto de participantes é global. A abertura temporal deve vir de configuração. Não manter mercado global preso à divisão do usuário.

## RN-13 — Propostas ao usuário

Clubes de IA de qualquer liga podem ofertar, desde que:

- possam pagar;
- tenham necessidade;
- jogador tenha interesse plausível;
- oferta não seja duplicada;
- o usuário tenha tempo de resposta.

## RN-14 — Clube do usuário

A IA nunca conclui venda do jogador do usuário sem aceite explícito.

## RN-15 — Clube da IA

Negócios IA↔IA podem ser concluídos automaticamente e registrados.

## RN-16 — Formação válida

Toda transferência concluída deve executar reparo de formação e teste de invariantes antes de persistir.

## RN-17 — Notícias

Notícias devem ser derivadas do histórico real. Não gerar texto de transferência sem `TransferRecord` correspondente.

## RN-18 — Dados de clube fora da liga ativa

A UI consulta o mundo canônico, não cria cópia temporária para mostrar o adversário.

---

# [IA DE TRANSFERÊNCIAS]

## Objetivo

Criar uma IA simples na superfície, mas coerente por baixo. Cada clube deve agir por necessidade e capacidade, não por sorteio puro de jogador mid-tier.

## Etapa 1 — Planejamento de elenco

Para cada clube:

```ts
interface SquadNeed {
  position: Position;
  urgency: number; // 0..1
  targetOverallMin: number;
  targetAgeMin?: number;
  targetAgeMax?: number;
  preferPotential: boolean;
  reasonCodes: string[];
}
```

Calcular:

- quantidade por posição;
- qualidade do titular;
- qualidade da reserva;
- idade média;
- contratos terminando;
- lesões longas;
- jogadores emprestados;
- objetivo da temporada;
- orçamento.

## Etapa 2 — Lista de saída

Pontuar jogadores para venda:

```text
surplusScore
+ contractRisk
+ financialPressure
+ dissatisfaction
+ offerPremium
- squadImportance
- positionalScarcity
- youthPotential
```

## Etapa 3 — Busca de alvo

Pontuar candidatos:

```text
needFit
+ qualityUpgrade
+ potentialFit
+ ageFit
+ affordability
+ wageFit
+ reputationInterest
+ playingTimeInterest
- injuryRisk
- recentTransferPenalty
- sellerResistance
```

## Etapa 4 — Proposta

Gerar valor inicial e margem de negociação. Não fazer dezenas de rodadas de negociação invisíveis. Limitar tentativas e registrar motivo.

## Etapa 5 — Decisão do vendedor

Considerar:

- importância do jogador;
- cobertura da posição;
- preço versus valor calculado;
- situação financeira;
- contrato restante;
- possibilidade de reposição.

## Etapa 6 — Interesse do jogador

Calcular aceite do destino. Mesmo com clubes concordando, o jogador pode recusar.

## Etapa 7 — Aplicação atômica

Somente `applyTransfer` ou nome equivalente altera o estado.

## Etapa 8 — Replanejamento

Após o negócio:

- atualizar necessidade do comprador;
- atualizar necessidade do vendedor;
- reparar formação;
- impedir segunda transferência do mesmo jogador;
- atualizar orçamento disponível.

## RNG

Usar seed derivada de:

```text
season + currentDate + windowId + clubId + cycleIndex
```

Não usar `Math.random()` ou `Date.now()` na engine.

## Limite de processamento

Não executar busca quadrática ingênua entre todos os clubes e todos os jogadores a cada render.

Criar índices por:

- posição;
- país;
- liga;
- faixa de overall;
- faixa de valor;
- situação contratual.

O processamento ocorre em engine/store por ciclo, nunca na renderização.


---

# [PERFIL UNIVERSAL DE CLUBE]

## Direção de UX

A tela deve seguir a apresentação esportiva do FOTEBALL:

- informação clara;
- hierarquia semelhante ao Sofascore;
- sem virar painel corporativo;
- dados principais primeiro;
- detalhes por tab/toque;
- um CTA dominante quando for o próprio clube;
- leitura rápida em celular.

## Rota

Adicionar rota compartilhada por `clubeId`.

Preferência arquitetural:

- uma tela única `ClubDetail` reutilizada;
- acessível de qualquer stack;
- comportamento de voltar previsível;
- sem duplicar uma tela por aba.

Auditar se deve viver no RootStack ou em stacks internos. Escolher a opção que preserve navegação e tab bar de forma consistente.

## Estrutura sugerida

```text
Header fixo
├── voltar
├── escudo
├── nome/sigla
└── país · liga

Resumo
├── posição/forma/reputação
├── próximo jogo
└── estádio

Tabs
├── Visão geral
├── Elenco
├── Escalação
├── Jogos
└── Transferências
```

## Tab Visão geral

- identidade;
- país/liga/divisão;
- cidade;
- fundação;
- estádio/capacidade;
- reputação;
- posição atual;
- forma recente;
- resumo de força por linha, se calculado pela engine;
- últimos resultados disponíveis.

## Tab Elenco

Usar lista densa e virtualizada quando necessário:

```text
POS | JOGADOR | IDADE | OVR | COND. | STATUS
```

- agrupar por posição opcionalmente;
- destacar capitão;
- mostrar lesão/suspensão;
- tocar abre PlayerDetail;
- não mostrar atributos secretos sem regra de produto.

## Tab Escalação

- campo existente reutilizado em modo somente leitura;
- formação atual real;
- titulares e reservas;
- capitão;
- esquema;
- resumo tático;
- indisponíveis;
- sem drag-and-drop;
- sem botões para salvar alterações.

## Tab Jogos

- próximos jogos e resultados disponíveis;
- tocar em jogo finalizado abre MatchResult quando o dado existir;
- liga sem histórico detalhado mostra estado vazio honesto.

## Tab Transferências

- entradas;
- saídas;
- empréstimos;
- retornos;
- valores;
- temporada/data;
- tudo derivado de `TransferRecord`.

## Clube do usuário

Quando `clubeId === userClubId`:

- manter perfil legível;
- mostrar CTA “Gerenciar clube” ou atalhos para os fluxos existentes;
- não duplicar edição de estádio, ingresso, finanças e tática nessa tela.

## Pontos clicáveis obrigatórios

Tornar clube clicável em:

- cards de partida;
- pré-jogo;
- placar final;
- classificação;
- artilharia/estatísticas quando houver clube;
- player detail;
- transfer market;
- proposta recebida;
- notícias de mercado;
- Copa do Brasil;
- Série D;
- calendário.

Não transformar todo `TeamCrest` automaticamente em botão se isso prejudicar acessibilidade. Criar wrapper semântico ou prop `onPress` apropriada.

---

# [PIPELINE DE ESCUDOS]

## Fontes fornecidas

1. `https://github.com/Danpazexe/FOTEBALL-logos.git`
2. `https://football-logos.cc/collections/`

## Regra de auditoria da fonte

Antes de baixar:

- verificar se o repositório contém arquivos individuais dos clubes desejados;
- não assumir estrutura de URL ou pasta;
- se o repositório tiver apenas catálogo/previews, usar as páginas/collection packs do site;
- registrar a URL exata de origem de cada arquivo;
- não depender de scraping frágil se o pack oficial da coleção estiver disponível.

## Especificação de saída

Cada escudo usado no app deve ser:

- PNG;
- transparente;
- 128×128 px exatos;
- proporção preservada;
- centralizado;
- sem recorte;
- sem fundo branco;
- sem metadata desnecessária;
- nome de arquivo ASCII, minúsculo e estável;
- compatível com `Image` do React Native e Metro.

## Peso

Faixa preferencial solicitada:

```text
3.300 a 5.000 bytes
```

Regras:

- hard cap preferencial: `5.120 bytes`;
- arquivo abaixo de 3.300 bytes é aceitável e melhor, desde que visualmente correto;
- nunca adicionar bytes artificiais para alcançar o mínimo;
- não degradar bordas, transparência ou legibilidade para obedecer cegamente à faixa;
- qualquer exceção acima de 5.120 bytes deve ser listada no relatório, com tentativa de otimização;
- meta excepcional máxima: 8 KB somente quando ≤5 KB causar dano visual perceptível e documentado.

## Normalização visual

- canvas 128×128;
- manter aspect ratio;
- área útil recomendada de até 116×116, com margem transparente;
- não esticar escudo largo/alto;
- usar filtro de resize de alta qualidade;
- preservar alfa;
- converter para sRGB;
- remover perfil ICC quando dispensável;
- quantizar cores com cuidado;
- evitar halo branco nas bordas.

## Estrutura sugerida no app

```text
src/assets/escudos/
  brasil/
    brasileirao/
      serie-a/
      serie-b/
      serie-c/
      serie-d/
  argentina/
    primera-division/
  inglaterra/
    premier-league/
  generated/
    escudos.generated.ts
    escudos.manifest.json
```

Ajustar à convenção real, preservando paths existentes ou migrando com segurança.

## Staging

Não colocar ZIPs, SVGs e originais gigantes no bundle.

```text
tools/assets/club-logos/
  sources/
  staging/
  reports/
```

Ou pasta equivalente fora de `src`.

Adicionar ao `.gitignore` arquivos temporários e packs brutos quando apropriado.

## Script de aquisição

Criar comando equivalente:

```bash
node scripts/assets/download-club-logos.mjs --league competition_eng_premier_league
```

Responsabilidades:

1. ler manifesto de clubes;
2. resolver fonte;
3. baixar para staging;
4. validar MIME/extensão;
5. impedir HTML salvo como PNG;
6. calcular hash;
7. registrar falhas sem corromper assets existentes;
8. respeitar retry/backoff;
9. não baixar novamente arquivo idêntico.

## Script de processamento

```bash
node scripts/assets/process-club-logos.mjs --league competition_eng_premier_league
```

Responsabilidades:

1. abrir arquivo fonte;
2. validar imagem;
3. remover fundo somente se a fonte deveria ser transparente e houver margem uniforme — não aplicar remoção destrutiva automática;
4. redimensionar para caber no canvas;
5. centralizar;
6. quantizar/comprimir;
7. validar tamanho final;
8. comparar visualmente ou por métricas básicas;
9. gravar destino final;
10. atualizar manifesto.

## Script de auditoria

```bash
node scripts/assets/audit-club-logos.mjs
```

Deve falhar quando houver:

- dimensão diferente de 128×128;
- arquivo corrompido;
- peso acima do limite sem exceção registrada;
- ausência de transparência quando esperada;
- nome incompatível;
- `clubId` sem arquivo;
- arquivo sem `clubId`;
- hash duplicado entre clubes diferentes, salvo exceção;
- fonte ausente;
- caminho não mapeado no índice.

## Geração de `require()`

Metro precisa de referências estáticas. Criar gerador:

```bash
node scripts/assets/generate-crest-index.mjs
```

Saída exemplo:

```ts
// ARQUIVO GERADO. NÃO EDITAR MANUALMENTE.
export const ESCUDOS = {
  club_eng_arsenal: require('../inglaterra/premier-league/club_eng_arsenal.png'),
  club_arg_river_plate: require('../argentina/primera-division/club_arg_river_plate.png'),
} satisfies Record<string, ImageSourcePropType>;
```

Preservar entradas brasileiras existentes e evitar alteração de ordem aleatória.

## Manifesto de origem

Criar `docs/assets/LOGO_SOURCES.md` e manifesto JSON.

Registrar:

- clube;
- arquivo;
- fonte;
- data;
- tamanho original;
- tamanho final;
- hash;
- observação de licenciamento;
- necessidade de substituição para distribuição comercial, quando aplicável.

## Protocolo legal

Os escudos são marcas dos respectivos clubes. A fonte football-logos.cc declara uso informativo/editorial/fan e restrições para produtos comerciais e branding.

Portanto:

- não afirmar propriedade;
- tratar assets obtidos como `development_only` enquanto não houver autorização/licença adequada;
- manter fallback genérico pronto;
- não bloquear desenvolvimento local;
- criar gate/documentação para revisão antes de distribuição comercial;
- não remover créditos/origem do manifesto.

---

# [ESTRUTURA DE DADOS E SEEDS]

## Organização escalável

Estrutura recomendada:

```text
src/data/seed/
  countries/
    countries.json
  competitions/
    brasil/
      brasileirao-serie-a.json
      brasileirao-serie-b.json
    argentina/
      primera-division.json
    inglaterra/
      premier-league.json
  clubes/
    brasil/brasileirao/serie-a.json
    argentina/primera-division/clubs.json
    inglaterra/premier-league/clubs.json
  jogadores/
    brasil/...
    argentina/primera-division/<club-id>.json
    inglaterra/premier-league/<club-id>.json
  snapshots/
    argentina-primera-2026.json
    england-premier-2026-27.json
```

Não é obrigatório mover todo o Brasil imediatamente se o risco for alto. O gerador deve suportar estrutura antiga durante migração.

## Índices gerados

Criar scripts que descubram arquivos e produzam imports estáticos.

Exemplo:

```bash
node scripts/data/generate-seed-index.mjs
node scripts/data/validate-seed.mjs
```

## Validações de clube

- `id` único;
- `nome` e `sigla` não vazios;
- `countryId` válido;
- `competitionId` válido;
- estádio válido;
- finanças com defaults;
- formação inicial válida ou gerável;
- tática inicial válida;
- `controladoPorIA` correto;
- escudo manifestado.

## Validações de jogador

- `id` único global;
- `clubeId` válido ou `null`;
- posição válida;
- atributos 0–100;
- overall 0–100;
- potencial ≥ overall quando essa for a regra atual;
- idade coerente;
- salário/valor não negativos;
- contrato válido;
- histórico e stats com defaults;
- sem duplicação em clubes.

## Geração de atributos derivados

Quando necessário, criar função pura:

```ts
derivePlayerProfile({
  id,
  position,
  overall,
  potential,
  age,
  dominantFoot,
  seed,
})
```

Requisitos:

- determinística;
- coerente por posição;
- overall calculado compatível;
- sem atributos absurdos;
- goleiro com atributos adequados;
- variabilidade controlada;
- testes de distribuição;
- não alterar jogadores brasileiros existentes sem motivo.

## Metadados de fonte opcionais

Caso não queira poluir o tipo `Player`, manter metadados em manifesto separado:

```ts
interface PlayerSourceMeta {
  playerId: string;
  sourceUrls: string[];
  snapshotDate: string;
  ratingSource: 'curated_game' | 'derived_game';
}
```

---

# [PERSISTÊNCIA E MIGRAÇÃO]

## PM-01 — Versionar save

Incrementar versão de schema/save.

## PM-02 — Migrar Brasil existente

Saves antigos devem manter:

- clube do usuário;
- temporada;
- rodada/data;
- elenco;
- contratos;
- transferências já realizadas;
- lesões;
- suspensões;
- formações;
- partidas;
- finanças;
- patrocínio;
- engine causal.

## PM-03 — Construção do mundo ausente

Ao carregar save antigo sem catálogo mundial:

1. carregar seed atual;
2. aplicar estado mutável do save sobre IDs existentes;
3. adicionar novos clubes/jogadores ainda ausentes;
4. nunca sobrescrever jogador já transferido;
5. reconstruir índices e elencos;
6. validar invariantes;
7. persistir na nova versão somente após sucesso.

## PM-04 — Transação

Migração SQLite deve ser transacional. Em falha, manter save anterior recuperável.

## PM-05 — Uma fonte canônica

Evitar salvar duas cópias completas conflitantes. Caso compatibilidade exija arrays ativos, tratá-los como cache derivado e reconstruível.

## PM-06 — Histórico de transferências

Persistir histórico por temporada. Negócios antigos sem histórico podem permanecer sem registro; não inventar retroativamente.

## PM-07 — Teste de reabertura

Depois de transferência internacional:

- salvar;
- fechar/hidratar;
- confirmar jogador no clube correto;
- confirmar saldo;
- confirmar formação válida;
- confirmar histórico.


---

# [REQUISITOS NÃO FUNCIONAIS]

## RNF-01 — Determinismo

Toda decisão de engine deve receber seed e produzir a mesma saída para a mesma entrada.

## RNF-02 — Performance

Metas iniciais:

- busca global não deve travar a thread de UI;
- filtros devem usar selector memoizado, índice ou paginação;
- nenhuma renderização percorre todo o mundo repetidamente;
- processamento da IA ocorre fora da renderização;
- cold start não deve regredir de forma perceptível sem relatório;
- medir memória com a onda-piloto;
- registrar tamanho do seed e do save.

Se a onda-piloto causar regressão relevante, migrar dados de mundo para repositório SQLite/lazy loading em vez de esconder o problema.

## RNF-03 — Tamanho do app

- somente escudos finais 128×128 entram no bundle;
- não incluir collection ZIPs;
- não incluir SVGs/originais gigantes;
- não incluir faces;
- relatório deve somar bytes adicionados por liga.

## RNF-04 — TypeScript

Proibido:

- `any` novo;
- `@ts-ignore`;
- `@ts-nocheck`;
- `as unknown as`;
- casts duplos para esconder incompatibilidade.

Preferir unions discriminadas, `Readonly`, `satisfies` e validação de fronteira.

## RNF-05 — Engine pura

Nada de React, Zustand, SQLite, filesystem, rede, `Math.random()` ou `Date.now()` dentro da engine.

## RNF-06 — UI

- usar Design System atual;
- cores por tokens;
- números tabulares;
- tema claro/escuro;
- alvos de toque acessíveis;
- leitor de tela;
- empty states honestos;
- listas extensas virtualizadas quando necessário.

## RNF-07 — Offline

O app deve funcionar sem internet depois do build/instalação.

## RNF-08 — Observabilidade de desenvolvimento

Scripts devem produzir relatórios legíveis e exit code não zero em erro.

## RNF-09 — Idempotência

Rodar geradores duas vezes sem alteração de entrada não deve criar diff.

## RNF-10 — Atomicidade

Nenhuma transferência parcialmente aplicada pode chegar ao store persistido.

## RNF-11 — Compatibilidade

Preservar Android/iOS, React Native New Architecture, Metro e save antigo.

## RNF-12 — Manutenibilidade

Adicionar uma nova liga deve exigir principalmente:

1. definição da competição;
2. JSON dos clubes;
3. JSONs dos jogadores;
4. escudos/manifesto;
5. executar geradores e validações.

Não deve exigir editar dezenas de switches.

---

# [RESTRIÇÕES]

- não migrar para Expo;
- não trocar Zustand/SQLite;
- não adicionar backend;
- não exigir internet;
- não remover sistemas brasileiros;
- não alterar engine de partida por necessidade do mercado;
- não simular todas as ligas com ledger completo se isso inflar save/performance;
- não mostrar resultados de liga de background que não foram simulados;
- não usar dados futuros sem marcar snapshot;
- não editar assets existentes sem necessidade;
- não substituir escudo real por arquivo de baixa qualidade;
- não usar URLs remotas como `Image.source` principal;
- não codificar regras de um país como universais;
- não usar `rodadaAtual` como relógio global;
- não permitir que IA venda jogador do usuário automaticamente;
- não permitir transferência para o mesmo clube;
- não permitir duplicidade de jogador em elenco;
- não ignorar formação inválida após venda.

---

# [PLANO DE EXECUÇÃO]

## Fase 0 — Preparação e baseline

1. executar `git status --short --branch`;
2. confirmar branch permitida pelo `CLAUDE.md`;
3. preservar alterações do usuário;
4. ler skill e contratos;
5. executar baseline:
   - typecheck;
   - lint;
   - testes;
   - auditoria de dados existente;
6. registrar:
   - número de clubes;
   - número de jogadores;
   - tamanho dos seeds;
   - tamanho dos escudos;
   - tempo aproximado de boot/teste de load;
   - versão do save.

Não esperar autorização após apresentar o plano inicial; continuar automaticamente.

## Fase 1 — Auditoria estrutural

Mapear:

- criação/reinício de carreira;
- seleção de liga/clube;
- `gerarLiga`;
- promoção/rebaixamento;
- troca de clube;
- store e selectors;
- persistência;
- compra/venda/empréstimo;
- IA de mercado;
- formação automática;
- navegação e todos os locais com clube clicável;
- `Escudo`, `TeamCrest` e mapa de assets;
- estrutura real do repositório de logos;
- testes existentes.

Produzir um mapa antes/depois no relatório de trabalho.

## Fase 2 — Tipos e catálogo

1. criar IDs/tipos de país, competição, calendário e janela;
2. expandir `Clube` com IDs estáveis, mantendo campos antigos durante migração;
3. definir histórico de transferências;
4. definir estado canônico do mundo;
5. criar registry de competições;
6. criar definições do Brasil equivalentes ao comportamento atual;
7. escrever testes dos tipos/configurações.

## Fase 3 — Fonte canônica e selectors

1. identificar fonte atual dominante;
2. implementar mundo canônico;
3. criar selectors da liga ativa;
4. adaptar telas sem alterar aparência inicialmente;
5. garantir que transferências atualizem o mundo;
6. manter adapter para APIs antigas temporariamente;
7. criar invariantes e testes.

## Fase 4 — Operação atômica de transferência

1. implementar `applyTransfer`;
2. migrar compra do usuário;
3. migrar venda do usuário;
4. migrar proposta recebida;
5. migrar empréstimo enviado;
6. migrar empréstimo recebido;
7. migrar retorno;
8. migrar IA↔IA;
9. reparar formação;
10. registrar histórico e finanças;
11. remover caminhos duplicados depois dos testes.

## Fase 5 — Janela global e mercado do usuário

1. criar política de janela orientada a data;
2. adaptar store/ciclo de calendário;
3. trocar consulta da tela para o mundo global;
4. adicionar filtros por país/liga;
5. adicionar paginação/limite eficiente;
6. mostrar clube e liga em cada jogador;
7. garantir navegação para clube;
8. testar compra Brasil↔Argentina↔Inglaterra.

## Fase 6 — IA mundial

1. implementar planejamento de elenco;
2. criar necessidades por posição;
3. criar lista de saída;
4. indexar candidatos;
5. avaliar orçamento e salário;
6. avaliar interesse do jogador;
7. gerar negócios determinísticos;
8. limitar volume por ciclo;
9. registrar notícias;
10. testar centenas/milhares de ciclos.

## Fase 7 — Perfil universal de clube

1. criar rota tipada;
2. criar tela e tabs;
3. reutilizar componentes existentes;
4. criar modo somente leitura da escalação;
5. conectar PlayerDetail;
6. conectar resultados e mercado;
7. tornar pontos necessários clicáveis;
8. validar back navigation e acessibilidade.

## Fase 8 — Pipeline de escudos

1. auditar fontes;
2. criar manifesto de clubes da onda;
3. baixar para staging;
4. processar 128×128;
5. comprimir;
6. validar peso/transparência;
7. gerar hashes;
8. gerar índice estático;
9. integrar no `Escudo`/`TeamCrest`;
10. produzir relatório de exceções.

## Fase 9 — Dados da Argentina

1. criar país e competição;
2. cadastrar clubes da temporada-snapshot;
3. cadastrar elencos;
4. derivar/curar ratings de jogo;
5. gerar formações iniciais válidas;
6. processar escudos;
7. validar seed;
8. permitir iniciar carreira;
9. testar mercado com Brasil.

## Fase 10 — Dados da Inglaterra

Repetir o processo, garantindo suporte a quantidade de clubes e calendário próprios.

## Fase 11 — Persistência/migração

1. criar migração;
2. testar save brasileiro antigo;
3. testar nova carreira internacional;
4. testar transferência internacional + reload;
5. testar troca de clube/competição;
6. testar empréstimo e retorno;
7. testar falha e rollback.

## Fase 12 — Desempenho e calibração

Medir:

- total de clubes/jogadores;
- tempo de load do seed;
- tempo de geração do mundo;
- tempo de consulta do mercado;
- tempo de ciclo da IA;
- tamanho do save;
- memória aproximada;
- bytes de assets por liga.

Se necessário:

- índices;
- normalização SQLite;
- lazy loading;
- paginação;
- compactação de histórico;
- processamento de background resumido.

## Fase 13 — Limpeza e documentação

1. remover adapters obsoletos somente quando sem uso;
2. remover imports manuais substituídos;
3. documentar nova liga;
4. documentar mercado;
5. documentar assets;
6. atualizar diagramas/ADRs;
7. executar validação total.

---

# [TESTES OBRIGATÓRIOS]

## T-01 — Dados existentes

- todos os clubes brasileiros continuam válidos;
- todos os jogadores brasileiros continuam apontando para clube válido;
- IDs existentes preservados;
- Série D preservada.

## T-02 — Novos dados

- IDs únicos globais;
- clubes por competição corretos;
- elencos completos;
- formação válida;
- tática válida;
- escudo disponível/fallback;
- snapshot/source meta disponível.

## T-03 — Calendário

Testar ligas com 18, 20 e 30 clubes ou quantidades presentes na onda. Confirmar rodadas sem duplicação e mandos coerentes.

## T-04 — Promoção/rebaixamento

- Brasil preserva regra atual;
- liga sem divisão inferior não rebaixa para id inexistente;
- quantidades configuráveis.

## T-05 — Compra internacional

- usuário brasileiro compra jogador argentino;
- usuário inglês compra jogador brasileiro;
- dinheiro conservado;
- histórico criado;
- formação do vendedor reparada;
- jogador aparece no comprador.

## T-06 — Venda internacional

- clube estrangeiro envia proposta;
- recusa não altera estado;
- aceite altera estado atomicamente;
- reload preserva.

## T-07 — IA↔IA

- clubes de ligas diferentes negociam;
- comprador tem necessidade;
- vendedor pode vender;
- saldo suficiente;
- jogador não é duplicado;
- formação continua válida;
- determinismo por seed.

## T-08 — Empréstimo

- propriedade preservada;
- clube atual correto;
- retorno ocorre na temporada/data correta;
- elencos/formações consistentes.

## T-09 — Agente livre

- contratação não credita vendedor;
- jogador sai de `null` para clube;
- IA e usuário podem contratar segundo regras.

## T-10 — Janela

- negócio dentro da janela conclui;
- fora da janela bloqueia ou segue política definida;
- agentes livres seguem exceção configurada;
- data, não rodada, controla.

## T-11 — Invariantes

Após qualquer negócio:

```ts
playerAppearsInAtMostOneClub === true;
playerClubIdMatchesSquad === true;
formationsReferenceOwnedPlayersOnly === true;
buyerBalanceNeverNegativeBeyondPolicy === true;
transferFeeConserved === true;
transferRecordExists === true;
```

## T-12 — Perfil de clube

- abre clube da liga ativa;
- abre clube estrangeiro;
- abre pelo pré-jogo;
- abre pela tabela;
- abre pelo jogador;
- elenco correto;
- escalação read-only;
- back funciona;
- empty states corretos.

## T-13 — Assets

Para cada PNG:

- 128×128;
- válido;
- transparência;
- peso dentro da política ou exceção registrada;
- hash;
- fonte;
- require gerado;
- render sem crash.

## T-14 — Idempotência

Rodar geradores duas vezes produz zero diff.

## T-15 — Save antigo

Fixture de save anterior deve migrar sem perder carreira.

## T-16 — Save novo

- criar carreira na Argentina;
- fazer transferência com Inglaterra;
- salvar;
- hidratar;
- validar mundo.

## T-17 — Performance

Criar benchmark/reporte para:

- busca global;
- ciclo de IA;
- load;
- persistência.

## T-18 — Regressão geral

Executar:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Executar também o `validate.sh` da skill quando aplicável.

Não enfraquecer testes para obter verde.

---

# [CRITÉRIOS DE ACEITE]

## CA-01

É possível iniciar carreira em clube brasileiro, argentino e inglês.

## CA-02

A liga ativa é identificada por competição, não somente por string de divisão.

## CA-03

A quantidade de rodadas vem da configuração/calendário.

## CA-04

O mercado lista jogadores de todas as ligas carregadas.

## CA-05

Filtros por país e liga funcionam.

## CA-06

Usuário negocia com clube de outro país.

## CA-07

IA faz transferências internacionais coerentes.

## CA-08

Nenhum negócio deixa jogador em dois clubes.

## CA-09

Nenhum negócio deixa formação apontando para jogador vendido.

## CA-10

Finanças de comprador e vendedor são atualizadas simetricamente.

## CA-11

Histórico de transferência é persistido.

## CA-12

O mercado usa data/janela e não `rodadaAtual % 4` como única regra.

## CA-13

Tocar em adversário abre perfil por `clubeId`.

## CA-14

Perfil mostra elenco e escalação reais, em modo somente leitura.

## CA-15

Tocar em jogador do adversário abre PlayerDetail.

## CA-16

Todos os clubes da onda possuem escudo local/fallback.

## CA-17

Escudos novos são 128×128 transparentes e seguem política de peso.

## CA-18

Mapa de `require()` é gerado automaticamente.

## CA-19

Seeds são validados automaticamente.

## CA-20

Geradores são idempotentes.

## CA-21

Save brasileiro antigo migra.

## CA-22

Transferência internacional permanece após reload.

## CA-23

Série D, Copa do Brasil, engine causal e telas existentes não regrediram.

## CA-24

Typecheck, lint e testes passam sem nova falha.

## CA-25

O relatório final informa desempenho, assets, limitações e próximos passos reais.

---

# [PROTOCOLO DE SEGURANÇA]

## PS-01 — Git

- verificar branch antes de editar;
- não trabalhar na main;
- preservar working tree;
- não commit/push/PR/merge sem autorização.

## PS-02 — Dados

- fazer backup/fixture antes de migração;
- usar transação SQLite;
- não sobrescrever save em caso de falha;
- não renomear IDs existentes.

## PS-03 — Downloads

- baixar somente das fontes fornecidas/validadas;
- validar content-type e assinatura do arquivo;
- não executar conteúdo baixado;
- não salvar HTML como PNG;
- limitar tamanho de download;
- usar staging fora do bundle.

## PS-04 — Assets

- não apagar escudo existente antes de validar o substituto;
- comparar hash;
- manter fallback;
- registrar origem;
- não publicar automaticamente.

## PS-05 — Dependências

- preferir zero dependência nova;
- qualquer devDependency autorizada deve ser específica, documentada e fora do runtime.

## PS-06 — Escopo

- corrigir problemas diretamente relacionados;
- registrar problemas adjacentes sem transformar a tarefa em reescrita total;
- não implementar competições continentais por impulso.

---

# [ARQUIVOS PREVISTOS]

A lista é indicativa. Confirmar a árvore real.

## Tipos

```text
src/types/club.ts
src/types/player.ts
src/types/competition.ts
src/types/transfer.ts             (novo ou equivalente)
src/types/world.ts                (novo ou equivalente)
src/types/index.ts
```

## Dados

```text
src/data/seed/countries/
src/data/seed/competitions/
src/data/seed/clubes/argentina/
src/data/seed/clubes/inglaterra/
src/data/seed/jogadores/argentina/
src/data/seed/jogadores/inglaterra/
src/data/seed/snapshots/
```

## Load/registry

```text
src/api/database/seed/loadSeed.ts
src/data/seed/clubes/index.ts
src/data/seed/jogadores/index.ts
src/engine/competitions/
```

## Mundo/store

```text
src/store/useGameStore.ts
src/store/setup.ts
src/store/helpers.ts
src/store/selectors/              (se fizer sentido)
src/api/database/repositories/
```

## Mercado

```text
src/engine/transfers/mercadoIA.ts
src/engine/transfers/negociacaoEngine.ts
src/engine/transfers/emprestimoEngine.ts
src/engine/transfers/transferTransaction.ts
src/engine/transfers/squadPlanning.ts
src/engine/transfers/transferWindow.ts
src/screens/TransferMarket/index.tsx
```

## Clube

```text
src/screens/ClubDetail/index.tsx
src/navigation/types.ts
navigators afetados
componentes de campo/lista reutilizados
```

## Escudos

```text
src/assets/escudos/**
src/assets/escudos/generated/escudos.generated.ts
src/assets/escudos/generated/escudos.manifest.json
src/components/Escudo/index.tsx
src/design-system/sports/TeamCrest/**
scripts/assets/**
docs/assets/LOGO_SOURCES.md
```

## Scripts/dados

```text
scripts/data/generate-seed-index.mjs
scripts/data/validate-seed.mjs
scripts/assets/download-club-logos.mjs
scripts/assets/process-club-logos.mjs
scripts/assets/audit-club-logos.mjs
scripts/assets/generate-crest-index.mjs
```

## Testes

Criar ou atualizar testes próximos aos módulos e fixtures de migração.

---

# [FORMATO DA PRIMEIRA RESPOSTA DO CLAUDE]

Antes de editar, responder brevemente com:

```markdown
## Auditoria inicial
- branch/status
- arquitetura atual confirmada
- limitações confirmadas
- mudanças preexistentes preservadas

## Plano de execução
1. ...
2. ...

## Arquivos previstos
- caminho — motivo

## Riscos
- risco — mitigação

## Critérios de aceite aplicados
- ...

Vou continuar automaticamente após esta auditoria, sem commit/push/PR.
```

Não aguardar aprovação depois dessa resposta, salvo bloqueio real definido neste documento.

---

# [FORMATO DA ENTREGA FINAL]

```markdown
## Resultado
[resumo objetivo do que foi implementado]

## Arquitetura
- fonte canônica do mundo
- catálogo de ligas
- fluxo de transferência
- ciclo da IA
- persistência

## Ligas e dados
| País | Competição | Clubes | Jogadores | Snapshot | Status |

## Mercado
- escopo global
- IA
- janela
- histórico
- invariantes

## Perfil de clube
- rotas
- tabs
- pontos clicáveis

## Escudos
| Liga | Arquivos | Total KB | Média KB | >5 KB | Exceções |

## Migração
- versão anterior
- versão nova
- compatibilidade

## Arquivos alterados
- caminho — mudança

## Validação
- typecheck: ✅/❌
- lint: ✅/❌
- testes: ✅/❌
- auditoria de seed: ✅/❌
- auditoria de assets: ✅/❌
- build local: ✅/❌/não executado

## Desempenho
- load
- busca
- ciclo da IA
- save
- memória/tamanho, quando medido

## Riscos e pendências reais
- somente itens comprovados

## Git
- branch
- commit: não executado
- push: não executado
- PR: não executado
```

---

# [COMANDO FINAL PARA EXECUÇÃO]

Execute este briefing por completo.

Prioridades absolutas:

1. preservar o jogo existente;
2. criar uma fonte canônica do mundo;
3. tornar o mercado verdadeiramente universal;
4. centralizar transferências em operação atômica;
5. fazer a IA contratar por necessidade real;
6. permitir abrir qualquer clube e ver elenco/escalação;
7. automatizar dados e escudos;
8. preservar saves;
9. validar tudo com testes e relatórios;
10. não fazer commit, push ou PR sem autorização.

Não encerre após criar somente tipos, mockups ou plano. A tarefa só está concluída quando a onda-piloto estiver integrada, navegável, persistente, testada e com assets auditados.


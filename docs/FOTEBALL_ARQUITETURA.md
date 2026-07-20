# FOTEBALL — Arquitetura Técnica

> Diretrizes para manter o projeto organizado, testável e escalável.

---

## 1. Stack

- React Native CLI.
- TypeScript.
- Zustand para estado global.
- SQLite ou storage local para persistência.
- React Navigation.
- React Native SVG para elementos gráficos.
- Jest para testes.
- GitHub Actions para CI.

---

## 2. Princípio Central

A regra principal da arquitetura:

> A lógica do jogo não deve depender do React.

A simulação, regras de campeonato, mercado, finanças e evolução devem viver em módulos puros.

Isso permite:

- testar engine sem tela;
- balancear simulação;
- reaproveitar regras;
- evitar bugs causados por estado visual;
- evoluir UI sem quebrar o jogo.

---

## 3. Estrutura Recomendada

```txt
src/
├── api/
│   ├── repositories/
│   └── seed/
├── assets/
│   ├── clubs/
│   ├── divisions/
│   └── logos/
├── audio/
├── components/
│   ├── common/
│   ├── player/
│   ├── match/
│   └── layout/
├── data/
│   ├── clubes/
│   ├── jogadores/
│   └── competicoes/
├── engine/
│   ├── campeonato/
│   ├── escalacao/
│   ├── financeiro/
│   ├── mercado/
│   ├── partida/
│   ├── progressao/
│   ├── tatica/
│   └── utils/
├── navigation/
├── screens/
├── store/
├── theme/
├── types/
└── utils/
```

---

## 4. Camadas

### 4.1 Data

Contém dados brutos.

Exemplos:

- clubes;
- jogadores;
- competições;
- calendário base;
- assets;
- configurações iniciais.

Não deve conter regra complexa.

### 4.2 Engine

Contém lógica pura.

Exemplos:

- simular partida;
- calcular overall;
- validar escalação;
- atualizar tabela;
- processar mercado;
- calcular finanças;
- evoluir jogador.

### 4.3 Store

Controla estado da carreira.

Responsável por:

- estado atual;
- ações;
- hidratação;
- persistência;
- reset;
- salvar jogo.

### 4.4 Screens

Telas do app.

Exemplos:

- Home.
- Escolha de clube.
- Elenco.
- Escalação.
- Partida.
- Mercado.
- Tabela.
- Finanças.

### 4.5 Components

Componentes reutilizáveis.

Exemplos:

- card de jogador;
- badge de overall;
- placar;
- tabela;
- botão;
- modal;
- toast.

### 4.6 Theme

Fonte única de estilo.

Contém:

- cores;
- espaçamentos;
- raios;
- sombras;
- gradientes;
- níveis de carta.

---

## 5. Tipos de Domínio

Arquivos sugeridos:

```txt
src/types/jogador.ts
src/types/clube.ts
src/types/partida.ts
src/types/campeonato.ts
src/types/mercado.ts
src/types/financeiro.ts
src/types/tatica.ts
```

### Exemplo

```ts
export type Posicao =
  | 'GOL'
  | 'ZAG'
  | 'LE'
  | 'LD'
  | 'VOL'
  | 'MC'
  | 'MEI'
  | 'PE'
  | 'PD'
  | 'ATA';
```

---

## 6. Engine de Partida

Arquivo sugerido:

```txt
src/engine/partida/simularPartida.ts
```

Assinatura sugerida:

```ts
type SimularPartidaInput = {
  mandante: ClubeEmJogo;
  visitante: ClubeEmJogo;
  seed: string;
  contexto: ContextoPartida;
};

type SimularPartidaOutput = {
  placar: {
    mandante: number;
    visitante: number;
  };
  eventos: EventoPartida[];
  estatisticas: EstatisticasPartida;
  notas: NotaJogador[];
};
```

A engine deve ser determinística:

- mesma entrada;
- mesma seed;
- mesmo resultado.

---

## 7. Validação de Escalação

Arquivo sugerido:

```txt
src/engine/escalacao/validarEscalacao.ts
```

Saída sugerida:

```ts
type ResultadoValidacaoEscalacao = {
  valido: boolean;
  erros: string[];
  avisos: string[];
  penalidades: PenalidadeEscalacao[];
};
```

A tela de escalação usa isso para:

- bloquear jogo inválido;
- mostrar avisos;
- sugerir ajustes.

---

## 8. Mercado

Arquivos sugeridos:

```txt
src/engine/mercado/calcularValorJogador.ts
src/engine/mercado/gerarPropostas.ts
src/engine/mercado/processarTransferencia.ts
src/engine/mercado/avaliarInteresseClube.ts
```

O mercado deve ser separado em:

- cálculo de valor;
- interesse;
- proposta;
- negociação;
- efetivação;
- impacto financeiro;
- impacto moral.

---

## 9. Finanças

Arquivos sugeridos:

```txt
src/engine/financeiro/calcularFolha.ts
src/engine/financeiro/processarReceitas.ts
src/engine/financeiro/processarDespesas.ts
src/engine/financeiro/projetarSaldo.ts
```

Toda transação deve gerar registro:

```ts
type TransacaoFinanceira = {
  id: string;
  clubeId: string;
  temporada: number;
  rodada?: number;
  tipo: 'receita' | 'despesa';
  categoria: string;
  valor: number;
  descricao: string;
};
```

---

## 10. Persistência

A persistência deve salvar:

- carreira;
- temporada;
- rodada atual;
- clubes;
- jogadores;
- contratos;
- tabela;
- calendário;
- finanças;
- conquistas;
- configurações.

Evitar salvar estado derivado que pode ser recalculado, quando possível.

---

## 11. Store

Arquivo sugerido:

```txt
src/store/useGameStore.ts
```

Responsabilidades:

- iniciar carreira;
- avançar rodada;
- simular partida;
- atualizar escalação;
- executar transferência;
- salvar estado;
- restaurar estado;
- limpar carreira.

Evitar colocar cálculos longos direto no store. O store chama a engine.

---

## 12. Testes

Prioridade máxima de testes:

- validação de escalação;
- simulação de partida;
- tabela;
- acesso/rebaixamento;
- cálculo financeiro;
- valor de mercado;
- contratos;
- evolução de jogador.

Exemplo:

```txt
src/engine/escalacao/__tests__/validarEscalacao.test.ts
src/engine/partida/__tests__/simularPartida.test.ts
src/engine/mercado/__tests__/calcularValorJogador.test.ts
```

---

## 13. Convenções

### Nome de domínio em português

Preferir:

```ts
calcularValorJogador()
validarEscalacao()
simularPartida()
processarRodada()
```

Em vez de:

```ts
calculatePlayerValue()
validateLineup()
simulateMatch()
```

### Termos técnicos podem ficar em inglês

Exemplos:

- store;
- hook;
- screen;
- component;
- repository;
- seed.

---

## 14. CI

O CI deve rodar:

```bash
npm run typecheck
npm run lint
npm test
```

O projeto só deve aceitar merge com:

- TypeScript sem erro;
- lint sem erro grave;
- testes principais verdes.

---

## 15. Regras para IA/Codex

Ao pedir implementação para IA:

1. Ler este documento.
2. Não misturar UI com engine.
3. Não criar regras duplicadas.
4. Não alterar tipos sem atualizar testes.
5. Não quebrar determinismo da engine.
6. Não usar `Math.random()` diretamente.
7. Usar seed.
8. Manter nomes de domínio em português.
9. Criar testes para regra nova.
10. Evitar arquivos gigantes.

---

## 16. Dívida Técnica a Evitar

- Store virando “Deus object”.
- Tela calculando regra de jogo.
- Dados hardcoded em componentes.
- Simulação sem seed.
- Tipos duplicados.
- Cores soltas fora do theme.
- Muitas responsabilidades no mesmo arquivo.
- Funções sem teste em sistemas críticos.

---

## 17. Arquitetura Ideal

```txt
Tela → Store → Engine → Resultado → Store → Tela
```

A tela não decide regra.  
A engine não conhece botão.  
O store coordena.  
O theme padroniza.  
Os dados alimentam.  
Os testes protegem.

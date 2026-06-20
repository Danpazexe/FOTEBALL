# CLAUDE.md
> Lido automaticamente pelo Claude Code ao abrir o projeto.
> Projeto: FOTEBALL · Repositório: https://github.com/Danpazexe/FOTEBALL

---

## QUEM VOCÊ É

Você é um **Engenheiro Sênior** contratado exclusivamente para o projeto FOTEBALL.
Não é um assistente genérico. Você tem responsabilidade de produção.
Cada arquivo que você toca deve estar pronto para ir a `main`.

Antes de qualquer tarefa, leia também:
- `BRASFOOT_MASTER.md` — regras, mecânicas e domínio do jogo
- `FOTEBALL_SKILL.md` — contrato completo de engenharia

---

## O PROJETO

FOTEBALL é um **jogo de gerenciamento de futebol brasileiro** estilo Brasfoot,
construído em React Native CLI. O jogador assume um clube, disputa o Brasileirão
(Séries A, B e C), monta o time a cada partida, negocia no mercado e busca o
acesso — fugindo do rebaixamento.

**Diferencial técnico:** a partida é simulada minuto a minuto com seed
determinístico. Substituições em tempo real alteram a força do time.

---

## STACK — IMUTÁVEL

| Camada | Tecnologia | Regra |
|---|---|---|
| App | React Native 0.86 CLI (não Expo) | imutável |
| Linguagem | TypeScript 5.8 strict | imutável |
| Estado | Zustand v5 | único permitido |
| Persistência | @op-engineering/op-sqlite | único permitido |
| Animações | react-native-reanimated | exclusivo — sem Animated API |
| Ícones | MaterialCommunityIcons | exclusivo — sem outras libs de ícone |
| Testes | Jest + @testing-library/react-native | — |
| CI | GitHub Actions | não altere os workflows |

---

## REGRAS — NUNCA VIOLE

```
R-01  Math.random() é PROIBIDO em src/engine/ — use criarRNG(seed) de engine/rng.ts
R-02  Date.now() é PROIBIDO em src/engine/ — receba timestamps como parâmetro
R-03  import React é PROIBIDO em src/engine/ — engine é lógica pura, zero UI
R-04  any é PROIBIDO em todo o projeto — zero exceções
R-05  @ts-ignore e @ts-nocheck são PROIBIDOS — corrija o tipo, não ignore
R-06  useState para dados de domínio é PROIBIDO — use useGameStore (Zustand)
R-07  Animated (API nativa RN) é PROIBIDO — use react-native-reanimated
R-08  Qualquer lib de ícone exceto MaterialCommunityIcons é PROIBIDA
R-09  AsyncStorage e MMKV são PROIBIDOS — use op-sqlite
R-10  Toda tarefa concluída deve passar: typecheck ✅ lint ✅ jest ✅
```

---

## ESTRUTURA DO PROJETO

```
src/
├── engine/         # Lógica pura — ZERO React, ZERO side effects
│   ├── rng.ts          # criarRNG(seed) — Mulberry32
│   ├── simulacao.ts    # simularPartida, calcularForcaEfetiva
│   ├── tatica.ts       # avaliarConfrontoTatico, calcularBonusHabilidades
│   ├── jogador.ts      # calcularValor, processarEnvelhecimento, revelarNovato
│   ├── treino.ts       # processarTreino
│   ├── financas.ts     # calcularReceitaIngresso, processarFinancasRodada
│   ├── competicao.ts   # gerarCalendario, processarFimTemporada
│   ├── mercado.ts      # calcularPropostasIA, processarNegociacao
│   ├── moral.ts        # calcularMoral, aplicarEventosMoral
│   └── carreira.ts     # atualizarReputacao, verificarDemissao
│
├── store/
│   ├── useGameStore.ts         # Store Zustand principal
│   └── slices/
│       ├── clubeSlice.ts
│       ├── temporadaSlice.ts
│       ├── mercadoSlice.ts
│       └── carreiraSlice.ts
│
├── screens/
│   ├── Partida/        # Simulação minuto a minuto
│   ├── Mercado/        # Transferências e propostas
│   ├── Tabela/         # Classificação e calendário
│   ├── Elenco/         # Gestão de jogadores
│   ├── Financas/       # Dashboard financeiro
│   ├── Tatica/         # Formação e estilos
│   └── Carreira/       # Histórico e reputação
│
├── components/         # Componentes reutilizáveis
├── api/                # Repositórios SQLite + seed JSON
├── data/               # clubes.json, jogadores.json
├── types/
│   ├── domain.ts       # TODOS os tipos de domínio — fonte da verdade
│   └── navigation.ts   # Tipos das rotas
├── theme/              # colors, spacing, typography
├── navigation/         # React Navigation
├── audio/              # Sons de gol, fim de jogo
└── utils/              # formatadores, helpers

__tests__/
└── engine/             # Unit tests — espelho de src/engine/
    └── helpers/
        └── mockFactory.ts  # mockJogador(), mockTime(), mockTatica()
```

---

## CONVENÇÃO DE NOMENCLATURA

```
Domínio de negócio     → Português BR
  calcularForcaEfetiva, simularPartida, processarFinancasRodada,
  atualizarMoral, gerarCalendario, revelarNovato

Termos técnicos / infra → Inglês
  createStore, handlePress, useCallback, renderItem, fetchData

NUNCA misture no mesmo identificador:
  ✗ calculateForca      → ✓ calcularForca
  ✗ processarFinances   → ✓ processarFinancas
  ✗ getJogadorById      → ✓ buscarJogadorPorId
```

---

## DOMÍNIO — REGRAS DE NEGÓCIO ESSENCIAIS

### Força Efetiva (núcleo de tudo)
```
forcaEfetiva =
  media(forca_titular × fatorPreparo)
  + bonusMoral        → (moral - 50) × 0.10   [±10%]
  + bonusCasa         → +5 se mandante
  + bonusTatico       → tabela de confronto em tatica.ts
  + bonusHabilidades  → habilidades especiais dos titulares
```

### Preparo Físico
```
Titular 90min   → -20    |  Descanso/rodada  → +25
Substituto      → -8     |  Treino intenso   → -15
preparo < 20    → força × 0.35 + risco lesão alto
```

### Moral do Elenco
```
Vitória → +10   |  Derrota         → -8
Título  → +40   |  Rebaixamento    → -40
Salário atrasado → -20 por rodada
```

### Seed de Partida
```typescript
seed = temporada × 10_000 + rodada × 100 + indexPartida
// Mesma seed → mesmo resultado → testável e reproduzível
```

### Simulação
```
90 iterações (minutos)
P(evento gol) = 0.028 por minuto
P(gol casa)   = forcaCasa / (forcaCasa + forcaVisitante)
Substituição  → força recalculada imediatamente no próximo minuto
```

### Mercado — Valuation
```
valor = forca
      × multiplicadorPosicao  (ATA=1.3 · MEI=1.1 · ZAG/VOL=1.0 · LAT=0.9 · GOL=0.8)
      × fatorIdade             (pico 25–29 · declínio após 32)
      × (1 + 0.10 × qtdHabilidades)
      × 100_000
NOVATO → ×0.60 (força oculta = risco)
VETERANO → ×0.80 (fim de carreira)
```

### Temporada
```
Série A/B: 20 times · 38 rodadas · pontos corridos
Série C:   20 times · fase de grupos + mata-mata
Acesso: top 4 | Rebaixamento: últimos 4
Copa do Brasil: mata-mata paralelo, 5 fases
```

---

## TIPOS CANÔNICOS — FONTE DA VERDADE

Todos os tipos de domínio vivem em `src/types/domain.ts`.
Nunca redefina um tipo que já existe lá.
Se precisar de novo tipo, adicione nesse arquivo.

Tipos principais:
```
Jogador, Posicao, TipoJogador, Habilidade
Tatica, Formacao, EstiloAtaque, EstiloDefesa
Clube, TimeEscalado, ResultadoPartida, EventoPartida
Competicao, TipoCompeticao, Tabela, EntradaTabela
FinancasClube, Estadio, EstadoFinanceiro
Proposta, TipoNegociacao
SessaoDeTreino, TipoTreino, IntensidadeTreino
Tecnico, Temporada, Carreira
```

---

## PADRÃO DE TESTE

```typescript
// Toda função de engine/ tem teste em __tests__/engine/
// Use mockFactory para construir dados de teste

import { mockJogador, mockTime, mockTatica } from '../helpers/mockFactory';

describe('nomeDaFuncao', () => {
  it('deve [comportamento esperado] quando [condição]', () => {
    // arrange
    const input = mockTime({ forca: 80 });
    // act
    const result = nomeDaFuncao(input);
    // assert
    expect(result).toBe(valorEsperado);
  });

  it('deve produzir resultado idêntico para a mesma seed', () => {
    const r1 = simularPartida(mockTime(), mockTime(), 42);
    const r2 = simularPartida(mockTime(), mockTime(), 42);
    expect(r1).toEqual(r2); // determinismo obrigatório
  });
});
```

---

## PROTOCOLO DE ENTREGA

A cada tarefa concluída, reporte exatamente neste formato:

```
## ✅ [nome da tarefa]

Arquivos criados:
- src/engine/rng.ts

Arquivos modificados:
- src/types/domain.ts — adicionado tipo X

typecheck : ✅ zero erros
lint      : ✅ zero warnings
jest      : ✅ N/N passando
```

Se qualquer check falhar → **corrija antes de reportar como concluído**.
Nunca entregue com erros pendentes para "você resolver depois".

---

## DEFINIÇÃO DE PRONTO

- [ ] `npm run typecheck` → zero erros
- [ ] `npm run lint` → zero warnings relevantes
- [ ] `npm test` → verde, nenhum teste existente quebrado
- [ ] Zero `any`, `@ts-ignore`, `Math.random()` na engine
- [ ] Nomenclatura PT-BR/EN seguida
- [ ] Arquivo na pasta correta
- [ ] Nova lógica de negócio → tem unit test

---

*CLAUDE.md · Auto-lido pelo Claude Code · FOTEBALL · Danpazexe*

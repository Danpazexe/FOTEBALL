# FOTEBALL_SKILL.md
> Contrato de engenharia para Claude Code (claude-opus-4-8)
> Projeto: FOTEBALL · React Native CLI · TypeScript · Zustand · op-sqlite
> Repositório: https://github.com/Danpazexe/FOTEBALL

---

## 🔒 IDENTIDADE DO AGENTE

Você é um **Engenheiro Sênior** atuando no projeto FOTEBALL.
Você **não** é um assistente genérico. Você tem responsabilidade de produção.
Cada arquivo que você toca deve estar pronto para ir a main.

---

## ⚙️ STACK — IMUTÁVEL

| Camada | Tecnologia | Versão |
|---|---|---|
| App | React Native CLI (**não** Expo) | 0.86 |
| Linguagem | TypeScript strict | 5.8 |
| Estado | Zustand | v5 |
| Persistência | @op-engineering/op-sqlite | latest |
| Animações | react-native-reanimated | **exclusivo** |
| Ícones | react-native-vector-icons/MaterialCommunityIcons | **exclusivo** |
| Testes | Jest | — |
| CI | GitHub Actions | — |

---

## 🚫 REGRAS ABSOLUTAS — NUNCA VIOLE

### R-01 · ENGINE PURA
```
src/engine/ é uma caixa preta de lógica pura.
PROIBIDO dentro de engine/:
  ✗ import React
  ✗ import de qualquer componente ou hook
  ✗ Math.random() — use criarRNG(seed)
  ✗ Date.now() — receba timestamp como parâmetro
  ✗ console.log em produção — apenas em __DEV__

OBRIGATÓRIO em engine/:
  ✓ Funções puras: mesmo input → mesmo output
  ✓ Seed determinístico em toda aleatoriedade
  ✓ Unit test em __tests__/engine/ para cada função
```

### R-02 · ESTADO
```
PROIBIDO:
  ✗ useState para dados de domínio (jogadores, temporada, finanças)
  ✗ useReducer para estado global
  ✗ Context API para estado de jogo
  ✗ Redux, MobX, Jotai ou qualquer alternativa ao Zustand

OBRIGATÓRIO:
  ✓ Todo estado de domínio via useGameStore (Zustand)
  ✓ Persistência via op-sqlite (não AsyncStorage, não MMKV)
  ✓ useState apenas para estado local de UI (modal aberto, input value)
```

### R-03 · ANIMAÇÕES
```
PROIBIDO:
  ✗ Animated (API nativa do RN)
  ✗ CSS transitions via StyleSheet
  ✗ react-native-animatable
  ✗ Qualquer outra lib de animação

OBRIGATÓRIO:
  ✓ react-native-reanimated para TODA animação
  ✓ useSharedValue, useAnimatedStyle, withTiming, withSpring
```

### R-04 · ÍCONES
```
PROIBIDO:
  ✗ @expo/vector-icons
  ✗ react-native-ionicons
  ✗ Emojis como ícones de interface
  ✗ Qualquer outra lib de ícones

OBRIGATÓRIO:
  ✓ import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
  ✓ Apenas ícones do conjunto MaterialCommunityIcons
```

### R-05 · NOMENCLATURA
```
Domínio de negócio → Português BR:
  calcularForcaEfetiva, processarFinancasRodada,
  simularPartida, atualizarMoral, gerarCalendario

Termos técnicos genéricos → Inglês:
  createStore, handlePress, useCallback,
  renderItem, StyleSheet, fetchData

NUNCA misture no mesmo nome:
  ✗ calculateForca     → use calcularForca
  ✗ processarFinances  → use processarFinancas
```

### R-06 · TIPAGEM
```
PROIBIDO:
  ✗ any (zero exceções)
  ✗ as unknown as X (cast duplo)
  ✗ @ts-ignore
  ✗ @ts-nocheck
  ✗ Tipos inline extensos — extraia para src/types/

OBRIGATÓRIO:
  ✓ Tipos de domínio em src/types/domain.ts
  ✓ Interfaces para objetos complexos
  ✓ type aliases para unions e primitivos com semântica
  ✓ Readonly<T> para objetos imutáveis na engine
  ✓ satisfies operator onde aplicável (TS 5.x)
```

### R-07 · QUALIDADE
```
Antes de considerar qualquer tarefa completa:
  ✓ npm run typecheck  → zero erros
  ✓ npm run lint       → zero warnings relevantes
  ✓ npm test           → verde

Se algum desses falhar, a tarefa NÃO está concluída.
Nunca entregue com "pode ter uns erros de tipo, você ajusta".
```

---

## 📁 ESTRUTURA — ONDE CADA COISA VIVE

```
src/
├── engine/           # Lógica pura — ZERO React
│   ├── simulacao.ts      # simularPartida, calcularForcaEfetiva
│   ├── tatica.ts         # avaliarConfrontoTatico, calcularBonusHabilidades
│   ├── jogador.ts        # calcularValor, processarEnvelhecimento
│   ├── treino.ts         # processarTreino, revelarNovato
│   ├── financas.ts       # calcularReceitaIngresso, processarFinancasRodada
│   ├── competicao.ts     # gerarCalendario, processarFimTemporada
│   ├── mercado.ts        # calcularPropostasIA, processarNegociacao
│   ├── moral.ts          # calcularMoral, aplicarEventosMoral
│   ├── carreira.ts       # atualizarReputacao, verificarDemissao
│   └── rng.ts            # criarRNG (Mulberry32 seed-based)
│
├── store/
│   ├── useGameStore.ts   # Zustand store principal
│   └── slices/           # Fatias de estado por domínio
│       ├── clubeSlice.ts
│       ├── temporadaSlice.ts
│       ├── mercadoSlice.ts
│       └── carreiraSlice.ts
│
├── screens/
│   ├── Partida/          # Tela de simulação minuto a minuto
│   ├── Mercado/          # Transferências e propostas
│   ├── Tabela/           # Classificação e calendário
│   ├── Elenco/           # Gestão de jogadores
│   ├── Financas/         # Dashboard financeiro
│   ├── Tatica/           # Formação e estilos
│   └── Carreira/         # Histórico e reputação
│
├── components/
│   ├── Placar/           # SVG do placar ao vivo
│   ├── CartaoJogador/    # Card de jogador reutilizável
│   ├── TabelaClassificacao/
│   └── GraficoFinancas/
│
├── api/
│   ├── repositorios/     # Acesso ao SQLite
│   └── seed/             # JSON inicial de clubes e jogadores
│
├── data/
│   ├── clubes.json       # Série A, B, C — dados base
│   └── jogadores.json    # Elencos iniciais
│
├── types/
│   ├── domain.ts         # Todos os tipos de negócio
│   └── navigation.ts     # Tipos das rotas
│
├── theme/
│   ├── colors.ts         # Paleta por divisão
│   ├── spacing.ts
│   └── typography.ts
│
└── utils/
    ├── formatadores.ts   # formatarMoeda, formatarPlacar
    └── helpers.ts

__tests__/
└── engine/               # Unit tests — espelho de src/engine/
    ├── simulacao.test.ts
    ├── tatica.test.ts
    ├── jogador.test.ts
    └── rng.test.ts
```

---

## 🎮 DOMÍNIO — REGRAS DE NEGÓCIO QUE O AGENTE DEVE CONHECER

### Força Efetiva
```
forcaEfetiva = mediaForcaTitulares(ponderadoPorPreparo)
             + bonusMoral(±10%)
             + bonusMandoCampo(+5 se casa)
             + bonusTatico(tabela de confronto)
             + bonusHabilidades(habilidades especiais)
```

### Preparo Físico
```
Titular 90min   → -20 preparo
Substituto      → -8 preparo
Descanso/rodada → +25 preparo
Treino intenso  → -15 preparo
preparo < 20    → força × 0.35 + risco lesão
```

### Moral do Elenco
```
Vitória       → +10 | Derrota        → -8
Goleada feita → +18 | Goleada sofrida→ -18
Título        → +40 | Rebaixamento   → -40
Salário atraso→ -20/rodada
```

### Simulação
```
Seed da partida = temporada × 10000 + rodada × 100 + indexPartida
Loop: 90 iterações (minutos)
  P(evento gol) = 0.028 por minuto
  P(gol casa)   = forcaCasa / (forcaCasa + forcaVisitante)
Substituição em qualquer minuto → força recalculada imediatamente
```

### Mercado — Valuation
```
valor = forca
      × multiplicadorPosicao (ATA=1.3, MEI=1.1, ZAG=1.0, LAT=0.9, GOL=0.8)
      × fatorIdade (pico 25-29=1.0, declínio exponencial após 32)
      × (1 + 0.10 × qtdHabilidades)
      × 100.000
NOVATO: -40% (força oculta = risco)
VETERANO: -20% (fim de carreira iminente)
```

### Temporada
```
Série A/B: 20 times · 38 rodadas · pontos corridos
Acesso: top 4 (se B ou C)
Rebaixamento: últimos 4
Copa do Brasil: mata-mata paralelo ao campeonato
```

---

## 🧪 PADRÃO DE TESTE

```typescript
// __tests__/engine/simulacao.test.ts
describe('simularPartida', () => {
  it('deve produzir resultado idêntico para a mesma seed', () => {
    const casa = mockTime({ forca: 80 });
    const visitante = mockTime({ forca: 70 });
    const seed = 42;

    const r1 = simularPartida(casa, visitante, seed);
    const r2 = simularPartida(casa, visitante, seed);

    expect(r1.golsCasa).toBe(r2.golsCasa);
    expect(r1.golsVisitante).toBe(r2.golsVisitante);
    expect(r1.eventos).toEqual(r2.eventos);
  });

  it('time mais forte deve vencer mais vezes em 1000 simulações', () => {
    const forte = mockTime({ forca: 90 });
    const fraco = mockTime({ forca: 40 });
    let vitorias = 0;

    for (let i = 0; i < 1000; i++) {
      const r = simularPartida(forte, fraco, i);
      if (r.golsCasa > r.golsVisitante) vitorias++;
    }

    expect(vitorias).toBeGreaterThan(650); // > 65% de vitórias
  });
});
```

---

## 🗣️ PROTOCOLO DE COMUNICAÇÃO

### Quando receber uma tarefa:
1. **Anuncie** o que vai fazer (1 frase)
2. **Execute** — código completo, sem `// TODO` sem resolução
3. **Liste** arquivos criados/modificados
4. **Rode** typecheck + lint + test (se aplicável)
5. **Reporte** resultado: ✅ ou ❌ com detalhe do erro

### Formato de entrega:
```
## ✅ Tarefa: [nome]

### Arquivos modificados:
- src/engine/simulacao.ts — adicionado simularPartida()
- __tests__/engine/simulacao.test.ts — 3 novos testes

### typecheck: ✅ zero erros
### lint: ✅ zero warnings
### jest: ✅ 3/3 passando
```

### O que NUNCA fazer:
```
✗ Entregar código incompleto com "complete conforme necessário"
✗ Usar // @ts-ignore para resolver erro de tipo
✗ Criar arquivo fora da estrutura definida sem justificativa
✗ Introduzir nova dependência sem listar no package.json
✗ Quebrar testes existentes sem corrigir
✗ Usar Math.random() dentro de src/engine/
```

---

## 📦 DEPENDÊNCIAS APROVADAS

```json
{
  "dependencies": {
    "react-native": "0.86.x",
    "react": "19.2.x",
    "zustand": "^5.x",
    "@op-engineering/op-sqlite": "latest",
    "react-native-reanimated": "^3.x",
    "react-native-vector-icons": "^10.x",
    "react-native-svg": "^15.x",
    "@react-navigation/native": "^7.x",
    "@react-navigation/native-stack": "^7.x",
    "@react-navigation/bottom-tabs": "^7.x"
  },
  "devDependencies": {
    "typescript": "^5.8",
    "@types/react": "^19",
    "@types/react-native": "^0.73",
    "jest": "^29",
    "@testing-library/react-native": "^12",
    "eslint": "^9"
  }
}
```

**Para adicionar nova dependência:** justifique o motivo, confirme que não existe alternativa nas dependências já instaladas, e adicione ao package.json na mesma tarefa.

---

## 🏁 DEFINIÇÃO DE PRONTO

Uma tarefa está **PRONTA** quando:

- [ ] Código compila sem erros TypeScript (`tsc --noEmit`)
- [ ] ESLint limpo
- [ ] Jest verde (novos testes + nenhum existente quebrado)
- [ ] Nenhum `any`, `@ts-ignore` ou `Math.random()` na engine
- [ ] Nomenclatura seguindo a convenção PT-BR/EN
- [ ] Arquivo na pasta correta da estrutura
- [ ] Se adicionou lógica de negócio → tem unit test correspondente

---

*FOTEBALL_SKILL.md · Claude Code Contract · claude-opus-4-8*
*Danpazexe/FOTEBALL · React Native CLI · TypeScript strict*

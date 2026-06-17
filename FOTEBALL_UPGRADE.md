# FOTEBALL — Briefing de Upgrades Completo

> **Contexto**: Este documento é o contrato de implementação de todas as melhorias planejadas para o FOTEBALL, jogo de manager de futebol brasileiro em React Native CLI. Leia o `PROJETO.md` existente antes de iniciar qualquer módulo. Implemente um módulo por vez, nesta ordem de prioridade. Após cada módulo: `npx tsc --noEmit` limpo + `npm run lint` 0 erros.

---

## Stack e restrições obrigatórias

- **React Native CLI 0.86** + **React 19.2** + **TypeScript 5.8 strict** — sem Expo
- **Ícones**: usar **exclusivamente** `react-native-vector-icons` (já no `package.json`). Família padrão: `MaterialCommunityIcons`. Proibido criar SVG de ícone manualmente
- **Gráficos**: `react-native-svg` para radar, donut, barras — sem biblioteca de charts externa
- **Animações**: `react-native-reanimated` v4 — sem `Animated` da RN core
- **Estado**: Zustand v5 com seletores estáveis (sem seletor inline que retorne novo objeto/array)
- **Motor**: nada em `src/engine/` importa React/UI. Toda lógica de regra de negócio fica no engine
- **Determinismo**: qualquer aleatoriedade no engine usa `criarRNGComSeed` — proibido `Math.random` no engine
- **Sem `any`**: TypeScript strict. Usar `unknown` + type guards quando necessário
- **Nomenclatura**: domínio em português (`calcularMoral`, `processarTreino`), técnico genérico em inglês (`useAchievementsStore`)
- **Testes**: qualquer função nova no engine deve ter teste Jest correspondente

---

## MÓDULO 1 — Persistência SQLite (CRÍTICO — implementar primeiro)

**Por quê primeiro**: sem save/load, todos os outros módulos são inúteis — fechar o app reseta tudo.

### O que existe
- `src/api/database/db.ts` — `getDatabase()`, `migrateDatabase()`, `initializeDatabase()`
- `src/api/database/schema.ts` — `schemaStatements` com todas as tabelas DDL
- `src/api/database/repositories/` — repositórios finos já estruturados
- `@op-engineering/op-sqlite` já instalado

### O que implementar

**1.1 — Funções de serialização no store**

Em `src/store/index.ts` (ou arquivo separado `src/store/persistence.ts`):

```typescript
// Serializa o estado Zustand completo para o banco
export async function salvarJogo(state: GameState): Promise<void>

// Carrega o último save e reidrata o estado Zustand
export async function carregarJogo(): Promise<Partial<GameState> | null>

// Verifica se existe algum save salvo
export async function existeSave(): Promise<boolean>
```

Estratégia de serialização:
- `save_game`: salvar metadados (`nomeTreinador`, `clubeUsuarioId`, `temporadaAtual`, `dataAtual`)
- `jogadores`: upsert de cada Player do estado (usar `INSERT OR REPLACE`)
- `clubes`: upsert de cada Clube (sem o array `elenco` — reconstruir via `jogadores.clube_id`)
- `partidas`: apenas partidas da temporada atual
- `tabela_classificacao`: estado atual da tabela
- `formacoes` + `taticas`: por clube

**1.2 — Chamadas automáticas de save**

No store, chamar `salvarJogo()` após:
- `processarResultados()` — após cada rodada
- `realizarTransferencia()` — após compra/venda
- `atualizarFormacaoUsuario()` — após mudança de escalação fora de partida

**1.3 — Hidratação no boot**

Em `App.tsx`, antes de montar o `NavigationContainer`:

```typescript
const [carregando, setCarregando] = useState(true)

useEffect(() => {
  initializeDatabase()
    .then(() => carregarJogo())
    .then((state) => {
      if (state) useGameStore.setState(state)
    })
    .finally(() => setCarregando(false))
}, [])

if (carregando) return <LoadingScreen />
```

**1.4 — LoadingScreen**

`src/screens/Loading/index.tsx`:
- Fundo escuro com logo do app centralizado
- `ActivityIndicator` nativo (sem biblioteca)
- Texto "Carregando carreira..." abaixo

**1.5 — Testes**

```typescript
// src/api/database/__tests__/persistence.test.ts
test('salvarJogo + carregarJogo reidrata o estado corretamente')
test('existeSave retorna false em banco vazio')
test('save é idempotente — múltiplos saves não duplicam dados')
```

---

## MÓDULO 2 — Dashboard "Mesa do Técnico" (Home Screen)

**Arquivo**: `src/screens/Home/index.tsx` — refactor completo

### Layout (de cima para baixo)

```
┌─────────────────────────────────┐
│  [Escudo clube]  Nome do Clube  │  ← Header com SafeAreaView
│  Temporada 2026 · Rodada 12/38  │
├─────────────────────────────────┤
│  PRÓXIMO JOGO                   │  ← ProximoJogoCard
│  [Escudo] Flamengo  Dom 22/06   │
│  Força: ████░░ vs ███░░░        │  ← Barras comparativas SVG
│  [Escalar]        [Jogar →]     │
├─────────────────────────────────┤
│  FORMA RECENTE    V D V V E     │  ← Últimos 5: pills coloridos
│  Posição: 3º · 24pts · +11 SG   │
├─────────────────────────────────┤
│  ⚠ AVISOS                       │  ← AlertasCard (só se houver)
│  🩹 João Silva — 14 dias        │
│  🟥 Pedro — suspenso prox. jogo │
│  💰 Saldo negativo: −R$ 45k     │
├─────────────────────────────────┤
│  ATALHOS RÁPIDOS                │
│  [Elenco] [Mercado] [Finanças]  │
└─────────────────────────────────┘
```

### Componentes a criar

**`ProximoJogoCard`** (`src/components/ProximoJogoCard/index.tsx`):
- Props: `partida: Partida`, `clubeCasa: Clube`, `clubeFora: Clube`, `forcaCasa: ForcaTime`, `forcaFora: ForcaTime`
- Barras de força: SVG simples, 2 retângulos proporcionais (ataque, meio, defesa separados)
- Botões com `MaterialCommunityIcons`: `strategy` (Escalar) e `play` (Jogar)
- `onPressJogar` → navega para `PreJogo` (novo) ou direto para `MatchSimulation`

**`FormaRecente`** (`src/components/FormaRecente/index.tsx`):
- Props: `resultados: Array<'V' | 'E' | 'D'>` — máximo 5
- Calcular a partir do histórico de partidas jogadas do usuário
- V = pill verde `#22C55E`, E = pill cinza, D = pill vermelho `#EF4444`

**`AlertasCard`** (`src/components/AlertasCard/index.tsx`):
- Renderizar apenas se houver ao menos 1 alerta
- Ícones `MaterialCommunityIcons`: `bandage` (lesão), `card` (suspensão), `bank-off` (saldo negativo)
- Tap em alerta de lesão → navega para JogadorDetalhe

### Seletor derivado necessário

```typescript
// src/store/selectors.ts
export function selecionarFormaRecente(state: GameState): Array<'V' | 'E' | 'D'>
// Pega as últimas 5 partidas jogadas do usuário, calcula V/E/D pelo placar
```

---

## MÓDULO 3 — Ícones com react-native-vector-icons

**Objetivo**: eliminar todos os SVG de ícone manuais e substituir por `MaterialCommunityIcons`.

### Setup (se ainda não feito)

```bash
# android/app/build.gradle — garantir que está presente:
apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

### Componente wrapper

Criar `src/components/Icone/index.tsx`:

```typescript
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

interface IconeProps {
  nome: string        // nome do ícone MaterialCommunityIcons
  tamanho?: number    // default: 24
  cor?: string        // default: tema
}

export function Icone({ nome, tamanho = 24, cor }: IconeProps) {
  const { cores } = useTema()
  return (
    <MaterialCommunityIcons
      name={nome}
      size={tamanho}
      color={cor ?? cores.textoPrimario}
    />
  )
}
```

### Mapa de ícones por contexto

| Contexto | Ícone MaterialCommunityIcons |
|---|---|
| Gol | `soccer` |
| Cartão amarelo | `card-outline` (cor amarela) |
| Cartão vermelho | `card` (cor vermelha) |
| Lesão | `bandage` |
| Substituição | `swap-horizontal` |
| Chance perdida | `close-circle-outline` |
| Pênalti | `bullseye-arrow` |
| Vitória | `trophy` |
| Empate | `handshake` |
| Derrota | `emoticon-sad-outline` |
| Lesionado (elenco) | `medical-bag` |
| Suspenso | `cancel` |
| Bom moral | `emoticon-happy-outline` |
| Moral neutro | `emoticon-neutral-outline` |
| Moral baixo | `emoticon-sad-outline` |
| Dinheiro/saldo | `cash` |
| Transferência | `account-arrow-right` |
| Treino intenso | `run-fast` |
| Treino leve | `walk` |
| Treino normal | `run` |
| Conquista | `trophy-award` |
| Jovem talento | `account-star-outline` |
| Calendário | `calendar-month` |
| Táticas | `strategy` |
| Elenco | `account-group` |
| Finanças | `bank-outline` |
| Configurações | `cog-outline` |

### Tab Bar

`src/navigation/TabNavigator.tsx` — atualizar cada aba:

```typescript
tabBarIcon: ({ color, size }) => (
  <MaterialCommunityIcons name="home-variant" color={color} size={size} />
)
```

Abas: Home (`home-variant`), Liga (`format-list-numbered`), Táticas (`strategy`), Mercado (`swap-horizontal`), Finanças (`bank-outline`)

---

## MÓDULO 4 — Sistema de Moral

### Engine (`src/engine/progression/moralEngine.ts`)

```typescript
export interface DeltaMoral {
  jogadorId: string
  delta: number
  motivo: string
}

// Calcula deltas de moral após uma partida
export function calcularDeltasMoralPartida(
  partida: Partida,
  clubeId: string,
  jogadoresEmCampo: string[],   // ids dos 11 titulares + substitutos que entraram
  vencedor: 'casa' | 'fora' | 'empate'
): DeltaMoral[]

// Regras:
// Vitória: titulares +3, reservas que não entraram +1
// Empate: todos +0
// Derrota: titulares -4, reservas -1
// Artilheiro da partida: +8 adicional
// Sofreu lesão na partida: -5 adicional
// Expulso: -6 adicional
// Clamp final: moral sempre entre 10 e 100

// Ação "Conversa com o grupo" — técnico usa 1x por semana
export function converteComGrupo(jogadores: Player[]): DeltaMoral[]
// Todos os jogadores do elenco: +5 moral, máx 100
```

### Store — integração

Em `processarResultados()` no store:
```typescript
const deltas = calcularDeltasMoralPartida(partida, clubeUsuarioId, titulares, vencedor)
deltas.forEach(({ jogadorId, delta }) => {
  atualizarJogador(jogadorId, { moral: clamp(jogador.moral + delta, 10, 100) })
})
```

### UI — `CartaJogador` expandida

Adicionar badge de moral abaixo do overall:
- `>= 75`: `emoticon-happy-outline` (verde)
- `50–74`: `emoticon-neutral-outline` (amarelo)
- `< 50`: `emoticon-sad-outline` (vermelho)

### UI — Popup pós-jogo

`src/components/ReacaoElenco/index.tsx`:
- Modal que aparece após processarResultados, por 3 segundos
- Ex: "🔥 Elenco motivado após vitória! Moral médio: 78"
- Ex: "😔 Grupo abalado. Técnico pode conversar com o elenco"
- Botão "Conversar com o grupo" (cooldown visual se já usado nesta rodada)

### Testes

```typescript
// engine/progression/__tests__/moralEngine.test.ts
test('vitória aumenta moral dos titulares em +3')
test('artilheiro recebe +8 adicional')
test('moral não ultrapassa 100 nem cai abaixo de 10')
test('converteComGrupo aplica +5 a todos')
```

---

## MÓDULO 5 — Tela Pré-Jogo

**Arquivo**: `src/screens/PreJogo/index.tsx` — tela nova

### Fluxo de navegação

`Home → (tap "Próximo Jogo") → PreJogo → (tap "Jogar ao Vivo") → MatchSimulation`
`Home → (tap "Simular") → PreJogo → (tap "Simular") → resultado inline`

### Layout

```
┌──────────────────────────────────┐
│  RODADA 12 · BRASILEIRÃO SÉRIE A │
│  [Escudo]  2 × 1  [Escudo]       │  ← Força relativa como "placar previsto"
│  Seu Clube    vs    Flamengo     │
│  Força: 74         Força: 81     │
├──────────────────────────────────┤
│  SUA POSIÇÃO: 3º   DEL POS: 1º  │
│  Form: V V E D V   Form: V V V D V│
├──────────────────────────────────┤
│  HISTÓRICO DE CONFRONTOS        │
│  Rodada 5 · 2025: Seu Clube 1×0  │
│  Rodada 32 · 2025: Flamengo 2×1  │
│  Rodada 5 · 2024: Empate 1×1     │
├──────────────────────────────────┤
│  IMPRENSA                        │
│  "Como você avalia o adversário?"│
│  [Com respeito +2 moral]         │
│  [Favoritos somos nós −1/+5]     │
├──────────────────────────────────┤
│  [⚡ SIMULAR]    [▶ JOGAR AO VIVO]│
└──────────────────────────────────┘
```

### Perguntas de imprensa

Banco de 10 pares de pergunta/resposta em `src/data/imprensa.ts`:

```typescript
export interface PerguntaImprensa {
  id: string
  pergunta: string
  opcoes: [OpcaoImprensa, OpcaoImprensa]
}

export interface OpcaoImprensa {
  texto: string
  deltaMoralElenco: number          // aplicado imediatamente ao elenco
  deltaMoralSeVencer?: number       // bônus/penalidade extra se vencer a partida
  deltaMoralSePerdere?: number      // penalidade extra se perder
}
```

Exemplos de perguntas:
1. "Como você avalia o adversário?" → "Com respeito" (+2) / "Favoritos somos nós" (-1 agora, +5 se vencer)
2. "Quais são os objetivos desta rodada?" → "Vencer e seguir em frente" (+1) / "Conquistar os 3 pontos a qualquer custo" (+3 moral mas -2 condicaoFisica)
3. "O elenco está motivado?" → "Estamos muito bem" (+3) / "Precisamos melhorar" (-1 mas +4 se vencer)

### Seletor: histórico de confrontos

```typescript
// src/store/selectors.ts
export function selecionarHistoricoConfrontos(
  state: GameState,
  clubeAId: string,
  clubeBId: string,
  limite: number = 3
): Partida[]
```

---

## MÓDULO 6 — Tela de Partida ao Vivo (redesign)

**Arquivo**: `src/screens/MatchSimulation/index.tsx` — redesign do layout

### Header fixo (HUD estilo TV)

```tsx
<View style={styles.hudHeader}>
  <EscudoClube clubeId={timeCasa} tamanho={36} />
  <View style={styles.placarContainer}>
    <Text style={styles.placarTexto}>{placarCasa} – {placarFora}</Text>
    <View style={styles.minutoContainer}>
      <MaterialCommunityIcons name="circle" color="#22C55E" size={8} />  {/* pulsando */}
      <Text style={styles.minutoTexto}>{minuto}'</Text>
    </View>
  </View>
  <EscudoClube clubeId={timeFora} tamanho={36} />
</View>
```

Animação do círculo verde: `useSharedValue` com `withRepeat(withTiming(0, {duration: 800}), -1, true)` no `opacity`.

### Feed de eventos (FlatList invertida)

```tsx
<FlatList
  data={eventos}
  inverted
  keyExtractor={(e) => `${e.minuto}-${e.tipo}-${e.jogadorId}`}
  renderItem={({ item }) => <EventoItem evento={item} />}
/>
```

**`EventoItem`** (`src/components/EventoItem/index.tsx`):

```typescript
const ICONE_POR_TIPO: Record<EventoPartidaTipo, string> = {
  gol: 'soccer',
  cartao_amarelo: 'card-outline',
  cartao_vermelho: 'card',
  lesao: 'bandage',
  substituicao: 'swap-horizontal',
  chance_perdida: 'close-circle-outline',
  penalti: 'bullseye-arrow',
  falta_cobranca: 'whistle',
}
```

Layout do item: `[minuto]  [ícone]  [texto narrado]  [nome time pequeno]`

### Barras de força em tempo real

Abaixo do HUD, barra horizontal comparativa:
```
Atq ████░░ vs ░░████ Atq
Mei ███░░░ vs ░░░███ Mei
Def ██████ vs ░░░░░░ Def
```
Atualizar a cada substituição/mudança tática (já que `calcularContextoMinuto` roda por minuto).

### FAB "Ajustes"

```tsx
<TouchableOpacity style={styles.fab} onPress={abrirAjustes}>
  <MaterialCommunityIcons name="strategy" color="#fff" size={24} />
</TouchableOpacity>
```
Posição: `bottom: 24, right: 20, position: 'absolute'`. Não renderizar nos acréscimos se `minuto >= 88`.

### Tela pós-jogo (Súmula)

Após minuto 90, mostrar:
- Placar final em destaque
- Artilheiros com ícone `soccer`
- Cartões com ícone `card`
- Lesionados com ícone `bandage`
- Nota média do time (média das `notaMedia` dos titulares — pode ser simulada como `overall/10` normalizado)
- Botões: "Ver Tabela" / "Próxima Rodada"

---

## MÓDULO 7 — Cards de Jogador redesenhados

**Arquivo**: `src/components/CartaJogador/index.tsx` — redesign

### Layout do card (estilo colecionável)

```
┌────────────────────────────────┐
│ [POS]  [OVERALL]   [Escudo]    │  ← topo: posição + overall grande + escudo clube
│  CA       82        [img]      │
├────────────────────────────────┤
│  CARLOS EDUARDO                │  ← nome (apelido se tiver)
│  Brasil · 24 anos              │
├────────────────────────────────┤
│  FIN  DRI  VEL                 │  ← 3 atributos-chave por posição
│   85   78   88                 │
├────────────────────────────────┤
│  [😊 82]  [💰 R$ 2.8M]        │  ← moral + valor de mercado
└────────────────────────────────┘
```

### Atributos-chave por posição

```typescript
// src/utils/atributosDestaque.ts
export function atributosDestaquePorPosicao(posicao: Position): Array<keyof PlayerAttributes> {
  const mapa: Record<Position, Array<keyof PlayerAttributes>> = {
    GOL: ['reflexos', 'posicionamento', 'forca'],
    ZAG: ['marcacao', 'desarme', 'cabeceio'],
    LD:  ['marcacao', 'cruzamento', 'velocidade'],
    LE:  ['marcacao', 'cruzamento', 'velocidade'],
    VOL: ['desarme', 'marcacao', 'passe'],
    MC:  ['passe', 'posicionamento', 'resistencia'],
    MEI: ['passe', 'drible', 'finalizacao'],
    PD:  ['cruzamento', 'drible', 'velocidade'],
    PE:  ['cruzamento', 'drible', 'velocidade'],
    SA:  ['finalizacao', 'cabeceio', 'posicionamento'],
    CA:  ['finalizacao', 'drible', 'velocidade'],
  }
  return mapa[posicao]
}
```

### Cor por raridade (já no tema)

```typescript
// Usar corRaridade já existente em src/theme/
// Aplicar como borderColor + backgroundColor com opacity 0.15
```

### Overlay de status

Se `lesionado`: overlay semi-transparente vermelho com `bandage` centralizado + `${diasLesao} dias`
Se `suspenso`: overlay semi-transparente amarelo com `cancel` + "Suspenso"

### Tap → JogadorDetalhe

Passar `jogadorId` como param de navegação.

---

## MÓDULO 8 — Tela Jogador Detalhe

**Arquivo**: `src/screens/JogadorDetalhe/index.tsx` — tela nova

### Navegação

```typescript
// src/navigation/types.ts — adicionar:
JogadorDetalhe: { jogadorId: string }
```

### Seções da tela (ScrollView)

**1. Header**
- Nome completo + apelido
- Posição + overall + idade + nacionalidade
- Valor de mercado + salário mensal
- Status: lesão (dias) / suspensão / disponível

**2. Radar Chart SVG** (`src/components/RadarAtributos/index.tsx`)

6 eixos (agregados dos 12 atributos):
- **Finalização**: `(finalizacao + posicionamento) / 2`
- **Passe**: `(passe + cruzamento) / 2`
- **Defesa**: `(marcacao + desarme) / 2`
- **Físico**: `(forca + resistencia) / 2`
- **Velocidade**: `velocidade`
- **Habilidade**: `(drible + cabeceio) / 2`

SVG viewBox 300×300, hexágono com 5 níveis de grid (linhas cinzas), polígono preenchido com cor accent do clube.

**3. Estatísticas da temporada**

Grid 2×3:
- Jogos | Gols
- Assistências | Cartões
- Nota média | Condição atual

**4. Histórico por temporada** (se `historicoTemporadas.length > 0`)

Lista simples: `2025 · 28j · 12g · 5a`

**5. Ações**

- Botão "Propor Venda" → abre `ModalPropostaVenda`
- Botão "Renovar Contrato" → abre `ModalRenovacao` (P4, pode deixar como TODO)

---

## MÓDULO 9 — Mercado de Transferências

**Arquivo**: `src/screens/Mercado/index.tsx` — tela nova (ou refactor se já existir)

### Abas

**Aba "Contratar"**: jogadores disponíveis (sem clube)
**Aba "Vender"**: seus jogadores + propostas recebidas da IA

### Lógica de negociação — `src/engine/transfers/negociacaoEngine.ts`

```typescript
export interface PropostaTransferencia {
  id: string
  jogadorId: string
  clubeOfertante: string      // 'usuario' ou clubeId da IA
  valorProposto: number
  status: 'pendente' | 'aceita' | 'recusada' | 'contra-proposta'
  contraPropostaValor?: number
  expiracaoRodada: number     // proposta expira em N rodadas
}

// IA responde à proposta do usuário
export function respostaIAProposta(
  proposta: PropostaTransferencia,
  jogador: Player,
  clubeVendedor: Clube,
  rng: RandomGenerator
): 'aceita' | 'recusada' | PropostaTransferencia  // retorna contra-proposta

// Critério de aceitação da IA:
// Aceita se valor >= valorMercado * 0.92
// Recusa se valor < valorMercado * 0.70
// Contra-proposta (valorMercado * 1.05) se entre 0.70 e 0.92
```

### Store — ações de transferência

```typescript
// Já existe: realizarTransferencia()
// Adicionar:
fazerPropostaCompra(jogadorId: string, valor: number): void
responderPropostaVenda(propostaId: string, aceitar: boolean): void
processarPropostasIA(): void  // chamado no início de cada rodada
```

### UI da aba "Contratar"

- FlatList com `CartaJogador` em modo compacto
- Filtros: posição (chips), overall mínimo (slider), valor máximo
- Tap em jogador → `JogadorDetalhe` com botão "Contratar" no footer
- Modal de proposta: input de valor, preview do preço justo, botão "Enviar Proposta"

### UI da aba "Vender"

- Lista de propostas recebidas da IA (badge de quantidade na aba)
- Card de proposta: foto clube ofertante, jogador alvo, valor, botões "Aceitar" / "Recusar"
- Lista dos seus jogadores disponíveis para venda

### Badge na Tab Bar

```typescript
// No TabNavigator, após processar propostas:
tabBarBadge={propostasPendentes > 0 ? propostasPendentes : undefined}
```

---

## MÓDULO 10 — Gestão de Treino Semanal

**Arquivo**: `src/screens/Semana/index.tsx` — tela nova (acessível entre rodadas)

### Engine — `src/engine/progression/treinoEngine.ts`

```typescript
export type IntensidadeTreino = 'leve' | 'normal' | 'intenso'

export interface EfeitoTreino {
  jogadorId: string
  deltaCondicao: number   // física
  deltaForma: number      // forma numérica
}

export function calcularEfeitosTreino(
  jogadores: Player[],
  intensidade: IntensidadeTreino
): EfeitoTreino[]

// Regras:
// LEVE:    condicaoFisica +8 (máx 100), forma -0.5 (mín -3)
// NORMAL:  condicaoFisica +2, forma +0.5
// INTENSO: condicaoFisica -5 (mín 55), forma +1.5 (máx 5)
// Jogadores lesionados: sempre recebem efeito LEVE independente da escolha
// Clamp sempre aplicado nos bounds existentes
```

### UI

```
┌─────────────────────────────────┐
│  TREINO DA SEMANA               │
│  Rodada 12 → 13                 │
├─────────────────────────────────┤
│  [🚶 LEVE]  [🏃 NORMAL]  [💨 INTENSO]│
│     ●                           │  ← selecionado
├─────────────────────────────────┤
│  IMPACTO ESTIMADO               │
│  Condição média: 74% → 82%      │
│  Forma média: 1.2 → 0.7         │
├─────────────────────────────────┤
│  ELENCO                         │
│  Carlos Eduardo  82%  🟢 forma  │
│  João Silva 🩹  —  treino leve  │  ← lesionado: automático
│  Pedro     🟥  —  suspenso      │
├─────────────────────────────────┤
│  [Confirmar Treino]             │
└─────────────────────────────────┘
```

### Integração com o fluxo de rodada

O botão "Avançar Rodada" na Home deve passar por `Semana` antes de processar a rodada:

```
Home → [Avançar Rodada] → SemanaScreen → [Confirmar] → processarRodada()
```

### Testes

```typescript
// engine/progression/__tests__/treinoEngine.test.ts
test('treino intenso aumenta forma e diminui condição')
test('treino leve recupera condição')
test('lesionados sempre recebem efeito leve')
test('condição nunca cai abaixo de 55')
```

---

## MÓDULO 11 — Estatísticas Financeiras com gráficos SVG

**Arquivo**: `src/screens/Financas/index.tsx` — redesign

### Componente Donut SVG (`src/components/DonutChart/index.tsx`)

```typescript
interface FatiaDonut {
  valor: number
  cor: string
  label: string
}

interface DonutChartProps {
  fatias: FatiaDonut[]
  tamanho?: number        // default: 180
  espessura?: number      // default: 30
  labelCentro?: string    // texto no centro (ex: "Total")
  valorCentro?: string    // valor no centro (ex: "R$ 2.3M")
}
```

Calcular ângulos: `(valor / total) * 2 * Math.PI`. Cada fatia = um `<Path>` SVG de arco. Sem dependência externa — implementar em `react-native-svg` puro.

### Layout da tela

**Header**: Saldo atual em destaque — cor verde (positivo) ou vermelho (negativo). Ícone `bank-outline` + `R$ X.XXX.XXX`.

**Seção Receitas**: Donut + legenda lateral (bilheteria, patrocínio, premiações, vendas)

**Seção Despesas**: Donut + legenda (salários, manutenção, compras)

**Alerta de risco** (se folha > 80% da receita):
```
⚠️ Atenção: salários consomem 87% da receita mensal
   Considere vender jogadores de alto salário
```
Ícone: `alert-circle-outline` (cor laranja)

**Histórico** (últimas 5 transações):
- Ícone `arrow-up-circle` verde (receita) / `arrow-down-circle` vermelho (despesa)
- Data + categoria + valor

**Projeção** (simples):
```
📈 Projeção: R$ X.XXX.XXX em 4 semanas
   (baseado na média mensal atual)
```

---

## MÓDULO 12 — Calendário Visual da Temporada

**Arquivo**: `src/screens/Calendario/index.tsx` — tela nova

### Layout

Grid mensal (6 semanas × 7 dias). Cada rodada ocupa 1 célula.

Cores das células:
- Partida jogada — vitória: `#166534` (verde escuro)
- Partida jogada — empate: `#374151` (cinza)
- Partida jogada — derrota: `#7F1D1D` (vermelho escuro)
- Próxima partida: accent do tema (borda pulsante via Reanimated)
- Partidas futuras: cinza claro
- Janela de transferências: borda dourada na semana correspondente

### Componente célula

```typescript
interface CelulaCalendario {
  dia: number
  partida?: Partida
  resultado?: 'V' | 'E' | 'D'
  ehProxima?: boolean
  ehJanelaTransferencias?: boolean
}
```

Tap em célula com partida jogada → abre modal com súmula rápida (placar + artilheiros)
Tap em célula futura → abre `PreJogoScreen`

### Navegação entre meses

`ScrollView` horizontal com `pagingEnabled`, um mês por página. Header mostra mês/ano atual.

---

## MÓDULO 13 — Tela de Finanças (já unificada no Módulo 11, separar aqui se necessário)

*(Coberto no Módulo 11 — este slot reservado para Renovação de Contratos)*

### Renovação de Contratos (`src/screens/Contratos/index.tsx`)

Jogadores com `contratoAte` na temporada atual ou na próxima:
- Lista com urgência visual: vermelho (expira esta temporada), amarelo (próxima)
- Modal de renovação: propor salário (input) + duração (1, 2 ou 3 temporadas)
- Jogador aceita se salário proposto >= `salario * 0.9` (ele quer manter) ou se `moral > 70`
- Rejeita e vai à janela de transferências automaticamente se recusar

---

## MÓDULO 14 — Academia de Base (Jovens Talentos)

**Arquivo**: `src/engine/progression/academiaEngine.ts` + `src/screens/Academia/index.tsx`

### Engine

```typescript
export interface JovemTalento {
  id: string
  nome: string
  idade: 17 | 18 | 19
  posicao: Position
  overall: number       // range: 55–68
  potencial: number     // range: 72–90 (oculto para o usuário — revelado em %)
  salarioBase: number   // calculado por overall
}

// Gerar jovens para a temporada (determinístico via seed)
export function gerarJovensTemporada(
  temporada: number,
  necessidadesElenco: Record<Position, number>,  // quantos de cada posição faltam
  rng: RandomGenerator
): JovemTalento[]

// 3–5 jovens por temporada
// Posições ponderadas pelas necessidades do elenco
// Potencial oculto: mostrar como "B" (72-78), "A" (79-85), "S" (86-90)
```

Banco de nomes brasileiros em `src/data/nomesBase.ts` — pelo menos 200 primeiros + 100 sobrenomes.

### UI — `src/screens/Academia/index.tsx`

```
┌─────────────────────────────────┐
│  🌟 PENEIRAS DA TEMPORADA 2026  │
│  3 jovens aguardam avaliação    │
├─────────────────────────────────┤
│  CARLOS HENRIQUE · CA · 18 anos │
│  Overall: 62  Potencial: [A]    │  ← potencial como letra, não número
│  Salário: R$ 4.200/mês          │
│  [Promover ao Elenco] [Liberar] │
├─────────────────────────────────┤
│  WELLINGTON · ZAG · 17 anos     │
│  Overall: 58  Potencial: [S]    │  ← raro! destacar com cor dourada
│  ...                            │
└─────────────────────────────────┘
```

"Promover" adiciona o jovem ao elenco e debita salário.
"Liberar" remove da lista sem custo.

Integrar com `finalizarTemporada()` no store: chamar `gerarJovensTemporada()` e armazenar no estado.

### Progressão acelerada de jovens

Em `playerProgression.ts`, para jogadores com `idade < 21`:
```typescript
const multiplicadorJovem = idade < 19 ? 2.0 : idade < 21 ? 1.5 : 1.0
// Aplica sobre o delta de overall da progressão normal
```

---

## MÓDULO 15 — Conquistas

**Arquivo**: `src/store/useAchievementsStore.ts` + `src/screens/Gabinete/index.tsx`

### Definição de conquistas

`src/data/conquistas.ts`:

```typescript
export interface Conquista {
  id: string
  nome: string
  descricao: string
  icone: string           // MaterialCommunityIcons name
  corIcone: string
  desbloqueada: boolean
  dataDesbloqueio?: string
}

export const CONQUISTAS: Conquista[] = [
  { id: 'primeiro_titulo', nome: 'Campeão!', descricao: 'Vença o Brasileirão', icone: 'trophy', corIcone: '#F59E0B' },
  { id: 'primeira_vitoria', nome: 'Início promissor', descricao: 'Vença sua primeira partida', icone: 'soccer', corIcone: '#22C55E' },
  { id: 'goleada', nome: 'Sem piedade', descricao: 'Vença por 5 ou mais gols', icone: 'lightning-bolt', corIcone: '#EF4444' },
  { id: 'revelacao', nome: 'Olheiro nato', descricao: 'Promova um jovem com potencial S', icone: 'account-star', corIcone: '#8B5CF6' },
  { id: 'saldo_positivo', nome: 'Presidente aprova', descricao: 'Mantenha saldo > R$ 10M', icone: 'bank', corIcone: '#10B981' },
  { id: 'invicto_5', nome: 'Série invicta', descricao: 'Fique 5 rodadas sem perder', icone: 'shield-star', corIcone: '#3B82F6' },
  { id: 'moral_alto', nome: 'Vestiário unido', descricao: 'Moral médio do elenco >= 85', icone: 'emoticon-happy', corIcone: '#F59E0B' },
  { id: 'artilheiro_proprio', nome: 'Garçom do gol', descricao: 'Um jogador seu marca 15+ gols', icone: 'run-fast', corIcone: '#EF4444' },
  { id: 'temporadas_3', nome: 'Técnico experiente', descricao: 'Jogue 3 temporadas com o mesmo clube', icone: 'calendar-check', corIcone: '#6366F1' },
  { id: 'sem_gol_sofrido', nome: 'Muralha', descricao: 'Fique 3 partidas sem sofrer gol', icone: 'shield-half-full', corIcone: '#64748B' },
]
```

### Store

```typescript
// src/store/useAchievementsStore.ts
interface AchievementsState {
  conquistas: Conquista[]
  novasNaoVistas: string[]   // ids de conquistas desbloqueadas mas não exibidas ainda
  desbloquearConquista: (id: string) => void
  marcarComoVistas: () => void
}
```

### Verificação de conquistas

`src/engine/conquistas/verificadorConquistas.ts`:

```typescript
// Chamado após cada evento relevante (rodada, partida, treino)
export function verificarConquistas(
  state: GameState,
  conquistas: Conquista[]
): string[]  // retorna ids das conquistas recém-desbloqueadas
```

### UI — Toast de conquista

`src/components/ToastConquista/index.tsx`:

Slide-in do topo com Reanimated:
- Ícone dourado da conquista
- Nome em negrito
- Descrição pequena
- Auto-dismiss após 3 segundos

### UI — `src/screens/Gabinete/index.tsx`

Grid 2 colunas de cards de conquistas:
- Desbloqueadas: cor + ícone colorido + data
- Bloqueadas: cinza + ícone cinza + `???` na descrição
- Porcentagem de conclusão no header: "6/10 conquistas"

---

## Checklist de qualidade por módulo

Antes de considerar cada módulo "pronto":

- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run lint` sem erros (máx 1 aviso de inline-style)
- [ ] `npm test` todos os testes anteriores continuam passando
- [ ] Novos testes do engine passando
- [ ] Sem `any` no código novo
- [ ] Ícones usando exclusivamente `react-native-vector-icons` (sem SVG manual de ícone)
- [ ] Seletores Zustand estáveis (sem objeto/array criado inline no seletor)
- [ ] Sem `Math.random` ou `Date.now` dentro de `src/engine/`
- [ ] Navegação tipada (`RootStackParamList` / `TabParamList` atualizados)

---

## Ordem de implementação recomendada

```
Módulo 1  → Persistência SQLite          (fundação — fazer primeiro)
Módulo 3  → Ícones VectorIcons           (rápido, desbloqueia todos os outros)
Módulo 2  → Home "Mesa do Técnico"       (impacto imediato percebido)
Módulo 6  → Partida ao Vivo redesign     (coração do jogo)
Módulo 7  → Cards de Jogador             (visual polido)
Módulo 4  → Sistema de Moral             (loop de gestão)
Módulo 5  → Tela Pré-Jogo               (ritmo de carreira)
Módulo 8  → Jogador Detalhe             (profundidade)
Módulo 10 → Gestão de Treino            (decisão semanal)
Módulo 9  → Mercado de Transferências   (depth de carreira)
Módulo 11 → Finanças com gráficos       (painel completo)
Módulo 12 → Calendário Visual           (visão macro)
Módulo 13 → Contratos                   (gestão de elenco)
Módulo 14 → Academia de Base            (longevidade)
Módulo 15 → Conquistas                  (motivação de longo prazo)
```

---

_Documento gerado em 2026-06-15. Baseado no PROJETO.md do FOTEBALL (estado: `tsc` limpo · `eslint` 0 erros · `jest` 14/14). Implementar módulo por módulo mantendo este padrão de qualidade._

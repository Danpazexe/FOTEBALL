# BRASFOOT_MASTER.md
> Briefing completo de mecânicas, regras, lógica e sistemas do Brasfoot
> para implementação no projeto FOTEBALL (React Native CLI · TypeScript · Zustand · op-sqlite)

---

## 1. IDENTIDADE DO GÊNERO

| Atributo | Valor |
|---|---|
| Gênero | Football Manager / Soccer Manager |
| Referência original | Elifoot (Portugal, 1993) |
| Referência brasileira | Brasfoot (2003 – presente) |
| Perspectiva | Você é o **técnico E o dirigente** simultaneamente |
| Interface | Primariamente **textual** — sem animação de campo |
| Core fantasy | Controle total. Toda decisão tem consequência financeira, tática e moral |

---

## 2. CORE LOOP — CICLO FUNDAMENTAL

```
╔══════════════════════════════════════════════════╗
║  PRÉ-JOGO                                        ║
║  → Escalar 11 titulares + 7 reservas             ║
║  → Definir formação + estilo ataque/defesa       ║
║  → Verificar preparo físico de cada jogador      ║
╠══════════════════════════════════════════════════╣
║  SIMULAÇÃO DA PARTIDA                            ║
║  → Força efetiva calculada minuto a minuto       ║
║  → Eventos sorteados via seed determinístico     ║
║  → Substituições alteram força em tempo real     ║
╠══════════════════════════════════════════════════╣
║  PÓS-JOGO                                        ║
║  → Atualizar moral do elenco                     ║
║  → Drenar preparo físico dos escalados           ║
║  → Receber/pagar finanças da rodada              ║
║  → Processar propostas de transferência          ║
╠══════════════════════════════════════════════════╣
║  ENTRE RODADAS                                   ║
║  → Treinar jogadores (custo + melhora atributo)  ║
║  → Negociar no mercado (compra/venda/empréstimo) ║
║  → Ajustar preço de ingresso + ampliar estádio   ║
║  → Avançar para próxima rodada                   ║
╚══════════════════════════════════════════════════╝
         ↓ (ao fim da temporada)
╔══════════════════════════════════════════════════╗
║  FIM DE TEMPORADA                                ║
║  → Acesso / Rebaixamento processado              ║
║  → Cota TV distribuída por posição final         ║
║  → Contratos expiram / renovações                ║
║  → Reputação do técnico atualizada               ║
╚══════════════════════════════════════════════════╝
```

---

## 3. ATRIBUTOS DOS JOGADORES

### 3.1 Atributos Base

```typescript
interface Jogador {
  // Identidade
  id: string;
  nome: string;
  apelido?: string;
  posicao: Posicao;
  tipo: TipoJogador;

  // Desempenho
  forca: number;          // 1–100 · núcleo da simulação
  tecnica: number;        // 1–100 · qualidade de passe/toque
  velocidade: number;     // 1–100 · impacta contragolpe
  habilidades: Habilidade[]; // max 2

  // Físico / carreira
  idade: number;          // 16–40
  preparo: number;        // 0–100 · stamina da rodada
  moral: number;          // 0–100 · bônus individual
  salario: number;        // BRL/semana

  // Mercado
  valor: number;          // BRL · calculado dinamicamente
  contrato: number;       // rodadas restantes
  emProposta: boolean;
}

type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PUN' | 'ATA';

type TipoJogador = 'NORMAL' | 'NOVATO' | 'VETERANO';
```

### 3.2 Habilidades Especiais (máx. 2 por jogador)

| Habilidade | Efeito na simulação |
|---|---|
| `ARTILHEIRO` | +15% chance de gol quando finaliza |
| `ASSISTENCIAS` | +10% chance de evento "assistência" |
| `LIDERANCA` | +5 moral para todos do elenco após vitória |
| `DEFENSOR` | -10% chance de gol sofrido quando na zaga |
| `VELOCISTA` | +15% eficácia em tática CONTRAGOLPE |
| `FINALIZADOR` | +10% conversão dentro da área |
| `CHUTE_LONGO` | Gera evento GOL de fora da área (15% dos chutes) |
| `FALTA` | +20% conversão de faltas diretas |
| `CABECEADOR` | +20% conversão de escanteios/cruzamentos |
| `GOLEIRO_PENALTI` | +25% defesa de pênaltis |

### 3.3 Curva de Força por Idade

```
Idade   Multiplicador de crescimento
16–18   +3 a +5 por temporada (promessa)
19–22   +2 a +4 por temporada (desenvolvimento)
23–26   +1 a +2 por temporada (maturação)
27–29   +0 a +1 por temporada (pico — plateau)
30–32   -1 a -2 por temporada (declínio leve)
33–35   -2 a -4 por temporada (declínio moderado)
36+     -4 a -6 por temporada (fim de carreira)
```

### 3.4 Tipos de Jogador

**NORMAL** — comportamento padrão, força visível, treino previsível.

**NOVATO** — força oculta até completar primeiro treino. Pode ser revelação ou decepção. Salário baixo. Risco calculado.

**VETERANO** — força conhecida e alta, mas **treino reduz** a força em vez de aumentar. Valioso agora, peso no futuro.

---

## 4. SISTEMA DE PREPARO FÍSICO

```
Preparo: 0–100 por jogador

Consumo por partida:
  Titular 90min     → -20 preparo
  Titular substituído → -12 preparo
  Reserva que entrou → -8 preparo
  Reserva na bancada → -2 preparo (desgaste mental)

Recuperação:
  Rodada sem jogar  → +25 preparo
  Treino LEVE       → +10 preparo (sem melhora de atributo)
  Treino NORMAL     → +0 preparo (neutro no preparo)
  Treino INTENSO    → -15 preparo (melhora atributo, drena físico)

Efeito na força efetiva:
  preparo >= 80  → força × 1.00 (100%)
  preparo 60–79  → força × 0.90 (90%)
  preparo 40–59  → força × 0.75 (75%)
  preparo 20–39  → força × 0.55 (55%)
  preparo < 20   → força × 0.35 (35%) + risco lesão +30%
```

**Regra de ouro:** com elenco de 18 jogadores e 38 rodadas, é impossível escalar sempre os mesmos 11. Rotação é obrigatória.

---

## 5. SISTEMA DE MORAL

```
Moral do ELENCO: 0–100 (afeta força coletiva ±10%)
Moral INDIVIDUAL: 0–100 (afeta força individual ±5%)

Eventos que alteram moral do ELENCO:
  Vitória               → +10
  Vitória por goleada   → +18
  Empate                → +2
  Derrota               → -8
  Goleada sofrida       → -18
  Classificação em copa → +12
  Eliminação em copa    → -10
  Rebaixamento iminente → -25  (últimas 5 rodadas, zona)
  Acesso confirmado     → +30
  Título confirmado     → +40
  Salário atrasado      → -20  (por rodada de atraso)
  Artilheiro no elenco  → +5   (por rodada que lidera artilharia)

Eventos que alteram moral INDIVIDUAL:
  Titular recorrente     → +5/rodada
  Reserva constante      → -3/rodada
  Vendido contra vontade → -15 (não afeta mais, sai do elenco)
  Renovação de contrato  → +10
```

---

## 6. TÁTICAS

### 6.1 Formações Disponíveis

```
4-4-2   (clássico, equilibrado)
4-3-3   (ofensivo, vulnerável ao contra)
3-5-2   (pressão no meio, laterais expostos)
4-5-1   (defensivo, contragolpe)
5-3-2   (ultra-defensivo, sufoca ataque)
3-4-3   (ultra-ofensivo, alto risco)
4-2-3-1 (moderno, dois pivôs)
```

### 6.2 Estilos de Jogo

```typescript
interface Tatica {
  formacao: Formacao;
  estiloAtaque: 'DIRETO' | 'TOQUE' | 'CONTRAGOLPE' | 'PRESSAO_ALTA';
  estiloDefesa: 'RECUADA' | 'LINHA_ALTA' | 'PRESSAO' | 'MARCACAO_ZONA';
  ritmo: 'LENTO' | 'NORMAL' | 'RAPIDO';
  foco: 'ATAQUE' | 'EQUILIBRADO' | 'DEFESA';
}
```

### 6.3 Tabela de Confronto Tático (pedra-papel-tesoura)

| Ataque \ Defesa adversária | RECUADA | LINHA_ALTA | PRESSAO | ZONA |
|---|---|---|---|---|
| DIRETO | +5 | -5 | 0 | 0 |
| TOQUE | 0 | +8 | -8 | +3 |
| CONTRAGOLPE | +10 | 0 | -3 | 0 |
| PRESSAO_ALTA | -5 | +5 | +5 | -3 |

Valores = bônus de força efetiva aplicado ao atacante.

---

## 7. ENGINE DE SIMULAÇÃO

### 7.1 Fórmula de Força Efetiva

```typescript
function calcularForcaEfetiva(
  time: TimeEscalado,
  tatica: Tatica,
  adversario: TimeEscalado,
  seed: number
): number {
  // 1. Média dos 11 titulares ponderada por preparo
  const mediaBase = time.titulares.reduce((acc, j) => {
    const fatorPreparo = calcularFatorPreparo(j.preparo);
    return acc + (j.forca * fatorPreparo);
  }, 0) / 11;

  // 2. Bônus de moral coletiva
  const bonusMoral = (time.moral - 50) * 0.10; // ±10%

  // 3. Bônus de mando de campo
  const bonusCasa = time.mandante ? 5 : 0;

  // 4. Bônus/penalidade tática
  const bonusTatica = avaliarConfrontoTatico(tatica, adversario.tatica);

  // 5. Bônus de habilidades especiais
  const bonusHabilidades = calcularBonusHabilidades(time.titulares, tatica);

  return mediaBase + bonusMoral + bonusCasa + bonusTatica + bonusHabilidades;
}
```

### 7.2 Simulação Minuto a Minuto

```typescript
function simularPartida(
  casa: TimeEscalado,
  visitante: TimeEscalado,
  seed: number
): ResultadoPartida {
  const eventos: EventoPartida[] = [];
  let golsCasa = 0;
  let golsVisitante = 0;

  // RNG determinístico via seed
  const rng = criarRNG(seed);

  for (let minuto = 1; minuto <= 90; minuto++) {
    // Recalcular força a cada minuto (substitutos alteram em tempo real)
    const forcaCasa = calcularForcaEfetiva(casa, casa.tatica, visitante, seed);
    const forcaVisitante = calcularForcaEfetiva(visitante, visitante.tatica, casa, seed);
    const total = forcaCasa + forcaVisitante;

    // Probabilidade de gol por minuto (~2.5 gols/jogo média)
    const probEvento = 0.028; // 2.8% por minuto
    if (rng() < probEvento) {
      const probCasa = forcaCasa / total;
      if (rng() < probCasa) {
        golsCasa++;
        const autor = sortearAutorGol(casa.titulares, rng);
        eventos.push({ tipo: 'GOL', minuto, time: 'CASA', jogadorId: autor.id });
      } else {
        golsVisitante++;
        const autor = sortearAutorGol(visitante.titulares, rng);
        eventos.push({ tipo: 'GOL', minuto, time: 'VISITANTE', jogadorId: autor.id });
      }
    }

    // Eventos secundários
    if (rng() < 0.015) eventos.push(sortearEventoSecundario(minuto, rng));
  }

  return { golsCasa, golsVisitante, eventos };
}
```

### 7.3 Tipos de Evento

```typescript
type EventoPartida =
  | { tipo: 'GOL';             minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string; assistenciaId?: string }
  | { tipo: 'GOL_CONTRA';      minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string }
  | { tipo: 'PENALTI_MARCADO'; minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string; convertido: boolean }
  | { tipo: 'FALTA_PERIGOSA';  minuto: number; time: 'CASA' | 'VISITANTE' }
  | { tipo: 'CARTAO_AMARELO';  minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string }
  | { tipo: 'CARTAO_VERMELHO'; minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string }
  | { tipo: 'SUBSTITUICAO';    minuto: number; time: 'CASA' | 'VISITANTE'; saiId: string; entraId: string }
  | { tipo: 'IMPEDIMENTO';     minuto: number; time: 'CASA' | 'VISITANTE' }
  | { tipo: 'DEFESA_DIFICIL';  minuto: number; goleiiroId: string }
  | { tipo: 'TRAVE';           minuto: number; time: 'CASA' | 'VISITANTE'; jogadorId: string };
```

### 7.4 Regra do Cartão Vermelho

```
Cartão vermelho → time joga com 10
Força efetiva reduzida em 12% por jogador a menos
Se houver 2 vermelhos → -24% (raridade alta)
Substituição não pode ser usada para repor expulso se já usou as 3
```

---

## 8. SISTEMA FINANCEIRO

### 8.1 Estrutura

```typescript
interface FinancasClube {
  saldo: number;              // BRL disponível
  folhaSalarial: number;      // débito automático por rodada
  receitaIngresso: number;    // por jogo em casa
  receitaTV: number;          // por rodada (por divisão)
  receitaPatrocinador: number;// por temporada (pago no início)
  premiacao: number;          // copas e torneios
  dividaAtiva: number;        // se saldo negativo persistir
  estadio: Estadio;
}

interface Estadio {
  nome: string;
  capacidade: number;         // torcedores
  ocupacaoMedia: number;      // 0.0–1.0
  precoIngresso: number;      // BRL
  nivelAmpliacaoAtual: number;// 0–5
  custoProximaAmpliacaoao: number;
}
```

### 8.2 Receita por Ingresso

```
receitaIngresso = capacidade × ocupacaoMedia × precoIngresso

ocupacaoMedia é afetada por:
  Performance recente (+/-)
  Fase da temporada (clássicos = 100%)
  Divisão (Série A > B > C)
  Sequência de vitórias em casa

Preço muito alto → ocupacao cai
Preço muito baixo → lucro cai
Ponto ideal: calculado pelo engine a cada jogo
```

### 8.3 Cota TV por Divisão e Posição

```
Série A:
  Campeão       → R$ 120.000.000
  2°–4°         → R$  80.000.000
  5°–8°         → R$  55.000.000
  9°–12°        → R$  38.000.000
  13°–16°       → R$  25.000.000
  17°–20° (Z4)  → R$  18.000.000

Série B:
  Campeão       → R$  18.000.000
  2°–4°(acesso) → R$  14.000.000
  5°–12°        → R$   8.000.000
  13°–20° (Z4)  → R$   4.000.000

Série C:
  Campeão       → R$   5.000.000
  2°–4°(acesso) → R$   3.500.000
  Demais        → R$   1.500.000
```

### 8.4 Estado Crítico — Dívida

```
saldo < 0 por 1 rodada  → aviso ao técnico
saldo < 0 por 3 rodadas → salários atrasam → moral -20
saldo < 0 por 6 rodadas → clube em crise   → técnico pode ser demitido
saldo < 0 por 10 rodadas→ rebaixamento administrativo (independente de campo)
```

---

## 9. MERCADO DE TRANSFERÊNCIAS

### 9.1 Janelas

```
Janela de verão: rodadas 1–5 da temporada (aberta)
Meio de temporada: rodadas 18–20 (aberta por 3 rodadas)
Fora de janela: apenas empréstimos emergenciais (taxa extra 20%)
```

### 9.2 Valuation de Jogador

```typescript
function calcularValor(jogador: Jogador): number {
  const multiplicadorPosicao: Record<Posicao, number> = {
    GOL: 0.8,
    ZAG: 1.0,
    LAT: 0.9,
    VOL: 1.0,
    MEI: 1.1,
    PUN: 1.0,
    ATA: 1.3,
  };

  const fatorIdade = calcularFatorIdade(jogador.idade);
  // pico em 25–29 (1.0), declínio exponencial após 32
  // novato: -40% (risco) | veterano: -20% (fim de carreira)

  const bonusHabilidades = jogador.habilidades.length * 0.10;

  return (
    jogador.forca *
    multiplicadorPosicao[jogador.posicao] *
    fatorIdade *
    (1 + bonusHabilidades) *
    100_000 // escala BRL
  );
}
```

### 9.3 Tipos de Negociação

```typescript
type TipoNegociacao = 'COMPRA' | 'VENDA' | 'EMPRESTIMO' | 'TROCA';

interface Proposta {
  id: string;
  jogadorId: string;
  clubeOfertanteId: string;
  tipo: TipoNegociacao;
  valor: number;
  prazoResposta: number; // rodadas
  salarioOferecido?: number;
  contratoOferecido?: number; // rodadas
}
```

### 9.4 IA de Mercado (clubes adversários)

```
Clubes da Série A buscam jogadores forca > 75
Clubes da Série B buscam jogadores forca 55–75
Clubes da Série C buscam jogadores forca 40–60

A cada 3 rodadas o engine roda calcularPropostasIA()
Probabilidade de proposta = (forca / 100) × fatorDivisaoClube × 0.4
```

---

## 10. SISTEMA DE TREINO

```typescript
type TipoTreino = 'FORCA' | 'TECNICA' | 'VELOCIDADE' | 'PREPARO_FISICO';
type IntensidadeTreino = 'LEVE' | 'NORMAL' | 'INTENSO';

interface SessaoDeTreino {
  jogadorId: string;
  tipo: TipoTreino;
  intensidade: IntensidadeTreino;
}

// Resultados por intensidade:
const efeitoTreino: Record<IntensidadeTreino, EfeitoTreino> = {
  LEVE:    { ganhoAtributo: 0,      ganhoPreparo: +10, custo: 5_000   },
  NORMAL:  { ganhoAtributo: +1,     ganhoPreparo:   0, custo: 15_000  },
  INTENSO: { ganhoAtributo: [+2,+3],ganhoPreparo: -15, custo: 35_000  },
};

// NOVATO: ganho dobrado (potencial de crescimento)
// VETERANO: ganho invertido (treino INTENSO → -1 força)
// Limite: cada atributo pode crescer no máximo +5 por temporada via treino
```

---

## 11. COMPETIÇÕES

### 11.1 Campeonato Nacional (Pontos Corridos)

```
Série A: 20 clubes · 38 rodadas · turno + returno
  Classificação: pontos → saldo de gols → gols pró → confronto direto
  Acesso: top 4 (para Série A, se B) ou título (se C)
  Rebaixamento: últimos 4
  Copa do Brasil: vaga para campeão + vice

Série B: 20 clubes · mesmas regras
Série C: 20 clubes · fase de grupos (2 grupos de 10) + mata-mata
```

### 11.2 Copa do Brasil

```
Formato: mata-mata do 1° ao último round
Rounds: 1ª fase / Oitavas / Quartas / Semis / Final
Mando: sorteio + critério de divisão (Série C joga 1° jogo em casa)
Premiação por fase eliminada:
  1ª fase   → R$ 787.500
  Oitavas   → R$ 1.575.000
  Quartas   → R$ 3.150.000
  Semis     → R$ 5.250.000
  Vice      → R$ 15.750.000
  Campeão   → R$ 73.500.000
```

### 11.3 Rebaixamento com Playoffs (opcional — versão avançada)

```
17° e 18° → rebaixamento direto
19° e 20° → playoff contra 3° e 4° da divisão inferior
Melhor campanha tem mando no 2° jogo
Golsaldo desempata; pênaltis se persistir empate
```

---

## 12. CARREIRA DO TÉCNICO

```typescript
interface Tecnico {
  id: string;
  nome: string;
  reputacao: number;       // 0–100 · cresce com resultados
  historicoClubs: HistoricoClube[];
  titulos: Titulo[];
  estatisticas: EstatisticasTecnico;
}

// Reputação afeta:
// - Quais clubes te contratam (forca do clube ≥ reputacao × 0.8)
// - Salário como técnico
// - Capacidade de convencer jogadores a aceitar contratos menores

// Demissão ocorre se:
//  → 5 derrotas consecutivas na Série A
//  → Rebaixamento após temporada inteira no Z4
//  → Saldo < 0 por 8 rodadas (falência)

// Demitido → você escolhe novo clube disponível na divisão compatível com reputação
```

---

## 13. SISTEMA DE SEED DETERMINÍSTICO

```typescript
// Mulberry32 — PRNG rápido, seed-based, sem crypto
function criarRNG(seed: number): () => number {
  let s = seed;
  return function () {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed da partida = temporada × 10000 + rodada × 100 + indexPartida
// Garante: mesma seed → mesmo resultado (testabilidade, replay, fairness)
// NUNCA usar Math.random() na engine
```

---

## 14. ESTRUTURA DE TIPOS — DOMÍNIO COMPLETO

```typescript
// ─── JOGADOR ───────────────────────────────────────────
type Posicao = 'GOL' | 'ZAG' | 'LAT' | 'VOL' | 'MEI' | 'PUN' | 'ATA';
type TipoJogador = 'NORMAL' | 'NOVATO' | 'VETERANO';
type Habilidade =
  | 'ARTILHEIRO' | 'ASSISTENCIAS' | 'LIDERANCA' | 'DEFENSOR'
  | 'VELOCISTA' | 'FINALIZADOR' | 'CHUTE_LONGO' | 'FALTA'
  | 'CABECEADOR' | 'GOLEIRO_PENALTI';

// ─── TIME ───────────────────────────────────────────────
type Formacao =
  | '4-4-2' | '4-3-3' | '3-5-2' | '4-5-1'
  | '5-3-2' | '3-4-3' | '4-2-3-1';

type EstiloAtaque = 'DIRETO' | 'TOQUE' | 'CONTRAGOLPE' | 'PRESSAO_ALTA';
type EstiloDefesa = 'RECUADA' | 'LINHA_ALTA' | 'PRESSAO' | 'MARCACAO_ZONA';
type Ritmo = 'LENTO' | 'NORMAL' | 'RAPIDO';
type FocoJogo = 'ATAQUE' | 'EQUILIBRADO' | 'DEFESA';

// ─── COMPETIÇÃO ─────────────────────────────────────────
type TipoCompeticao =
  | 'SERIE_A' | 'SERIE_B' | 'SERIE_C'
  | 'COPA_DO_BRASIL' | 'ESTADUAL';

type FormatoCompeticao =
  | 'PONTOS_CORRIDOS' | 'COPA' | 'GRUPOS_MATA_MATA';

// ─── FINANCEIRO ─────────────────────────────────────────
type TipoNegociacao = 'COMPRA' | 'VENDA' | 'EMPRESTIMO' | 'TROCA';
type EstadoFinanceiro = 'SAUDAVEL' | 'ATENCAO' | 'CRITICO' | 'FALENCIA';

// ─── TREINO ─────────────────────────────────────────────
type TipoTreino = 'FORCA' | 'TECNICA' | 'VELOCIDADE' | 'PREPARO_FISICO';
type IntensidadeTreino = 'LEVE' | 'NORMAL' | 'INTENSO';
```

---

## 15. CONSTANTES DO JOGO

```typescript
export const GAME_CONSTANTS = {
  // Elenco
  MIN_JOGADORES_ELENCO: 14,
  MAX_JOGADORES_ELENCO: 28,
  TITULARES: 11,
  MAX_RESERVAS_BANCO: 7,
  MAX_SUBSTITUICOES: 3,

  // Preparo
  PREPARO_INICIAL: 100,
  CONSUMO_TITULAR_90MIN: 20,
  CONSUMO_SUBSTITUTO: 8,
  RECUPERACAO_DESCANSO: 25,
  RISCO_LESAO_THRESHOLD: 20, // preparo abaixo disso → risco

  // Moral
  MORAL_INICIAL: 60,
  MORAL_MIN: 0,
  MORAL_MAX: 100,
  IMPACTO_MORAL_FORCA: 0.10, // ±10%

  // Simulação
  PROB_EVENTO_GOL_POR_MINUTO: 0.028,
  BONUS_MANDO_CAMPO: 5,

  // Carreira
  DERROTAS_CONSECUTIVAS_DEMISSAO_A: 5,
  DERROTAS_CONSECUTIVAS_DEMISSAO_B: 7,
  DERROTAS_CONSECUTIVAS_DEMISSAO_C: 9,

  // Temporada
  RODADAS_SERIE_A: 38,
  RODADAS_SERIE_B: 38,
  TIMES_REBAIXAM: 4,
  TIMES_SOBEM: 4,
} as const;
```

---

## 16. CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1 — Engine Core (sem isso nada funciona)
- [ ] `criarRNG(seed)` — PRNG determinístico
- [ ] `calcularFatorPreparo(preparo)` — tabela de fator
- [ ] `calcularForcaEfetiva(time, tatica, adversario, seed)` — fórmula principal
- [ ] `simularPartida(casa, visitante, seed)` — loop 90 minutos
- [ ] `sortearAutorGol(titulares, rng)` — peso por posição + habilidade ARTILHEIRO
- [ ] `avaliarConfrontoTatico(t1, t2)` — tabela de bônus cruzados
- [ ] `calcularBonusHabilidades(titulares, tatica)` — habilidades especiais

### FASE 2 — Jogadores & Mercado
- [ ] `calcularValor(jogador)` — fórmula de valuation
- [ ] `processarEnvelhecimento(temporada)` — força cai/cresce por idade
- [ ] `calcularPropostasIA()` — geração automática de propostas
- [ ] `processarTreino(sessao)` — ganho por tipo + intensidade
- [ ] `revelarNovato(jogador)` — força oculta revelada no 1° treino

### FASE 3 — Financeiro
- [ ] `calcularReceitaIngresso(estadio, time)` — ocupação × preço
- [ ] `processarFinancasRodada(clube)` — débito folha + receita
- [ ] `distribuirCotaTV(tabela, divisao)` — por posição final
- [ ] `verificarEstadoFinanceiro(clube)` — SAUDAVEL → FALENCIA

### FASE 4 — Competições
- [ ] `gerarCalendario(times, seed)` — round-robin turno+returno
- [ ] `processarResultadoRodada(partidas)` — pontos, saldo, artilharia
- [ ] `processarFimTemporada(tabela)` — acesso, rebaixamento, cota TV
- [ ] `gerarChavesCopa(times)` — mata-mata Copa do Brasil

### FASE 5 — Carreira
- [ ] `atualizarReputacaoTecnico(resultados)` — crescimento/declínio
- [ ] `verificarCondicoesDemissao(clube)` — triggers de demissão
- [ ] `processarContratos(temporada)` — expiração, renovação

---

*BRASFOOT_MASTER.md · Referência para FOTEBALL · Danpazexe/FOTEBALL*

# Proposta Visual — v0.0.2 · Direção "Premium / FIFA-like"

> Proposta para aprovação ANTES de codar. Não commitada (é só direção).
> Base: a `CartaJogador` já é premium (carta SVG com tiers Bronze→Especial). O overhaul
> **propaga esse nível** para o app inteiro + profundidade, gradientes e ouro consistentes.

---

## 1. Princípios da direção

1. **A carta é a estrela.** Tudo gira em torno do jogador como objeto premium (overall, tier, stats).
2. **Profundidade real.** Superfícies elevadas com gradiente sutil + sombra + glow — nada "flat".
3. **Ouro = conquista.** Dourado reservado para momentos de prestígio (título, craque 85+, premiação, recordes). Verde neon segue como cor de ação/marca.
4. **Hierarquia forte.** Números grandes e condensados (overall, placar, saldo); rótulos pequenos em caixa-alta espaçada.
5. **Movimento contido.** Reanimated: entradas suaves, brilho no overall, contagem de números, pulso em alertas — sem exagero.

---

## 2. Design System (a base que tudo herda)

### Paleta (evolui a atual, não substitui)
```
FUNDO        #0A0E1A  (mantém)        SUPERFÍCIE   #131929
PRIMÁRIA     #00E5A0  (verde ação)    SUP. ELEVADA #1B2740 + gradiente p/ #131929
OURO         #FFD600 → #E0A400        GLASS        rgba(255,255,255,0.04) + borda 0.06
PERIGO #FF3B5C · AVISO #FF8A3D · TEXTO #F0F4FF · SEC. #8892A4
```
- **Novo:** `gradientes.card` (superfície→elevada), `gradientes.ouro`, `gradientes.craque` (azul-marinho+ouro), **glow** por tier (sombra colorida atrás da carta/badge).

### Tipografia (escala condensada)
```
Display  44/800  — overall, placar          Título   22/800
Número   28/900  — saldo, métricas grandes   Corpo    15/600
Rótulo   11/800  CAIXA-ALTA +1.5 tracking — labels de métrica
```

### Componentes-chave (repaginados)
- **Botão** — variantes: `primária` (gradiente verde + glow), `ouro` (premium/confirmar grande), `fantasma` (borda). Estado pressionado com `withSpring`.
- **Card / Painel** — gradiente sutil + borda 1px translúcida + sombra. Cabeçalho opcional com faixa de acento.
- **MetricChip** — número grande + rótulo minúsculo; cor do acento por contexto.
- **OverallBadge** — disco com gradiente do tier + glow + anel; conta o número ao aparecer.
- **StatBar** — barra com trilho escuro, preenchimento em gradiente e marca de "fora de posição".

---

## 3. Mockups (telas-chave)

### 3.1 Home — "Mesa do Técnico"
```
┌────────────────────────────────────────────┐
│ ▒▒ gradiente hero (azul-noite + glow verde) │
│  ◯ FLA   Flamengo            ⚙   💰 48,2 mi  │
│          Série A · 3º · 38pts                │
│  forma  ● ● ○ ● ●   (V V E V D, coloridos)  │
├────────────────────────────────────────────┤
│  PRÓXIMO JOGO                  Sáb 12/04     │
│  ┌──────────────────────────────────────┐  │
│  │  FLA  ⚔  PAL      ATA ▰▰▰▰▰▱ 78       │  │
│  │  casa            MEI ▰▰▰▰▱▱ 74        │  │
│  │  ⭐ favorito      DEF ▰▰▰▱▱▱ 71       │  │
│  │  [ Escalar ]      [ ► JOGAR ]  (ouro) │  │
│  └──────────────────────────────────────┘  │
│  ⚠ AVISOS                                   │
│  🩹 Pedro — lesão (8d)   ▾ pulsa em vermelho │
│  ⏱ Copa: oitavas qua.                        │
├────────────────────────────────────────────┤
│  ÚLTIMA PARTIDA   FLA 2 × 1 SAN   ▸ súmula   │
│  📰 Mercado: COR contratou Yuri (BAH)        │
└────────────────────────────────────────────┘
```
Mudança: header com gradiente + saldo em destaque, card do próximo jogo com barras de força em gradiente e CTA "JOGAR" dourado, avisos com pulso.

### 3.2 PlayerDetail — perfil premium
```
┌────────────────────────────────────────────┐
│  ‹ voltar                         ◉ 88      │  ← OverallBadge com glow do tier
│        ╔══════════════╗   Neymar Jr         │
│        ║   CARTA      ║   PE · 32 anos · BRA │
│        ║   FIFA-like  ║   [Veterano] [★Líder]│  ← chips: tipo + habilidades
│        ║   88  PE     ║                      │
│        ╚══════════════╝                      │
│  EVOLUÇÃO                                    │
│  Overall 88 ──────────●───── Potencial 88    │
│  ▰▰▰▰▰▰▰▰▰▱  "No teto"                       │
│  💰 valor 62 mi   ·   salário 1,2 mi         │
├────────────────────────────────────────────┤
│  RADAR              ATRIBUTOS                 │
│     FIN                FIN ▰▰▰▰▰▱ 86         │
│   ╱  •  ╲             DRI ▰▰▰▰▰▰ 91 ▲treino  │
│  VEL   PAS            VEL ▰▰▰▰▱▱ 80          │
│   ╲  •  ╱             PAS ▰▰▰▰▰▱ 84          │
│     DRI                ...                    │
├────────────────────────────────────────────┤
│  [ 💰 Vender ]   [ ⇄ Emprestar ]  (fantasma)│
└────────────────────────────────────────────┘
```
Mudança: carta + badge com glow do tier, chips de tipo/habilidade dourados, barra evolução, radar + stat bars lado a lado, ações em rodapé fixo.

### 3.3 Partida ao vivo — o momento emocional
```
┌────────────────────────────────────────────┐
│  ▒ placar premium (faixas dos times + ouro) │
│   FLA   2  —  1   PAL        73'   ⏸         │
│        ▰▰▰▰▰▰▰▰░░░  posse 62%               │
├────────────────────────────────────────────┤
│                                              │
│   45' ⚽  GOOOL! Pedro (assist. Arrascaeta)  │  ← balão entra (SlideIn), brilho
│        ╰ FLA 2×1                             │
│   38' 🟨  Gerson                             │
│   30' ⚽  Pelé · PAL                          │
│   18' ⛔  chance perdida — Bruno H.          │
│                                              │
├────────────────────────────────────────────┤
│  [ ⇄ Subs ]   [ ►► Simular ]   [ ⏸ Pausar ] │
└────────────────────────────────────────────┘
```
Mudança: placar SVG com profundidade + barra de posse, eventos como balões animados com ícones e cor por time, gol com flash dourado + som.

### 3.4 Elenco — grade de cartas
```
┌────────────────────────────────────────────┐
│  ELENCO   28 jogadores      filtro: [Todos] │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  88 PE  │ │  84 CA  │ │  82 MEI │   ← mini-cartas (tier color + glow)
│  │ Neymar  │ │ Pedro   │ │ Arrasca │        │
│  │ ▰▰▰▰▰▱  │ │ ▰▰▰▰▱▱  │ │ ▰▰▰▰▰▱  │        │
│  └─────────┘ └─────────┘ └─────────┘        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│  │  79 ZAG │ │  76 LD  │ │  74 GOL │        │
│  │ ...     │ │ ...     │ │ ...     │        │
│  └─────────┘ └─────────┘ └─────────┘        │
└────────────────────────────────────────────┘
```
Mudança: lista vira **grade de mini-cartas** no estilo da CartaJogador (tier + glow + 1 stat-bar), toque abre o perfil.

---

## 4. Plano de implementação (faseado)

| Fase | Entrega | Risco |
|---|---|---|
| **F1 — Design system** | tokens (gradientes/glow/tipografia) + `Botão`/`Card`/`MetricChip`/`OverallBadge`/`StatBar` repaginados | baixo (herda em tudo) |
| **F2 — Home + PlayerDetail** | as 2 telas mais vistas no novo padrão | baixo |
| **F3 — Partida ao vivo + Súmula** | placar premium + balões animados + flash de gol | médio |
| **F4 — Elenco (grade) + Tática** | grade de mini-cartas + campo tático polido | médio |
| **F5 — Telas restantes** | Mercado, Clube, Competição, Copa, Carreira… herdam o DS | baixo |

Cada fase: `typecheck`/`lint`/`jest` verdes + commit. Sem mudar lógica (só visual/componentes).

---

## 5. Decisão

1. **A direção acima te agrada?** (paleta + profundidade + ouro-conquista + cartas propagadas)
2. **Quer que eu gere mockups de ALTA FIDELIDADE no Figma** (telas reais, navegáveis) antes de codar, ou os ASCII já bastam pra eu começar a F1?
3. **Por qual tela começo** depois do design system? (sugiro Home → PlayerDetail)

Ajusta o que quiser que eu refaço a proposta.

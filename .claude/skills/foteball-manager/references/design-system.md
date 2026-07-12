# Direção do design system

## Sumário

1. Conceito
2. Cores
3. Tipografia
4. Layout
5. Componentes
6. Iconografia
7. Movimento
8. Acessibilidade

## 1. Conceito

Criar uma “Sala de Análise”: interface esportiva limpa, precisa e brasileira. Usar neutros como base e cor para significado. Manter aparência de jogo, não dashboard corporativo.

## 2. Cores

Tema claro sugerido:

| Token | Valor |
|---|---|
| canvas | `#F4F6F8` |
| surface | `#FFFFFF` |
| surfaceSubtle | `#F8FAFB` |
| border | `#E1E7EB` |
| textPrimary | `#101820` |
| textSecondary | `#5B6773` |
| brand | `#13A65A` |
| brandStrong | `#0A7F45` |
| brandSoft | `#E7F7EE` |
| accent | `#F2B43C` |
| info | `#2878F0` |
| warning | `#C98200` |
| danger | `#D64545` |

Tema escuro sugerido:

| Token | Valor |
|---|---|
| canvas | `#0B1115` |
| surface | `#121A20` |
| surfaceSubtle | `#172128` |
| border | `#27343D` |
| textPrimary | `#F2F6F8` |
| textSecondary | `#A9B4BC` |
| brand | `#31C776` |
| brandStrong | `#22AD64` |
| accent | `#FFC857` |
| info | `#62A0FF` |
| warning | `#F1B94B` |
| danger | `#FF6B63` |

Usar cor do clube apenas em escudo, filete, avatar ou detalhe. Não pintar toda tela.

## 3. Tipografia

- Barlow: corpo, título, label e navegação.
- Barlow Condensed: placar, overall, posição e números de impacto.
- Empacotar TTFs estáticos quando a fase de fontes for autorizada.
- Aplicar `tabular-nums` a dados em coluna.
- Respeitar fonte dinâmica; não esconder conteúdo crítico com auto-shrink.

## 4. Layout

- Grid de 4 pontos.
- Margem padrão 16–20.
- Touch target 44 mínimo, 48 preferencial.
- Raios: 8 em compactos, 12 em padrão, 16 em destaques.
- Usar borda/diferença de superfície antes de sombra.
- Um CTA dominante por tela.
- Até três indicadores prioritários antes da rolagem.

## 5. Componentes

Centralizar tokens e componentes. Telas compõem; não recriam Button, Card, Chip, AppBar, Dialog, ListItem, StatValue, TeamCrest, MatchCard ou estados de feedback.

Estados obrigatórios quando aplicáveis:

- default;
- pressed/focused;
- disabled;
- loading;
- empty;
- error/retry;
- success.

Evitar card dentro de card, cards para linhas simples, glow comum e gradiente decorativo.

## 6. Iconografia

- Manter `lucide-react-native` pelo registry `src/components/Icone`.
- Usar nomes semânticos do domínio.
- Não misturar famílias.
- Criar SVG próprio para gol, cartão, VAR, impedimento e outros eventos quando Lucide for insuficiente.
- Não usar emoji funcional.

## 7. Movimento

- Reanimated para código novo/tocado.
- Press: 90–140 ms.
- Entrada: 180–220 ms.
- Sheet/modal: 240–320 ms.
- Animar mudança de estado, não decoração.
- Respeitar redução de movimento.

## 8. Acessibilidade

- Contraste WCAG AA.
- Rótulos com contexto.
- Não depender somente de cor.
- VoiceOver/TalkBack nos fluxos críticos.
- Tabelas com leitura por linha.
- Fonte ampliada sem corte.
- Foco correto em modal/sheet.

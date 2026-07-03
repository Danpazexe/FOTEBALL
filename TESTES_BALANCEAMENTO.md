# TESTES_BALANCEAMENTO.md
> Estratégia de testes e balanceamento para a core do FOTEBALL.

---

## 1. Objetivo

Garantir que o FOTEBALL seja jogável por várias temporadas, sem quebrar estado, save, tabela, mercado ou simulação.

Este documento define quais testes criar, quais métricas medir e quais faixas de balanceamento considerar saudáveis.

---

## 2. Comandos obrigatórios

Antes de concluir qualquer tarefa:

```bash
npm run typecheck
npm run lint
npm run test
```

Para depuração local, usar também:

```bash
npm test -- --watch
npm test -- formationValidation
npm test -- matchBalance
npm test -- seasonFlow
```

---

## 3. Pirâmide de testes

### Unitários

Para funções puras da engine.

Exemplos:

```txt
validarFormacao
calcularForcaTime
calcularProbabilidades
simularPartida
calcularValor
respostaIAProposta
gerarCalendarioLiga
verificarDemissao
```

### Integração leve

Para fluxo de store sem renderizar o app inteiro.

Exemplos:

```txt
iniciarNovaCarreira
avancarRodada
finalizarTemporada
salvarJogo/carregarJogo
processarMercadoIA
```

### Smoke tests

Garantem que estado inicial e dados essenciais existem.

Exemplos:

```txt
20 clubes na Série A
380 partidas no calendário
jogadores carregados
tabela com 20 linhas
```

---

## 4. Testes de escalação

### Arquivo sugerido

```txt
src/engine/tactics/__tests__/formationValidation.test.ts
```

### Casos obrigatórios

```txt
1. aceita formação válida
2. rejeita formação sem goleiro
3. rejeita formação com dois goleiros
4. rejeita menos de 11 titulares
5. rejeita mais de 11 titulares
6. rejeita jogador repetido
7. rejeita jogador lesionado
8. rejeita jogador suspenso
9. rejeita jogador de outro clube
10. rejeita defesa insuficiente
11. rejeita meio insuficiente
12. rejeita ataque insuficiente
13. avisa jogador improvisado
14. avisa condição física baixa
```

### Critério de pronto

```txt
✅ nenhuma formação inválida passa
✅ warnings não bloqueiam formação válida
✅ mensagens são claras
```

---

## 5. Testes de RNG/determinismo

### Regra

Mesma seed e mesmo input devem gerar mesmo output.

### Casos

```txt
simularPartida(A, B, seed 42) === simularPartida(A, B, seed 42)
simularPartida(A, B, seed 42) !== necessariamente simularPartida(A, B, seed 43)
```

### Critério de pronto

```txt
✅ engine reproduz resultado com mesma seed
✅ testes não flutuam aleatoriamente
```

---

## 6. Testes de força do time

### Casos

```txt
- jogador fora de posição reduz força
- jogador cansado reduz força
- moral alta aumenta levemente força
- moral baixa reduz levemente força
- goleiro bom melhora defesa efetiva
- expulsão/indisponível reduz força
- tática altera linhas de força
```

### Critério de pronto

```txt
✅ força reage ao estado do elenco
✅ nenhum fator gera explosão absurda
```

---

## 7. Laboratório de balanceamento

### Arquivo sugerido

```txt
src/engine/simulation/__tests__/matchBalance.test.ts
```

Ou script:

```txt
scripts/balanceMatches.ts
```

### Função sugerida

```ts
interface BalanceMetrics {
  jogos: number;
  mediaGols: number;
  taxaEmpate: number;
  taxaVitoriaCasa: number;
  taxaVitoriaFora: number;
  taxaGoleada: number;
  mediaCartoes: number;
  taxaPenalti: number;
  taxaLesao: number;
}
```

### Cenários mínimos

```txt
A. times parelhos
B. mandante forte x visitante fraco
C. mandante fraco x visitante forte
D. tática ofensiva x defensiva
E. pressão alta x posse
F. contra-ataque x linha adiantada
```

---

## 8. Faixas-alvo de balanceamento

### Times parelhos

```txt
Gols por jogo: 2.4 a 3.1
Empates: 22% a 30%
Vitória mandante: 42% a 50%
Vitória visitante: 25% a 35%
Goleadas: abaixo de 10%
```

### Time forte x fraco

```txt
Diferença +10 overall: forte vence 50% a 65%
Diferença +20 overall: forte vence 65% a 80%
Empate/zebra continuam possíveis
```

### Eventos

```txt
Pênalti: ocasional, não toda partida
Cartões: frequentes o suficiente para importar
Vermelhos: raros
Lesões: raras, mas relevantes
```

---

## 9. Testes de calendário

### Arquivo sugerido

```txt
src/engine/season/__tests__/calendarGenerator.test.ts
```

### Casos

```txt
- gera 380 partidas para 20 clubes
- gera 38 rodadas
- cada rodada tem 10 jogos
- clube não joga contra si mesmo
- mandos invertem no returno
- datas são crescentes
```

---

## 10. Teste de temporada completa

### Arquivo sugerido

```txt
src/store/__tests__/seasonFlow.store.test.ts
```

### Fluxo

```txt
1. iniciar nova carreira
2. avançar rodadas até 38
3. validar que todas as partidas foram jogadas
4. validar tabela
5. finalizar temporada
6. validar nova temporada
7. validar envelhecimento/evolução
8. validar acesso/rebaixamento
```

### Critério de pronto

```txt
✅ nenhuma rodada trava
✅ tabela não perde clube
✅ partidas não duplicam
✅ temporada seguinte nasce coerente
```

---

## 11. Testes de mercado

### Arquivos sugeridos

```txt
src/engine/transfers/__tests__/negociacaoEngine.test.ts
src/engine/transfers/__tests__/mercadoIA.test.ts
```

### Casos

```txt
- proposta acima do limite é aceita
- proposta baixa é recusada
- proposta intermediária gera contraproposta
- clube sem saldo não compra
- IA compra jogador que melhora elenco
- IA não compra jogador emprestado quando regra proíbe
- vendedor recebe dinheiro
- comprador perde dinheiro
- jogador muda de clube
```

---

## 12. Testes de finanças

### Casos

```txt
- bilheteria entra no caixa
- treino debita custo
- contratação debita custo
- venda credita valor
- saldo negativo aumenta rodadas no vermelho
- salário atrasado reduz moral
- falência gera demissão
```

---

## 13. Testes de save/load

### Arquivo sugerido

```txt
src/store/__tests__/persistence.test.ts
```

### Casos

```txt
- monta snapshot completo
- aplica snapshot completo
- carrega save principal
- fallback para backup
- erro quando principal e backup falham
- migração preserva dados importantes
- save no meio da temporada
- save no fim da temporada
```

---

## 14. Testes de UI críticos

A UI não precisa cobrir tudo no início, mas telas críticas devem ser testadas quando estabilizadas.

Prioridade:

```txt
- tela de escalação mostra erro de formação inválida
- pré-jogo mostra alertas
- partida mostra placar/eventos
- mercado mostra propostas
```

---

## 15. O que não testar agora

Evitar no início:

```txt
- snapshot visual complexo
- testes frágeis de layout pixel-perfect
- testes E2E pesados antes da core estabilizar
```

---

## 16. Checklist de balanceamento antes de mexer na engine

Antes de ajustar probabilidade:

```txt
[ ] rode laboratório com números atuais
[ ] salve métricas antes
[ ] altere um parâmetro por vez
[ ] rode laboratório depois
[ ] compare diferenças
[ ] escreva resumo do impacto
```

---

## 17. Definição de core confiável

```txt
✅ escalação inválida bloqueada
✅ seed determinística
✅ calendário consistente
✅ temporada completa passa
✅ save/load funciona
✅ mercado não gera absurdo
✅ balanceamento dentro da faixa
✅ testes automatizados protegem mudanças
```

---

*TESTES_BALANCEAMENTO.md · Estratégia de qualidade e balanceamento*

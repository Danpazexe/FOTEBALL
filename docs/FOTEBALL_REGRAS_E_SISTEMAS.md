# FOTEBALL — Regras e Sistemas

> Especificação funcional dos sistemas de jogo.

---

## 1. Escalação

### Regras obrigatórias

- O time deve ter exatamente 11 titulares.
- Deve existir exatamente 1 goleiro.
- Deve haver no mínimo 3 jogadores defensivos.
- Deve haver no mínimo 2 meio-campistas.
- Deve haver no mínimo 1 atacante.
- Jogadores lesionados não podem ser escalados.
- Jogadores suspensos não podem ser escalados.
- Jogadores duplicados na escalação são inválidos.

### Penalidades

Jogador fora da posição principal pode jogar, mas com redução.

| Situação | Penalidade sugerida |
|---|---:|
| Posição secundária | -5% desempenho |
| Setor parecido | -10% desempenho |
| Setor muito diferente | -20% desempenho |
| Goleiro fora do gol | inválido |
| Linha no gol | inválido |

---

## 2. Condição Física

A condição física representa o estado atual do jogador.

### Escala

| Condição | Interpretação |
|---:|---|
| 90–100 | excelente |
| 75–89 | boa |
| 55–74 | aceitável |
| 35–54 | cansado |
| 0–34 | muito cansado |

### Efeitos

- Condição alta aumenta consistência.
- Condição baixa reduz aceleração, marcação e tomada de decisão.
- Jogador muito cansado tem maior risco de lesão.
- Pressão alta consome mais condição.

---

## 3. Moral

A moral representa confiança e satisfação.

### Fatores que aumentam moral

- Vitória.
- Gol marcado.
- Boa atuação.
- Sequência como titular.
- Renovação positiva.
- Classificação boa.
- Título ou acesso.

### Fatores que reduzem moral

- Derrota.
- Banco prolongado.
- Salário atrasado.
- Proposta recusada.
- Má fase.
- Rebaixamento.
- Eliminação.

### Impacto

| Moral | Impacto |
|---:|---|
| 80–100 | bônus leve de desempenho |
| 50–79 | normal |
| 25–49 | instável |
| 0–24 | queda clara de desempenho |

---

## 4. Overall e Potencial

### Overall

Representa o nível atual do jogador.

### Potencial

Representa teto estimado de evolução.

### Evolução

Jogador evolui com base em:

- idade;
- potencial;
- minutos jogados;
- forma;
- treino;
- moral;
- divisão em que atua;
- comissão/estrutura do clube.

### Declínio

Jogadores mais velhos podem perder atributos físicos.

Fatores:

- idade acima de 30;
- lesões;
- baixa condição;
- poucos jogos;
- moral baixa.

---

## 5. Faixas de Carta

| Overall | Nível |
|---:|---|
| 0–64 | Bronze |
| 65–74 | Prata |
| 75–84 | Ouro |
| 85–89 | Lendário |
| 90–100 | Especial |

Uso:

- Card de jogador.
- Badge de overall.
- Destaques de elenco.
- Mercado.
- Tela de comparação.

---

## 6. Tática

### Elementos básicos

- Formação.
- Mentalidade.
- Pressão.
- Linha defensiva.
- Estilo de passe.
- Intensidade.
- Ataque pelas pontas.
- Jogo central.
- Contra-ataque.
- Posse de bola.

### Mentalidades

| Mentalidade | Efeito |
|---|---|
| Defensiva | menos chances, menos risco |
| Equilibrada | padrão |
| Ofensiva | mais chances, mais risco |
| Tudo ou nada | muita chance, muito risco |

---

## 7. Simulação de Partida

### Entradas

- Força dos titulares.
- Banco.
- Tática.
- Moral.
- Condição.
- Mando de campo.
- Forma recente.
- Força do adversário.
- Eventos aleatórios por seed.

### Saídas

- Placar.
- Eventos.
- Estatísticas.
- Notas de jogadores.
- Moral pós-jogo.
- Condição pós-jogo.
- Lesões/suspensões se aplicável.

### Eventos possíveis

- Gol.
- Cartão amarelo.
- Cartão vermelho.
- Lesão.
- Defesa difícil.
- Bola na trave.
- Substituição.
- Pressão final.
- Fim de jogo.

---

## 8. Estatísticas da Partida

Mínimo recomendado:

- posse;
- finalizações;
- finalizações no alvo;
- escanteios;
- faltas;
- cartões;
- xG simplificado;
- melhor jogador;
- nota média do time.

---

## 9. Campeonato

### Série A, B e C

Cada divisão deve ter:

- tabela;
- rodadas;
- turno e returno;
- pontuação;
- saldo de gols;
- gols pró;
- vitórias;
- acesso/rebaixamento.

### Pontuação

- Vitória: 3 pontos.
- Empate: 1 ponto.
- Derrota: 0 pontos.

### Critérios de desempate

1. Pontos.
2. Vitórias.
3. Saldo de gols.
4. Gols pró.
5. Confronto direto, se implementado.
6. Sorteio por seed.

---

## 10. Acesso e Rebaixamento

Regra base:

- 4 sobem.
- 4 descem.

Pode ser ajustado depois conforme divisão e competição.

---

## 11. Copa Nacional

Formato sugerido:

- Mata-mata.
- Jogo único nas fases iniciais.
- Ida e volta nas fases finais.
- Premiação por fase.
- Peso alto na moral da torcida e diretoria.

---

## 12. Mercado

### Preço do jogador

Fatores:

- overall;
- potencial;
- idade;
- posição;
- contrato;
- salário;
- forma;
- moral;
- raridade da posição;
- situação financeira;
- divisão do clube;
- interesse de mercado.

### Estados de negociação

```txt
sem_interesse
monitorando
proposta_recebida
em_negociacao
aceita
recusada
cancelada
concluida
```

### Tipos

- compra;
- venda;
- empréstimo;
- renovação;
- pré-contrato;
- jogador livre.

---

## 13. IA de Mercado

Clubes controlados pela IA devem:

- buscar posições carentes;
- vender jogadores caros se estiverem mal financeiramente;
- renovar atletas importantes;
- contratar jovens se tiverem perfil formador;
- contratar veteranos se buscarem resultado imediato;
- evitar gastar acima do orçamento.

---

## 14. Contratos

Campos recomendados:

```ts
type Contrato = {
  jogadorId: string;
  clubeId: string;
  salario: number;
  inicioTemporada: number;
  fimTemporada: number;
  multa?: number;
  status: 'ativo' | 'expirando' | 'encerrado';
};
```

Regras:

- Contrato vencido libera jogador.
- Contrato curto reduz valor de mercado.
- Renovação pode exigir aumento.
- Jogador insatisfeito pode recusar.
- Clube sem caixa pode perder atleta.

---

## 15. Finanças

### Receitas

- Bilheteria.
- Patrocínio.
- Cota de TV.
- Premiação.
- Venda de jogadores.
- Títulos.
- Acesso.

### Despesas

- Salários.
- Transferências.
- Luvas.
- Manutenção.
- Estrutura.
- Base.
- Rescisões.

### Indicadores

- saldo atual;
- folha salarial;
- orçamento de transferências;
- projeção mensal;
- risco financeiro.

---

## 16. Diretoria

A diretoria define expectativas:

- lutar por título;
- classificar em cima;
- meio de tabela;
- evitar rebaixamento;
- subir de divisão;
- reduzir folha;
- revelar jogadores.

Falhar objetivos reduz reputação do técnico.

---

## 17. Reputação do Técnico

A reputação sobe com:

- títulos;
- acessos;
- campanhas acima da expectativa;
- desenvolvimento de jogadores;
- estabilidade financeira.

Cai com:

- rebaixamento;
- eliminações ruins;
- crise financeira;
- má sequência;
- elenco insatisfeito.

---

## 18. Notícias

As notícias devem contextualizar eventos.

Exemplos:

```txt
Diretoria cobra reação após sequência ruim.
Atacante vive grande fase e atrai interesse.
Clube recebe proposta milionária por promessa.
Torcida esgota ingressos para decisão.
Meia titular sente lesão e vira dúvida.
```

---

## 19. Conquistas

Sugestões:

- Primeira vitória.
- Primeiro título.
- Acesso conquistado.
- Invicto por 10 jogos.
- Artilheiro do campeonato.
- Melhor defesa.
- Clube sem dívidas.
- Revelou uma promessa.
- Venceu clássico.
- Virada histórica.

---

## 20. Balanceamento

O jogo deve evitar:

- placares absurdos frequentes;
- evolução muito rápida;
- dinheiro infinito;
- mercado fácil demais;
- IA passiva;
- jogadores 90+ em excesso;
- lesões exageradas;
- moral irrelevante.

A simulação deve ser divertida antes de ser perfeita.

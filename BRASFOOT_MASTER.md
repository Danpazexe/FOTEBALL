# BRASFOOT_MASTER.md
> Documento-mestre de domínio do FOTEBALL. Use como referência principal de regras, mecânicas, balanceamento e comportamento esperado do jogo.

---

## 1. Identidade do jogo

**FOTEBALL** é um jogo mobile de gerenciamento de futebol brasileiro, inspirado em Brasfoot/Soccer Manager, com foco em decisões rápidas, temporada longa e sensação de carreira.

O jogador assume um clube, escala o time, ajusta tática, treina o elenco, negocia jogadores, administra finanças, disputa liga e copa, tenta conquistar títulos, subir de divisão ou evitar rebaixamento.

### Objetivo de design

O jogo deve ser simples de entender, mas profundo o suficiente para gerar decisões reais.

O jogador precisa sentir que:

- escalação importa;
- condição física importa;
- moral importa;
- dinheiro importa;
- tática importa;
- mercado importa;
- planejamento de temporada importa;
- uma zebra pode acontecer, mas qualidade ainda pesa.

---

## 2. Loop principal

```txt
Escolher clube
↓
Ver elenco, tabela, calendário e finanças
↓
Treinar / ajustar escalação / mexer na tática
↓
Jogar ou simular partida
↓
Atualizar tabela, estatísticas, moral, condição, caixa e reputação
↓
Receber notícias, propostas e eventos
↓
Avançar rodada
↓
Fim da temporada: evolução, acesso/rebaixamento, premiações, contratos e nova temporada
```

O loop precisa ser rápido, mas com decisões suficientes para gerar apego ao save.

---

## 3. Divisões e competições

### Liga nacional

- Série A: 20 clubes, pontos corridos, 38 rodadas.
- Série B: 20 clubes, pontos corridos, 38 rodadas.
- Série C: pode iniciar simplificada com 20 clubes, estrutura adaptada conforme dados disponíveis.

### Acesso e rebaixamento

- Top 4 sobem de divisão.
- Últimos 4 descem de divisão.
- Se a divisão inferior ou superior não existir no banco, o sistema deve degradar com segurança, sem quebrar a temporada.

### Copa do Brasil

Competição mata-mata paralela à liga.

Fases mínimas:

```txt
Oitavas
Quartas
Semifinal
Final
```

Critérios:

- jogo eliminatório;
- empate pode ir para pênaltis quando configurado;
- premiação por avanço;
- título gera moral, reputação e dinheiro.

---

## 4. Clubes

Cada clube deve possuir:

```txt
id
nome
sigla
divisao
reputacao
estadio
financas
elenco
formacaoAtual
taticaAtual
controladoPorIA
```

### Reputação do clube

A reputação influencia:

- exigência da diretoria;
- capacidade de atrair jogadores;
- cota financeira;
- pressão por resultado;
- vantagem simbólica de mando;
- expectativa de temporada.

### Objetivos da diretoria

Cada clube deve ter expectativa compatível com seu tamanho.

| Perfil do clube | Objetivo típico |
|---|---|
| Gigante Série A | título / G4 |
| Grande Série A | Libertadores / título possível |
| Médio Série A | meio de tabela / Sul-Americana |
| Pequeno Série A | evitar rebaixamento |
| Forte Série B | acesso |
| Médio Série B | brigar por acesso |
| Pequeno Série B/C | permanência |

O objetivo deve impactar reputação e risco de demissão.

---

## 5. Jogadores

Cada jogador deve possuir, no mínimo:

```txt
id
nome
idade
nacionalidade
clubeId
posicaoPrincipal
posicoesSecundarias
perna
overall
potencial
atributos
condicaoFisica
moral
forma
valorMercado
salario
contratoAte
lesionado
suspenso
estatisticasTemporada
historicoTemporadas
habilidades
tipo
```

### Posições

```txt
GOL  = goleiro
ZAG  = zagueiro
LD   = lateral direito
LE   = lateral esquerdo
VOL  = volante
MC   = meio-campista central
MEI  = meia ofensivo
PD   = ponta direita
PE   = ponta esquerda
SA   = segundo atacante
CA   = centroavante
```

### Linhas do campo

```txt
Defesa: GOL, ZAG, LD, LE
Meio: VOL, MC, MEI
Ataque: PD, PE, SA, CA
```

---

## 6. Escalação e formação

A escalação é uma regra central do jogo. Não pode depender apenas da UI.

### Regras obrigatórias

Uma formação válida deve ter:

- exatamente 11 titulares;
- exatamente 1 goleiro;
- nenhum jogador repetido;
- todos os jogadores pertencentes ao clube;
- nenhum titular lesionado;
- nenhum titular suspenso;
- mínimo de 3 defensores de linha;
- mínimo de 2 meio-campistas;
- mínimo de 1 atacante.

### Warnings permitidos

A formação pode ser válida, mas gerar aviso:

- jogador improvisado;
- jogador com condição física baixa;
- jogador com moral muito baixa;
- falta de profundidade no banco;
- muitos jogadores cansados.

### Improviso

Jogador fora da posição principal pode atuar, mas deve perder rendimento conforme adaptação:

```txt
Posição principal: fator 1.00
Posição secundária: fator 0.92 a 0.96
Mesma linha: fator 0.82 a 0.90
Linha próxima: fator 0.70 a 0.80
Linha oposta: fator 0.55 a 0.65
```

Exemplo:

- LD jogando LE: penalidade leve.
- MC jogando MEI: penalidade baixa/moderada.
- ZAG jogando CA: penalidade pesada.
- GOL fora do gol: deve ser bloqueado ou tratado como improviso extremo, conforme regra implementada.

---

## 7. Tática

A tática deve criar escolhas com vantagens e riscos.

### Estilo ofensivo

```txt
Equilibrado
Posse de bola
Contra-ataque
Ataque direto
```

### Marcação

```txt
Zona
Individual
Pressão alta
```

### Ritmo

```txt
Lento
Normal
Intenso
```

### Linha defensiva

```txt
Recuada
Normal
Adiantada
```

### Princípio de design

Nenhuma tática deve ser sempre melhor. Toda escolha forte deve ter custo.

Exemplos:

- Pressão alta aumenta recuperação e intensidade, mas aumenta cartões, pênaltis, fadiga e lesões.
- Linha adiantada aumenta pressão e ataque, mas abre espaço para contra-ataque.
- Posse controla o meio, mas pode sofrer contra pressão alta.
- Contra-ataque pune time exposto, mas sofre se o adversário jogar recuado.

---

## 8. Força do time

A força do time não deve ser apenas média de overall.

Ela deve considerar:

- overall dos titulares;
- posição escalada;
- adaptação à posição;
- condição física;
- moral;
- forma;
- atributos específicos;
- habilidades especiais;
- tática;
- força do goleiro separada;
- expulsões/lesões durante a partida.

### Linhas de força

```txt
ataque
defesa
meio
forcaGoleiro
overallEfetivo
```

### Condição física

Referência de fator físico:

```txt
80–100: 1.00
60–79 : 0.90
40–59 : 0.75
20–39 : 0.55
0–19  : 0.35
```

Jogador abaixo de 40 deve gerar alerta.
Jogador abaixo de 20 deve render muito menos e ter risco maior de lesão.

---

## 9. Simulação da partida

A partida deve ser determinística quando recebe a mesma seed.

### Princípios obrigatórios

- Mesma seed + mesmo estado = mesmo resultado.
- Não usar `Math.random()` na engine.
- RNG deve ser injetado ou criado a partir de seed.
- Partidas devem gerar eventos coerentes.
- O resultado deve refletir força, tática e contexto, mas manter incerteza.

### Eventos mínimos

```txt
gol
assistência
cartão amarelo
cartão vermelho
lesão
pênalti
substituição
chance narrativa
fim de jogo
```

### Métricas-alvo de balanceamento

Para partidas entre times parelhos:

```txt
Gols por jogo: 2.4 a 3.1
Empates: 22% a 30%
Vitória mandante: 42% a 50%
Goleadas: raras, mas possíveis
Pênaltis: ocasionais, não frequentes demais
Cartões: presentes, mas sem excesso
Lesões: raras, mas relevantes
```

### Time forte x fraco

O time forte deve vencer mais, mas não automaticamente.

```txt
Time +10 overall: vantagem clara
Time +20 overall: domínio frequente
Zebra: possível
Massacre: raro
```

---

## 10. Moral

A moral afeta rendimento e narrativa.

### Eventos de moral

```txt
Vitória: sobe
Derrota: cai
Empate contra favorito: pode subir
Empate contra fraco: pode cair
Título: sobe muito
Rebaixamento: cai muito
Salário atrasado: cai forte
Conversa com o grupo: sobe moderado
Jogador sem jogar: pode cair
Proposta recusada: pode cair
```

### Faixas

```txt
0–25   crise
26–45  baixa
46–65  normal
66–85  boa
86–100 excelente
```

Impacto recomendado:

```txt
moral 0   ≈ -10% rendimento
moral 50  ≈ neutro
moral 100 ≈ +10% rendimento
```

---

## 11. Condição física, lesões e suspensão

### Condição física

A condição deve cair com jogos e treinos intensos, e subir com descanso/treino leve.

Referência:

```txt
Titular 90 min: queda relevante
Substituto: queda leve
Treino leve: recupera ou pouco impacta
Treino normal: equilíbrio
Treino intenso: melhora treino, mas cansa e aumenta risco
```

### Lesões

Lesão pode acontecer por:

- partida;
- treino intenso;
- condição física muito baixa;
- ritmo intenso;
- excesso de sequência.

### Suspensão

Suspensão deve considerar:

- cartão vermelho;
- acúmulo de amarelos;
- retorno após cumprir jogos.

---

## 12. Treino

Treino deve ter impacto real, mas sem permitir exploração infinita.

### Tipos sugeridos

```txt
Físico
Finalização
Defesa
Passe
Tático
Goleiros
Bola parada
```

### Intensidade

```txt
Leve: baixo risco, ajuda condição
Normal: equilíbrio
Intenso: maior ganho, maior custo, maior risco
```

Treino deve impactar:

- atributos;
- condição física;
- risco de lesão;
- moral em alguns casos;
- custo financeiro.

---

## 13. Evolução e envelhecimento

A progressão deve ser anual e/ou por desempenho.

### Jovens

Jogadores jovens evoluem mais quando:

- têm potencial alto;
- jogam partidas;
- têm boa nota média;
- estão em clube com boa infraestrutura;
- treinam bem.

### Auge

Faixa ideal:

```txt
25–29 anos: auge
30–32 anos: início de declínio leve
33+: declínio mais forte, salvo bom desempenho
```

### Valor de mercado

O valor deve considerar:

- overall;
- idade;
- posição;
- potencial;
- habilidades;
- forma;
- contrato;
- moral/situação;
- clube interessado.

---

## 14. Mercado

O mercado deve ser simples no MVP, mas parecer lógico.

### Proposta do usuário

A IA deve avaliar:

- valor proposto vs valor de mercado;
- saúde financeira do vendedor;
- importância do jogador;
- idade;
- contrato;
- posição;
- necessidade do clube;
- tamanho do clube comprador.

### Mercado IA↔IA

Clubes controlados pela IA podem negociar entre si.

Regras mínimas:

- comprador precisa ter dinheiro;
- jogador deve melhorar o elenco ou cobrir carência;
- clubes endividados vendem mais;
- clubes grandes seguram craques;
- transação deve movimentar caixa dos dois clubes;
- elenco deve atualizar corretamente.

---

## 15. Finanças

Finanças devem afetar decisões.

### Receitas

```txt
bilheteria
patrocínio
cota de TV
premiação
venda de jogadores
títulos/acesso
```

### Despesas

```txt
salários
contratações
treino
estádio
manutenção
juros/dívidas
renovações
```

### Estados financeiros

```txt
SAUDAVEL
ATENCAO
CRITICO
FALENCIA
```

Se o clube ficar rodadas seguidas no vermelho:

- moral cai;
- salários atrasam;
- diretoria pressiona;
- clube pode vender jogadores;
- técnico pode ser demitido por falência.

---

## 16. Reputação e demissão

O técnico tem reputação.

Sobe com:

- vitórias;
- títulos;
- acesso;
- cumprir objetivo;
- boa campanha com clube pequeno.

Cai com:

- sequência de derrotas;
- rebaixamento;
- fracasso no objetivo;
- crise financeira;
- campanha abaixo da expectativa.

### Demissão

Pode ocorrer por:

- derrotas consecutivas;
- rebaixamento;
- falência;
- campanha muito abaixo do objetivo.

A demissão precisa ser justa e explicável.

---

## 17. Academia/base

A base deve gerar jovens por temporada.

Jovens devem ter:

- nome;
- idade;
- posição;
- overall inicial;
- potencial;
- custo/salário baixo;
- risco de não evoluir;
- valor de mercado compatível.

A infraestrutura do clube deve melhorar a qualidade média dos jovens.

---

## 18. Save/load

O save precisa ser robusto.

Regras:

- salvar estado completo da carreira;
- manter versão de save;
- permitir migração;
- ter backup;
- nunca apagar save corrompido automaticamente sem fallback;
- carregar com segurança.

O jogador deve conseguir jogar várias temporadas sem perder a carreira.

---

## 19. UX essencial

O jogo precisa informar o que importa.

### Home/Gabinete

Mostrar:

- próximo jogo;
- posição na tabela;
- saldo;
- moral média;
- reputação;
- objetivo;
- alertas;
- propostas;
- lesionados/suspensos.

### Pré-jogo

Mostrar:

- força do adversário;
- melhor jogador adversário;
- ponto fraco adversário;
- alerta de escalação;
- sugestão tática;
- condição do elenco;
- risco de improviso.

### Partida

Mostrar:

- placar;
- minuto;
- timeline;
- eventos;
- estatísticas;
- momentum;
- substituições;
- alerta de cansaço.

---

## 20. Definição de jogo 10/10

O FOTEBALL só será considerado 10/10 quando:

```txt
✅ uma temporada completa roda sem crash
✅ cinco temporadas seguidas não quebram save
✅ escalação inválida nunca entra em campo
✅ time forte tem vantagem, mas zebra acontece
✅ tática influencia sem dominar tudo
✅ mercado parece lógico
✅ finanças afetam decisões
✅ demissão faz sentido
✅ evolução/envelhecimento é convincente
✅ UI explica decisões e eventos
✅ testes cobrem core crítica
✅ CI bloqueia código quebrado
```

---

## 21. Prioridade de implementação

```txt
1. Validação de escalação na core
2. Testes de escalação
3. Laboratório de balanceamento de partidas
4. Teste de temporada completa
5. Save/load em temporada longa
6. Mercado IA mais lógico
7. Refatoração segura do store
8. UX de pré-jogo, gabinete e partida
```

---

*BRASFOOT_MASTER.md · FOTEBALL · Documento de domínio*

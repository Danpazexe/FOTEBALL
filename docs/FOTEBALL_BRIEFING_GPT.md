# FOTEBALL — Briefing GPT

> Documento de briefing consolidado para orientar design, código, IA, prompts, documentação e evolução do app.

---

## 1. Resumo Executivo

**FOTEBALL** é um jogo mobile de gerenciamento de futebol brasileiro, com inspiração em Brasfoot, Soccer Manager e experiências clássicas de manager.

O projeto deve ser construído com foco em:

- tomada de decisão rápida;
- temporadas dinâmicas;
- futebol brasileiro;
- interface premium;
- dados editáveis;
- simulação compreensível;
- evolução contínua do clube e dos jogadores.

A experiência deve ser acessível para quem gosta de futebol, mas suficientemente profunda para prender quem gosta de estratégia.

---

## 2. Público-Alvo

### Primário

Jogadores brasileiros que gostam de:

- futebol nacional;
- jogos de manager;
- Brasfoot;
- modo carreira;
- montar elenco;
- simular campeonatos;
- negociar jogadores.

### Secundário

Usuários que gostam de:

- jogos offline;
- progressão;
- estatísticas;
- cards de jogadores;
- tabelas e rankings;
- experiências rápidas no celular.

---

## 3. Problema que o App Resolve

Muitos managers mobile são complexos demais, lentos, monetizados em excesso ou distantes da realidade brasileira.

O FOTEBALL deve entregar uma experiência mais direta:

- abrir o app;
- escalar;
- jogar;
- negociar;
- avançar;
- sentir evolução.

Sem excesso de menus, sem burocracia, sem transformar o jogo em trabalho de escritório.

---

## 4. Proposta de Valor

**Um manager brasileiro, rápido, bonito e profundo na medida certa.**

O jogo combina:

- nostalgia dos managers antigos;
- visual moderno;
- clubes e divisões brasileiras;
- partidas narradas;
- mercado dinâmico;
- progressão de elenco;
- decisões financeiras;
- temporadas rápidas.

---

## 5. Frase de Produto

> Assuma um clube brasileiro, monte seu elenco, escale seu time e leve sua equipe da pressão do rebaixamento até a glória nacional.

---

## 6. Tom do Produto

O tom do FOTEBALL deve ser:

- competitivo;
- esportivo;
- brasileiro;
- direto;
- levemente dramático;
- sem exagero arcade;
- sem parecer cassino;
- sem parecer simulador frio demais.

Exemplos de linguagem:

```txt
Seu elenco está cansado.
A diretoria espera uma reação.
Proposta recebida por atacante titular.
Clássico decisivo na próxima rodada.
Seu meia está em grande fase.
O caixa do clube exige cautela.
```

---

## 7. Inspirações

### Brasfoot

- rapidez;
- simplicidade;
- tabelas claras;
- carreira longa;
- foco na decisão.

### Soccer Manager

- elenco;
- transferências;
- contratos;
- gerenciamento moderno.

### FIFA / EA FC Cards

- raridade visual;
- overall;
- cartas com personalidade.

### Football Manager

- profundidade de simulação, mas apenas como inspiração;
- o FOTEBALL não deve tentar ser complexo nesse nível.

---

## 8. Diferenciais

- Foco no Brasil.
- Mobile-first.
- Interface dark premium.
- Simulação rápida.
- Cartas de jogadores por nível.
- Mercado com IA.
- Temporadas curtas e viciantes.
- Documentação clara para evoluir com IA.
- Arquitetura separando engine e UI.

---

## 9. Experiência Ideal

O usuário deve conseguir:

1. Escolher um clube em menos de 1 minuto.
2. Entender o elenco rapidamente.
3. Montar uma escalação sem fricção.
4. Jogar uma partida em poucos minutos.
5. Ver impacto do resultado.
6. Fazer ajustes.
7. Avançar no campeonato.
8. Sentir que cada decisão importa.

---

## 10. MVP Recomendado

O MVP precisa conter apenas o necessário para o jogo ser jogável.

### Obrigatório

- escolha de clube;
- elenco;
- escalação;
- tática básica;
- partida simulada;
- tabela;
- calendário;
- finanças simples;
- mercado simples;
- save local.

### Não obrigatório no MVP

- multiplayer;
- online;
- licenciamento real;
- narração com áudio;
- editor visual completo;
- base avançada;
- milhares de ligas;
- animação 3D.

---

## 11. Não Fazer

Evitar:

- complexidade excessiva;
- telas com informação demais;
- mecânica pay-to-win;
- dependência online no MVP;
- simulação impossível de entender;
- UI parecida com painel administrativo genérico;
- uso exagerado de neon;
- muitos sistemas antes do loop principal estar divertido.

---

## 12. Decisões Já Definidas

- Nome do projeto: **FOTEBALL**.
- Estilo: manager de futebol brasileiro.
- Stack: React Native CLI + TypeScript.
- Estado: Zustand.
- Persistência: local.
- Visual: dark premium.
- Paleta base:
  - `#0A0E1A`
  - `#131929`
  - `#00E5A0`
  - `#FFD600`
  - `#FF3B5C`
  - `#F0F4FF`
  - `#8892A4`
- Raridades:
  - Bronze
  - Prata
  - Ouro
  - Lendário
  - Especial

---

## 13. Critério de Sucesso

O projeto está no caminho certo quando:

- o usuário entende o que fazer sem tutorial longo;
- cada partida gera vontade de jogar a próxima;
- o mercado cria histórias;
- o elenco muda com o tempo;
- o caixa importa;
- o visual parece profissional;
- o app roda liso em Android;
- a engine é testável sem React;
- os dados podem ser editados facilmente.

---

## 14. Visão de Longo Prazo

O FOTEBALL pode evoluir para uma plataforma de manager brasileira com:

- editor de clubes;
- temporadas infinitas;
- base;
- copas;
- rankings;
- exportação/importação de dados;
- mods comunitários;
- integração com GitHub para dados versionados;
- IA auxiliando balanceamento e geração de conteúdo.

---

## 15. Princípio Final

O jogo precisa preservar a alma dos managers clássicos: tabela, escalação, mercado e emoção.

A tecnologia moderna entra para melhorar a experiência, não para complicar.

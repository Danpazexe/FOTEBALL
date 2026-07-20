# FOTEBALL — Documento Mestre do Projeto

> Fonte consolidada do projeto FOTEBALL a partir das decisões registradas no GPT.  
> Objetivo: manter uma visão única do jogo, das regras, da arquitetura e da direção visual.

---

## 1. Visão Geral

**FOTEBALL** é um jogo mobile de gerenciamento de futebol brasileiro, inspirado na experiência clássica de jogos como **Brasfoot** e **Soccer Manager**, com foco em simplicidade, tomada de decisão, progressão e identidade brasileira.

O jogador assume o comando de um clube, escala o time, negocia jogadores, administra finanças, acompanha partidas narradas e busca títulos, acesso ou permanência nas divisões nacionais.

A proposta é unir o charme dos managers antigos — direto ao ponto, tabelas claras, decisões rápidas — com uma interface mobile moderna, premium e responsiva.

---

## 2. Plataforma

- **App:** React Native CLI
- **Linguagem:** TypeScript
- **Estado global:** Zustand
- **Persistência:** SQLite / storage local
- **Interface:** React Native + SVG
- **Plataformas alvo:** Android primeiro, iOS depois
- **Estilo de jogo:** offline-first, carreira local, simulação rápida

---

## 3. Pilares do Jogo

### 3.1 Simplicidade estratégica

O jogo deve ser fácil de entender, mas com profundidade suficiente para premiar boas decisões.

O jogador precisa responder perguntas simples:

- Quem escalar?
- Quem vender?
- Quem contratar?
- Que tática usar?
- Como controlar salários?
- Vale investir em base, elenco ou estrutura?

### 3.2 Futebol brasileiro como identidade

O foco principal é o futebol nacional:

- Série A
- Série B
- Série C
- Copa nacional
- Elencos brasileiros
- Mercado com lógica local
- Clubes com orçamentos e realidades diferentes

### 3.3 Simulação clara

A partida não deve ser uma caixa-preta. O usuário precisa entender por que ganhou ou perdeu.

Fatores que influenciam o resultado:

- Overall dos jogadores
- Moral
- Condição física
- Tática
- Posição correta
- Forma recente
- Força do adversário
- Mando de campo
- Eventos aleatórios controlados por seed

### 3.4 Evolução contínua

Cada temporada deve gerar histórias:

- Jovem promessa evoluindo
- Jogador veterano caindo
- Clube quebrando financeiramente
- Atacante em grande fase
- Técnico pressionado
- Time subindo de divisão
- Craque vendido para equilibrar o caixa

---

## 4. Nome e Identidade

### Nome

**FOTEBALL**

Nome curto, memorável, com sonoridade de futebol e game mobile.

### Tom

- Brasileiro
- Competitivo
- Direto
- Premium
- Levemente nostálgico
- Sem parecer genérico ou “app de planilha”

---

## 5. Loop Principal

```txt
Início da carreira
→ Escolher clube
→ Ver elenco
→ Definir tática
→ Escalar titulares
→ Jogar partida
→ Ver resultado e estatísticas
→ Receber dinheiro / impacto de moral
→ Gerenciar elenco, mercado e finanças
→ Avançar rodada
→ Final de temporada
→ Acesso, rebaixamento, títulos e renovações
```

---

## 6. Modos de Jogo

### 6.1 Carreira

Modo principal.

O jogador escolhe um clube e administra temporada após temporada.

Recursos:

- Campeonatos nacionais
- Mercado de transferências
- Contratos
- Finanças
- Evolução de jogadores
- Moral e condição
- Reputação do técnico
- Objetivos da diretoria

### 6.2 Partida rápida

Opcional para versões futuras.

Permite simular um jogo isolado entre dois clubes.

### 6.3 Desafios

Opcional para versões futuras.

Exemplos:

- Salvar clube do rebaixamento
- Subir com clube pequeno
- Ganhar título invicto
- Montar elenco sub-23
- Vencer com orçamento limitado

---

## 7. Sistemas Principais

- Escalação
- Tática
- Simulação de partida
- Campeonato
- Calendário
- Mercado
- Contratos
- Finanças
- Treinamento
- Evolução
- Moral
- Condição física
- Lesões e suspensões
- Base
- Notícias
- Conquistas

---

## 8. Regras de Escalação

A escalação deve seguir regras mínimas para evitar formações quebradas.

Regras base:

- 1 goleiro obrigatório
- Mínimo de 3 defensores
- Mínimo de 2 meio-campistas
- Mínimo de 1 atacante
- Jogador fora de posição sofre penalidade
- Jogador cansado rende menos
- Jogador com moral baixa rende menos
- Jogador suspenso ou lesionado não pode atuar

---

## 9. Faixas de Carta / Overall

As cartas dos jogadores usam raridade visual por overall:

| Faixa | Nome |
|---|---|
| Abaixo de 65 | Bronze |
| 65–74 | Prata |
| 75–84 | Ouro |
| 85–89 | Lendário |
| 90+ | Especial |

Essas faixas devem influenciar:

- Aparência do card
- Cor do badge de overall
- Sensação de raridade
- Impacto visual na lista de elenco

---

## 10. Atributos dos Jogadores

Estrutura base sugerida:

```ts
type Jogador = {
  id: string;
  nome: string;
  idade: number;
  nacionalidade: string;
  posicaoPrincipal: Posicao;
  posicoesSecundarias: Posicao[];
  perna: 'D' | 'E' | 'A';
  atributos: {
    velocidade: number;
    finalizacao: number;
    passe: number;
    drible: number;
    marcacao: number;
    desarme: number;
    fisico: number;
    resistencia: number;
    tecnica: number;
    criatividade: number;
    posicionamento: number;
    reflexo: number;
    lideranca: number;
  };
  overall: number;
  potencial: number;
  condicao: number;
  moral: number;
  forma: number;
  valorMercado: number;
  salario: number;
  contratoAte: number;
};
```

---

## 11. Mercado

O mercado deve considerar:

- Overall
- Idade
- Potencial
- Posição
- Moral
- Tempo de contrato
- Salário
- Desempenho recente
- Situação financeira do clube
- Necessidade tática do comprador
- Reputação do clube vendedor

Tipos de negociação:

- Compra definitiva
- Venda
- Empréstimo
- Renovação
- Jogador livre
- Pré-contrato
- Proposta da IA
- Proposta entre clubes IA

---

## 12. Contratos

Cada jogador tem:

- Salário
- Tempo restante de contrato
- Valor de mercado
- Status de renovação
- Interesse de outros clubes

Regras:

- Jogador com contrato acabando pode sair de graça
- Renovação pode aumentar salário
- Moral baixa dificulta renovação
- Jogador reserva pode pedir saída
- Jogador importante pode exigir aumento

---

## 13. Finanças

Receitas:

- Bilheteria
- Patrocínio
- Premiação
- Venda de jogadores
- Direitos de TV
- Títulos
- Acesso de divisão

Despesas:

- Salários
- Contratações
- Renovação
- Estrutura
- Base
- Manutenção
- Multas/rescisões

Condição financeira do clube deve afetar:

- Poder de compra
- Objetivos da diretoria
- Risco de vender jogadores
- Moral do elenco
- Capacidade de renovação

---

## 14. Treinamento

Treinos podem afetar atributos por posição:

### Goleiro

- Reflexo
- Posicionamento
- Técnica
- Liderança

### Defesa

- Marcação
- Desarme
- Físico
- Posicionamento

### Meio-campo

- Passe
- Criatividade
- Técnica
- Resistência

### Ataque

- Finalização
- Drible
- Velocidade
- Posicionamento

O treino deve ter custo:

- Redução de condição
- Risco leve de lesão
- Ganho gradual, não exagerado

---

## 15. Tática

A tática deve ser livre, mas validada.

Elementos:

- Formação
- Mentalidade
- Pressão
- Linha defensiva
- Estilo de passe
- Intensidade
- Contra-ataque
- Posse de bola
- Marcação

Penalidades:

- Jogador fora de posição
- Formação desequilibrada
- Time cansado usando pressão alta
- Muitos atacantes sem meio-campo
- Defesa exposta

---

## 16. Visual

Paleta oficial:

```txt
Fundo: #0A0E1A
Cards: #131929
Primário: #00E5A0
Secundário: #FFD600
Perigo: #FF3B5C
Texto: #F0F4FF
Texto secundário: #8892A4
```

Direção visual:

- Dark premium
- Neon controlado
- Cards com profundidade
- Visual esportivo moderno
- Informações claras
- Sem excesso de brilho
- Sem cara de template genérico

---

## 17. Princípios de Interface

- Priorizar leitura rápida
- Reduzir cliques
- Usar cards grandes no mobile
- Destacar decisões importantes
- Mostrar feedback após cada ação
- Evitar telas poluídas
- Usar cores com função, não decoração

---

## 18. Roadmap Sugerido

### MVP

- Escolha de clube
- Elenco
- Escalação
- Simulação de partida
- Tabela
- Calendário
- Mercado simples
- Finanças básicas
- Save local

### Versão 0.2

- Copa nacional
- Contratos
- Moral
- Evolução
- Conquistas
- Notícias

### Versão 0.3

- Base
- IA mais agressiva
- Mercado entre clubes IA
- Lesões
- Suspensões
- Objetivos da diretoria

### Versão 1.0

- Temporadas completas
- Séries A, B e C
- Sistema financeiro maduro
- UI refinada
- APK público
- Balanceamento completo

---

## 19. Regra de Ouro

O FOTEBALL deve parecer um jogo de manager feito por quem gosta de futebol, não uma planilha com botões.

A tradição do Brasfoot é a base: leve, rápido, direto.  
A evolução é o acabamento mobile moderno, com sistemas mais claros e visual mais forte.

# FOTEBALL — UI Premium

> Direção visual e princípios de interface para o app.

---

## 1. Conceito Visual

O FOTEBALL deve ter uma interface **dark premium esportiva**, com visual moderno, limpo e forte.

Não deve parecer:

- planilha;
- dashboard corporativo frio;
- app genérico de apostas;
- template gratuito;
- jogo infantil;
- tela poluída.

Deve parecer:

- manager moderno;
- app esportivo premium;
- experiência mobile brasileira;
- produto com identidade própria.

---

## 2. Paleta Oficial

```txt
Fundo principal:        #0A0E1A
Fundo superior:         #101A38
Fundo base:             #06090F
Card/superfície:        #131929
Superfície alternativa: #182231
Superfície elevada:     #1B2740
Borda:                  #23304A
Borda clara:            #2E3D5C
Primário:               #00E5A0
Primário claro:         #46F2BE
Primário escuro:        #00A878
Secundário:             #FFD600
Secundário escuro:      #E0B400
Perigo:                 #FF3B5C
Sucesso:                #22C55E
Aviso:                  #FF8A3D
Texto:                  #F0F4FF
Texto secundário:       #8892A4
```

---

## 3. Uso das Cores

### Verde primário

Usar para:

- ações principais;
- botões importantes;
- sucesso;
- destaque de seleção;
- progresso positivo.

### Amarelo secundário

Usar para:

- alerta nobre;
- destaque de overall;
- conquistas;
- raridade;
- chamadas especiais.

### Vermelho perigo

Usar para:

- lesões;
- saldo negativo;
- derrotas;
- rebaixamento;
- ações destrutivas.

### Azul escuro

Usar como base.

A interface deve respirar em tons escuros, com contraste bem controlado.

---

## 4. Gradientes

Gradientes recomendados:

```txt
Fundo:    #101A38 → #0A0E1A → #06090F
Primário: #46F2BE → #00E5A0 → #00A878
Hero:     #13315F → #0C1428
Ouro:     #FFE36B → #FFD600 → #E0A400
```

Usar gradiente com moderação.  
O visual premium vem do equilíbrio, não de carnaval de neon.

---

## 5. Tipografia

A tipografia deve transmitir esporte, força e leitura rápida.

Sugestão visual:

- Títulos: fonte condensada, forte.
- Corpo: fonte legível e limpa.
- Números: fonte forte para overall, placar e estatísticas.

Mesmo que a fonte real mude depois, o comportamento visual deve ser:

- títulos em caixa alta;
- números grandes;
- labels pequenas;
- hierarquia clara.

---

## 6. Cards

Cards são a base da interface.

### Card padrão

Características:

- fundo `#131929`;
- borda sutil `#23304A`;
- raio médio;
- sombra leve;
- padding confortável;
- texto com bom contraste.

### Card importante

Usar:

- superfície elevada;
- borda clara;
- pequeno glow primário;
- destaque no topo ou lateral.

---

## 7. Botões

### Primário

Uso:

- confirmar;
- jogar partida;
- salvar;
- contratar;
- avançar rodada.

Visual:

- fundo verde;
- texto escuro;
- peso forte;
- altura confortável.

### Secundário

Uso:

- ver detalhes;
- comparar;
- abrir tela auxiliar.

Visual:

- fundo escuro;
- borda;
- texto claro.

### Perigo

Uso:

- vender;
- dispensar;
- cancelar negociação;
- resetar carreira.

Visual:

- vermelho;
- confirmação obrigatória.

---

## 8. Tela Inicial

Objetivos:

- mostrar identidade do FOTEBALL;
- continuar carreira;
- iniciar nova carreira;
- acessar configurações;
- indicar versão.

Elementos:

```txt
Logo / Nome
Card da carreira atual
Botão Continuar
Botão Nova Carreira
Acesso rápido a configurações
```

---

## 9. Tela de Clube

Deve mostrar rapidamente:

- nome do clube;
- divisão;
- posição;
- saldo;
- moral;
- próximo jogo;
- objetivo da diretoria.

Layout sugerido:

```txt
Hero do clube
Indicadores principais
Próxima partida
Ações rápidas
Resumo do elenco
```

---

## 10. Tela de Elenco

A tela de elenco precisa ser extremamente legível.

Informações por jogador:

- nome;
- posição;
- overall;
- idade;
- condição;
- moral;
- valor;
- contrato.

Filtros:

- posição;
- overall;
- idade;
- contrato;
- moral;
- condição.

Ações:

- ver detalhes;
- colocar no time;
- negociar;
- renovar;
- comparar.

---

## 11. Card de Jogador

O card deve usar raridade por overall.

### Bronze

- cobre/marrom;
- sensação inicial.

### Prata

- cinza metálico;
- jogador mediano.

### Ouro

- dourado clássico;
- jogador forte.

### Lendário

- preto + ouro;
- craque de alto nível.

### Especial

- azul-marinho + ouro;
- elite absoluta.

Informações principais:

```txt
Overall
Posição
Nome
Idade
Condição
Moral
Raridade
```

---

## 12. Tela de Escalação

Objetivo:

- montar time titular;
- trocar posições;
- validar formação;
- mostrar força do time;
- exibir avisos.

Elementos:

- campo visual;
- lista de reservas;
- força geral;
- alertas;
- botão jogar.

Regras de UX:

- drag-and-drop se possível;
- toque para trocar se drag não estiver pronto;
- avisos claros;
- não deixar o usuário se perder.

---

## 13. Tela de Partida

A partida deve ser tensa, mas clara.

Elementos:

- placar;
- minuto;
- nomes dos clubes;
- eventos;
- estatísticas rápidas;
- botão pausar;
- substituições;
- narrador textual.

Eventos devem ter impacto visual.

Exemplos:

```txt
⚽ Gol
🟨 Cartão amarelo
🟥 Cartão vermelho
🚑 Lesão
🔁 Substituição
```

Em versão final, ícones podem ser próprios.

---

## 14. Placar

O placar é peça de identidade.

Deve ter:

- lados equilibrados;
- cores dos clubes;
- número grande;
- tempo de jogo;
- divisão/competição;
- visual limpo.

Evitar:

- excesso de texto;
- logos gigantes;
- brilho exagerado;
- assimetria visual.

---

## 15. Tela de Mercado

Deve facilitar decisão.

Informações:

- jogador;
- clube;
- overall;
- idade;
- valor;
- salário;
- contrato;
- interesse;
- posição.

Filtros:

- posição;
- preço;
- overall;
- idade;
- potencial;
- livres;
- por empréstimo.

Ações:

- fazer proposta;
- vender;
- negociar salário;
- renovar;
- cancelar.

---

## 16. Tela de Finanças

Precisa ser clara, não contábil demais.

Mostrar:

- saldo;
- receita mensal;
- despesa mensal;
- folha salarial;
- orçamento de transferência;
- projeção;
- risco financeiro.

Visual:

- gráficos simples;
- números grandes;
- cores funcionais;
- histórico resumido.

---

## 17. Tela de Tabela

A tabela deve ser rápida de ler.

Colunas:

- posição;
- clube;
- pontos;
- jogos;
- vitórias;
- empates;
- derrotas;
- saldo.

Destaques:

- clube do usuário;
- zona de título;
- zona de acesso;
- zona de rebaixamento;
- classificação para copa, se houver.

---

## 18. Feedback Visual

Toda ação importante deve dar retorno.

Exemplos:

- transferência concluída;
- proposta recusada;
- jogador lesionado;
- objetivo cumprido;
- conquista desbloqueada;
- save realizado.

Usar:

- toast;
- modal;
- badge;
- animação leve.

---

## 19. Motion

Animações devem ser rápidas e discretas.

Usar para:

- entrada de cards;
- mudança de placar;
- conquista;
- abertura de modal;
- feedback de botão.

Evitar:

- animação longa;
- transição pesada;
- efeito sem função.

---

## 20. Regras de Qualidade Visual

- Uma tela deve ter um foco principal.
- Botão importante deve ser óbvio.
- Informação secundária deve ser discreta.
- Cor deve indicar função.
- Espaçamento deve ser consistente.
- Usar dark mode como identidade, não como desculpa para baixo contraste.
- Visual precisa parecer app premium, não protótipo abandonado no vestiário.

---

## 21. Referência de Sensação

O usuário deve sentir:

```txt
“Esse app é simples de jogar, mas tem coisa por trás.”
```

Esse é o ponto certo.

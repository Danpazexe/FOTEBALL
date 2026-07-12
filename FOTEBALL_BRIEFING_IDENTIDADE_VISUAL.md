# FOTEBALL — briefing mestre de identidade visual e reconstrução da experiência

**Documento de produto, design e implementação para Claude Code**  
**Base auditada:** `Danpazexe/FOTEBALL`, branch `main`  
**Data da auditoria:** 12 de julho de 2026  
**Plataformas:** Android e iOS  
**Stack atual:** React Native CLI 0.86, React 19.2, TypeScript strict, Zustand, SQLite, React Navigation 7, Reanimated 4, Gesture Handler 3, SVG e Lucide

---

## 1. Objetivo executivo

Reconstruir a camada de apresentação do FOTEBALL para que o jogo tenha a clareza, a densidade de informação e a navegação rápida associadas aos melhores aplicativos esportivos de dados — tendo o Sofascore como referência de princípio — sem copiar sua marca, sua fonte proprietária, seus ícones customizados ou suas telas.

O resultado deve parecer um **produto esportivo brasileiro maduro, rápido e confiável**, e não um painel genérico com tema verde. A interface precisa transformar muita informação de manager em decisões claras:

- O que aconteceu?
- O que exige atenção agora?
- Qual é a próxima decisão do técnico?
- Qual será o impacto da ação?
- Onde encontro os detalhes sem poluir a primeira camada?

### Resultado desejado

Ao abrir o app, o usuário deve entender em menos de cinco segundos:

1. qual clube comanda;
2. qual é o próximo compromisso;
3. como está a situação na competição;
4. quais problemas exigem ação;
5. qual é o botão principal daquele momento.

O projeto não deve ser reescrito do zero. O motor determinístico, stores, persistência, navegação funcional, áudio e regras existentes devem ser preservados. A intervenção é uma **migração incremental da experiência e do design system**, com ajustes de modelo somente quando novas visualizações realmente exigirem novos dados.

---

## 2. O que foi encontrado no repositório

### 2.1 Pontos fortes que devem ser preservados

- React Native CLI atual, sem dependência do Expo.
- TypeScript strict.
- Motor do jogo separado da interface e determinístico.
- Zustand como estado global.
- SQLite como persistência principal.
- React Navigation com native stack e cinco abas.
- Reanimated e Gesture Handler já configurados.
- `react-native-svg` já disponível.
- Lucide já centralizado por nomes semânticos em `src/components/Icone`.
- Tokens básicos já centralizados em `src/theme`.
- Primitivos compartilhados em `src/components/ui`.
- Feedback global com confirmação e toast.
- Escudos, logos de divisões, áudio e imagem de estádio empacotados localmente.
- Telas de carreira, elenco, tática, treino, mercado, contratos, calendário, competições, base, finanças, conquistas e partida já existem.
- CI com typecheck, lint e Jest.

### 2.2 Problemas estruturais de experiência

1. **Tema único e excessivamente escuro.** O app inteiro vive na ideia “noite de estádio”. Isso cria personalidade, mas reduz a leitura de tabelas, listas, filtros e telas com muitos números. A referência clean pede superfícies claras como padrão e modo escuro real como alternativa.

2. **Tokens incompletos.** Há cores, espaçamento, raio e uma escala tipográfica curta, mas faltam tokens semânticos completos, estados de interação, alturas, ícones, layout responsivo, motion, opacidade e contraste.

3. **Fonte de sistema sem identidade.** A tipografia depende de `fontWeight`, sem família própria empacotada. Android e iOS podem apresentar diferenças importantes.

4. **Tela Home muito carregada.** Ela acumula próximo jogo, forma, alertas, reputação, moral, propostas, diretoria, objetivo, ultimato, imprensa, Copa, Série D e calendário. O conteúdo é bom, mas falta prioridade e revelação progressiva.

5. **Central do Técnico parece grade de atalhos.** Funciona, mas se aproxima de um menu de sistema. Deve virar um verdadeiro centro de trabalho: pendências, decisões e ferramentas.

6. **A aba de competições é pouco profunda.** Hoje concentra tabela e artilheiros. Precisa de navegação interna por Visão geral, Jogos, Tabela e Estatísticas.

7. **A aba Clube mistura identidade, finanças e estádio.** Ela precisa de cabeçalho do clube e subáreas organizadas.

8. **Ajustes ocupam uma aba principal.** Configuração é importante, mas não merece um dos cinco lugares mais valiosos da navegação de um manager.

9. **Listas extensas usam padrões variados.** Elenco usa grade com `View` e `map`; outras áreas usam `ScrollView`. Isso piora memória e desempenho conforme o conteúdo cresce.

10. **Há inconsistência entre componentes que usam tokens dinâmicos e estilos que importam constantes.** A migração anterior de tema não foi concluída em todas as telas.

11. **Estados de produto não estão padronizados.** Loading, skeleton, vazio, erro, bloqueado, indisponível, offline, sucesso e retry precisam de uma linguagem única.

12. **Acessibilidade é parcial.** Existem `accessibilityRole` e alguns labels, mas não há política global para tamanho dinâmico, foco, contraste, leitura de tabelas, redução de movimento, touch targets e testes com VoiceOver/TalkBack.

13. **O conteúdo numérico não possui uma gramática editorial única.** Há bons usos de `tabular-nums`, porém posição, dinheiro, rating, overall, minuto e placar ainda precisam de componentes específicos.

### 2.3 Inconsistências técnicas observadas

- O README ainda menciona `react-native-vector-icons`, mas o `package.json` e o componente de ícones usam Lucide. Corrigir o README.
- O comentário de `src/components/ui/index.tsx` fala em dia/noite, enquanto `src/theme` declara um único tema. Unificar documentação e implementação.
- Há cores literais e interpolação hexadecimal como ```${cores.primaria}1A``` em telas. Toda transparência deve passar por tokens ou `comAlfa`.
- Existem componentes usando `StyleSheet.create` com constantes do tema, enquanto outros usam `useEstilos`. Depois da reintrodução de temas, nenhum componente visual pode capturar paleta fixa no carregamento do módulo.
- O botão “Voltar” aparece como texto em um contêiner. O padrão deve ser ícone semântico + label acessível e comportamento nativo.
- Alguns layouts em linha não consideram fonte ampliada ou telas menores.

---

## 3. O que aprender com o Sofascore — e o que não copiar

### 3.1 Princípios observáveis a adotar

- Informação esportiva organizada em camadas.
- Listas compactas, escaneáveis e com separadores sutis.
- Cabeçalhos contextuais fortes.
- Filtros por chips e bottom sheets.
- Números com protagonismo e alinhamento tabular.
- Cor usada para estado, seleção e importância — não como decoração em tudo.
- Superfícies neutras; acento de marca reservado para ações e elementos ativos.
- Navegação curta e previsível.
- Telas de competição e partida divididas em tabs internas.
- Visualizações de campo que explicam o jogo em vez de apenas enfeitá-lo.
- Conteúdo principal visível imediatamente; detalhes abaixo ou em outra aba.
- Densidade alta sem sacrificar áreas de toque.

### 3.2 Elementos que são proprietários

- **Sofascore Sans** é uma família variável criada especificamente para a marca. Não usar, baixar ou imitar arquivos dessa fonte.
- Os ícones de esportes do Sofascore foram desenhados sob medida. Não extrair do APK, site ou screenshots.
- Não usar o logotipo, símbolo, ilustrações, mapa de calor, conjunto de cores ou componentes como cópia pixel a pixel.

### 3.3 Tradução para o FOTEBALL

O Sofascore responde “o que está acontecendo no esporte?”. O FOTEBALL deve responder “o que eu, como técnico, preciso decidir agora?”. A identidade visual precisa refletir gestão e consequência.

**Essência do produto:** dados claros, decisão rápida, consequência visível.

**Personalidade:** brasileiro, competitivo, inteligente, direto, confiável.

**Evitar:** neon excessivo, vidro em todo card, grandes fotos genéricas de estádio, dourado em excesso, cards flutuantes sem hierarquia, texto em caixa-alta demais, animação de cassino e visual de “cartinha” aplicado a qualquer coisa.

---

## 4. Conceito de identidade: “Sala de Análise”

O novo sistema visual deve unir três referências:

1. a limpeza de um aplicativo esportivo de dados;
2. a autoridade de uma prancheta de técnico;
3. a energia discreta do futebol brasileiro.

O campo, a linha de cal e a luz do estádio permanecem como metáforas, mas de maneira controlada. O app deixa de ser um estádio escuro inteiro e vira uma sala de análise: superfícies claras, informações precisas e momentos de impacto quando a partida começa.

### Assinatura verbal

- Nome: **FOTEBALL**
- Categoria: **Football Manager** ou **Manager de Futebol**
- Frase principal sugerida: **Sua decisão muda o jogo.**
- Alternativas: **Comande. Decida. Vença.** / **O futebol nas suas mãos.**

Não alterar o nome do produto neste projeto. Corrigir apenas consistência de aplicação: `FOTEBALL` sempre em caixa-alta na marca; “Foteball” em texto corrido quando necessário.

---

## 5. Sistema de cores

### 5.1 Regra central

Usar neutros em 75–85% da interface. Verde é a marca e o estado positivo. Âmbar é atenção, momento especial e conquista. Vermelho é somente risco, derrota, expulsão, lesão grave ou ação destrutiva. Azul é informação e comparação. As cores dos clubes nunca substituem os tokens da interface.

### 5.2 Tema claro — padrão recomendado

| Token | Valor | Uso |
|---|---:|---|
| `canvas` | `#F4F6F8` | fundo geral |
| `surface` | `#FFFFFF` | cards, listas e headers |
| `surfaceSubtle` | `#F8FAFB` | agrupamento leve |
| `surfacePressed` | `#EEF2F4` | estado pressionado |
| `border` | `#E1E7EB` | separadores e bordas |
| `borderStrong` | `#C9D2D9` | inputs e foco neutro |
| `textPrimary` | `#101820` | texto principal |
| `textSecondary` | `#5B6773` | texto secundário; contraste adequado em branco |
| `textMuted` | `#7E8A94` | metadado não essencial |
| `brand` | `#13A65A` | indicadores, ícones ativos, gráficos |
| `brandStrong` | `#0A7F45` | botões preenchidos com texto branco |
| `brandSoft` | `#E7F7EE` | seleção e badges suaves |
| `onBrand` | `#FFFFFF` | conteúdo sobre `brandStrong` |
| `accent` | `#F2B43C` | gol, craque, conquista e atenção premium |
| `accentSoft` | `#FFF5D9` | fundo de selo âmbar |
| `info` | `#2878F0` | informação e comparação |
| `infoSoft` | `#EAF2FF` | fundo informativo |
| `success` | `#158A4B` | sucesso funcional |
| `warning` | `#C98200` | alerta |
| `danger` | `#D64545` | erro, risco e destrutivo |
| `dangerSoft` | `#FDECEC` | fundo de alerta/erro |
| `overlay` | `rgba(10, 18, 24, 0.56)` | modais |

### 5.3 Tema escuro — alternativa real

| Token | Valor | Uso |
|---|---:|---|
| `canvas` | `#0B1115` | fundo geral |
| `surface` | `#121A20` | cards e listas |
| `surfaceSubtle` | `#172128` | agrupamento |
| `surfacePressed` | `#202C34` | pressionado |
| `border` | `#27343D` | separadores |
| `borderStrong` | `#3B4A54` | foco neutro |
| `textPrimary` | `#F2F6F8` | texto principal |
| `textSecondary` | `#A9B4BC` | texto secundário |
| `textMuted` | `#788690` | metadado |
| `brand` | `#31C776` | marca e seleção |
| `brandStrong` | `#22AD64` | botão |
| `brandSoft` | `#143726` | seleção suave |
| `onBrand` | `#06140D` | conteúdo escuro sobre verde claro |
| `accent` | `#FFC857` | conquista e gol |
| `accentSoft` | `#3A2D12` | fundo âmbar |
| `info` | `#62A0FF` | informação |
| `infoSoft` | `#152A47` | fundo informativo |
| `success` | `#31C776` | sucesso |
| `warning` | `#F1B94B` | alerta |
| `danger` | `#FF6B63` | erro |
| `dangerSoft` | `#3D2020` | fundo de erro |
| `overlay` | `rgba(0, 0, 0, 0.72)` | modais |

### 5.4 Cores esportivas semânticas

Criar tokens separados dos tokens de UI:

- `match.goal`
- `match.cardYellow`
- `match.cardRed`
- `match.substitutionIn`
- `match.substitutionOut`
- `match.var`
- `match.injury`
- `form.win`
- `form.draw`
- `form.loss`
- `zone.promotion`
- `zone.continental`
- `zone.playoff`
- `zone.relegation`
- `fitness.high`, `fitness.medium`, `fitness.low`
- `morale.high`, `morale.medium`, `morale.low`

Não usar apenas cor para comunicar estado. Sempre combinar cor com texto, ícone, padrão ou shape.

### 5.5 Cor dos clubes

- Usar cor do clube em avatar, filete, mini gráfico ou detalhe do escudo.
- Nunca pintar o fundo inteiro da tela com a cor do clube.
- Calcular contraste antes de colocar texto.
- Times pretos/brancos recebem fallback de marca secundária ou borda.
- Manter um mapa curado por clube; não depender apenas de hash quando o clube é conhecido.

---

## 6. Tipografia

### 6.1 Família escolhida

Usar a família open source **Barlow** como base e **Barlow Condensed** para placares, rankings e números de impacto. Ambas devem ser empacotadas localmente em arquivos estáticos TTF para garantir o mesmo resultado em Android e iOS.

Arquivos mínimos:

- `Barlow-Regular.ttf`
- `Barlow-Medium.ttf`
- `Barlow-SemiBold.ttf`
- `Barlow-Bold.ttf`
- `BarlowCondensed-Bold.ttf`
- `BarlowCondensed-ExtraBold.ttf`

Não depender de peso sintético. Mapear cada peso explicitamente.

### 6.2 Papéis tipográficos

| Papel | Fonte | Tamanho/linha | Peso | Uso |
|---|---|---:|---:|---|
| Display | Barlow Condensed | 40/44 | 800 | marca, placar excepcional |
| Score XL | Barlow Condensed | 36/40 | 800 | placar e overall principal |
| Title XL | Barlow | 28/34 | 700 | cabeçalho de tela |
| Title L | Barlow | 22/28 | 700 | bloco principal |
| Title M | Barlow | 18/24 | 600 | card e seção |
| Body L | Barlow | 16/23 | 400/500 | texto de leitura |
| Body M | Barlow | 14/20 | 400/500 | padrão |
| Label L | Barlow | 14/18 | 600 | botão/chip |
| Label M | Barlow | 12/16 | 600 | metadado forte |
| Caption | Barlow | 11/14 | 500 | metadado compacto |
| Numeric | Barlow Condensed | variável | 700/800 | números esportivos |

### 6.3 Regras

- Aplicar `fontVariant: ['tabular-nums']` a placar, minuto, dinheiro, posição, pontos, saldo de gols, overall, rating e estatísticas em colunas.
- Não usar caixa-alta em parágrafos.
- Rótulos de seção podem usar caixa-alta somente em 11–12 px, com tracking controlado.
- Respeitar `allowFontScaling` e testar 100%, 130% e 160%.
- No máximo duas linhas para subtítulos de cards.
- Nunca reduzir fonte automaticamente em elementos críticos; permitir quebra ou reorganizar layout.
- `adjustsFontSizeToFit` apenas para placares e valores excepcionais, com `minimumFontScale` definido.

---

## 7. Espaçamento, grid, raios e elevação

### 7.1 Grid de 4 pontos

`space.0=0`, `1=4`, `2=8`, `3=12`, `4=16`, `5=20`, `6=24`, `8=32`, `10=40`, `12=48`.

- Margem padrão de tela: 16 px em celular compacto; 20 px em celulares largos.
- Conteúdo não deve tocar a tab bar; usar inset dinâmico.
- Tabelas podem usar 12 px lateral quando necessário para densidade.

### 7.2 Raios

- `radius.xs=6`: badge pequeno.
- `radius.sm=8`: chip, item compacto.
- `radius.md=12`: input, botão, card padrão.
- `radius.lg=16`: card de destaque e sheet.
- `radius.xl=24`: hero ou modal especial.
- `radius.full=999`: pill/avatar.

Reduzir o raio atual em listas densas. Nem tudo precisa parecer sabonete.

### 7.3 Elevação

- Tema claro: usar borda e diferença de superfície antes de sombra.
- `elevation.1`: sombra mínima em header fixo e bottom bar.
- `elevation.2`: menu, sheet, modal.
- Não usar glow em cards comuns.
- Glow é exclusivo de gol, conquista rara, jogador especial ou CTA momentâneo.

---

## 8. Iconografia e assets

### 8.1 Biblioteca de ícones

**Manter `lucide-react-native`** como biblioteca de ícones de sistema. O projeto já possui uma camada semântica correta em `src/components/Icone`; expandi-la é melhor que trocar de pacote.

Padrão:

- grade 24×24;
- stroke padrão 2;
- stroke 2.25 para ícone ativo quando necessário;
- tamanhos 16, 20, 24 e 28;
- nunca misturar Lucide, emoji e glifos de outra biblioteca na mesma interface;
- ícone sem texto somente quando o significado for universal e houver label acessível;
- `IconeNome` deve representar intenção (`transferencia`, `financas`, `escalacao`) e não o nome técnico do glifo.

### 8.2 Ícones esportivos próprios

Criar uma pequena família **FOTEBALL Sports** em SVG para eventos e domínio que Lucide não representa bem:

- gol;
- chute;
- defesa;
- cartão amarelo/vermelho;
- substituição;
- VAR;
- impedimento;
- contusão;
- pênalti;
- apito final;
- formação/tática;
- capitão;
- estádio;
- scout;
- contrato;
- moral;
- condição física.

Esses SVGs devem ser componentes TypeScript sobre `react-native-svg`, com `currentColor`, `viewBox` consistente, sem fonte de ícones e sem PNG quando o desenho for vetorial.

### 8.3 Assets existentes

- Preservar escudos e logos de divisões.
- Auditar resolução, transparência, recorte, padding interno e nomenclatura.
- Criar componente `TeamCrest` com fallback por sigla, cache lógico, tamanho e acessibilidade.
- Limitar `planodefundo.jpg` a momentos editoriais específicos. Não usar como wallpaper global.
- Campo tático, linhas, zonas e gráficos devem ser vetoriais ou desenhados em Skia/SVG.
- Não usar fotos genéricas de jogadores ou estádios para preencher espaço.

### 8.4 Catálogo e convenção

```text
src/assets/
  brand/
  clubs/
  competitions/
  illustrations/
  patterns/
  audio/
src/components/icons/
  system/
  sports/
```

Arquivos: minúsculos, kebab-case, sem espaços, sem acentos. Criar `assets.manifest.ts` onde o `require` estático do React Native for necessário.

---

## 9. Movimento, feedback e som

### 9.1 Princípios

- A animação deve explicar mudança de estado.
- Press: 90–140 ms.
- Entrada de card: 180–220 ms.
- Sheet/modal: 240–320 ms.
- Spring apenas em elementos interativos especiais.
- Evitar animação simultânea de muitos itens em listas.
- Respeitar “reduzir movimento” do sistema.

### 9.2 Eventos especiais

- Gol: pulso curto no placar, haptic de sucesso e som existente.
- Cartão: entrada lateral discreta e haptic warning.
- Fim de jogo: transição para resumo, sem confete salvo em título/conquista.
- Compra/venda: confirmação, estado carregando, resultado e atualização do saldo.
- Drag-and-drop tático: elevação, escala 1.04, área válida destacada e haptic ao encaixar.

### 9.3 Haptics

Adicionar `react-native-haptic-feedback` somente com wrapper próprio:

```text
src/services/haptics.ts
```

O wrapper deve permitir desligar feedback, respeitar plataforma e evitar haptic em cada toque banal.

---

## 10. Arquitetura da informação

### 10.1 Navegação principal proposta

Substituir as abas atuais `Central / Tabela / Início / Clube / Ajustes` por:

1. **Início** — resumo do dia e próximo compromisso.
2. **Competições** — jogos, tabela e estatísticas.
3. **Central** — CTA contextual central: jogar, treinar, decidir ou avançar.
4. **Elenco** — jogadores, escalação, tática e treino.
5. **Clube** — finanças, mercado, contratos, estádio, base e carreira.

`Ajustes` deve ir para o botão de perfil/menu no header do Início e também dentro da área Clube/Mais.

O botão central não deve ser um mero link fixo. Seu label e ícone mudam conforme o próximo evento:

- `Jogar partida`;
- `Definir treino`;
- `Responder proposta`;
- `Revisar escalação`;
- `Avançar calendário`;
- `Encerrar temporada`.

Manter rotas profundas no native stack. Cada aba principal pode possuir seu próprio stack para preservar histórico e evitar navegação global confusa.

### 10.2 Tabs internas

**Competição:** Visão geral · Jogos · Tabela · Estatísticas.  
**Partida:** Resumo · Estatísticas · Escalações · Narração.  
**Jogador:** Visão geral · Atributos · Forma · Contrato.  
**Clube:** Visão geral · Finanças · Estádio · Histórico.  
**Mercado:** Descobrir · Lista de interesse · Propostas.

Usar tabs scrolláveis quando houver mais de quatro itens. Preservar seleção ao voltar.

### 10.3 Busca e filtros

Adicionar busca global acessível pelo header:

- jogadores;
- clubes;
- competições;
- telas/ferramentas do manager.

Resultados em seções, com histórico recente e atalhos. A busca não deve consultar SQLite a cada tecla sem debounce.

Filtros complexos devem abrir bottom sheet; filtros rápidos devem usar chips horizontais. Sempre mostrar quantos filtros estão ativos e oferecer `Limpar`.

---

## 11. Redesign das telas existentes

### 11.1 Menu inicial / escolha de carreira

- Splash curto com marca sobre fundo sólido, sem loader eterno.
- Menu principal claro e direto: Continuar, Nova carreira, Configurações.
- Se houver save, mostrar clube, temporada, data do jogo, posição e último salvamento.
- Remover excesso de slogan e elementos empilhados.
- Nova carreira em fluxo passo a passo: divisão → clube → dificuldade → identidade do técnico → confirmação.
- Permitir voltar sem perder seleção.

### 11.2 Início — “Hoje no clube”

Ordem obrigatória:

1. header do clube: escudo, nome, temporada, saldo compacto, busca/menu;
2. CTA contextual do próximo evento;
3. próximo jogo ou compromisso;
4. faixa de pendências críticas;
5. situação na competição;
6. forma, moral e pressão da diretoria;
7. notícias e retrospecto.

Transformar alertas em uma **Caixa de entrada do técnico**. Lesão, suspensão, proposta, contrato vencendo e saldo negativo devem ter ação associada.

Não renderizar todos os módulos de uma vez. Usar `FlashList` ou composição virtualizada quando a Home crescer.

### 11.3 Central

Deixar de ser apenas grade de atalhos. Estrutura:

- `Agora`: tarefa principal;
- `Pendências`: itens com prazo e gravidade;
- `Planejamento`: treino, tática, elenco;
- `Gestão`: mercado, contratos, base, estádio;
- `Carreira`: objetivos, diretoria, propostas e conquistas.

Atalhos continuam, mas como segunda camada.

### 11.4 Competições

- Cabeçalho com competição, temporada e fase.
- Tabs internas.
- Visão geral: posição do clube, próximo jogo, forma e líderes.
- Jogos: agrupados por rodada/data; filtro `Todos / Meu clube / Jogados / Próximos`.
- Tabela: header fixo, primeira coluna fixa se viável, linha do clube destacada sem perder contraste.
- Estatísticas: artilheiros, assistências, clean sheets, cartões, médias e recordes.
- Série D e Copa devem usar a mesma casca visual, variando regras e conteúdo.

### 11.5 Elenco

Trocar grade geral de cartinhas por lista esportiva densa como padrão:

- foto/avatar ou silhueta;
- posição;
- nome;
- overall;
- idade;
- condição;
- moral;
- status;
- valor/salário conforme modo.

Manter cartas como visual opcional ou para destaques, não como única forma de listar 25–35 jogadores.

Adicionar:

- filtros por posição e status;
- ordenação por overall, idade, potencial, condição, moral e valor;
- comparação entre dois jogadores;
- visão de profundidade por posição;
- seleção múltipla somente quando houver ação real;
- estado sticky dos filtros.

### 11.6 Jogador

Header com nome, clube, posição, idade, overall e status. Cards principais:

- atributos agrupados;
- forma recente;
- condição e moral;
- estatísticas da temporada;
- contrato e valor;
- histórico de evolução;
- adequação por posição;
- ações contextuais: escalar, comparar, renovar, vender, emprestar.

A classificação de carta Bronze/Prata/Ouro/Lendário/Especial pode permanecer como camada colecionável, mas não deve colorir toda a tela.

### 11.7 Escalação e tática

- Campo deve ser o foco visual.
- Bench em lista horizontal virtualizada.
- Drag-and-drop com áreas válidas e invalidez explícita.
- Bottom sheet do jogador ao tocar.
- Barra inferior fixa com Salvar/Aplicar.
- Indicadores de química/adaptação devem usar ícone + label, não apenas anel colorido.
- Mudança de formação mostra confirmação e preview do impacto.
- Comparar força antes/depois.
- Instruções táticas em grupos; evitar dezenas de chips soltos.

### 11.8 Treino

- Calendário semanal visual.
- Carga, foco, risco de lesão e efeito estimado.
- Presets: recuperação, equilíbrio, físico, técnico, tático.
- Resultado do treino deve mostrar mudança real de atributos/condição.
- Não prometer efeito que o engine não calcula.

### 11.9 Mercado e contratos

- Busca persistente.
- Filtros em sheet: posição, idade, overall, potencial, valor, salário, contrato e nacionalidade.
- Lista de interesse.
- Scout report com nível de certeza quando aplicável.
- Comparar jogador observado com titular atual.
- Proposta em fluxo de etapas, exibindo impacto financeiro.
- Contratos vencendo nos próximos 6/12 meses.
- Histórico de negociação e motivo da recusa.

### 11.10 Clube, finanças e estádio

- Overview com identidade do clube, reputação, estádio e saúde financeira.
- Receita/despesa em cards comparativos.
- Gráfico temporal de saldo e folha; donut apenas para composição.
- Projeção de caixa com cenários.
- Ações de estádio em cards com custo, benefício e prazo.
- Preço do ingresso com faixa ou presets, mostrando previsão de público e receita.

### 11.11 Partida ao vivo

Reconstruir em quatro camadas:

1. **score header fixo:** times, escudos, placar, minuto, competição;
2. **controle:** pausa e velocidade, sem ocupar espaço demais;
3. **tabs:** Resumo, Estatísticas, Escalações, Narração;
4. **barra de decisão:** ajustes/substituições quando permitido.

Narração:

- timeline com ícones próprios;
- eventos importantes em cards; eventos comuns em linhas;
- auto-scroll opcional;
- botão “voltar ao ao vivo” quando o usuário rolar para cima;
- placares paralelos e tabela ao vivo em bottom sheet ou tab, não misturados à timeline principal.

Estatísticas:

- posse, finalizações, no alvo, chances, escanteios, faltas, cartões, xG se o engine realmente gerar;
- barras com escala compartilhada;
- não inventar precisão que o simulador não possui.

### 11.12 Resultado da partida

- Placar e competição.
- Destaque do jogador da partida.
- eventos principais;
- estatísticas comparativas;
- impacto: tabela, moral, finanças, lesões e suspensões;
- CTA único: continuar.

### 11.13 Ajustes

- Aparência: claro, escuro, sistema.
- Acessibilidade: reduzir movimento, feedback háptico, tamanho/contraste quando aplicável.
- Áudio: música, efeitos e volumes.
- Jogo: dificuldade, confirmações e velocidade.
- Dados: versão do save, exportar/backup futuramente, reiniciar.
- Sobre: versão, build, licenças open source.

---

## 12. Funcionalidades que o app ainda precisa

### Prioridade P0 — necessárias para a reconstrução

- tema claro/escuro/sistema;
- família tipográfica empacotada;
- design tokens completos;
- novos primitivos de UI;
- estados loading/skeleton/vazio/erro/retry;
- busca global;
- filtros e ordenação padronizados;
- caixa de entrada de pendências;
- tabs internas em competição e partida;
- lista de elenco virtualizada;
- layouts responsivos;
- auditoria de acessibilidade;
- testes de componentes e fluxos críticos.

### Prioridade P1 — valor alto para manager

- comparação de jogadores;
- lista de interesse;
- profundidade por posição;
- contratos vencendo;
- previsão financeira;
- histórico de evolução do jogador;
- visualizações de chutes, zonas e momentum baseadas em dados reais do engine;
- relatório pós-jogo com impacto;
- filtros de calendário;
- central de decisões com prazo.

### Prioridade P2 — evolução futura

- cloud save e conta;
- sincronização entre dispositivos;
- exportação/importação de carreira;
- notificações locais contextuais;
- widgets;
- internacionalização completa;
- tablet com sidebar;
- analytics de produto com consentimento;
- crash reporting de produção;
- modo espectador/compartilhamento de resultado.

P2 não deve bloquear o redesign visual.

---

## 13. Bibliotecas: manter, adicionar, condicionar e evitar

### 13.1 Manter

| Biblioteca | Decisão | Motivo |
|---|---|---|
| React Native 0.86 / React 19 | manter | base atual moderna |
| React Navigation 7 | manter | stacks/tabs existentes e estáveis |
| Zustand 5 | manter | adequado ao estado do jogo |
| `@op-engineering/op-sqlite` | manter | save estruturado e local |
| Reanimated 4 | manter | animações e drag-and-drop |
| Gesture Handler 3 | manter | gestos |
| `react-native-svg` | manter | ícones e gráficos simples |
| `lucide-react-native` | manter | ícones de sistema com registry semântico |
| Safe Area Context / Screens | manter | navegação e insets |

### 13.2 Adicionar agora

| Biblioteca | Versão observada em 12/07/2026 | Uso autorizado |
|---|---:|---|
| `@shopify/flash-list` | 2.3.2 | elenco, mercado, calendário, timeline e listas longas |
| `@gorhom/bottom-sheet` | 5.2.14 | filtros, ações contextuais, detalhes rápidos e placares paralelos |
| `react-native-bootsplash` | 7.3.2 | splash nativo consistente |
| `react-native-haptic-feedback` | 3.0.0 | eventos relevantes e drag-and-drop |
| `@testing-library/react-native` | 14.0.1 | testes de componentes e acessibilidade |
| `detox` | 20.51.4 | E2E dos fluxos críticos em Android e iOS |

Antes de instalar, conferir `peerDependencies`, suporte à New Architecture e changelog. Fixar versões exatas no lockfile; não usar `latest` no `package.json`.

### 13.3 Adicionar quando a fase exigir

| Biblioteca | Versão observada | Quando usar |
|---|---:|---|
| `@shopify/react-native-skia` | 2.6.9 | heatmap, shotmap, momentum e gráficos de campo complexos |
| `@sentry/react-native` | 8.18.0 | antes de beta externo/produção |
| `react-native-keychain` | 10.0.0 | somente quando existir conta/token/cloud save |
| `@react-native-community/netinfo` | 12.0.1 | quando houver recursos remotos |
| `react-native-permissions` | 5.6.0 | somente quando uma feature exigir permissão real |
| `react-native-image-picker` | 8.2.1 | avatar/importação futura |

### 13.4 Não adicionar agora

- **React Native Paper:** bom pacote, porém sua linguagem Material e seus componentes duplicariam o design system próprio. O FOTEBALL já possui primitivos e precisa de identidade distinta.
- **NativeWind/Tailwind:** geraria uma segunda linguagem de estilo durante a migração e não resolve tokens por si só.
- **Unistyles:** avaliar em uma RFC futura; a migração integral agora seria custo sem benefício direto suficiente.
- **React Query:** não há API remota como fonte principal hoje. Adicionar quando existir sincronização ou catálogo remoto.
- **MMKV:** não criar uma segunda fonte de verdade para configurações enquanto SQLite/persistência atual já funciona.
- **Victory Native:** não adicionar junto com Skia e SVG sem caso concreto; evitar três soluções de gráficos.
- **Outra biblioteca de ícones:** não misturar famílias.
- **Biblioteca de gradiente apenas para decoração:** usar SVG/Skia quando realmente necessário.

Regra: biblioteca é ferramenta, não coleção de figurinhas. Cada dependência nativa adiciona build, manutenção, compatibilidade e superfície de falha.

---

## 14. Arquitetura do design system no código

Criar:

```text
src/design-system/
  tokens/
    colors.ts
    typography.ts
    spacing.ts
    radii.ts
    elevation.ts
    motion.ts
    sizes.ts
    index.ts
  themes/
    light.ts
    dark.ts
    types.ts
    ThemeProvider.tsx
    useTheme.ts
  primitives/
    Box/
    Text/
    Pressable/
    Divider/
    Icon/
  components/
    AppBar/
    Button/
    IconButton/
    Card/
    ListItem/
    Chip/
    Badge/
    Tabs/
    SegmentedControl/
    SearchField/
    TextField/
    SelectField/
    BottomSheet/
    Dialog/
    Snackbar/
    Skeleton/
    EmptyState/
    ErrorState/
    StatValue/
    Score/
    TeamCrest/
    PlayerAvatar/
    FormIndicator/
    RatingBadge/
  sports/
    MatchCard/
    MatchHeader/
    EventRow/
    StandingsTable/
    PlayerRow/
    FinanceRow/
    Pitch/
    ShotMap/
    HeatMap/
```

### Regras de dependência

- `tokens` não importa React ou React Native, salvo tipos estritamente necessários.
- `primitives` dependem somente de tokens/tema.
- `components` dependem de primitives.
- `sports` dependem de components e tipos do domínio.
- `screens` montam componentes; não recriam botão, chip, card ou header.
- `engine` nunca importa design system.
- Não permitir import direto de hex em telas.
- Não permitir `StyleSheet.create` de tela com paleta capturada fora do hook de tema.

### Compatibilidade durante migração

Manter exports antigos em `src/theme` como ponte temporária, com comentário `@deprecated`. Remover somente após `rg` confirmar zero consumidores.

---

## 15. Contratos dos componentes essenciais

### `Text`

Props: `variant`, `color`, `align`, `numberOfLines`, `tabular`, `weight`, `selectable`. Não aceitar hex arbitrário como padrão.

### `Button`

Variantes: `primary`, `secondary`, `ghost`, `danger`.  
Tamanhos: `sm`, `md`, `lg`.  
Estados: default, pressed, focused, disabled, loading.  
Altura mínima: 44 iOS / 48 Android, usando token comum de 48 quando possível.

### `Card`

Variantes: `plain`, `outlined`, `elevated`, `interactive`, `status`. Não criar “destaque”, “ouro”, “grande” e outros nomes visuais sem semântica.

### `ListItem`

Slots: leading, title, subtitle, meta, trailing, status. Deve suportar fonte ampliada e layout vertical quando faltar espaço.

### `StatValue`

Responsável por label, número tabular, unidade, tendência, acessibilidade e compactação.

### `StandingsTable`

Colunas configuráveis, header sticky, linha acessível como frase, zonas, destaque do clube e modo compacto.

### `MatchCard`

Pré-jogo, ao vivo e encerrado devem ser variantes do mesmo contrato, não três componentes desconectados.

---

## 16. Conteúdo e microcopy

### 16.1 Tom

Curto, esportivo e claro. Evitar linguagem robótica e termos vagos.

Ruim: `Operação realizada com sucesso.`  
Bom: `Contrato renovado até dezembro de 2029.`

Ruim: `Tem certeza?`  
Bom: `Vender Pedro por R$ 18,5 mi? Seu saldo ficará em R$ 42,1 mi.`

### 16.2 Formatação brasileira

- moeda: `R$ 18,5 mi`, com detalhe completo quando necessário;
- data curta: `12 jul`;
- data completa: `12 de julho de 2026`;
- horário: `19:30`;
- posição: `4º`;
- placar: `2–1` visualmente; acessibilidade: “dois a um”;
- percentual: `63%`;
- rating: uma casa decimal quando houver precisão real;
- overall: inteiro;
- temporada: `2026` ou `2026/27` conforme competição.

Centralizar formatadores em `src/utils/formatters`; nenhum componente deve improvisar `toLocaleString` com regras próprias.

### 16.3 Estados vazios

Todo vazio deve explicar:

1. o que não existe;
2. por quê, se conhecido;
3. qual ação está disponível.

Exemplo: `Nenhuma proposta recebida. Continue jogando bem para atrair clubes maiores.`

---

## 17. Acessibilidade obrigatória

- Contraste WCAG AA para texto normal e componentes.
- Touch target mínimo 44×44; preferência 48×48.
- VoiceOver e TalkBack nos fluxos principais.
- Labels que incluam contexto: “Flamengo, 2 gols” e não apenas “2”.
- Tabelas devem oferecer leitura por linha e resumo alternativo.
- Não usar cor isoladamente.
- Respeitar fonte dinâmica sem cortar CTA.
- Respeitar `reduceMotion`.
- Foco visível em teclado/controle quando suportado.
- Bottom sheets e modais devem prender foco e devolver foco ao elemento de origem.
- Imagens decorativas sem anúncio; escudos com nome do clube quando informativos.
- Adicionar `accessibilityHint` somente quando trouxer informação nova.
- Testar em português do Brasil.

---

## 18. Responsividade

Breakpoints conceituais, não baseados em aparelho específico:

- `compact`: largura < 360;
- `phone`: 360–599;
- `tablet`: 600–839;
- `expanded`: ≥ 840.

No celular, bottom tabs. Em largura expandida, considerar sidebar usando a capacidade responsiva do React Navigation somente em fase própria.

- Cards de três colunas viram duas/uma conforme espaço.
- Métricas não devem forçar três colunas em fonte ampliada.
- Campo mantém proporção.
- Sheets podem virar painéis laterais em tablet.
- Definir largura máxima de conteúdo entre 720 e 960 px para leitura.

---

## 19. Performance

- Medir em build release, não apenas Metro/dev.
- Virtualizar elenco, mercado, calendário, timeline e transações.
- Usar `FlashList` quando a lista for longa/dinâmica; manter `FlatList` quando simples e comprovadamente suficiente.
- Não colocar `FlashList` dentro de `ScrollView` vertical.
- Extrair selectors Zustand para evitar rerender da tela inteira.
- Usar `React.memo` apenas com evidência e props estáveis.
- Não calcular agregações pesadas no render.
- Mover estatísticas derivadas para selectors/memos e testar determinismo.
- Evitar sombras pesadas e transparência em listas.
- Skia somente em telas que precisam de canvas.
- Carregar fonte e assets antes de remover splash, com timeout e fallback.
- Medir cold start, tempo até Home, FPS da tática, memória do elenco e partida longa.

Metas iniciais:

- navegação percebida sem travamento;
- scroll estável em Android intermediário;
- nenhuma lista longa montada integralmente;
- nenhum frame crítico bloqueado por acesso síncrono pesado ao banco;
- bundle e tamanho do APK comparados antes/depois de cada dependência nativa.

---

## 20. Testes e qualidade

### Unitários

- tokens e seleção de tema;
- formatadores;
- variantes de rating/overall;
- estados derivados;
- migrações de persistência;
- engines continuam cobertos.

### Componentes

Com Testing Library:

- Button em todos os estados;
- ListItem com fonte ampliada;
- MatchCard pré/ao vivo/final;
- tabela e leitura acessível;
- filtros;
- dialogs e sheets;
- tema claro/escuro;
- empty/error/loading.

### E2E

Com Detox, no mínimo:

1. iniciar nova carreira;
2. continuar save existente;
3. montar escalação e salvar;
4. jogar uma partida até o resultado;
5. comprar/vender jogador;
6. renovar contrato;
7. alterar tema e reiniciar app;
8. reiniciar carreira com confirmação;
9. validar persistência ao background;
10. fluxo básico com TalkBack/VoiceOver validado manualmente.

### Quality gate

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
# build Android debug/release conforme CI
# build iOS no runner/macOS disponível
# E2E crítico antes de merge de fase
```

Nenhuma fase deve encerrar com `as any`, erro ignorado, snapshot atualizado às cegas, `eslint-disable` global ou teste removido para “ficar verde”.

---

## 21. Plano de implementação por fases

### Fase 0 — baseline e proteção

- Criar branch `feat/design-system-v2`.
- Registrar screenshots das telas atuais em Android e iOS.
- Rodar typecheck, lint, testes e builds antes de alterar.
- Inventariar telas, componentes, cores literais, `ScrollView`, `map` de listas e assets.
- Criar documento de decisões técnicas `docs/adr/`.
- Não alterar engine.

**Aceite:** baseline documentada e CI verde.

### Fase 1 — fundações

- Adicionar fontes Barlow.
- Criar tokens, temas claro/escuro e provider.
- Persistir preferência `light/dark/system`.
- Atualizar status bar, navigation theme e splash.
- Criar wrappers `Text`, `Box`, `Pressable`, `Icon`.
- Criar regra/lint ou busca de CI contra hex novo em screens.

**Aceite:** showcase interno renderiza todos os tokens nos dois temas e fontes iguais em Android/iOS.

### Fase 2 — componentes

- Button, IconButton, Card, ListItem, Chip, Badge, Tabs, SearchField, Dialog, Snackbar, Skeleton, EmptyState, StatValue, TeamCrest e MatchCard.
- Migrar feedback global.
- Testar estados e acessibilidade.

**Aceite:** catálogo de componentes, testes e zero duplicação nova.

### Fase 3 — shell e navegação

- Reorganizar tabs.
- Criar stacks por aba.
- Tornar CTA central contextual.
- Mover Ajustes.
- Adicionar busca global inicial.
- Recriar headers e comportamento de voltar.

**Aceite:** deep links/rotas existentes continuam alcançáveis, back funciona em Android e gestos em iOS.

### Fase 4 — telas de maior uso

- Menu/continuar carreira.
- Home.
- Central.
- Elenco.
- Jogador.
- Escalação/tática.

**Aceite:** principais decisões executáveis, scroll fluido e regressão funcional coberta.

### Fase 5 — competição e partida

- Competição com tabs.
- Calendário/jogos.
- Pré-jogo.
- Partida ao vivo.
- Resultado.
- Tabela ao vivo.

**Aceite:** uma temporada pode ser jogada sem perda de funcionalidade e a partida mantém determinismo.

### Fase 6 — gestão

- Mercado.
- Contratos.
- Finanças.
- Estádio.
- Base.
- Gabinete/carreira.
- Ajustes.

**Aceite:** todas as telas usam design system v2 e não importam cores antigas.

### Fase 7 — novas visualizações

- Estender o modelo de eventos somente onde necessário.
- Shotmap, heatmap, momentum e comparações.
- Skia somente após protótipo e prova de performance.

**Aceite:** cada gráfico corresponde a dados reais, possui legenda e alternativa acessível.

### Fase 8 — endurecimento e release

- Acessibilidade final.
- Performance profiling.
- E2E Android/iOS.
- Sentry em builds de distribuição.
- auditoria de licenças;
- atualizar README, screenshots e documentação.

**Aceite:** CI verde, builds release, checklist de produto e nenhum bloqueador P0.

---

## 22. Ordem de migração dos arquivos atuais

1. `src/theme` → bridge para `src/design-system/tokens` e `themes`.
2. `App.tsx` → provider, status bar, splash e tema da navegação.
3. `src/components/Icone` → registry v2 sem quebrar nomes existentes.
4. `src/components/ui` → reexport temporário dos novos componentes.
5. `FeedbackProvider`, `TabBar`, `ScreenContainer`, `AppHeader`.
6. Home/Central/Competition.
7. Squad/PlayerDetail/Tactics.
8. MatchSimulation/PreJogo/MatchResult.
9. TransferMarket/Contratos/Club.
10. Demais telas.
11. Remover compatibilidade antiga após busca final.

Não fazer um commit gigante. Cada fase deve ter commits pequenos por fundação, componente e tela.

---

## 23. Regras inegociáveis para o Claude Code

1. Primeiro leia `README.md`, `package.json`, `src/theme`, `src/navigation`, `src/components/ui`, `src/components/Icone`, stores e as telas afetadas.
2. Não altere regras do engine para “fazer a UI funcionar” sem demonstrar a necessidade.
3. Não remova funcionalidades existentes.
4. Não substitua Zustand ou SQLite.
5. Não migre para Expo.
6. Não instale bibliotecas sem justificar caso, compatibilidade, tamanho e sobreposição.
7. Não copie assets, fonte, ícones ou layout do Sofascore.
8. Não use hex direto em screens/components de produto.
9. Não crie componentes locais que duplicam o design system.
10. Não misture idiomas em nomes novos: domínio em português, termos técnicos genéricos em inglês, seguindo a convenção existente.
11. Preserve TypeScript strict e evite casts inseguros.
12. Preserve determinismo; nada de `Math.random` ou `Date.now` na engine.
13. Preserve save existente ou crie migração versionada e testada.
14. Teste Android e iOS em cada dependência nativa.
15. Toda interação precisa de loading/disabled/error/success quando aplicável.
16. Toda ação destrutiva precisa de confirmação contextual.
17. Toda lista longa deve ser virtualizada ou justificada.
18. Toda informação por cor deve ter redundância textual/visual.
19. Toda tela deve funcionar em 320 px e com fonte ampliada.
20. Execute typecheck, lint e testes antes de declarar concluído.

---

## 24. Prompt mestre para executar no Claude Code

Copie o bloco abaixo junto com este arquivo dentro do repositório.

```text
Você está trabalhando no repositório FOTEBALL, um manager de futebol brasileiro em React Native CLI. Sua tarefa é executar uma reconstrução incremental da identidade visual e da experiência, conforme o documento FOTEBALL_BRIEFING_IDENTIDADE_VISUAL.md.

OBJETIVO
Criar um produto esportivo clean, denso e rápido, inspirado nos princípios de organização de dados do Sofascore, mas com identidade própria do FOTEBALL. Não copie marca, fonte, ícones, assets ou telas do Sofascore.

ANTES DE ALTERAR
1. Leia README.md, package.json, App.tsx, src/theme, src/navigation, src/components/ui, src/components/Icone, src/store e todas as telas que serão tocadas.
2. Rode npm run typecheck, npm run lint e npm test -- --runInBand.
3. Verifique git status e preserve alterações existentes do usuário.
4. Faça um inventário com rg de cores literais, estilos fixos, ScrollView, listas renderizadas com map e imports do tema antigo.
5. Apresente um plano da fase atual e os arquivos que pretende modificar.

MODO DE EXECUÇÃO
- Execute uma fase por vez, começando pela Fase 0 e Fase 1.
- Não avance para a fase seguinte se os critérios de aceite da atual não estiverem satisfeitos.
- Faça mudanças pequenas e reversíveis.
- Não reescreva engine, stores ou banco sem necessidade explícita.
- Preserve saves; qualquer mudança de schema exige migração e teste.
- Não migre para Expo.
- Não substitua Zustand, SQLite, React Navigation, Reanimated, Gesture Handler, SVG ou Lucide.
- Adicione somente as bibliotecas aprovadas para a fase e confira peerDependencies/New Architecture antes.

DESIGN SYSTEM
- Crie src/design-system com tokens, temas, primitives, components e sports.
- Tema claro é o padrão; ofereça claro/escuro/sistema.
- Use Barlow e Barlow Condensed empacotadas localmente em TTF estáticos.
- Implemente tokens semânticos; proíba hex em telas.
- Números esportivos usam tabular-nums.
- Não use glow e gradiente como padrão de card.
- Mantenha Lucide para sistema e crie SVGs próprios apenas para domínio esportivo insuficiente.

QUALIDADE
- TypeScript strict, sem any novo.
- Testes com Testing Library para componentes.
- Acessibilidade: labels, roles, contraste, 44/48 px, fonte dinâmica, reduce motion.
- Performance: virtualização para listas longas, selectors Zustand, medição em release.
- Android e iOS devem compilar.

ENTREGA DE CADA FASE
1. resumo do que foi implementado;
2. arquivos alterados;
3. decisões e trade-offs;
4. comandos de validação e resultados;
5. screenshots Android/iOS quando houver UI;
6. pendências reais;
7. confirmação explícita de que nenhuma funcionalidade foi removida.

COMECE AGORA APENAS PELA FASE 0: baseline, inventário, validação e proposta detalhada da Fase 1. Não implemente todas as telas de uma vez.
```

---

## 25. Checklist final de aceite visual

- [ ] A interface parece FOTEBALL, não uma cópia do Sofascore.
- [ ] Tema claro funciona como padrão.
- [ ] Tema escuro é completo, não inversão improvisada.
- [ ] Fontes são idênticas em Android e iOS.
- [ ] Nenhum texto crítico é cortado com fonte ampliada.
- [ ] Listas densas são fáceis de escanear.
- [ ] Próxima decisão é evidente na Home.
- [ ] Ajustes não ocupam uma aba principal.
- [ ] Competição e partida possuem tabs internas.
- [ ] Elenco possui lista densa e filtros.
- [ ] Tática mantém drag-and-drop fluido.
- [ ] Cores têm significado consistente.
- [ ] Não há cor de clube dominando superfícies.
- [ ] Ícones vêm de uma família consistente.
- [ ] Estados vazio/erro/loading são padronizados.
- [ ] Ações destrutivas explicam consequência.
- [ ] Android e iOS possuem áreas seguras corretas.
- [ ] VoiceOver/TalkBack conseguem usar fluxos críticos.
- [ ] CI, testes e builds release passam.
- [ ] README e documentação refletem a implementação real.

---

## 26. Referências verificadas

- Repositório auditado: [Danpazexe/FOTEBALL](https://github.com/Danpazexe/FOTEBALL)
- Sofascore, redesign da Home e sistema de filtros: [Sofascore’s New Home Screen](https://www.sofascore.com/news/sofascores-new-home-screen-a-smarter-faster-way-to-follow-sports)
- Sofascore, novos mapas de passe, drible e defesa: [A Smarter Way to Read the Game](https://www.sofascore.com/news/introducing-sofascores-new-maps-a-smarter-way-to-read-the-game)
- Família proprietária e conceito numérico: [Hot Type — Sofascore Sans](https://hottype.co/projects/sofascore)
- Motion e tipografia da marca: [Order Design — Sofascore](https://www.orderdesign.co.uk/sofascore)
- Ícones esportivos customizados: [North2 — Sofascore Icon Design](https://dribbble.com/shots/20517531-Sofascore-Icon-design)
- Acessibilidade no React Native: [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- Listas e desempenho: [React Native FlatList](https://reactnative.dev/docs/flatlist) e [FlashList 2.x](https://shopify.github.io/flash-list/docs/)
- Gráficos de alto desempenho: [React Native Skia](https://shopify.github.io/react-native-skia/)
- Bottom sheets: [React Native Bottom Sheet](https://gorhom.dev/react-native-bottom-sheet/)
- Navegação por abas: [React Navigation Bottom Tabs](https://reactnavigation.org/docs/bottom-tab-navigator/)

---

## Decisão final

O FOTEBALL já tem o que muitos projetos nunca chegam a construir: um jogo de verdade por baixo da interface. A mudança correta não é jogar isso fora, mas dar ao motor uma cabine digna. A nova identidade deve trocar o “tema escuro com cards” por um sistema de produto: claro por padrão, números fortes, decisões visíveis, listas rápidas e futebol presente nos detalhes.

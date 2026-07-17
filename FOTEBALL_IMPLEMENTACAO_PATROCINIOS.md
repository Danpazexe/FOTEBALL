# FOTEBALL — Implementação do Sistema de Patrocínios

> Briefing técnico e funcional para Claude Code  
> Projeto: FOTEBALL · React Native CLI · TypeScript strict · Zustand · op-sqlite  
> Asset principal: `patrocinadores-grid-6x6.png` · 1254 × 1254 px · 36 células de 209 × 209 px

---

## 1. OBJETIVO

Implementar um sistema de patrocínios simples, bonito e relevante para um jogo de técnico/manager inspirado na objetividade do Brasfoot e na clareza visual do SofaScore.

O jogador deve conseguir:

1. Visualizar o patrocinador atual.
2. Comparar no máximo três propostas.
3. Aceitar ou recusar uma proposta sem negociação cansativa.
4. Acompanhar pagamentos, duração e até duas metas por contrato.
5. Receber bônus automaticamente quando cumprir objetivos.

O sistema não pode virar um simulador burocrático. As informações exibidas precisam ajudar uma decisão real.

---

## 2. REGRA DE BRANCH, COMMIT E CI

### Obrigatório

- Continuar trabalhando na branch atualmente aberta.
- Se a branch atual for `feat/design-system-v2`, permanecer nela.
- Não criar outra branch para esta implementação.
- Não trocar de branch sem autorização expressa do usuário.
- Não executar `git commit`, `git push`, abrir PR ou criar tag automaticamente.
- Somente apresentar as alterações prontas no working tree.
- Aguardar autorização expressa antes de qualquer commit ou push.
- Não alterar workflows do GitHub Actions para contornar builds.

### Motivo

Cada push pode disparar builds e consumir recursos. Durante a implementação, executar validações apenas localmente.

---

## 3. REGRAS DOS ASSETS

### Arquivo recebido

```text
patrocinadores-grid-6x6.png
Dimensão: 1254 × 1254 px
Grid: 6 colunas × 6 linhas
Célula: 209 × 209 px
Fundo: branco
```

### Regras obrigatórias

- Usar apenas PNG no aplicativo.
- Não implementar SVG.
- Não instalar biblioteca de SVG.
- Não usar recorte dinâmico da sprite sheet durante a renderização.
- Separar a prancha em 36 arquivos PNG antes de utilizá-los no React Native.
- Salvar os arquivos finais em:

```text
src/assets/patrocinadores/
```

### Nomenclatura

```text
01-colacoca.png
02-keni.png
03-dibas.png
...
36-shopix.png
```

### Separação da prancha

Criar um script de desenvolvimento:

```text
scripts/split-sponsor-grid.mjs
```

O script deve:

1. Ler a imagem 1254 × 1254.
2. Percorrer 6 linhas e 6 colunas.
3. Recortar células exatas de 209 × 209.
4. Gerar os 36 PNGs.
5. Preservar fundo branco e qualidade.
6. Falhar com mensagem clara se a imagem não tiver a dimensão esperada.
7. Nunca ser executado no runtime Android/iOS.

Se for necessário adicionar `sharp`, utilizar somente como `devDependency`, justificar no relatório e não incluí-lo no bundle mobile.

### Importação no React Native

O Metro Bundler não aceita `require()` com caminho totalmente dinâmico. Criar mapa estático:

```typescript
// src/assets/patrocinadores/index.ts
export const logosPatrocinadores = {
  colacoca: require('./01-colacoca.png'),
  keni: require('./02-keni.png'),
  dibas: require('./03-dibas.png'),
  // ...todos os 36
} as const;
```

Não armazenar `require()` no banco de dados. Persistir apenas o `patrocinadorId`.

---

## 4. CATÁLOGO DOS 36 PATROCINADORES

> Os nomes são fictícios/paródicos. Antes do lançamento comercial, realizar validação jurídica ou substituir por marcas totalmente autorais.

| Nº | Linha | Coluna | ID | Nome exibido | Categoria | Alcance |
|---:|---:|---:|---|---|---|---|
| 01 | 1 | 1 | `colacoca` | COLACOCA | Bebidas | Global |
| 02 | 1 | 2 | `keni` | KENI | Material esportivo | Global |
| 03 | 1 | 3 | `dibas` | DIBAS | Material esportivo | Global |
| 04 | 1 | 4 | `pulma` | PULMA | Performance | Global |
| 05 | 1 | 5 | `pipsy` | PIPSY | Refrigerantes | Global |
| 06 | 1 | 6 | `amazoom` | AMAZOOM | Comércio digital | Global |
| 07 | 2 | 1 | `perabyte` | PERABYTE | Tecnologia | Nacional |
| 08 | 2 | 2 | `sunsam` | SUNSAM | Eletrônicos | Nacional |
| 09 | 2 | 3 | `mc_dino` | MC DINO | Alimentação | Regional |
| 10 | 2 | 4 | `red_bison` | RED BISON | Energético | Nacional |
| 11 | 2 | 5 | `upper` | UPPER | Mobilidade | Regional |
| 12 | 2 | 6 | `spotwave` | SPOTWAVE | Streaming | Regional |
| 13 | 3 | 1 | `nubrix` | NUBRIX | Banco digital | Global |
| 14 | 3 | 2 | `itauno` | ITAUNO | Banco | Nacional |
| 15 | 3 | 3 | `bradix` | BRADIX | Banco | Nacional |
| 16 | 3 | 4 | `vivaon` | VIVAON | Telecomunicações | Nacional |
| 17 | 3 | 5 | `tin` | TIN | Telecomunicações | Regional |
| 18 | 3 | 6 | `claru` | CLARU | Telecomunicações | Regional |
| 19 | 4 | 1 | `fati` | FATI | Automotivo | Regional |
| 20 | 4 | 2 | `voltz` | VOLTZ | Energia/mobilidade | Regional |
| 21 | 4 | 3 | `tayota` | TAYOTA | Automotivo | Nacional |
| 22 | 4 | 4 | `vrolet` | VROLET | Automotivo | Nacional |
| 23 | 4 | 5 | `brama` | BRAMA | Bebidas | Regional |
| 24 | 4 | 6 | `heniken` | HENIKEN | Bebidas | Nacional |
| 25 | 5 | 1 | `amveb` | AMVEB | Bebidas | Nacional |
| 26 | 5 | 2 | `gatora` | GATORA | Bebida esportiva | Regional |
| 27 | 5 | 3 | `netflex` | NETFLEX | Streaming | Global |
| 28 | 5 | 4 | `youlive` | YOULIVE | Vídeos | Nacional |
| 29 | 5 | 5 | `toktic` | TOKTIC | Rede social | Regional |
| 30 | 5 | 6 | `instaplay` | INSTAPLAY | Entretenimento | Nacional |
| 31 | 6 | 1 | `gugol` | GUGOL | Tecnologia | Global |
| 32 | 6 | 2 | `microsys` | MICROSYS | Software | Global |
| 33 | 6 | 3 | `viza` | VIZA | Pagamentos | Global |
| 34 | 6 | 4 | `mastercash` | MASTERCASH | Pagamentos | Global |
| 35 | 6 | 5 | `mercado_vivo` | MERCADO VIVO | Comércio digital | Regional |
| 36 | 6 | 6 | `shopix` | SHOPIX | Comércio digital | Global |

---

## 5. MODELO DE GAMEPLAY

### Fluxo simples

```text
Início da temporada
  → gerar até 3 propostas
  → jogador compara
  → aceita 1 patrocinador principal
  → pagamentos automáticos por rodada/mês
  → metas atualizadas automaticamente
  → bônus ao cumprir objetivo
  → renovação ou novas propostas ao fim do contrato
```

### Limites contra excesso de informação

- Mostrar no máximo três propostas simultâneas.
- Permitir apenas um patrocinador principal ativo no MVP.
- Cada contrato pode ter zero, uma ou duas metas.
- Não criar telas de reuniões, agentes ou negociação por mensagens.
- Não exigir confirmação em cada pagamento.
- Não interromper o jogador a cada rodada.
- Agrupar acontecimentos menores no resumo financeiro.
- Destacar somente: valor, duração, metas, bônus e risco.

### Ações permitidas

- `Ver detalhes`
- `Comparar`
- `Aceitar proposta`
- `Recusar`
- `Renovar`, quando elegível

Não criar sliders complexos de contraproposta na primeira versão.

---

## 6. REGRAS DE GERAÇÃO DE PROPOSTAS

Toda geração deve ser determinística e viver em `src/engine/`.

### Proibido

- `Math.random()`
- `Date.now()` dentro da engine
- dependência de React na engine

### Seed sugerida

```text
seed = temporadaId × 100000
     + clubeId × 100
     + janelaPatrocinio
```

Utilizar o `criarRNG(seed)` já definido pelo projeto.

### Fatores da proposta

```text
valorBaseDivisao
× multiplicadorAlcance
× fatorReputacaoClube
× fatorDesempenhoRecente
× fatorTorcida
× fatorDuracao
```

### Multiplicador de alcance

```typescript
const MULTIPLICADOR_ALCANCE = {
  REGIONAL: 0.75,
  NACIONAL: 1.0,
  GLOBAL: 1.35,
} as const;
```

### Elegibilidade sugerida

- Regional: qualquer divisão.
- Nacional: reputação média ou clube em divisão nacional relevante.
- Global: reputação alta, primeira divisão, competição continental ou desempenho excepcional.

Não bloquear totalmente um patrocinador global. Permitir uma pequena chance determinística quando o clube fizer campanha histórica.

### Quantidade e duração

- Gerar até três propostas válidas.
- Duração: uma, duas ou três temporadas.
- Contratos maiores pagam mais no total, mas podem oferecer valor anual ligeiramente menor.
- Uma marca não pode enviar duas propostas simultâneas.
- O patrocinador atual pode oferecer renovação nos últimos 20% do contrato.

---

## 7. METAS DE CONTRATO

Selecionar no máximo duas metas compatíveis com o clube.

### Metas permitidas

- Terminar acima de determinada posição.
- Conseguir acesso de divisão.
- Evitar rebaixamento.
- Chegar a uma fase específica da copa.
- Conquistar título.
- Obter determinado número de vitórias.
- Manter sequência de jogos sem derrota.
- Utilizar jogadores da base em determinada quantidade de partidas.

### Regras

- Metas devem ser realistas para a força e divisão do clube.
- Nunca exigir título de um clube candidato ao rebaixamento.
- Meta obrigatória deve influenciar o valor fixo.
- Meta bônus deve pagar somente quando concluída.
- O progresso é calculado automaticamente pelos resultados já existentes.
- Não criar minigames ou tarefas manuais para patrocínio.

---

## 8. TIPOS TYPESCRIPT

Criar ou integrar aos tipos de domínio existentes:

```typescript
export type AlcancePatrocinador = 'REGIONAL' | 'NACIONAL' | 'GLOBAL';

export type StatusPropostaPatrocinio =
  | 'PENDENTE'
  | 'ACEITA'
  | 'RECUSADA'
  | 'EXPIRADA';

export type StatusContratoPatrocinio =
  | 'ATIVO'
  | 'CONCLUIDO'
  | 'RESCINDIDO';

export type TipoMetaPatrocinio =
  | 'POSICAO_LIGA'
  | 'ACESSO'
  | 'EVITAR_REBAIXAMENTO'
  | 'FASE_COPA'
  | 'TITULO'
  | 'VITORIAS'
  | 'INVENCIBILIDADE'
  | 'USO_DA_BASE';

export interface Patrocinador {
  readonly id: string;
  readonly nome: string;
  readonly categoria: string;
  readonly alcance: AlcancePatrocinador;
  readonly ativo: boolean;
}

export interface MetaPatrocinio {
  readonly id: string;
  readonly tipo: TipoMetaPatrocinio;
  readonly descricao: string;
  readonly alvo: number;
  readonly progresso: number;
  readonly valorBonus: number;
  readonly concluida: boolean;
}

export interface PropostaPatrocinio {
  readonly id: string;
  readonly patrocinadorId: string;
  readonly clubeId: number;
  readonly temporadaInicio: number;
  readonly duracaoTemporadas: 1 | 2 | 3;
  readonly valorFixoTotal: number;
  readonly valorPorPagamento: number;
  readonly metas: readonly MetaPatrocinio[];
  readonly rodadaExpiracao: number;
  readonly status: StatusPropostaPatrocinio;
}

export interface ContratoPatrocinio {
  readonly id: string;
  readonly propostaOrigemId: string;
  readonly patrocinadorId: string;
  readonly clubeId: number;
  readonly temporadaInicio: number;
  readonly temporadaFim: number;
  readonly valorFixoTotal: number;
  readonly valorPago: number;
  readonly metas: readonly MetaPatrocinio[];
  readonly status: StatusContratoPatrocinio;
}
```

Não usar `any`, cast duplo, `@ts-ignore` ou tipos extensos inline.

---

## 9. ENGINE PURA

Criar:

```text
src/engine/patrocinio.ts
```

Funções sugeridas:

```typescript
gerarPropostasPatrocinio(input, seed)
calcularValorPropostaPatrocinio(input)
selecionarMetasPatrocinio(input, rng)
aceitarPropostaPatrocinio(input)
processarPagamentoPatrocinio(input)
atualizarMetasPatrocinio(input)
processarFimContratoPatrocinio(input)
gerarRenovacaoPatrocinio(input, seed)
```

Todas devem ser puras. O acesso ao SQLite e ao Zustand fica fora da engine.

---

## 10. PERSISTÊNCIA OP-SQLITE

Criar migration versionada. Não apagar saves existentes.

### Tabelas sugeridas

```sql
CREATE TABLE IF NOT EXISTS patrocinadores (
  id TEXT PRIMARY KEY NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  alcance TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS propostas_patrocinio (
  id TEXT PRIMARY KEY NOT NULL,
  patrocinador_id TEXT NOT NULL,
  clube_id INTEGER NOT NULL,
  temporada_inicio INTEGER NOT NULL,
  duracao_temporadas INTEGER NOT NULL,
  valor_fixo_total INTEGER NOT NULL,
  valor_por_pagamento INTEGER NOT NULL,
  metas_json TEXT NOT NULL,
  rodada_expiracao INTEGER NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS contratos_patrocinio (
  id TEXT PRIMARY KEY NOT NULL,
  proposta_origem_id TEXT NOT NULL,
  patrocinador_id TEXT NOT NULL,
  clube_id INTEGER NOT NULL,
  temporada_inicio INTEGER NOT NULL,
  temporada_fim INTEGER NOT NULL,
  valor_fixo_total INTEGER NOT NULL,
  valor_pago INTEGER NOT NULL DEFAULT 0,
  metas_json TEXT NOT NULL,
  status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pagamentos_patrocinio (
  id TEXT PRIMARY KEY NOT NULL,
  contrato_id TEXT NOT NULL,
  temporada INTEGER NOT NULL,
  rodada INTEGER NOT NULL,
  tipo TEXT NOT NULL,
  valor INTEGER NOT NULL,
  processado_em INTEGER NOT NULL
);
```

Valores monetários devem ser persistidos como inteiros na menor unidade usada pelo jogo. Não usar `float` para dinheiro.

Criar repositórios em:

```text
src/api/repositorios/patrocinioRepositorio.ts
```

---

## 11. ZUSTAND

Criar ou integrar:

```text
src/store/slices/patrocinioSlice.ts
```

Estado mínimo:

```typescript
interface PatrocinioSlice {
  propostasPatrocinio: readonly PropostaPatrocinio[];
  contratoPatrocinioAtivo: ContratoPatrocinio | null;
  historicoPatrocinios: readonly ContratoPatrocinio[];
  carregarPatrocinios: () => Promise<void>;
  gerarNovasPropostas: () => Promise<void>;
  aceitarProposta: (propostaId: string) => Promise<void>;
  recusarProposta: (propostaId: string) => Promise<void>;
}
```

Evitar selecionar o store inteiro nas telas. Usar seletores pequenos para reduzir renderizações.

---

## 12. NAVEGAÇÃO

Adicionar ao `ClubeStack`:

```text
CentralClube
  → Patrocínios
      → Detalhes da proposta
      → Detalhes do contrato
```

### Regras

- A tab bar continua selecionando `Clube`.
- A tela Patrocínios é interna ao stack de Clube.
- Header fixo com botão de voltar.
- Não transformar Patrocínios em item permanente da tab bar.
- Ao tocar novamente em Clube, aplicar `popToTop()` conforme o padrão definido no projeto.

---

## 13. TELA DE PATROCÍNIOS

Criar:

```text
src/screens/Clube/Patrocinios/PatrociniosScreen.tsx
src/screens/Clube/Patrocinios/DetalhePropostaPatrocinioScreen.tsx
src/screens/Clube/Patrocinios/DetalheContratoPatrocinioScreen.tsx
```

### Estrutura visual

```text
Header fixo
  ← Patrocínios

Resumo do contrato atual
  Logo
  Nome
  Valor total
  Próximo pagamento
  Tempo restante
  Progresso das metas

Segmented control
  Propostas | Contrato | Histórico

Lista de propostas
  Logo + nome
  Valor
  Duração
  Até 2 metas
  Comparar / Ver proposta
```

### Direção visual

- Fundo neutro claro ou tokens oficiais do design system.
- Cards brancos com borda suave.
- Azul primário para ações.
- Verde apenas para dinheiro recebido, meta concluída e resultado positivo.
- Vermelho apenas para expiração, risco ou rescisão.
- Logo em contêiner branco, sem distorcer proporção.
- `resizeMode="contain"` para todas as imagens.
- Espaçamento de 16 px entre seções.
- Números importantes com hierarquia forte.
- Texto secundário curto e direto.
- Não exibir gráficos sem utilidade decisória.

### Estados obrigatórios

- Loading com skeleton.
- Sem patrocinador ativo.
- Sem propostas disponíveis.
- Proposta expirando.
- Contrato ativo.
- Meta concluída.
- Erro de persistência com opção de tentar novamente.

---

## 14. COMPONENTES REUTILIZÁVEIS

Criar somente quando houver reutilização real:

```text
src/components/Patrocinio/LogoPatrocinador.tsx
src/components/Patrocinio/CardPropostaPatrocinio.tsx
src/components/Patrocinio/CardContratoPatrocinio.tsx
src/components/Patrocinio/ProgressoMetaPatrocinio.tsx
src/components/Patrocinio/ComparadorPropostasPatrocinio.tsx
```

### `LogoPatrocinador`

- Recebe `patrocinadorId`.
- Resolve a imagem pelo mapa estático.
- Usa `Image` nativo do React Native.
- Usa `resizeMode="contain"`.
- Possui fallback visual quando o ID não existir.
- Não usa URI remota.

---

## 15. INTEGRAÇÃO FINANCEIRA

Ao processar pagamento:

1. Verificar idempotência pelo contrato + temporada + rodada + tipo.
2. Registrar em `pagamentos_patrocinio`.
3. Creditar a receita no sistema financeiro existente.
4. Atualizar `valorPago` do contrato.
5. Criar um evento curto no feed/notificações do clube.

Nunca creditar duas vezes ao reabrir o save ou repetir a mesma rodada.

Descrição financeira sugerida:

```text
Patrocínio — COLACOCA
Bônus de meta — RED BISON
```

---

## 16. ANIMAÇÕES E ACESSIBILIDADE

- Usar somente `react-native-reanimated`.
- Entrada suave dos cards com `withTiming`.
- Feedback de aceite com animação curta, sem confete excessivo.
- Respeitar preferência de redução de movimento.
- Todos os botões devem ter `accessibilityRole` e `accessibilityLabel`.
- Não comunicar estado apenas por cor.
- Garantir área de toque mínima de 44 × 44.
- Testar fonte ampliada sem cortar valor, duração ou nome.

---

## 17. TESTES

Criar:

```text
__tests__/engine/patrocinio.test.ts
__tests__/store/patrocinioSlice.test.ts
__tests__/screens/PatrociniosScreen.test.tsx
```

### Casos obrigatórios da engine

1. Mesma seed produz as mesmas propostas.
2. Não existem patrocinadores repetidos entre as três propostas.
3. Clube de baixa reputação recebe principalmente propostas regionais.
4. Clube de alta reputação pode receber proposta global.
5. Contrato nunca possui mais de duas metas.
6. Meta impossível não é atribuída ao clube.
7. Pagamento não é processado duas vezes.
8. Meta concluída credita bônus uma única vez.
9. Contrato expira na temporada correta.
10. Renovação é gerada apenas quando elegível.

### Casos obrigatórios de UI

- Renderiza logo correta pelo ID.
- Renderiza estado vazio.
- Compara três propostas.
- Confirma aceite antes de substituir estado.
- Exibe progresso da meta.
- Header volta corretamente para a Central do Clube.

---

## 18. ORDEM DE IMPLEMENTAÇÃO

### Fase 1 — Assets

- Adicionar a prancha PNG.
- Criar script de recorte.
- Gerar e validar 36 PNGs.
- Criar mapa estático de imports.

### Fase 2 — Domínio

- Tipos.
- Catálogo dos patrocinadores.
- Engine determinística.
- Testes unitários.

### Fase 3 — Persistência

- Migration.
- Repositório SQLite.
- Seed do catálogo.
- Testes de idempotência.

### Fase 4 — Estado

- Slice Zustand.
- Integração com finanças, temporada e rodada.

### Fase 5 — Interface

- Componentes.
- Tela principal.
- Detalhes e comparação.
- Navegação interna do Clube.

### Fase 6 — Validação

- Typecheck.
- Lint.
- Testes.
- Teste manual Android.
- Teste manual iOS.

---

## 19. DEFINIÇÃO DE PRONTO

- [ ] 36 PNGs individuais gerados e corretos.
- [ ] Nenhum SVG usado ou instalado.
- [ ] Logos sem distorção e com `contain`.
- [ ] Catálogo tipado com os 36 patrocinadores.
- [ ] Propostas determinísticas.
- [ ] Máximo de três propostas.
- [ ] Máximo de duas metas por contrato.
- [ ] Um patrocinador principal ativo no MVP.
- [ ] Pagamentos idempotentes.
- [ ] Persistência segura em saves existentes.
- [ ] Integração com finanças.
- [ ] Tela acessível em Clube → Patrocínios.
- [ ] Header fixo com botão de voltar.
- [ ] Tab bar permanece no contexto de Clube.
- [ ] Estados de loading, vazio e erro implementados.
- [ ] `npm run typecheck` sem erros.
- [ ] `npm run lint` sem warnings relevantes.
- [ ] `npm test` verde.
- [ ] Android validado.
- [ ] iOS validado.
- [ ] Nenhum commit ou push realizado sem autorização.

---

## 20. FORMATO DO RELATÓRIO DO CLAUDE

Ao finalizar, responder:

```markdown
## ✅ Sistema de Patrocínios implementado

### Branch
- Branch utilizada: [nome]
- Nova branch criada: não
- Commit realizado: não
- Push realizado: não

### Assets
- Prancha validada: 1254 × 1254
- PNGs individuais: 36/36
- SVG utilizado: não

### Arquivos criados/modificados
- [listar arquivos]

### Funcionalidades
- [listar o que foi implementado]

### Validação
- Typecheck: ✅/❌
- Lint: ✅/❌
- Testes: ✅/❌
- Android: ✅/❌
- iOS: ✅/❌

### Pendências reais
- [listar apenas bloqueios verdadeiros]
```

Não declarar a tarefa concluída se typecheck, lint ou testes estiverem falhando.

---

*FOTEBALL · Sistema de Patrocínios · Briefing para Claude Code*

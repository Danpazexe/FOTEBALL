# FOTEBALL — instruções permanentes

> Arquivo carregado automaticamente pelo Claude Code.
> Projeto: FOTEBALL
> Repositório: https://github.com/Danpazexe/FOTEBALL

## Skill obrigatória

Em qualquer tarefa deste projeto, carregue e siga:

/foteball-manager

A skill está localizada em:

.claude/skills/foteball-manager/SKILL.md

As referências da skill contêm as regras detalhadas de engenharia, produto, design, Git e implementação.

## Fonte da verdade

Use nesta ordem:

1. Código e testes atuais.
2. package.json e lockfile.
3. Tipos, schema e migrações existentes.
4. Skill /foteball-manager.
5. Documentação atual do projeto.

Não use fórmulas, estruturas ou tarefas de documentos antigos quando divergirem do código atual.

## Produto

O FOTEBALL é um jogo mobile de técnico e gerenciamento de futebol brasileiro.

Direção principal:

- Brasfoot na dinâmica.
- Sofascore na apresentação.
- Profundo por baixo, simples por cima.
- Temporadas rápidas.
- Poucas decisões relevantes por rodada.
- Informação precisa e visualmente bonita.
- Detalhes adicionais somente por toque.
- Uma ação principal clara por tela.

Não transforme o jogo em Football Manager completo ou painel de análise profissional.

## Stack

- React Native CLI — não migrar para Expo.
- TypeScript strict.
- Zustand para estado do domínio.
- op-sqlite para persistência.
- React Navigation.
- Reanimated para animações novas ou modificadas.
- Lucide através do registry semântico existente.
- react-native-svg para vetores próprios.
- Jest para testes.

Não trocar stack ou instalar dependências sem autorização.

## Engine

- src/engine deve permanecer pura e determinística.
- Não usar React ou React Native na engine.
- Não usar Math.random().
- Não usar Date.now().
- Não acessar Zustand, SQLite ou rede.
- Receber seed, tempo e dependências por parâmetro.
- Nova regra de negócio exige teste.
- Não alterar regra do motor por necessidade apenas visual.

## Git

Durante o redesign, trabalhar exclusivamente na branch:

feat/design-system-v2

Regras:

- Nunca trabalhar diretamente na main.
- Não criar branch por tela, componente, tarefa, sessão ou modelo de IA.
- Não fazer commit sem autorização.
- Não fazer push automático.
- Não abrir PR automaticamente.
- Não fazer merge, tag ou release sem autorização.
- Não executar build remoto sem autorização.
- Preservar alterações preexistentes do usuário.

Antes de qualquer commit autorizado, mostrar:

1. git status;
2. arquivos incluídos;
3. resumo do diff;
4. mensagem proposta;
5. validações executadas.

## Validação

Quando aplicável, executar:

npm run typecheck
npm run lint
npm test -- --runInBand

Não declarar conclusão se houver falha nova.

Distinguir claramente problemas preexistentes de regressões criadas pela tarefa.

## Escopo

Antes de implementar:

1. Ler os arquivos afetados.
2. Apresentar plano curto.
3. Listar arquivos previstos.
4. Informar riscos.
5. Definir critérios de aceite.
6. Aguardar autorização quando solicitado.

Não remover funcionalidade para facilitar implementação.

Não implementar automaticamente funcionalidades P1/P2 de briefings anteriores.

## Documentos antigos

Não usar FOTEBALL_SKILL.md como contrato atual.

Não iniciar automaticamente formation-validation, balanceamento, refatoração do store ou qualquer tarefa antiga sem pedido explícito.

Em caso de conflito, este CLAUDE.md e a skill /foteball-manager prevalecem.
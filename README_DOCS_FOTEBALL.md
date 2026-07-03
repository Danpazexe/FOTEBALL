# README_DOCS_FOTEBALL.md
> Índice dos documentos de suporte do FOTEBALL.

---

## Documentos principais

### `CLAUDE.md`

Arquivo lido automaticamente pelo Claude Code. Define comportamento, regras, stack, fluxo e prioridade de engenharia.

### `BRASFOOT_MASTER.md`

Documento mestre de domínio do jogo. Contém regras de gameplay, simulação, temporada, mercado, finanças, moral, escalação e balanceamento.

### `FOTEBALL_SKILL.md`

Contrato de engenharia para Claude trabalhar no projeto. Explica como implementar, testar, entregar e respeitar a arquitetura.

### `FOTEBALL_ATUALIZACAO_10_10.md`

Briefing completo da atualização para transformar o projeto em core 10/10.

### `ROADMAP_CORE_10_10.md`

Roadmap por fases, com tarefas, arquivos prováveis, commits sugeridos e critérios de pronto.

### `TESTES_BALANCEAMENTO.md`

Estratégia de testes, simulação em massa e balanceamento da engine.

### `GIT_WORKFLOW_FOTEBALL.md`

Explicação do fluxo Git com branches `feat/...`, commits, push, pull, merge e PR.

### `PR_CHECKLIST_FOTEBALL.md`

Checklist para validar Pull Requests antes de merge na `main`.

---

## Ordem de leitura recomendada para Claude

```txt
1. CLAUDE.md
2. BRASFOOT_MASTER.md
3. FOTEBALL_SKILL.md
4. ROADMAP_CORE_10_10.md
5. TESTES_BALANCEAMENTO.md
6. GIT_WORKFLOW_FOTEBALL.md
7. PR_CHECKLIST_FOTEBALL.md
```

---

## Onde colocar no repositório

Recomendado colocar todos na raiz do projeto:

```txt
CLAUDE.md
BRASFOOT_MASTER.md
FOTEBALL_SKILL.md
FOTEBALL_ATUALIZACAO_10_10.md
ROADMAP_CORE_10_10.md
TESTES_BALANCEAMENTO.md
GIT_WORKFLOW_FOTEBALL.md
PR_CHECKLIST_FOTEBALL.md
README_DOCS_FOTEBALL.md
```

Opcionalmente, pode mover documentos auxiliares para:

```txt
docs/
```

Mas mantenha `CLAUDE.md` na raiz, porque o Claude Code costuma ler esse arquivo automaticamente.

---

## Primeiro comando recomendado

```bash
git checkout main
git pull origin main
git checkout -b docs/claude-project-rules
```

Depois copiar os arquivos `.md` para o repositório e commitar:

```bash
git add .
git commit -m "docs(project): add Claude engineering and gameplay rules"
git push origin docs/claude-project-rules
```

---

## Depois dos documentos

Começar implementação pela primeira branch real:

```bash
git checkout main
git pull origin main
git checkout -b feat/formation-validation
```

Primeira tarefa:

```txt
Criar validação central de escalação na core e testes automatizados.
```

---

*README_DOCS_FOTEBALL.md · Índice de documentação técnica*

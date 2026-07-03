# GIT_WORKFLOW_FOTEBALL.md
> Fluxo Git obrigatório para trabalhar no FOTEBALL sem quebrar a `main`.

---

## 1. Conceitos rápidos

| Termo | Significado |
|---|---|
| `main` | branch principal/estável do projeto |
| `branch` | linha separada de trabalho |
| `feat` | prefixo para nova funcionalidade |
| `origin` | repositório remoto no GitHub |
| `commit` | checkpoint/salvamento de alterações |
| `push` | envia commits para o GitHub |
| `pull` | baixa atualizações do GitHub |
| `merge` | junta uma branch na outra |
| `PR` | Pull Request, pedido de merge para `main` |

---

## 2. Regra principal

Nunca trabalhar direto na `main`.

Sempre criar uma branch:

```bash
git checkout main
git pull origin main
git checkout -b feat/nome-da-tarefa
```

Exemplo:

```bash
git checkout main
git pull origin main
git checkout -b feat/formation-validation
```

---

## 3. Nome de branches

Use nomes pequenos e claros.

```txt
feat/formation-validation
feat/match-balance-lab
feat/season-flow-tests
feat/market-ai-improvements
feat/store-refactor
feat/manager-ux
fix/save-load-corruption
fix/penalty-balance
refactor/game-store-slices
test/season-long-flow
```

### Quando usar cada prefixo

| Prefixo | Quando usar |
|---|---|
| `feat/` | nova funcionalidade |
| `fix/` | correção de bug |
| `refactor/` | reorganização sem mudar comportamento |
| `test/` | só testes |
| `docs/` | só documentação |
| `chore/` | manutenção/configuração |

---

## 4. Fluxo completo

### 1. Atualizar a main local

```bash
git checkout main
git pull origin main
```

### 2. Criar branch da tarefa

```bash
git checkout -b feat/formation-validation
```

### 3. Trabalhar nos arquivos

Faça a implementação normalmente.

### 4. Ver alterações

```bash
git status
```

### 5. Rodar checks

```bash
npm run typecheck
npm run lint
npm run test
```

### 6. Adicionar arquivos

```bash
git add .
```

### 7. Criar commit

```bash
git commit -m "feat(tactics): add formation validation"
```

### 8. Enviar branch ao GitHub

```bash
git push origin feat/formation-validation
```

### 9. Abrir Pull Request

No GitHub:

```txt
feat/formation-validation → main
```

### 10. Só fazer merge após checks passarem

Nunca faça merge se CI estiver vermelho.

---

## 5. Padrão de commits

Use Conventional Commits.

Formato:

```txt
tipo(escopo): descrição curta
```

Exemplos:

```bash
git commit -m "feat(tactics): add formation validation"
git commit -m "test(tactics): cover invalid formations"
git commit -m "feat(simulation): add match balance lab"
git commit -m "fix(simulation): reduce excessive goal rate"
git commit -m "refactor(store): extract formation helpers"
git commit -m "docs(core): add 10-10 roadmap"
```

### Tipos permitidos

```txt
feat      nova funcionalidade
fix       correção de bug
test      testes
docs      documentação
refactor  reorganização sem mudar comportamento
style     formatação visual/código sem lógica
chore     manutenção técnica
ci        workflow/CI
perf      performance
```

---

## 6. Como evitar commit na main

Antes de commitar, rode:

```bash
git branch --show-current
```

Se aparecer:

```txt
main
```

Pare. Crie uma branch:

```bash
git checkout -b feat/nome-da-tarefa
```

Se já fez alterações na `main` sem querer, rode:

```bash
git checkout -b feat/recuperar-alteracoes
```

Isso leva suas alterações para uma branch nova sem perdê-las.

---

## 7. Como atualizar sua branch com a main

Se a `main` mudou enquanto você trabalhava:

```bash
git checkout main
git pull origin main
git checkout feat/sua-branch
git merge main
```

Resolva conflitos se houver, depois:

```bash
npm run typecheck
npm run lint
npm run test
git add .
git commit -m "fix(merge): resolve main conflicts"
git push origin feat/sua-branch
```

---

## 8. Pull Request ideal

Título:

```txt
feat(tactics): add formation validation
```

Descrição:

```md
## O que foi feito
- ...

## Arquivos principais
- ...

## Testes
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] npm run test

## Riscos
- ...

## Como validar manualmente
- ...
```

---

## 9. Proteção recomendada da main

No GitHub:

```txt
Settings → Branches → Add branch protection rule → main
```

Ativar:

```txt
Require a pull request before merging
Require status checks to pass
Do not allow force pushes
Restrict direct pushes
```

---

## 10. Resumo para Claude

Claude deve seguir este padrão:

```bash
git checkout main
git pull origin main
git checkout -b feat/nome-da-tarefa
# implementar
npm run typecheck
npm run lint
npm run test
git add .
git commit -m "feat(scope): description"
git push origin feat/nome-da-tarefa
```

E nunca:

```bash
git checkout main
# editar
git commit -m "..."
git push origin main
```

---

*GIT_WORKFLOW_FOTEBALL.md · Fluxo seguro de branches e PRs*

# PR_CHECKLIST_FOTEBALL.md
> Checklist para Pull Requests do FOTEBALL.

---

## Título do PR

Use Conventional Commits:

```txt
feat(tactics): add formation validation
fix(simulation): tune goal probability
test(season): cover full season flow
refactor(store): extract season helpers
docs(core): add master rules
```

---

## Descrição

```md
## O que foi feito
- 

## Por que foi feito
- 

## Arquivos principais
- 

## Como validar manualmente
1. 
2. 
3. 

## Testes executados
- [ ] npm run typecheck
- [ ] npm run lint
- [ ] npm run test

## Riscos conhecidos
- 

## Prints/gravações, se UI
- 
```

---

## Checklist obrigatório

Antes de abrir PR:

```txt
[ ] Não estou na main
[ ] Branch segue padrão feat/fix/test/refactor/docs
[ ] Commits têm nomes claros
[ ] Typecheck passa
[ ] Lint passa
[ ] Testes passam
[ ] Não há any desnecessário
[ ] Não há @ts-ignore/@ts-nocheck
[ ] Não alterei workflow CI sem necessidade
[ ] Não quebrei save sem migração
[ ] Não introduzi Math.random na engine
[ ] Nova regra de negócio tem teste
```

---

## Checklist por tipo de mudança

### Core/engine

```txt
[ ] função é pura quando possível
[ ] usa tipos existentes
[ ] não depende de React
[ ] não acessa UI
[ ] não acessa SQLite diretamente
[ ] tem teste unitário
[ ] seed/determinismo respeitado
```

### Store

```txt
[ ] store apenas coordena estado quando possível
[ ] regra complexa foi extraída para engine
[ ] ações preservam dados existentes
[ ] mensagens de erro são claras
[ ] save/load não foi quebrado
```

### UI

```txt
[ ] tela funciona sem dados opcionais
[ ] estados vazios tratados
[ ] loading tratado
[ ] erro tratado
[ ] acessibilidade básica considerada
[ ] não esconde informação crítica do manager
```

### Mercado

```txt
[ ] caixa do comprador diminui
[ ] caixa do vendedor aumenta
[ ] jogador muda de clube corretamente
[ ] elenco do clube atualiza
[ ] IA respeita saldo
[ ] testes cobrem cenário principal
```

### Temporada

```txt
[ ] calendário consistente
[ ] tabela atualiza
[ ] rodada avança corretamente
[ ] fim de temporada funciona
[ ] acesso/rebaixamento preservado
[ ] jogadores envelhecem/evoluem corretamente
```

---

## Critério de merge

Só fazer merge se:

```txt
✅ CI verde
✅ PR revisado
✅ escopo claro
✅ sem mudança gigante desnecessária
✅ comportamento validado
```

---

## Nunca fazer merge se

```txt
❌ typecheck falhando
❌ lint falhando
❌ testes falhando
❌ branch direto na main
❌ PR mistura refatoração gigante + feature + UI
❌ remove teste para passar
❌ ignora erro com @ts-ignore
```

---

## Modelo de resumo final para Claude

```md
## ✅ Entrega concluída

Branch:
- feat/...

Commits:
- feat(...): ...
- test(...): ...

Arquivos criados:
- ...

Arquivos modificados:
- ...

Checks:
- typecheck: ✅
- lint: ✅
- test: ✅

Validação manual:
- ...

Riscos:
- ...

Próximo passo:
- ...
```

---

*PR_CHECKLIST_FOTEBALL.md · Checklist de Pull Request*

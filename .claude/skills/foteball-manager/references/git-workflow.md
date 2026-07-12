# Git, branches e builds

## Branch de trabalho

Durante o redesign:

```text
main
└── feat/design-system-v2
```

- Manter `main` estável.
- Não criar branch por tela, componente, sessão, prompt ou modelo de IA.
- Usar branch temporária apenas para experimento nativo isolado e autorizado.
- Preservar qualquer alteração preexistente do usuário.

## Ações proibidas sem autorização

- commit;
- push;
- abrir/atualizar PR;
- merge/rebase;
- tag;
- release;
- force push;
- build remoto.

Antes de commit autorizado, mostrar:

1. `git status --short --branch`;
2. lista exata de arquivos;
3. resumo do diff;
4. mensagem proposta;
5. validações executadas.

## Commits

Separar por unidade lógica:

```text
chore(ui): registrar baseline do redesign
feat(tokens): adicionar temas claro e escuro
feat(ui): criar primitives do design system
feat(navigation): reorganizar abas
feat(home): simplificar resumo do clube
test(ui): cobrir estados dos componentes
```

Não usar mensagens vagas. Não misturar arquivos não relacionados.

## Workflows atuais

- Push na `main`: CI e APK Android nightly.
- Tag `v*`: APK release.
- Disparo manual: APK debug/release.
- PR contra `main`: CI de typecheck, lint e testes.
- Push em `feat/design-system-v2` sem PR: não gera APK no workflow auditado.

Não alterar gatilhos de workflow sem autorização.

## Frequência

- salvar durante o trabalho;
- validar ao concluir unidade;
- commit local somente autorizado;
- push em checkpoint autorizado;
- PR quando fase estiver pronta;
- merge na `main` quando o usuário desejar o novo nightly.

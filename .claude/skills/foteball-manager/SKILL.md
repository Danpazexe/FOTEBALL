---
name: foteball-manager
description: Regras de engenharia, produto, design e execução do projeto FOTEBALL. Usar em qualquer tarefa de código, revisão, arquitetura, interface, gameplay, engine, Zustand, SQLite, navegação, testes, build ou Git dentro do repositório Danpazexe/FOTEBALL. Preservar gameplay rápido inspirado no Brasfoot, apresentação clara inspirada no Sofascore, engine determinística, stack React Native CLI e branch controlada.
---

# FOTEBALL Manager

Atuar como engenheiro sênior responsável por produção. Preservar o jogo existente, implementar somente o escopo pedido e tratar o código atual como fonte da verdade.

## Princípio do produto

Manter **Brasfoot na dinâmica e Sofascore na apresentação**.

- Tornar temporadas rápidas e decisões compreensíveis.
- Manter profundidade no motor e simplicidade na interface.
- Mostrar primeiro apenas informação que muda uma decisão.
- Disponibilizar detalhes por toque, sem obrigar microgestão.
- Evitar transformar o jogo em Football Manager completo ou painel corporativo.

Ler [product-direction.md](references/product-direction.md) em tarefas de produto, tela, navegação, estatística ou nova funcionalidade.

## Fluxo obrigatório

1. Executar `git status --short --branch` e preservar mudanças do usuário.
2. Confirmar que a branch de redesign é `feat/design-system-v2`; nunca trabalhar diretamente na `main`.
3. Ler `package.json`, tipos, testes e arquivos envolvidos antes de propor mudanças.
4. Classificar a tarefa: engine, estado/persistência, UI/design, produto ou infraestrutura.
5. Carregar apenas as referências relevantes desta skill.
6. Apresentar plano curto, arquivos previstos, riscos e critérios de aceite.
7. Implementar a menor mudança completa que resolva a tarefa.
8. Validar proporcionalmente ao risco.
9. Reportar arquivos alterados, testes, limitações e pendências reais.
10. Não fazer commit, push, PR, merge, tag, release ou build remoto sem autorização explícita.

## Fontes da verdade

Usar nesta ordem:

1. código e testes atuais;
2. `package.json` e lockfile;
3. tipos e schema/migrações atuais;
4. documentação do repositório;
5. referências desta skill.

Nunca substituir comportamento real por fórmulas antigas de briefing. Se documentação e código divergirem, demonstrar a divergência antes de editar.

## Regras essenciais de engenharia

- Manter React Native CLI; não migrar para Expo.
- Manter TypeScript strict, Zustand e `@op-engineering/op-sqlite`.
- Manter `src/engine` pura, determinística e sem dependência de React/React Native.
- Proibir `Math.random()` e `Date.now()` na engine; injetar seed/tempo.
- Usar estado global de domínio no store; usar estado local somente para UI efêmera.
- Preservar saves; versionar e testar qualquer mudança de schema.
- Usar Lucide por meio do registry semântico existente; não reintroduzir `react-native-vector-icons`.
- Usar Reanimated para animações novas ou alteradas; não criar nova lógica com `Animated` do RN.
- Não adicionar `any`, `@ts-ignore`, `@ts-nocheck` ou cast duplo.
- Não instalar dependência sem justificar compatibilidade, custo e ausência de alternativa existente.
- Não remover funcionalidade para simplificar implementação.

Ler [engineering-contract.md](references/engineering-contract.md) antes de alterar engine, store, persistência, dependências, navegação, testes ou infraestrutura.

## Regras de UI e design

- Tratar tema claro como padrão e tema escuro como alternativa completa durante o redesign.
- Consumir cores por tokens semânticos; não adicionar hex em telas.
- Usar Barlow para texto e Barlow Condensed para números/placares quando as fontes forem introduzidas pela fase aprovada.
- Aplicar números tabulares a placar, minuto, posição, dinheiro, overall e estatísticas.
- Manter um objetivo principal e um CTA dominante por tela.
- Evitar card dentro de card, glow constante, gradientes decorativos e excesso de badges.
- Usar Lucide para sistema e SVG próprio somente para ícone esportivo ausente.
- Não mostrar estatística que o motor não produza com significado real.
- Respeitar touch target, contraste, fonte dinâmica, leitor de tela e redução de movimento.

Ler [design-system.md](references/design-system.md) antes de criar ou migrar telas e componentes.

## Controle de escopo

Não implementar automaticamente:

- busca global;
- heatmaps, shotmaps ou mapas de passe;
- scouting complexo;
- equipe técnica detalhada;
- entrevistas e reuniões repetitivas;
- dashboards com muitos gráficos;
- dezenas de rankings;
- novos sistemas P1/P2 de briefings anteriores.

Exigir autorização específica para qualquer item acima. Aplicar o teste: a informação muda decisão, explica consequência ou aumenta emoção? Se não, adiar.

## Git e builds

Manter `main` estável e trabalhar em `feat/design-system-v2` durante o redesign.

- Fazer commits locais apenas quando autorizado.
- Antes de commit, mostrar status, arquivos, mensagem proposta e validações.
- Não fazer push automático.
- Lembrar que push na `main` dispara APK Android nightly no workflow atual.
- Usar branch temporária somente para experimento nativo isolado e após autorização.

Ler [git-workflow.md](references/git-workflow.md) antes de qualquer ação Git ou alteração em GitHub Actions.

## Fases do redesign

Não pular fases nem reconstruir todas as telas de uma vez. Ler [implementation-phases.md](references/implementation-phases.md) ao trabalhar na identidade visual.

## Validação

Executar, quando aplicável:

```bash
bash .claude/skills/foteball-manager/scripts/validate.sh
```

Para inventário sem alterar arquivos:

```bash
bash .claude/skills/foteball-manager/scripts/audit.sh
```

Se uma validação falhar, não declarar a tarefa concluída. Distinguir falha nova de problema preexistente com evidência.

## Formato de entrega

```markdown
## Resultado
[o que ficou pronto]

### Arquivos
- caminho — mudança

### Validação
- typecheck: ✅/❌
- lint: ✅/❌
- testes: ✅/❌
- build local, se aplicável: ✅/❌/não executado

### Riscos ou pendências
- somente itens reais

### Git
- branch atual
- commit/push/PR: não executados, salvo autorização explícita
```

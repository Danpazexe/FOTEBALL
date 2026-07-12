# Fases do redesign

Aplicar progressivamente. Não reconstruir telas em massa.

## Fase 0 — baseline

- branch correta;
- status e separação de mudanças preexistentes;
- typecheck, lint, Jest e build local proporcional;
- inventário de tema, hex, componentes, listas e acessibilidade;
- ADR e plano da Fase 1;
- zero implementação visual.

## Fase 1 — fundações mínimas

- tokens semânticos;
- temas claro/escuro/sistema;
- provider e bridge compatível;
- tipografia somente se aprovada;
- primitives essenciais: Text, Box, Pressable e Icon;
- showcase/testes das fundações.

Não implementar busca, Skia, heatmaps ou todas as telas.

## Fase 2 — componentes essenciais

- AppBar;
- Button/IconButton;
- Card e ListItem;
- Chip/Badge;
- Tabs simples;
- Dialog/Snackbar;
- Loading/Skeleton/Empty/Error;
- StatValue/Score/TeamCrest/MatchCard.

Criar apenas componentes exigidos pelas telas priorizadas.

## Fase 3 — shell

- Início, Elenco, Jogar, Competições, Clube;
- Ajustes fora da tab bar;
- stacks e back behavior;
- CTA central contextual.

## Fase 4 — fluxo principal

- Menu/continuar carreira;
- Home simplificada;
- Elenco e detalhe;
- Escalação/tática;
- pré-jogo, partida e resultado;
- competição com Jogos/Tabela/Estatísticas.

## Fase 5 — gestão

- mercado e contratos;
- treino simples;
- clube/finanças/estádio;
- base e carreira;
- ajustes.

## Fase 6 — endurecimento

- acessibilidade;
- performance release;
- E2E crítico;
- build Android/iOS;
- migração completa dos tokens antigos;
- documentação real.

## Gate de nova funcionalidade

Após o fluxo principal, submeter toda nova feature a:

- valor para decisão;
- consequência no motor;
- frequência de uso;
- custo cognitivo;
- custo técnico;
- teste e acessibilidade.

Sem aprovação, manter fora do escopo.

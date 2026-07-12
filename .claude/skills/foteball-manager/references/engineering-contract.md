# Contrato de engenharia

## Sumário

1. Stack atual
2. Fronteiras arquiteturais
3. Engine determinística
4. Estado e persistência
5. UI, animações e ícones
6. Tipagem
7. Dependências
8. Testes

## 1. Stack atual

Confirmar sempre no `package.json` e lockfile. Na auditoria de julho de 2026:

| Camada | Tecnologia |
|---|---|
| App | React Native CLI 0.86, React 19.2 |
| Linguagem | TypeScript 5.8 strict |
| Estado | Zustand 5 |
| Persistência | `@op-engineering/op-sqlite` 16 |
| Navegação | React Navigation 7 |
| Gestos | Gesture Handler 3 |
| Animação | Reanimated 4 |
| Vetor | `react-native-svg` 15 |
| Ícones | `lucide-react-native` via `src/components/Icone` |
| Áudio | `react-native-sound` |
| Testes | Jest 29 |
| Lint | ESLint 8, configuração do React Native |

Não copiar versões do contrato antigo. Não declarar `latest` como versão de produção.

## 2. Fronteiras arquiteturais

- `src/engine`: regras puras e determinísticas.
- `src/store`: orquestra estado, ações e persistência.
- `src/api`/repositórios: acesso a dados e seed.
- `src/screens`: composição de fluxos; evitar regra de domínio.
- `src/components`: UI reutilizável.
- `src/theme` e futuro `src/design-system`: tokens e componentes visuais.
- `src/types`: tipos compartilhados de domínio/navegação; tipos locais pequenos podem ficar próximos do uso.

Não impor a árvore imaginária do contrato antigo. Inspecionar a árvore real antes de mover arquivos.

## 3. Engine determinística

Proibir em `src/engine`:

- React, React Native, hooks e componentes;
- `Math.random()`;
- `Date.now()`;
- acesso ao store;
- SQLite, filesystem ou rede;
- efeitos colaterais não injetados.

Exigir:

- mesma entrada e seed produzirem mesma saída;
- aleatoriedade pelo RNG existente;
- tempo recebido como parâmetro;
- novos comportamentos cobertos por teste;
- nenhuma fórmula de gameplay alterada por necessidade apenas visual.

Não assumir fórmulas de força, moral, mercado ou probabilidade descritas no antigo `FOTEBALL_SKILL.md`. Ler implementações e testes atuais.

## 4. Estado e persistência

- Manter domínio no Zustand.
- Usar `useState` somente para input, sheet, tab local, seleção efêmera e estado visual.
- Preferir selectors pequenos; evitar assinatura do store inteiro.
- Não duplicar a mesma fonte de verdade em store e estado local.
- Manter SQLite como persistência principal.
- Não introduzir AsyncStorage/MMKV como segunda fonte sem decisão arquitetural.
- Versionar schema/save e implementar migração compatível.
- Testar boot, autosave, background flush, reinício de carreira e save antigo.

## 5. UI, animações e ícones

- Para código novo ou tocado, usar Reanimated.
- Não fazer migração mecânica ampla de animações fora do escopo.
- Manter Gesture Handler para drag-and-drop e gestos complexos.
- Usar o componente `Icone` e nomes semânticos.
- Mapear novos ícones Lucide no registry; não importar Lucide diretamente por toda tela.
- Criar SVG esportivo próprio quando Lucide não comunicar corretamente.
- Não usar emoji como ícone funcional.

## 6. Tipagem

Proibir novo:

- `any` explícito ou implícito evitável;
- `as unknown as`;
- `@ts-ignore` e `@ts-nocheck`;
- non-null assertion sem prova;
- objeto de domínio sem tipo estável.

Preferir:

- unions discriminadas;
- `satisfies`;
- `Readonly` na engine;
- tipos derivados de funções/store;
- validação na fronteira de dados;
- tipos próximos do uso quando não são compartilhados.

## 7. Dependências

Antes de instalar:

1. Demonstrar o problema.
2. Verificar alternativa na stack atual.
3. Conferir compatibilidade RN 0.86, React 19 e New Architecture.
4. Conferir iOS/Android e manutenção.
5. Avaliar tamanho e sobreposição.
6. Pedir autorização.
7. Fixar versão compatível no lockfile.

Dependências previamente consideradas para fases específicas não estão automaticamente autorizadas.

## 8. Testes

- Engine: teste unitário de regra e determinismo.
- Store/persistência: ações, migração e recuperação.
- Componentes: comportamento, estados e acessibilidade.
- Navegação: fluxos críticos.
- Build nativo: quando dependência/configuração nativa mudar.

Barra padrão:

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Não atualizar snapshot às cegas, remover teste ou enfraquecer expectativa para obter verde.

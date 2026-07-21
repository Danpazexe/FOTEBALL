# Testes E2E com Maestro

Testes de UI que dirigem o **app de verdade** (simulador/emulador), dando
feedback exato — o que os testes de unidade (Jest) não cobrem.

## Pré-requisitos

1. **Instalar o Maestro** (JVM; já há Java 17 na máquina):

   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

   > O agente não pôde rodar isso (o classificador bloqueia baixar+executar
   > script remoto). Rode você uma vez, ou autorize o comando.

2. **App instalado num device**:
   - iOS: um simulador **booted** com o `FOTEBALL.app` instalado
     (`npm run ios` builda e instala). Bundle: `com.pazconcept.foteball`.
   - Android: emulador aberto + `npm run android`.

## Rodar

```bash
# um flow específico
maestro test .maestro/flows/01-nova-carreira-smoke.yaml

# todos os flows do workspace
maestro test .maestro/flows/
```

Inspeção interativa da árvore de UI (para descobrir textos/ids ao escrever
flows):

```bash
maestro studio
```

## Flows

- `flows/01-nova-carreira-smoke.yaml` — app sobe, menu responde e o usuário
  chega até a seleção de clube ao iniciar uma nova carreira.

## Notas

- O app **ainda não tem `testID`/`accessibilityIdentifier`** nas telas, então os
  flows casam por **texto visível**. Adicionar `testID` nos elementos-chave
  (botões de menu, cards de clube, CTA da rodada) deixaria os flows mais
  robustos a mudanças de cópia — vale fazer aos poucos.
- Depois de instalar o Maestro, dá para expandir os flows para jogar uma rodada
  e validar o pós-jogo (o fluxo que mais mexemos no refactor).

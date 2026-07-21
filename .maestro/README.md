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

Os flows são **incisivos de propósito**: cada tela do caminho tem asserts dos
elementos-chave + um screenshot numerado. Quando algo quebra, o relatório do
Maestro aponta o assert exato que falhou e a imagem mostra como a tela estava —
diagnóstico direto, sem adivinhar.

- `flows/01-nova-carreira-smoke.yaml` — mapeia o fluxo inteiro: menu → seleção
  de liga → seleção de clube (Flamengo) → confirmação → Home → as 5 tabs
  (Início/Elenco/Partidas/Mercado/Clube) → volta ao hub. 10 screenshots.
- `flows/02-fluxo-partida.yaml` — Home → Pré-jogo → partida ao vivo (Central da
  partida). Assume carreira criada (rodar após o 01). 4 screenshots.

Os screenshots ficam em `~/.maestro/tests/<timestamp>/` (ou no diretório
corrente, conforme a versão) — junto do log de cada passo.

## Notas

- O app **ainda não tem `testID`/`accessibilityIdentifier`** nas telas, então os
  flows casam por **texto visível**. Adicionar `testID` nos elementos-chave
  (botões de menu, cards de clube, CTA da rodada) deixaria os flows mais
  robustos a mudanças de cópia — vale fazer aos poucos.
- Depois de instalar o Maestro, dá para expandir os flows para jogar uma rodada
  e validar o pós-jogo (o fluxo que mais mexemos no refactor).

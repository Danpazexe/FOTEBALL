# ⚽ FOTEBALL

> Jogo de **gerência de futebol brasileiro** estilo Brasfoot, feito em React Native.

[![CI](https://github.com/Danpazexe/FOTEBALL/actions/workflows/ci.yml/badge.svg)](https://github.com/Danpazexe/FOTEBALL/actions/workflows/ci.yml)
![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8%20strict-3178C6?logo=typescript)

Assuma um clube, dispute o **Brasileirão** (Séries A, B e C), monte o time a cada
partida, negocie no mercado e busque o acesso — fugindo do rebaixamento.

---

## ✨ Funcionalidades

- **Partida narrada ao vivo** — cada minuto é simulado na hora; pausar e fazer
  substituições durante o jogo muda o resultado (a força do time é recalculada
  minuto a minuto).
- **Pirâmide de divisões** — Séries A, B e C com **acesso e rebaixamento** ao fim
  da temporada (4 sobem / 4 descem).
- **Identidade visual por divisão** — emblema e cores do placar mudam conforme a
  série em que o clube joga.
- **Mercado de transferências** — propostas, contratações e vendas.
- **Calendário** round-robin (turno e returno) com tabela de classificação.
- **Progressão** — moral, evolução de jogadores e finanças do clube.

## 🧱 Stack

| Camada | Tecnologia |
|--------|-----------|
| App | React Native **0.86** (bare CLI, **não** Expo) + React 19.2 |
| Linguagem | TypeScript 5.8 (strict) |
| Estado | Zustand v5 |
| Persistência | SQLite via `@op-engineering/op-sqlite` |
| UI | `react-native-svg` (placar/gráficos), `react-native-vector-icons` |
| Testes | Jest |

## 📁 Estrutura

```
src/
├── engine/      # Lógica pura do jogo (simulação, temporada, transferências,
│                # finanças, progressão, táticas) — sem React, determinística
├── store/       # useGameStore (Zustand) + persistência (SQLite)
├── screens/     # Telas (partida, mercado, tabela, carreira…)
├── components/  # Componentes de UI reutilizáveis (ex.: Placar)
├── api/         # Repositórios de dados + seed (JSON dos clubes/jogadores)
├── data/        # Dados de seed
├── assets/      # Escudos dos clubes e logos das divisões (PNG)
├── audio/       # Sons (gol, fim de jogo…)
├── navigation/  # React Navigation
├── theme/       # Cores, espaçamentos, paletas
├── types/       # Tipos do domínio
└── utils/       # Helpers (formatadores etc.)
```

> **Convenção:** nomes de domínio em **português** (`calcularMoral`), termos
> técnicos genéricos em inglês. A `engine/` é pura e **determinística** (sem
> `Math.random`/`Date.now`; aleatoriedade via seed).

## 🚀 Começando

### Pré-requisitos

- **Node ≥ 22** e o ambiente de [React Native](https://reactnative.dev/docs/set-up-your-environment)
  configurado (Android Studio / Xcode conforme a plataforma).

### Instalação

```sh
npm install
# iOS (apenas macOS, na 1ª vez e após mudar deps nativas):
bundle install && bundle exec pod install
```

### Rodando

```sh
npm start          # inicia o Metro
npm run android    # builda e roda no Android (emulador/dispositivo)
npm run ios        # builda e roda no iOS (macOS)
```

## 🛠️ Scripts

| Comando | O que faz |
|---------|-----------|
| `npm start` | Inicia o Metro (bundler) |
| `npm run android` / `npm run ios` | Builda e roda o app |
| `npm run typecheck` | `tsc --noEmit` (checagem de tipos) |
| `npm run lint` | ESLint |
| `npm test` | Suíte de testes (Jest) |

**Barra de qualidade:** `typecheck` limpo + `lint` sem erros + Jest verde.

## 🤖 CI & build de APK

Dois workflows do GitHub Actions em [`.github/workflows`](.github/workflows):

### CI — [`ci.yml`](.github/workflows/ci.yml)
Roda a cada push/PR na `main`. Cada checagem é um **job próprio** (status
individual, fácil de rastrear), com **annotations inline** no código quando há
erro e um **gate final** (`CI status`) que resume tudo:

| Job | Comando |
|-----|---------|
| Typecheck | `tsc --noEmit` |
| Lint | `eslint .` |
| Testes | `jest` |

### Android APK — [`android.yml`](.github/workflows/android.yml)
Builda um APK instalável e o publica como **artifact** baixável. Disparo:

- **Manual:** aba **Actions → Android APK → Run workflow** (escolha `debug` ou `release`).
- **Por tag:** `git tag v0.1.0 && git push origin v0.1.0` (sempre `release`).

Baixe em **Actions → (execução) → Artifacts → `foteball-apk-<tipo>`**. Se o build
falhar, os relatórios do Gradle sobem como artifact (`android-build-reports`)
para diagnóstico.

> Assinatura: debug e release usam a *debug key* do projeto — **sem segredos**.
> Para distribuir de verdade, gere uma *release keystore*, guarde-a como **secret**
> do repositório e ajuste a `signingConfig` em `android/app/build.gradle`.

## 📄 Licença

Projeto privado/pessoal — todos os direitos reservados.

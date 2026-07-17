# Procedência do seed internacional (multi-liga)

Ligas internacionais sobre a fundação multi-país: **Argentina (Primera
División, 3 clubes)** e **Inglaterra (Premier League, 20 clubes +
Championship, 24 clubes)** — 47 clubes e ~1.060 jogadores (todo clube com ≥2
goleiros). As três ligas são JOGÁVEIS na Nova carreira: calendário próprio
(round-robin, com folga na Argentina), Premier↔Championship com 3 de
acesso/rebaixamento na virada, e sem Copa do Brasil fora do Brasil.

## Fontes dos dados

- **Overalls: EA Sports FC 26** (via fcratings.com, espelho dos ratings
  oficiais da EA — o SoFIFA bloqueia acesso automatizado). 96,6% dos
  jogadores casados por nome; os ~30 sem match (saíram do clube no FC 26)
  mantêm o overall do PESDB.
- **Identidades** (nome, posição, idade, nacionalidade): PESDB — eFootball
  2026 (`featured=0`, carta padrão) para os 43 clubes originais; **EA FC 26 +
  drop-api da EA** (idade/nacionalidade) para os 4 clubes adicionados depois
  (Leeds, Sunderland, Sheffield Wednesday, Charlton).
- Os **12 atributos**, valor de mercado, salário e potencial são **DERIVADOS**
  de overall+posição por perfil determinístico (não são dados reais). Nada é
  apresentado como estatística real de atributo.

Organização: clubes em `clubes/<pais>/<liga>/` e jogadores em
`jogadores/<pais>/<slug>.json` (um arquivo por clube).

## Escudos e emblemas

- Escudos dos 47 clubes: **football-logos.cc**, PNG 128×128 transparente
  (paletizado) em `src/assets/escudos/argentina/` e `.../inglaterra/`,
  mapeados por id no `ESCUDOS` (`src/assets/escudos/index.ts`).
- Emblemas de liga: `premierLeague.png`, `championship.png` (Sky Bet/EFL) e
  `primeraArgentina.png` (LPF), 256×256 em `src/assets/`, ligados por
  `LOGO_POR_DIVISAO` via `Clube.divisao`.
- Licenciamento: logotipos são marcas dos clubes/ligas; uso assumido pelo
  projeto (decisão do usuário, mesmo racional dos escudos brasileiros).

## Brasil — escala FIFA mantida (não-eFootball)

O EA FC 26 **não licencia o Brasileirão**, então nenhuma fonte "estilo FIFA"
(SoFIFA, fcratings, fcradar) tem os elencos brasileiros — só brasileiros que
jogam na Europa. A única fonte com o Brasileirão é o **eFootball**, mas ele
comprime muito a escala (Neymar 78), o que deixa os clubes fracos demais para
a proposta do jogo (craques estilo FIFA, ex.: Neymar 86). Por isso os overalls
brasileiros seguem a **calibração FIFA-like original do seed** (pipeline
Transfermarkt anterior), e só as ligas internacionais usam o EA FC 26.

## Clubes

### Argentina — Primera División (3)
Boca Juniors ("CA Boca Juniors"), Racing ("Avellaneda AB"), Lanús ("Lanús M").
Limitada no PESDB (River/Independiente com nomes cifrados não resolvidos).

### Inglaterra — Premier League (20)
Os 18 do PESDB (nomes cifrados mapeados, ex.: "Manchester B"=Man City,
"Aston RB"=Aston Villa) + **Leeds United e Sunderland** montados 100% do
EA FC 26 (o PESDB não os resolvia).

### Inglaterra — Championship (24)
Os 22 do PESDB + **Sheffield Wednesday e Charlton Athletic** (EA FC 26).
**Correção**: o "Bristol R" do PESDB é o **Bristol City** (que disputa a
Championship 25/26) — o clube foi renomeado de Bristol Rovers para Bristol
City (`club_bristol_city`, sigla BRC, escudo correto).

## Notas

- Times não-licenciados aparecem no PESDB com nome fictício; consulta por
  elenco: `?club_team="<nome>"&featured=0`.
- Gerador determinístico (sem `Math.random`): atributos, valor, salário e
  potencial derivam de overall+posição+hash do nome.
- Testes: `mundoInternacional.test.ts` (carga/mercado/transferência),
  `seasonFlow.store.test.ts` (virada 3↔3 e folga), `copaStore.test.ts`
  (Copa só-BR), `calendarGenerator.test.ts` (folga).

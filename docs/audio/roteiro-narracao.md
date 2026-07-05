# 🎙️ Roteiro de narração — FOTEBALL Manager

**Tom:** emocionado, estilo rádio/TV brasileira. Frases curtas (1–3s), sem citar
nome de jogador, time ou placar (isso fica no texto da tela). Grave **cada
variação como um arquivo separado** — o jogo escolhe qual tocar.

> **Status (já no jogo):** ligados os áudios de **cartão amarelo**, **chance
> perdida** (2 variações), **VAR / gol anulado** e o **loop de torcida**. Faltam
> mapear 2 clipes ambíguos (início/fim) e gravar os demais eventos listados abaixo.

---

## 📁 Como entregar

- **Formato:** `.mp3`, mono, ~128 kbps, 44.1 kHz, normalizado (sem clipping).
- **Sem música de fundo** (os efeitos de torcida/apito já existem e tocariam por cima).
- **Nome do arquivo:** sem acento/espaço, no padrão `narr_<evento>_<n>.mp3`
  (ex.: `narr_gol_1.mp3`). A tabela abaixo já traz o nome de cada linha.
- Um respiro curtinho (~0,1s) no começo/fim de cada clipe.

Quando os arquivos chegarem, eu coloco em `src/audio/` + `android/.../res/raw/` +
Xcode e ligo cada um no evento certo (a engine já dispara esses eventos).

---

## ⚽ 1. Lances da partida

### Gol (comum / do seu time) — `narr_gol_#`
1. `GOOOOL! Que golaço!`
2. `É GOL! Balançou a rede!`
3. `GOOOOL! Pegou de primeira!`
4. `Na rede! Que finalização!`
5. `Golaço de fora da área! Sensacional!`
6. `É GOL! Aproveitou o rebote!`
7. `Contra-ataque mortal... GOOOOL!`

### Gol sofrido (do adversário) — `narr_golsofrido_#`
1. `Gol do adversário... que frustração.`
2. `Balançou a nossa rede. Silêncio na torcida.`
3. `Vacilou a defesa e o adversário não perdoou.`

### Cartão amarelo — `narr_amarelo_#`
1. `Cartão amarelo!`
2. `Falta dura, o árbitro mostra o amarelo.`
3. `Advertido! Amarelo para o jogador.`
4. `Reclamação demais... e vem o amarelo.`

### Cartão vermelho / expulsão — `narr_vermelho_#`
1. `EXPULSO! Cartão vermelho!`
2. `Vermelho direto! Vai mais cedo pro chuveiro!`
3. `Expulsão! O time fica com um a menos!`

### Chance perdida / quase gol — `narr_chance_#`
1. `Que chance perdida!`
2. `Uhhh! Passou raspando!`
3. `Na trave! Quase o gol!`
4. `Defesaça do goleiro!`
5. `Incrível como perdeu essa, cara a cara!`

### Pênalti marcado — `narr_penalti_#`
1. `PÊNALTI! O árbitro marcou!`
2. `Aponta para a marca da cal! Penalidade!`
3. `Pênalti claríssimo!`

### Pênalti perdido / defendido — `narr_penaltiperdido_#`
1. `Perdeu o pênalti!`
2. `Defendeu! Que pegada do goleiro!`
3. `Isolou! Mandou pra fora, inacreditável!`

### Lesão / contusão — `narr_lesao_#`
1. `Jogador caído no gramado, parece contusão.`
2. `Que preocupação... saiu sentindo muito.`
3. `Lesão feia, pede atendimento na hora.`

### Substituição — `narr_sub_#`
1. `Mexe o treinador! Substituição na equipe.`
2. `Troca no time, sangue novo em campo.`

### Falta perigosa — `narr_falta_#`
1. `Falta perigosa na entrada da área!`
2. `Boa chance na bola parada.`

---

## ⏱️ 2. Fluxo do jogo

### Apito inicial — `narr_inicio_#`
1. `A bola vai rolar! Começa o jogo!`
2. `Apitou! Bola rolando!`

### Fim do 1º tempo — `narr_intervalo_#`
1. `Fim do primeiro tempo!`
2. `Vai pro intervalo!`

### Recomeço (2º tempo) — `narr_segundotempo_#`
1. `Recomeça a partida! Etapa final!`
2. `Bola rolando pro segundo tempo!`

### Acréscimos — `narr_acrescimos_#`
1. `Estamos nos acréscimos!`
2. `Minutos finais! Tudo pode acontecer!`

### Fim de jogo — `narr_fim_#`
1. `Fim de jogo!`
2. `Acabou! Apito final!`

---

## 📺 3. VAR (novidade do jogo)

### Chamada do VAR — `narr_var_#`
1. `O VAR está analisando o lance...`
2. `Vamos ao VAR!`

### Gol anulado pelo VAR — `narr_var_anulado_#`
1. `Gol anulado pelo VAR! Impedimento!`
2. `O VAR anulou! Não valeu o gol!`

### Pênalti marcado pelo VAR — `narr_var_penalti_#`
1. `O VAR flagrou! Pênalti marcado!`
2. `Pênalti confirmado pelo VAR!`

---

## 🏆 4. Momentos de carreira (fora da partida)

- **Campeão / título** — `narr_titulo_#`
  1. `CAMPEÃO! Que temporada histórica!`
  2. `É O TÍTULO! Entrou pra história do clube!`
- **Acesso (subiu de divisão)** — `narr_acesso_#`
  1. `Acesso garantido! O clube subiu de divisão!`
- **Rebaixamento** — `narr_rebaixamento_#`
  1. `Rebaixamento... um dia triste para o clube.`
- **Demissão** — `narr_demissao_#`
  1. `Fim de linha. O treinador está demitido.`
- **Objetivo da diretoria cumprido** — `narr_meta_ok_#`
  1. `Objetivo cumprido! A diretoria está satisfeita.`
- **Ultimato da diretoria** — `narr_ultimato_#`
  1. `A diretoria dá um ultimato ao treinador!`
- **Transferência fechada** — `narr_transferencia_#`
  1. `Negócio fechado! Reforço confirmado!`

---

## 🎬 5. Abertura (opcional)

- **Boas-vindas** — `narr_abertura_1`
  1. `Bem-vindo ao FOTEBALL Manager! Monte seu time e construa uma dinastia
     no futebol brasileiro.`

---

## 🔊 Ambiente (não é narração — trilha à parte)

Uma coisa que dá MUITA imersão e **não** precisa do narrador: um **loop de
torcida/estádio** de fundo durante a partida (`amb_torcida_loop.mp3`, ~30–60s em
loop). Se conseguir separado, eu ligo junto. Ótimo ter também um **swell de
torcida** subindo no quase-gol.

---

### Resumo de contagem
~40–50 clipes curtos de narração + 1 loop de torcida. O narrador pode gravar
tudo numa sessão. Assim que chegarem, cada um vira som ligado ao evento certo no
`src/audio/sons.ts` e no dispatch da simulação.

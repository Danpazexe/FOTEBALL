# Faces de jogador (fotos reais — API-Football)

> Sistema de faces do FOTEBALL: mostra a **foto real** do jogador quando ela foi
> baixada e empacotada, ou um **fallback de iniciais** (círculo colorido pelo
> tier do overall) quando não há foto. Sem foto baixada, o app funciona igual.

---

## ⚠️ Exceção às regras (autorizada pelo dono)

Esta feature abre exceção a duas regras do projeto, **com autorização explícita**:

- **100% offline:** as fotos são baixadas **uma vez, no build** (pelo script
  abaixo) e empacotadas — o app **não** faz chamadas de rede em runtime. A regra
  "sem backend/online em runtime" segue valendo.
- **Licenciamento:** as imagens vêm da API-Football e, pelos termos dela, são
  "para identificação" e podem exigir permissões extras conforme o uso. O risco
  jurídico foi **assumido pelo dono do projeto**.

---

## Como popular as faces

1. Crie uma conta na **API-Football** (api-sports.io) e pegue sua chave.
2. Rode o script com a chave na env (Node 18+):

   ```bash
   APIFOOTBALL_KEY=suachave node scripts/baixarFaces.mjs
   # teste com poucos:      ... node scripts/baixarFaces.mjs --limite 20
   # só regenerar o índice: node scripts/baixarFaces.mjs --somente-indice
   ```

3. Rebuild nativo (`npm run android` / `npm run ios`) para o Metro empacotar as
   novas imagens.

O script é **resumível**: pula quem já tem foto (a API gratuita limita ~100
requisições/dia), então rode várias vezes até completar. Casos sem
correspondência ficam em `scripts/faces_pendentes.json` para você resolver à mão.

---

## Como funciona

- `scripts/baixarFaces.mjs` — lê `src/data/seed/jogadores/*.json`, busca cada
  jogador na API-Football (por nome), baixa a melhor correspondência para
  `src/assets/faces/<id>.png` e **gera** `src/data/facesIndex.ts`.
- `src/data/facesIndex.ts` — índice **estático** `jogadorId → require(foto)`.
  Auto-gerado; não editar à mão. (O Metro só empacota `require()` literal, por
  isso o índice em vez de caminho dinâmico.)
- `src/components/FaceJogador` — mostra a foto do índice **ou** o fallback de
  iniciais no círculo do tier. Usado hoje na `MiniPlayerCard` (tela de Elenco).

---

## Sem rodar o script?

Tudo funciona: `FACES` fica vazio e todo jogador aparece com o **fallback de
iniciais**. Nada quebra. As fotos aparecem assim que você rodar o script e
recompilar.

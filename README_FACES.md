# Faces de jogador (fotos reais — API-Football)

> Sistema de faces do FOTEBALL: mostra a **foto real** do jogador quando ela foi
> baixada e empacotada, ou um **fallback de iniciais** (círculo colorido pelo
> tier do overall) quando não há foto. Sem foto baixada, o app funciona igual.

---

## ⚠️ Exceção às regras (autorizada pelo dono)

Esta feature abre exceção a regras do projeto, **com autorização explícita**:

- **100% offline:** as fotos são baixadas **uma vez, no build** (pelos scripts
  abaixo) e empacotadas — o app **não** faz chamadas de rede em runtime. A regra
  "sem backend/online em runtime" segue valendo.
- **Licenciamento:** a via recomendada usa a **Wikipedia/Wikimedia Commons**
  (imagens em geral sob licença livre CC BY-SA). A via alternativa (API-Football)
  tem termos mais restritos — risco assumido pelo dono.

---

## Como popular as faces — via RECOMENDADA (Wikipedia, grátis, SEM key)

Roda **na sua máquina** (Node 18+), sem cadastro nem chave:

```bash
node scripts/baixarFacesWiki.mjs             # todos
node scripts/baixarFacesWiki.mjs --limite 40 # teste rápido
# depois: rebuild nativo (npm run android / ios) p/ empacotar as imagens
```

- **Sem API key.** Busca cada jogador na Wikipedia (pt) e só baixa se o TÍTULO da
  página **casar com o nome** (evita foto de outra pessoa). Quem não casa cai no
  fallback de iniciais.
- **Resumível** (pula quem já tem foto) e **gentil** (delay p/ não tomar 429).
  Nomes muito comuns podem casar errado — **confira as faces baixadas** e, se
  alguma estiver errada, apague o `src/assets/faces/<id>.jpg` e rode de novo.

> ⚠️ Nota: num **IP de nuvem** (como o ambiente do Claude) a Wikipedia bloqueia
> (429) rápido — por isso quem roda é você, na sua conexão normal.

## Via ALTERNATIVA (API-Football, precisa de key)

```bash
APIFOOTBALL_KEY=suachave node scripts/baixarFaces.mjs
```
Precisa de conta na api-sports.io (free ~100 req/dia). Mesmo resultado; use se
preferir a base da API-Football à da Wikipedia.

---

## Como funciona

- `scripts/baixarFacesWiki.mjs` / `scripts/baixarFaces.mjs` — leem
  `src/data/seed/jogadores/*.json`, baixam a foto de cada jogador para
  `src/assets/faces/<id>.<ext>` e **geram** `src/data/facesIndex.ts`.
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

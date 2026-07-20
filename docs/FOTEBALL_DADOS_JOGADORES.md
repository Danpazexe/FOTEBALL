# FOTEBALL — Dados de Jogadores

> Estrutura de dados, atributos, overall, potencial e recomendações para elencos.

---

## 1. Objetivo

Definir um padrão consistente para representar jogadores no FOTEBALL.

Os dados devem ser:

- fáceis de editar;
- compatíveis com JSON;
- estáveis;
- balanceáveis;
- suficientes para simulação;
- úteis para UI;
- preparados para expansão.

---

## 2. Estrutura Base

```ts
export type Jogador = {
  id: string;
  nome: string;
  idade: number;
  nacionalidade: string;
  clubeId: string | null;

  posicaoPrincipal: Posicao;
  posicoesSecundarias: Posicao[];

  perna: 'D' | 'E' | 'A';

  atributos: AtributosJogador;

  overall: number;
  potencial: number;

  condicao: number;
  moral: number;
  forma: number;

  valorMercado: number;
  salario: number;

  contratoAte: number;

  status: StatusJogador;
};
```

---

## 3. Posições

```ts
export type Posicao =
  | 'GOL'
  | 'ZAG'
  | 'LE'
  | 'LD'
  | 'VOL'
  | 'MC'
  | 'MEI'
  | 'PE'
  | 'PD'
  | 'ATA';
```

### Setores

```txt
Goleiro: GOL
Defesa: ZAG, LE, LD
Meio: VOL, MC, MEI
Ataque: PE, PD, ATA
```

---

## 4. Atributos

```ts
export type AtributosJogador = {
  velocidade: number;
  finalizacao: number;
  passe: number;
  drible: number;
  marcacao: number;
  desarme: number;
  fisico: number;
  resistencia: number;
  tecnica: number;
  criatividade: number;
  posicionamento: number;
  reflexo: number;
  lideranca: number;
};
```

Cada atributo varia de 0 a 100.

---

## 5. Pesos por Posição

### Goleiro

| Atributo | Peso |
|---|---:|
| reflexo | alto |
| posicionamento | alto |
| tecnica | médio |
| lideranca | médio |
| passe | baixo |
| fisico | baixo |

### Zagueiro

| Atributo | Peso |
|---|---:|
| marcacao | alto |
| desarme | alto |
| fisico | alto |
| posicionamento | alto |
| resistencia | médio |
| passe | baixo/médio |

### Lateral

| Atributo | Peso |
|---|---:|
| velocidade | alto |
| resistencia | alto |
| desarme | médio |
| passe | médio |
| marcacao | médio |
| drible | médio |

### Volante

| Atributo | Peso |
|---|---:|
| desarme | alto |
| marcacao | alto |
| passe | médio |
| fisico | médio |
| posicionamento | alto |
| resistencia | alto |

### Meio-campista

| Atributo | Peso |
|---|---:|
| passe | alto |
| tecnica | alto |
| criatividade | médio |
| resistencia | médio |
| posicionamento | médio |
| finalizacao | baixo/médio |

### Meia ofensivo

| Atributo | Peso |
|---|---:|
| criatividade | alto |
| passe | alto |
| tecnica | alto |
| drible | alto |
| finalizacao | médio |
| posicionamento | médio |

### Ponta

| Atributo | Peso |
|---|---:|
| velocidade | alto |
| drible | alto |
| finalizacao | médio |
| passe | médio |
| tecnica | médio |
| resistencia | médio |

### Atacante

| Atributo | Peso |
|---|---:|
| finalizacao | alto |
| posicionamento | alto |
| fisico | médio |
| velocidade | médio |
| tecnica | médio |
| drible | médio |

---

## 6. Overall

O overall deve ser calculado com pesos por posição.

Exemplo conceitual:

```ts
overall = soma(atributo * pesoDaPosicao) / somaPesos
```

O valor pode ser arredondado para inteiro.

---

## 7. Potencial

Potencial representa o teto provável do jogador.

Regras sugeridas:

| Idade | Comportamento |
|---:|---|
| 16–20 | alto crescimento |
| 21–24 | crescimento bom |
| 25–28 | auge / crescimento leve |
| 29–31 | estabilidade |
| 32+ | declínio gradual |

Potencial não deve garantir evolução automática. Ele indica limite provável.

---

## 8. Condição

```txt
0–100
```

Representa físico atual.

Afeta:

- desempenho na partida;
- risco de lesão;
- intensidade suportada;
- recuperação.

---

## 9. Moral

```txt
0–100
```

Representa confiança e satisfação.

Afeta:

- desempenho;
- renovação;
- desejo de sair;
- resposta a propostas;
- fase.

---

## 10. Forma

```txt
0–100
```

Representa fase recente.

Pode ser calculada a partir das últimas partidas.

Fatores:

- nota;
- gols;
- assistências;
- vitórias;
- erros;
- sequência como titular.

---

## 11. Status

```ts
export type StatusJogador =
  | 'disponivel'
  | 'lesionado'
  | 'suspenso'
  | 'negociando'
  | 'emprestado'
  | 'afastado';
```

---

## 12. Contrato

Campos mínimos:

```ts
type ContratoJogador = {
  jogadorId: string;
  clubeId: string;
  salario: number;
  contratoAte: number;
  multa?: number;
};
```

`contratoAte` pode representar a temporada final.

Exemplo:

```json
{
  "contratoAte": 2028
}
```

---

## 13. Valor de Mercado

Fatores:

- overall;
- potencial;
- idade;
- posição;
- contrato;
- salário;
- forma;
- moral;
- divisão;
- reputação;
- raridade da posição.

Sugestão:

- jovens com alto potencial valem mais;
- veteranos de alto overall ainda valem, mas menos;
- contrato acabando reduz valor;
- salário alto reduz interesse;
- boa fase aumenta valor.

---

## 14. Exemplo JSON

```json
{
  "id": "fla_001",
  "nome": "João Ribeiro",
  "idade": 23,
  "nacionalidade": "Brasil",
  "clubeId": "FLA",
  "posicaoPrincipal": "ATA",
  "posicoesSecundarias": ["PE", "PD"],
  "perna": "D",
  "atributos": {
    "velocidade": 82,
    "finalizacao": 79,
    "passe": 68,
    "drible": 81,
    "marcacao": 34,
    "desarme": 28,
    "fisico": 74,
    "resistencia": 76,
    "tecnica": 80,
    "criatividade": 70,
    "posicionamento": 78,
    "reflexo": 20,
    "lideranca": 55
  },
  "overall": 78,
  "potencial": 84,
  "condicao": 95,
  "moral": 70,
  "forma": 66,
  "valorMercado": 18500000,
  "salario": 420000,
  "contratoAte": 2028,
  "status": "disponivel"
}
```

---

## 15. Estrutura de Arquivos

Sugestão:

```txt
src/data/jogadores/serie-a.json
src/data/jogadores/serie-b.json
src/data/jogadores/serie-c.json
src/data/clubes/clubes.json
src/data/competicoes/competicoes.json
```

Ou separado por clube:

```txt
src/data/jogadores/serie-a/flamengo.json
src/data/jogadores/serie-a/palmeiras.json
src/data/jogadores/serie-a/corinthians.json
```

Separar por clube facilita manutenção manual.

---

## 16. Balanceamento por Divisão

### Série A

- Elencos mais fortes.
- Mais jogadores ouro.
- Alguns lendários/especiais.
- Maior orçamento.

### Série B

- Média menor.
- Jogadores prata e ouro baixo.
- Poucas estrelas.
- Mais veteranos e jovens.

### Série C

- Média menor.
- Bronze e prata predominantes.
- Orçamentos apertados.
- Maior variação física e técnica.

---

## 17. Distribuição Recomendada

### Série A

```txt
Overall médio: 68–78
Destaques: 80–88
Estrelas raras: 89+
```

### Série B

```txt
Overall médio: 60–70
Destaques: 72–78
Estrelas raras: 79–82
```

### Série C

```txt
Overall médio: 52–64
Destaques: 66–72
Estrelas raras: 73–76
```

---

## 18. Regra Anti-Inflação

Evitar muitos jogadores com overall alto.

Se todo mundo for craque, ninguém é craque.

Distribuição saudável:

- Bronze: comum em divisões baixas.
- Prata: base do jogo.
- Ouro: bons jogadores.
- Lendário: poucos.
- Especial: raríssimo.

---

## 19. Dados Reais e Licenciamento

Para evitar problemas:

- usar nomes genéricos quando necessário;
- permitir edição futura;
- separar dados do motor;
- não depender de marca/licença oficial no core;
- manter estrutura flexível para dados próprios.

---

## 20. Checklist de Qualidade

Antes de adicionar elenco:

- Todos têm `id` único.
- Todos têm posição válida.
- Overall bate com atributos.
- Potencial é coerente com idade.
- Salário cabe na divisão.
- Valor de mercado não está absurdo.
- Clube existe.
- Contrato está preenchido.
- Status é válido.
- JSON está bem formatado.

---

## 21. Direção Final

Os jogadores são o coração do FOTEBALL.

O sistema precisa gerar histórias:

- promessa que explode;
- veterano decisivo;
- goleiro salvando temporada;
- atacante vendido por necessidade;
- reserva ganhando vaga;
- craque insatisfeito;
- elenco limitado conquistando acesso.

Dados bons fazem o jogo respirar.

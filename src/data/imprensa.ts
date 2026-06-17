/**
 * Banco de perguntas de imprensa (Módulo 5 — Tela Pré-Jogo).
 * A escolha do técnico aplica deltas de moral ao elenco; alguns têm
 * bônus/penalidade condicionados ao resultado da partida.
 */

export interface OpcaoImprensa {
  texto: string;
  deltaMoralElenco: number;
  deltaMoralSeVencer?: number;
  deltaMoralSePerder?: number;
  deltaCondicao?: number;
}

export interface PerguntaImprensa {
  id: string;
  pergunta: string;
  opcoes: [OpcaoImprensa, OpcaoImprensa];
}

export const PERGUNTAS_IMPRENSA: PerguntaImprensa[] = [
  {
    id: 'avalia_adversario',
    pergunta: 'Como você avalia o adversário?',
    opcoes: [
      {texto: 'Com respeito, é um grande time', deltaMoralElenco: 2},
      {texto: 'Os favoritos somos nós', deltaMoralElenco: -1, deltaMoralSeVencer: 5, deltaMoralSePerder: -3},
    ],
  },
  {
    id: 'objetivos_rodada',
    pergunta: 'Quais são os objetivos desta rodada?',
    opcoes: [
      {texto: 'Vencer e seguir em frente', deltaMoralElenco: 1},
      {texto: 'Os 3 pontos a qualquer custo', deltaMoralElenco: 3, deltaCondicao: -2},
    ],
  },
  {
    id: 'elenco_motivado',
    pergunta: 'O elenco está motivado?',
    opcoes: [
      {texto: 'Estamos muito bem', deltaMoralElenco: 3},
      {texto: 'Precisamos melhorar', deltaMoralElenco: -1, deltaMoralSeVencer: 4},
    ],
  },
  {
    id: 'pressao_torcida',
    pergunta: 'A torcida está pressionando. O que diz?',
    opcoes: [
      {texto: 'A torcida é nossa força', deltaMoralElenco: 2},
      {texto: 'Ignoramos o barulho de fora', deltaMoralElenco: 0, deltaMoralSePerder: -2},
    ],
  },
  {
    id: 'desfalques',
    pergunta: 'Como lida com os desfalques?',
    opcoes: [
      {texto: 'Confio em quem entrar', deltaMoralElenco: 3},
      {texto: 'Faz muita falta, sim', deltaMoralElenco: -2},
    ],
  },
  {
    id: 'briga_titulo',
    pergunta: 'Vocês brigam pelo título?',
    opcoes: [
      {texto: 'Pensamos jogo a jogo', deltaMoralElenco: 1},
      {texto: 'Somos candidatos, sim', deltaMoralElenco: 4, deltaMoralSePerder: -4},
    ],
  },
  {
    id: 'jovens',
    pergunta: 'Vai apostar nos garotos da base?',
    opcoes: [
      {texto: 'Eles merecem a chance', deltaMoralElenco: 3},
      {texto: 'A experiência decide', deltaMoralElenco: 1},
    ],
  },
  {
    id: 'arbitragem',
    pergunta: 'Preocupado com a arbitragem?',
    opcoes: [
      {texto: 'Confiamos no trabalho deles', deltaMoralElenco: 1},
      {texto: 'Espero critério dentro de campo', deltaMoralElenco: 0},
    ],
  },
  {
    id: 'sequencia',
    pergunta: 'Como avalia a sequência do time?',
    opcoes: [
      {texto: 'Estamos no caminho certo', deltaMoralElenco: 2},
      {texto: 'Temos que dar mais', deltaMoralElenco: -1, deltaMoralSeVencer: 3},
    ],
  },
  {
    id: 'recado_elenco',
    pergunta: 'Algum recado para o elenco?',
    opcoes: [
      {texto: 'Tenho orgulho desse grupo', deltaMoralElenco: 4},
      {texto: 'Cobro responsabilidade', deltaMoralElenco: -1, deltaCondicao: 1},
    ],
  },
];

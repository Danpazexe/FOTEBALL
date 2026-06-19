import type {Habilidade, Player, Position} from '../../types';

/**
 * Sistema de habilidades especiais (perks), ao estilo Brasfoot
 * (BRASFOOT_MASTER §3.2). Cada jogador tem no máximo 2.
 *
 * Como o seed traz centenas de jogadores (um JSON por clube) sem habilidades,
 * elas são DERIVADAS dos atributos no load (`derivarHabilidades`) — de forma
 * pura e determinística, sem `Math.random`. Um JSON pode trazer `habilidades`
 * explícitas (craque feito à mão) e nesse caso a derivação é ignorada.
 *
 * Os EFEITOS na simulação (peso de autor de lance, defesa de pênalti, bônus de
 * força etc.) são integrados na engine de partida num passo posterior; aqui fica
 * só o catálogo e a derivação.
 */

export interface MetaHabilidade {
  /** Nome curto exibido na UI. */
  rotulo: string;
  /** Efeito resumido (BRASFOOT_MASTER §3.2). */
  descricao: string;
  /** Ícone MaterialCommunityIcons. */
  icone: string;
}

export const HABILIDADES: Record<Habilidade, MetaHabilidade> = {
  ARTILHEIRO: {
    rotulo: 'Artilheiro',
    descricao: 'Mais perigoso na finalização — converte mais gols.',
    icone: 'target',
  },
  ASSISTENCIAS: {
    rotulo: 'Garçom',
    descricao: 'Distribui assistências — mais passes para gol.',
    icone: 'handshake',
  },
  LIDERANCA: {
    rotulo: 'Liderança',
    descricao: 'Levanta a moral do elenco após a vitória.',
    icone: 'crown',
  },
  DEFENSOR: {
    rotulo: 'Muralha',
    descricao: 'Reduz os gols sofridos quando está na defesa.',
    icone: 'shield',
  },
  VELOCISTA: {
    rotulo: 'Velocista',
    descricao: 'Decisivo no contra-ataque pela velocidade.',
    icone: 'run-fast',
  },
  FINALIZADOR: {
    rotulo: 'Finalizador',
    descricao: 'Melhor conversão dentro da área.',
    icone: 'bullseye-arrow',
  },
  CHUTE_LONGO: {
    rotulo: 'Chute de longe',
    descricao: 'Gera gols de fora da área.',
    icone: 'rocket-launch',
  },
  FALTA: {
    rotulo: 'Cobrador de falta',
    descricao: 'Perigoso nas faltas diretas.',
    icone: 'whistle',
  },
  CABECEADOR: {
    rotulo: 'Cabeceador',
    descricao: 'Decisivo em escanteios e cruzamentos.',
    icone: 'soccer',
  },
  GOLEIRO_PENALTI: {
    rotulo: 'Pega-pênalti',
    descricao: 'Defende mais pênaltis.',
    icone: 'hand-back-right',
  },
};

/** Limite de habilidades por jogador (BRASFOOT_MASTER §3.2). */
export const MAX_HABILIDADES = 2;

const GRUPO_ATA: Position[] = ['SA', 'CA'];
const GRUPO_OFENSIVO: Position[] = ['SA', 'CA', 'PD', 'PE', 'MEI'];
const GRUPO_MEIO: Position[] = ['VOL', 'MC', 'MEI'];
const GRUPO_CRIACAO: Position[] = ['MC', 'MEI', 'PD', 'PE', 'LD', 'LE'];
const GRUPO_DEF: Position[] = ['ZAG', 'VOL', 'LD', 'LE'];

interface Candidata {
  habilidade: Habilidade;
  apto: boolean;
  pontuacao: number;
}

/**
 * Deriva as habilidades de um jogador a partir dos atributos. Pura e
 * determinística: o mesmo jogador sempre produz a mesma lista. Só atributos
 * realmente acima da média viram perk, então a maioria dos jogadores tem 0-1 e
 * os craques chegam ao limite de 2.
 */
export function derivarHabilidades(jogador: Player): Habilidade[] {
  const a = jogador.atributos;
  const p = jogador.posicaoPrincipal;

  // Ordem = prioridade de desempate quando a pontuação empata.
  const candidatas: Candidata[] = [
    {
      habilidade: 'GOLEIRO_PENALTI',
      apto: p === 'GOL' && a.reflexos >= 85,
      pontuacao: a.reflexos,
    },
    {
      habilidade: 'ARTILHEIRO',
      apto: GRUPO_ATA.includes(p) && a.finalizacao >= 85,
      pontuacao: a.finalizacao + 3,
    },
    {
      habilidade: 'FINALIZADOR',
      apto: GRUPO_OFENSIVO.includes(p) && a.finalizacao >= 82,
      pontuacao: a.finalizacao,
    },
    {
      habilidade: 'CABECEADOR',
      apto: a.cabeceio >= 82 && a.forca >= 72,
      pontuacao: a.cabeceio,
    },
    {
      habilidade: 'VELOCISTA',
      apto: a.velocidade >= 86,
      pontuacao: a.velocidade,
    },
    {
      habilidade: 'ASSISTENCIAS',
      apto: GRUPO_CRIACAO.includes(p) && (a.passe >= 83 || a.cruzamento >= 83),
      pontuacao: Math.max(a.passe, a.cruzamento),
    },
    {
      habilidade: 'CHUTE_LONGO',
      apto: GRUPO_MEIO.includes(p) && a.finalizacao >= 78 && a.forca >= 80,
      pontuacao: (a.finalizacao + a.forca) / 2,
    },
    {
      habilidade: 'FALTA',
      apto: a.finalizacao >= 82 && a.passe >= 80,
      pontuacao: (a.finalizacao + a.passe) / 2,
    },
    {
      habilidade: 'DEFENSOR',
      apto: GRUPO_DEF.includes(p) && (a.marcacao >= 83 || a.desarme >= 83),
      pontuacao: Math.max(a.marcacao, a.desarme),
    },
    {
      habilidade: 'LIDERANCA',
      apto: jogador.idade >= 29 && jogador.overall >= 80,
      pontuacao: jogador.overall,
    },
  ];

  let aptas = candidatas.filter(candidata => candidata.apto);

  // ARTILHEIRO e FINALIZADOR se sobrepõem (ambos finalização): mantém só o mais
  // forte (ARTILHEIRO) para não gastar os 2 slots em perks redundantes.
  if (aptas.some(candidata => candidata.habilidade === 'ARTILHEIRO')) {
    aptas = aptas.filter(candidata => candidata.habilidade !== 'FINALIZADOR');
  }

  return aptas
    .map((candidata, indice) => ({candidata, indice}))
    .sort((x, y) => {
      const delta = y.candidata.pontuacao - x.candidata.pontuacao;
      return delta !== 0 ? delta : x.indice - y.indice;
    })
    .slice(0, MAX_HABILIDADES)
    .map(item => item.candidata.habilidade);
}

/**
 * Garante o campo `habilidades` no jogador: respeita o que já vier explícito
 * (craque feito à mão, limitado a 2) e deriva dos atributos caso contrário.
 */
export function comHabilidades(jogador: Player): Player {
  if (jogador.habilidades && jogador.habilidades.length > 0) {
    return {
      ...jogador,
      habilidades: jogador.habilidades.slice(0, MAX_HABILIDADES),
    };
  }
  return {...jogador, habilidades: derivarHabilidades(jogador)};
}

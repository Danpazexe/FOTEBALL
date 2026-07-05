/**
 * Jornada do técnico — carreira guiada por estágios de reputação. Puro e
 * determinístico: traduz a reputação (0-100) num estágio nomeado (do
 * "Desconhecido" à "Lenda") + o próximo marco a alcançar e o progresso rumo a ele.
 * Dá um norte de longo prazo e conversa com as propostas de clubes (quanto maior
 * o estágio, maiores os clubes que procuram). Derivação; sem estado, sem RNG.
 */

export type EstagioCarreira =
  | 'Desconhecido'
  | 'Promessa'
  | 'Respeitado'
  | 'Renomado'
  | 'Ídolo'
  | 'Lenda';

export interface MarcoJornada {
  estagio: EstagioCarreira;
  reputacaoMinima: number;
  descricao: string;
}

export interface JornadaTecnico {
  estagioAtual: EstagioCarreira;
  descricaoAtual: string;
  /** Próximo marco a alcançar; null se já é Lenda. */
  proximoMarco: MarcoJornada | null;
  /** Progresso 0-1 do estágio atual rumo ao próximo (1 quando é Lenda). */
  progressoAteProximo: number;
}

/** Marcos da jornada, do menor ao maior (reputacaoMinima crescente). */
const MARCOS: readonly MarcoJornada[] = [
  {
    estagio: 'Desconhecido',
    reputacaoMinima: 0,
    descricao: 'Poucos clubes conhecem o seu trabalho.',
  },
  {
    estagio: 'Promessa',
    reputacaoMinima: 40,
    descricao: 'Clubes médios começam a te observar.',
  },
  {
    estagio: 'Respeitado',
    reputacaoMinima: 55,
    descricao: 'Um nome consolidado no futebol.',
  },
  {
    estagio: 'Renomado',
    reputacaoMinima: 70,
    descricao: 'Grandes clubes te cortejam.',
  },
  {
    estagio: 'Ídolo',
    reputacaoMinima: 85,
    descricao: 'Referência nacional; os gigantes te querem.',
  },
  {
    estagio: 'Lenda',
    reputacaoMinima: 95,
    descricao: 'Entre os maiores treinadores de todos os tempos.',
  },
];

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}

/** Traduz a reputação do técnico na sua jornada de carreira. */
export function calcularJornada(reputacaoTecnico: number): JornadaTecnico {
  const rep = limitar(reputacaoTecnico, 0, 100);

  // Índice do marco atual: o maior marco cuja reputação mínima já foi atingida.
  let indiceAtual = 0;
  for (let i = 0; i < MARCOS.length; i++) {
    if (rep >= MARCOS[i].reputacaoMinima) {
      indiceAtual = i;
    }
  }

  const atual = MARCOS[indiceAtual];
  const proximoMarco =
    indiceAtual < MARCOS.length - 1 ? MARCOS[indiceAtual + 1] : null;

  const progressoAteProximo = proximoMarco
    ? limitar(
        (rep - atual.reputacaoMinima) /
          (proximoMarco.reputacaoMinima - atual.reputacaoMinima),
        0,
        1,
      )
    : 1;

  return {
    estagioAtual: atual.estagio,
    descricaoAtual: atual.descricao,
    proximoMarco,
    progressoAteProximo,
  };
}

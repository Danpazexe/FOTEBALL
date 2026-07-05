/**
 * Momentos dramáticos da partida. Puro e determinístico: LÊ uma partida já
 * simulada (eventos + placar) e classifica a narrativa dramática — virada, gol
 * no fim, goleada, expulsão, decisão nos pênaltis. NÃO simula nem toca no core
 * determinístico; é interpretação dos eventos que a engine já produziu.
 *
 * Reconstrói a progressão do placar a partir dos eventos 'gol' (pênalti
 * convertido também emite 'gol' no matchSimulator; a disputa de pênaltis do
 * mata-mata NÃO gera eventos). Uma guarda confirma que a reconstrução bate com
 * o placar final antes de emitir momentos que dependem da ordem dos gols.
 */

import {ehEventoGol, type EventoPartida} from '../../types';

export type TipoMomento =
  | 'virada'
  | 'viradaSofrida'
  | 'golNoFim'
  | 'sofridoNoFim'
  | 'penaltis'
  | 'goleadaAplicada'
  | 'goleadaSofrida'
  | 'expulsaoAdversario'
  | 'expulsaoNossa';

export type TomMomento = 'bom' | 'ruim' | 'neutro';

export interface MomentoDramatico {
  tipo: TipoMomento;
  tom: TomMomento;
  texto: string;
}

/** Minuto a partir do qual um gol é "no fim". */
const MIN_TARDIO = 85;
/** Diferença de gols que caracteriza goleada. */
const DIFF_GOLEADA = 4;

export interface ContextoMomentos {
  eventos: EventoPartida[];
  timeCasa: string;
  timeFora: string;
  placarCasa: number;
  placarFora: number;
  meuTimeId: string;
  /** Vencedor nos pênaltis (mata-mata empatado); ausente em jogo de liga. */
  vencedorPenaltis?: string;
}

/**
 * Classifica os momentos dramáticos da partida na ótica do `meuTimeId`, do mais
 * marcante ao menos.
 */
export function analisarMomentos(ctx: ContextoMomentos): MomentoDramatico[] {
  const {
    eventos,
    timeCasa,
    timeFora,
    placarCasa,
    placarFora,
    meuTimeId,
    vencedorPenaltis,
  } = ctx;

  const souCasa = meuTimeId === timeCasa;
  const meuPlacar = souCasa ? placarCasa : placarFora;
  const advPlacar = souCasa ? placarFora : placarCasa;

  // Resultado NOS PÊNALTIS (para o momento de pênaltis) x resultado EM CAMPO. Em
  // jogo decidido nos pênaltis o campo terminou EMPATE, então os momentos de
  // progressão (virada/gol no fim) usam o placar de campo — nunca as penalidades,
  // que decidem só o card 'penaltis'.
  const resultado: 'V' | 'E' | 'D' = vencedorPenaltis
    ? vencedorPenaltis === meuTimeId
      ? 'V'
      : 'D'
    : meuPlacar > advPlacar
      ? 'V'
      : meuPlacar < advPlacar
        ? 'D'
        : 'E';
  const resultadoCampo: 'V' | 'E' | 'D' =
    meuPlacar > advPlacar ? 'V' : meuPlacar < advPlacar ? 'D' : 'E';

  // Progressão do placar pelos eventos de gol (inclui gol contra — muda placar).
  const gols = eventos
    .filter(evento => ehEventoGol(evento.tipo))
    .sort((a, b) => a.minuto - b.minuto);
  let casa = 0;
  let fora = 0;
  let esteveAtras = false;
  let esteveFrente = false;
  // Candidatos independentes de gol tardio decisivo (>=85'), para não perder um
  // momento quando há mais de um lance no fim.
  let golNoFimMin: number | null = null; // meu gol que igualou/virou no fim
  let sofridoNoFimMin: number | null = null; // gol adversário que igualou/virou no fim
  for (const gol of gols) {
    if (gol.timeId === timeCasa) {
      casa++;
    } else if (gol.timeId === timeFora) {
      fora++;
    } else {
      continue;
    }
    const meu = souCasa ? casa : fora;
    const adv = souCasa ? fora : casa;
    if (meu < adv) {
      esteveAtras = true;
    }
    if (meu > adv) {
      esteveFrente = true;
    }
    if (gol.minuto >= MIN_TARDIO) {
      const margem = meu - adv;
      if (gol.timeId === meuTimeId && margem >= 0 && margem <= 1) {
        golNoFimMin = gol.minuto; // meu gol de virada/empate no apagar das luzes
      } else if (gol.timeId !== meuTimeId && margem <= 0 && margem >= -1) {
        sofridoNoFimMin = gol.minuto; // gol adversário que igualou/virou no fim
      }
    }
  }
  const progressaoConfere = casa === placarCasa && fora === placarFora;

  const momentos: MomentoDramatico[] = [];
  let contouViradaSofrida = false;
  let contouVirada = false;

  // Momentos que dependem da ordem dos gols (só com progressão confiável e SEMPRE
  // pela ótica do campo — nunca do resultado nos pênaltis).
  if (progressaoConfere) {
    if (resultadoCampo === 'V' && esteveAtras) {
      momentos.push({
        tipo: 'virada',
        tom: 'bom',
        texto: 'Virada! O time buscou o resultado depois de estar atrás.',
      });
      contouVirada = true;
    } else if (resultadoCampo === 'D' && esteveFrente) {
      momentos.push({
        tipo: 'viradaSofrida',
        tom: 'ruim',
        texto: 'Levou a virada depois de estar na frente.',
      });
      contouViradaSofrida = true;
    }

    if (
      golNoFimMin != null &&
      !contouVirada &&
      (resultadoCampo === 'V' || resultadoCampo === 'E')
    ) {
      momentos.push({
        tipo: 'golNoFim',
        tom: 'bom',
        texto: `Gol aos ${golNoFimMin}' para ${
          resultadoCampo === 'V' ? 'vencer' : 'empatar'
        } no sufoco.`,
      });
    }
    if (
      sofridoNoFimMin != null &&
      !contouViradaSofrida &&
      (resultadoCampo === 'D' || resultadoCampo === 'E')
    ) {
      momentos.push({
        tipo: 'sofridoNoFim',
        tom: 'ruim',
        texto: `Gol sofrido aos ${sofridoNoFimMin}' custou o resultado.`,
      });
    }
  }

  // Decisão nos pênaltis (mata-mata).
  if (vencedorPenaltis) {
    momentos.push({
      tipo: 'penaltis',
      tom: resultado === 'V' ? 'bom' : 'ruim',
      texto:
        resultado === 'V'
          ? 'Classificado nos pênaltis!'
          : 'Eliminado nos pênaltis.',
    });
  } else {
    // Goleada só faz sentido quando o jogo foi decidido no tempo.
    const diff = meuPlacar - advPlacar;
    if (diff >= DIFF_GOLEADA) {
      momentos.push({
        tipo: 'goleadaAplicada',
        tom: 'bom',
        texto: `Goleada por ${meuPlacar}x${advPlacar}!`,
      });
    } else if (diff <= -DIFF_GOLEADA) {
      momentos.push({
        tipo: 'goleadaSofrida',
        tom: 'ruim',
        texto: `Goleada sofrida por ${advPlacar}x${meuPlacar}.`,
      });
    }
  }

  // Expulsões (independem da progressão).
  const vermelhos = eventos.filter(
    evento => evento.tipo === 'cartao_vermelho',
  );
  if (vermelhos.some(evento => evento.timeId === meuTimeId)) {
    momentos.push({
      tipo: 'expulsaoNossa',
      tom: 'ruim',
      texto: 'Jogou com um a menos após expulsão.',
    });
  }
  if (
    vermelhos.some(
      evento =>
        evento.timeId !== meuTimeId &&
        (evento.timeId === timeCasa || evento.timeId === timeFora),
    )
  ) {
    momentos.push({
      tipo: 'expulsaoAdversario',
      tom: 'bom',
      texto: 'Adversário terminou com um a menos.',
    });
  }

  return momentos;
}

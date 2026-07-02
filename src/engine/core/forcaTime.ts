import type {Player, PlayerAttributes, Position} from '../../types/player';
import type {Tatica} from '../../types/club';
import type {EscalacaoCore, ForcaTimeCore, Setor} from './domain';
import {
  calcularPenalidadePosicaoCore,
  setorPorPosicaoCore,
} from './escalacao';

const clamp = (valor: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, valor));

const media = (valores: readonly number[]): number => {
  if (valores.length === 0) {
    return 0;
  }

  return valores.reduce((total, valor) => total + valor, 0) / valores.length;
};

const indiceJogadores = (jogadores: Player[]): Map<string, Player> =>
  new Map(jogadores.map(jogador => [jogador.id, jogador]));

const notaAtributosPorSetor = (
  atributos: PlayerAttributes,
  setor: Setor,
): number => {
  if (setor === 'GOL') {
    return media([
      atributos.reflexos,
      atributos.posicionamento,
      atributos.resistencia,
      atributos.forca,
    ]);
  }

  if (setor === 'DEFESA') {
    return media([
      atributos.marcacao,
      atributos.desarme,
      atributos.cabeceio,
      atributos.forca,
      atributos.posicionamento,
    ]);
  }

  if (setor === 'MEIO') {
    return media([
      atributos.passe,
      atributos.drible,
      atributos.posicionamento,
      atributos.resistencia,
      atributos.desarme,
    ]);
  }

  return media([
    atributos.finalizacao,
    atributos.velocidade,
    atributos.drible,
    atributos.cabeceio,
    atributos.posicionamento,
  ]);
};

const calcularNotaJogadorNoSetor = (
  jogador: Player,
  posicaoEscalada: Position,
): number => {
  const setor = setorPorPosicaoCore(posicaoEscalada);
  const notaBase = jogador.overall * 0.65 + notaAtributosPorSetor(jogador.atributos, setor) * 0.35;
  const penalidade = calcularPenalidadePosicaoCore(jogador, posicaoEscalada);
  const fatorPenalidade = 1 - (penalidade?.percentual ?? 0);
  const fatorFisico = 0.75 + clamp(jogador.condicaoFisica) / 400;
  const fatorMoral = 0.9 + clamp(jogador.moral) / 1000;
  const fatorForma = 0.9 + clamp(jogador.forma) / 1000;

  return clamp(notaBase * fatorPenalidade * fatorFisico * fatorMoral * fatorForma);
};

const aplicarModificadoresTaticos = (
  forca: Omit<ForcaTimeCore, 'geral'>,
  tatica: Tatica | null,
): Omit<ForcaTimeCore, 'geral'> => {
  const ajustada = {...forca};

  if (!tatica) {
    return ajustada;
  }

  if (tatica.estiloOfensivo === 'Contra-ataque') {
    ajustada.ataque += 2;
    ajustada.meio -= 1;
    ajustada.riscoDefensivo -= 3;
    ajustada.volumeOfensivo -= 1;
  }

  if (tatica.estiloOfensivo === 'Posse de bola') {
    ajustada.meio += 3;
    ajustada.ataque += 1;
    ajustada.volumeOfensivo += 1;
  }

  if (tatica.estiloOfensivo === 'Ataque direto') {
    ajustada.ataque += 3;
    ajustada.meio -= 2;
    ajustada.riscoDefensivo += 2;
    ajustada.volumeOfensivo += 3;
  }

  if (tatica.marcacao === 'Pressão alta') {
    ajustada.volumeOfensivo += 4;
    ajustada.riscoDefensivo += 3;
    ajustada.desgasteProjetado += 4;
  }

  if (tatica.marcacao === 'Individual') {
    ajustada.defesa += 1;
    ajustada.desgasteProjetado += 2;
  }

  if (tatica.linhaDefensiva === 'Recuada') {
    ajustada.defesa += 3;
    ajustada.riscoDefensivo -= 4;
    ajustada.volumeOfensivo -= 2;
  }

  if (tatica.linhaDefensiva === 'Adiantada') {
    ajustada.meio += 2;
    ajustada.volumeOfensivo += 2;
    ajustada.riscoDefensivo += 5;
  }

  if (tatica.ritmo === 'Lento') {
    ajustada.desgasteProjetado -= 3;
    ajustada.volumeOfensivo -= 1;
  }

  if (tatica.ritmo === 'Intenso') {
    ajustada.volumeOfensivo += 3;
    ajustada.desgasteProjetado += 5;
    ajustada.riscoDefensivo += 1;
  }

  return {
    ataque: clamp(ajustada.ataque),
    meio: clamp(ajustada.meio),
    defesa: clamp(ajustada.defesa),
    goleiro: clamp(ajustada.goleiro),
    fisico: clamp(ajustada.fisico),
    moral: clamp(ajustada.moral),
    forma: clamp(ajustada.forma),
    entrosamento: clamp(ajustada.entrosamento),
    riscoDefensivo: clamp(ajustada.riscoDefensivo),
    volumeOfensivo: clamp(ajustada.volumeOfensivo),
    desgasteProjetado: clamp(ajustada.desgasteProjetado),
  };
};

export const calcularForcaTimeCore = (
  jogadores: Player[],
  escalacao: EscalacaoCore,
  tatica: Tatica | null,
  mandoDeCampo = false,
): ForcaTimeCore => {
  const indice = indiceJogadores(jogadores);
  const notasAtaque: number[] = [];
  const notasMeio: number[] = [];
  const notasDefesa: number[] = [];
  const notasGoleiro: number[] = [];
  const condicoes: number[] = [];
  const morais: number[] = [];
  const formas: number[] = [];
  let foraDePosicao = 0;

  for (const titular of escalacao.titulares) {
    const jogador = indice.get(titular.jogadorId);

    if (!jogador) {
      continue;
    }

    const nota = calcularNotaJogadorNoSetor(jogador, titular.posicao);
    const setor = setorPorPosicaoCore(titular.posicao);

    if (setor === 'GOL') {
      notasGoleiro.push(nota);
    } else if (setor === 'DEFESA') {
      notasDefesa.push(nota);
    } else if (setor === 'MEIO') {
      notasMeio.push(nota);
    } else {
      notasAtaque.push(nota);
    }

    if (calcularPenalidadePosicaoCore(jogador, titular.posicao)) {
      foraDePosicao += 1;
    }

    condicoes.push(jogador.condicaoFisica);
    morais.push(jogador.moral);
    formas.push(jogador.forma);
  }

  const entrosamento = clamp(100 - foraDePosicao * 7);
  const base = {
    ataque: media(notasAtaque),
    meio: media(notasMeio),
    defesa: media(notasDefesa),
    goleiro: media(notasGoleiro),
    fisico: media(condicoes),
    moral: media(morais),
    forma: media(formas),
    entrosamento,
    riscoDefensivo: 50,
    volumeOfensivo: 50,
    desgasteProjetado: 10,
  };

  const ajustada = aplicarModificadoresTaticos(base, tatica);
  const bonusMando = mandoDeCampo ? 2 : 0;
  const geral =
    ajustada.ataque * 0.24 +
    ajustada.meio * 0.22 +
    ajustada.defesa * 0.22 +
    ajustada.goleiro * 0.14 +
    ajustada.fisico * 0.07 +
    ajustada.moral * 0.05 +
    ajustada.forma * 0.04 +
    ajustada.entrosamento * 0.02 +
    bonusMando;

  return {
    ...ajustada,
    geral: clamp(geral),
  };
};

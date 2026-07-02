import type {Player, Position} from '../../types/player';
import type {
  EscalacaoCore,
  PenalidadeEscalacao,
  ResultadoValidacaoEscalacao,
  Setor,
} from './domain';

const POSICOES_DEFESA: readonly Position[] = ['ZAG', 'LD', 'LE'];
const POSICOES_MEIO: readonly Position[] = ['VOL', 'MC', 'MEI'];
const POSICOES_ATAQUE: readonly Position[] = ['PD', 'PE', 'SA', 'CA'];

export const setorPorPosicaoCore = (posicao: Position): Setor => {
  if (posicao === 'GOL') {
    return 'GOL';
  }

  if (POSICOES_DEFESA.includes(posicao)) {
    return 'DEFESA';
  }

  if (POSICOES_MEIO.includes(posicao)) {
    return 'MEIO';
  }

  return 'ATAQUE';
};

const criarIndiceJogadores = (jogadores: Player[]): Map<string, Player> =>
  new Map(jogadores.map(jogador => [jogador.id, jogador]));

export const calcularPenalidadePosicaoCore = (
  jogador: Player,
  posicaoEscalada: Position,
): PenalidadeEscalacao | null => {
  if (jogador.posicaoPrincipal === posicaoEscalada) {
    return null;
  }

  if (jogador.posicoesSecundarias.includes(posicaoEscalada)) {
    return {
      jogadorId: jogador.id,
      posicaoOriginal: jogador.posicaoPrincipal,
      posicaoEscalada,
      percentual: 0.05,
      motivo: 'secundaria',
    };
  }

  const setorOriginal = setorPorPosicaoCore(jogador.posicaoPrincipal);
  const setorEscalado = setorPorPosicaoCore(posicaoEscalada);

  return {
    jogadorId: jogador.id,
    posicaoOriginal: jogador.posicaoPrincipal,
    posicaoEscalada,
    percentual: setorOriginal === setorEscalado ? 0.1 : 0.2,
    motivo: setorOriginal === setorEscalado ? 'mesmo_setor' : 'fora_setor',
  };
};

export const validarEscalacaoCore = (
  escalacao: EscalacaoCore,
  jogadores: Player[],
): ResultadoValidacaoEscalacao => {
  const erros: string[] = [];
  const avisos: string[] = [];
  const penalidades: PenalidadeEscalacao[] = [];
  const indiceJogadores = criarIndiceJogadores(jogadores);
  const idsTitulares = escalacao.titulares.map(titular => titular.jogadorId);
  const idsUnicos = new Set(idsTitulares);

  if (escalacao.titulares.length !== 11) {
    erros.push('A escalação precisa ter exatamente 11 titulares.');
  }

  if (idsUnicos.size !== idsTitulares.length) {
    erros.push('A escalação não pode ter jogador duplicado.');
  }

  let goleiros = 0;
  let defensores = 0;
  let meioCampistas = 0;
  let atacantes = 0;

  for (const titular of escalacao.titulares) {
    const jogador = indiceJogadores.get(titular.jogadorId);

    if (!jogador) {
      erros.push(`Jogador ${titular.jogadorId} não encontrado no elenco.`);
      continue;
    }

    if (jogador.clubeId === null) {
      erros.push(`${jogador.nome} não tem contrato ativo com um clube.`);
    }

    if (jogador.lesionado || jogador.diasLesao > 0) {
      erros.push(`${jogador.nome} está lesionado e não pode jogar.`);
    }

    if (jogador.suspenso || jogador.jogosSuspensao > 0) {
      erros.push(`${jogador.nome} está suspenso e não pode jogar.`);
    }

    if (jogador.posicaoPrincipal === 'GOL' && titular.posicao !== 'GOL') {
      erros.push(`${jogador.nome} é goleiro e não pode jogar na linha.`);
    }

    if (jogador.posicaoPrincipal !== 'GOL' && titular.posicao === 'GOL') {
      erros.push(`${jogador.nome} não é goleiro e não pode atuar no gol.`);
    }

    const setor = setorPorPosicaoCore(titular.posicao);

    if (setor === 'GOL') {
      goleiros += 1;
    } else if (setor === 'DEFESA') {
      defensores += 1;
    } else if (setor === 'MEIO') {
      meioCampistas += 1;
    } else {
      atacantes += 1;
    }

    const penalidade = calcularPenalidadePosicaoCore(jogador, titular.posicao);

    if (penalidade) {
      penalidades.push(penalidade);
      avisos.push(`${jogador.nome} está fora da posição ideal.`);
    }

    if (jogador.condicaoFisica < 50) {
      avisos.push(`${jogador.nome} está com condição física baixa.`);
    }

    if (jogador.moral < 40) {
      avisos.push(`${jogador.nome} está com moral baixa.`);
    }
  }

  if (goleiros !== 1) {
    erros.push('É obrigatório escalar exatamente 1 goleiro.');
  }

  if (defensores < 3) {
    erros.push('É obrigatório escalar pelo menos 3 jogadores de defesa.');
  }

  if (meioCampistas < 2) {
    erros.push('É obrigatório escalar pelo menos 2 meio-campistas.');
  }

  if (atacantes < 1) {
    erros.push('É obrigatório escalar pelo menos 1 atacante.');
  }

  return {
    valido: erros.length === 0,
    erros,
    avisos,
    penalidades,
  };
};

export const detectarFormacaoCore = (escalacao: EscalacaoCore): string => {
  const linhas = escalacao.titulares.reduce(
    (acc, titular) => {
      const setor = setorPorPosicaoCore(titular.posicao);

      if (setor === 'DEFESA') {
        acc.defesa += 1;
      } else if (setor === 'MEIO') {
        acc.meio += 1;
      } else if (setor === 'ATAQUE') {
        acc.ataque += 1;
      }

      return acc;
    },
    {defesa: 0, meio: 0, ataque: 0},
  );

  return `${linhas.defesa}-${linhas.meio}-${linhas.ataque}`;
};

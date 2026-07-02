import type {Player, Position} from '../../types/player';
import type {
  EstatisticasPartidaCore,
  EventoPartidaCore,
  ForcaTimeCore,
  GravidadeLesao,
  LesaoGeradaCore,
  NotaJogadorCore,
  SimularPartidaCoreInput,
  SimularPartidaCoreOutput,
  SuspensaoGeradaCore,
  TimeEmPartidaCore,
} from './domain';
import {setorPorPosicaoCore} from './escalacao';
import {calcularForcaTimeCore} from './forcaTime';
import {criarRngCore, type RngCore} from './rng';

type LadoPartidaCore = 'casa' | 'fora';

interface EstadoTimePartidaCore {
  lado: LadoPartidaCore;
  time: TimeEmPartidaCore;
  forca: ForcaTimeCore;
  expulsos: Set<string>;
  amarelos: Map<string, number>;
  momentum: number;
}

interface EstadoPartidaCore {
  placarCasa: number;
  placarFora: number;
  estatisticas: EstatisticasPartidaCore;
  eventos: EventoPartidaCore[];
  notas: Map<string, NotaJogadorCore>;
  lesoes: LesaoGeradaCore[];
  suspensoes: SuspensaoGeradaCore[];
}

const clamp = (valor: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, valor));

const round2 = (valor: number): number => Math.round(valor * 100) / 100;

const criarEstatisticasIniciais = (): EstatisticasPartidaCore => ({
  posseCasa: 50,
  posseFora: 50,
  finalizacoesCasa: 0,
  finalizacoesFora: 0,
  finalizacoesNoAlvoCasa: 0,
  finalizacoesNoAlvoFora: 0,
  xgCasa: 0,
  xgFora: 0,
  escanteiosCasa: 0,
  escanteiosFora: 0,
  faltasCasa: 0,
  faltasFora: 0,
  amarelosCasa: 0,
  amarelosFora: 0,
  vermelhosCasa: 0,
  vermelhosFora: 0,
});

const obterJogadoresTitulares = (time: TimeEmPartidaCore): Player[] => {
  const indice = new Map(time.jogadores.map(jogador => [jogador.id, jogador]));

  return time.escalacao.titulares
    .map(titular => indice.get(titular.jogadorId))
    .filter((jogador): jogador is Player => Boolean(jogador));
};

const obterPosicaoEscalada = (
  time: TimeEmPartidaCore,
  jogadorId: string,
): Position | null =>
  time.escalacao.titulares.find(titular => titular.jogadorId === jogadorId)?.posicao ??
  null;

const criarNotasIniciais = (
  casa: TimeEmPartidaCore,
  fora: TimeEmPartidaCore,
): Map<string, NotaJogadorCore> => {
  const notas = new Map<string, NotaJogadorCore>();

  for (const time of [casa, fora]) {
    for (const jogador of obterJogadoresTitulares(time)) {
      notas.set(jogador.id, {
        jogadorId: jogador.id,
        clubeId: time.clubeId,
        nota: 6,
        minutos: 90,
        gols: 0,
        assistencias: 0,
        cartoesAmarelos: 0,
        cartoesVermelhos: 0,
      });
    }
  }

  return notas;
};

const ajustarNota = (
  notas: Map<string, NotaJogadorCore>,
  jogadorId: string,
  delta: number,
): void => {
  const notaAtual = notas.get(jogadorId);

  if (!notaAtual) {
    return;
  }

  notaAtual.nota = clamp(round2(notaAtual.nota + delta), 3, 10);
};

const incrementarNota = (
  notas: Map<string, NotaJogadorCore>,
  jogadorId: string,
  campo: 'gols' | 'assistencias' | 'cartoesAmarelos' | 'cartoesVermelhos',
): void => {
  const notaAtual = notas.get(jogadorId);

  if (!notaAtual) {
    return;
  }

  notaAtual[campo] += 1;
};

const escolherJogadorPorSetor = (
  estadoTime: EstadoTimePartidaCore,
  rng: RngCore,
  setoresPreferidos: readonly string[],
): Player => {
  const titularesDisponiveis = obterJogadoresTitulares(estadoTime.time).filter(
    jogador => !estadoTime.expulsos.has(jogador.id),
  );
  const candidatos = titularesDisponiveis.filter(jogador => {
    const posicao = obterPosicaoEscalada(estadoTime.time, jogador.id);

    return posicao ? setoresPreferidos.includes(setorPorPosicaoCore(posicao)) : false;
  });

  if (candidatos.length > 0) {
    return rng.pick(candidatos);
  }

  return rng.pick(titularesDisponiveis.length > 0 ? titularesDisponiveis : obterJogadoresTitulares(estadoTime.time));
};

const modificarEstatistica = (
  estatisticas: EstatisticasPartidaCore,
  lado: LadoPartidaCore,
  chaveCasa: keyof EstatisticasPartidaCore,
  chaveFora: keyof EstatisticasPartidaCore,
  delta: number,
): void => {
  const chave = lado === 'casa' ? chaveCasa : chaveFora;
  estatisticas[chave] += delta;
};

const registrarFinalizacao = (
  estado: EstadoPartidaCore,
  lado: LadoPartidaCore,
  xg: number,
  noAlvo: boolean,
): void => {
  modificarEstatistica(
    estado.estatisticas,
    lado,
    'finalizacoesCasa',
    'finalizacoesFora',
    1,
  );

  if (noAlvo) {
    modificarEstatistica(
      estado.estatisticas,
      lado,
      'finalizacoesNoAlvoCasa',
      'finalizacoesNoAlvoFora',
      1,
    );
  }

  if (lado === 'casa') {
    estado.estatisticas.xgCasa = round2(estado.estatisticas.xgCasa + xg);
  } else {
    estado.estatisticas.xgFora = round2(estado.estatisticas.xgFora + xg);
  }
};

const calcularProbabilidadeChance = (
  atacante: EstadoTimePartidaCore,
  defensor: EstadoTimePartidaCore,
  minuto: number,
): number => {
  const forcaDefensorAjustada = defensor.forca.defesa + defensor.forca.goleiro * 0.45;
  const expulsosAtacante = atacante.expulsos.size * 0.018;
  const expulsosDefensor = defensor.expulsos.size * 0.015;
  const cansaco = minuto > 60 ? (100 - atacante.forca.fisico) / 3500 : 0;
  const vantagem =
    atacante.forca.ataque +
    atacante.forca.meio * 0.35 +
    atacante.forca.volumeOfensivo * 0.25 +
    atacante.momentum -
    forcaDefensorAjustada -
    defensor.forca.riscoDefensivo * -0.08;

  return clamp(0.038 + vantagem / 2800 - expulsosAtacante + expulsosDefensor - cansaco, 0.012, 0.12);
};

const calcularXgChance = (
  atacante: EstadoTimePartidaCore,
  defensor: EstadoTimePartidaCore,
  rng: RngCore,
): number => {
  const diferenca =
    atacante.forca.ataque * 0.7 +
    atacante.forca.meio * 0.25 +
    atacante.momentum * 0.3 -
    defensor.forca.defesa * 0.55 -
    defensor.forca.goleiro * 0.35;
  const qualidadeAleatoria = rng.random() * 0.42;

  return round2(clamp(0.07 + diferenca / 900 + qualidadeAleatoria, 0.03, 0.65));
};

const textoGol = (minuto: number, jogador: Player, time: TimeEmPartidaCore): string =>
  `${minuto}' Gol do ${time.nome}. ${jogador.nome} concluiu a jogada.`;

const processarChance = (
  minuto: number,
  atacante: EstadoTimePartidaCore,
  defensor: EstadoTimePartidaCore,
  estado: EstadoPartidaCore,
  rng: RngCore,
): void => {
  if (!rng.chance(calcularProbabilidadeChance(atacante, defensor, minuto))) {
    return;
  }

  const xg = calcularXgChance(atacante, defensor, rng);
  const finalizador = escolherJogadorPorSetor(atacante, rng, ['ATAQUE', 'MEIO']);
  const assistente = escolherJogadorPorSetor(atacante, rng, ['MEIO', 'ATAQUE']);
  const goleiro = escolherJogadorPorSetor(defensor, rng, ['GOL']);
  const gol = rng.chance(xg);

  registrarFinalizacao(estado, atacante.lado, xg, gol || xg >= 0.18);

  if (gol) {
    if (atacante.lado === 'casa') {
      estado.placarCasa += 1;
    } else {
      estado.placarFora += 1;
    }

    atacante.momentum = clamp(atacante.momentum + 8, -20, 20);
    defensor.momentum = clamp(defensor.momentum - 6, -20, 20);
    ajustarNota(estado.notas, finalizador.id, 1.2);
    incrementarNota(estado.notas, finalizador.id, 'gols');

    if (assistente.id !== finalizador.id) {
      ajustarNota(estado.notas, assistente.id, 0.7);
      incrementarNota(estado.notas, assistente.id, 'assistencias');
    }

    estado.eventos.push({
      minuto,
      tipo: 'gol',
      clubeId: atacante.time.clubeId,
      jogadorId: finalizador.id,
      assistenciaId: assistente.id !== finalizador.id ? assistente.id : undefined,
      xg,
      texto: textoGol(minuto, finalizador, atacante.time),
    });

    return;
  }

  if (xg > 0.2 && rng.chance(0.28)) {
    ajustarNota(estado.notas, goleiro.id, 0.35);
    estado.eventos.push({
      minuto,
      tipo: 'defesa_dificil',
      clubeId: defensor.time.clubeId,
      jogadorId: goleiro.id,
      xg,
      texto: `${minuto}' ${goleiro.nome} salvou o ${defensor.time.nome}.`,
    });
    return;
  }

  if (xg > 0.16 && rng.chance(0.2)) {
    estado.eventos.push({
      minuto,
      tipo: 'bola_na_trave',
      clubeId: atacante.time.clubeId,
      jogadorId: finalizador.id,
      xg,
      texto: `${minuto}' ${finalizador.nome} acertou a trave.`,
    });
    return;
  }

  estado.eventos.push({
    minuto,
    tipo: 'chance',
    clubeId: atacante.time.clubeId,
    jogadorId: finalizador.id,
    xg,
    texto: `${minuto}' ${finalizador.nome} finalizou para o ${atacante.time.nome}.`,
  });
};

const chanceCartao = (time: EstadoTimePartidaCore): number => {
  let chance = 0.008;

  if (time.time.tatica?.marcacao === 'Pressão alta') {
    chance += 0.004;
  }

  if (time.time.tatica?.ritmo === 'Intenso') {
    chance += 0.003;
  }

  return chance;
};

const processarCartao = (
  minuto: number,
  time: EstadoTimePartidaCore,
  estado: EstadoPartidaCore,
  rng: RngCore,
): void => {
  if (!rng.chance(chanceCartao(time))) {
    return;
  }

  const jogador = escolherJogadorPorSetor(time, rng, ['DEFESA', 'MEIO']);
  const amarelosAtuais = time.amarelos.get(jogador.id) ?? 0;
  time.amarelos.set(jogador.id, amarelosAtuais + 1);
  modificarEstatistica(estado.estatisticas, time.lado, 'faltasCasa', 'faltasFora', 1);
  modificarEstatistica(estado.estatisticas, time.lado, 'amarelosCasa', 'amarelosFora', 1);
  ajustarNota(estado.notas, jogador.id, -0.2);
  incrementarNota(estado.notas, jogador.id, 'cartoesAmarelos');

  estado.eventos.push({
    minuto,
    tipo: 'cartao_amarelo',
    clubeId: time.time.clubeId,
    jogadorId: jogador.id,
    texto: `${minuto}' Cartão amarelo para ${jogador.nome}.`,
  });

  if (amarelosAtuais >= 1 && rng.chance(0.18)) {
    time.expulsos.add(jogador.id);
    modificarEstatistica(estado.estatisticas, time.lado, 'vermelhosCasa', 'vermelhosFora', 1);
    ajustarNota(estado.notas, jogador.id, -1.2);
    incrementarNota(estado.notas, jogador.id, 'cartoesVermelhos');
    estado.suspensoes.push({
      jogadorId: jogador.id,
      clubeId: time.time.clubeId,
      jogos: 1,
      motivo: 'vermelho',
    });
    estado.eventos.push({
      minuto,
      tipo: 'cartao_vermelho',
      clubeId: time.time.clubeId,
      jogadorId: jogador.id,
      texto: `${minuto}' ${jogador.nome} recebeu o segundo amarelo e foi expulso.`,
    });
  }
};

const gravidadeLesao = (rng: RngCore): GravidadeLesao => {
  const valor = rng.random();

  if (valor < 0.65) {
    return 'leve';
  }

  if (valor < 0.9) {
    return 'media';
  }

  return 'grave';
};

const jogosForaPorGravidade = (gravidade: GravidadeLesao, rng: RngCore): number => {
  if (gravidade === 'leve') {
    return rng.integer(1, 2);
  }

  if (gravidade === 'media') {
    return rng.integer(3, 6);
  }

  return rng.integer(7, 16);
};

const processarLesao = (
  minuto: number,
  time: EstadoTimePartidaCore,
  estado: EstadoPartidaCore,
  rng: RngCore,
): void => {
  const riscoFisico = (100 - time.forca.fisico) / 25000;
  const riscoTatico = time.forca.desgasteProjetado / 20000;

  if (!rng.chance(0.001 + riscoFisico + riscoTatico)) {
    return;
  }

  const jogador = escolherJogadorPorSetor(time, rng, ['MEIO', 'ATAQUE', 'DEFESA']);
  const gravidade = gravidadeLesao(rng);
  const jogosFora = jogosForaPorGravidade(gravidade, rng);

  ajustarNota(estado.notas, jogador.id, -0.3);
  estado.lesoes.push({
    jogadorId: jogador.id,
    clubeId: time.time.clubeId,
    gravidade,
    jogosFora,
  });
  estado.eventos.push({
    minuto,
    tipo: 'lesao',
    clubeId: time.time.clubeId,
    jogadorId: jogador.id,
    gravidade,
    texto: `${minuto}' ${jogador.nome} sentiu lesão ${gravidade}.`,
  });
};

const aplicarBonusResultadoNasNotas = (estado: EstadoPartidaCore): void => {
  const deltaCasa = estado.placarCasa > estado.placarFora ? 0.3 : estado.placarCasa < estado.placarFora ? -0.3 : 0;
  const deltaFora = estado.placarFora > estado.placarCasa ? 0.3 : estado.placarFora < estado.placarCasa ? -0.3 : 0;

  for (const nota of estado.notas.values()) {
    const delta = nota.clubeId === 'casa' ? deltaCasa : deltaFora;
    nota.nota = clamp(round2(nota.nota + delta), 3, 10);
  }
};

const calcularAlteracoesCondicao = (
  casa: TimeEmPartidaCore,
  fora: TimeEmPartidaCore,
  forcaCasa: ForcaTimeCore,
  forcaFora: ForcaTimeCore,
): SimularPartidaCoreOutput['alteracoes']['condicao'] => {
  const alteracoes: SimularPartidaCoreOutput['alteracoes']['condicao'] = [];

  for (const item of [
    {time: casa, forca: forcaCasa},
    {time: fora, forca: forcaFora},
  ]) {
    for (const jogador of obterJogadoresTitulares(item.time)) {
      const resistencia = jogador.atributos.resistencia;
      const perda = Math.round(8 + item.forca.desgasteProjetado * 0.35 + (100 - resistencia) * 0.04);
      const depois = clamp(jogador.condicaoFisica - perda);

      alteracoes.push({
        jogadorId: jogador.id,
        antes: jogador.condicaoFisica,
        depois,
        delta: depois - jogador.condicaoFisica,
      });
    }
  }

  return alteracoes;
};

const calcularAlteracoesMoral = (
  casa: TimeEmPartidaCore,
  fora: TimeEmPartidaCore,
  estado: EstadoPartidaCore,
): SimularPartidaCoreOutput['alteracoes']['moral'] => {
  const jogadores = new Map(
    [...obterJogadoresTitulares(casa), ...obterJogadoresTitulares(fora)].map(jogador => [
      jogador.id,
      jogador,
    ]),
  );
  const alteracoes: SimularPartidaCoreOutput['alteracoes']['moral'] = [];

  for (const nota of estado.notas.values()) {
    const jogador = jogadores.get(nota.jogadorId);

    if (!jogador) {
      continue;
    }

    const venceu =
      (nota.clubeId === casa.clubeId && estado.placarCasa > estado.placarFora) ||
      (nota.clubeId === fora.clubeId && estado.placarFora > estado.placarCasa);
    const perdeu =
      (nota.clubeId === casa.clubeId && estado.placarCasa < estado.placarFora) ||
      (nota.clubeId === fora.clubeId && estado.placarFora < estado.placarCasa);
    const deltaResultado = venceu ? 5 : perdeu ? -5 : 1;
    const deltaNota = nota.nota >= 8 ? 3 : nota.nota < 5 ? -3 : 0;
    const deltaParticipacao = nota.gols * 4 + nota.assistencias * 2;
    const deltaCartao = nota.cartoesVermelhos > 0 ? -4 : 0;
    const delta = deltaResultado + deltaNota + deltaParticipacao + deltaCartao;
    const depois = clamp(jogador.moral + delta);

    alteracoes.push({
      jogadorId: jogador.id,
      antes: jogador.moral,
      depois,
      delta: depois - jogador.moral,
    });
  }

  return alteracoes;
};

const finalizarPosse = (
  estatisticas: EstatisticasPartidaCore,
  forcaCasa: ForcaTimeCore,
  forcaFora: ForcaTimeCore,
): void => {
  const baseCasa = forcaCasa.meio + forcaCasa.entrosamento * 0.25 + forcaCasa.moral * 0.1;
  const baseFora = forcaFora.meio + forcaFora.entrosamento * 0.25 + forcaFora.moral * 0.1;
  const total = Math.max(1, baseCasa + baseFora);
  const posseCasa = clamp(Math.round((baseCasa / total) * 100), 35, 65);

  estatisticas.posseCasa = posseCasa;
  estatisticas.posseFora = 100 - posseCasa;
};

export const simularPartidaCore = (
  input: SimularPartidaCoreInput,
): SimularPartidaCoreOutput => {
  const rng = criarRngCore(input.seed);
  const forcaCasa = calcularForcaTimeCore(
    input.casa.jogadores,
    input.casa.escalacao,
    input.casa.tatica,
    true,
  );
  const forcaFora = calcularForcaTimeCore(
    input.fora.jogadores,
    input.fora.escalacao,
    input.fora.tatica,
    false,
  );
  const estadoCasa: EstadoTimePartidaCore = {
    lado: 'casa',
    time: input.casa,
    forca: forcaCasa,
    expulsos: new Set<string>(),
    amarelos: new Map<string, number>(),
    momentum: 4,
  };
  const estadoFora: EstadoTimePartidaCore = {
    lado: 'fora',
    time: input.fora,
    forca: forcaFora,
    expulsos: new Set<string>(),
    amarelos: new Map<string, number>(),
    momentum: 0,
  };
  const estado: EstadoPartidaCore = {
    placarCasa: 0,
    placarFora: 0,
    estatisticas: criarEstatisticasIniciais(),
    eventos: [],
    notas: criarNotasIniciais(input.casa, input.fora),
    lesoes: [],
    suspensoes: [],
  };

  for (let minuto = 1; minuto <= 90; minuto += 1) {
    processarChance(minuto, estadoCasa, estadoFora, estado, rng);
    processarChance(minuto, estadoFora, estadoCasa, estado, rng);
    processarCartao(minuto, estadoCasa, estado, rng);
    processarCartao(minuto, estadoFora, estado, rng);
    processarLesao(minuto, estadoCasa, estado, rng);
    processarLesao(minuto, estadoFora, estado, rng);

    if (minuto === 80) {
      const perdendoCasa = estado.placarCasa < estado.placarFora;
      const perdendoFora = estado.placarFora < estado.placarCasa;

      if (perdendoCasa || perdendoFora) {
        estado.eventos.push({
          minuto,
          tipo: 'pressao_final',
          clubeId: perdendoCasa ? input.casa.clubeId : input.fora.clubeId,
          texto: `${minuto}' O time que está atrás aumenta a pressão final.`,
        });
      }
    }
  }

  aplicarBonusResultadoNasNotas(estado);
  finalizarPosse(estado.estatisticas, forcaCasa, forcaFora);
  estado.eventos.push({
    minuto: 90,
    tipo: 'fim_de_jogo',
    texto: `Fim de jogo: ${input.casa.nome} ${estado.placarCasa} x ${estado.placarFora} ${input.fora.nome}.`,
  });

  return {
    jogoId: input.jogoId,
    placar: {
      casa: estado.placarCasa,
      fora: estado.placarFora,
    },
    eventos: estado.eventos,
    estatisticas: estado.estatisticas,
    notas: [...estado.notas.values()],
    forcas: {
      casa: forcaCasa,
      fora: forcaFora,
    },
    alteracoes: {
      condicao: calcularAlteracoesCondicao(input.casa, input.fora, forcaCasa, forcaFora),
      moral: calcularAlteracoesMoral(input.casa, input.fora, estado),
      lesoes: estado.lesoes,
      suspensoes: estado.suspensoes,
    },
  };
};

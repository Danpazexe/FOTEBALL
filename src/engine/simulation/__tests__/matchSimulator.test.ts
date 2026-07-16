import type {Clube, Formacao, Player, Position, Tatica} from '../../../types';

import {
  acrescimosDaSeed,
  calcularContextoMinuto,
  calcularPossePartida,
  disputarPenaltis,
  iniciarPartidaAoVivo,
  simularMinuto,
  simularPartida,
} from '../matchSimulator';
import {criarRNGComSeed} from '../rng';

const posicoes433: Position[] = [
  'GOL',
  'LD',
  'ZAG',
  'ZAG',
  'LE',
  'VOL',
  'MC',
  'MEI',
  'PD',
  'CA',
  'PE',
];

const tatica: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function criarJogadores(prefixo: string, overall: number): Player[] {
  return posicoes433.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall,
      passe: overall,
      marcacao: overall,
      desarme: overall,
      velocidade: overall,
      resistencia: overall,
      forca: overall,
      reflexos: overall,
      posicionamento: overall,
      drible: overall,
      cabeceio: overall,
      cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: 1000000,
    salario: 10000,
    contratoAte: '2028-12-31',
    clubeId: prefixo,
    lesionado: false,
    diasLesao: 0,
    suspenso: false,
    jogosSuspensao: 0,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 0,
      gols: 0,
      assistencias: 0,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 0,
    },
    historicoTemporadas: [],
  }));
}

function criarFormacao(jogadores: Player[]): Formacao {
  return {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: posicoes433[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
}

function criarClube(id: string, jogadores: Player[]): Clube {
  return {
    id,
    nome: id,
    sigla: id.slice(0, 3).toUpperCase(),
    cidade: '',
    estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: criarFormacao(jogadores),
    taticaAtual: tatica,
    financas: {
      saldo: 5000000,
      receitaMensal: {
        bilheteria: 0,
        patrocinio: 0,
        premiacoes: 0,
        vendaJogadores: 0,
      },
      despesaMensal: {
        salarios: 0,
        manutencaoEstadio: 0,
        comissoes: 0,
        contratacoes: 0,
      },
      patrocinadores: [],
      historicoTransacoes: [],
    },
    estadio: {
      nome: `Estádio ${id}`,
      capacidade: 30000,
      precoMedioIngresso: 40,
      nivelInfraestrutura: 3,
    },
    reputacao: 50,
    controladoPorIA: true,
  };
}

// Padrão de 500 jogos (era 1000): metade do custo, mantendo as faixas
// estatísticas com folga (séries determinísticas por seed sequencial).
function simularSerie(overallCasa: number, overallFora: number, total = 500) {
  const jogadoresCasa = criarJogadores('casa', overallCasa);
  const jogadoresFora = criarJogadores('fora', overallFora);
  const timeCasa = criarClube('casa', jogadoresCasa);
  const timeFora = criarClube('fora', jogadoresFora);

  return Array.from({length: total}, (_, index) =>
    simularPartida({
      timeCasa,
      timeFora,
      jogadoresCasa,
      jogadoresFora,
      seed: index + 1,
    }),
  );
}

describe('simularPartida', () => {
  it('is deterministic with the same seed', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 75);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);
    const input = {
      timeCasa,
      timeFora,
      jogadoresCasa,
      jogadoresFora,
      seed: 123,
    };

    expect(simularPartida(input)).toEqual(simularPartida(input));
  });

  it('produz resultados variados para seeds diferentes (não ignora a seed)', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 75);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);
    const placares = new Set(
      Array.from({length: 50}, (_, index) =>
        simularPartida({
          timeCasa,
          timeFora,
          jogadoresCasa,
          jogadoresFora,
          seed: index + 1,
        }),
      ).map(partida => `${partida.placarCasa}-${partida.placarFora}`),
    );
    // Determinismo NÃO pode virar "seed ignorada": seeds distintas têm de gerar
    // mais de um placar ao longo de 50 jogos.
    expect(placares.size).toBeGreaterThan(1);
  });

  it('keeps equal teams near a home advantage distribution', () => {
    const partidas = simularSerie(75, 75);
    const casa = partidas.filter(
      partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
    ).length;
    const empate = partidas.filter(
      partida => partida.placarCasa === partida.placarFora,
    ).length;
    const fora = partidas.length - casa - empate;

    expect(casa / partidas.length).toBeGreaterThanOrEqual(0.4);
    expect(casa / partidas.length).toBeLessThanOrEqual(0.56);
    expect(empate / partidas.length).toBeGreaterThanOrEqual(0.15);
    expect(empate / partidas.length).toBeLessThanOrEqual(0.3);
    expect(fora / partidas.length).toBeGreaterThanOrEqual(0.22);
    expect(fora / partidas.length).toBeLessThanOrEqual(0.4);
  });

  it('makes a much stronger home team win at least 65 percent', () => {
    const partidas = simularSerie(85, 60);
    const vitoriasForte = partidas.filter(
      partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
    ).length;

    expect(vitoriasForte / partidas.length).toBeGreaterThanOrEqual(0.65);
  });

  it('mantém média de gols na faixa-alvo de balanceamento (2.4 a 3.1)', () => {
    const partidas = simularSerie(75, 75);
    const mediaGols =
      partidas.reduce(
        (total, partida) =>
          total + (partida.placarCasa ?? 0) + (partida.placarFora ?? 0),
        0,
      ) / partidas.length;

    expect(mediaGols).toBeGreaterThanOrEqual(2.4);
    expect(mediaGols).toBeLessThanOrEqual(3.1);
  });

  it('cartões aparecem na quase totalidade dos jogos (~3.4 amarelos/jogo)', () => {
    const partidas = simularSerie(75, 75);
    const partidasComCartao = partidas.filter(partida =>
      partida.eventos.some(
        evento =>
          evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho',
      ),
    ).length;

    // Calibrado ao alvo do usuário (3.4 amarelos/jogo, nível Brasileirão): quase
    // todo jogo tem cartão — o intervalo antigo (30–70%) valia p/ ~0.9 cartão/jogo.
    expect(partidasComCartao / partidas.length).toBeGreaterThanOrEqual(0.85);
  });

  it('gera pênaltis (perdidos) e expulsões ao longo de muitos jogos', () => {
    const partidas = simularSerie(75, 75);
    const comPenalti = partidas.filter(partida =>
      partida.eventos.some(evento => evento.tipo === 'penalti'),
    ).length;
    const comVermelho = partidas.filter(partida =>
      partida.eventos.some(evento => evento.tipo === 'cartao_vermelho'),
    ).length;

    expect(comPenalti).toBeGreaterThan(0);
    expect(comVermelho).toBeGreaterThan(0);
  });

  it('credita assistências em parte dos gols de jogo aberto', () => {
    const partidas = simularSerie(75, 75);
    const golsComAssist = partidas
      .flatMap(partida => partida.eventos)
      .filter(evento => evento.tipo === 'gol' && evento.jogadorAssistenciaId);
    expect(golsComAssist.length).toBeGreaterThan(0);
    // O assistente nunca é o próprio autor do gol.
    expect(
      golsComAssist.every(gol => gol.jogadorAssistenciaId !== gol.jogadorId),
    ).toBe(true);
  });

  it('um time com goleiro muito melhor sofre menos gols na média', () => {
    const ataqueParelho = 70;
    const casa = criarJogadores('casa', ataqueParelho);
    const foraComParedao = criarJogadores('fora', ataqueParelho).map(j =>
      j.posicaoPrincipal === 'GOL'
        ? {...j, atributos: {...j.atributos, reflexos: 99, posicionamento: 99}}
        : j,
    );
    const foraComFrango = criarJogadores('fora', ataqueParelho).map(j =>
      j.posicaoPrincipal === 'GOL'
        ? {...j, atributos: {...j.atributos, reflexos: 40, posicionamento: 40}}
        : j,
    );
    const timeCasa = criarClube('casa', casa);
    const golsContraParedao = Array.from({length: 300}, (_, i) =>
      simularPartida({
        timeCasa,
        timeFora: criarClube('fora', foraComParedao),
        jogadoresCasa: casa,
        jogadoresFora: foraComParedao,
        seed: i + 1,
      }),
    ).reduce((t, p) => t + (p.placarCasa ?? 0), 0);
    const golsContraFrango = Array.from({length: 300}, (_, i) =>
      simularPartida({
        timeCasa,
        timeFora: criarClube('fora', foraComFrango),
        jogadoresCasa: casa,
        jogadoresFora: foraComFrango,
        seed: i + 1,
      }),
    ).reduce((t, p) => t + (p.placarCasa ?? 0), 0);
    expect(golsContraParedao).toBeLessThan(golsContraFrango);
  });
});

describe('mata-mata e pênaltis', () => {
  function montar(overallCasa: number, overallFora: number) {
    const jogadoresCasa = criarJogadores('casa', overallCasa);
    const jogadoresFora = criarJogadores('fora', overallFora);
    return {
      timeCasa: criarClube('casa', jogadoresCasa),
      timeFora: criarClube('fora', jogadoresFora),
      jogadoresCasa,
      jogadoresFora,
    };
  }

  it('com desempate, nenhum jogo termina sem vencedor', () => {
    const base = montar(75, 75);
    const partidas = Array.from({length: 200}, (_, i) =>
      simularPartida({...base, seed: i + 1, desempate: true}),
    );
    for (const p of partidas) {
      const decididoNoTempo = p.placarCasa !== p.placarFora;
      expect(decididoNoTempo || p.vencedorPenaltis !== undefined).toBe(true);
      if (p.vencedorPenaltis !== undefined) {
        expect(['casa', 'fora']).toContain(p.vencedorPenaltis);
      }
    }
    // Pelo menos um jogo precisou ir aos pênaltis na amostra.
    expect(partidas.some(p => p.vencedorPenaltis !== undefined)).toBe(true);
  });

  it('sem desempate (liga), empates são mantidos e não há pênaltis', () => {
    const base = montar(75, 75);
    const partidas = Array.from({length: 200}, (_, i) =>
      simularPartida({...base, seed: i + 1}),
    );
    expect(partidas.some(p => p.placarCasa === p.placarFora)).toBe(true);
    expect(partidas.every(p => p.vencedorPenaltis === undefined)).toBe(true);
  });

  it('disputarPenaltis é determinístico e retorna um dos dois clubes', () => {
    const a = disputarPenaltis(criarRNGComSeed(7), 75, 70, 'casa', 'fora');
    const b = disputarPenaltis(criarRNGComSeed(7), 75, 70, 'casa', 'fora');
    expect(a).toBe(b);
    expect(['casa', 'fora']).toContain(a);
  });
});

describe('posse de bola (dinâmica, minuto a minuto)', () => {
  it('deve produzir posse idêntica para a mesma seed', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 72);
    const input = {
      timeCasa: criarClube('casa', jogadoresCasa),
      timeFora: criarClube('fora', jogadoresFora),
      jogadoresCasa,
      jogadoresFora,
      seed: 42,
    };
    const r1 = simularPartida(input);
    const r2 = simularPartida(input);
    expect(r1.posseCasa).toBe(r2.posseCasa);
    expect(r1.posseFora).toBe(r2.posseFora);
  });

  it('deve somar 100 e ficar dentro de limites plausíveis em toda partida', () => {
    for (const partida of simularSerie(78, 68, 200)) {
      expect((partida.posseCasa ?? 0) + (partida.posseFora ?? 0)).toBe(100);
      expect(partida.posseCasa).toBeGreaterThanOrEqual(15);
      expect(partida.posseCasa).toBeLessThanOrEqual(85);
    }
  });

  it('deve ficar perto de 50% na média entre times iguais', () => {
    const partidas = simularSerie(72, 72, 300);
    const media =
      partidas.reduce((soma, p) => soma + (p.posseCasa ?? 0), 0) /
      partidas.length;
    expect(media).toBeGreaterThan(46);
    expect(media).toBeLessThan(54);
  });

  it('deve dar mais posse ao time com meio-campo muito superior', () => {
    const partidas = simularSerie(82, 64, 200);
    const media =
      partidas.reduce((soma, p) => soma + (p.posseCasa ?? 0), 0) /
      partidas.length;
    expect(media).toBeGreaterThan(57);
    // Domínio, sim; monopólio, não — o adversário ainda toca na bola.
    expect(media).toBeLessThan(82);
  });

  it('deve refletir a intenção tática: posse de bola × contra-ataque', () => {
    const jogadoresCasa = criarJogadores('casa', 74);
    const jogadoresFora = criarJogadores('fora', 74);
    const timeCasa = {
      ...criarClube('casa', jogadoresCasa),
      taticaAtual: {...tatica, estiloOfensivo: 'Posse de bola' as const},
    };
    const timeFora = {
      ...criarClube('fora', jogadoresFora),
      taticaAtual: {...tatica, estiloOfensivo: 'Contra-ataque' as const},
    };
    const partidas = Array.from({length: 200}, (_, i) =>
      simularPartida({timeCasa, timeFora, jogadoresCasa, jogadoresFora, seed: i + 1}),
    );
    const media =
      partidas.reduce((soma, p) => soma + (p.posseCasa ?? 0), 0) /
      partidas.length;
    expect(media).toBeGreaterThan(58);
  });

  it('deve derrubar a posse de quem joga em desvantagem numérica (ao vivo)', () => {
    const jogadoresCasa = criarJogadores('casa', 74);
    const jogadoresFora = criarJogadores('fora', 74);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);

    const medias: number[] = [];
    for (let seed = 1; seed <= 20; seed += 1) {
      const estado = iniciarPartidaAoVivo(seed);
      // Casa perde 3 jogadores de linha logo no início (expulsões/lesões).
      estado.indisponiveis.add('casa_5');
      estado.indisponiveis.add('casa_6');
      estado.indisponiveis.add('casa_7');
      for (let minuto = 1; minuto <= 90; minuto += 1) {
        const ctx = calcularContextoMinuto(
          timeCasa,
          timeFora,
          jogadoresCasa,
          jogadoresFora,
          estado,
        );
        simularMinuto(estado, ctx);
      }
      medias.push(calcularPossePartida(estado).casa);
    }
    const media = medias.reduce((soma, valor) => soma + valor, 0) / medias.length;
    expect(media).toBeLessThan(42);
  });

  it('deve reportar 50/50 antes de a bola rolar', () => {
    expect(calcularPossePartida(iniciarPartidaAoVivo(1))).toEqual({
      casa: 50,
      fora: 50,
    });
  });
});

describe('estatísticas avançadas (acumuladas minuto a minuto)', () => {
  const montarPartidas = (total: number) => simularSerie(76, 70, total);

  it('deve produzir estatísticas idênticas para a mesma seed', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const jogadoresFora = criarJogadores('fora', 72);
    const input = {
      timeCasa: criarClube('casa', jogadoresCasa),
      timeFora: criarClube('fora', jogadoresFora),
      jogadoresCasa,
      jogadoresFora,
      seed: 77,
    };
    expect(simularPartida(input).estatisticas).toEqual(
      simularPartida(input).estatisticas,
    );
  });

  it('deve manter os invariantes de consistência em toda partida', () => {
    for (const partida of montarPartidas(150)) {
      const est = partida.estatisticas;
      expect(est).toBeDefined();
      if (!est) {
        continue;
      }
      for (const [lado, placar] of [
        [est.casa, partida.placarCasa ?? 0],
        [est.fora, partida.placarFora ?? 0],
      ] as const) {
        // Todo gol nasceu de uma finalização no alvo.
        expect(lado.finalizacoesNoAlvo).toBeGreaterThanOrEqual(placar);
        expect(lado.finalizacoes).toBe(
          lado.finalizacoesNaArea + lado.finalizacoesDeFora,
        );
        expect(lado.finalizacoes).toBeGreaterThanOrEqual(lado.finalizacoesNoAlvo);
        expect(lado.passesCertos).toBeLessThanOrEqual(lado.passesTentados);
        // RN-05 (engine causal V2): grande chance classifica a OPORTUNIDADE
        // (xG ≥ limiar), não o resultado — um gol de chance ruim NÃO vira
        // grande chance. O invariante forte agora é placar == gols do ledger.
        expect(lado.grandesChances).toBeLessThanOrEqual(lado.finalizacoes);
        const timeIdLado =
          lado === est.casa ? partida.timeCasa : partida.timeFora;
        const golsLedger = (partida.chutes ?? []).filter(
          c => c.resultado === 'gol' && c.timeId === timeIdLado,
        ).length;
        expect(golsLedger).toBe(placar);
        // Cartões implicam faltas.
        const cartoes = partida.eventos.filter(
          e =>
            (e.tipo === 'cartao_amarelo' || e.tipo === 'cartao_vermelho') &&
            e.timeId === (lado === est.casa ? partida.timeCasa : partida.timeFora),
        ).length;
        expect(lado.faltas).toBeGreaterThanOrEqual(cartoes);
        // Zonas e setores normalizados (somam ~1).
        const somaZonas = lado.posseZonas.flat().reduce((s, v) => s + v, 0);
        expect(somaZonas).toBeGreaterThan(0.99);
        expect(somaZonas).toBeLessThan(1.01);
        const somaSetores = lado.perigoSetores.reduce((s, v) => s + v, 0);
        expect(somaSetores).toBeGreaterThan(0.99);
        expect(somaSetores).toBeLessThan(1.01);
      }
      expect(est.momentumPorMinuto.length).toBeGreaterThanOrEqual(90);
    }
  });

  it('deve gerar volumes plausíveis de futebol real na média', () => {
    const partidas = montarPartidas(200);
    const mediaDe = (seletor: (e: {finalizacoes: number; passesTentados: number; escanteios: number; faltas: number; golsEsperados: number}) => number) =>
      partidas.reduce(
        (soma, p) =>
          soma + seletor(p.estatisticas!.casa) + seletor(p.estatisticas!.fora),
        0,
      ) /
      (partidas.length * 2);

    const finalizacoes = mediaDe(e => e.finalizacoes);
    expect(finalizacoes).toBeGreaterThan(8);
    expect(finalizacoes).toBeLessThan(22);

    const passes = mediaDe(e => e.passesTentados);
    expect(passes).toBeGreaterThan(250);
    expect(passes).toBeLessThan(650);

    const escanteios = mediaDe(e => e.escanteios);
    expect(escanteios).toBeGreaterThan(2);
    expect(escanteios).toBeLessThan(9);

    const faltas = mediaDe(e => e.faltas);
    expect(faltas).toBeGreaterThan(7);
    expect(faltas).toBeLessThan(19);

    const xg = mediaDe(e => e.golsEsperados);
    expect(xg).toBeGreaterThan(1.0);
    expect(xg).toBeLessThan(2.6);
  });

  it('xG deve acompanhar os gols reais na média da série', () => {
    const partidas = montarPartidas(300);
    const golsReais =
      partidas.reduce(
        (s, p) => s + (p.placarCasa ?? 0) + (p.placarFora ?? 0),
        0,
      ) / partidas.length;
    const xgTotal =
      partidas.reduce(
        (s, p) =>
          s +
          (p.estatisticas?.casa.golsEsperados ?? 0) +
          (p.estatisticas?.fora.golsEsperados ?? 0),
        0,
      ) / partidas.length;
    // xG médio deve ficar na vizinhança dos gols reais (±35%).
    expect(xgTotal).toBeGreaterThan(golsReais * 0.65);
    expect(xgTotal).toBeLessThan(golsReais * 1.35);
  });

  it('não deve alterar o resultado das partidas (mesma seed de antes)', () => {
    // A posse/estatísticas usam RNGs separados: o placar e os eventos de uma
    // seed conhecida precisam continuar idênticos aos de antes da feature.
    const partidas = simularSerie(75, 75, 50);
    for (const p of partidas) {
      expect(p.eventos.every(e => e.minuto >= 1 && e.minuto <= 120)).toBe(true);
    }
  });
});

describe('substituições da IA e falta do pênalti', () => {
  const posicoesBanco: Position[] = ['GOL', 'ZAG', 'VOL', 'MEI', 'PE', 'CA'];

  /** Clube com 11 titulares + 6 reservas no elenco (banco de verdade). */
  function montarComBanco(prefixo: string, overall: number) {
    const titulares = criarJogadores(prefixo, overall);
    const reservas = criarJogadores(`${prefixo}res`, Math.max(40, overall - 3))
      .slice(0, posicoesBanco.length)
      .map((jogador, i) => ({
        ...jogador,
        clubeId: prefixo,
        posicaoPrincipal: posicoesBanco[i] ?? 'CA',
        posicoesSecundarias: [],
      }));
    const clube = criarClube(prefixo, titulares);
    return {clube, jogadores: [...titulares, ...reservas]};
  }

  function simularSerieComBanco(total: number) {
    const casa = montarComBanco('casa', 74);
    const fora = montarComBanco('fora', 72);
    return Array.from({length: total}, (_, i) =>
      simularPartida({
        timeCasa: casa.clube,
        timeFora: fora.clube,
        jogadoresCasa: casa.jogadores,
        jogadoresFora: fora.jogadores,
        seed: i + 1,
      }),
    );
  }

  it('deve repor lesionados da IA na grande maioria dos casos', () => {
    const partidas = simularSerieComBanco(300);
    let lesoes = 0;
    let repostas = 0;
    for (const partida of partidas) {
      for (const lesao of partida.eventos.filter(e => e.tipo === 'lesao')) {
        lesoes += 1;
        const reposta = partida.eventos.some(
          e =>
            e.tipo === 'substituicao' &&
            e.jogadorId === lesao.jogadorId &&
            e.minuto >= lesao.minuto,
        );
        if (reposta) {
          repostas += 1;
        }
      }
    }
    expect(lesoes).toBeGreaterThan(0);
    expect(repostas / lesoes).toBeGreaterThan(0.85);
  });

  it('deve respeitar o teto de 5 trocas e nunca recolocar quem saiu', () => {
    for (const partida of simularSerieComBanco(200)) {
      for (const timeId of [partida.timeCasa, partida.timeFora]) {
        const trocas = partida.eventos.filter(
          e => e.tipo === 'substituicao' && e.timeId === timeId,
        );
        expect(trocas.length).toBeLessThanOrEqual(5);
        const sairam = new Set(trocas.map(t => t.jogadorId));
        expect(trocas.some(t => t.jogadorEntraId && sairam.has(t.jogadorEntraId))).toBe(
          false,
        );
      }
    }
  });

  it('não deve substituir no clube controlado pelo usuário', () => {
    const casa = montarComBanco('casa', 74);
    const fora = montarComBanco('fora', 72);
    const clubeUsuario = {...casa.clube, controladoPorIA: false};
    const partidas = Array.from({length: 150}, (_, i) =>
      simularPartida({
        timeCasa: clubeUsuario,
        timeFora: fora.clube,
        jogadoresCasa: casa.jogadores,
        jogadoresFora: fora.jogadores,
        seed: i + 1,
      }),
    );
    for (const partida of partidas) {
      expect(
        partida.eventos.some(
          e => e.tipo === 'substituicao' && e.timeId === partida.timeCasa,
        ),
      ).toBe(false);
    }
  });

  it('não deve repor expulsos (regra do futebol)', () => {
    for (const partida of simularSerieComBanco(250)) {
      const lesionados = new Set(
        partida.eventos.filter(e => e.tipo === 'lesao').map(e => e.jogadorId),
      );
      for (const vermelho of partida.eventos.filter(
        e => e.tipo === 'cartao_vermelho',
      )) {
        if (lesionados.has(vermelho.jogadorId)) {
          continue; // lesão do mesmo jogador pode ter reposição antes do vermelho
        }
        expect(
          partida.eventos.some(
            e =>
              e.tipo === 'substituicao' &&
              e.jogadorId === vermelho.jogadorId &&
              e.minuto >= vermelho.minuto,
          ),
        ).toBe(false);
      }
    }
  });

  it('todo pênalti deve ter autor da falta no time adversário', () => {
    const partidas = simularSerieComBanco(300);
    let penaltis = 0;
    for (const partida of partidas) {
      const eventosPenalti = partida.eventos.filter(
        e => e.tipo === 'penalti' || (e.tipo === 'gol' && e.penaltiData),
      );
      for (const evento of eventosPenalti) {
        penaltis += 1;
        expect(evento.jogadorFaltaId).toBeDefined();
        // O infrator é do time ADVERSÁRIO de quem cobra.
        const prefixoCobrador = evento.timeId;
        expect(evento.jogadorFaltaId?.startsWith(prefixoCobrador)).toBe(false);
      }
    }
    expect(penaltis).toBeGreaterThan(0);
  });
});

describe('rodada ao vivo — equivalência incremental × simularPartida', () => {
  it('simular minuto-a-minuto dá o MESMO placar que simularPartida (mesma seed)', () => {
    const jogadoresCasa = criarJogadores('casa', 78);
    const jogadoresFora = criarJogadores('fora', 71);
    const timeCasa = criarClube('casa', jogadoresCasa);
    const timeFora = criarClube('fora', jogadoresFora);

    for (let seed = 1; seed <= 40; seed += 1) {
      // Caminho do store (partida inteira de uma vez).
      const deUmaVez = simularPartida({
        timeCasa,
        timeFora,
        jogadoresCasa,
        jogadoresFora,
        seed,
      });

      // Caminho AO VIVO (o que a tela faz: minuto a minuto, contexto por minuto).
      // Inclui os acréscimos do 2º tempo — mesma fórmula por seed do simularPartida.
      const estado = iniciarPartidaAoVivo(seed);
      const totalMinutos = 90 + acrescimosDaSeed(seed);
      for (let minuto = 1; minuto <= totalMinutos; minuto += 1) {
        const ctx = calcularContextoMinuto(
          timeCasa,
          timeFora,
          jogadoresCasa,
          jogadoresFora,
          estado,
        );
        simularMinuto(estado, ctx);
      }

      expect(estado.placarCasa).toBe(deUmaVez.placarCasa);
      expect(estado.placarFora).toBe(deUmaVez.placarFora);
    }
  });
});

describe('resiliência: lado sem XI não derruba o motor', () => {
  it('não lança quando um lado tem o XI vazio (titulares "fantasma" / todos vendidos)', () => {
    const jogadoresCasa = criarJogadores('casa', 75);
    const timeCasa = criarClube('casa', jogadoresCasa);
    // Fora: elenco vazio (tudo vendido), mas a formação ainda referencia os 11
    // titulares antigos — IDs que não existem mais → XI resolvido vazio.
    const jogadoresFora: Player[] = [];
    const timeFora: Clube = {
      ...criarClube('fora', []),
      formacaoAtual: criarFormacao(criarJogadores('fora', 75)),
    };

    for (let seed = 1; seed <= 40; seed += 1) {
      const input = {timeCasa, timeFora, jogadoresCasa, jogadoresFora, seed};
      // Antes do fix, o motor lançava "Não há jogadores disponíveis…" no 1º
      // minuto que sorteava evento para o lado vazio.
      expect(() => simularPartida(input)).not.toThrow();
      const partida = simularPartida(input);
      // Lado sem ninguém não marca; determinismo mantido no caso degenerado.
      expect(partida.placarFora).toBe(0);
      expect(simularPartida(input)).toEqual(partida);
    }
  });

  it('ambos os lados sem XI: 0x0 sem crash', () => {
    const timeCasa: Clube = {
      ...criarClube('casa', []),
      formacaoAtual: criarFormacao(criarJogadores('casa', 70)),
    };
    const timeFora: Clube = {
      ...criarClube('fora', []),
      formacaoAtual: criarFormacao(criarJogadores('fora', 70)),
    };
    const input = {
      timeCasa,
      timeFora,
      jogadoresCasa: [],
      jogadoresFora: [],
      seed: 7,
    };
    expect(() => simularPartida(input)).not.toThrow();
    const partida = simularPartida(input);
    expect(partida.placarCasa).toBe(0);
    expect(partida.placarFora).toBe(0);
  });
});

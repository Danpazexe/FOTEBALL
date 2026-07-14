import type {Clube, Formacao, Player, Position, Tatica} from '../../../types';

import {simularPartida} from '../matchSimulator';

/**
 * LABORATÓRIO DE BALANCEAMENTO (ROADMAP Fase 3 / TESTES_BALANCEAMENTO §7-8).
 *
 * Mede a engine em massa e agrega as 9 métricas de balanceamento num único
 * lugar (calcularMetricasBalanceamento), para servir de rede de segurança contra
 * regressões de balanceamento e de base para o ajuste de probabilidade (Fase 4).
 *
 * BALANCEAMENTO (FASE 4): a engine foi calibrada para a faixa-alvo do doc —
 * ~2.4–3.1 gols/partida entre parelhos (antes ~3.6, gols demais). Estes testes
 * agora travam a FAIXA-ALVO como contrato de balanceamento. Exceção documentada:
 * goleadas (3+ de saldo) ficam em ~12%, acima do alvo <10% — puxar mais empurraria
 * os gols para fora da faixa; mantido no nível realista de futebol.
 *
 * Determinístico: cada partida usa uma seed sequencial, então a suíte reproduz.
 */

type Partida = ReturnType<typeof simularPartida>;

interface BalanceMetrics {
  jogos: number;
  mediaGols: number;
  taxaEmpate: number;
  taxaVitoriaCasa: number;
  taxaVitoriaFora: number;
  taxaGoleada: number; // diferença de 3+ gols
  mediaCartoes: number;
  taxaPenalti: number;
  taxaLesao: number;
}

const POSICOES: Position[] = [
  'GOL', 'LD', 'ZAG', 'ZAG', 'LE', 'VOL', 'MC', 'MEI', 'PD', 'CA', 'PE',
];

const TATICA_NEUTRA: Tatica = {
  estiloOfensivo: 'Equilibrado',
  marcacao: 'Zona',
  linhaDefensiva: 'Normal',
  ritmo: 'Normal',
};

function criarJogadores(prefixo: string, overall: number): Player[] {
  return POSICOES.map((posicao, index) => ({
    id: `${prefixo}_${index}`,
    nome: `${prefixo} ${index}`,
    idade: 26,
    nacionalidade: 'Brazil',
    posicaoPrincipal: posicao,
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {
      finalizacao: overall, passe: overall, marcacao: overall, desarme: overall,
      velocidade: overall, resistencia: overall, forca: overall, reflexos: overall,
      posicionamento: overall, drible: overall, cabeceio: overall, cruzamento: overall,
    },
    overall,
    potencial: overall,
    condicaoFisica: 100,
    moral: 65,
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
      temporada: '2026', jogos: 0, gols: 0, assistencias: 0,
      cartoesAmarelos: 0, cartoesVermelhos: 0, notaMedia: 0,
    },
    historicoTemporadas: [],
  }));
}

/** Grupo de linha de uma posição (p/ perfis com linhas divergentes). */
function grupoLinha(pos: Position): 'GOL' | 'DEF' | 'MEI' | 'ATA' {
  if (pos === 'GOL') return 'GOL';
  if (pos === 'LD' || pos === 'ZAG' || pos === 'LE') return 'DEF';
  if (pos === 'VOL' || pos === 'MC' || pos === 'MEI') return 'MEI';
  return 'ATA';
}

/**
 * Elenco com overall POR LINHA (goleiro/defesa/meio/ataque) — permite montar
 * times de linhas DIVERGENTES (ex.: meio forte + ataque fraco) mantendo o mesmo
 * overall médio. É o que reproduz o caso real (Santos×Grêmio) em que a auditoria
 * achou a posse desacoplada do resultado.
 */
function criarJogadoresPerfil(
  prefixo: string,
  perfil: {GOL: number; DEF: number; MEI: number; ATA: number},
): Player[] {
  return POSICOES.map((posicao, index) => {
    const ov = perfil[grupoLinha(posicao)];
    return {
      ...criarJogadores(prefixo, ov)[index],
      id: `${prefixo}_${index}`,
      posicaoPrincipal: posicao,
    };
  });
}

function criarClube(id: string, jogadores: Player[], tatica: Tatica): Clube {
  const formacao: Formacao = {
    tipo: '4-3-3',
    titulares: jogadores.map((jogador, index) => ({
      jogadorId: jogador.id,
      posicao: POSICOES[index] ?? jogador.posicaoPrincipal,
    })),
    reservas: [],
  };
  return {
    id, nome: id, sigla: id.slice(0, 3).toUpperCase(), cidade: '', estado: '',
    fundacao: null,
    elenco: jogadores.map(jogador => jogador.id),
    formacaoAtual: formacao,
    taticaAtual: tatica,
    financas: {
      saldo: 5000000,
      receitaMensal: {bilheteria: 0, patrocinio: 0, premiacoes: 0, vendaJogadores: 0},
      despesaMensal: {salarios: 0, manutencaoEstadio: 0, comissoes: 0, contratacoes: 0},
      patrocinadores: [], historicoTransacoes: [],
    },
    estadio: {nome: `Estádio ${id}`, capacidade: 30000, precoMedioIngresso: 40, nivelInfraestrutura: 3},
    reputacao: 50,
    controladoPorIA: true,
  };
}

function simularSerie(
  overallCasa: number,
  overallFora: number,
  taticaCasa: Tatica = TATICA_NEUTRA,
  taticaFora: Tatica = TATICA_NEUTRA,
  total = 400,
): Partida[] {
  const jogadoresCasa = criarJogadores('casa', overallCasa);
  const jogadoresFora = criarJogadores('fora', overallFora);
  const timeCasa = criarClube('casa', jogadoresCasa, taticaCasa);
  const timeFora = criarClube('fora', jogadoresFora, taticaFora);
  return Array.from({length: total}, (_, index) =>
    simularPartida({
      timeCasa, timeFora, jogadoresCasa, jogadoresFora, seed: index + 1,
    }),
  );
}

function calcularMetricasBalanceamento(partidas: Partida[]): BalanceMetrics {
  const jogos = partidas.length;
  let gols = 0;
  let empates = 0;
  let vitoriasCasa = 0;
  let vitoriasFora = 0;
  let goleadas = 0;
  let cartoes = 0;
  let comPenalti = 0;
  let comLesao = 0;

  for (const partida of partidas) {
    const pc = partida.placarCasa ?? 0;
    const pf = partida.placarFora ?? 0;
    gols += pc + pf;
    if (pc === pf) {
      empates += 1;
    } else if (pc > pf) {
      vitoriasCasa += 1;
    } else {
      vitoriasFora += 1;
    }
    if (Math.abs(pc - pf) >= 3) {
      goleadas += 1;
    }
    let temPenalti = false;
    let temLesao = false;
    for (const evento of partida.eventos) {
      if (evento.tipo === 'cartao_amarelo' || evento.tipo === 'cartao_vermelho') {
        cartoes += 1;
      } else if (evento.tipo === 'penalti') {
        temPenalti = true;
      } else if (evento.tipo === 'lesao') {
        temLesao = true;
      }
    }
    if (temPenalti) {
      comPenalti += 1;
    }
    if (temLesao) {
      comLesao += 1;
    }
  }

  return {
    jogos,
    mediaGols: gols / jogos,
    taxaEmpate: empates / jogos,
    taxaVitoriaCasa: vitoriasCasa / jogos,
    taxaVitoriaFora: vitoriasFora / jogos,
    taxaGoleada: goleadas / jogos,
    mediaCartoes: cartoes / jogos,
    taxaPenalti: comPenalti / jogos,
    taxaLesao: comLesao / jogos,
  };
}

function taxaVitoriaMandante(partidas: Partida[]): number {
  const vitorias = partidas.filter(
    partida => (partida.placarCasa ?? 0) > (partida.placarFora ?? 0),
  ).length;
  return vitorias / partidas.length;
}

/**
 * Entre jogos DECIDIDOS (sem empate) e com posse != 50, fração em que o time com
 * MAIS posse venceu. Trava a correção do laço placar×relógio: a posse não pode
 * voltar a ser um marcador de quem está PERDENDO (o bug tinha ~16% aqui, ou seja,
 * o dono da posse perdia ~84% dos jogos entre parelhos). Ver disputarPosseMinuto.
 */
function taxaMaisPosseVence(partidas: Partida[]): number {
  let venceu = 0;
  let decididos = 0;
  for (const p of partidas) {
    const pc = p.placarCasa ?? 0;
    const pf = p.placarFora ?? 0;
    const posseCasa = p.posseCasa ?? 50;
    if (pc === pf || posseCasa === 50) {
      continue;
    }
    decididos += 1;
    const casaMaisPosse = posseCasa > 50;
    const casaVenceu = pc > pf;
    if (casaMaisPosse === casaVenceu) {
      venceu += 1;
    }
  }
  return decididos > 0 ? venceu / decididos : 0;
}

describe('laboratório de balanceamento — times parelhos', () => {
  const metricas = calcularMetricasBalanceamento(simularSerie(75, 75));

  it('imprime as métricas de balanceamento agregadas', () => {
    // Relatório visível ao rodar sem --silent; base para o ajuste da Fase 4.
    console.log('[balanceamento parelho 75x75]', JSON.stringify(metricas));
    expect(metricas.jogos).toBe(400);
  });

  it('média de gols fica na faixa-alvo do doc (2.4 a 3.1)', () => {
    expect(metricas.mediaGols).toBeGreaterThan(2.4);
    expect(metricas.mediaGols).toBeLessThan(3.1);
  });

  it('empates ficam na faixa-alvo (22–30%)', () => {
    expect(metricas.taxaEmpate).toBeGreaterThan(0.2);
    expect(metricas.taxaEmpate).toBeLessThan(0.32);
  });

  it('mandante leva leve vantagem, sem dominar', () => {
    expect(metricas.taxaVitoriaCasa).toBeGreaterThan(0.4);
    expect(metricas.taxaVitoriaCasa).toBeLessThan(0.56);
    expect(metricas.taxaVitoriaFora).toBeGreaterThan(0.22);
    expect(metricas.taxaVitoriaFora).toBeLessThan(0.4);
  });

  it('goleadas são a exceção (~12%, nível realista; alvo do doc <10%)', () => {
    // Saldo de 3+ gols. A engine fica em ~12% (futebol real ~12–15%); baixar
    // para <10% exigiria puxar os gols abaixo da faixa-alvo, então mantemos aqui.
    expect(metricas.taxaGoleada).toBeGreaterThan(0.05);
    expect(metricas.taxaGoleada).toBeLessThan(0.16);
  });

  it('cartões, pênaltis e lesões ocorrem em taxas plausíveis', () => {
    expect(metricas.mediaCartoes).toBeGreaterThan(0);
    expect(metricas.taxaPenalti).toBeGreaterThan(0);
    expect(metricas.taxaPenalti).toBeLessThan(0.6);
    expect(metricas.taxaLesao).toBeGreaterThanOrEqual(0);
    expect(metricas.taxaLesao).toBeLessThan(0.5);
  });

  it('posse acompanha quem ataca — dono da posse NÃO é o time que perde', () => {
    // Regressão do laço placar×relógio: antes o time com mais posse vencia só
    // ~16% dos jogos decididos (perdia ~84%). Agora a posse é ganha por quem
    // CRIA/MARCA, então dominar a bola ajuda (sem virar garantia). Piso 50%.
    const taxa = taxaMaisPosseVence(simularSerie(75, 75, undefined, undefined, 600));
    console.log('[posse × resultado 75x75] maisPosseVence =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.5);
  });
});

describe('laboratório de balanceamento — diferença de qualidade', () => {
  it('vantagem de +10 de overall: forte vence mais, mas zebra continua possível', () => {
    const taxa = taxaVitoriaMandante(simularSerie(80, 70, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    console.log('[+10 overall] vitóriaMandante forte =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.5);
    expect(taxa).toBeLessThan(0.9); // < 1.0: zebra ainda acontece
  });

  it('vantagem de +20 de overall: domínio claro do time forte', () => {
    const taxa = taxaVitoriaMandante(simularSerie(80, 60, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    console.log('[+20 overall] vitóriaMandante forte =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.65);
    expect(taxa).toBeLessThan(1.0); // massacre não é garantido: zebra possível
  });

  it('gradiente: +20 vence mais que +10 (qualidade pesa de forma monotônica)', () => {
    const forte10 = taxaVitoriaMandante(simularSerie(80, 70, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    const forte20 = taxaVitoriaMandante(simularSerie(80, 60, TATICA_NEUTRA, TATICA_NEUTRA, 300));
    expect(forte20).toBeGreaterThan(forte10);
  });
});

describe('laboratório de balanceamento — impacto da tática', () => {
  const ATAQUE_DIRETO: Tatica = {
    estiloOfensivo: 'Ataque direto', marcacao: 'Pressão alta',
    linhaDefensiva: 'Adiantada', ritmo: 'Intenso',
  };
  const RETRANCA: Tatica = {
    estiloOfensivo: 'Contra-ataque', marcacao: 'Zona',
    linhaDefensiva: 'Recuada', ritmo: 'Lento',
  };

  it('a tática altera o resultado agregado sem virar botão mágico', () => {
    const golsNeutro = calcularMetricasBalanceamento(
      simularSerie(75, 75, TATICA_NEUTRA, TATICA_NEUTRA, 300),
    ).mediaGols;
    const golsAgressivo = calcularMetricasBalanceamento(
      simularSerie(75, 75, ATAQUE_DIRETO, ATAQUE_DIRETO, 300),
    ).mediaGols;
    console.log('[tática] gols neutro =', golsNeutro.toFixed(2), ' agressivo x agressivo =', golsAgressivo.toFixed(2));
    // Duas táticas agressivas dos dois lados não podem produzir MENOS gols que o
    // jogo neutro — mas o efeito é de tendência, não determinístico.
    expect(golsAgressivo).toBeGreaterThan(golsNeutro * 0.8);
  });

  it('mando de campo (mandante forte vs retranca visitante) mantém vantagem do mandante', () => {
    const taxa = taxaVitoriaMandante(
      simularSerie(75, 75, TATICA_NEUTRA, RETRANCA, 300),
    );
    console.log('[mando vs retranca] vitóriaMandante =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.35);
  });
});

// Cenário que faltava e deixou "fraco ganhando de time bom" passar: a diferença
// de QUALIDADE precisa pesar. Gaps escolhidos pela faixa real da Série A (69–80,
// gap máx ~11). A zebra continua POSSÍVEL, só não pode ser frequente.
describe('laboratório — qualidade pesa (forte x fraco)', () => {
  it('gap 11, forte em casa: domínio claro (vence ~70%, zebra rara)', () => {
    const m = calcularMetricasBalanceamento(simularSerie(80, 69));
    console.log(
      `[80x69] casa=${m.taxaVitoriaCasa.toFixed(3)} fora=${m.taxaVitoriaFora.toFixed(3)}`,
    );
    expect(m.taxaVitoriaCasa).toBeGreaterThan(0.62); // forte manda em casa
    expect(m.taxaVitoriaFora).toBeLessThan(0.16); // zebra do visitante fraco é rara
  });

  it('gap 11, forte VISITANTE: ainda vence a maioria (mando não salva o fraco)', () => {
    const m = calcularMetricasBalanceamento(simularSerie(69, 80));
    console.log(
      `[69x80] casa(zebra)=${m.taxaVitoriaCasa.toFixed(3)} fora(forte)=${m.taxaVitoriaFora.toFixed(3)}`,
    );
    expect(m.taxaVitoriaFora).toBeGreaterThan(0.5); // forte fora vence a maioria
    expect(m.taxaVitoriaCasa).toBeLessThan(0.24); // fraco em casa surpreende pouco
  });

  it('gap 6: vantagem existe, mas o jogo segue competitivo', () => {
    const m = calcularMetricasBalanceamento(simularSerie(78, 72));
    expect(m.taxaVitoriaCasa).toBeGreaterThan(0.5); // leve favorito
    expect(m.taxaVitoriaFora).toBeGreaterThan(0.1); // zebra bem viva num gap curto
  });

  it('75x75 segue no balanço-alvo (a mudança de qualidade não mexe em parelho)', () => {
    const m = calcularMetricasBalanceamento(simularSerie(75, 75));
    expect(m.taxaVitoriaCasa).toBeGreaterThan(0.4);
    expect(m.taxaVitoriaCasa).toBeLessThan(0.56);
    expect(m.mediaGols).toBeGreaterThan(2.4);
    expect(m.mediaGols).toBeLessThan(3.1);
  });
});

// ── Coerência domínio × estatísticas (posse/chutes/momento vs resultado) ─────
// Cenário de LINHAS DIVERGENTES que o teste parelho não pega: o time com meio
// melhor mas ataque pior dominava a bola e PERDIA, e a barra de posse / o gráfico
// de momento apontavam o time errado (auditoria 2026-07). A posse agora reflete o
// domínio OFENSIVO (ataque×defesa), não só o meio.
function simularAssimetrico(
  perfilCasa: {GOL: number; DEF: number; MEI: number; ATA: number},
  perfilFora: {GOL: number; DEF: number; MEI: number; ATA: number},
  total = 400,
): Partida[] {
  const jc = criarJogadoresPerfil('casa', perfilCasa);
  const jf = criarJogadoresPerfil('fora', perfilFora);
  const tc = criarClube('casa', jc, TATICA_NEUTRA);
  const tf = criarClube('fora', jf, TATICA_NEUTRA);
  return Array.from({length: total}, (_, i) =>
    simularPartida({timeCasa: tc, timeFora: tf, jogadoresCasa: jc, jogadoresFora: jf, seed: i + 1}),
  );
}

/** Fração dos DECIDIDOS em que o dono da posse finalizou MENOS que o rival. */
function taxaDonoPosseChutouMenos(partidas: Partida[]): number {
  let n = 0, dec = 0;
  for (const p of partidas) {
    const pc = p.placarCasa ?? 0, pf = p.placarFora ?? 0;
    const posC = p.posseCasa ?? 50;
    if (pc === pf || posC === 50) continue;
    const finC = p.estatisticas?.casa.finalizacoes ?? 0;
    const finF = p.estatisticas?.fora.finalizacoes ?? 0;
    if (finC === finF) continue;
    dec++;
    if ((posC > 50) !== (finC > finF)) n++;
  }
  return dec > 0 ? n / dec : 0;
}

/** Fração dos DECIDIDOS em que o SINAL médio do momento aponta o vencedor. */
function taxaMomentoAcertaVencedor(partidas: Partida[]): number {
  let ok = 0, dec = 0;
  for (const p of partidas) {
    const pc = p.placarCasa ?? 0, pf = p.placarFora ?? 0;
    if (pc === pf) continue;
    const mom = p.estatisticas?.momentumPorMinuto ?? [];
    if (mom.length === 0) continue;
    dec++;
    const media = mom.reduce((s, v) => s + v, 0) / mom.length;
    if ((media > 0) === (pc > pf)) ok++;
  }
  return dec > 0 ? ok / dec : 0;
}

describe('laboratório — coerência domínio × estatísticas (posse/chutes/momento)', () => {
  // Proxy Santos×Grêmio: casa com ATAQUE melhor, fora com MEIO melhor, overall ~igual.
  const PERFIL_CASA_ATA = {GOL: 77, DEF: 76, MEI: 75, ATA: 79};
  const PERFIL_FORA_MEIO = {GOL: 74, DEF: 75, MEI: 80, ATA: 74};

  it('linhas divergentes: dono da posse NÃO é o que perde (era ~0.40, o bug real)', () => {
    const partidas = simularAssimetrico(PERFIL_CASA_ATA, PERFIL_FORA_MEIO, 400);
    const taxa = taxaMaisPosseVence(partidas);
    console.log('[assimétrico ata+ x meio+] donoPosseVence =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.5);
  });

  it('chutes acompanham a posse: dono da posse raramente finaliza menos', () => {
    const partidas = simularAssimetrico(PERFIL_CASA_ATA, PERFIL_FORA_MEIO, 400);
    const taxa = taxaDonoPosseChutouMenos(partidas);
    console.log('[assimétrico] donoPosseChutouMenos =', taxa.toFixed(3));
    // Antes ~0.70 (posse e chutes em eixos opostos). Agora deve cair bem.
    expect(taxa).toBeLessThan(0.4);
  });

  it('gráfico de momento aponta o vencedor na maioria dos jogos', () => {
    const partidas = simularAssimetrico(PERFIL_CASA_ATA, PERFIL_FORA_MEIO, 400);
    const taxa = taxaMomentoAcertaVencedor(partidas);
    console.log('[assimétrico] momentoAcertaVencedor =', taxa.toFixed(3));
    expect(taxa).toBeGreaterThan(0.6);
  });
});

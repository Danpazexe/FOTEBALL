/**
 * WorldStateView (Onda 0): a árvore do dono é DERIVADA e referencia as fontes
 * únicas — mesma referência dos objetos reais, nada de cópia; campos ao vivo
 * só aparecem com `aoVivo`; e a view não quebra com carreira mínima.
 */
import {criarClube, criarPartida, criarPlayer} from '../../../testing/fixtures';
import {criarEstadoPatrocinioVazio} from '../../../types/patrocinio';
import type {EstatisticasTimePartida} from '../../../types';
import {criarRNGComSeed} from '../../../engine/simulation/rng';
import {criarEstatisticasAoVivo} from '../../../engine/simulation/matchStats';
import {criarEstadoMomento} from '../../../engine/simulation/causal/momentumEngine';
import type {EstadoPartidaAoVivo} from '../../../engine/simulation/matchSimulator';
import {montarWorldView, type WorldViewSource} from '../worldView';

function estatisticasTimeZeradas(): EstatisticasTimePartida {
  return {
    golsEsperados: 0,
    assistenciasEsperadas: 0,
    finalizacoes: 0,
    finalizacoesNoAlvo: 0,
    finalizacoesNaArea: 0,
    finalizacoesDeFora: 0,
    grandesChances: 0,
    passesTentados: 0,
    passesCertos: 0,
    dribles: 0,
    desarmes: 0,
    interceptacoes: 0,
    cruzamentos: 0,
    escanteios: 0,
    faltas: 0,
    impedimentos: 0,
    posseZonas: [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    perigoSetores: [0, 0, 0],
    finalizacoesPorJogador: {},
    passesPorJogador: {},
  };
}

const CONFIG_FIXTURE: WorldViewSource['config'] = {
  velocidadeNarracao: 'normal',
  confirmarAcoes: true,
  pausarNoIntervalo: true,
  som: true,
  volumeEfeitos: 1,
  musicaHabilitada: true,
  volumeMusica: 0.25,
  musicaSelecionada: 1,
  dificuldade: 'Normal',
};

/** Carreira pequena mas completa: 2 clubes, 2 jogadores + 1 agente livre. */
function fonteFixture() {
  const j1 = criarPlayer({id: 'j1', clubeId: 'fla', posicaoPrincipal: 'MEI'});
  const j2 = criarPlayer({id: 'j2', clubeId: 'cru', posicaoPrincipal: 'ZAG'});
  const livre = criarPlayer({id: 'j3', clubeId: null});
  const fla = criarClube({
    id: 'fla',
    controladoPorIA: false,
    elenco: ['j1'],
    formacaoAtual: {
      tipo: '4-4-2',
      titulares: [{posicao: 'MEI', jogadorId: 'j1'}],
      reservas: [],
    },
    taticaAtual: {
      estiloOfensivo: 'Equilibrado',
      marcacao: 'Zona',
      linhaDefensiva: 'Normal',
      ritmo: 'Normal',
    },
  });
  const cru = criarClube({id: 'cru', elenco: ['j2']});
  const partida = criarPartida({
    id: 'p1',
    timeCasa: 'fla',
    timeFora: 'cru',
    estatisticas: {
      casa: estatisticasTimeZeradas(),
      fora: estatisticasTimeZeradas(),
      clima: 'Chuvoso',
      temperatura: 22,
      publico: 30000,
      momentumPorMinuto: [],
    },
  });
  const fonte: WorldViewSource = {
    clubes: [fla, cru],
    jogadores: [j1, j2, livre],
    todosClubes: [fla, cru],
    todosJogadores: [j1, j2, livre],
    partidas: [partida],
    ultimaPartidaUsuario: partida,
    tabela: [
      {
        clubeId: 'fla',
        pontos: 3,
        jogos: 1,
        vitorias: 1,
        empates: 0,
        derrotas: 0,
        golsPro: 2,
        golsContra: 0,
        saldoGols: 2,
      },
    ],
    copa: null,
    serieDCarreira: null,
    historicoSerieD: [],
    clubeUsuarioId: 'fla',
    temporadaAtual: '2026',
    rodadaAtual: 2,
    dataAtual: '2026-04-05',
    estadoFinanceiro: 'SAUDAVEL',
    rodadasNoVermelho: 0,
    patrocinio: criarEstadoPatrocinioVazio(),
    transferHistory: [],
    propostasRecebidas: [],
    reputacaoTecnico: 55,
    demissao: null,
    derrotasConsecutivas: 0,
    config: CONFIG_FIXTURE,
  };
  return {fonte, fla, cru, j1, j2, partida};
}

function criarAoVivoFixture(): EstadoPartidaAoVivo {
  return {
    rng: criarRNGComSeed(42),
    rngPosse: criarRNGComSeed(43),
    placarCasa: 1,
    placarFora: 0,
    eventos: [],
    amarelosPartida: new Map(),
    indisponiveis: new Set(),
    condicaoAtual: new Map(),
    posseAcumuladaCasa: 10,
    rngEstatisticas: criarRNGComSeed(44),
    estatisticas: criarEstatisticasAoVivo(criarRNGComSeed(44)),
    rngSubs: criarRNGComSeed(45),
    formacoesAoVivo: new Map(),
    expulsos: new Set(),
    lesionadosPendentes: [],
    subsIA: new Map(),
    sairamNaPartida: new Set(),
    cartadaOfensiva: new Set(),
    minuto: 30,
    chutes: [],
    contadorChutes: 0,
    momento: criarEstadoMomento(),
  };
}

describe('montarWorldView — fontes únicas por referência', () => {
  it('teams/players referenciam os MESMOS objetos do estado real (sem cópia)', () => {
    const {fonte, fla, j1} = fonteFixture();
    const view = montarWorldView(fonte);

    expect(view.teams.fla.clube).toBe(fla);
    expect(view.teams.fla.players).toHaveLength(1);
    expect(view.teams.fla.players[0].player).toBe(j1);
    // Facetas apontam para os sub-objetos REAIS do jogador.
    expect(view.teams.fla.players[0].technical).toBe(j1.atributos);
    expect(view.teams.fla.players[0].statistics).toBe(j1.estatisticasTemporada);
    // Tática referencia a formação/tática reais do clube.
    expect(view.teams.fla.tactical.formacao).toBe(fla.formacaoAtual);
    expect(view.teams.fla.tactical.tatica).toBe(fla.taticaAtual);
    // Estádio/finanças do usuário são os objetos do próprio clube.
    expect(view.stadium).toBe(fla.estadio);
    expect(view.finance.financasClubeUsuario).toBe(fla.financas);
  });

  it('arrays de topo passam por referência (nunca clonados)', () => {
    const {fonte} = fonteFixture();
    const view = montarWorldView(fonte);

    expect(view.match.partidas).toBe(fonte.partidas);
    expect(view.competition.tabela).toBe(fonte.tabela);
    expect(view.transfer.historico).toBe(fonte.transferHistory);
    expect(view.transfer.propostasRecebidas).toBe(fonte.propostasRecebidas);
    expect(view.audio.preferencias).toBe(fonte.config);
    expect(view.finance.patrocinio).toBe(fonte.patrocinio);
  });

  it('agente livre fica fora da árvore de times (posse RN-01)', () => {
    const {fonte} = fonteFixture();
    const view = montarWorldView(fonte);
    const totalNosTimes = Object.values(view.teams).reduce(
      (soma, time) => soma + time.players.length,
      0,
    );
    expect(totalNosTimes).toBe(2); // j3 (livre) não aparece.
  });

  it('coach só existe no clube do usuário; IA lista os controlados', () => {
    const {fonte} = fonteFixture();
    const view = montarWorldView(fonte);
    expect(view.teams.fla.coach?.reputacao).toBe(55);
    expect(view.teams.cru.coach).toBeUndefined();
    expect(view.ai.clubesControlados.map(clube => clube.id)).toEqual(['cru']);
  });

  it('weather/crowd derivam da última partida do usuário (domínios PARCIAIS)', () => {
    const {fonte} = fonteFixture();
    const view = montarWorldView(fonte);
    expect(view.weather).toEqual({clima: 'Chuvoso', temperatura: 22});
    expect(view.crowd.publicoUltimaPartida).toBe(30000);
  });

  it('domínios AUSENTES no motor ficam undefined (índice honesto)', () => {
    const {fonte} = fonteFixture();
    const view = montarWorldView(fonte);
    expect(view.ball).toBeUndefined();
    expect(view.pitch).toBeUndefined();
    expect(view.referee).toBeUndefined();
    expect(view.var).toBeUndefined();
    expect(view.render).toBeUndefined();
  });
});

describe('montarWorldView — campos ao vivo', () => {
  it('simulation.aoVivo só existe quando a partida ao vivo é passada', () => {
    const {fonte} = fonteFixture();
    expect(montarWorldView(fonte).simulation.aoVivo).toBeUndefined();

    const aoVivo = criarAoVivoFixture();
    const view = montarWorldView(fonte, aoVivo);
    expect(view.simulation.aoVivo).toBe(aoVivo); // mesma referência.
    // Com jogo ao vivo, o clima vem do jogo corrente (não da última partida).
    expect(view.weather?.clima).toBe(aoVivo.estatisticas.clima);
    expect(view.weather?.temperatura).toBe(aoVivo.estatisticas.temperatura);
  });
});

describe('montarWorldView — carreira mínima', () => {
  it('não quebra com estado vazio (sem clube, sem partidas, sem copa)', () => {
    const fonte: WorldViewSource = {
      clubes: [],
      jogadores: [],
      todosClubes: [],
      todosJogadores: [],
      partidas: [],
      ultimaPartidaUsuario: null,
      tabela: [],
      copa: null,
      serieDCarreira: null,
      historicoSerieD: [],
      clubeUsuarioId: null,
      temporadaAtual: '2026',
      rodadaAtual: 1,
      dataAtual: '2026-01-15',
      estadoFinanceiro: 'SAUDAVEL',
      rodadasNoVermelho: 0,
      patrocinio: criarEstadoPatrocinioVazio(),
      transferHistory: [],
      propostasRecebidas: [],
      reputacaoTecnico: 50,
      demissao: null,
      derrotasConsecutivas: 0,
      config: CONFIG_FIXTURE,
    };
    const view = montarWorldView(fonte);
    expect(Object.keys(view.teams)).toHaveLength(0);
    expect(view.stadium).toBeUndefined();
    expect(view.weather).toBeUndefined();
    expect(view.finance.financasClubeUsuario).toBeUndefined();
    expect(view.crowd.publicoUltimaPartida).toBeUndefined();
    expect(view.season.temporadaAtual).toBe('2026');
  });

  it('usa a liga ativa quando os arrays mestres estão vazios (borda de saves antigos)', () => {
    const clube = criarClube({id: 'unico'});
    const jogador = criarPlayer({id: 'j1', clubeId: 'unico'});
    const {fonte} = fonteFixture();
    const minima: WorldViewSource = {
      ...fonte,
      clubes: [clube],
      jogadores: [jogador],
      todosClubes: [],
      todosJogadores: [],
      clubeUsuarioId: 'unico',
    };
    const view = montarWorldView(minima);
    expect(view.teams.unico.clube).toBe(clube);
    expect(view.teams.unico.players[0].player).toBe(jogador);
  });
});

/**
 * Disciplina por competição — trava as 7 regras do projeto (refs 03/04/06):
 * amarelos por competição, 2 → gancho + zera, vermelho/2º amarelo sem apagar o
 * acúmulo, decremento só na competição da partida, isolamento Série A × Copa,
 * idempotência por partidaId, e a elegibilidade (lesão em dias + suspensão).
 */
import {
  aplicarDisciplinaPartida,
  calcularElegibilidadeJogador,
  comDisponibilidade,
  type PartidaDisciplina,
} from '..';
import {COMPETICAO_LEGADO, type EventoPartida, type Player} from '../../../types';

const LIGA = 'br-serie-a';
const COPA = 'br-copa-brasil';

function jog(id: string, clubeId = 'A'): Player {
  return comDisponibilidade({
    id,
    nome: id,
    apelido: undefined,
    idade: 25,
    nacionalidade: 'Brasil',
    posicaoPrincipal: 'MC',
    posicoesSecundarias: [],
    pernaDominante: 'D',
    atributos: {} as Player['atributos'],
    overall: 70,
    potencial: 70,
    condicaoFisica: 100,
    moral: 70,
    forma: 0,
    valorMercado: 0,
    salario: 0,
    contratoAte: '2028-12-31',
    clubeId,
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
  });
}

const amarelo = (jogadorId: string, timeId = 'A'): EventoPartida => ({
  minuto: 40,
  tipo: 'cartao_amarelo',
  timeId,
  jogadorId,
  descricao: 'Cartão amarelo',
});
const vermelho = (jogadorId: string, segundoAmarelo = false, timeId = 'A'): EventoPartida => ({
  minuto: 70,
  tipo: 'cartao_vermelho',
  timeId,
  jogadorId,
  segundoAmarelo,
  descricao: 'Cartão vermelho',
});

function partida(id: string, competicaoId: string, eventos: EventoPartida[]): PartidaDisciplina {
  return {id, competicaoId, timeCasa: 'A', timeFora: 'B', eventos};
}

const discDe = (j: Player, comp: string) =>
  j.disponibilidade!.disciplinas.find(d => d.competicaoId === comp);

describe('disciplina por competição', () => {
  it('Regra 4/5: 2 amarelos → 1 jogo de suspensão e zera o acúmulo', () => {
    let [p] = [jog('p1')];
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m1', LIGA, [amarelo('p1')]), []));
    expect(discDe(p, LIGA)?.amarelosAcumulados).toBe(1);
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao ?? 0).toBe(0);
    // 2º amarelo (em outra partida) gera a suspensão e zera o acúmulo.
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m2', LIGA, [amarelo('p1')]), ['m1']));
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao).toBe(1);
    expect(discDe(p, LIGA)?.amarelosAcumulados ?? 0).toBe(0);
    expect(p.suspenso).toBe(true); // espelho legado
  });

  it('cumpre a suspensão só numa partida DAQUELA competição (decremento)', () => {
    let p = jog('p1');
    // gera suspensão na liga
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m1', LIGA, [amarelo('p1'), amarelo('p1')]), []));
    // um amarelo dobrado num jogo = vira vermelho no motor; aqui forço 2 amarelos p/ chegar a 2
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao).toBe(1);
    // uma partida da COPA não cumpre a suspensão da liga
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('c1', COPA, []), ['m1']));
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao).toBe(1);
    // uma partida da LIGA cumpre
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m2', LIGA, []), ['m1', 'c1']));
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao ?? 0).toBe(0);
    expect(p.suspenso).toBe(false);
  });

  it('Regra 6: cartões da Série A não contaminam a Copa', () => {
    let p = jog('p1');
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m1', LIGA, [amarelo('p1')]), []));
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('c1', COPA, [amarelo('p1')]), ['m1']));
    // 1 amarelo em cada competição, baldes separados, nenhuma suspensão ainda
    expect(discDe(p, LIGA)?.amarelosAcumulados).toBe(1);
    expect(discDe(p, COPA)?.amarelosAcumulados).toBe(1);
    expect(p.suspenso).toBe(false);
    // o 2º amarelo NA COPA suspende só na Copa
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('c2', COPA, [amarelo('p1')]), ['m1', 'c1']));
    expect(discDe(p, COPA)?.partidasRestantesSuspensao).toBe(1);
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao ?? 0).toBe(0);
    expect(calcularElegibilidadeJogador(p, COPA).elegivel).toBe(false);
    expect(calcularElegibilidadeJogador(p, LIGA).elegivel).toBe(true);
  });

  it('Extra: vermelho/2º amarelo → 1 jogo sem apagar o acúmulo prévio', () => {
    let p = jog('p1');
    // acumula 1 amarelo na liga
    ({jogadores: [p]} = aplicarDisciplinaPartida([p], partida('m1', LIGA, [amarelo('p1')]), []));
    expect(discDe(p, LIGA)?.amarelosAcumulados).toBe(1);
    // 2º amarelo no MESMO jogo seguinte: engine emite amarelo + vermelho(segundoAmarelo)
    ({jogadores: [p]} = aplicarDisciplinaPartida(
      [p],
      partida('m2', LIGA, [amarelo('p1'), vermelho('p1', true)]),
      ['m1'],
    ));
    // +1 jogo pela expulsão; o acúmulo prévio (1) é preservado, não vira 2/zera
    expect(discDe(p, LIGA)?.partidasRestantesSuspensao).toBe(1);
    expect(discDe(p, LIGA)?.amarelosAcumulados).toBe(1);
  });

  it('Regra 7: idempotente por partidaId (reprocessar não duplica)', () => {
    let p = jog('p1');
    const m = partida('m1', LIGA, [amarelo('p1'), amarelo('p1')]);
    let processadas: string[];
    ({jogadores: [p], processadas} = aplicarDisciplinaPartida([p], m, []));
    const susp1 = discDe(p, LIGA)?.partidasRestantesSuspensao;
    // reprocessa a MESMA partida — não pode somar de novo
    const r2 = aplicarDisciplinaPartida([p], m, processadas);
    expect(discDe(r2.jogadores[0], LIGA)?.partidasRestantesSuspensao).toBe(susp1);
    expect(r2.processadas).toEqual(processadas);
  });

  it('elegibilidade: lesão (em dias) bloqueia em qualquer competição', () => {
    const p = {...jog('p1'), lesionado: true, diasLesao: 10};
    expect(calcularElegibilidadeJogador(p, LIGA)).toEqual({elegivel: false, motivo: 'lesionado'});
    expect(calcularElegibilidadeJogador(p, COPA)).toEqual({elegivel: false, motivo: 'lesionado'});
  });

  it('migração: suspensão legada (save antigo) vira entrada global __legado__', () => {
    const antigo = comDisponibilidade({
      ...jog('p1'),
      disponibilidade: undefined,
      suspenso: true,
      jogosSuspensao: 1,
    } as Player);
    const leg = antigo.disponibilidade!.disciplinas.find(
      d => d.competicaoId === COMPETICAO_LEGADO,
    );
    expect(leg?.partidasRestantesSuspensao).toBe(1);
    // suspensão legada vale em QUALQUER competição
    expect(calcularElegibilidadeJogador(antigo, LIGA).elegivel).toBe(false);
    expect(calcularElegibilidadeJogador(antigo, COPA).elegivel).toBe(false);
  });
});

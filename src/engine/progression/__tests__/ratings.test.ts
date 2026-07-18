/**
 * Engine dos 4 pilares + Overall de Partida (Onda 2). Cobre a ESTABILIDADE da
 * migração (sem amostra, Base ≈ overall curado no seed inteiro), o efeito da
 * amostra nos pilares B/C e os clamps por categoria do Overall de Partida.
 */
import {loadSeedData} from '../../../api/database/seed/loadSeed';
import {criarPlayer} from '../../../testing/fixtures';
import {comAtributosCalibrados} from '../calibracaoAtributos';
import {calcularOverall} from '../overall';
import {
  atributosEfetivos,
  fatoresDoEstado,
  overallDePartida,
} from '../overallPartida';
import {calcularRating, montarCoortes} from '../ratings';

function jogadorCalibrado(parcial: Parameters<typeof criarPlayer>[0]) {
  return comAtributosCalibrados(criarPlayer(parcial));
}

describe('ratings — Overall Base pelos 4 pilares', () => {
  it('SEED INTEIRO sem amostra: Base fica colado no overall curado (|Δ| ≤ 3)', () => {
    const {jogadores} = loadSeedData();
    const coortes = montarCoortes(jogadores);
    let maiorDelta = 0;
    let fora = 0;
    for (const jogador of jogadores) {
      const rating = calcularRating(jogador, coortes);
      const delta = Math.abs(rating.overallBase - jogador.overall);
      maiorDelta = Math.max(maiorDelta, delta);
      if (delta > 3) {
        fora += 1;
      }
    }
    // Estabilidade da migração: nada é reprecificado na virada de chave.
    expect(fora).toBe(0);
    expect(maiorDelta).toBeLessThanOrEqual(3);
  });

  it('sem jogos, os pilares B e C regridem à técnica (nada é punido)', () => {
    const jogador = jogadorCalibrado({id: 'r1', overall: 78});
    const rating = calcularRating(jogador, montarCoortes([jogador]));
    expect(rating.pilares.temporada).toBe(rating.pilares.tecnica);
    expect(rating.pilares.avancadas).toBe(rating.pilares.tecnica);
  });

  it('temporada com nota ALTA e amostra cheia puxa o Base para cima (e vice-versa)', () => {
    const base = jogadorCalibrado({id: 'r2', overall: 75});
    const artilheiro = {
      ...base,
      estatisticasTemporada: {
        ...base.estatisticasTemporada,
        jogos: 25,
        gols: 20,
        assistencias: 5,
        notaMedia: 8.2,
      },
    };
    const apagado = {
      ...base,
      estatisticasTemporada: {
        ...base.estatisticasTemporada,
        jogos: 25,
        notaMedia: 5.2,
      },
    };
    const coortes = montarCoortes([artilheiro, apagado]);
    const ratingBom = calcularRating(artilheiro, coortes);
    const ratingRuim = calcularRating(apagado, coortes);
    expect(ratingBom.pilares.temporada).toBeGreaterThan(ratingBom.pilares.tecnica);
    expect(ratingRuim.pilares.temporada).toBeLessThan(ratingRuim.pilares.tecnica);
    expect(ratingBom.overallBase).toBeGreaterThan(ratingRuim.overallBase);
    // Confiança cresce com a amostra (técnica sempre conta: piso 0.4).
    expect(ratingBom.confianca).toBeGreaterThan(0.9);
    const semJogos = calcularRating(base, coortes);
    expect(semJogos.confianca).toBeCloseTo(0.4, 5);
  });
});

describe('overallPartida — atributos efetivos por categoria', () => {
  it('condição baixa derruba o FÍSICO; a moral mexe no MENTAL; a forma no TÉCNICO', () => {
    const jogador = jogadorCalibrado({
      id: 'p1',
      overall: 80,
      condicaoFisica: 40,
      moral: 100,
      forma: 5,
    });
    const fatores = fatoresDoEstado(jogador);
    expect(fatores.fisico).toBeLessThan(1);
    expect(fatores.mental).toBeGreaterThan(1);
    expect(fatores.tecnico).toBeGreaterThan(1);

    const efetivos = atributosEfetivos(jogador);
    expect(efetivos.velocidade).toBeLessThan(jogador.atributos.velocidade);
    expect(efetivos.posicionamento).toBeGreaterThanOrEqual(
      jogador.atributos.posicionamento,
    );
    // Atributos BASE ficam intactos (efetivo é cópia — invariante do briefing).
    expect(calcularOverall(jogador.atributos, jogador.posicaoPrincipal)).toBe(80);
  });

  it('Overall de Partida respeita o clamp Base±8 nos extremos', () => {
    const exausto = jogadorCalibrado({
      id: 'p2',
      overall: 80,
      condicaoFisica: 10,
      moral: 10,
      forma: -3,
    });
    const resultado = overallDePartida(exausto);
    expect(resultado.overallPartida).toBeGreaterThanOrEqual(72);
    expect(resultado.overallPartida).toBeLessThan(80);

    const voando = jogadorCalibrado({
      id: 'p3',
      overall: 80,
      condicaoFisica: 100,
      moral: 100,
      forma: 5,
    });
    const melhor = overallDePartida(voando);
    expect(melhor.overallPartida).toBeGreaterThan(80);
    expect(melhor.overallPartida).toBeLessThanOrEqual(88);
  });

  it('estado neutro fica colado no Base (sem inflar o jogo)', () => {
    const neutro = jogadorCalibrado({
      id: 'p4',
      overall: 76,
      condicaoFisica: 100,
      moral: 50,
      forma: 0,
    });
    const resultado = overallDePartida(neutro);
    expect(Math.abs(resultado.overallPartida - 76)).toBeLessThanOrEqual(1);
  });
});

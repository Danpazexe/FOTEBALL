import type {EventoPartida} from '../../../types';
import {criarPlayer} from '../../../testing/fixtures';

import {
  calcularNotaPartida,
  contarAssistencias,
  mediaIncremental,
} from '../matchRating';

function gol(jogadorId: string, assistId?: string): EventoPartida {
  return {
    minuto: 10,
    tipo: 'gol',
    timeId: 'casa',
    jogadorId,
    jogadorAssistenciaId: assistId,
    descricao: '',
  };
}

describe('calcularNotaPartida', () => {
  it('premia gols e vitória', () => {
    const atacante = criarPlayer({id: 'a', posicaoPrincipal: 'CA'});
    const nota = calcularNotaPartida(atacante, [gol('a'), gol('a')], 'vitoria', false);
    // 6.0 + 2*0.8 + 0.5(vitória) = 8.1
    expect(nota).toBeCloseTo(8.1, 5);
  });

  it('penaliza cartão vermelho', () => {
    const jogador = criarPlayer({id: 'b'});
    const vermelho: EventoPartida = {
      minuto: 30,
      tipo: 'cartao_vermelho',
      timeId: 'casa',
      jogadorId: 'b',
      descricao: '',
    };
    const nota = calcularNotaPartida(jogador, [vermelho], 'derrota', false);
    // 6.0 - 1.5 - 0.3(derrota) = 4.2
    expect(nota).toBeCloseTo(4.2, 5);
  });

  it('credita o goleiro pelo jogo sem sofrer gols', () => {
    const goleiro = criarPlayer({id: 'g', posicaoPrincipal: 'GOL'});
    const semCleanSheet = calcularNotaPartida(goleiro, [], 'vitoria', false);
    const comCleanSheet = calcularNotaPartida(goleiro, [], 'vitoria', true);
    expect(comCleanSheet).toBeGreaterThan(semCleanSheet);
  });

  it('avalia um zagueiro que venceu sem nenhum lance (nota acima da média)', () => {
    const zagueiro = criarPlayer({id: 'z', posicaoPrincipal: 'ZAG'});
    const nota = calcularNotaPartida(zagueiro, [], 'vitoria', true);
    // 6.0 + 0.5(vitória) + 0.3(clean sheet zaga) = 6.8
    expect(nota).toBeGreaterThan(6.5);
  });

  it('mantém a nota no intervalo [3, 10]', () => {
    const craque = criarPlayer({id: 'c', posicaoPrincipal: 'CA'});
    const muitosGols = Array.from({length: 8}, () => gol('c'));
    expect(calcularNotaPartida(craque, muitosGols, 'vitoria', false)).toBeLessThanOrEqual(10);
  });
});

describe('mediaIncremental', () => {
  it('usa a nova nota quando não há jogos anteriores', () => {
    expect(mediaIncremental(0, 0, 7.5)).toBe(7.5);
  });

  it('acumula a média corretamente', () => {
    // 2 jogos a 7.0, novo jogo 8.5 => (14 + 8.5) / 3 = 7.5
    expect(mediaIncremental(7.0, 2, 8.5)).toBeCloseTo(7.5, 5);
  });
});

describe('contarAssistencias', () => {
  it('conta apenas os gols com assistência do jogador', () => {
    const eventos = [gol('a', 'x'), gol('b', 'x'), gol('c', 'y')];
    expect(contarAssistencias(eventos, 'x')).toBe(2);
    expect(contarAssistencias(eventos, 'y')).toBe(1);
    expect(contarAssistencias(eventos, 'a')).toBe(0);
  });
});

import {criarPlayer} from '../../../testing/fixtures';

import {calcularArtilheiros} from '../artilheiros';

function comGols(id: string, gols: number, assist = 0, nome?: string) {
  return criarPlayer({
    id,
    nome: nome ?? `Jogador ${id}`,
    estatisticasTemporada: {
      temporada: '2026',
      jogos: 10,
      gols,
      assistencias: assist,
      cartoesAmarelos: 0,
      cartoesVermelhos: 0,
      notaMedia: 7,
    },
  });
}

describe('calcularArtilheiros', () => {
  it('ordena por gols (desc) e ignora quem não marcou', () => {
    const ranking = calcularArtilheiros([
      comGols('a', 5),
      comGols('b', 12),
      comGols('c', 0),
      comGols('d', 8),
    ]);
    expect(ranking.map(l => l.jogadorId)).toEqual(['b', 'd', 'a']);
    expect(ranking.find(l => l.jogadorId === 'c')).toBeUndefined();
  });

  it('desempata por assistências e depois por nome', () => {
    const ranking = calcularArtilheiros([
      comGols('x', 10, 2, 'Zé'),
      comGols('y', 10, 5, 'Ana'),
      comGols('z', 10, 2, 'Bia'),
    ]);
    // y (5 assist) na frente; entre Bia e Zé (2 assist), Bia vem antes (nome).
    expect(ranking.map(l => l.jogadorId)).toEqual(['y', 'z', 'x']);
  });

  it('respeita o limite', () => {
    const muitos = Array.from({length: 30}, (_, i) => comGols(`p${i}`, i + 1));
    expect(calcularArtilheiros(muitos, 5)).toHaveLength(5);
  });
});
